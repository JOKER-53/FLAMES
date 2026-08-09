import { useEffect, useRef, useState } from "react";
import { ScenarioSession } from "../hooks/useScenarioSession";

interface DashboardProps { session: ScenarioSession; }
interface PartInfo { title: string; body: string; }

const PART_INFO: Record<string, PartInfo> = {
  chassis: { title: "Chassis (1U Rack Unit)", body: "The FortiGate 600F fits in a standard 19-inch rack in 1U of space. The hardened steel enclosure houses all ASICs, RAM, and NVMe storage. In a real deployment this slides into a data-centre rack and is bolted in with rack ears." },
  wan1:    { title: "WAN1 — Primary Internet Uplink", body: "WAN1 is the default gateway interface for internet-bound traffic. It connects to your ISP's CPE or modem. In FortiOS you assign a static IP or configure DHCP/PPPoE here. All outbound NAT traffic leaves through this port by default." },
  wan2:    { title: "WAN2 — Secondary / Backup Uplink", body: "WAN2 provides ISP redundancy. With SD-WAN or static routing configured, FortiOS can fail over to WAN2 if WAN1 goes down, or load-balance across both links simultaneously." },
  mgmt:    { title: "MGMT — Out-of-Band Management Port", body: "A dedicated 1GbE port exclusively for administrative access (GUI, SSH, SNMP). Logically separate from data-plane ports — an attacker who compromises a data port cannot reach the management plane." },
  ha:      { title: "HA — High-Availability Heartbeat Port", body: "Used exclusively for HA cluster communication between two FortiGate units. The heartbeat signal lets the standby unit detect failover events in milliseconds. Never mix HA traffic with production data." },
  lan1:    { title: "Port 1–4 — Internal LAN Ports (1GbE)", body: "These copper RJ-45 ports connect internal switches and workstations. In FortiOS they sit in the LAN or internal zone. Nothing passes between these ports and WAN without an explicit ACCEPT policy." },
  sfp:     { title: "SFP+ Ports — 10GbE Fibre Uplinks", body: "Two SFP+ cages accept 10GbE optical or DAC transceivers. Used for high-speed DMZ uplinks, inter-VLAN routing to core switches, or a 10G ISP handoff. Transceivers are hot-swappable." },
  usb:     { title: "USB Port — Recovery & Config Import", body: "Serves two purposes: (1) boot from a FortiOS recovery image if internal firmware is corrupted, and (2) import a config file automatically on first boot — useful for zero-touch provisioning." },
  console: { title: "RJ-45 Console Port", body: "Serial console access (9600 baud, 8N1). Your last resort if the management IP is unreachable or the device fails to boot. Connect with a Cisco-style rollover cable." },
  leds:    { title: "Status LEDs", body: "Left to right: PWR (green = power OK), STATUS (green = normal, amber = alert), HA (green = HA sync active). Per-port LEDs show link speed and activity — blinking means live traffic." },
  npu:     { title: "NP7 Network Processor (internal)", body: "The NP7 ASIC offloads firewall sessions, IPsec encryption, and IPS inspection from the main CPU. Once a session is established NP7 handles packets in hardware at line rate — up to 36 Gbps." },
  power:   { title: "Power Supply Unit", body: "Ships with a single internal PSU (100–240V AC). A redundant PSU module can be installed for hot-swap failover — if the primary PSU fails, the secondary takes over without rebooting." },
};

declare global { interface Window { THREE: any; } }

export function DashboardPlaceholder({ session: _ }: DashboardProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<PartInfo | null>(null);
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
    const H = mount.clientHeight || 560;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111827);

    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(5, 8, 6); dir.castShadow = true; scene.add(dir);
    const fill = new THREE.DirectionalLight(0x6688ff, 0.4);
    fill.position.set(-5, 2, -4); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.3);
    rim.position.set(0, -4, -6); scene.add(rim);

    const clickables: any[] = [];

    // All geometry goes into this group — rotate the group, not scene children
    const group = new THREE.Group();
    scene.add(group);

    function box(w: number, h: number, d: number, color: number, x: number, y: number, z: number, part: string | null) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.75 })
      );
      m.position.set(x, y, z); m.castShadow = true;
      if (part) { m.userData.part = part; clickables.push(m); }
      group.add(m); return m;
    }
    function cyl(r: number, h: number, color: number, x: number, y: number, z: number, part: string | null) {
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(r, r, h, 16),
        new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.6 })
      );
      m.position.set(x, y, z); m.rotation.x = Math.PI / 2;
      if (part) { m.userData.part = part; clickables.push(m); }
      group.add(m); return m;
    }

    // Scale up 1.4x vs before for visibility
    const S = 1.4;

    // Main chassis body — centered at origin
    box(7*S, 1.1*S, 2.6*S, 0x2d3448, 0, 0, 0, "chassis");
    // Front face
    box(7*S, 1.1*S, 0.06*S, 0x1a2035, 0, 0, 1.3*S, "chassis");
    // Rear face
    box(6.8*S, 0.9*S, 0.06*S, 0x1e2540, 0, 0, -1.3*S, null);

    // WAN ports (orange) — left side
    box(0.22*S, 0.2*S, 0.08*S, 0xf97316, -3.0*S, 0.12*S, 1.34*S, "wan1");
    box(0.22*S, 0.2*S, 0.08*S, 0xea6b0a, -2.68*S, 0.12*S, 1.34*S, "wan2");

    // MGMT (purple)
    box(0.22*S, 0.2*S, 0.08*S, 0xa78bfa, -2.2*S, 0.12*S, 1.34*S, "mgmt");
    // HA (deep purple)
    box(0.22*S, 0.2*S, 0.08*S, 0x7c3aed, -1.85*S, 0.12*S, 1.34*S, "ha");

    // LAN ports 1-4 (blue)
    [-1.2*S, -0.78*S, -0.36*S, 0.06*S].forEach(x => box(0.22*S, 0.2*S, 0.08*S, 0x3b82f6, x, 0.12*S, 1.34*S, "lan1"));

    // SFP+ (teal)
    [0.6*S, 1.0*S].forEach(x => {
      box(0.28*S, 0.22*S, 0.1*S, 0x0d9488, x, 0.12*S, 1.34*S, "sfp");
      box(0.12*S, 0.06*S, 0.05*S, 0x0f766e, x, 0.02*S, 1.38*S, null);
    });

    // USB
    box(0.18*S, 0.13*S, 0.08*S, 0x475569, 1.6*S, 0.18*S, 1.34*S, "usb");
    // Console
    box(0.22*S, 0.2*S, 0.08*S, 0x94a3b8, 1.95*S, 0.12*S, 1.34*S, "console");
    // Power button
    cyl(0.1*S, 0.05*S, 0x22c55e, 2.6*S, 0.18*S, 1.35*S, "power");

    // Status LEDs (3 small squares, top-left)
    [-3.3*S, -3.15*S, -3.0*S].forEach((x, i) =>
      box(0.09*S, 0.09*S, 0.05*S, i === 2 ? 0xfbbf24 : 0x22c55e, x, 0.38*S, 1.34*S, "leds")
    );
    // Per-port activity LEDs
    [-3.0*S, -2.68*S, -2.2*S, -1.85*S, -1.2*S, -0.78*S, -0.36*S, 0.06*S, 0.6*S, 1.0*S].forEach(x =>
      box(0.07*S, 0.07*S, 0.04*S, 0x4ade80, x, 0.38*S, 1.34*S, "leds")
    );

    // Rack ears
    box(0.18*S, 1.1*S, 0.15*S, 0x374151, -3.59*S, 0, 0, null);
    box(0.18*S, 1.1*S, 0.15*S, 0x374151,  3.59*S, 0, 0, null);
    // Rack ear bolt holes
    [-0.3*S, 0.3*S].forEach(dy => [-3.59*S, 3.59*S].forEach(ex => cyl(0.05*S, 0.2*S, 0x111827, ex, dy, 0, null)));

    // Top vent slots (NPU label)
    for (let i = -2.8*S; i <= 2.8*S; i += 0.32*S)
      box(0.1*S, 0.025*S, 2.2*S, 0x3d4a63, i, 0.56*S, -0.1*S, "npu");

    // PSU grill rear-right
    box(1.1*S, 0.85*S, 0.06*S, 0x252d40, 2.6*S, 0, -1.3*S, "power");
    for (let i = -0.35*S; i <= 0.35*S; i += 0.14*S)
      box(0.85*S, 0.04*S, 0.07*S, 0x1a2235, 2.6*S, i, -1.3*S, null);

    // Fortinet logo plate (subtle)
    box(0.8*S, 0.15*S, 0.025*S, 0x3a4560, -0.5*S, -0.35*S, 1.34*S, "chassis");

    // Initial rotation — front-face visible, slight top-down angle
    group.rotation.x = 0.25;
    group.rotation.y = 0.1;

    // Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let highlighted: any = null;
    const setInfo = (part: string) => setSelected(PART_INFO[part] ?? null);

    const onClick = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(clickables);
      if (!hits.length) return;
      const obj = hits[0].object as any;
      if (highlighted) highlighted.material.emissive.setHex(0x000000);
      highlighted = obj;
      obj.material.emissive.setHex(0x2563eb);
      setInfo(obj.userData.part);
    };
    mount.addEventListener("click", onClick);

    // Drag orbit — rotate group directly, no pivot math needed
    let dragging = false, prevX = 0, prevY = 0;
    const onDown = (e: MouseEvent) => { dragging = true; prevX = e.clientX; prevY = e.clientY; mount.style.cursor = "grabbing"; };
    const onUp = () => { dragging = false; mount.style.cursor = "grab"; };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      group.rotation.y += (e.clientX - prevX) * 0.008;
      group.rotation.x += (e.clientY - prevY) * 0.006;
      group.rotation.x = Math.max(-0.7, Math.min(0.9, group.rotation.x));
      prevX = e.clientX; prevY = e.clientY;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.max(5, Math.min(18, camera.position.z + e.deltaY * 0.01));
    };
    mount.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    mount.addEventListener("wheel", onWheel, { passive: false });

    let animId: number;
    const animate = () => { animId = requestAnimationFrame(animate); renderer.render(scene, camera); };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      mount.removeEventListener("click", onClick);
      mount.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
      mount.removeEventListener("wheel", onWheel);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [threeReady]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 12 }}>
      <div>
        <h1 className="text-[15px] font-semibold text-forti-dark mb-0.5">FortiGate 600F — Hardware Reference</h1>
        <p className="text-gray-500 text-[12px]">Drag to rotate · scroll to zoom · click any component to learn what it does</p>
      </div>

      {/* 3D viewport — takes all remaining vertical space */}
      <div
        ref={mountRef}
        style={{ flex: 1, minHeight: 0, borderRadius: 6, overflow: "hidden", border: "1px solid #e5e7eb", cursor: "grab", background: "#111827" }}
      />

      {/* Legend + info panel pinned to bottom */}
      <div>
        <div className="flex gap-4 flex-wrap text-[11px] text-gray-400 mb-2">
          {[["#4ade80","Active port"],["#f97316","WAN"],["#3b82f6","LAN / DMZ"],["#a78bfa","Management"],["#0d9488","SFP+"]].map(([c,l]) => (
            <span key={l} className="flex items-center gap-1.5">
              <span style={{ width:9, height:9, borderRadius:"50%", background:c, display:"inline-block" }} />{l}
            </span>
          ))}
        </div>
        <div className="bg-white border border-gray-200 rounded-md p-3 min-h-[64px]">
          {selected
            ? <><div className="text-[13px] font-medium text-gray-800 mb-0.5">{selected.title}</div><p className="text-[12px] text-gray-500 leading-relaxed">{selected.body}</p></>
            : <p className="text-[12px] text-gray-400">Click any component on the model above to see what it does.</p>
          }
        </div>
      </div>
    </div>
  );
}
