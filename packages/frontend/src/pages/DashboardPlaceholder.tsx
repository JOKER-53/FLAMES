import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { ScenarioSession } from "../hooks/useScenarioSession";
import { PORTS, CABLE_TYPES, acceptsCable } from "../hardware/cables";

interface DashboardProps { session: ScenarioSession; }
interface PartInfo { title: string; body: string; }

function disposeObject(object: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  object.traverse(child => {
    if (!(child instanceof THREE.Mesh)) return;
    geometries.add(child.geometry);
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  textures.forEach(texture => texture.dispose());
  materials.forEach(material => material.dispose());
  geometries.forEach(geometry => geometry.dispose());
}

const PART_INFO: Record<string, PartInfo> = {
  chassis:  { title: "Chassis — Desktop Form Factor", body: "The FortiGate 60F sits flat on a desk or shelf. The cream/white polycarbonate enclosure houses the CPU, NP6Lite ASIC, RAM, and flash." },
  wan1:     { title: "WAN1 — Primary Internet Uplink", body: "WAN1 is the default gateway interface. Connects to your ISP modem or CPE. All outbound NAT exits through this port." },
  wan2:     { title: "WAN2 — Secondary / Backup Uplink", body: "WAN2 provides ISP redundancy. With SD-WAN, FortiOS can fail over to WAN2 if WAN1 goes down." },
  dmz:      { title: "DMZ — Demilitarized Zone Port", body: "Dedicated DMZ interface for public-facing servers. Traffic between DMZ and LAN must pass explicit firewall policies." },
  ha:       { title: "HA Pair (B ↔ A) — Heartbeat Ports", body: "HA heartbeat signals between two FortiGate units. Connect directly — never through a switch." },
  lan:      { title: "Ports 1–5 — Internal LAN (1GbE)", body: "Five copper GE ports for internal workstations and servers. Default to a hardware-switch zone." },
  console:  { title: "CONSOLE — Serial Management Port", body: "RJ-45 serial console (9600 baud, 8N1). Last resort when management IP is unreachable." },
  usb:      { title: "USB 3.0 — Recovery & Provisioning", body: "For firmware recovery, zero-touch config import, or FortiToken USB keys." },
  reset:    { title: "RESET — Factory Reset Pinhole", body: "Hold 10+ seconds to factory-reset — all config wiped." },
  power:    { title: "DC+12V — Power Input", body: "12V DC barrel jack. No redundant PSU on the 60F — use a UPS in production." },
  leds:     { title: "Status LEDs", body: "PWR (green), STATUS (green/amber), HA (green). Per-port activity LEDs. LINK/ACT blinks on traffic." },
  vents:    { title: "Side Ventilation", body: "Passive convection vents. The 60F is completely fanless — never block airflow." },
};


export function DashboardPlaceholder({ session: _ }: DashboardProps) {
  const mountRef  = useRef<HTMLDivElement>(null);
  const threeRef  = useRef<{
    camera: THREE.PerspectiveCamera;
    group:  THREE.Group;
    portIndicators: Record<string, THREE.Mesh>;
    cableMeshes:    Record<string, THREE.Object3D>;
    size:   THREE.Vector3;
    rotX:   number;
    rotY:   number;
  } | null>(null);

  const [loading,  setLoading]  = useState(true);
  const [loadErr,  setLoadErr]  = useState<string|null>(null);
  const [selected, setSelected] = useState<PartInfo|null>(null);
  const [mode,     setMode]     = useState<"explore"|"cable">("explore");
  const [selCable, setSelCable] = useState<string|null>(null);
  const [plugged,  setPlugged]  = useState<Record<string,string>>({});
  const [feedback, setFeedback] = useState<{msg:string;ok:boolean}|null>(null);
  const modeRef   = useRef("explore");
  const cableRef  = useRef<string|null>(null);
  const pluggedRef = useRef(plugged);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current); }, []);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { cableRef.current = selCable; }, [selCable]);
  useEffect(() => { pluggedRef.current = plugged; }, [plugged]);

  function showFeedback(msg: string, ok: boolean) {
    setFeedback({ msg, ok });
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 3500);
  }

  function handlePortClick(portId: string) {
    const cable = CABLE_TYPES.find(c => c.id === cableRef.current);
    if (!cable) { showFeedback("Select a cable first.", false); return; }
    if (!acceptsCable(cable.id, portId)) {
      showFeedback(`✗ ${cable.label} cannot plug into ${portId.toUpperCase()}.`, false); return;
    }
    if (pluggedRef.current[portId]) {
      setPlugged(p => { const n={...p}; delete n[portId]; return n; });
      showFeedback(`Unplugged from ${portId.toUpperCase()}.`, true);
    } else {
      setPlugged(p => ({ ...p, [portId]: cable.id }));
      showFeedback(`✓ ${cable.label} → ${portId.toUpperCase()}.`, true);
    }
  }

  useEffect(() => {
    if (!mountRef.current) return;
    const mount = mountRef.current;
    const W = mount.clientWidth || 900;
    const H = mount.clientHeight || 460;

    let disposed = false;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); }
    catch { setLoadErr("3D rendering is unavailable. Enable WebGL or try another browser."); setLoading(false); return; }
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1117);
    const camera = new THREE.PerspectiveCamera(45, W/H, 0.0001, 100000);
    camera.position.set(0, 0, 10);
    const resizeObserver = new ResizeObserver(() => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(mount);

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const d1 = new THREE.DirectionalLight(0xffffff, 1.0); d1.position.set(5,10,10);  scene.add(d1);
    const d2 = new THREE.DirectionalLight(0xffffff, 0.8); d2.position.set(-5,5,10);  scene.add(d2);
    const d3 = new THREE.DirectionalLight(0xffffff, 0.5); d3.position.set(0,-5,10);  scene.add(d3);
    const d4 = new THREE.DirectionalLight(0xffffff, 0.4); d4.position.set(0,5,-10);  scene.add(d4);

    const group = new THREE.Group();
    scene.add(group);
    const portIndicators: Record<string, THREE.Mesh> = {};
    const cableMeshes:    Record<string, THREE.Object3D> = {};

    // Store in ref immediately — persists across renders
    threeRef.current = { camera, group, portIndicators, cableMeshes, size: new THREE.Vector3(), rotX: -0.22, rotY: 0 };

    const loader = new GLTFLoader();
    loader.load("/firewall.glb", (gltf) => {
      const model = gltf.scene;
      if (disposed) { disposeObject(model); return; }
      const box0 = new THREE.Box3().setFromObject(model);
      const size0 = new THREE.Vector3(); box0.getSize(size0);
      const scale = 8 / Math.max(size0.x, size0.y, size0.z);
      model.scale.setScalar(scale);
      const box1 = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3(); box1.getCenter(center);
      model.position.sub(center);
      model.traverse((c: any) => {
        if (c.isMesh) {
          const mats = Array.isArray(c.material) ? c.material : [c.material];
          mats.forEach((m: any) => { if (m) { m.side = THREE.FrontSide; if (m.emissiveIntensity) m.emissiveIntensity = 0.3; m.needsUpdate = true; }});
        }
      });
      group.add(model);

      const box2 = new THREE.Box3().setFromObject(group);
      const sz = new THREE.Vector3(); box2.getSize(sz);
      const fov = camera.fov * Math.PI/180;
      const dist = (Math.max(sz.x,sz.y,sz.z)/2) / Math.tan(fov/2) * 1.6;
      camera.position.set(0, -sz.y*0.08, dist * 0.78);
      camera.near = dist/1000; camera.far = dist*100;
      camera.updateProjectionMatrix();

      if (threeRef.current) threeRef.current.size = sz;

      // Port indicator spheres. These positions are calibrated against the
      // actual socket centres in firewall.glb; the front-panel spacing is not
      // uniform, especially between CONSOLE/WAN and HA/LAN.
      const r = sz.y * 0.028; // smaller — sits in port hole
      const portY = sz.y * -0.164;
      const portZ = box2.max.z; // derive from the actual front panel, not an outdated fixed depth
      PORTS.forEach(({ id, part, x, color }) => {
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(r, 12, 12),
          new THREE.MeshStandardMaterial({ color: new THREE.Color(color), emissive: new THREE.Color(color), emissiveIntensity: 1.8, roughness: 0.2, metalness: 0.1 })
        );
        sphere.position.set(x * sz.x, portY, portZ + r * 0.5);
        sphere.visible = modeRef.current === "cable";
        sphere.userData.portId = id;
        sphere.userData.part   = part;
        group.add(sphere);
        portIndicators[id] = sphere;
      });

      setLoading(false);
    }, undefined, (err) => {
      if (disposed) return;
      setLoadErr("Could not load firewall.glb — " + ((err as any)?.message ?? String(err)));
      setLoading(false);
    });

    // Orbit
    let rotX = -0.22, rotY = 0.0, isDragging = false, prevX = 0, prevY = 0;
    let autoRotate = true;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let downX = 0, downY = 0, dragged = false;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    group.rotation.set(rotX, rotY, 0);

    function syncRotToRef() { if (threeRef.current) { threeRef.current.rotX = rotX; threeRef.current.rotY = rotY; } }
    function resetIdleTimer() { autoRotate=false; if(idleTimer)clearTimeout(idleTimer); idleTimer=setTimeout(()=>{autoRotate=true;},10000); }

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (e: MouseEvent) => {
      if (dragged) return;
      const r = mount.getBoundingClientRect();
      mouse.x = ((e.clientX-r.left)/r.width)*2-1;
      mouse.y = -((e.clientY-r.top)/r.height)*2+1;
      raycaster.setFromCamera(mouse, camera);
      const indHits = modeRef.current === "cable"
        ? raycaster.intersectObjects(Object.values(portIndicators))
        : [];
      if (indHits.length) {
        const obj = indHits[0].object as THREE.Mesh;
        if (modeRef.current==="cable") handlePortClick(obj.userData.portId);
        else setSelected(PART_INFO[obj.userData.part]??null);
        return;
      }
      const meshes: THREE.Object3D[] = [];
      group.traverse(c => { if ((c as THREE.Mesh).isMesh && !c.userData.portId) meshes.push(c); });
      if (raycaster.intersectObjects(meshes).length && modeRef.current==="explore")
        setSelected(PART_INFO["chassis"]);
    };

    const onHover = (e: MouseEvent) => {
      const r = mount.getBoundingClientRect();
      mouse.x = ((e.clientX-r.left)/r.width)*2-1;
      mouse.y = -((e.clientY-r.top)/r.height)*2+1;
      raycaster.setFromCamera(mouse, camera);
      const overPort = modeRef.current === "cable"
        && raycaster.intersectObjects(Object.values(portIndicators)).length > 0;
      mount.style.cursor = overPort
        ? "pointer"
        : (isDragging ? "grabbing" : "grab");
    };

    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      downX = e.clientX; downY = e.clientY; dragged = false;
      isDragging=true; prevX=e.clientX; prevY=e.clientY;
      mount.style.cursor="grabbing"; resetIdleTimer();
    };
    const onUp   = () => {
      isDragging=false;
      mount.style.cursor = "grab";
    };
    const onMove = (e: MouseEvent) => {
      if (!isDragging) return;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 4) dragged = true;
      rotY += (e.clientX-prevX)*0.007; rotX += (e.clientY-prevY)*0.005;
      rotX = Math.max(-0.4, Math.min(1.1, rotX));
      prevX=e.clientX; prevY=e.clientY;
      group.rotation.set(rotX,rotY,0); syncRotToRef();
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); resetIdleTimer();
      camera.position.z = Math.min(50, Math.max(0.5, camera.position.z * Math.exp(Math.max(-200, Math.min(200, e.deltaY)) * 0.001)));
    };
    const onTS = (e: TouchEvent) => {
      dragged = false; downX = e.touches[0].clientX; downY = e.touches[0].clientY;
      resetIdleTimer(); prevX=e.touches[0].clientX;
      prevY=e.touches[0].clientY; isDragging=true;
    };
    const onTM = (e: TouchEvent) => {
      e.preventDefault(); if(!isDragging)return;
      if (Math.hypot(e.touches[0].clientX - downX, e.touches[0].clientY - downY) > 4) dragged = true;
      rotY+=(e.touches[0].clientX-prevX)*0.009; rotX+=(e.touches[0].clientY-prevY)*0.007;
      rotX=Math.max(-0.4,Math.min(1.1,rotX));
      prevX=e.touches[0].clientX; prevY=e.touches[0].clientY;
      group.rotation.set(rotX,rotY,0); syncRotToRef();
    };
    const onTE = () => { isDragging=false; };

    mount.addEventListener("click",      onClick);
    mount.addEventListener("mousemove",  onHover);
    mount.addEventListener("mousedown",  onDown);
    window.addEventListener("mouseup",   onUp);
    window.addEventListener("mousemove", onMove);
    mount.addEventListener("wheel",      onWheel, {passive:false});
    mount.addEventListener("touchstart", onTS);
    mount.addEventListener("touchmove",  onTM, {passive:false});
    mount.addEventListener("touchend",   onTE);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      // Check for reset signal from ref
      if (threeRef.current && (threeRef.current.rotX !== rotX || threeRef.current.rotY !== rotY)) { rotX = threeRef.current.rotX; rotY = threeRef.current.rotY; group.rotation.set(rotX,rotY,0); }
      if (autoRotate && !isDragging && !reducedMotion.matches && modeRef.current === "explore") {
        rotY+=0.004; group.rotation.set(rotX,rotY,0); syncRotToRef();
      }
      renderer.render(scene,camera);
    };
    animate();

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      cancelAnimationFrame(animId);
      if (idleTimer) clearTimeout(idleTimer);
      mount.removeEventListener("click",      onClick);
      mount.removeEventListener("mousemove",  onHover);
      mount.removeEventListener("mousedown",  onDown);
      window.removeEventListener("mouseup",   onUp);
      window.removeEventListener("mousemove", onMove);
      mount.removeEventListener("wheel",      onWheel);
      mount.removeEventListener("touchstart", onTS);
      mount.removeEventListener("touchmove",  onTM);
      mount.removeEventListener("touchend",   onTE);
      disposeObject(group);
      threeRef.current = null;
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  // Rebuild cables when plugged changes
  useEffect(() => {
    const t = threeRef.current;
    if (!t || !t.size.x) return;
    const { group, portIndicators, cableMeshes, size } = t;

    Object.values(cableMeshes).forEach(m => {
      group.remove(m);
      if (m instanceof THREE.Mesh) {
        m.geometry.dispose();
        const materials = Array.isArray(m.material) ? m.material : [m.material];
        materials.forEach(material => material.dispose());
      }
    });
    Object.keys(cableMeshes).forEach(k => delete cableMeshes[k]);

    if (mode !== "cable") {
      Object.values(portIndicators).forEach(mesh => {
        mesh.visible = false;
        (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2;
      });
      return;
    }

    Object.entries(portIndicators).forEach(([portId, mesh]) => {
      const cableId = plugged[portId];
      const cable   = CABLE_TYPES.find(c => c.id === cableId);
      mesh.visible = !cable;
      (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = cable ? 2.5 : 1.2;
      if (!cable) return;

      const sp   = mesh.position.clone();
      const cCol = new THREE.Color(cable.color);
      const cMat = new THREE.MeshStandardMaterial({ color: cCol, roughness: 0.45, metalness: 0.2 });

      const isPower = cable.id === "dc-power";
      const isUsb = cable.id === "usb";
      const pw = size.y * (isUsb ? 0.09 : isPower ? 0.12 : 0.22);
      const ph = size.y * (isUsb ? 0.18 : isPower ? 0.12 : 0.18);
      const pd = size.y * 0.27;
      const plug = new THREE.Mesh(isPower
        ? new THREE.CylinderGeometry(pw / 2, pw / 2, pd, 16)
        : new THREE.BoxGeometry(pw, ph, pd), cMat);
      if (isPower) plug.rotation.x = Math.PI / 2;
      // Sink the rear of the connector slightly into the socket so the
      // projected plug remains visually anchored while the chassis rotates.
      plug.position.set(sp.x, sp.y, sp.z+pd*0.35);
      group.add(plug); cableMeshes[portId+"_plug"]=plug;

      if (!isPower && !isUsb) {
      // RJ-45 latch and eight contacts; USB and power use different connector geometry.
      const latch = new THREE.Mesh(new THREE.BoxGeometry(pw*0.4,ph*0.12,pd*0.5),
        new THREE.MeshStandardMaterial({color:cCol,roughness:0.2,metalness:0.6}));
      latch.position.set(sp.x, sp.y-ph*0.56, sp.z+pd*0.25);
      group.add(latch); cableMeshes[portId+"_latch"]=latch;

      // Gold pins
      const pinMat = new THREE.MeshStandardMaterial({color:0xd4a017,roughness:0.15,metalness:0.95});
      for (let p=0; p<8; p++) {
        const pin = new THREE.Mesh(new THREE.BoxGeometry(pw*0.06,ph*0.35,pd*0.08),pinMat);
        pin.position.set(sp.x+(p-3.5)*pw*0.11, sp.y+ph*0.1, sp.z+pd*0.45);
        group.add(pin); cableMeshes[portId+`_pin${p}`]=pin;
      }
      } else {
        const metal = new THREE.MeshStandardMaterial({ color: 0xb7bdc5, roughness: 0.3, metalness: 0.8 });
        const tip = new THREE.Mesh(isPower
          ? new THREE.CylinderGeometry(pw * 0.28, pw * 0.28, pd * 0.45, 16)
          : new THREE.BoxGeometry(pw * 0.8, ph * 0.8, pd * 0.45), metal);
        if (isPower) tip.rotation.x = Math.PI / 2;
        tip.position.set(sp.x, sp.y, sp.z - pd * 0.12);
        group.add(tip); cableMeshes[portId + "_tip"] = tip;
      }

      // Boot (strain relief)
      const boot = new THREE.Mesh(new THREE.CylinderGeometry(size.y*0.048,size.y*0.038,size.y*0.10,12),cMat);
      boot.rotation.x=Math.PI/2;
      boot.position.set(sp.x, sp.y, sp.z+pd*0.8+size.y*0.03);
      group.add(boot); cableMeshes[portId+"_boot"]=boot;

      // Compact, deterministic cable tail. Long randomized tails obscured the
      // appliance and appeared detached when the chassis was rotated.
      const cr = size.y*0.018;
      const sz2 = sp.z+pd*0.8+size.y*0.07;
      const bendSeed = [...portId].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
      const bend = ((bendSeed % 7) - 3) * size.y * 0.012;
      const pts = [
        new THREE.Vector3(sp.x, sp.y, sz2),
        new THREE.Vector3(sp.x+bend*0.2, sp.y-size.y*0.10, sz2+size.z*0.035),
        new THREE.Vector3(sp.x+bend*0.7, sp.y-size.y*0.28, sz2+size.z*0.075),
        new THREE.Vector3(sp.x+bend,     sp.y-size.y*0.48, sz2+size.z*0.10),
        new THREE.Vector3(sp.x+bend*0.8, sp.y-size.y*0.72, sz2+size.z*0.11),
      ];
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,false,"catmullrom",0.5),30,cr,10,false),
        new THREE.MeshStandardMaterial({color:cCol,roughness:0.65,metalness:0.05})
      );
      group.add(tube); cableMeshes[portId+"_tube"]=tube;
    });
  }, [plugged, loading, mode]);

  // Zoom/reset handlers via threeRef
  function zoomIn()  { if (threeRef.current) threeRef.current.camera.position.z = Math.max(0.5, threeRef.current.camera.position.z*0.82); }
  function zoomOut() { if (threeRef.current) threeRef.current.camera.position.z = Math.min(50,  threeRef.current.camera.position.z*1.22); }
  function resetView() {
    if (!threeRef.current) return;
    threeRef.current.rotX = 0;
    threeRef.current.rotY = 0;
    threeRef.current.camera.position.z = 15.5;
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", gap:8 }}>
      <div>
        <h1 className="text-[15px] font-semibold text-forti-dark mb-0.5">FortiGate 60F — Interactive Hardware Reference</h1>
        <p className="text-gray-500 text-[12px]">
          {mode==="explore" ? "Auto-rotates · drag · scroll to zoom · click any part to learn" : "Select a cable — click the matching glowing port dot to plug in"}
        </p>
      </div>

      {/* 3D Viewport with overlay controls */}
      <div style={{ flex:"1 0 320px", minHeight:320, position:"relative" }}>
        <div ref={mountRef} style={{ width:"100%", height:"100%", borderRadius:8, overflow:"hidden", border:"1px solid #1e2d45", background:"#0d1117", cursor:"grab" }}>
          {loading && !loadErr && (
            <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12 }}>
              <div style={{ width:36, height:36, border:"3px solid #1e2d45", borderTopColor:"#ef4444", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
              <span style={{ color:"#4b5563", fontSize:13 }}>Loading 3D model…</span>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}
          {loadErr && <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", color:"#f87171", fontSize:13, padding:24, textAlign:"center" }}>{loadErr}</div>}
        </div>

        {/* Zoom + Reset — bottom right */}
        <div style={{ position:"absolute", bottom:12, right:12, display:"flex", flexDirection:"column", gap:4 }}>
          {[
            { label:"+", title:"Zoom in",  fn: zoomIn  },
            { label:"−", title:"Zoom out", fn: zoomOut  },
            { label:"⟳", title:"Reset",    fn: resetView },
          ].map(({label,title,fn}) => (
            <button key={label} onClick={fn} title={title} aria-label={title}
              style={{ width:32, height:32, borderRadius:6, border:"1px solid #2d3f5a", background:"rgba(13,17,23,0.88)", backdropFilter:"blur(8px)", color:"#cbd5e1", fontSize:label==="⟳"?13:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Mode pills — bottom left */}
        <div style={{ position:"absolute", bottom:12, left:12, display:"flex", gap:6 }}>
          {[
            { m:"explore" as const, label:"🔍 Explore",     bg:"#ef4444" },
            { m:"cable"   as const, label:"🔌 Cable Mode",  bg:"#2563eb" },
          ].map(({m,label,bg}) => (
            <button key={m}
              aria-pressed={mode === m}
              onClick={() => {
                setMode(m);
                if (m === "explore") {
                  setSelCable(null); setFeedback(null);
                } else {
                  setSelected(null); resetView();
                }
              }}
              style={{ padding:"5px 12px", fontSize:11, borderRadius:20, border:`1.5px solid ${mode===m?bg:"#2d3f5a"}`, cursor:"pointer",
                background: mode===m ? bg+"dd" : "rgba(13,17,23,0.82)", backdropFilter:"blur(8px)",
                color: mode===m ? "#fff" : "#94a3b8" }}>
              {label}
            </button>
          ))}
          {mode==="cable" && Object.keys(plugged).length>0 && (
            <button onClick={() => setPlugged({})}
              style={{ padding:"5px 12px", fontSize:11, borderRadius:20, border:"1.5px solid #2d3f5a", cursor:"pointer", background:"rgba(13,17,23,0.82)", backdropFilter:"blur(8px)", color:"#94a3b8" }}>
              ↺ Reset
            </button>
          )}
        </div>

        {/* Hint — top left */}
        <div style={{ position:"absolute", top:10, left:12, fontSize:11, color:"#3d5270", pointerEvents:"none" }}>
          {mode==="explore" ? "drag · scroll · click to learn" : "select cable → click glowing dot"}
        </div>
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div role="status" style={{ padding:"6px 14px", borderRadius:4, fontSize:12, fontWeight:500,
          background:feedback.ok?"#052e16":"#450a0a", color:feedback.ok?"#4ade80":"#f87171",
          border:`1px solid ${feedback.ok?"#166534":"#991b1b"}` }}>{feedback.msg}</div>
      )}

      {/* Cable selector */}
      {mode==="cable" && (
        <div style={{ background:"var(--surface-1)", border:"0.5px solid var(--border)", borderRadius:"var(--radius)", padding:"10px 12px" }}>
          <div style={{ fontSize:11, color:"var(--text-muted)", marginBottom:7, textTransform:"uppercase", letterSpacing:"0.06em" }}>Select a cable — then click the matching glowing dot on the model</div>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
            {CABLE_TYPES.map(c => (
              <button key={c.id} aria-pressed={selCable === c.id} onClick={() => { const next = selCable === c.id ? null : c.id; cableRef.current = next; setSelCable(next); }}
                style={{ padding:"4px 10px", fontSize:11, borderRadius:4, cursor:"pointer",
                  border:`1.5px solid ${selCable===c.id?c.color:"var(--border)"}`,
                  background:selCable===c.id?c.color+"22":"var(--surface-2)",
                  color:selCable===c.id?c.color:"var(--text-secondary)",
                  display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ width:8,height:8,borderRadius:"50%",background:c.color,display:"inline-block" }}/>
                {c.label}{Object.values(plugged).includes(c.id)?" ✓":""}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 12, margin: "10px 0 6px", color: "var(--text-secondary)" }}>{Object.keys(plugged).length} / {PORTS.length} sockets connected. Select a cable, then use the model or a port button below. Connected ports can be unplugged.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }} aria-label="Cable practice ports">
            {PORTS.map(port => <button key={port.id} aria-pressed={!!plugged[port.id]}
              onClick={() => {
                if (plugged[port.id]) {
                  setPlugged(previous => { const next = { ...previous }; delete next[port.id]; return next; });
                  showFeedback(`Unplugged ${port.id.toUpperCase()}.`, true);
                } else handlePortClick(port.id);
              }}
              style={{ fontSize: 11, padding: "6px 9px", border: "1px solid var(--border)", borderRadius: 4, background: plugged[port.id] ? "#dcfce7" : "var(--surface-2)", color: "var(--text-primary)" }}>
              {port.id.toUpperCase()} {plugged[port.id] ? "✓ Unplug" : "Connect"}
            </button>)}
          </div>
          {selCable && <p style={{ fontSize:11, color:"var(--text-muted)", marginTop:7, marginBottom:0 }}>{CABLE_TYPES.find(c=>c.id===selCable)?.desc}</p>}
          {Object.keys(plugged).length>0 && (
            <div style={{ marginTop:7, display:"flex", gap:5, flexWrap:"wrap" }}>
              {Object.entries(plugged).map(([pid,cid]) => {
                const c = CABLE_TYPES.find(x=>x.id===cid);
                return <span key={pid} style={{ fontSize:11, padding:"2px 8px", borderRadius:3, background:c?.color+"22", color:c?.color, border:`1px solid ${c?.color}44` }}>{pid.toUpperCase()} ← {c?.label}</span>;
              })}
            </div>
          )}
        </div>
      )}

      {/* Info panel */}
      {mode==="explore" && (
        <div style={{ background:"var(--surface-2)", border:"0.5px solid var(--border)", borderRadius:"var(--radius)", padding:"10px 14px", minHeight:56 }}>
          {selected
            ? <><div style={{ fontSize:13, fontWeight:500, color:"var(--text-primary)", marginBottom:3 }}>{selected.title}</div>
                 <p style={{ fontSize:12, color:"var(--text-secondary)", lineHeight:1.6, margin:0 }}>{selected.body}</p></>
            : <p style={{ fontSize:12, color:"var(--text-muted)", margin:0 }}>Drag to rotate, scroll to zoom, or click the chassis to inspect the appliance.</p>}
        </div>
      )}
    </div>
  );
}
