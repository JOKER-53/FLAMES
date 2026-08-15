// ============================================================================
// Cable assignment exercise for Port Assignment track.
// Click a cable type to select it, then click a port dot to plug it in.
// One cable per port. Correct zone = grading pass.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import type { PortZone, PortAssignment } from "./ChassisDiagram";

interface CableDragDiagramProps {
  ports: PortAssignment[];
  onChange: (portId: string, zone: PortZone) => void;
  fullHeight?: boolean;
}

const ZONE_COLOR: Record<PortZone, string> = {
  WAN: "#f97316", LAN: "#22c55e", DMZ: "#3b82f6", unassigned: "#6b7280",
};

// Exact port x positions from console log
const PORT_X: Record<string, number> = {
  wan2:    -1.359,
  wan1:    -0.849,
  dmz:     -0.340,
  "lan-5":  1.189,
  "lan-4":  1.699,
  "lan-3":  2.208,
  "lan-2":  2.718,
  "lan-1":  3.227,
};
const PORT_Y = -0.232;
const PORT_Z =  2.874;

// GLB port id → engine portId
const GLB_TO_PORT: Record<string, string> = {
  wan1: "wan1", wan2: "wan2",
  dmz: "port5",
  "lan-1": "port1", "lan-2": "port2",
  "lan-3": "port3", "lan-4": "port4",
  "lan-5": "port6",
};

const CABLE_OPTIONS: { zone: PortZone; label: string; desc: string }[] = [
  { zone: "WAN",        label: "WAN Cable",       desc: "Internet uplink → WAN1 or WAN2" },
  { zone: "LAN",        label: "LAN Cable",        desc: "Internal network → Ports 1–4"  },
  { zone: "DMZ",        label: "DMZ Cable",        desc: "Public servers → Port 5"        },
  { zone: "unassigned", label: "Leave Unassigned", desc: "Unused port → Port 6"           },
];

export function CableDragDiagram({ ports, onChange, fullHeight }: CableDragDiagramProps) {
  const mountRef  = useRef<HTMLDivElement>(null);
  const threeRef  = useRef<any>(null);
  const [selZone,  setSelZone]  = useState<PortZone | null>(null);
  const [plugged,  setPlugged]  = useState<Record<string, PortZone>>({});  // glbId → zone
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const selZoneRef = useRef<PortZone | null>(null);

  useEffect(() => { selZoneRef.current = selZone; }, [selZone]);

  function showFeedback(msg: string, ok: boolean) {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 2200);
  }

  // Rebuild all cable meshes from plugged state
  function rebuildCables(
    group: THREE.Group,
    cableMeshes: Record<string, THREE.Object3D>,
    sz: THREE.Vector3
  ) {
    Object.values(cableMeshes).forEach((m: any) => group.remove(m));
    Object.keys(cableMeshes).forEach(k => delete cableMeshes[k]);

    Object.entries(plugged).forEach(([glbId, zone]) => {
      const x = PORT_X[glbId];
      if (x === undefined || zone === "unassigned") return;
      const col = new THREE.Color(ZONE_COLOR[zone]);

      // Plug body — sits flush in port hole
      const pw = sz.y * 0.09, ph = sz.y * 0.07, pd = sz.y * 0.10;
      const plug = new THREE.Mesh(
        new THREE.BoxGeometry(pw, ph, pd),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, metalness: 0.2 })
      );
      plug.position.set(x, PORT_Y, PORT_Z + pd * 0.5);
      group.add(plug); cableMeshes[glbId + "_plug"] = plug;

      // Latch tab
      const latch = new THREE.Mesh(
        new THREE.BoxGeometry(pw * 0.35, ph * 0.1, pd * 0.45),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.2, metalness: 0.5 })
      );
      latch.position.set(x, PORT_Y - ph * 0.56, PORT_Z + pd * 0.22);
      group.add(latch); cableMeshes[glbId + "_latch"] = latch;

      // Gold pins
      const pinMat = new THREE.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.15, metalness: 0.95 });
      for (let p = -3; p <= 3; p++) {
        const pin = new THREE.Mesh(new THREE.BoxGeometry(pw * 0.052, ph * 0.3, pd * 0.06), pinMat);
        pin.position.set(x + p * pw * 0.12, PORT_Y + ph * 0.08, PORT_Z + pd);
        group.add(pin); cableMeshes[glbId + `_pin${p}`] = pin;
      }

      // Boot
      const boot = new THREE.Mesh(
        new THREE.CylinderGeometry(sz.y * 0.052, sz.y * 0.048, sz.y * 0.065, 12),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.5, metalness: 0.1 })
      );
      boot.rotation.x = Math.PI / 2;
      boot.position.set(x, PORT_Y, PORT_Z + pd + sz.y * 0.032);
      group.add(boot); cableMeshes[glbId + "_boot"] = boot;

      // Drooping cable — deterministic per port using x as seed
      const cr = sz.y * 0.026;
      const startZ = PORT_Z + pd + sz.y * 0.065;
      const seed = Math.abs(x * 1000) % 1;
      const jx = (seed - 0.5) * sz.y * 0.35;
      const pts = [
        new THREE.Vector3(x, PORT_Y,              startZ),
        new THREE.Vector3(x, PORT_Y - sz.y*0.04,  startZ + sz.z*0.035),
        new THREE.Vector3(x + jx*0.3, PORT_Y - sz.y*0.22, startZ + sz.z*0.09),
        new THREE.Vector3(x + jx*0.6, PORT_Y - sz.y*0.50, startZ + sz.z*0.15),
        new THREE.Vector3(x + jx*0.8, PORT_Y - sz.y*0.82, startZ + sz.z*0.19),
        new THREE.Vector3(x + jx,     PORT_Y - sz.y*1.15,  startZ + sz.z*0.21),
      ];
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5),
          28, cr, 10, false
        ),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.65, metalness: 0.05 })
      );
      group.add(tube); cableMeshes[glbId + "_tube"] = tube;
    });
  }

  useEffect(() => {
    if (!mountRef.current) return;
    const mount = mountRef.current;
    const W = mount.clientWidth || 700;
    const H = fullHeight ? 480 : 320;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111827);

    const camera = new THREE.PerspectiveCamera(40, W / H, 0.001, 10000);

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    [[3,8,10],[-4,4,8],[0,-4,8],[0,5,-8]].forEach(([x,y,z],i) => {
      const l = new THREE.DirectionalLight(0xffffff, [0.9,0.7,0.4,0.3][i]);
      l.position.set(x,y,z); scene.add(l);
    });

    const group = new THREE.Group();
    scene.add(group);
    const portSpheres: Record<string, THREE.Mesh> = {};
    const cableMeshes: Record<string, THREE.Object3D> = {};

    const loader = new GLTFLoader();
    loader.load("/firewall.glb", (gltf) => {
      const model = gltf.scene;
      const box0 = new THREE.Box3().setFromObject(model);
      const sz0 = new THREE.Vector3(); box0.getSize(sz0);
      const scale = 8 / Math.max(sz0.x, sz0.y, sz0.z);
      model.scale.setScalar(scale);
      const box1 = new THREE.Box3().setFromObject(model);
      const ctr = new THREE.Vector3(); box1.getCenter(ctr);
      model.position.sub(ctr);
      model.traverse((c: any) => {
        if (c.isMesh) {
          (Array.isArray(c.material) ? c.material : [c.material]).forEach((m: any) => {
            if (m) { m.side = THREE.FrontSide; if (m.emissiveIntensity) m.emissiveIntensity = 0.3; m.needsUpdate = true; }
          });
        }
      });
      group.add(model);

      const box2 = new THREE.Box3().setFromObject(group);
      const sz2 = new THREE.Vector3(); box2.getSize(sz2);
      const fov = camera.fov * Math.PI / 180;
      const dist = (Math.max(sz2.x, sz2.y, sz2.z) / 2) / Math.tan(fov / 2) * 1.45;
      camera.position.set(0, -sz2.y * 0.05, dist);
      camera.near = dist / 1000; camera.far = dist * 100;
      camera.updateProjectionMatrix();
      camera.lookAt(0, -sz2.y * 0.18, 0);

      // Port indicator spheres — only for assignable ports
      const r = sz2.y * 0.030;
      Object.entries(PORT_X).forEach(([glbId, x]) => {
        const portId = GLB_TO_PORT[glbId];
        if (!portId) return;
        const port = ports.find(p => p.portId === portId);
        if (port?.locked) return;

        const col = new THREE.Color("#94a3b8"); // neutral grey — zone unknown yet
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(r, 12, 12),
          new THREE.MeshStandardMaterial({
            color: col, emissive: col, emissiveIntensity: 1.2,
            roughness: 0.2, metalness: 0.1
          })
        );
        sphere.position.set(x, PORT_Y, PORT_Z + r * 0.6);
        sphere.userData.glbId  = glbId;
        sphere.userData.portId = portId;
        group.add(sphere);
        portSpheres[glbId] = sphere;
      });

      threeRef.current = { group, portSpheres, cableMeshes, sz: sz2, camera };
      group.rotation.set(-0.22, 0, 0);
    }, undefined, () => {});

    // ── CLICK handler: select port when a zone is selected ─────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let clickStart = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => { clickStart = { x: e.clientX, y: e.clientY }; };

    const onMouseUp = (e: MouseEvent) => {
      const dx = Math.abs(e.clientX - clickStart.x);
      const dy = Math.abs(e.clientY - clickStart.y);
      if (dx > 5 || dy > 5) return; // was a drag, not a click

      const zone = selZoneRef.current;
      if (!zone) return; // no cable selected — let orbit handle it

      const rect = mount.getBoundingClientRect();
      mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const spheres = Object.values(portSpheres);
      const hits = raycaster.intersectObjects(spheres);
      if (!hits.length) return;

      const obj = hits[0].object as THREE.Mesh;
      const glbId  = obj.userData.glbId  as string;
      const portId = obj.userData.portId as string;

      // Update sphere color to zone color
      const col = new THREE.Color(ZONE_COLOR[zone]);
      const mat = obj.material as THREE.MeshStandardMaterial;
      mat.color.set(col); mat.emissive.set(col); mat.emissiveIntensity = 2.0;

      // Update plugged state and rebuild cables
      const newPlugged = { ...plugged, [glbId]: zone };
      setPlugged(newPlugged);

      // Rebuild cables immediately using newPlugged
      Object.values(cableMeshes).forEach((m: any) => group.remove(m));
      Object.keys(cableMeshes).forEach(k => delete cableMeshes[k]);

      const sz = threeRef.current?.sz;
      if (sz) {
        // Temporarily set plugged to newPlugged for rebuild
        const savedPlugged = { ...plugged, [glbId]: zone };
        Object.entries(savedPlugged).forEach(([gid, z]) => {
          const x = PORT_X[gid];
          if (x === undefined || z === "unassigned") return;
          const c = new THREE.Color(ZONE_COLOR[z]);
          const pw = sz.y*0.09, ph = sz.y*0.07, pd = sz.y*0.10;

          const plug2 = new THREE.Mesh(new THREE.BoxGeometry(pw,ph,pd),
            new THREE.MeshStandardMaterial({color:c,roughness:0.4,metalness:0.2}));
          plug2.position.set(x, PORT_Y, PORT_Z+pd*0.5);
          group.add(plug2); cableMeshes[gid+"_plug"]=plug2;

          const latch2 = new THREE.Mesh(new THREE.BoxGeometry(pw*0.35,ph*0.1,pd*0.45),
            new THREE.MeshStandardMaterial({color:c,roughness:0.2,metalness:0.5}));
          latch2.position.set(x, PORT_Y-ph*0.56, PORT_Z+pd*0.22);
          group.add(latch2); cableMeshes[gid+"_latch"]=latch2;

          const pinMat = new THREE.MeshStandardMaterial({color:0xd4a017,roughness:0.15,metalness:0.95});
          for (let p=-3;p<=3;p++) {
            const pin=new THREE.Mesh(new THREE.BoxGeometry(pw*0.052,ph*0.3,pd*0.06),pinMat);
            pin.position.set(x+p*pw*0.12,PORT_Y+ph*0.08,PORT_Z+pd);
            group.add(pin); cableMeshes[gid+`_pin${p}`]=pin;
          }

          const boot2=new THREE.Mesh(new THREE.CylinderGeometry(sz.y*0.052,sz.y*0.048,sz.y*0.065,12),
            new THREE.MeshStandardMaterial({color:c,roughness:0.5,metalness:0.1}));
          boot2.rotation.x=Math.PI/2;
          boot2.position.set(x,PORT_Y,PORT_Z+pd+sz.y*0.032);
          group.add(boot2); cableMeshes[gid+"_boot"]=boot2;

          const cr=sz.y*0.026, startZ=PORT_Z+pd+sz.y*0.065;
          const seed=Math.abs(x*1000)%1, jx=(seed-0.5)*sz.y*0.35;
          const pts=[
            new THREE.Vector3(x,PORT_Y,startZ),
            new THREE.Vector3(x,PORT_Y-sz.y*0.04,startZ+sz.z*0.035),
            new THREE.Vector3(x+jx*0.3,PORT_Y-sz.y*0.22,startZ+sz.z*0.09),
            new THREE.Vector3(x+jx*0.6,PORT_Y-sz.y*0.50,startZ+sz.z*0.15),
            new THREE.Vector3(x+jx*0.8,PORT_Y-sz.y*0.82,startZ+sz.z*0.19),
            new THREE.Vector3(x+jx,PORT_Y-sz.y*1.15,startZ+sz.z*0.21),
          ];
          const tube2=new THREE.Mesh(
            new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,false,"catmullrom",0.5),28,cr,10,false),
            new THREE.MeshStandardMaterial({color:c,roughness:0.65,metalness:0.05}));
          group.add(tube2); cableMeshes[gid+"_tube"]=tube2;
        });
      }

      onChange(portId, zone);
      const label = portId==="wan1"?"WAN1":portId==="wan2"?"WAN2":`Port ${portId.replace("port","")}`;
      showFeedback(`✓ ${zone} cable → ${label}`, true);
    };

    mount.addEventListener("mousedown", onMouseDown);
    mount.addEventListener("mouseup",   onMouseUp);

    // ── ORBIT (only when no zone selected) ───────────────────────────────
    let rotX = -0.28, rotY = 0, isDragging = false, prevX = 0, prevY = 0;
    let autoRotate = true;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    group.rotation.set(rotX, rotY, 0);

    function resetIdle() {
      autoRotate = false;
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => { autoRotate = true; }, 8000);
    }

    const onOrbitDown = (e: MouseEvent) => {
      isDragging = true; prevX = e.clientX; prevY = e.clientY; resetIdle();
    };
    const onOrbitUp   = () => { isDragging = false; };
    const onOrbitMove = (e: MouseEvent) => {
      if (!isDragging) return;
      rotY += (e.clientX - prevX) * 0.007;
      rotX += (e.clientY - prevY) * 0.005;
      rotX = Math.max(-0.6, Math.min(0.3, rotX));
      prevX = e.clientX; prevY = e.clientY;
      group.rotation.set(rotX, rotY, 0);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); resetIdle();
      camera.position.z = Math.max(0.5, camera.position.z * (1 + e.deltaY * 0.001));
    };

    mount.addEventListener("mousedown",  onOrbitDown);
    window.addEventListener("mouseup",   onOrbitUp);
    window.addEventListener("mousemove", onOrbitMove);
    mount.addEventListener("wheel",      onWheel, { passive: false });

    // Pulse spheres when zone selected
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const zone = selZoneRef.current;
      const t = Date.now() * 0.004;
      Object.values(portSpheres).forEach((s: THREE.Mesh) => {
        const mat = s.material as THREE.MeshStandardMaterial;
        if (zone && !plugged[s.userData.glbId]) {
          const col = new THREE.Color(ZONE_COLOR[zone]);
          mat.color.set(col);
          mat.emissive.set(col);
          mat.emissiveIntensity = 1.2 + Math.sin(t) * 0.6;
        } else if (!plugged[s.userData.glbId]) {
          mat.color.set("#94a3b8");
          mat.emissive.set("#94a3b8");
          mat.emissiveIntensity = 0.8;
        }
      });
      if (autoRotate && !isDragging) { rotY += 0.003; group.rotation.set(rotX, rotY, 0); }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      if (idleTimer) clearTimeout(idleTimer);
      mount.removeEventListener("mousedown", onMouseDown);
      mount.removeEventListener("mouseup",   onMouseUp);
      mount.removeEventListener("mousedown", onOrbitDown);
      window.removeEventListener("mouseup",  onOrbitUp);
      window.removeEventListener("mousemove",onOrbitMove);
      mount.removeEventListener("wheel",     onWheel);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="space-y-3">
      {/* Cable selector */}
      <div className="bg-gray-900 border border-gray-700 rounded-md p-3">
        <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-2 font-mono">
          1. Click a cable type &nbsp;→&nbsp; 2. Click the glowing port dot on the model
        </div>
        <div className="flex gap-2 flex-wrap">
          {CABLE_OPTIONS.map(({ zone, label, desc }) => (
            <button
              key={zone}
              onClick={() => setSelZone(selZone === zone ? null : zone)}
              title={desc}
              className="flex items-center gap-2 px-3 py-2 rounded select-none transition-all"
              style={{
                background:   selZone === zone ? ZONE_COLOR[zone] + "33" : ZONE_COLOR[zone] + "11",
                border:       `2px solid ${selZone === zone ? ZONE_COLOR[zone] : ZONE_COLOR[zone] + "55"}`,
                color:        ZONE_COLOR[zone],
                transform:    selZone === zone ? "scale(1.06)" : undefined,
                boxShadow:    selZone === zone ? `0 0 14px ${ZONE_COLOR[zone]}55` : undefined,
                fontWeight:   selZone === zone ? 600 : 400,
              }}
            >
              {/* RJ-45 icon */}
              <svg width="26" height="18" viewBox="0 0 26 18">
                <rect x="0" y="5" width="11" height="8" rx="1.5" fill={ZONE_COLOR[zone]} opacity="0.85"/>
                <rect x="11" y="8" width="15" height="2" rx="1" fill={ZONE_COLOR[zone]} opacity="0.6"/>
                <rect x="1.5" y="8" width="1.5" height="2" rx="0.4" fill="white" opacity="0.7"/>
                <rect x="4"   y="8" width="1.5" height="2" rx="0.4" fill="white" opacity="0.7"/>
                <rect x="6.5" y="8" width="1.5" height="2" rx="0.4" fill="white" opacity="0.7"/>
              </svg>
              <span style={{ fontSize: 12 }}>{label}</span>
              {selZone === zone && <span style={{ fontSize: 10 }}>● selected</span>}
            </button>
          ))}
          {selZone && (
            <button onClick={() => setSelZone(null)}
              className="px-3 py-2 rounded text-[12px] text-gray-400"
              style={{ border: "1.5px solid #374151", background: "#1f2937" }}>
              ✕ Cancel
            </button>
          )}
        </div>
        {selZone && (
          <div className="mt-2 text-[11px] animate-pulse" style={{ color: ZONE_COLOR[selZone] }}>
            🎯 Now click a glowing port dot on the model to connect the {selZone} cable
          </div>
        )}
      </div>

      {/* 3D viewport */}
      <div style={{ position: "relative" }}>
        <div
          ref={mountRef}
          style={{
            width: "100%", height: fullHeight ? 480 : 320,
            borderRadius: 8, overflow: "hidden",
            border: "1px solid #1f2937",
            background: "#111827",
            cursor: selZone ? "crosshair" : "grab",
          }}
        />
        <div style={{ position:"absolute", top:8, left:10, fontSize:11, color:"#4b5563", pointerEvents:"none" }}>
          {selZone ? `🔌 Click a port dot to connect ${selZone} cable` : "drag to rotate · scroll to zoom"}
        </div>
        {/* Zoom controls */}
        <div style={{ position:"absolute", bottom:10, right:10, display:"flex", flexDirection:"column", gap:3 }}>
          {[{l:"+",f:()=>{const c=threeRef.current?.camera;if(c)c.position.z*=0.82;}},
            {l:"-",f:()=>{const c=threeRef.current?.camera;if(c)c.position.z*=1.22;}}
          ].map(({l,f}) => (
            <button key={l} onClick={f}
              style={{width:28,height:28,borderRadius:4,border:"1px solid #374151",
                background:"rgba(17,24,39,0.9)",color:"#9ca3af",fontSize:16,cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"center"}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div style={{ padding:"6px 12px", borderRadius:4, fontSize:12, fontWeight:500,
          background: feedback.ok ? "#052e16" : "#450a0a",
          color:      feedback.ok ? "#4ade80" : "#f87171",
          border: `1px solid ${feedback.ok ? "#166534" : "#991b1b"}` }}>
          {feedback.msg}
        </div>
      )}

      {/* Plugged summary */}
      {Object.keys(plugged).length > 0 && (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-[11px] text-gray-500">Connected:</span>
          {Object.entries(plugged).map(([glbId, zone]) => {
            const portId = GLB_TO_PORT[glbId];
            const label  = portId==="wan1"?"WAN1":portId==="wan2"?"WAN2":`Port ${portId?.replace("port","")}`;
            return (
              <span key={glbId} style={{ fontSize:11, padding:"2px 8px", borderRadius:3,
                background: ZONE_COLOR[zone]+"22", color: ZONE_COLOR[zone],
                border: `1px solid ${ZONE_COLOR[zone]}44` }}>
                {label} → {zone}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
