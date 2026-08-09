import { useEffect, useRef, useState } from "react";
import { ScenarioSession } from "../hooks/useScenarioSession";

interface DashboardProps { session: ScenarioSession; }
interface PartInfo { title: string; body: string; }

const PART_INFO: Record<string, PartInfo> = {
  chassis:  { title: "Chassis — Desktop Form Factor", body: "The FortiGate sits flat on a desk or shelf (not rack-mounted like the 600F). The cream/white polycarbonate enclosure houses the CPU, NP6Lite ASIC, RAM, and flash storage. Four rubber feet on the bottom prevent sliding and allow airflow." },
  wan1:     { title: "WAN1 — Primary Internet Uplink", body: "WAN1 is the default gateway interface for internet-bound traffic. Connects to your ISP modem or CPE. In FortiOS you assign a static IP, DHCP, or PPPoE here. All outbound NAT traffic leaves through this port by default." },
  wan2:     { title: "WAN2 — Secondary / Backup Uplink", body: "WAN2 provides ISP redundancy. With SD-WAN configured, FortiOS can fail over to WAN2 if WAN1 goes down, or load-balance across both links for higher throughput." },
  dmz:      { title: "DMZ — Demilitarized Zone Port", body: "Dedicated DMZ interface for hosting public-facing servers (web, mail, DNS). Traffic between DMZ and LAN must pass through explicit firewall policies — the DMZ is a semi-trusted zone, never fully internal." },
  ha:       { title: "HA Pair (B ↔ A) — Heartbeat Ports", body: "These two ports form the HA heartbeat link between two FortiGate units in a cluster. The primary sends keepalive signals; if the secondary stops receiving them it takes over as active. Always connect HA ports directly — never through a switch." },
  lan:      { title: "Ports 1–5 — Internal LAN (1GbE RJ-45)", body: "Five copper GE ports for internal workstations, switches, and servers. In FortiOS these sit in the 'internal' hardware switch zone by default, acting like a built-in 5-port switch. You can break them into separate routed interfaces if needed." },
  console:  { title: "CONSOLE — Serial Management Port", body: "RJ-45 serial console (9600 baud, 8N1). Your last resort when the management IP is unreachable or firmware is corrupted. Use a Cisco-style rollover cable. Always secure physical console access — no authentication is required at early boot." },
  usb:      { title: "USB 3.0 — Recovery & Provisioning", body: "Accepts a USB drive for: (1) firmware recovery if flash is corrupted, (2) zero-touch config import on first boot, (3) FortiToken USB keys. The device checks for a specific filename on boot automatically." },
  reset:    { title: "RESET Button (recessed)", body: "Recessed pinhole button. Hold for 10+ seconds to factory-reset the device — all config is wiped and FortiOS returns to defaults. Requires physical access, making it a key reason to rack devices in locked enclosures." },
  power:    { title: "DC+12V — Power Input", body: "12V DC barrel jack connected to the included external power adapter (100–240V AC input). Unlike rack units, the 60F has no redundant PSU option — use a UPS for power redundancy in production deployments." },
  leds:     { title: "Status LEDs", body: "Top row: PWR (green), STATUS (green/amber), HA (green). Middle row: per-port activity LEDs 1-5. Right cluster: DMZ, WAN1, WAN2 link/activity. LINK/ACT blinks on traffic; SPEED amber=1G, off=100M." },
  vents:    { title: "Side Ventilation", body: "Passive convection vents on both sides of the chassis. The 60F is fanless — completely silent operation. This makes it ideal for office environments but means airflow around the device must not be blocked." },
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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.Fog(0x0f172a, 18, 35);

    const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);
    camera.position.set(0, 3.5, 11);
    camera.lookAt(0, 0, 0);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xfff8f0, 1.1);
    key.position.set(6, 10, 8); key.castShadow = true;
    key.shadow.mapSize.width = 2048; key.shadow.mapSize.height = 2048;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xc8d8ff, 0.5);
    fill.position.set(-6, 3, 4); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.25);
    rim.position.set(0, -3, -8); scene.add(rim);
    const top = new THREE.DirectionalLight(0xfff0e0, 0.3);
    top.position.set(0, 12, 0); scene.add(top);

    const clickables: any[] = [];
    const group = new THREE.Group();
    scene.add(group);

    // Materials
    const matBody   = new THREE.MeshStandardMaterial({ color: 0xdddbd6, roughness: 0.55, metalness: 0.08 });
    const matDark   = new THREE.MeshStandardMaterial({ color: 0x1e2433, roughness: 0.4,  metalness: 0.5  });
    const matPort   = new THREE.MeshStandardMaterial({ color: 0x111520, roughness: 0.3,  metalness: 0.6  });
    const matOrange = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4,  metalness: 0.3, emissive: 0xf97316, emissiveIntensity: 0.15 });
    const matBlue   = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4,  metalness: 0.3, emissive: 0x2563eb, emissiveIntensity: 0.1  });
    const matTeal   = new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.4,  metalness: 0.3, emissive: 0x0d9488, emissiveIntensity: 0.1  });
    const matGreen  = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.3,  metalness: 0.2, emissive: 0x22c55e, emissiveIntensity: 0.5  });
    const matAmber  = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.3,  metalness: 0.2, emissive: 0xfbbf24, emissiveIntensity: 0.4  });
    const matPurple = new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.4,  metalness: 0.3, emissive: 0x7c3aed, emissiveIntensity: 0.15 });
    const matRed    = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4,  metalness: 0.3, emissive: 0xdc2626, emissiveIntensity: 0.2  });
    const matGray   = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.5,  metalness: 0.4 });
    const matFloor  = new THREE.MeshStandardMaterial({ color: 0x0a0f1c, roughness: 0.9,  metalness: 0.1 });
    const matGlass  = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.15 });

    function mesh(geo: any, mat: any, x: number, y: number, z: number, part: string | null, rx=0, ry=0, rz=0) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.rotation.set(rx, ry, rz);
      m.castShadow = true; m.receiveShadow = true;
      if (part) { m.userData.part = part; clickables.push(m); }
      group.add(m); return m;
    }
    const B = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
    const C = (r: number, h: number, seg=16) => new THREE.CylinderGeometry(r, r, h, seg);

    // ── CHASSIS ──────────────────────────────────────────────────────────────
    // Main body — wide flat desktop form, cream/white
    mesh(B(9, 1.1, 5.5), matBody, 0, 0, 0, "chassis");

    // Top surface slightly lighter panel
    mesh(B(8.9, 0.02, 5.4), new THREE.MeshStandardMaterial({ color: 0xe8e6e1, roughness: 0.5, metalness: 0.05 }), 0, 0.56, 0, "chassis");

    // Front face panel (darker strip at front edge)
    mesh(B(9, 1.1, 0.08), new THREE.MeshStandardMaterial({ color: 0xc8c6c1, roughness: 0.5, metalness: 0.1 }), 0, 0, 2.79, "chassis");

    // Fortinet logo area (embossed rectangle on front face top)
    mesh(B(2.2, 0.22, 0.03), new THREE.MeshStandardMaterial({ color: 0xb0aead, roughness: 0.6, metalness: 0.05 }), -2.5, 0.3, 2.83, "chassis");

    // FortiGate model plate
    mesh(B(1.4, 0.12, 0.03), new THREE.MeshStandardMaterial({ color: 0xb8b6b1, roughness: 0.6 }), -2.0, 0.1, 2.83, "chassis");

    // ── RUBBER FEET ──────────────────────────────────────────────────────────
    [[-3.8,-2.1],[3.8,-2.1],[-3.8,2.1],[3.8,2.1]].forEach(([fx,fz]) =>
      mesh(C(0.18, 0.12), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95, metalness: 0 }), fx, -0.61, fz, null, Math.PI/2)
    );

    // ── SIDE VENTS (right side) ───────────────────────────────────────────────
    for (let i = -1.5; i <= 1.5; i += 0.28) {
      mesh(B(0.08, 0.55, 1.8), new THREE.MeshStandardMaterial({ color: 0xbbb9b4, roughness: 0.6 }), 4.54, 0.05, i, "vents");
    }
    // Left side vents (smaller)
    for (let i = -1.0; i <= 1.0; i += 0.28) {
      mesh(B(0.08, 0.4, 1.2), new THREE.MeshStandardMaterial({ color: 0xbbb9b4, roughness: 0.6 }), -4.54, 0.05, i, "vents");
    }

    // ── TOP VENT HOLES (dot grid) ─────────────────────────────────────────────
    for (let x = -1.5; x <= 3.5; x += 0.38) {
      for (let z = -1.8; z <= 1.8; z += 0.38) {
        mesh(C(0.055, 0.08), new THREE.MeshStandardMaterial({ color: 0x888682, roughness: 0.7 }), x, 0.57, z, null, 0, 0, 0);
      }
    }

    // ── LED STRIP (top front area) ────────────────────────────────────────────
    // PWR, STATUS, HA
    mesh(B(0.12,0.12,0.06), matGreen,  -2.6, 0.42, 2.5, "leds");
    mesh(B(0.12,0.12,0.06), matGreen,  -2.3, 0.42, 2.5, "leds");
    mesh(B(0.12,0.12,0.06), matAmber,  -2.0, 0.42, 2.5, "leds");

    // Port LEDs 1-5 (activity)
    [-0.5,-0.1,0.3,0.7,1.1].forEach((x,i) => mesh(B(0.1,0.1,0.05), i%2===0 ? matGreen : matAmber, x, 0.42, 2.5, "leds"));

    // DMZ, WAN1, WAN2 LEDs
    [1.7, 2.1, 2.5].forEach(x => mesh(B(0.1,0.1,0.05), matGreen, x, 0.42, 2.5, "leds"));

    // LINK/ACT label area (tiny strip)
    mesh(B(0.8,0.06,0.04), new THREE.MeshStandardMaterial({ color: 0x888682, roughness:0.7 }), 2.1, 0.33, 2.5, null);

    // ── FRONT PORTS (left to right matching real device) ─────────────────────
    // Port labels backdrop strip
    mesh(B(8.6, 0.42, 0.05), new THREE.MeshStandardMaterial({ color: 0x1a1e28, roughness:0.5 }), 0, -0.25, 2.82, null);

    // RESET (recessed pinhole, leftmost)
    mesh(C(0.07, 0.06), matRed, -4.1, -0.1, 2.84, "reset", Math.PI/2);
    mesh(B(0.25,0.25,0.05), new THREE.MeshStandardMaterial({color:0x2a2e3a,roughness:0.6}), -4.1, -0.1, 2.82, "reset");

    // DC+12V barrel jack
    mesh(C(0.14, 0.1, 12), matGray, -3.7, -0.1, 2.84, "power", Math.PI/2);
    mesh(C(0.07, 0.12, 8), matDark, -3.7, -0.1, 2.84, "power", Math.PI/2);

    // USB 3.0 port (blue inside)
    mesh(B(0.32, 0.28, 0.08), matDark, -3.2, -0.05, 2.84, "usb");
    mesh(B(0.26, 0.18, 0.04), matBlue, -3.2, -0.05, 2.86, "usb");

    // CONSOLE RJ-45
    mesh(B(0.38, 0.3, 0.08), matDark,   -2.65, -0.1, 2.84, "console");
    mesh(B(0.3,  0.22, 0.04), matPort,  -2.65, -0.1, 2.86, "console");
    // console clip
    mesh(B(0.3, 0.04, 0.03), matGray, -2.65, -0.22, 2.87, null);

    // WAN2 RJ-45 (orange tint)
    mesh(B(0.38, 0.3, 0.08), matDark,   -2.05, -0.1, 2.84, "wan2");
    mesh(B(0.3,  0.22, 0.04), matOrange,-2.05, -0.1, 2.86, "wan2");
    mesh(B(0.3, 0.04, 0.03), matGray, -2.05, -0.22, 2.87, null);

    // WAN1 RJ-45 (orange tint)
    mesh(B(0.38, 0.3, 0.08), matDark,   -1.55, -0.1, 2.84, "wan1");
    mesh(B(0.3,  0.22, 0.04), matOrange,-1.55, -0.1, 2.86, "wan1");
    mesh(B(0.3, 0.04, 0.03), matGray, -1.55, -0.22, 2.87, null);

    // DMZ RJ-45 (teal tint)
    mesh(B(0.38, 0.3, 0.08), matDark,   -1.0, -0.1, 2.84, "dmz");
    mesh(B(0.3,  0.22, 0.04), matTeal,  -1.0, -0.1, 2.86, "dmz");
    mesh(B(0.3, 0.04, 0.03), matGray, -1.0, -0.22, 2.87, null);

    // HA pair B-A (purple, slightly spaced)
    mesh(B(0.38, 0.3, 0.08), matDark,   -0.38, -0.1, 2.84, "ha");
    mesh(B(0.3,  0.22, 0.04), matPurple,-0.38, -0.1, 2.86, "ha");
    mesh(B(0.3, 0.04, 0.03), matGray, -0.38, -0.22, 2.87, null);
    mesh(B(0.38, 0.3, 0.08), matDark,    0.12, -0.1, 2.84, "ha");
    mesh(B(0.3,  0.22, 0.04), matPurple, 0.12, -0.1, 2.86, "ha");
    mesh(B(0.3, 0.04, 0.03), matGray,  0.12, -0.22, 2.87, null);

    // HA infinity symbol area (tiny bridge between HA ports)
    mesh(B(0.12, 0.08, 0.03), new THREE.MeshStandardMaterial({color:0x555566,roughness:0.7}), -0.13, -0.1, 2.87, null);

    // Ports 5-4-3-2-1 (blue tint, right cluster)
    [0.82, 1.32, 1.82, 2.32, 2.82].forEach((x) => {
      mesh(B(0.38, 0.3, 0.08), matDark, x, -0.1, 2.84, "lan");
      mesh(B(0.3, 0.22, 0.04), matBlue, x, -0.1, 2.86, "lan");
      mesh(B(0.3, 0.04, 0.03), matGray, x, -0.22, 2.87, null);
    });

    // Separator ridge between HA and LAN cluster
    mesh(B(0.05, 0.5, 0.1), new THREE.MeshStandardMaterial({color:0x555566,roughness:0.6}), 0.5, -0.1, 2.84, null);

    // ── FLOOR ────────────────────────────────────────────────────────────────
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), matFloor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.65;
    floor.receiveShadow = true;
    scene.add(floor);

    // Subtle floor reflection glow
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 6),
      new THREE.MeshBasicMaterial({ color: 0x1e3a5f, transparent: true, opacity: 0.18 })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = -0.64;
    scene.add(glow);

    // ── RAYCASTER ────────────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let highlighted: any = null;

    const onClick = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(clickables, true);
      if (!hits.length) return;
      const obj = hits[0].object as any;
      if (highlighted && highlighted.material.emissive) highlighted.material.emissive.setHex(highlighted.userData._origEmissive ?? 0x000000);
      highlighted = obj;
      obj.userData._origEmissive = obj.material.emissive?.getHex() ?? 0x000000;
      if (obj.material.emissive) obj.material.emissive.setHex(0x4488ff);
      setSelected(PART_INFO[obj.userData.part] ?? null);
    };

    const onHover = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(clickables, true);
      mount.style.cursor = hits.length ? "pointer" : "grab";
      setHovered(hits.length ? (hits[0].object.userData.part ?? null) : null);
    };

    mount.addEventListener("click", onClick);
    mount.addEventListener("mousemove", onHover);

    // ── ORBIT ────────────────────────────────────────────────────────────────
    let dragging = false, prevX = 0, prevY = 0;
    // Nice initial angle matching the product photo perspective
    group.rotation.x = 0.32;
    group.rotation.y = -0.45;

    const onDown = (e: MouseEvent) => { dragging = true; prevX = e.clientX; prevY = e.clientY; mount.style.cursor = "grabbing"; };
    const onUp   = () => { dragging = false; mount.style.cursor = "grab"; };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      group.rotation.y += (e.clientX - prevX) * 0.007;
      group.rotation.x += (e.clientY - prevY) * 0.005;
      group.rotation.x = Math.max(-0.7, Math.min(1.0, group.rotation.x));
      prevX = e.clientX; prevY = e.clientY;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.max(5, Math.min(20, camera.position.z + e.deltaY * 0.015));
    };

    // Touch
    let tx = 0, ty = 0;
    const onTouchStart = (e: TouchEvent) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; };
    const onTouchMove  = (e: TouchEvent) => {
      e.preventDefault();
      group.rotation.y += (e.touches[0].clientX - tx) * 0.009;
      group.rotation.x += (e.touches[0].clientY - ty) * 0.007;
      group.rotation.x = Math.max(-0.7, Math.min(1.0, group.rotation.x));
      tx = e.touches[0].clientX; ty = e.touches[0].clientY;
    };

    mount.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    mount.addEventListener("wheel", onWheel, { passive: false });
    mount.addEventListener("touchstart", onTouchStart);
    mount.addEventListener("touchmove", onTouchMove, { passive: false });

    // ── ANIMATE ───────────────────────────────────────────────────────────────
    let animId: number;
    // Subtle auto-rotate until first interaction
    let autoRotate = true;
    mount.addEventListener("mousedown", () => { autoRotate = false; }, { once: true });

    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (autoRotate) group.rotation.y += 0.003;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      mount.removeEventListener("click", onClick);
      mount.removeEventListener("mousemove", onHover);
      mount.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
      mount.removeEventListener("wheel", onWheel);
      mount.removeEventListener("touchstart", onTouchStart);
      mount.removeEventListener("touchmove", onTouchMove);
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
        {hovered && (
          <span className="text-[11px] text-blue-500 font-medium animate-pulse">
            Click to learn about: {PART_INFO[hovered]?.title ?? hovered}
          </span>
        )}
      </div>

      <div
        ref={mountRef}
        style={{ flex:1, minHeight:0, borderRadius:8, overflow:"hidden", border:"1px solid #1e2d45", cursor:"grab", background:"#0f172a" }}
      />

      <div>
        <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginBottom:8 }}>
          {[["#f97316","WAN"],["#2563eb","LAN ports"],["#0d9488","DMZ"],["#7c3aed","HA"],["#22c55e","Active / PWR"],["#fbbf24","Alert"]].map(([c,l]) => (
            <span key={l} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"var(--text-secondary)" }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:c, display:"inline-block", boxShadow:`0 0 4px ${c}` }} />{l}
            </span>
          ))}
        </div>
        <div style={{ background:"var(--surface-2)", border:"0.5px solid var(--border)", borderRadius:"var(--radius)", padding:"12px 14px", minHeight:72 }}>
          {selected ? (
            <>
              <div style={{ fontSize:13, fontWeight:500, color:"var(--text-primary)", marginBottom:3 }}>{selected.title}</div>
              <p style={{ fontSize:12, color:"var(--text-secondary)", lineHeight:1.6, margin:0 }}>{selected.body}</p>
            </>
          ) : (
            <p style={{ fontSize:12, color:"var(--text-muted)", margin:0 }}>Click any component on the model above to see what it does in a real deployment.</p>
          )}
        </div>
      </div>
    </div>
  );
}
