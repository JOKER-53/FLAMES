import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment";
import { PanSession } from "../../hooks/usePanSession";
import { PAN_PORTS, PAN_CABLE_TYPES, acceptsPanCable } from "../../hardware/panCables";

/* ─── types ──────────────────────────────────────────────────────────────── */
interface SceneRefs {
  camera:     THREE.PerspectiveCamera;
  group:      THREE.Group;
  indicators: Record<string, THREE.Mesh>;
  hitTargets: Record<string, THREE.Mesh>;
  cables:     Record<string, THREE.Object3D>;
  floorItems: THREE.Object3D[];
  sz:         THREE.Vector3;
  frontZ:     number;
  backZ:      number;
}

/* ─── helpers ────────────────────────────────────────────────────────────── */
function disposeMesh(obj: THREE.Object3D) {
  if (obj instanceof THREE.Mesh) {
    obj.geometry.dispose();
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m) => m.dispose());
  }
}

// Studio White PA-220 3D hardware reference and interactive cabling
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
    fbTimer.current = setTimeout(() => setFeedback(null), 3800);
  }

  /* ── Port connection handler ─────────────────────────────────────────────── */
  function handlePortClick(portId: string) {
    const port = PAN_PORTS.find(p => p.id === portId);
    if (!port) return;

    if (modeRef.current === "explore") {
      setInfo({ title: port.name, desc: port.desc });
      return;
    }

    if (pluggedRef.current[portId]) {
      const oldCable = PAN_CABLE_TYPES.find(c => c.id === pluggedRef.current[portId]);
      setPlugged(prev => { const n = { ...prev }; delete n[portId]; return n; });
      showFb(`Unplugged ${oldCable?.label ?? "cable"} from ${port.name}.`, true);
      setInfo({ title: port.name, desc: `${port.desc}\n\nStatus: Empty (Ready for cable)` });
      return;
    }

    const cableId = selCableRef.current;
    if (!cableId) {
      showFb(`ℹ Select a cable type from the panel below first, then click ${port.name}.`, false);
      setInfo({ title: port.name, desc: `${port.desc}\n\nStatus: Empty. Pick a cable below to connect.` });
      return;
    }

    const cable = PAN_CABLE_TYPES.find(c => c.id === cableId);
    if (!cable) return;

    if (!acceptsPanCable(cableId, portId)) {
      showFb(`✗ ${cable.label} cannot plug into ${port.name}.\n${cable.desc}`, false);
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
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(42, W / H, 0.001, 100_000);
    camera.position.set(4, 5, 11);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding  = THREE.sRGBEncoding;
    renderer.toneMapping     = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.96;

    // Enable soft dynamic directional shadow maps
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    // Realistic IBL Studio Environment from RoomEnvironment (same as model-viewer)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping  = true;
    controls.dampingFactor  = 0.06;
    controls.autoRotate     = true;
    controls.autoRotateSpeed = 0.45;
    controls.enablePan      = false;
    renderer.domElement.addEventListener("pointerdown",
      () => { controls.autoRotate = false; }, { once: true });

    /* 1. Main Studio Key Light — casts soft natural drop shadow matching model-viewer */
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.75);
    keyLight.position.set(1.5, 13.0, 2.8);
    keyLight.target.position.set(0, 0, 0);
    scene.add(keyLight.target);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 1.0;
    keyLight.shadow.camera.far = 25.0;
    keyLight.shadow.camera.left = -5.8;
    keyLight.shadow.camera.right = 5.8;
    keyLight.shadow.camera.top = 4.8;
    keyLight.shadow.camera.bottom = -4.8;
    keyLight.shadow.bias = -0.0003;
    keyLight.shadow.normalBias = 0.02;
    keyLight.shadow.radius = 3.5;
    scene.add(keyLight);

    /* 2. Overhead Contact Light — tight contact grounding directly under chassis */
    const contactLight = new THREE.DirectionalLight(0xffffff, 0.30);
    contactLight.position.set(0, 14.0, 0);
    contactLight.target.position.set(0, 0, 0);
    scene.add(contactLight.target);
    contactLight.castShadow = true;
    contactLight.shadow.mapSize.width = 1024;
    contactLight.shadow.mapSize.height = 1024;
    contactLight.shadow.camera.near = 1.0;
    contactLight.shadow.camera.far = 25.0;
    contactLight.shadow.camera.left = -5.0;
    contactLight.shadow.camera.right = 5.0;
    contactLight.shadow.camera.top = 4.0;
    contactLight.shadow.camera.bottom = -4.0;
    contactLight.shadow.bias = -0.0003;
    contactLight.shadow.normalBias = 0.02;
    contactLight.shadow.radius = 1.8;
    scene.add(contactLight);

    /* 3. Subtle Rim Light for crisp chassis silhouette definition */
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.22);
    rimLight.position.set(-5, 6, -5);
    scene.add(rimLight);

    const group = new THREE.Group();
    scene.add(group);

    const indicators: Record<string, THREE.Mesh> = {};
    const hitTargets: Record<string, THREE.Mesh> = {};
    const cables:     Record<string, THREE.Object3D> = {};
    const floorItems: THREE.Object3D[] = [];

    sceneRef.current = {
      camera, group, indicators, hitTargets, cables, floorItems,
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

        /* Materials & Shadow Casting ─────────────────────────────── */
        model.traverse((c: any) => {
          if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
            const mats = Array.isArray(c.material) ? c.material : [c.material];
            mats.forEach((m: any) => {
              if (m) {
                m.side = THREE.DoubleSide;
                m.needsUpdate = true;
              }
            });
          }
        });
        group.add(model);

        /* Bounds ─────────────────────────────────────────────────── */
        const b2  = new THREE.Box3().setFromObject(group);
        const sz  = new THREE.Vector3(); b2.getSize(sz);
        const frontZ = b2.max.z;
        const backZ  = b2.min.z;
        const floorY = -sz.y * 0.5;

        if (sceneRef.current) {
          sceneRef.current.sz = sz;
          sceneRef.current.frontZ = frontZ;
          sceneRef.current.backZ = backZ;
        }

        /* Dynamic shadow-receiving floor plane — pure white studio with soft physical shadows */
        const floorGeo = new THREE.PlaneGeometry(60, 60);
        const floorMat = new THREE.ShadowMaterial({ opacity: 0.32 });
        const floorMesh = new THREE.Mesh(floorGeo, floorMat);
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.position.set(0, floorY - 0.002, 0);
        floorMesh.receiveShadow = true;
        scene.add(floorMesh);
        floorItems.push(floorMesh);

        /* Camera fit — 3/4 Elevated Product Showcase (matching model-viewer) */
        const fov  = camera.fov * Math.PI / 180;
        const dist = (Math.max(sz.x, sz.y, sz.z) / 2 / Math.tan(fov / 2)) * 1.55;
        camera.position.set(dist * 0.32, dist * 0.40, dist * 0.85);
        controls.target.set(0, -sz.y * 0.08, 0);
        camera.near = dist / 1000;
        camera.far = dist * 100;
        camera.updateProjectionMatrix();
        controls.update();

        /* Port spheres ───────────────────────────────────────────── */
        const visR = Math.max(sz.y * 0.024, 0.052);
        const hitR = visR * 2.8;

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
          vis.visible = false;
          vis.userData = { portId: p.id };
          group.add(vis);
          indicators[p.id] = vis;

          /* Invisible hit target */
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
      const sr = sceneRef.current; if (!sr) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const targets = Object.values(sr.hitTargets).filter(m => m.visible);
      const hits    = raycaster.intersectObjects(targets, false);
      if (hits.length > 0) {
        const pid = hits[0].object.userData.portId as string;
        if (pid) { handlePortClick(pid); return; }
      }

      const visList = Object.values(sr.indicators).filter(m => m.visible);
      const visHits = raycaster.intersectObjects(visList, false);
      if (visHits.length > 0) {
        const pid = visHits[0].object.userData.portId as string;
        if (pid) { handlePortClick(pid); return; }
      }

      const allHits = raycaster.intersectObjects(sr.group.children, true);
      if (allHits.length > 0) {
        const hp = allHits[0].point;
        let nearest: string | null = null;
        let nearestD = Infinity;
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
      if (envTexture) envTexture.dispose();
      floorItems.forEach(item => {
        scene.remove(item);
        disposeMesh(item);
      });
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  /* ── Sync port-indicator visibility + cable meshes on state change ──────── */
  useEffect(() => {
    const sr = sceneRef.current; if (!sr) return;
    const { group, indicators, hitTargets, cables, sz } = sr;

    Object.values(cables).forEach(obj => { group.remove(obj); disposeMesh(obj); });
    Object.keys(cables).forEach(k => delete cables[k]);

    const cableMode = mode === "cable";
    Object.entries(indicators).forEach(([pid, mesh]) => {
      mesh.visible          = cableMode && !plugged[pid];
      hitTargets[pid].visible = cableMode;
    });

    if (!cableMode) return;

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

      const plug = new THREE.Mesh(
        isPow ? new THREE.CylinderGeometry(pw / 2, pw / 2, pd, 16)
               : new THREE.BoxGeometry(pw, ph, pd),
        cMat,
      );
      if (isPow) plug.rotation.x = Math.PI / 2;
      plug.position.set(sp.x, sp.y, sp.z + zDir * pd * 0.4);
      group.add(plug); cables[portId + "_plug"] = plug;

      if (!isPow && !isUsb) {
        const latch = new THREE.Mesh(
          new THREE.BoxGeometry(pw * 0.4, ph * 0.10, pd * 0.45),
          new THREE.MeshStandardMaterial({ color: cCol, roughness: 0.2, metalness: 0.5 }),
        );
        latch.position.set(sp.x, sp.y - ph * 0.55, sp.z + zDir * pd * 0.28);
        group.add(latch); cables[portId + "_latch"] = latch;

        const pinMat = new THREE.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.15, metalness: 0.95 });
        for (let i = 0; i < 8; i++) {
          const pin = new THREE.Mesh(new THREE.BoxGeometry(pw * 0.055, ph * 0.32, pd * 0.07), pinMat);
          pin.position.set(sp.x + (i - 3.5) * pw * 0.10, sp.y + ph * 0.09, sp.z + zDir * pd * 0.44);
          group.add(pin); cables[`${portId}_pin${i}`] = pin;
        }
      }

      const boot = new THREE.Mesh(
        new THREE.CylinderGeometry(sz.y * 0.038, sz.y * 0.029, sz.y * 0.085, 12),
        cMat,
      );
      boot.rotation.x = Math.PI / 2;
      boot.position.set(sp.x, sp.y, sp.z + zDir * pd * 0.78);
      group.add(boot); cables[portId + "_boot"] = boot;

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
    const { sz, camera } = s;
    const fov  = camera.fov * Math.PI / 180;
    const dist = (Math.max(sz.x, sz.y, sz.z) / 2 / Math.tan(fov / 2)) * 1.55;
    camera.position.set(dist * 0.32, dist * 0.40, dist * 0.85);
    controlsRef.current!.target.set(0, -sz.y * 0.08, 0);
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
      <div style={{ position:"relative", flex:1, minHeight:300, borderRadius:8, overflow:"hidden", border:"1px solid #e2e8f0", background:"#ffffff", boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
        <div ref={mountRef} style={{ width:"100%", height:"100%", cursor: mode==="cable" ? "crosshair" : "grab" }} />

        {loading && (
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            background:"#ffffffee", color:"#475569", fontSize:13, gap:10, textAlign:"center" }}>
            <div style={{ width:32, height:32, border:"3px solid #cbd5e1", borderTopColor:"#fa4616", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
            <span>{debugMsg}</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Top-left hint */}
        <div style={{ position:"absolute", top:10, left:12, color:"#64748b", fontSize:11, pointerEvents:"none", fontWeight:500 }}>
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
                border:`1.5px solid ${mode===m ? bg : "#cbd5e1"}`,
                background:mode===m ? bg : "rgba(255,255,255,0.92)", backdropFilter:"blur(8px)",
                color:mode===m ? "#fff" : "#475569",
                boxShadow:"0 1px 2px rgba(0,0,0,0.08)" }}>
              {label}
            </button>
          ))}
          {mode === "cable" && connectedCount > 0 && (
            <button onClick={() => { setPlugged({}); showFb("All cables removed.", true); }}
              style={{ padding:"5px 13px", fontSize:11, borderRadius:20, cursor:"pointer",
                border:"1.5px solid #cbd5e1", background:"rgba(255,255,255,0.92)", backdropFilter:"blur(8px)", color:"#475569",
                boxShadow:"0 1px 2px rgba(0,0,0,0.08)" }}>
              ↺ Reset
            </button>
          )}
        </div>

        {/* Zoom controls */}
        <div style={{ position:"absolute", right:10, bottom:10, display:"flex", flexDirection:"column", gap:4 }}>
          {[{l:"+",f:()=>zoom(0.82),t:"Zoom in"},{l:"−",f:()=>zoom(1.22),t:"Zoom out"},{l:"⟳",f:resetView,t:"Reset"}].map(b=>(
            <button key={b.l} onClick={b.f} title={b.t}
              style={{ width:30, height:30, borderRadius:6, border:"1px solid #cbd5e1", background:"#ffffffee", color:"#334155", cursor:"pointer", fontSize:b.l==="⟳"?13:17, boxShadow:"0 1px 2px rgba(0,0,0,0.08)" }}>
              {b.l}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div role="status"
          style={{ padding:"7px 14px", borderRadius:5, fontSize:12, fontWeight:600, whiteSpace:"pre-line",
            background:feedback.ok ? "#dcfce7" : "#fee2e2",
            color:feedback.ok ? "#15803d" : "#b91c1c",
            border:`1px solid ${feedback.ok ? "#86efac" : "#fca5a5"}` }}>
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
              Step 2 — Click port on model  <span style={{ color:"#94a3b8", fontWeight:400, textTransform:"none" }}>or use buttons below as backup</span>
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
