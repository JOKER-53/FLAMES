import { useEffect, useRef, useState } from "react";
import { ScenarioSession } from "../hooks/useScenarioSession";

interface DashboardProps { session: ScenarioSession; }
interface PartInfo { title: string; body: string; }

const PART_INFO: Record<string, PartInfo> = {
  chassis:  { title: "Chassis — Desktop Form Factor", body: "The FortiGate 60F sits flat on a desk or shelf. The cream/white polycarbonate enclosure houses the CPU, NP6Lite ASIC, RAM, and flash. Four rubber feet allow airflow underneath." },
  wan1:     { title: "WAN1 — Primary Internet Uplink", body: "WAN1 is the default gateway interface. Connects to your ISP modem or CPE. Configure static IP, DHCP, or PPPoE here. All outbound NAT exits through this port by default." },
  wan2:     { title: "WAN2 — Secondary / Backup Uplink", body: "WAN2 provides ISP redundancy. With SD-WAN, FortiOS can fail over to WAN2 if WAN1 goes down, or load-balance across both for higher throughput." },
  dmz:      { title: "DMZ — Demilitarized Zone Port", body: "Dedicated DMZ interface for public-facing servers. Traffic between DMZ and LAN must pass explicit firewall policies — the DMZ is semi-trusted, never fully internal." },
  ha:       { title: "HA Pair (B ↔ A) — Heartbeat Ports", body: "These two ports carry HA heartbeat signals between two FortiGate units. If the secondary stops receiving heartbeats it takes over as active. Connect directly — never through a switch." },
  lan:      { title: "Ports 1–5 — Internal LAN (1GbE)", body: "Five copper GE ports for internal workstations and servers. Default to a hardware-switch zone. Can be split into separate routed interfaces if needed." },
  console:  { title: "CONSOLE — Serial Management Port", body: "RJ-45 serial console (9600 baud, 8N1). Last resort when management IP is unreachable. Use a Cisco-style rollover cable. No authentication at early boot — keep physically secured." },
  usb:      { title: "USB 3.0 — Recovery & Provisioning", body: "For firmware recovery, zero-touch config import on first boot, or FortiToken USB keys. Device checks for a specific filename automatically on boot." },
  reset:    { title: "RESET — Factory Reset Pinhole", body: "Hold 10+ seconds to factory-reset — all config wiped. Requires physical access, which is why devices should be in locked enclosures." },
  power:    { title: "DC+12V — Power Input", body: "12V DC barrel jack for the included external adapter (100–240V AC). No redundant PSU on the 60F — use a UPS for power redundancy in production." },
  leds:     { title: "Status LEDs", body: "PWR (green), STATUS (green/amber), HA (green). Per-port activity LEDs 1–5. Right cluster: DMZ, WAN1, WAN2. LINK/ACT blinks on traffic; SPEED amber=1G." },
  vents:    { title: "Side Ventilation", body: "Passive convection vents on both sides. The 60F is completely fanless — silent operation. Never block airflow around the device." },
};

// Cable types and which ports accept them
const CABLE_TYPES = [
  { id: "rj45-wan",     label: "RJ-45 WAN Cable",     color: "#f97316", accepts: ["wan1","wan2"],           desc: "Ethernet cable for internet uplink — connects to ISP modem or CPE." },
  { id: "rj45-lan",     label: "RJ-45 LAN Cable",     color: "#2563eb", accepts: ["lan"],                   desc: "Ethernet patch cable for connecting internal workstations and switches." },
  { id: "rj45-dmz",     label: "RJ-45 DMZ Cable",     color: "#0d9488", accepts: ["dmz"],                   desc: "Ethernet cable for the DMZ segment — connects public-facing servers." },
  { id: "rj45-console", label: "Rollover Console Cable", color: "#94a3b8", accepts: ["console"],            desc: "Cisco-style rollover cable for serial console access (9600 baud, 8N1)." },
  { id: "rj45-ha",      label: "HA Crossover Cable",  color: "#7c3aed", accepts: ["ha"],                    desc: "Direct crossover cable between two FortiGate HA peers — never use a switch." },
  { id: "usb-a",        label: "USB Drive",            color: "#60a5fa", accepts: ["usb"],                   desc: "USB flash drive for firmware recovery or zero-touch config provisioning." },
  { id: "dc-power",     label: "DC Power Adapter",    color: "#fbbf24", accepts: ["power"],                  desc: "12V DC barrel connector from the included external power adapter." },
];

declare global { interface Window { THREE: any; } }

export function DashboardPlaceholder({ session: _ }: DashboardProps) {
  const mountRef   = useRef<HTMLDivElement>(null);
  const sceneRef   = useRef<any>(null);
  const [selected, setSelected]       = useState<PartInfo | null>(null);
  const [hovered,  setHovered]        = useState<string | null>(null);
  const [mode,     setMode]           = useState<"explore"|"cable">("explore");
  const [selCable, setSelCable]       = useState<string | null>(null);
  const [plugged,  setPlugged]        = useState<Record<string,string>>({});  // portId -> cableId
  const [feedback, setFeedback]       = useState<{msg:string;ok:boolean}|null>(null);
  const [threeReady, setThreeReady]   = useState(!!window.THREE);

  useEffect(() => {
    if (window.THREE) { setThreeReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    s.onload = () => setThreeReady(true);
    document.head.appendChild(s);
  }, []);

  // Show feedback briefly
  function showFeedback(msg: string, ok: boolean) {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 2500);
  }

  // Handle port click in cable mode
  function handlePortClick(portId: string) {
    if (!selCable) { showFeedback("Select a cable from the panel first.", false); return; }
    const cable = CABLE_TYPES.find(c => c.id === selCable)!;
    const basePort = portId.replace(/-\d+$/, ""); // strip numeric suffix for HA/LAN
    if (!cable.accepts.includes(basePort)) {
      showFeedback(`✗ Wrong port — ${cable.label} cannot plug into ${portId.toUpperCase()}.`, false);
      return;
    }
    if (plugged[portId]) {
      // Unplug
      setPlugged(p => { const n={...p}; delete n[portId]; return n; });
      showFeedback(`Unplugged from ${portId.toUpperCase()}.`, true);
    } else {
      setPlugged(p => ({ ...p, [portId]: selCable }));
      showFeedback(`✓ ${cable.label} plugged into ${portId.toUpperCase()}.`, true);
    }
  }

  useEffect(() => {
    if (!threeReady || !mountRef.current) return;
    const THREE = window.THREE;
    const mount = mountRef.current;
    const W = mount.clientWidth || 900;
    const H = mount.clientHeight || 460;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1117);

    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
    camera.position.set(0, 3, 9);
    camera.lookAt(0, -0.5, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xfff0e0, 0.7);
    key.position.set(3, 8, 10); scene.add(key);
    const fill = new THREE.DirectionalLight(0xa0b8e0, 0.35);
    fill.position.set(-5, 2, 5); scene.add(fill);
    const front = new THREE.DirectionalLight(0xffffff, 0.45);
    front.position.set(0, 0, 12); scene.add(front);

    const group = new THREE.Group();
    scene.add(group);

    // Port mesh registry for cable rendering
    const portMeshes: Record<string, any> = {};
    const cableMeshes: Record<string, any> = {};
    const clickables: any[] = [];

    function add(geo: any, mat: any, x: number, y: number, z: number, part: string | null, rx = 0, ry = 0, rz = 0) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.rotation.set(rx, ry, rz);
      if (part) { m.userData.part = part; clickables.push(m); }
      group.add(m);
      return m;
    }
    const B  = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
    const Cy = (r: number, h: number, s = 12)    => new THREE.CylinderGeometry(r, r, h, s);

    // ── DIMMED MATERIALS ─────────────────────────────────────────────────────
    const mBody   = new THREE.MeshStandardMaterial({ color: 0x9e9c96, roughness: 0.6,  metalness: 0.05 });
    const mTop    = new THREE.MeshStandardMaterial({ color: 0xaeaca6, roughness: 0.55, metalness: 0.04 });
    const mFront  = new THREE.MeshStandardMaterial({ color: 0x8e8c86, roughness: 0.58, metalness: 0.06 });
    const mDark   = new THREE.MeshStandardMaterial({ color: 0x14171e, roughness: 0.4,  metalness: 0.55 });
    const mBlack  = new THREE.MeshStandardMaterial({ color: 0x08090d, roughness: 0.3,  metalness: 0.6  });
    const mGray   = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.5,  metalness: 0.4  });
    const mRubber = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95, metalness: 0    });
    const mRed    = new THREE.MeshStandardMaterial({ color: 0xee1111, roughness: 0.3,  metalness: 0.2, emissive: 0xcc0000, emissiveIntensity: 0.5 });
    const mOrange = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3,  metalness: 0.2, emissive: 0xf97316, emissiveIntensity: 0.3 });
    const mBlue   = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3,  metalness: 0.2, emissive: 0x2563eb, emissiveIntensity: 0.25 });
    const mTeal   = new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.3,  metalness: 0.2, emissive: 0x0d9488, emissiveIntensity: 0.25 });
    const mPurple = new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.3,  metalness: 0.2, emissive: 0x7c3aed, emissiveIntensity: 0.3  });
    const mGreen  = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.2,  metalness: 0.1, emissive: 0x22c55e, emissiveIntensity: 1.4  });
    const mAmber  = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.2,  metalness: 0.1, emissive: 0xfbbf24, emissiveIntensity: 1.3  });
    const mGold   = new THREE.MeshStandardMaterial({ color: 0xc8960a, roughness: 0.2,  metalness: 0.9  });

    // ── CHASSIS ───────────────────────────────────────────────────────────────
    add(B(9, 1.0, 5.5),  mBody,  0,  0,    0,    "chassis");
    add(B(9, 0.02, 5.5), mTop,   0,  0.51, 0,    "chassis");
    add(B(9, 1.0, 0.06), mFront, 0,  0,    2.78, "chassis");
    add(B(9, 0.02, 5.5), mDark,  0, -0.51, 0,    null);
    add(B(0.3, 0.3, 0.04),  mRed, -3.55, 0.28, 2.81, "chassis");
    add(B(1.6, 0.14, 0.03), new THREE.MeshStandardMaterial({ color: 0x888680 }), -2.55, 0.28, 2.81, "chassis");

    // Rubber feet
    ([ [-3.8,-2.0],[3.8,-2.0],[-3.8,2.0],[3.8,2.0] ] as [number,number][]).forEach(([fx,fz]) =>
      add(Cy(0.18, 0.14), mRubber, fx, -0.57, fz, null, Math.PI/2)
    );

    // Side vents
    for (let z = -1.6; z <= 1.6; z += 0.28)
      add(B(0.06, 0.48, 0.2), new THREE.MeshStandardMaterial({ color: 0x7a7870 }), 4.52, 0, z, "vents");
    for (let z = -1.0; z <= 1.0; z += 0.28)
      add(B(0.06, 0.38, 0.16), new THREE.MeshStandardMaterial({ color: 0x7a7870 }), -4.52, 0, z, "vents");

    // Top vent dots
    for (let x = -1.0; x <= 3.5; x += 0.38)
      for (let z = -1.8; z <= 1.8; z += 0.38)
        add(Cy(0.055, 0.065, 8), new THREE.MeshStandardMaterial({ color: 0x666460 }), x, 0.525, z, null);

    // LEDs on front face
    add(B(0.13,0.13,0.05), mGreen, -2.9, 0.35, 2.82, "leds");
    add(B(0.13,0.13,0.05), mGreen, -2.5, 0.35, 2.82, "leds");
    add(B(0.13,0.13,0.05), mAmber, -2.1, 0.35, 2.82, "leds");
    [-0.6,-0.2,0.2,0.6,1.0].forEach((x,i) =>
      add(B(0.1,0.1,0.05), i%2===0?mGreen:mAmber, x, 0.35, 2.82, "leds")
    );
    [1.6,2.0,2.4].forEach(x => add(B(0.1,0.1,0.05), mGreen, x, 0.35, 2.82, "leds"));

    add(B(8.8, 0.38, 0.04), mBlack, 0, -0.3, 2.8, null);

    // RJ-45 helper — stores bezel mesh for cable attachment
    function rj45(portId: string, x: number, accent: any, part: string) {
      const y = -0.1, z = 2.78;
      const bezel = add(B(0.44,0.38,0.13), mDark,  x, y,      z,       part);
      bezel.userData.portId = portId;
      portMeshes[portId] = bezel;
      add(B(0.34,0.27,0.07), mBlack, x, y,      z+0.04,  part);
      add(B(0.28,0.20,0.04), accent, x, y,      z+0.075, part);
      add(B(0.16,0.06,0.07), mGray,  x, y-0.19, z+0.02,  part);
      for (let p = -3; p <= 3; p++)
        add(B(0.022,0.1,0.02), mGold, x+p*0.044, y+0.05, z+0.085, null);
    }

    rj45("console", -2.72, mGray,   "console");
    rj45("wan2",    -2.18, mOrange, "wan2");
    rj45("wan1",    -1.64, mOrange, "wan1");
    rj45("dmz",     -1.10, mTeal,   "dmz");
    rj45("ha-b",    -0.47, mPurple, "ha");
    rj45("ha-a",     0.07, mPurple, "ha");
    add(B(0.05,0.44,0.14), mGray, 0.42, -0.1, 2.79, null);
    ["lan-5","lan-4","lan-3","lan-2","lan-1"].forEach((id,i) =>
      rj45(id, 0.76+i*0.5, mBlue, "lan")
    );

    // USB
    const usbM = add(B(0.36,0.26,0.13), mDark, -3.32,-0.08,2.78,"usb");
    usbM.userData.portId = "usb";
    portMeshes["usb"] = usbM;
    add(B(0.28,0.16,0.07), mBlue,  -3.32,-0.08,2.82,"usb");
    add(B(0.28,0.03,0.05), mGray,  -3.32,-0.08,2.83,null);

    // DC barrel
    const pwrM = add(Cy(0.16,0.13,12), mGray, -3.88,-0.1,2.82,"power",Math.PI/2);
    pwrM.userData.portId = "power";
    portMeshes["power"] = pwrM;
    add(Cy(0.07,0.15,8), mBlack, -3.88,-0.1,2.82,"power",Math.PI/2);

    // Reset
    add(B(0.22,0.22,0.05), mDark, -4.28,-0.1,2.80,"reset");
    add(Cy(0.05,0.06,8),   mRed,  -4.28,-0.1,2.83,"reset",Math.PI/2);

    // Store refs for cable rendering
    sceneRef.current = { THREE, group, scene, portMeshes, cableMeshes };

    // ── ORBIT ─────────────────────────────────────────────────────────────────
    let rotX = 0.22, rotY = 0.0;
    group.rotation.set(rotX, rotY, 0);
    let isDragging = false, prevX = 0, prevY = 0;
    let autoRotate = true;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    function resetIdleTimer() {
      autoRotate = false;
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => { autoRotate = true; }, 10000);
    }

    // ── RAYCASTER ─────────────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hlObj: any = null;
    // expose mode ref so click handler sees current mode
    const modeRef = { current: "explore" };
    const selCableRef = { current: null as string | null };

    const onClick = (e: MouseEvent) => {
      const r = mount.getBoundingClientRect();
      mouse.x =  ((e.clientX-r.left)/r.width)*2-1;
      mouse.y = -((e.clientY-r.top)/r.height)*2+1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(clickables);
      if (!hits.length) return;
      const obj = hits[0].object as any;
      const part = obj.userData.part;
      const portId = obj.userData.portId ?? part;

      if (modeRef.current === "cable") {
        if (portId) {
          // dispatch to React via custom event
          mount.dispatchEvent(new CustomEvent("portclick", { detail: portId }));
        }
        return;
      }

      // explore mode
      if (hlObj?.material?.emissive) hlObj.material.emissive.setHex(hlObj.userData._oe ?? 0);
      hlObj = obj;
      obj.userData._oe = obj.material.emissive?.getHex() ?? 0;
      if (obj.material.emissive) obj.material.emissive.setHex(0x4499ff);
      setSelected(PART_INFO[part] ?? null);
    };

    const onHover = (e: MouseEvent) => {
      const r = mount.getBoundingClientRect();
      mouse.x =  ((e.clientX-r.left)/r.width)*2-1;
      mouse.y = -((e.clientY-r.top)/r.height)*2+1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(clickables);
      mount.style.cursor = hits.length ? "pointer" : (isDragging ? "grabbing" : "grab");
      setHovered(hits.length ? hits[0].object.userData.part : null);
    };

    const onDown = (e: MouseEvent) => {
      isDragging = true; prevX = e.clientX; prevY = e.clientY;
      mount.style.cursor = "grabbing"; resetIdleTimer();
    };
    const onUp   = () => { isDragging = false; mount.style.cursor = "grab"; };
    const onMove = (e: MouseEvent) => {
      if (!isDragging) return;
      rotY += (e.clientX-prevX)*0.007;
      rotX += (e.clientY-prevY)*0.005;
      rotX = Math.max(-0.3, Math.min(1.0, rotX));
      prevX = e.clientX; prevY = e.clientY;
      group.rotation.set(rotX, rotY, 0);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); resetIdleTimer();
      camera.position.z = Math.max(5, Math.min(20, camera.position.z+e.deltaY*0.015));
    };

    mount.addEventListener("click",      onClick);
    mount.addEventListener("mousemove",  onHover);
    mount.addEventListener("mousedown",  onDown);
    window.addEventListener("mouseup",   onUp);
    window.addEventListener("mousemove", onMove);
    mount.addEventListener("wheel",      onWheel, { passive: false });

    // Listen for port clicks dispatched from onClick
    const onPortClick = (e: Event) => {
      handlePortClick((e as CustomEvent).detail);
    };
    mount.addEventListener("portclick", onPortClick);

    // Expose mode/cable refs so event handlers see latest React state
    (mount as any)._modeRef    = modeRef;
    (mount as any)._cableRef   = selCableRef;

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (autoRotate && !isDragging) {
        rotY += 0.005;
        group.rotation.set(rotX, rotY, 0);
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      if (idleTimer) clearTimeout(idleTimer);
      mount.removeEventListener("click",      onClick);
      mount.removeEventListener("mousemove",  onHover);
      mount.removeEventListener("mousedown",  onDown);
      window.removeEventListener("mouseup",   onUp);
      window.removeEventListener("mousemove", onMove);
      mount.removeEventListener("wheel",      onWheel);
      mount.removeEventListener("portclick",  onPortClick);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [threeReady]);

  // Sync mode ref so Three.js click handler sees current mode
  useEffect(() => {
    if (!mountRef.current) return;
    const r = (mountRef.current as any)._modeRef;
    if (r) r.current = mode;
  }, [mode]);

  useEffect(() => {
    if (!mountRef.current) return;
    const r = (mountRef.current as any)._cableRef;
    if (r) r.current = selCable;
  }, [selCable]);

  // Draw/remove cable meshes when plugged state changes
  useEffect(() => {
    if (!sceneRef.current) return;
    const { THREE, group, portMeshes, cableMeshes } = sceneRef.current;

    // Remove all existing cable meshes
    Object.values(cableMeshes).forEach((m: any) => group.remove(m));
    Object.keys(cableMeshes).forEach(k => delete cableMeshes[k]);

    // Add cable for each plugged port
    Object.entries(plugged).forEach(([portId, cableId]) => {
      const cable = CABLE_TYPES.find(c => c.id === cableId);
      const portMesh = portMeshes[portId];
      if (!cable || !portMesh) return;

      const color = new THREE.Color(cable.color);
      // Connector head
      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.3, 0.22),
        new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 })
      );
      head.position.copy(portMesh.position);
      head.position.z += 0.38;
      group.add(head);
      cableMeshes[portId + "_head"] = head;

      // Cable body drooping down and away
      const points = [];
      const start = portMesh.position.clone();
      start.z += 0.6;
      const end = start.clone();
      end.z += 1.5;
      end.y -= 1.8;
      end.x += (Math.random() - 0.5) * 0.5;
      for (let t = 0; t <= 1; t += 0.05) {
        const mid = new THREE.Vector3(
          start.x * (1-t) + end.x * t,
          start.y * (1-t) + end.y * t - Math.sin(t*Math.PI)*0.6,
          start.z * (1-t) + end.z * t
        );
        points.push(mid);
      }
      const curve  = new THREE.CatmullRomCurve3(points);
      const tubeGeo = new THREE.TubeGeometry(curve, 16, 0.045, 8, false);
      const tube = new THREE.Mesh(tubeGeo, new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 }));
      group.add(tube);
      cableMeshes[portId + "_tube"] = tube;
    });
  }, [plugged]);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", gap:8 }}>

      {/* Header + mode toggle */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <h1 className="text-[15px] font-semibold text-forti-dark mb-0.5">FortiGate 60F — Interactive Hardware Reference</h1>
          <p className="text-gray-500 text-[12px]">
            {mode === "explore" ? "Auto-rotates · drag to explore · scroll to zoom · click any part to learn" : "Select a cable below, then click the correct port to plug it in"}
          </p>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          <button
            onClick={() => { setMode("explore"); setSelCable(null); setFeedback(null); }}
            style={{ padding:"5px 12px", fontSize:12, borderRadius:4, border:"1px solid", cursor:"pointer",
              background: mode==="explore" ? "#ef4444" : "transparent",
              color: mode==="explore" ? "#fff" : "var(--text-secondary)",
              borderColor: mode==="explore" ? "#ef4444" : "var(--border)" }}
          >Explore</button>
          <button
            onClick={() => { setMode("cable"); setSelected(null); }}
            style={{ padding:"5px 12px", fontSize:12, borderRadius:4, border:"1px solid", cursor:"pointer",
              background: mode==="cable" ? "#2563eb" : "transparent",
              color: mode==="cable" ? "#fff" : "var(--text-secondary)",
              borderColor: mode==="cable" ? "#2563eb" : "var(--border)" }}
          >Cable Mode</button>
          {mode==="cable" && Object.keys(plugged).length > 0 && (
            <button
              onClick={() => { setPlugged({}); setFeedback(null); }}
              style={{ padding:"5px 12px", fontSize:12, borderRadius:4, border:"1px solid var(--border)", cursor:"pointer", color:"var(--text-secondary)", background:"transparent" }}
            >Reset</button>
          )}
        </div>
      </div>

      {/* 3D viewport */}
      <div
        ref={mountRef}
        style={{ flex:1, minHeight:0, borderRadius:8, overflow:"hidden", border:"1px solid #1e2d45", background:"#0d1117", cursor:"grab" }}
      />

      {/* Feedback toast */}
      {feedback && (
        <div style={{ padding:"7px 14px", borderRadius:4, fontSize:12, fontWeight:500,
          background: feedback.ok ? "#052e16" : "#450a0a",
          color:      feedback.ok ? "#4ade80" : "#f87171",
          border:     `1px solid ${feedback.ok ? "#166534" : "#991b1b"}` }}>
          {feedback.msg}
        </div>
      )}

      {/* Cable panel (cable mode) */}
      {mode === "cable" && (
        <div style={{ background:"var(--surface-1)", border:"0.5px solid var(--border)", borderRadius:"var(--radius)", padding:"10px 12px" }}>
          <div style={{ fontSize:11, color:"var(--text-muted)", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.06em" }}>Select a cable to plug in — then click the matching port</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {CABLE_TYPES.map(c => {
              const isPluggedSomewhere = Object.values(plugged).includes(c.id);
              return (
                <button key={c.id}
                  onClick={() => setSelCable(selCable === c.id ? null : c.id)}
                  title={c.desc}
                  style={{ padding:"5px 10px", fontSize:11, borderRadius:4, cursor:"pointer",
                    border: `1.5px solid ${selCable===c.id ? c.color : "var(--border)"}`,
                    background: selCable===c.id ? c.color+"22" : "var(--surface-2)",
                    color: selCable===c.id ? c.color : "var(--text-secondary)",
                    opacity: isPluggedSomewhere ? 0.55 : 1,
                    display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:c.color, display:"inline-block" }}/>
                  {c.label}
                  {isPluggedSomewhere && " ✓"}
                </button>
              );
            })}
          </div>
          {selCable && (
            <p style={{ fontSize:11, color:"var(--text-muted)", marginTop:8, marginBottom:0 }}>
              {CABLE_TYPES.find(c=>c.id===selCable)?.desc}
            </p>
          )}
          {Object.keys(plugged).length > 0 && (
            <div style={{ marginTop:8, display:"flex", gap:6, flexWrap:"wrap" }}>
              {Object.entries(plugged).map(([pid, cid]) => {
                const c = CABLE_TYPES.find(x=>x.id===cid);
                return (
                  <span key={pid} style={{ fontSize:11, padding:"2px 8px", borderRadius:3,
                    background: c?.color+"22", color: c?.color, border:`1px solid ${c?.color}44` }}>
                    {pid.toUpperCase()} ← {c?.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Info panel (explore mode) */}
      {mode === "explore" && (
        <div>
          <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginBottom:6 }}>
            {[["#f97316","WAN"],["#2563eb","LAN"],["#0d9488","DMZ"],["#7c3aed","HA"],["#22c55e","Active"],["#fbbf24","Alert"]].map(([c,l]) => (
              <span key={l} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"var(--text-secondary)" }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:c, display:"inline-block", boxShadow:`0 0 5px ${c}99` }}/>{l}
              </span>
            ))}
          </div>
          <div style={{ background:"var(--surface-2)", border:"0.5px solid var(--border)", borderRadius:"var(--radius)", padding:"10px 14px", minHeight:60 }}>
            {selected ? (
              <>
                <div style={{ fontSize:13, fontWeight:500, color:"var(--text-primary)", marginBottom:3 }}>{selected.title}</div>
                <p style={{ fontSize:12, color:"var(--text-secondary)", lineHeight:1.6, margin:0 }}>{selected.body}</p>
              </>
            ) : (
              <p style={{ fontSize:12, color:"var(--text-muted)", margin:0 }}>Click any component on the model to learn what it does in a real deployment.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
