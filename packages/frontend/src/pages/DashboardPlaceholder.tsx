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

declare global { interface Window { THREE: any; } }

export function DashboardPlaceholder({ session: _ }: DashboardProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<PartInfo | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [threeReady, setThreeReady] = useState(!!window.THREE);

  useEffect(() => {
    if (window.THREE) { setThreeReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    s.onload = () => setThreeReady(true);
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!threeReady || !mountRef.current) return;
    const THREE = window.THREE;
    const mount = mountRef.current;
    const W = mount.clientWidth || 900;
    const H = mount.clientHeight || 500;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);

    // Camera looks straight at front-face center
    const camera = new THREE.PerspectiveCamera(36, W / H, 0.1, 100);
    camera.position.set(0, 0.8, 10);
    camera.lookAt(0, 0, 0);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const key = new THREE.DirectionalLight(0xfff8f0, 0.9);
    key.position.set(3, 6, 8); scene.add(key);
    const fill = new THREE.DirectionalLight(0xc0d8ff, 0.5);
    fill.position.set(-5, 2, 5); scene.add(fill);
    const front = new THREE.DirectionalLight(0xffffff, 0.4);
    front.position.set(0, 0, 10); scene.add(front);

    // Everything in one group — pivot at origin, no floor needed
    const group = new THREE.Group();
    scene.add(group);
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

    // Materials
    const mBody   = new THREE.MeshStandardMaterial({ color: 0xd8d6d0, roughness: 0.5,  metalness: 0.05 });
    const mTop    = new THREE.MeshStandardMaterial({ color: 0xe4e2dc, roughness: 0.45, metalness: 0.04 });
    const mFront  = new THREE.MeshStandardMaterial({ color: 0xcac8c2, roughness: 0.48, metalness: 0.06 });
    const mDark   = new THREE.MeshStandardMaterial({ color: 0x14171e, roughness: 0.4,  metalness: 0.55 });
    const mBlack  = new THREE.MeshStandardMaterial({ color: 0x08090d, roughness: 0.3,  metalness: 0.6  });
    const mGray   = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.5,  metalness: 0.4  });
    const mRubber = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95, metalness: 0    });
    const mRed    = new THREE.MeshStandardMaterial({ color: 0xee1111, roughness: 0.3,  metalness: 0.2, emissive: 0xcc0000, emissiveIntensity: 0.4 });
    const mOrange = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3,  metalness: 0.2, emissive: 0xf97316, emissiveIntensity: 0.3 });
    const mBlue   = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3,  metalness: 0.2, emissive: 0x2563eb, emissiveIntensity: 0.25 });
    const mTeal   = new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.3,  metalness: 0.2, emissive: 0x0d9488, emissiveIntensity: 0.25 });
    const mPurple = new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.3,  metalness: 0.2, emissive: 0x7c3aed, emissiveIntensity: 0.3  });
    const mGreen  = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.25, metalness: 0.1, emissive: 0x22c55e, emissiveIntensity: 0.9  });
    const mAmber  = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.25, metalness: 0.1, emissive: 0xfbbf24, emissiveIntensity: 0.8  });
    const mGold   = new THREE.MeshStandardMaterial({ color: 0xc8960a, roughness: 0.2,  metalness: 0.9  });

    // ── CHASSIS — centered at origin ─────────────────────────────────────────
    // Body: 9w × 1h × 5.5d, front face at z=+2.75
    add(B(9, 1.0, 5.5),  mBody,  0,  0,     0,    "chassis");
    add(B(9, 0.02, 5.5), mTop,   0,  0.51,  0,    "chassis");
    add(B(9, 1.0, 0.06), mFront, 0,  0,     2.78, "chassis");
    // Bottom dark panel
    add(B(9, 0.02, 5.5), mDark,  0, -0.51,  0,    null);

    // Red Fortinet "F" logo on front
    add(B(0.28, 0.28, 0.03), mRed,  -3.55, 0.28, 2.81, "chassis");
    // Model name plate
    add(B(1.6, 0.14, 0.025), new THREE.MeshStandardMaterial({ color: 0xb2b0aa }), -2.6, 0.28, 2.81, "chassis");

    // ── RUBBER FEET ──────────────────────────────────────────────────────────
    [[-3.8,-2.0],[3.8,-2.0],[-3.8,2.0],[3.8,2.0]].forEach(([fx,fz]) =>
      add(Cy(0.18, 0.14), mRubber, fx as number, -0.57, fz as number, null, Math.PI/2)
    );

    // ── SIDE VENTS ───────────────────────────────────────────────────────────
    for (let z = -1.6; z <= 1.6; z += 0.28)
      add(B(0.06, 0.48, 0.2), new THREE.MeshStandardMaterial({ color: 0xb0aea8 }), 4.52, 0, z, "vents");
    for (let z = -1.0; z <= 1.0; z += 0.28)
      add(B(0.06, 0.38, 0.16), new THREE.MeshStandardMaterial({ color: 0xb0aea8 }), -4.52, 0, z, "vents");

    // ── TOP VENT DOT GRID ─────────────────────────────────────────────────────
    for (let x = -1.0; x <= 3.5; x += 0.38)
      for (let z = -1.8; z <= 1.8; z += 0.38)
        add(Cy(0.055, 0.065, 8), new THREE.MeshStandardMaterial({ color: 0x888480 }), x, 0.525, z, null);

    // ── LED STRIP on top-front ────────────────────────────────────────────────
    // PWR, STATUS, HA
    add(B(0.13, 0.13, 0.05), mGreen,  -2.9, 0.39, 2.76, "leds");
    add(B(0.13, 0.13, 0.05), mGreen,  -2.6, 0.39, 2.76, "leds");
    add(B(0.13, 0.13, 0.05), mAmber,  -2.3, 0.39, 2.76, "leds");
    // Port LEDs 1-5
    [-0.6, -0.2, 0.2, 0.6, 1.0].forEach((x, i) =>
      add(B(0.1, 0.1, 0.045), i % 2 === 0 ? mGreen : mAmber, x, 0.39, 2.76, "leds")
    );
    // DMZ, WAN1, WAN2 LEDs
    [1.6, 2.0, 2.4].forEach(x => add(B(0.1, 0.1, 0.045), mGreen, x, 0.39, 2.76, "leds"));

    // ── PORT LABEL DARK STRIP ────────────────────────────────────────────────
    add(B(8.8, 0.38, 0.035), mBlack, 0, -0.3, 2.8, null);

    // ── RJ-45 PORTS ──────────────────────────────────────────────────────────
    function rj45(x: number, accent: any, part: string) {
      const y = -0.1, z = 2.78;
      add(B(0.44, 0.38, 0.13), mDark,  x, y,      z,       part); // bezel
      add(B(0.34, 0.27, 0.07), mBlack, x, y,      z+0.04,  part); // void
      add(B(0.28, 0.20, 0.04), accent, x, y,      z+0.075, part); // colour
      add(B(0.16, 0.055,0.07), mGray,  x, y-0.19, z+0.02,  part); // latch tab
      for (let p = -3; p <= 3; p++)
        add(B(0.022, 0.1, 0.02), mGold, x + p * 0.044, y + 0.05, z + 0.085, null); // pins
    }

    rj45(-2.72, mGray,   "console");
    rj45(-2.18, mOrange, "wan2");
    rj45(-1.64, mOrange, "wan1");
    rj45(-1.10, mTeal,   "dmz");
    rj45(-0.47, mPurple, "ha");   // HA-B
    rj45( 0.07, mPurple, "ha");   // HA-A
    // HA separator ridge
    add(B(0.05, 0.44, 0.14), mGray, 0.42, -0.1, 2.79, null);
    // LAN ports 5-1
    [0.76, 1.26, 1.76, 2.26, 2.76].forEach(x => rj45(x, mBlue, "lan"));

    // ── USB 3.0 ──────────────────────────────────────────────────────────────
    add(B(0.36, 0.26, 0.13), mDark,  -3.32, -0.08, 2.78, "usb");
    add(B(0.28, 0.16, 0.07), mBlue,  -3.32, -0.08, 2.82, "usb");
    add(B(0.28, 0.03, 0.05), mGray,  -3.32, -0.08, 2.83, null); // divider

    // ── DC POWER BARREL ──────────────────────────────────────────────────────
    add(Cy(0.16, 0.13, 12), mGray,  -3.88, -0.1, 2.82, "power", Math.PI/2);
    add(Cy(0.07, 0.15,  8), mBlack, -3.88, -0.1, 2.82, "power", Math.PI/2);

    // ── RESET PINHOLE ────────────────────────────────────────────────────────
    add(B(0.22, 0.22, 0.05), mDark, -4.28, -0.1, 2.80, "reset");
    add(Cy(0.05, 0.06, 8),   mRed,  -4.28, -0.1, 2.83, "reset", Math.PI/2);

    // ── INITIAL VIEW — front-face clearly visible ─────────────────────────────
    // Small tilt so you can see top and front simultaneously
    let rotX = 0.18, rotY = 0.3;
    group.rotation.x = rotX;
    group.rotation.y = rotY;

    // ── RAYCASTER ────────────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hlObj: any = null;
    let isDragging = false;

    const onClick = (e: MouseEvent) => {
      const r = mount.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width)  *  2 - 1;
      mouse.y = -((e.clientY - r.top)  / r.height) *  2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(clickables);
      if (!hits.length) return;
      const obj = hits[0].object as any;
      if (hlObj?.material?.emissive) hlObj.material.emissive.setHex(hlObj.userData._oe ?? 0);
      hlObj = obj;
      obj.userData._oe = obj.material.emissive?.getHex() ?? 0;
      if (obj.material.emissive) obj.material.emissive.setHex(0x4499ff);
      setSelected(PART_INFO[obj.userData.part] ?? null);
    };

    const onHover = (e: MouseEvent) => {
      const r = mount.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width)  *  2 - 1;
      mouse.y = -((e.clientY - r.top)  / r.height) *  2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(clickables);
      mount.style.cursor = hits.length ? "pointer" : (isDragging ? "grabbing" : "grab");
      setHovered(hits.length ? hits[0].object.userData.part : null);
    };

    mount.addEventListener("click", onClick);
    mount.addEventListener("mousemove", onHover);

    // ── ORBIT ─────────────────────────────────────────────────────────────────
    let prevX = 0, prevY = 0;

    const onDown = (e: MouseEvent) => {
      isDragging = true; prevX = e.clientX; prevY = e.clientY;
      mount.style.cursor = "grabbing";
    };
    const onUp = () => { isDragging = false; mount.style.cursor = "grab"; };
    const onMove = (e: MouseEvent) => {
      if (!isDragging) return;
      rotY += (e.clientX - prevX) * 0.007;
      rotX += (e.clientY - prevY) * 0.005;
      rotX = Math.max(-0.5, Math.min(1.0, rotX));
      prevX = e.clientX; prevY = e.clientY;
      group.rotation.set(rotX, rotY, 0);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.max(5, Math.min(20, camera.position.z + e.deltaY * 0.015));
    };

    let tx = 0, ty = 0;
    const onTS = (e: TouchEvent) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; };
    const onTM = (e: TouchEvent) => {
      e.preventDefault();
      rotY += (e.touches[0].clientX - tx) * 0.009;
      rotX += (e.touches[0].clientY - ty) * 0.007;
      rotX = Math.max(-0.5, Math.min(1.0, rotX));
      tx = e.touches[0].clientX; ty = e.touches[0].clientY;
      group.rotation.set(rotX, rotY, 0);
    };

    mount.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    mount.addEventListener("wheel", onWheel, { passive: false });
    mount.addEventListener("touchstart", onTS);
    mount.addEventListener("touchmove", onTM, { passive: false });

    let animId: number;
    const animate = () => { animId = requestAnimationFrame(animate); renderer.render(scene, camera); };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      mount.removeEventListener("click", onClick);
      mount.removeEventListener("mousemove", onHover);
      mount.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
      mount.removeEventListener("wheel", onWheel);
      mount.removeEventListener("touchstart", onTS);
      mount.removeEventListener("touchmove", onTM);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [threeReady]);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", gap:10 }}>
      <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between" }}>
        <div>
          <h1 className="text-[15px] font-semibold text-forti-dark mb-0.5">FortiGate 60F — Interactive Hardware Reference</h1>
          <p className="text-gray-500 text-[12px]">Drag to rotate · scroll to zoom · click any component to learn what it does</p>
        </div>
        {hovered && PART_INFO[hovered] && (
          <span className="text-[11px] text-blue-500 font-medium">↑ {PART_INFO[hovered].title}</span>
        )}
      </div>

      <div
        ref={mountRef}
        style={{ flex:1, minHeight:0, borderRadius:8, overflow:"hidden", border:"1px solid #1e2d45", background:"#0f172a", cursor:"grab" }}
      />

      <div>
        <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginBottom:8 }}>
          {[["#f97316","WAN"],["#2563eb","LAN"],["#0d9488","DMZ"],["#7c3aed","HA"],["#22c55e","Active"],["#fbbf24","Alert"]].map(([c,l]) => (
            <span key={l} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"var(--text-secondary)" }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:c, display:"inline-block", boxShadow:`0 0 5px ${c}99` }} />{l}
            </span>
          ))}
        </div>
        <div style={{ background:"var(--surface-2)", border:"0.5px solid var(--border)", borderRadius:"var(--radius)", padding:"12px 14px", minHeight:68 }}>
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
    </div>
  );
}
