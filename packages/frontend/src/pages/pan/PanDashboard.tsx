import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { PanSession } from "../../hooks/usePanSession";
import { PAN_PORTS, PAN_CABLE_TYPES, acceptsPanCable } from "../../hardware/panCables";

/* ─── types ──────────────────────────────────────────────────────────────── */
interface SceneRefs {
  camera:     THREE.PerspectiveCamera;
  group:      THREE.Group;
  /** small visible glow spheres */
  indicators: Record<string, THREE.Mesh>;
  /** larger invisible spheres – easy raycasting targets */
  hitTargets: Record<string, THREE.Mesh>;
  /** rendered cable objects keyed by portId + suffix */
  cables:     Record<string, THREE.Object3D>;
  sz:         THREE.Vector3;   // scaled model size
  frontZ:     number;          // world-Z of front face
  backZ:      number;          // world-Z of rear face
}

/* ─── helpers ────────────────────────────────────────────────────────────── */
function disposeMesh(obj: THREE.Object3D) {
  if (obj instanceof THREE.Mesh) {
    obj.geometry.dispose();
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m) => m.dispose());
  }
}

// Calibrated PA-220 3D hardware reference and interactive cabling (v3)
export function PanDashboard({ session: _session }: { session: PanSession }) {
  const mountRef    = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sceneRef    = useRef<SceneRefs | null>(null);

  const [loading,  setLoading]  = useState(true);
  const [debugMsg, setDebugMsg] = useState("Loading PA-220 3D model…");
  const [mode,     setMode]     = useState<"explore" | "cable">("explore");
  const [selCable, setSelCable] = useState<string | null>(null);
  const [plugged,  setPlugged]  = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [info, setInfo] = useState({
    title: "PA-220 Next-Generation Firewall",
    desc:  "Compact desktop NGFW with single-pass parallel processing. 8× GbE data ports, dedicated OOB MGT port, dual console (RJ-45 + Micro-USB), USB 3.0, and redundant 12 V DC power inputs.",
  });

  /* stable refs so closures see fresh values */
  const modeRef    = useRef(mode);
  const selCableRef = useRef(selCable);
  const pluggedRef = useRef(plugged);
  const fbTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { modeRef.current    = mode;     }, [mode]);
  useEffect(() => { selCableRef.current = selCable; }, [selCable]);
  useEffect(() => { pluggedRef.current = plugged;  }, [plugged]);
  useEffect(() => () => { if (fbTimer.current) clearTimeout(fbTimer.current); }, []);

  function showFb(msg: string, ok: boolean) {
    setFeedback({ msg, ok });
    if (fbTimer.current) clearTimeout(fbTimer.current);
    fbTimer.current = setTimeout(() => setFeedback(null), 3200);
  }

  /* ── port-click logic (called from both 3-D click and button) ──────────── */
  function handlePortClick(portId: string) {
    const port = PAN_PORTS.find(p => p.id === portId);
    if (!port) return;

    if (pluggedRef.current[portId]) {
      setPlugged(prev => { const n = { ...prev }; delete n[portId]; return n; });
      showFb(`🔌 Unplugged from ${port.name}.`, true);
      return;
    }

    const cableId = selCableRef.current;
    if (!cableId) {
      showFb(`⚠ Select a cable type first, then click a port.`, false);
      setInfo({ title: port.name, desc: port.desc });
      return;
    }
    const cable = PAN_CABLE_TYPES.find(c => c.id === cableId);
    if (!cable) return;

    if (!acceptsPanCable(cableId, portId)) {
      showFb(`✗ ${cable.label} cannot connect to ${port.name}.\n${cable.desc}`, false);
      return;
    }
    setPlugged(prev => ({ ...prev, [portId]: cableId }));
    showFb(`✓ ${cable.label} → ${port.name} connected.`, true);
    setInfo({ title: port.name, desc: `${port.desc}\n\nConnected: ${cable.label}` });
  }

  /* ── Three.js scene ─────────────────────────────────────────────────────── */
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth  || 900;
    const H = mount.clientHeight || 460;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1117);

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.001, 100_000);
    camera.position.set(0, 1.5, 14);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding  = THREE.sRGBEncoding;
    renderer.toneMapping     = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping  = true;
    controls.dampingFactor  = 0.05;
    controls.autoRotate     = true;
    controls.autoRotateSpeed = 0.5;
    controls.enablePan      = false;
    renderer.domElement.addEventListener("pointerdown",
      () => { controls.autoRotate = false; }, { once: true });

    /* Lights */
    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    [[ 5,10,10,1.2],[-5,5,10,0.9],[0,-5,10,0.6],[0,5,-10,0.5]].forEach(([x,y,z,i]) => {
      const l = new THREE.DirectionalLight(0xffffff, i);
      l.position.set(x, y, z);
      scene.add(l);
    });

    const group = new THREE.Group();
    scene.add(group);

    const indicators: Record<string, THREE.Mesh> = {};
    const hitTargets: Record<string, THREE.Mesh> = {};
    const cables:     Record<string, THREE.Object3D> = {};

    sceneRef.current = {
      camera, group, indicators, hitTargets, cables,
      sz: new THREE.Vector3(8, 1.5, 6), frontZ: 3, backZ: -3,
    };

    let disposed = false;
    const loader = new GLTFLoader();

    loader.load(
      "/pa-220-firewall.glb",
      (gltf) => {
        if (disposed) return;
        const model = gltf.scene;

        /* Scale ──────────────────────────────────────────────────── */
        const b0 = new THREE.Box3().setFromObject(model);
        const s0 = new THREE.Vector3(); b0.getSize(s0);
        model.scale.setScalar(8 / Math.max(s0.x, s0.y, s0.z));

        /* Centre ─────────────────────────────────────────────────── */
        const b1 = new THREE.Box3().setFromObject(model);
        const c1 = new THREE.Vector3(); b1.getCenter(c1);
        model.position.sub(c1);

        /* Materials ──────────────────────────────────────────────── */
        model.traverse((c: any) => {
          if (c.isMesh) {
            const mats = Array.isArray(c.material) ? c.material : [c.material];
            mats.forEach((m: any) => {
              if (m) { m.side = THREE.DoubleSide; if (m.emissiveIntensity) m.emissiveIntensity = 0.3; m.needsUpdate = true; }
            });
          }
        });
        group.add(model);

        /* Bounds ─────────────────────────────────────────────────── */
        const b2  = new THREE.Box3().setFromObject(group);
        const sz  = new THREE.Vector3(); b2.getSize(sz);
        const frontZ = b2.max.z;
        const backZ  = b2.min.z;

        if (sceneRef.current) {
          sceneRef.current.sz = sz;
          sceneRef.current.frontZ = frontZ;
          sceneRef.current.backZ = backZ;
        }

        /* Camera fit ─────────────────────────────────────────────── */
        const fov  = camera.fov * Math.PI / 180;
        const dist = (Math.max(sz.x, sz.y, sz.z) / 2 / Math.tan(fov / 2)) * 1.6;
        camera.position.set(0, -sz.y * 0.05, dist * 0.82);
        camera.near = dist / 1000; camera.far = dist * 100;
        camera.updateProjectionMatrix();

        /* Port spheres ───────────────────────────────────────────── */
        const visR = Math.max(sz.y * 0.024, 0.052);  // visible glow dot sized for socket cavity
        const hitR = visR * 2.8;                     // invisible click target

        PAN_PORTS.forEach((p) => {
          const wx = p.x * sz.x;
          const wy = p.y * sz.y;
          const wz = p.isRear ? (backZ - visR * 0.6) : (frontZ + visR * 0.6);

          /* Glowing indicator */
          const visMat = new THREE.MeshStandardMaterial({
            color:            new THREE.Color(p.color),
            emissive:         new THREE.Color(p.color),
            emissiveIntensity: 2.2,
            roughness: 0.15, metalness: 0,
          });
          const vis = new THREE.Mesh(new THREE.SphereGeometry(visR, 16, 16), visMat);
          vis.position.set(wx, wy, wz);
          vis.visible = false;   // shown only in cable mode
          vis.userData = { portId: p.id };
          group.add(vis);
          indicators[p.id] = vis;

          /* Invisible hit target (larger) */
          const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
          const hit = new THREE.Mesh(new THREE.SphereGeometry(hitR, 8, 8), hitMat);
          hit.position.set(wx, wy, wz);
          hit.visible = false;
          hit.userData = { portId: p.id };
          group.add(hit);
          hitTargets[p.id] = hit;
        });

        setLoading(false);
      },
      (xhr) => {
        if (xhr.loaded > 0) setDebugMsg(`Loading PA-220 — ${(xhr.loaded / 1_048_576).toFixed(1)} MB…`);
      },
      () => { setDebugMsg("⚠ Could not load pa-220-firewall.glb"); },
    );

    /* ── Raycaster ─────────────────────────────────────────────────────────── */
    const raycaster = new THREE.Raycaster();
    const mouse     = new THREE.Vector2();

    const onClick = (e: MouseEvent) => {
      if (modeRef.current !== "cable") return;
      const sr = sceneRef.current; if (!sr) return;

      const rect = mount.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, sr.camera);

      /* 1. Try exact hit on indicator or hit-target spheres */
      const sphereTargets = [
        ...Object.values(sr.indicators).filter(m => m.visible),
        ...Object.values(sr.hitTargets).filter(m => m.visible),
      ];
      const sphereHits = raycaster.intersectObjects(sphereTargets);
      if (sphereHits.length > 0) {
        handlePortClick(sphereHits[0].object.userData.portId as string);
        return;
      }

      /* 2. Hit anywhere on model → snap to nearest visible indicator */
      const modelMeshes: THREE.Object3D[] = [];
      sr.group.traverse(c => {
        if ((c as THREE.Mesh).isMesh && !c.userData.portId) modelMeshes.push(c);
      });
      const modelHits = raycaster.intersectObjects(modelMeshes, true);
      if (modelHits.length > 0) {
        const hp = modelHits[0].point;
        let nearest = ""; let nearestD = Infinity;
        Object.entries(sr.indicators).forEach(([pid, mesh]) => {
          if (!mesh.visible) return;
          const d = Math.hypot(hp.x - mesh.position.x, hp.y - mesh.position.y);
          if (d < nearestD) { nearestD = d; nearest = pid; }
        });
        const snapTolerance = sr.sz.x * 0.09;
        if (nearest && nearestD < snapTolerance) {
          handlePortClick(nearest);
        }
      }
    };
    mount.addEventListener("click", onClick);

    /* ── Animate ───────────────────────────────────────────────────────────── */
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    /* ── Resize ────────────────────────────────────────────────────────────── */
    const ro = new ResizeObserver(() => {
      const nw = mount.clientWidth, nh = mount.clientHeight;
      if (!nw || !nh) return;
      camera.aspect = nw / nh; camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    ro.observe(mount);

    return () => {
      disposed = true;
      ro.disconnect();
      cancelAnimationFrame(animId);
      mount.removeEventListener("click", onClick);
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  /* ── Sync port-indicator visibility + cable meshes on state change ──────── */
  useEffect(() => {
    const sr = sceneRef.current; if (!sr) return;
    const { group, indicators, hitTargets, cables, sz } = sr;

    /* Remove old cable meshes */
    Object.values(cables).forEach(obj => { group.remove(obj); disposeMesh(obj); });
    Object.keys(cables).forEach(k => delete cables[k]);

    /* Show / hide indicators */
    const cableMode = mode === "cable";
    Object.entries(indicators).forEach(([pid, mesh]) => {
      mesh.visible          = cableMode && !plugged[pid];
      hitTargets[pid].visible = cableMode;
    });

    if (!cableMode) return;

    /* Build 3-D cable geometry for each connected port */
    Object.entries(plugged).forEach(([portId, cableId]) => {
      const ind  = indicators[portId]; if (!ind) return;
      const port = PAN_PORTS.find(p => p.id === portId); if (!port) return;
      const cbl  = PAN_CABLE_TYPES.find(c => c.id === cableId); if (!cbl) return;

      const sp   = ind.position.clone();
      const cCol = new THREE.Color(cbl.color);

      const isPow = !!port.isRear || cableId === "dc-12v";
      const isUsb = cableId === "micro-usb" || cableId === "usb-drive";
      const zDir  = port.isRear ? -1 : 1;
      const pw = sz.y * (isUsb ? 0.07 : isPow ? 0.10 : 0.16);
      const ph = sz.y * (isUsb ? 0.10 : isPow ? 0.10 : 0.14);
      const pd = sz.y * 0.22;

      const cMat = new THREE.MeshStandardMaterial({ color: cCol, roughness: 0.45, metalness: 0.2 });

      /* Connector body */
      const plug = new THREE.Mesh(
        isPow ? new THREE.CylinderGeometry(pw / 2, pw / 2, pd, 16)
               : new THREE.BoxGeometry(pw, ph, pd),
        cMat,
      );
      if (isPow) plug.rotation.x = Math.PI / 2;
      plug.position.set(sp.x, sp.y, sp.z + zDir * pd * 0.4);
      group.add(plug); cables[portId + "_plug"] = plug;

      /* RJ-45 latch tab */
      if (!isPow && !isUsb) {
        const latch = new THREE.Mesh(
          new THREE.BoxGeometry(pw * 0.4, ph * 0.10, pd * 0.45),
          new THREE.MeshStandardMaterial({ color: cCol, roughness: 0.2, metalness: 0.5 }),
        );
        latch.position.set(sp.x, sp.y - ph * 0.55, sp.z + zDir * pd * 0.28);
        group.add(latch); cables[portId + "_latch"] = latch;

        /* Gold contact pins (8) */
        const pinMat = new THREE.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.15, metalness: 0.95 });
        for (let i = 0; i < 8; i++) {
          const pin = new THREE.Mesh(new THREE.BoxGeometry(pw * 0.055, ph * 0.32, pd * 0.07), pinMat);
          pin.position.set(sp.x + (i - 3.5) * pw * 0.10, sp.y + ph * 0.09, sp.z + zDir * pd * 0.44);
          group.add(pin); cables[`${portId}_pin${i}`] = pin;
        }
      }

      /* Strain-relief boot */
      const boot = new THREE.Mesh(
        new THREE.CylinderGeometry(sz.y * 0.038, sz.y * 0.029, sz.y * 0.085, 12),
        cMat,
      );
      boot.rotation.x = Math.PI / 2;
      boot.position.set(sp.x, sp.y, sp.z + zDir * pd * 0.78);
      group.add(boot); cables[portId + "_boot"] = boot;

      /* Curved cable tail */
      const cr   = sz.y * 0.015;
      const tailZ = sp.z + zDir * pd * 0.9;
      const seed  = [...portId].reduce((s, c) => s + c.charCodeAt(0), 0);
      const bend  = ((seed % 7) - 3) * sz.y * 0.010;

      const pts = [
        new THREE.Vector3(sp.x,             sp.y,             tailZ),
        new THREE.Vector3(sp.x + bend * 0.3, sp.y - sz.y * 0.12, tailZ + zDir * sz.z * 0.03),
        new THREE.Vector3(sp.x + bend * 0.7, sp.y - sz.y * 0.32, tailZ + zDir * sz.z * 0.07),
        new THREE.Vector3(sp.x + bend,       sp.y - sz.y * 0.55, tailZ + zDir * sz.z * 0.10),
        new THREE.Vector3(sp.x + bend * 0.8, sp.y - sz.y * 0.80, tailZ + zDir * sz.z * 0.11),
      ];
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5), 28, cr, 10, false),
        new THREE.MeshStandardMaterial({ color: cCol, roughness: 0.65, metalness: 0.05 }),
      );
      group.add(tube); cables[portId + "_tube"] = tube;
    });
  }, [plugged, mode]);

  /* ── Controls ───────────────────────────────────────────────────────────── */
  const zoom = (f: number) => sceneRef.current?.camera.position.multiplyScalar(f);
  const resetView = () => {
    const s = sceneRef.current; if (!s) return;
    s.camera.position.set(0, 1.5, 14);
    controlsRef.current!.target.set(0, 0, 0);
    controlsRef.current!.autoRotate = mode === "explore";
    controlsRef.current!.update();
  };

  const connectedCount = Object.keys(plugged).length;

  /* ─── Render ────────────────────────────────────────────────────────────── */
  return (
    <div style={{ width:"100%", height:"calc(100vh - 84px)", display:"flex", flexDirection:"column", gap:8 }}>

      {/* Header */}
      <div style={{ flexShrink:0, display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <h1 style={{ fontSize:15, fontWeight:700, color:"#1e293b", margin:0 }}>
              Palo Alto PA-220 — 3D Hardware Reference
            </h1>
            <span style={{ fontSize:10, padding:"2px 7px", borderRadius:4, background:"#dcfce7", color:"#15803d", fontWeight:600 }}>
              pa-220-firewall.glb
            </span>
          </div>
          <p style={{ color:"#64748b", fontSize:12, margin:"2px 0 0" }}>
            {mode === "explore"
              ? "Drag · Scroll to zoom · Click tabs to inspect specs"
              : `🔌 Cable Mode — pick a cable, then click a glowing dot on the model  (${connectedCount}/${PAN_PORTS.length} connected)`}
          </p>
        </div>
        {mode === "explore" && (
          <div style={{ display:"flex", gap:6 }}>
            {[
              { label:"Overview",  desc:"Compact desktop NGFW with PAN-OS. 8× GbE data ports, dedicated OOB MGT, dual console, USB 3.0, redundant DC power." },
              { label:"Data Ports", desc:"8× 10/100/1000 RJ-45 interfaces in four dual-port columns. Supports L2/L3, Virtual Wire, TAP, and HA modes." },
              { label:"MGT & Console", desc:"OOB MGT port (default 192.168.1.1), RJ-45 serial console (9600 baud), Micro-USB console, and USB 3.0 for bootstrap/recovery." },
            ].map(item => (
              <button key={item.label}
                onClick={() => setInfo({ title:`PA-220 — ${item.label}`, desc:item.desc })}
                style={{ fontSize:11, padding:"4px 10px", borderRadius:4, border:"1px solid #cbd5e1", fontWeight:500, cursor:"pointer",
                  background:info.title.includes(item.label) ? "#fa4616" : "#fff",
                  color:info.title.includes(item.label) ? "#fff" : "#475569" }}>
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3-D viewport */}
      <div style={{ position:"relative", flex:1, minHeight:300, borderRadius:8, overflow:"hidden", border:"1px solid #1e2d45", background:"#0d1117" }}>
        <div ref={mountRef} style={{ width:"100%", height:"100%", cursor: mode==="cable" ? "crosshair" : "grab" }} />

        {loading && (
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            background:"#0d1117ee", color:"#94a3b8", fontSize:13, gap:10, textAlign:"center" }}>
            <span style={{ fontSize:24 }}>⚙</span><span>{debugMsg}</span>
          </div>
        )}

        {/* Top-left hint */}
        <div style={{ position:"absolute", top:10, left:12, color:"#3d5270", fontSize:11, pointerEvents:"none" }}>
          {mode === "explore"
            ? "🖱 Drag · Scroll to zoom"
            : "🔌 Pick cable below → click a glowing dot on the model"}
        </div>

        {/* Mode pills */}
        <div style={{ position:"absolute", bottom:10, left:10, display:"flex", gap:6 }}>
          {[
            { m:"explore" as const, label:"🔍 Explore",     bg:"#fa4616" },
            { m:"cable"   as const, label:"🔌 Cable Mode",  bg:"#2563eb" },
          ].map(({ m, label, bg }) => (
            <button key={m}
              onClick={() => {
                setMode(m);
                if (controlsRef.current) controlsRef.current.autoRotate = m === "explore";
                if (m === "explore") { setSelCable(null); setFeedback(null); }
              }}
              style={{ padding:"5px 13px", fontSize:11, fontWeight:600, borderRadius:20, cursor:"pointer",
                border:`1.5px solid ${mode===m ? bg : "#2d3f5a"}`,
                background:mode===m ? bg : "rgba(13,17,23,0.85)", backdropFilter:"blur(8px)",
                color:mode===m ? "#fff" : "#94a3b8" }}>
              {label}
            </button>
          ))}
          {mode === "cable" && connectedCount > 0 && (
            <button onClick={() => { setPlugged({}); showFb("All cables removed.", true); }}
              style={{ padding:"5px 13px", fontSize:11, borderRadius:20, cursor:"pointer",
                border:"1.5px solid #2d3f5a", background:"rgba(13,17,23,0.85)", backdropFilter:"blur(8px)", color:"#94a3b8" }}>
              ↺ Reset
            </button>
          )}
        </div>

        {/* Zoom controls */}
        <div style={{ position:"absolute", right:10, bottom:10, display:"flex", flexDirection:"column", gap:4 }}>
          {[{l:"+",f:()=>zoom(0.82),t:"Zoom in"},{l:"−",f:()=>zoom(1.22),t:"Zoom out"},{l:"⟳",f:resetView,t:"Reset"}].map(b=>(
            <button key={b.l} onClick={b.f} title={b.t}
              style={{ width:30, height:30, borderRadius:6, border:"1px solid #334155", background:"#0b111bcc", color:"#cbd5e1", cursor:"pointer", fontSize:b.l==="⟳"?13:17 }}>
              {b.l}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div role="status"
          style={{ padding:"7px 14px", borderRadius:5, fontSize:12, fontWeight:600, whiteSpace:"pre-line",
            background:feedback.ok ? "#052e16" : "#450a0a",
            color:feedback.ok ? "#4ade80" : "#f87171",
            border:`1px solid ${feedback.ok ? "#166534" : "#991b1b"}` }}>
          {feedback.msg}
        </div>
      )}

      {/* ── Cable mode tray (secondary – backup to 3-D clicking) ─────────────── */}
      {mode === "cable" && (
        <div style={{ background:"#ffffff", border:"1px solid #e2e8f0", borderRadius:8, padding:"12px 14px", display:"flex", flexDirection:"column", gap:10, overflowY:"auto", maxHeight:220 }}>

          {/* Cable picker */}
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5 }}>
              Step 1 — Select cable type
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
              {PAN_CABLE_TYPES.map(c => {
                const active = selCable === c.id;
                return (
                  <button key={c.id} onClick={() => setSelCable(active ? null : c.id)} title={c.desc}
                    style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 9px", fontSize:11, borderRadius:4, cursor:"pointer",
                      border:`1.5px solid ${active ? c.color : "#e2e8f0"}`,
                      background:active ? c.color + "18" : "#f8fafc",
                      color:active ? c.color : "#475569", fontWeight:active ? 700 : 500 }}>
                    <span style={{ width:8, height:8, borderRadius:"50%", background:c.color, flexShrink:0 }} />
                    {c.label}
                    {Object.values(plugged).includes(c.id) && " ✓"}
                  </button>
                );
              })}
            </div>
            {selCable && (
              <p style={{ margin:"5px 0 0", fontSize:11, color:"#64748b" }}>
                ℹ {PAN_CABLE_TYPES.find(c => c.id === selCable)?.desc}
              </p>
            )}
          </div>

          {/* Port buttons (fallback for non-3D interaction) */}
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5 }}>
              Step 2 — Click port on model  <span style={{ color:"#cbd5e1", fontWeight:400, textTransform:"none" }}>or use buttons below as backup</span>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
              {PAN_PORTS.map(p => {
                const cid = plugged[p.id];
                const cbl = cid ? PAN_CABLE_TYPES.find(c => c.id === cid) : null;
                return (
                  <button key={p.id} onClick={() => handlePortClick(p.id)} title={p.desc}
                    style={{ display:"flex", alignItems:"center", gap:4, padding:"4px 9px", fontSize:11, borderRadius:4, cursor:"pointer",
                      border:`1.5px solid ${cbl ? cbl.color + "99" : "#e2e8f0"}`,
                      background:cbl ? cbl.color + "14" : "#f8fafc",
                      color:cbl ? cbl.color : "#334155", fontWeight:500 }}>
                    {cbl && <span style={{ width:7, height:7, borderRadius:"50%", background:cbl.color, flexShrink:0 }} />}
                    {p.name.replace(/\s*\(.*?\)/, "")}
                    {cbl
                      ? <span style={{ fontSize:10, opacity:0.85 }}>✓ {cbl.label.split(" ")[0]}</span>
                      : <span style={{ fontSize:10, color:"#94a3b8" }}>+ plug</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Explore info banner */}
      {mode === "explore" && (
        <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:6, padding:"10px 14px", minHeight:52, flexShrink:0 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#1e293b", marginBottom:3 }}>{info.title}</div>
          <div style={{ fontSize:12, color:"#64748b", lineHeight:1.55, whiteSpace:"pre-line" }}>{info.desc}</div>
        </div>
      )}
    </div>
  );
}
