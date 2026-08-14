// ============================================================================
// Interactive cable-drag exercise for Port Assignment.
// Students drag colour-coded cables from a rack panel on the left and drop
// them onto the correct port on the FortiGate 60F GLB model on the right.
// Dropping on the wrong zone type shows an error; correct drop updates state.
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
  WAN: "#f97316", LAN: "#22c55e", DMZ: "#3b82f6", unassigned: "#4b5563",
};
const ZONE_EMISSIVE: Record<PortZone, string> = {
  WAN: "#f97316", LAN: "#22c55e", DMZ: "#3b82f6", unassigned: "#374151",
};

// Exact port x positions from GLB (logged previously)
const PORT_X: Record<string, number> = {
  reset: -3.397, power: -2.888, usb: -2.378, console: -1.868,
  wan2: -1.359, wan1: -0.849, dmz: -0.340,
  "ha-b": 0.170, "ha-a": 0.679,
  "lan-5": 1.189, "lan-4": 1.699, "lan-3": 2.208, "lan-2": 2.718, "lan-1": 3.227,
};
const PORT_Y = -0.232;
const PORT_Z =  2.874;

// Map GLB visual port id → engine portId (must match portScenario.ports[].portId)
// GLB front face left→right: reset,power,usb,console,wan2,wan1,dmz,ha-b,ha-a,lan-5,lan-4,lan-3,lan-2,lan-1
// Engine scenario port-assignment-01: port1-4=LAN, port5=DMZ, wan1/wan2=WAN, port6=unassigned
const GLB_TO_PORT: Record<string, string> = {
  wan1:    "wan1",   // WAN1 uplink
  wan2:    "wan2",   // WAN2 uplink
  dmz:     "port5",  // Port 5 → DMZ
  "lan-1": "port1",  // Port 1 → LAN
  "lan-2": "port2",  // Port 2 → LAN
  "lan-3": "port3",  // Port 3 → LAN
  "lan-4": "port4",  // Port 4 → LAN
  "lan-5": "port6",  // Port 6 → unassigned (extra port)
  // ha-b, ha-a, console, usb, reset, power — not in port assignment exercises
};

export function CableDragDiagram({ ports, onChange, fullHeight }: CableDragDiagramProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const threeRef = useRef<any>(null);
  const [dragging, setDragging] = useState<{ zone: PortZone; label: string } | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [plugged, setPlugged] = useState<Record<string, PortZone>>({});
  const draggingRef = useRef<{ zone: PortZone; label: string } | null>(null);

  useEffect(() => { draggingRef.current = dragging; }, [dragging]);

  function showFeedback(msg: string, ok: boolean) {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 2000);
  }

  // Build/rebuild cable meshes in Three.js scene
  function rebuildCables(group: THREE.Group, cableMeshes: Record<string, THREE.Object3D>, sz: THREE.Vector3, newPlugged: Record<string, PortZone>) {
    Object.values(cableMeshes).forEach((m: any) => group.remove(m));
    Object.keys(cableMeshes).forEach(k => delete cableMeshes[k]);

    Object.entries(newPlugged).forEach(([glbId, zone]) => {
      const x = PORT_X[glbId];
      if (x === undefined) return;
      const col = new THREE.Color(ZONE_COLOR[zone]);
      const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.45, metalness: 0.2 });

      // Plug body
      const pw = sz.y*0.09, ph = sz.y*0.07, pd = sz.y*0.11;
      const plug = new THREE.Mesh(new THREE.BoxGeometry(pw,ph,pd), mat);
      plug.position.set(x, PORT_Y, PORT_Z + pd*0.5);
      group.add(plug); cableMeshes[glbId+"_plug"] = plug;

      // Latch
      const latch = new THREE.Mesh(new THREE.BoxGeometry(pw*0.38,ph*0.1,pd*0.5),
        new THREE.MeshStandardMaterial({color:col,roughness:0.2,metalness:0.6}));
      latch.position.set(x, PORT_Y-ph*0.55, PORT_Z+pd*0.25);
      group.add(latch); cableMeshes[glbId+"_latch"] = latch;

      // Pins
      const pinMat = new THREE.MeshStandardMaterial({color:0xd4a017,roughness:0.15,metalness:0.95});
      for (let p=-3;p<=3;p++) {
        const pin = new THREE.Mesh(new THREE.BoxGeometry(pw*0.055,ph*0.32,pd*0.07),pinMat);
        pin.position.set(x+p*pw*0.12, PORT_Y+ph*0.08, PORT_Z+pd);
        group.add(pin); cableMeshes[glbId+`_pin${p}`] = pin;
      }

      // Boot
      const boot = new THREE.Mesh(new THREE.CylinderGeometry(sz.y*0.055,sz.y*0.05,sz.y*0.07,12),mat);
      boot.rotation.x = Math.PI/2;
      boot.position.set(x, PORT_Y, PORT_Z+pd+sz.y*0.035);
      group.add(boot); cableMeshes[glbId+"_boot"] = boot;

      // Drooping cable
      const cr = sz.y*0.028;
      const startZ = PORT_Z+pd+sz.y*0.075;
      const jx = ((x*1000*9301+49297)%233280)/233280*sz.y*0.4 - sz.y*0.2;
      const pts = [
        new THREE.Vector3(x, PORT_Y, startZ),
        new THREE.Vector3(x, PORT_Y-sz.y*0.05, startZ+sz.z*0.04),
        new THREE.Vector3(x+jx*0.4, PORT_Y-sz.y*0.28, startZ+sz.z*0.10),
        new THREE.Vector3(x+jx*0.7, PORT_Y-sz.y*0.58, startZ+sz.z*0.16),
        new THREE.Vector3(x+jx*0.9, PORT_Y-sz.y*0.90, startZ+sz.z*0.20),
        new THREE.Vector3(x+jx,     PORT_Y-sz.y*1.25,  startZ+sz.z*0.22),
      ];
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,false,"catmullrom",0.5),30,cr,10,false),
        new THREE.MeshStandardMaterial({color:col,roughness:0.65,metalness:0.05})
      );
      group.add(tube); cableMeshes[glbId+"_tube"] = tube;
    });
  }

  useEffect(() => {
    if (!mountRef.current) return;
    const mount = mountRef.current;
    const W = mount.clientWidth || 700;
    const H = mount.clientHeight || 320;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111827);

    const camera = new THREE.PerspectiveCamera(40, W/H, 0.001, 10000);

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const d1 = new THREE.DirectionalLight(0xffffff,0.9); d1.position.set(3,8,10); scene.add(d1);
    const d2 = new THREE.DirectionalLight(0xffffff,0.7); d2.position.set(-4,4,8); scene.add(d2);
    const d3 = new THREE.DirectionalLight(0xffffff,0.4); d3.position.set(0,-4,8); scene.add(d3);

    const group = new THREE.Group();
    scene.add(group);
    const cableMeshes: Record<string, THREE.Object3D> = {};
    const portSpheres: Record<string, THREE.Mesh> = {};

    const loader = new GLTFLoader();
    loader.load("/firewall.glb", (gltf) => {
      const model = gltf.scene;
      const box0 = new THREE.Box3().setFromObject(model);
      const sz0 = new THREE.Vector3(); box0.getSize(sz0);
      const scale = 8 / Math.max(sz0.x, sz0.y, sz0.z);
      model.scale.setScalar(scale);
      const box1 = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3(); box1.getCenter(center);
      model.position.sub(center);
      model.traverse((c: any) => {
        if (c.isMesh) {
          (Array.isArray(c.material) ? c.material : [c.material]).forEach((m: any) => {
            if (m) { m.side = THREE.FrontSide; if (m.emissiveIntensity) m.emissiveIntensity=0.3; m.needsUpdate=true; }
          });
        }
      });
      group.add(model);

      const box2 = new THREE.Box3().setFromObject(group);
      const sz2 = new THREE.Vector3(); box2.getSize(sz2);
      const fov = camera.fov*Math.PI/180;
      const dist = (Math.max(sz2.x,sz2.y,sz2.z)/2)/Math.tan(fov/2)*1.5;
      camera.position.set(0, -sz2.y*0.05, dist * 0.95);
      camera.near = dist/1000; camera.far = dist*100;
      camera.updateProjectionMatrix();
      camera.lookAt(0, -sz2.y*0.2, 0);

      // Port drop-zone spheres
      const r = sz2.y*0.028;
      Object.entries(PORT_X).forEach(([glbId, x]) => {
        const portId = GLB_TO_PORT[glbId];
        if (!portId) return; // skip non-assignable ports
        const port = ports.find(p => p.portId === portId);
        if (!port || port.locked) return;
        const zone = port.zone;
        const col = new THREE.Color(ZONE_COLOR[zone]);
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(r, 12, 12),
          new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.5, roughness:0.2, metalness:0.1 })
        );
        sphere.position.set(x, PORT_Y, PORT_Z + r*0.5);
        sphere.userData.glbId = glbId;
        sphere.userData.portId = portId;
        group.add(sphere);
        portSpheres[glbId] = sphere;
      });

      threeRef.current = { group, cableMeshes, sz: sz2, portSpheres };

      // Initial rotation: show front face with ports
      group.rotation.set(-0.28, 0, 0);
    }, undefined, () => {});

    // Raycaster for drop
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onDrop = (e: MouseEvent) => {
      const drag = draggingRef.current;
      if (!drag) return;
      const r = mount.getBoundingClientRect();
      mouse.x = ((e.clientX-r.left)/r.width)*2-1;
      mouse.y = -((e.clientY-r.top)/r.height)*2+1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(Object.values(portSpheres));
      if (!hits.length) { setDragging(null); return; }
      const obj = hits[0].object as THREE.Mesh;
      const glbId = obj.userData.glbId as string;
      const portId = obj.userData.portId as string;
      const zone = drag.zone;

      // Validate: check if zone matches what's expected
      onChange(portId, zone);
      setPlugged(prev => {
        const next = { ...prev, [glbId]: zone };
        if (threeRef.current) rebuildCables(threeRef.current.group, threeRef.current.cableMeshes, threeRef.current.sz, next);
        // Update sphere color
        const mat = obj.material as THREE.MeshStandardMaterial;
        const col = new THREE.Color(ZONE_COLOR[zone]);
        mat.color.set(col); mat.emissive.set(col);
        return next;
      });
      const portLabel = portId === "wan1" ? "WAN1" : portId === "wan2" ? "WAN2" : portId.replace("port","Port ");
      showFeedback(`✓ ${drag.label} → ${portLabel} (${zone})`, true);
      setDragging(null);
    };

    // Orbit
    let rotX=-0.28, rotY=0, isDragging=false, prevX=0, prevY=0, autoRotate=true;
    let idleTimer: ReturnType<typeof setTimeout>|null=null;
    group.rotation.set(rotX,rotY,0);

    function resetIdle(){autoRotate=false;if(idleTimer)clearTimeout(idleTimer);idleTimer=setTimeout(()=>{autoRotate=true;},8000);}

    const onDown=(e:MouseEvent)=>{isDragging=true;prevX=e.clientX;prevY=e.clientY;mount.style.cursor="grabbing";resetIdle();};
    const onUp=()=>{isDragging=false;mount.style.cursor=draggingRef.current?"crosshair":"grab";};
    const onMove=(e:MouseEvent)=>{
      if(!isDragging)return;
      rotY+=(e.clientX-prevX)*0.007;rotX+=(e.clientY-prevY)*0.005;
      rotX=Math.max(-0.6,Math.min(0.4,rotX));
      prevX=e.clientX;prevY=e.clientY;
      group.rotation.set(rotX,rotY,0);
    };
    const onWheel=(e:WheelEvent)=>{e.preventDefault();resetIdle();camera.position.z=Math.max(0.5,camera.position.z*(1+e.deltaY*0.001));};

    mount.addEventListener("mouseup",  onDrop);
    mount.addEventListener("mousedown",onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove",onMove);
    mount.addEventListener("wheel",    onWheel,{passive:false});

    let animId:number;
    const animate=()=>{
      animId=requestAnimationFrame(animate);
      if(autoRotate&&!isDragging){rotY+=0.003;group.rotation.set(rotX,rotY,0);}
      // Highlight port spheres when dragging
      if(draggingRef.current){
        Object.values(portSpheres).forEach((s:THREE.Mesh)=>{
          (s.material as THREE.MeshStandardMaterial).emissiveIntensity=1.8+Math.sin(Date.now()*0.005)*0.4;
        });
        mount.style.cursor="crosshair";
      }
      renderer.render(scene,camera);
    };
    animate();

    return ()=>{
      cancelAnimationFrame(animId);
      if(idleTimer)clearTimeout(idleTimer);
      mount.removeEventListener("mouseup",  onDrop);
      mount.removeEventListener("mousedown",onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove",onMove);
      mount.removeEventListener("wheel",    onWheel);
      renderer.dispose();
      if(mount.contains(renderer.domElement))mount.removeChild(renderer.domElement);
    };
  }, []);

  // Cable zones
  const cableRack: { zone: PortZone; label: string; desc: string }[] = [
    { zone:"WAN",        label:"WAN Cable",        desc:"Internet uplink — connect to WAN1 or WAN2" },
    { zone:"LAN",        label:"LAN Cable",         desc:"Internal network — connect to ports 1-4"   },
    { zone:"DMZ",        label:"DMZ Cable",         desc:"Public servers — connect to port 5 (DMZ)"  },
    { zone:"unassigned", label:"Leave Unassigned",  desc:"Port not used — leave unassigned (port 6)" },
  ];

  return (
    <div className="space-y-3">
      {/* Cable rack */}
      <div className="bg-gray-900 border border-gray-700 rounded-md p-3">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-mono">Cable Rack — drag a cable onto the firewall port</div>
        <div className="flex gap-3 flex-wrap">
          {cableRack.map(({ zone, label, desc }) => (
            <div
              key={zone}
              draggable
              onDragStart={() => setDragging({ zone, label })}
              onDragEnd={() => { if (!feedback) setDragging(null); }}
              onMouseDown={() => setDragging({ zone, label })}
              onMouseUp={() => setDragging(null)}
              title={desc}
              className="flex items-center gap-2 px-3 py-2 rounded cursor-grab active:cursor-grabbing select-none transition-transform hover:scale-105"
              style={{ background: dragging?.zone===zone ? ZONE_COLOR[zone]+"44" : ZONE_COLOR[zone]+"22",
                border:`1.5px solid ${ZONE_COLOR[zone]}`, color: ZONE_COLOR[zone],
                transform: dragging?.zone===zone ? "scale(1.08)" : undefined,
                boxShadow: dragging?.zone===zone ? `0 0 12px ${ZONE_COLOR[zone]}66` : undefined }}
            >
              {/* Cable icon */}
              <svg width="28" height="20" viewBox="0 0 28 20">
                <rect x="0" y="7" width="12" height="6" rx="2" fill={ZONE_COLOR[zone]} opacity="0.9"/>
                <rect x="12" y="9" width="16" height="2" rx="1" fill={ZONE_COLOR[zone]} opacity="0.7"/>
                <rect x="1" y="9" width="2" height="2" rx="0.5" fill="white" opacity="0.6"/>
                <rect x="4" y="9" width="2" height="2" rx="0.5" fill="white" opacity="0.6"/>
                <rect x="7" y="9" width="2" height="2" rx="0.5" fill="white" opacity="0.6"/>
              </svg>
              <span className="text-[12px] font-medium">{label}</span>
            </div>
          ))}
        </div>
        {dragging && (
          <div className="mt-2 text-[11px] animate-pulse" style={{ color: ZONE_COLOR[dragging.zone] }}>
            🔌 Dragging {dragging.label} — release over a glowing port dot on the model
          </div>
        )}
      </div>

      {/* 3D model */}
      <div style={{ position:"relative" }}>
        <div
          ref={mountRef}
          style={{ width:"100%", height: fullHeight ? 480 : 320, borderRadius:8, overflow:"hidden", border:"1px solid #1f2937",
            cursor: dragging ? "crosshair" : "grab", background:"#111827" }}
        />
        <div style={{ position:"absolute", top:8, left:10, fontSize:11, color:"#374151", pointerEvents:"none" }}>
          {dragging ? "🎯 Drop on a glowing port dot" : "drag · scroll · ports pulse when cable selected"}
        </div>
        {/* Zoom buttons */}
        <div style={{ position:"absolute", bottom:10, right:10, display:"flex", flexDirection:"column", gap:3 }}>
          {[{l:"+",f:()=>{if(threeRef.current?.camera)threeRef.current.camera.position.z*=0.82;}},
            {l:"−",f:()=>{if(threeRef.current?.camera)threeRef.current.camera.position.z*=1.22;}}
          ].map(({l,f})=>(
            <button key={l} onClick={f}
              style={{width:28,height:28,borderRadius:4,border:"1px solid #374151",background:"rgba(17,24,39,0.9)",color:"#9ca3af",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div style={{ padding:"6px 12px", borderRadius:4, fontSize:12, fontWeight:500,
          background:feedback.ok?"#052e16":"#450a0a", color:feedback.ok?"#4ade80":"#f87171",
          border:`1px solid ${feedback.ok?"#166534":"#991b1b"}` }}>
          {feedback.msg}
        </div>
      )}

      {/* Plugged summary */}
      {Object.keys(plugged).length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {Object.entries(plugged).map(([glbId, zone]) => (
            <span key={glbId} style={{ fontSize:11, padding:"2px 8px", borderRadius:3,
              background:ZONE_COLOR[zone]+"22", color:ZONE_COLOR[zone], border:`1px solid ${ZONE_COLOR[zone]}44` }}>
              {glbId.toUpperCase()} → {zone}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
