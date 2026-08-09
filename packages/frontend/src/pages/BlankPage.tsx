// ============================================================================
// Home page — interactive 3D FortiGate 600F model.
// Students can rotate/zoom the chassis and click any component to learn
// what it does in a real deployment.
// ============================================================================

import { useEffect, useRef, useState } from "react";

interface PartInfo {
  title: string;
  body: string;
}

const PART_INFO: Record<string, PartInfo> = {
  chassis: {
    title: "Chassis (1U Rack Unit)",
    body: "The FortiGate 600F fits in a standard 19-inch rack in 1U of space. The hardened steel enclosure houses all ASICs, RAM, and NVMe storage. In a real deployment this slides into a data-centre rack and is bolted in with rack ears.",
  },
  wan1: {
    title: "WAN1 — Primary Internet Uplink",
    body: "WAN1 is the default gateway interface for internet-bound traffic. It connects to your ISP's CPE or modem. In FortiOS you assign a static IP or configure DHCP/PPPoE here. All outbound NAT traffic leaves through this port by default.",
  },
  wan2: {
    title: "WAN2 — Secondary / Backup Uplink",
    body: "WAN2 provides ISP redundancy. With SD-WAN or static routing configured, FortiOS can fail traffic over to WAN2 if WAN1 goes down, or load-balance across both links simultaneously for higher throughput.",
  },
  mgmt: {
    title: "MGMT — Out-of-Band Management Port",
    body: "A dedicated 1GbE port exclusively for administrative access (GUI, SSH, SNMP). Because it's logically separate from data-plane ports, an attacker who compromises a data port cannot reach the management plane. Best practice: restrict to a management VLAN only.",
  },
  ha: {
    title: "HA — High-Availability Heartbeat Port",
    body: "Used exclusively for HA cluster communication between two FortiGate units (active-passive or active-active). The heartbeat signal lets the standby unit detect failover events in milliseconds. Never mix HA traffic with production data.",
  },
  lan1: {
    title: "Port 1–4 — Internal LAN Ports (1GbE)",
    body: "These copper RJ-45 ports connect internal switches and workstations. In FortiOS they are typically placed in the LAN or internal zone. Traffic between these ports and the WAN is subject to firewall policies — nothing passes without an explicit ACCEPT rule.",
  },
  sfp: {
    title: "SFP+ Ports — 10GbE Fibre Uplinks",
    body: "Two SFP+ cages accept 10GbE optical or DAC (direct-attach copper) transceivers. Commonly used for high-speed DMZ uplinks, inter-VLAN routing to core switches, or connecting to a 10G-capable ISP handoff. Transceivers are hot-swappable.",
  },
  usb: {
    title: "USB Port — Recovery & Config Import",
    body: "The USB-A port serves two purposes: (1) boot from a FortiOS recovery image if the internal firmware is corrupted, and (2) import a configuration file automatically on first boot — useful for zero-touch provisioning in branch deployments.",
  },
  console: {
    title: "RJ-45 Console Port",
    body: "Serial console access (9600 baud, 8N1 by default). This is your last resort if the management IP is unreachable or the device fails to boot. Connect with a Cisco-style rollover cable. Always keep physical console access secured in a locked rack.",
  },
  leds: {
    title: "Status LEDs",
    body: "Left to right: PWR (green = power OK), STATUS (green = normal, amber = alert), HA (green = HA sync active). Per-port LEDs show link speed and activity. Blinking = live traffic. In training mode these are simulated.",
  },
  npu: {
    title: "NP7 Network Processor (internal)",
    body: "The FortiGate 600F contains Fortinet's NP7 ASIC, which offloads firewall sessions, IPsec encryption, and IPS inspection from the main CPU. Once a session is established and policy-matched, NP7 handles subsequent packets in hardware at line rate — up to 36 Gbps.",
  },
  power: {
    title: "Power Supply Unit",
    body: "The 600F ships with a single internal PSU (100–240V AC). A redundant PSU module can be installed in the second bay for hot-swap failover — if the primary PSU fails, the secondary takes over without dropping a single packet or rebooting the device.",
  },
};

declare global {
  interface Window {
    THREE: typeof import("three");
  }
}

export function BlankPage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<PartInfo | null>(null);
  const [threeReady, setThreeReady] = useState(false);

  // Load Three.js from CDN once
  useEffect(() => {
    if (window.THREE) { setThreeReady(true); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    script.onload = () => setThreeReady(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!threeReady || !mountRef.current) return;
    const THREE = window.THREE;
    const mount = mountRef.current;
    const W = mount.clientWidth, H = 380;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1f2e);

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 1.8, 6);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(4, 6, 5);
    dir.castShadow = true;
    scene.add(dir);
    scene.add(Object.assign(new THREE.DirectionalLight(0x8888ff, 0.3), { position: new THREE.Vector3(-4, 2, -3) }));

    const clickables: THREE.Mesh[] = [];

    function box(w: number, h: number, d: number, color: number, x: number, y: number, z: number, part: string | null) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.7 })
      );
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      if (part) { mesh.userData.part = part; clickables.push(mesh); }
      scene.add(mesh);
      return mesh;
    }

    function cyl(r: number, h: number, color: number, x: number, y: number, z: number, part: string | null) {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(r, r, h, 12),
        new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.6 })
      );
      mesh.position.set(x, y, z);
      mesh.rotation.x = Math.PI / 2;
      if (part) { mesh.userData.part = part; clickables.push(mesh); }
      scene.add(mesh);
      return mesh;
    }

    box(5.6, 0.9, 2.2, 0x2d3448, 0, 0, 0, "chassis");
    box(5.6, 0.9, 0.05, 0x1e2436, 0, 0, 1.125, "chassis");
    box(5.4, 0.7, 0.05, 0x222840, 0, 0, -1.125, null);

    box(0.18, 0.16, 0.06, 0xf97316, -2.4, 0.1, 1.16, "wan1");
    box(0.18, 0.16, 0.06, 0xf97316, -2.1, 0.1, 1.16, "wan2");
    box(0.18, 0.16, 0.06, 0xa78bfa, -1.7, 0.1, 1.16, "mgmt");
    box(0.18, 0.16, 0.06, 0x7c3aed, -1.4, 0.1, 1.16, "ha");

    ([-0.9, -0.6, -0.3, 0.0] as number[]).forEach((x) => box(0.18, 0.16, 0.06, 0x60a5fa, x, 0.1, 1.16, "lan1"));
    ([0.5, 0.82] as number[]).forEach((x) => { box(0.22, 0.18, 0.08, 0x0f766e, x, 0.1, 1.16, "sfp"); box(0.1, 0.05, 0.04, 0x134e4a, x, 0.02, 1.2, null); });

    box(0.14, 0.1, 0.06, 0x64748b, 1.4, 0.15, 1.16, "usb");
    box(0.18, 0.16, 0.06, 0x94a3b8, 1.7, 0.1, 1.16, "console");
    cyl(0.08, 0.04, 0x22c55e, 2.3, 0.15, 1.17, "power");

    ([-2.6, -2.5, -2.4] as number[]).forEach((x, i) => box(0.07, 0.07, 0.04, i === 2 ? 0xfbbf24 : 0x22c55e, x, 0.28, 1.16, "leds"));
    ([-0.9, -0.6, -0.3, 0.0, 0.5, 0.82] as number[]).forEach((x) => box(0.06, 0.06, 0.03, 0x4ade80, x, 0.27, 1.16, "leds"));

    box(0.15, 0.9, 0.12, 0x374151, -2.875, 0, 0, null);
    box(0.15, 0.9, 0.12, 0x374151, 2.875, 0, 0, null);
    ([-0.25, 0.25] as number[]).forEach((dy) => ([-2.875, 2.875] as number[]).forEach((ex) => cyl(0.04, 0.16, 0x1a1f2e, ex, dy, 0, null)));

    for (let i = -2; i <= 2; i += 0.25) box(0.08, 0.02, 1.8, 0x374151, i, 0.46, -0.1, "npu");

    box(0.9, 0.7, 0.05, 0x2a3040, 2.1, 0, -1.125, "power");
    for (let i = -0.3; i <= 0.3; i += 0.12) box(0.7, 0.03, 0.06, 0x1e2436, 2.1, i, -1.125, null);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.6;
    floor.receiveShadow = true;
    scene.add(floor);

    // Group everything except lights/floor for rotation
    const group = new THREE.Group();
    scene.children
      .filter((c) => !(c instanceof THREE.Light) && c !== floor)
      .forEach((c) => { scene.remove(c); group.add(c); });
    scene.add(group);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let highlighted: THREE.Mesh | null = null;

    mount.addEventListener("click", (e) => {
      const rect = mount.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(clickables);
      if (!hits.length) return;
      const obj = hits[0].object as THREE.Mesh;
      if (highlighted) (highlighted.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
      highlighted = obj;
      (obj.material as THREE.MeshStandardMaterial).emissive.setHex(0x334155);
      setSelected(PART_INFO[obj.userData.part] ?? null);
    });

    let isDragging = false, prevX = 0, prevY = 0;
    let rotX = 0.3, rotY = 0.4;

    mount.addEventListener("mousedown", (e) => { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
    window.addEventListener("mouseup", () => { isDragging = false; });
    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      rotY += (e.clientX - prevX) * 0.008;
      rotX += (e.clientY - prevY) * 0.006;
      rotX = Math.max(-0.6, Math.min(0.8, rotX));
      prevX = e.clientX; prevY = e.clientY;
    });
    mount.addEventListener("wheel", (e) => {
      e.preventDefault();
      camera.position.multiplyScalar(1 + e.deltaY * 0.001);
      camera.position.clampLength(3, 12);
    }, { passive: false });

    let touchX = 0, touchY = 0;
    mount.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; touchY = e.touches[0].clientY; });
    mount.addEventListener("touchmove", (e) => {
      e.preventDefault();
      rotY += (e.touches[0].clientX - touchX) * 0.01;
      rotX += (e.touches[0].clientY - touchY) * 0.008;
      rotX = Math.max(-0.6, Math.min(0.8, rotX));
      touchX = e.touches[0].clientX; touchY = e.touches[0].clientY;
    }, { passive: false });

    let animId: number;
    function animate() {
      animId = requestAnimationFrame(animate);
      group.rotation.x = rotX;
      group.rotation.y = rotY;
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [threeReady]);

  return (
    <div className="max-w-4xl">
      <h1 className="text-[15px] font-semibold text-forti-dark mb-1">FortiGate 600F — Hardware Reference</h1>
      <p className="text-gray-500 text-[12.5px] mb-4">
        Drag to rotate · scroll to zoom · click any component to learn what it does in a real deployment.
      </p>

      <div
        ref={mountRef}
        className="w-full rounded-md overflow-hidden border border-gray-200 cursor-grab active:cursor-grabbing"
        style={{ height: 380, background: "#1a1f2e" }}
      />

      <div className="flex gap-3 mt-3 flex-wrap text-[11.5px] text-gray-400">
        {[
          { color: "#4ade80", label: "Active port" },
          { color: "#f97316", label: "WAN" },
          { color: "#60a5fa", label: "LAN / DMZ" },
          { color: "#a78bfa", label: "Management" },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>

      <div className="mt-4 bg-white border border-gray-200 rounded-md p-4 min-h-[80px] transition-all">
        {selected ? (
          <div>
            <div className="text-[13px] font-medium text-gray-800 mb-1">{selected.title}</div>
            <p className="text-[12.5px] text-gray-500 leading-relaxed">{selected.body}</p>
          </div>
        ) : (
          <p className="text-[12.5px] text-gray-400">Click any component on the model above to see what it does.</p>
        )}
      </div>
    </div>
  );
}
