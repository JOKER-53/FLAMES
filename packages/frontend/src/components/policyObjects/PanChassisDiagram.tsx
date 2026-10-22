import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment";

export type PanPortZone = "Trust" | "Untrust" | "DMZ" | "HA" | "Management" | "unassigned";

export interface PanPortAssignment {
  id: string;
  zone: PanPortZone;
  label: string;
}

interface Props {
  ports: PanPortAssignment[];
  onChange: (portId: string, zone: PanPortZone) => void;
  fullHeight?: boolean;
  referenceMode?: boolean;
}

export const ZONE_COLORS: Record<PanPortZone, string> = {
  Untrust:    "#ef4444",
  Trust:      "#22c55e",
  DMZ:        "#f97316",
  HA:         "#3b82f6",
  Management: "#a855f7",
  unassigned: "#64748b"
};

const PORT_LOCATIONS: Record<string, { x: number; y: number; name: string; desc: string }> = {
  "ethernet1/1": {
    x: -0.330,
    y: 0.050,
    name: "Ethernet 1/1 (WAN / Untrust)",
    desc: "10/100/1000 RJ-45 copper port (top row, col 1). Primary external gateway interface for Untrust zone."
  },
  "ethernet1/2": {
    x: -0.330,
    y: -0.095,
    name: "Ethernet 1/2 (LAN / Trust)",
    desc: "10/100/1000 RJ-45 copper port (bottom row, col 1). Internal campus and workstation LAN for Trust zone."
  },
  "ethernet1/3": {
    x: -0.260,
    y: 0.050,
    name: "Ethernet 1/3 (DMZ)",
    desc: "10/100/1000 RJ-45 copper port (top row, col 2). Isolated DMZ segment for public web and application servers."
  },
  "ethernet1/4": {
    x: -0.260,
    y: -0.095,
    name: "Ethernet 1/4 (HA1 Control)",
    desc: "10/100/1000 RJ-45 copper port (bottom row, col 2). High availability heartbeat and configuration synchronization."
  },
  "ethernet1/5": {
    x: -0.190,
    y: 0.050,
    name: "Ethernet 1/5 (HA2 Data)",
    desc: "10/100/1000 RJ-45 copper port (top row, col 3). High availability live session state replication."
  },
  "ethernet1/6": {
    x: -0.190,
    y: -0.095,
    name: "Ethernet 1/6",
    desc: "10/100/1000 RJ-45 copper port (bottom row, col 3). General purpose data interface or guest network."
  },
  "ethernet1/7": {
    x: -0.120,
    y: 0.050,
    name: "Ethernet 1/7",
    desc: "10/100/1000 RJ-45 copper port (top row, col 4). General purpose data interface."
  },
  "ethernet1/8": {
    x: -0.120,
    y: -0.095,
    name: "Ethernet 1/8",
    desc: "10/100/1000 RJ-45 copper port (bottom row, col 4). General purpose data interface."
  },
  "management": {
    x: -0.050,
    y: 0.050,
    name: "MGT (Management)",
    desc: "Dedicated out-of-band management interface. Isolated from production data-plane traffic."
  }
};

const DEFAULT_INFO = {
  title: "PA-220 Next-Generation Firewall",
  body: "Palo Alto Networks PA-220 enterprise desktop firewall. Select a zone, then click any port socket to plug in a physical cable or reassign it."
};

function disposeMesh(obj: THREE.Object3D) {
  if (obj instanceof THREE.Mesh) {
    obj.geometry.dispose();
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m) => m.dispose());
  }
}

export function PanChassisDiagram({ ports, onChange, fullHeight, referenceMode = false }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sceneRef = useRef<{
    camera: THREE.PerspectiveCamera;
    group: THREE.Group;
    indicators: Record<string, THREE.Mesh>;
    hitTargets: Record<string, THREE.Mesh>;
    cables: Record<string, THREE.Object3D>;
    floorItems: THREE.Object3D[];
    sz: THREE.Vector3;
    frontZ: number;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadMsg, setLoadMsg] = useState("Loading PA-220 3D model…");
  const [zone, setZone] = useState<PanPortZone>("Trust");
  const [selected, setSelected] = useState(DEFAULT_INFO);

  const zoneRef = useRef(zone);
  const portsRef = useRef(ports);
  const changeRef = useRef(onChange);
  useEffect(() => { zoneRef.current = zone; }, [zone]);
  useEffect(() => { portsRef.current = ports; }, [ports]);
  useEffect(() => { changeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth || 800;
    const h = mount.clientHeight || (fullHeight ? 560 : 440);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(42, w / h, 0.01, 10000);
    camera.position.set(4, 5, 11);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.96;

    // Enable soft dynamic directional shadow maps
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    // Realistic IBL Studio Environment from RoomEnvironment (Google model-viewer environment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = referenceMode;
    controls.autoRotateSpeed = 0.45;
    controls.enablePan = false;

    renderer.domElement.addEventListener("pointerdown", () => {
      controls.autoRotate = false;
    }, { once: true });

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
    const cables: Record<string, THREE.Object3D> = {};
    const floorItems: THREE.Object3D[] = [];

    sceneRef.current = {
      camera,
      group,
      indicators,
      hitTargets,
      cables,
      floorItems,
      sz: new THREE.Vector3(8, 1.5, 6),
      frontZ: 3
    };

    let disposed = false;
    const loader = new GLTFLoader();

    loader.load(
      "/pa-220-firewall.glb",
      (gltf) => {
        if (disposed) return;
        const model = gltf.scene;

        // Auto-scale to fill 8-unit frame
        const b0 = new THREE.Box3().setFromObject(model);
        const s0 = new THREE.Vector3();
        b0.getSize(s0);
        model.scale.setScalar(8 / Math.max(s0.x, s0.y, s0.z));

        // Center model
        const b1 = new THREE.Box3().setFromObject(model);
        const c1 = new THREE.Vector3();
        b1.getCenter(c1);
        model.position.sub(c1);

        model.traverse((child: any) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((m: any) => {
              if (m) {
                m.side = THREE.DoubleSide;
                m.needsUpdate = true;
              }
            });
          }
        });

        group.add(model);

        const b2 = new THREE.Box3().setFromObject(group);
        const sz = new THREE.Vector3();
        b2.getSize(sz);
        const frontZ = b2.max.z;
        const floorY = -sz.y * 0.5;

        if (sceneRef.current) {
          sceneRef.current.sz = sz;
          sceneRef.current.frontZ = frontZ;
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

        // Camera fit — 3/4 Elevated Product Showcase (matching model-viewer)
        const fov = (camera.fov * Math.PI) / 180;
        const dist = ((Math.max(sz.x, sz.y, sz.z) / 2) / Math.tan(fov / 2)) * 1.55;
        camera.position.set(dist * 0.32, dist * 0.40, dist * 0.85);
        controls.target.set(0, -sz.y * 0.08, 0);
        camera.near = dist / 1000;
        camera.far = dist * 100;
        camera.updateProjectionMatrix();
        controls.update();

        // Socket markers
        const visR = Math.max(sz.y * 0.024, 0.052);
        const hitR = visR * 2.8;

        Object.entries(PORT_LOCATIONS).forEach(([id, loc]) => {
          const wx = loc.x * sz.x;
          const wy = loc.y * sz.y;
          const wz = frontZ + visR * 0.6;

          // Subtle glowing socket indicator ring/dot
          const visMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color("#0284c7"),
            emissive: new THREE.Color("#0284c7"),
            emissiveIntensity: 1.8,
            roughness: 0.2,
            metalness: 0.1
          });
          const vis = new THREE.Mesh(new THREE.SphereGeometry(visR, 16, 16), visMat);
          vis.position.set(wx, wy, wz);
          vis.userData = { id, name: loc.name, desc: loc.desc };
          group.add(vis);
          indicators[id] = vis;

          // Invisible larger click target
          const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
          const hit = new THREE.Mesh(new THREE.SphereGeometry(hitR, 8, 8), hitMat);
          hit.position.set(wx, wy, wz);
          hit.userData = { id, name: loc.name, desc: loc.desc };
          group.add(hit);
          hitTargets[id] = hit;
        });

        setLoading(false);
      },
      (xhr) => {
        if (xhr.loaded > 0) {
          setLoadMsg(`Loading PA-220 3D — ${(xhr.loaded / 1_048_576).toFixed(1)} MB…`);
        }
      },
      (err) => {
        console.warn("Failed to load /pa-220-firewall.glb in PanChassisDiagram:", err);
        setLoadMsg("⚠ Could not load pa-220-firewall.glb");
      }
    );

    // Raycaster for interactive clicking
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePortClick = (portId: string) => {
      const loc = PORT_LOCATIONS[portId];
      if (!loc) return;

      const currentAssign = portsRef.current.find(p => p.id === portId);
      const chosenZone = zoneRef.current;

      setSelected({
        title: loc.name,
        body: `${loc.desc}\n\nAssigned Zone: ${chosenZone}`
      });

      if (!referenceMode && chosenZone) {
        // Toggle if clicked with same zone
        const nextZone = currentAssign?.zone === chosenZone ? "unassigned" : chosenZone;
        changeRef.current(portId, nextZone);
      }
    };

    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const targetList = Object.values(hitTargets);
      const hits = raycaster.intersectObjects(targetList);

      if (hits.length > 0) {
        const portId = hits[0].object.userData.id as string;
        if (portId) {
          handlePortClick(portId);
          return;
        }
      }

      // Snap-to-nearest port if clicking anywhere on the front panel
      const allHits = raycaster.intersectObjects(group.children, true);
      if (allHits.length > 0 && sceneRef.current) {
        const hp = allHits[0].point;
        let nearest: string | null = null;
        let nearestD = Infinity;

        Object.entries(indicators).forEach(([pid, mesh]) => {
          const d = Math.hypot(hp.x - mesh.position.x, hp.y - mesh.position.y);
          if (d < nearestD) {
            nearestD = d;
            nearest = pid;
          }
        });

        const snapTolerance = sceneRef.current.sz.x * 0.085;
        if (nearest && nearestD < snapTolerance) {
          handlePortClick(nearest);
        }
      }
    };

    const onHover = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const hits = raycaster.intersectObjects(Object.values(hitTargets));
      renderer.domElement.style.cursor = hits.length > 0 ? "pointer" : "grab";
    };

    renderer.domElement.addEventListener("click", onClick);
    renderer.domElement.addEventListener("mousemove", onHover);

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const nw = mount.clientWidth;
      const nh = mount.clientHeight;
      if (!nw || !nh) return;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.domElement.removeEventListener("mousemove", onHover);
      controls.dispose();
      renderer.dispose();
      if (envTexture) envTexture.dispose();
      floorItems.forEach(item => {
        scene.remove(item);
        disposeMesh(item);
      });
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [referenceMode, fullHeight]);

  // Synchronize 3D Physical Cables and Socket Indicators with `ports` state
  useEffect(() => {
    const sr = sceneRef.current;
    if (!sr) return;
    const { group, indicators, hitTargets, cables, sz } = sr;

    // Dispose old cables
    Object.values(cables).forEach((c) => {
      group.remove(c);
      disposeMesh(c);
    });
    Object.keys(cables).forEach((k) => delete cables[k]);

    // Update socket indicator visibility & colors
    ports.forEach((p) => {
      const ind = indicators[p.id];
      const hit = hitTargets[p.id];
      if (!ind || !hit) return;

      const isUnassigned = p.zone === "unassigned";
      // Hide glowing socket dot when a physical cable is plugged in
      ind.visible = isUnassigned;
      hit.visible = true;

      if (isUnassigned) {
        const mat = ind.material as THREE.MeshStandardMaterial;
        mat.color.set("#0284c7");
        mat.emissive.set("#0284c7");
        mat.emissiveIntensity = 1.2;
        return;
      }

      // BUILD PHYSICAL 3D CABLE IN PORT HOLE
      const sp = ind.position.clone();
      const col = new THREE.Color(ZONE_COLORS[p.zone]);
      const pw = sz.y * 0.16;
      const ph = sz.y * 0.14;
      const pd = sz.y * 0.22;

      const cMat = new THREE.MeshStandardMaterial({
        color: col,
        roughness: 0.45,
        metalness: 0.2
      });

      // 1. RJ-45 Connector Plug Body
      const plug = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, pd), cMat);
      plug.position.set(sp.x, sp.y, sp.z + pd * 0.4);
      group.add(plug);
      cables[p.id + "_plug"] = plug;

      // 2. RJ-45 Latch Tab
      const latch = new THREE.Mesh(
        new THREE.BoxGeometry(pw * 0.4, ph * 0.10, pd * 0.45),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.2, metalness: 0.5 })
      );
      latch.position.set(sp.x, sp.y - ph * 0.55, sp.z + pd * 0.28);
      group.add(latch);
      cables[p.id + "_latch"] = latch;

      // 3. Gold Contact Pins (8)
      const pinMat = new THREE.MeshStandardMaterial({
        color: 0xd4a017,
        roughness: 0.15,
        metalness: 0.95
      });
      for (let i = 0; i < 8; i++) {
        const pin = new THREE.Mesh(
          new THREE.BoxGeometry(pw * 0.055, ph * 0.32, pd * 0.07),
          pinMat
        );
        pin.position.set(sp.x + (i - 3.5) * pw * 0.10, sp.y + ph * 0.09, sp.z + pd * 0.44);
        group.add(pin);
        cables[`${p.id}_pin${i}`] = pin;
      }

      // 4. Strain-Relief Boot
      const boot = new THREE.Mesh(
        new THREE.CylinderGeometry(sz.y * 0.038, sz.y * 0.029, sz.y * 0.085, 12),
        cMat
      );
      boot.rotation.x = Math.PI / 2;
      boot.position.set(sp.x, sp.y, sp.z + pd * 0.78);
      group.add(boot);
      cables[p.id + "_boot"] = boot;

      // 5. Curved Drooping Cable Tail
      const cr = sz.y * 0.015;
      const tailZ = sp.z + pd * 0.9;
      const seed = [...p.id].reduce((s, c) => s + c.charCodeAt(0), 0);
      const bend = ((seed % 7) - 3) * sz.y * 0.010;

      const pts = [
        new THREE.Vector3(sp.x, sp.y, tailZ),
        new THREE.Vector3(sp.x + bend * 0.3, sp.y - sz.y * 0.12, tailZ + sz.z * 0.03),
        new THREE.Vector3(sp.x + bend * 0.7, sp.y - sz.y * 0.32, tailZ + sz.z * 0.07),
        new THREE.Vector3(sp.x + bend, sp.y - sz.y * 0.55, tailZ + sz.z * 0.10),
        new THREE.Vector3(sp.x + bend * 0.8, sp.y - sz.y * 0.80, tailZ + sz.z * 0.11),
      ];
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5), 28, cr, 10, false),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.65, metalness: 0.05 })
      );
      group.add(tube);
      cables[p.id + "_tube"] = tube;
    });
  }, [ports]);

  const zoom = (factor: number) => {
    controlsRef.current?.object.position.multiplyScalar(factor);
  };

  const reset = () => {
    if (controlsRef.current && sceneRef.current) {
      const { sz, camera } = sceneRef.current;
      const fov = (camera.fov * Math.PI) / 180;
      const dist = ((Math.max(sz.x, sz.y, sz.z) / 2) / Math.tan(fov / 2)) * 1.55;
      camera.position.set(dist * 0.32, dist * 0.40, dist * 0.85);
      controlsRef.current.target.set(0, -sz.y * 0.08, 0);
      controlsRef.current.autoRotate = referenceMode;
      controlsRef.current.update();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: fullHeight ? "100%" : 540, minHeight: 440, gap: 8 }}>
      <div style={{ position: "relative", flex: 1, minHeight: 340, borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0", background: "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

        {/* Loading Overlay */}
        {loading && (
          <div style={{
            position: "absolute", inset: 0, background: "#ffffffee", backdropFilter: "blur(4px)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#475569"
          }}>
            <div style={{ width: 32, height: 32, border: "3px solid #cbd5e1", borderTopColor: "#fa4616", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <div style={{ fontSize: 13, fontWeight: 500, color: "#475569" }}>{loadMsg}</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        <div style={{ position: "absolute", top: 10, left: 12, color: "#64748b", fontSize: 11, pointerEvents: "none", fontWeight: 500 }}>
          🖱 Drag to rotate · Scroll to zoom · Click socket to plug cable
        </div>

        <div style={{ position: "absolute", right: 12, bottom: 12, display: "flex", flexDirection: "column", gap: 4 }}>
          {[
            { l: "+", f: () => zoom(0.82), t: "Zoom in" },
            { l: "−", f: () => zoom(1.22), t: "Zoom out" },
            { l: "⟳", f: reset, t: "Reset view" }
          ].map(x => (
            <button
              key={x.l}
              onClick={x.f}
              title={x.t}
              style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid #cbd5e1", background: "#ffffffee", color: "#334155", cursor: "pointer", fontSize: 16, boxShadow: "0 1px 2px rgba(0,0,0,0.08)" }}
            >
              {x.l}
            </button>
          ))}
        </div>
      </div>

      {!referenceMode && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#64748b", marginRight: 4, fontWeight: 500 }}>
            Select active cable zone:
          </span>
          {(["Trust", "Untrust", "DMZ", "HA", "Management", "unassigned"] as PanPortZone[]).map(z => (
            <button
              key={z}
              onClick={() => setZone(z)}
              style={{
                padding: "4px 10px",
                fontSize: 11,
                borderRadius: 14,
                cursor: "pointer",
                fontWeight: zone === z ? 600 : 500,
                border: `1.5px solid ${zone === z ? ZONE_COLORS[z] : "#cbd5e1"}`,
                background: zone === z ? `${ZONE_COLORS[z]}22` : "#ffffff",
                color: zone === z ? ZONE_COLORS[z] : "#64748b",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
              }}
            >
              {z === "unassigned" ? "Unplug (Empty)" : `${z} Cable`}
            </button>
          ))}
        </div>
      )}

      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 7, padding: "10px 14px", minHeight: 60, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 3 }}>
          {selected.title}
        </div>
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, whiteSpace: "pre-line" }}>
          {selected.body}
        </div>
      </div>
    </div>
  );
}
