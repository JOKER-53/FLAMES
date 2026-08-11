import { useEffect, useRef, useState } from "react";
import { ScenarioSession } from "../hooks/useScenarioSession";

interface DashboardProps { session: ScenarioSession; }
interface PartInfo { title: string; body: string; }

const PART_INFO: Record<string, PartInfo> = {
  chassis:  { title: "Chassis — Desktop Form Factor", body: "The FortiGate 60F sits flat on a desk or shelf. The cream/white polycarbonate enclosure houses the CPU, NP6Lite ASIC, RAM, and flash. Four rubber feet allow airflow underneath." },
  wan1:     { title: "WAN1 — Primary Internet Uplink", body: "WAN1 is the default gateway interface. Connects to your ISP modem or CPE. All outbound NAT exits through this port by default." },
  wan2:     { title: "WAN2 — Secondary / Backup Uplink", body: "WAN2 provides ISP redundancy. With SD-WAN, FortiOS can fail over to WAN2 if WAN1 goes down." },
  dmz:      { title: "DMZ — Demilitarized Zone Port", body: "Dedicated DMZ interface for public-facing servers. Traffic between DMZ and LAN must pass explicit firewall policies." },
  ha:       { title: "HA Pair (B ↔ A) — Heartbeat Ports", body: "These two ports carry HA heartbeat signals between two FortiGate units. Connect directly — never through a switch." },
  lan:      { title: "Ports 1–5 — Internal LAN (1GbE)", body: "Five copper GE ports for internal workstations and servers. Default to a hardware-switch zone." },
  console:  { title: "CONSOLE — Serial Management Port", body: "RJ-45 serial console (9600 baud, 8N1). Last resort when management IP is unreachable." },
  usb:      { title: "USB 3.0 — Recovery & Provisioning", body: "For firmware recovery, zero-touch config import, or FortiToken USB keys." },
  reset:    { title: "RESET — Factory Reset Pinhole", body: "Hold 10+ seconds to factory-reset — all config wiped." },
  power:    { title: "DC+12V — Power Input", body: "12V DC barrel jack. No redundant PSU on the 60F — use a UPS in production." },
  leds:     { title: "Status LEDs", body: "PWR (green), STATUS (green/amber), HA (green). Per-port activity LEDs. LINK/ACT blinks on traffic." },
  vents:    { title: "Side Ventilation", body: "Passive convection vents. The 60F is completely fanless — never block airflow." },
};

const CABLE_TYPES = [
  { id: "rj45-wan",     label: "RJ-45 WAN Cable",        color: "#f97316", accepts: ["wan1","wan2"],  desc: "Ethernet cable for internet uplink." },
  { id: "rj45-lan",     label: "RJ-45 LAN Cable",        color: "#2563eb", accepts: ["lan"],          desc: "Ethernet patch cable for internal workstations." },
  { id: "rj45-dmz",     label: "RJ-45 DMZ Cable",        color: "#0d9488", accepts: ["dmz"],          desc: "Ethernet cable for DMZ public-facing servers." },
  { id: "rj45-console", label: "Rollover Console Cable", color: "#94a3b8", accepts: ["console"],      desc: "Cisco-style rollover cable for serial console access." },
  { id: "rj45-ha",      label: "HA Crossover Cable",     color: "#7c3aed", accepts: ["ha"],           desc: "Direct crossover cable between HA peers." },
  { id: "usb-a",        label: "USB Drive",              color: "#60a5fa", accepts: ["usb"],          desc: "USB flash drive for firmware recovery or provisioning." },
  { id: "dc-power",     label: "DC Power Adapter",       color: "#fbbf24", accepts: ["power"],        desc: "12V DC barrel connector from the power adapter." },
];

declare global { interface Window { THREE: any; } }

export function DashboardPlaceholder({ session: _ }: DashboardProps) {
  const mountRef  = useRef<HTMLDivElement>(null);
  const threeRef  = useRef<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [loadErr,  setLoadErr]  = useState<string|null>(null);
  const [selected, setSelected] = useState<PartInfo|null>(null);
  const [mode,     setMode]     = useState<"explore"|"cable">("explore");
  const [selCable, setSelCable] = useState<string|null>(null);
  const [plugged,  setPlugged]  = useState<Record<string,string>>({});
  const [feedback, setFeedback] = useState<{msg:string;ok:boolean}|null>(null);
  const modeRef  = useRef("explore");
  const cableRef = useRef<string|null>(null);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { cableRef.current = selCable; }, [selCable]);

  function showFeedback(msg: string, ok: boolean) {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 2500);
  }

  function handlePortClick(portId: string) {
    const cable = CABLE_TYPES.find(c => c.id === cableRef.current);
    if (!cable) { showFeedback("Select a cable from the panel first.", false); return; }
    const basePort = portId.replace(/-[ab\d]+$/, "");
    if (!cable.accepts.includes(basePort)) {
      showFeedback(`✗ Wrong port — ${cable.label} cannot plug into ${portId.toUpperCase()}.`, false);
      return;
    }
    if (plugged[portId]) {
      setPlugged(p => { const n={...p}; delete n[portId]; return n; });
      showFeedback(`Unplugged from ${portId.toUpperCase()}.`, true);
    } else {
      setPlugged(p => ({ ...p, [portId]: cable.id }));
      showFeedback(`✓ ${cable.label} plugged into ${portId.toUpperCase()}.`, true);
    }
  }

  useEffect(() => {
    if (!mountRef.current) return;
    const mount = mountRef.current;

    function loadScript(src: string): Promise<void> {
      return new Promise((res, rej) => {
        if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
        const s = document.createElement("script");
        s.src = src; s.onload = () => res(); s.onerror = () => rej(new Error("Failed: " + src));
        document.head.appendChild(s);
      });
    }

    (async () => {
      try {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js");
        await loadScript("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js");
      } catch (e: any) {
        setLoadErr("Failed to load 3D libs: " + e.message);
        setLoading(false);
        return;
      }

      const THREE = (window as any).THREE;
      const W = mount.clientWidth || 900;
      const H = mount.clientHeight || 460;

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0d1117);

      // Use OrthographicCamera initially then switch — actually just use perspective with safe near
      const camera = new THREE.PerspectiveCamera(45, W / H, 0.0001, 100000);
      camera.position.set(0, 0, 10);
      camera.lookAt(0, 0, 0);

      // Strong lighting from all angles so nothing is black
      scene.add(new THREE.AmbientLight(0xffffff, 1.5));
      const d1 = new THREE.DirectionalLight(0xffffff, 1.0); d1.position.set(5, 10, 10); scene.add(d1);
      const d2 = new THREE.DirectionalLight(0xffffff, 0.8); d2.position.set(-5, 5, 10); scene.add(d2);
      const d3 = new THREE.DirectionalLight(0xffffff, 0.6); d3.position.set(0, -5, 10); scene.add(d3);
      const d4 = new THREE.DirectionalLight(0xffffff, 0.5); d4.position.set(0, 5, -10); scene.add(d4);

      const group = new THREE.Group();
      scene.add(group);
      const portIndicators: Record<string, any> = {};
      const cableMeshes: Record<string, any> = {};

      const loader = new (THREE as any).GLTFLoader();
      loader.load(
        "/firewall.glb",
        (gltf: any) => {
          const model = gltf.scene;

          // Log everything for debugging
          console.log("GLB loaded. Traversing meshes:");
          model.traverse((child: any) => {
            if (child.isMesh) {
              console.log("Mesh:", child.name, "pos:", child.position, "mat:", child.material?.type);
            }
          });

          // Compute bounding box BEFORE scaling
          const box0 = new THREE.Box3().setFromObject(model);
          const size0 = new THREE.Vector3();
          box0.getSize(size0);
          console.log("Raw size:", size0, "Raw center:", box0.getCenter(new THREE.Vector3()));

          // Scale to fit ~8 units
          const maxDim = Math.max(size0.x, size0.y, size0.z);
          const scale = maxDim > 0 ? 8 / maxDim : 1;
          model.scale.setScalar(scale);

          // Re-center after scale
          const box1 = new THREE.Box3().setFromObject(model);
          const center = new THREE.Vector3();
          box1.getCenter(center);
          model.position.sub(center);

          group.add(model);

          // Get final bounds
          const box2 = new THREE.Box3().setFromObject(group);
          const size2 = new THREE.Vector3();
          box2.getSize(size2);
          console.log("Final size:", size2);

          // Position camera to frame the model
          const maxS = Math.max(size2.x, size2.y, size2.z);
          const dist = maxS / (2 * Math.tan((45 * Math.PI / 180) / 2)) * 1.5;
          camera.position.set(0, size2.y * 0.3, dist);
          camera.near = dist / 1000;
          camera.far  = dist * 100;
          camera.updateProjectionMatrix();
          camera.lookAt(0, 0, 0);
          console.log("Camera Z:", dist);

          // Add port indicator spheres on front face
          const frontZ = size2.z / 2;
          const r = size2.y * 0.055;
          const portDefs = [
            { id:"reset",   part:"reset",   x:-0.46*size2.x, y:0,             color:"#dc2626" },
            { id:"power",   part:"power",   x:-0.40*size2.x, y:0,             color:"#fbbf24" },
            { id:"usb",     part:"usb",     x:-0.33*size2.x, y:0.04*size2.y,  color:"#60a5fa" },
            { id:"console", part:"console", x:-0.26*size2.x, y:0,             color:"#94a3b8" },
            { id:"wan2",    part:"wan2",    x:-0.19*size2.x, y:0,             color:"#f97316" },
            { id:"wan1",    part:"wan1",    x:-0.12*size2.x, y:0,             color:"#f97316" },
            { id:"dmz",     part:"dmz",     x:-0.05*size2.x, y:0,             color:"#0d9488" },
            { id:"ha-b",    part:"ha",      x: 0.02*size2.x, y:0,             color:"#7c3aed" },
            { id:"ha-a",    part:"ha",      x: 0.09*size2.x, y:0,             color:"#7c3aed" },
            { id:"lan-5",   part:"lan",     x: 0.17*size2.x, y:0,             color:"#2563eb" },
            { id:"lan-4",   part:"lan",     x: 0.24*size2.x, y:0,             color:"#2563eb" },
            { id:"lan-3",   part:"lan",     x: 0.31*size2.x, y:0,             color:"#2563eb" },
            { id:"lan-2",   part:"lan",     x: 0.38*size2.x, y:0,             color:"#2563eb" },
            { id:"lan-1",   part:"lan",     x: 0.45*size2.x, y:0,             color:"#2563eb" },
          ];

          portDefs.forEach(({ id, part, x, y, color }) => {
            const sphere = new THREE.Mesh(
              new THREE.SphereGeometry(r, 12, 12),
              new THREE.MeshStandardMaterial({ color: new THREE.Color(color), emissive: new THREE.Color(color), emissiveIntensity: 1.5, roughness: 0.2, metalness: 0.1 })
            );
            sphere.position.set(x, y, frontZ + r * 1.5);
            sphere.userData.portId = id;
            sphere.userData.part   = part;
            group.add(sphere);
            portIndicators[id] = sphere;
          });

          threeRef.current = { THREE, group, scene, portIndicators, cableMeshes, size: size2 };
          setLoading(false);
        },
        undefined,
        (err: any) => {
          console.error("GLB load error:", err);
          setLoadErr("Could not load firewall.glb — " + (err?.message ?? String(err)));
          setLoading(false);
        }
      );

      // Orbit
      let rotX = 0.18, rotY = 0.0, isDragging = false, prevX = 0, prevY = 0;
      let autoRotate = true;
      let idleTimer: ReturnType<typeof setTimeout> | null = null;
      group.rotation.set(rotX, rotY, 0);

      function resetIdleTimer() {
        autoRotate = false;
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => { autoRotate = true; }, 10000);
      }

      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      const onClick = (e: MouseEvent) => {
        const r = mount.getBoundingClientRect();
        mouse.x =  ((e.clientX-r.left)/r.width)*2-1;
        mouse.y = -((e.clientY-r.top)/r.height)*2+1;
        raycaster.setFromCamera(mouse, camera);
        const indicators = Object.values(portIndicators);
        const portHits = raycaster.intersectObjects(indicators);
        if (portHits.length) {
          const obj = portHits[0].object as any;
          if (modeRef.current === "cable") handlePortClick(obj.userData.portId);
          else setSelected(PART_INFO[obj.userData.part] ?? null);
          return;
        }
        const allMeshes: any[] = [];
        group.traverse((c: any) => { if (c.isMesh && !c.userData.portId) allMeshes.push(c); });
        const hits = raycaster.intersectObjects(allMeshes);
        if (hits.length && modeRef.current === "explore") setSelected(PART_INFO["chassis"]);
      };

      const onHover = (e: MouseEvent) => {
        const r = mount.getBoundingClientRect();
        mouse.x =  ((e.clientX-r.left)/r.width)*2-1;
        mouse.y = -((e.clientY-r.top)/r.height)*2+1;
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(Object.values(portIndicators));
        mount.style.cursor = hits.length ? "pointer" : (isDragging ? "grabbing" : "grab");
      };

      const onDown = (e: MouseEvent) => { isDragging=true; prevX=e.clientX; prevY=e.clientY; mount.style.cursor="grabbing"; resetIdleTimer(); };
      const onUp   = () => { isDragging=false; mount.style.cursor="grab"; };
      const onMove = (e: MouseEvent) => {
        if (!isDragging) return;
        rotY += (e.clientX-prevX)*0.007; rotX += (e.clientY-prevY)*0.005;
        rotX = Math.max(-0.4, Math.min(1.0, rotX));
        prevX=e.clientX; prevY=e.clientY;
        group.rotation.set(rotX, rotY, 0);
      };
      const onWheel = (e: WheelEvent) => {
        e.preventDefault(); resetIdleTimer();
        camera.position.z = Math.max(0.1, camera.position.z * (1 + e.deltaY * 0.001));
      };

      mount.addEventListener("click",      onClick);
      mount.addEventListener("mousemove",  onHover);
      mount.addEventListener("mousedown",  onDown);
      window.addEventListener("mouseup",   onUp);
      window.addEventListener("mousemove", onMove);
      mount.addEventListener("wheel",      onWheel, { passive: false });

      let animId: number;
      const animate = () => {
        animId = requestAnimationFrame(animate);
        if (autoRotate && !isDragging) { rotY += 0.004; group.rotation.set(rotX, rotY, 0); }
        renderer.render(scene, camera);
      };
      animate();

      return () => {
        cancelAnimationFrame(animId);
        if (idleTimer) clearTimeout(idleTimer);
        mount.removeEventListener("click", onClick);
        mount.removeEventListener("mousemove", onHover);
        mount.removeEventListener("mousedown", onDown);
        window.removeEventListener("mouseup", onUp);
        window.removeEventListener("mousemove", onMove);
        mount.removeEventListener("wheel", onWheel);
        renderer.dispose();
        if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      };
    })();
  }, []);

  // Cable tubes when plugged changes
  useEffect(() => {
    if (!threeRef.current) return;
    const { THREE, group, portIndicators, cableMeshes, size } = threeRef.current;
    Object.values(cableMeshes).forEach((m: any) => group.remove(m));
    Object.keys(cableMeshes).forEach(k => delete cableMeshes[k]);
    Object.entries(portIndicators).forEach(([portId, mesh]: [string, any]) => {
      const cableId = plugged[portId];
      const cable   = CABLE_TYPES.find(c => c.id === cableId);
      const col = new THREE.Color(cable?.color ?? mesh.material.color.getHex());
      mesh.material.emissive.set(cable ? col : new THREE.Color(mesh.userData.baseColor ?? col));
      mesh.material.emissiveIntensity = cable ? 2.0 : 1.2;
      if (cable && size) {
        const sp = mesh.position.clone();
        const head = new THREE.Mesh(
          new THREE.BoxGeometry(size.y*0.09, size.y*0.07, size.y*0.05),
          new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, metalness: 0.3 })
        );
        head.position.set(sp.x, sp.y, sp.z + size.y*0.1);
        group.add(head); cableMeshes[portId+"_head"] = head;
        const pts = [];
        for (let t=0; t<=1; t+=0.05)
          pts.push(new THREE.Vector3(
            sp.x + (Math.random()*0.04-0.02)*t,
            sp.y - t*size.y*1.1 - Math.sin(t*Math.PI)*size.y*0.25,
            sp.z + t*size.z*0.3 + size.y*0.12
          ));
        const tube = new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, size.y*0.014, 8, false),
          new THREE.MeshStandardMaterial({ color: col, roughness: 0.6, metalness: 0.1 })
        );
        group.add(tube); cableMeshes[portId+"_tube"] = tube;
      }
    });
  }, [plugged]);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", gap:8 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <h1 className="text-[15px] font-semibold text-forti-dark mb-0.5">FortiGate 60F — Interactive Hardware Reference</h1>
          <p className="text-gray-500 text-[12px]">
            {mode==="explore" ? "Auto-rotates · drag · scroll to zoom · click dots or body to learn" : "Select a cable — click the matching glowing port dot"}
          </p>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          <button onClick={() => { setMode("explore"); setSelCable(null); setFeedback(null); }}
            style={{ padding:"5px 12px", fontSize:12, borderRadius:4, border:"1px solid", cursor:"pointer",
              background:mode==="explore"?"#ef4444":"transparent", color:mode==="explore"?"#fff":"var(--text-secondary)", borderColor:mode==="explore"?"#ef4444":"var(--border)" }}>Explore</button>
          <button onClick={() => { setMode("cable"); setSelected(null); }}
            style={{ padding:"5px 12px", fontSize:12, borderRadius:4, border:"1px solid", cursor:"pointer",
              background:mode==="cable"?"#2563eb":"transparent", color:mode==="cable"?"#fff":"var(--text-secondary)", borderColor:mode==="cable"?"#2563eb":"var(--border)" }}>Cable Mode</button>
          {mode==="cable" && Object.keys(plugged).length>0 && (
            <button onClick={() => { setPlugged({}); setFeedback(null); }}
              style={{ padding:"5px 12px", fontSize:12, borderRadius:4, border:"1px solid var(--border)", cursor:"pointer", color:"var(--text-secondary)", background:"transparent" }}>Reset</button>
          )}
        </div>
      </div>

      <div ref={mountRef} style={{ flex:1, minHeight:0, borderRadius:8, overflow:"hidden", border:"1px solid #1e2d45", background:"#0d1117", cursor:"grab", position:"relative" }}>
        {loading && !loadErr && (
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12 }}>
            <div style={{ width:36, height:36, border:"3px solid #1e2d45", borderTopColor:"#ef4444", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
            <span style={{ color:"#4b5563", fontSize:13 }}>Loading 3D model…</span>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}
        {loadErr && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", color:"#f87171", fontSize:13, padding:24, textAlign:"center" }}>
            {loadErr}
          </div>
        )}
      </div>

      {feedback && (
        <div style={{ padding:"7px 14px", borderRadius:4, fontSize:12, fontWeight:500,
          background:feedback.ok?"#052e16":"#450a0a", color:feedback.ok?"#4ade80":"#f87171",
          border:`1px solid ${feedback.ok?"#166534":"#991b1b"}` }}>{feedback.msg}</div>
      )}

      {mode==="cable" && (
        <div style={{ background:"var(--surface-1)", border:"0.5px solid var(--border)", borderRadius:"var(--radius)", padding:"10px 12px" }}>
          <div style={{ fontSize:11, color:"var(--text-muted)", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.06em" }}>Select a cable — then click the matching glowing dot</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {CABLE_TYPES.map(c => (
              <button key={c.id} onClick={() => setSelCable(selCable===c.id?null:c.id)}
                style={{ padding:"5px 10px", fontSize:11, borderRadius:4, cursor:"pointer",
                  border:`1.5px solid ${selCable===c.id?c.color:"var(--border)"}`,
                  background:selCable===c.id?c.color+"22":"var(--surface-2)",
                  color:selCable===c.id?c.color:"var(--text-secondary)",
                  display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:c.color, display:"inline-block" }}/>
                {c.label}{Object.values(plugged).includes(c.id)?" ✓":""}
              </button>
            ))}
          </div>
          {selCable && <p style={{ fontSize:11, color:"var(--text-muted)", marginTop:8, marginBottom:0 }}>{CABLE_TYPES.find(c=>c.id===selCable)?.desc}</p>}
          {Object.keys(plugged).length>0 && (
            <div style={{ marginTop:8, display:"flex", gap:6, flexWrap:"wrap" }}>
              {Object.entries(plugged).map(([pid,cid]) => {
                const c = CABLE_TYPES.find(x=>x.id===cid);
                return <span key={pid} style={{ fontSize:11, padding:"2px 8px", borderRadius:3, background:c?.color+"22", color:c?.color, border:`1px solid ${c?.color}44` }}>{pid.toUpperCase()} ← {c?.label}</span>;
              })}
            </div>
          )}
        </div>
      )}

      {mode==="explore" && (
        <div style={{ background:"var(--surface-2)", border:"0.5px solid var(--border)", borderRadius:"var(--radius)", padding:"10px 14px", minHeight:60 }}>
          {selected
            ? <><div style={{ fontSize:13, fontWeight:500, color:"var(--text-primary)", marginBottom:3 }}>{selected.title}</div>
                 <p style={{ fontSize:12, color:"var(--text-secondary)", lineHeight:1.6, margin:0 }}>{selected.body}</p></>
            : <p style={{ fontSize:12, color:"var(--text-muted)", margin:0 }}>Click the glowing port dots or the model body to learn about each component.</p>}
        </div>
      )}
    </div>
  );
}
