import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { PanSession } from "../../hooks/usePanSession";

export function PanDashboard({ session: _session }: { session: PanSession }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const [loading, setLoading] = useState(true);
  const [debugMsg, setDebugMsg] = useState("Loading 3D model...");
  const [selectedPart, setSelectedPart] = useState<{ title: string; desc: string }>({
    title: "PA-220 Next-Generation Firewall",
    desc: "Compact desktop form-factor enterprise firewall featuring Palo Alto Networks PAN-OS architecture with dedicated management, console, high availability, and 8 GbE data interfaces."
  });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth || 900;
    const h = mount.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1117);

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.0001, 100000);
    camera.position.set(0, 5, 12);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.6;

    const stopAutoRotate = () => { controls.autoRotate = false; };
    renderer.domElement.addEventListener("pointerdown", stopAutoRotate, { once: true });

    scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const d1 = new THREE.DirectionalLight(0xffffff, 1.2); d1.position.set(5, 10, 10); scene.add(d1);
    const d2 = new THREE.DirectionalLight(0xffffff, 0.9); d2.position.set(-5, 5, 10); scene.add(d2);
    const d3 = new THREE.DirectionalLight(0xffffff, 0.6); d3.position.set(0, -5, 10); scene.add(d3);
    const d4 = new THREE.DirectionalLight(0xffffff, 0.5); d4.position.set(0, 5, -10); scene.add(d4);

    const group = new THREE.Group();
    scene.add(group);

    let disposed = false;
    const loader = new GLTFLoader();

    setDebugMsg("Loading PA-220 3D Model...");
    loader.load(
      "/pa-220-firewall.glb",
      (gltf) => {
        if (disposed) return;
        const model = gltf.scene;

        // Auto-scale to fill viewport nicely
        const box0 = new THREE.Box3().setFromObject(model);
        const size0 = new THREE.Vector3();
        box0.getSize(size0);
        const scale = 8 / Math.max(size0.x, size0.y, size0.z);
        model.scale.setScalar(scale);

        // Center model
        const box1 = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        box1.getCenter(center);
        model.position.sub(center);

        // Tweak materials for visibility
        model.traverse((c: any) => {
          if (c.isMesh) {
            const mats = Array.isArray(c.material) ? c.material : [c.material];
            mats.forEach((m: any) => {
              if (m) {
                m.side = THREE.DoubleSide;
                if (m.emissiveIntensity) m.emissiveIntensity = 0.3;
                m.needsUpdate = true;
              }
            });
          }
        });

        group.add(model);

        // Adjust camera to fit model
        const box2 = new THREE.Box3().setFromObject(group);
        const sz = new THREE.Vector3();
        box2.getSize(sz);
        const fov = (camera.fov * Math.PI) / 180;
        const dist = ((Math.max(sz.x, sz.y, sz.z) / 2) / Math.tan(fov / 2)) * 1.6;
        camera.position.set(0, -sz.y * 0.08, dist * 0.78);
        camera.near = dist / 1000;
        camera.far = dist * 100;
        camera.updateProjectionMatrix();

        setLoading(false);
      },
      (xhr) => {
        if (xhr.loaded > 0) {
          const mb = (xhr.loaded / (1024 * 1024)).toFixed(1);
          setDebugMsg(`Loading PA-220 model — ${mb} MB received...`);
        }
      },
      (_err) => {
        setDebugMsg(
          "⚠ GLB not found. Run this in your project root, then restart the frontend:\n\n  node copy-glb.mjs\n  npm run frontend:dev"
        );
      }
    );

    let animationId = 0;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
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
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointerdown", stopAutoRotate);
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  const zoom = (factor: number) => {
    controlsRef.current?.object.position.multiplyScalar(factor);
  };

  const resetView = () => {
    if (controlsRef.current) {
      controlsRef.current.object.position.set(0, 5, 12);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.autoRotate = true;
      controlsRef.current.update();
    }
  };

  return (
    <div style={{ width: "100%", height: "calc(100vh - 84px)", display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Title Header */}
      <div style={{ flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", margin: "0 0 2px" }}>
              Palo Alto PA-220 — 3D Hardware Reference
            </h1>
            <span
              style={{
                fontSize: 10,
                padding: "2px 6px",
                borderRadius: 4,
                background: "#dcfce7",
                color: "#15803d",
                fontWeight: 600
              }}
            >
              pa-220-firewall.glb
            </span>
          </div>
          <p style={{ color: "#64748b", fontSize: 12, margin: 0 }}>
            Official 3D PA-220 GLB Mesh · Drag to rotate · Scroll to zoom · Inspect physical layout
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { label: "Overview", desc: "Compact desktop form-factor enterprise firewall featuring Palo Alto Networks PAN-OS architecture with dedicated management, console, high availability, and 8 GbE data interfaces." },
            { label: "Data Ports (1-8)", desc: "Eight 10/100/1000 Mbps RJ-45 copper Gigabit Ethernet interfaces for data plane traffic. Supports Layer 2, Layer 3, Virtual Wire, and Tap modes." },
            { label: "Management & HA", desc: "Dedicated out-of-band 10/100/1000 RJ-45 MGT port, serial RJ-45 & micro-USB console ports, USB 3.0 port, and High Availability synchronization links." }
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => setSelectedPart({ title: `PA-220 — ${item.label}`, desc: item.desc })}
              style={{
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 4,
                border: "1px solid #cbd5e1",
                background: selectedPart.title.includes(item.label) ? "#fa4616" : "#ffffff",
                color: selectedPart.title.includes(item.label) ? "#ffffff" : "#475569",
                cursor: "pointer",
                fontWeight: 500
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3D Viewport */}
      <div
        style={{
          position: "relative",
          flex: 1,
          minHeight: 380,
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid #1e2d45",
          background: "#0d1117"
        }}
      >
        <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

        {/* Loading overlay */}
        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "#0d1117ee",
              color: "#94a3b8",
              fontSize: 13,
              gap: 10,
              padding: 32,
              textAlign: "center",
              whiteSpace: "pre-line"
            }}
          >
            <span style={{ fontSize: 22 }}>⚙</span>
            <span>{debugMsg}</span>
          </div>
        )}

        {/* Top-left instruction watermark */}
        <div style={{ position: "absolute", top: 12, left: 14, color: "#64748b", fontSize: 11, pointerEvents: "none" }}>
          🖱 Drag to rotate · Scroll to zoom · Click buttons for specs
        </div>

        {/* Zoom & View Controls */}
        <div style={{ position: "absolute", right: 12, bottom: 12, display: "flex", flexDirection: "column", gap: 5 }}>
          <button
            onClick={() => zoom(0.8)}
            style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid #334155", background: "#0b111bdd", color: "#cbd5e1", cursor: "pointer", fontSize: 16 }}
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={() => zoom(1.25)}
            style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid #334155", background: "#0b111bdd", color: "#cbd5e1", cursor: "pointer", fontSize: 16 }}
            title="Zoom Out"
          >
            −
          </button>
          <button
            onClick={resetView}
            style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid #334155", background: "#0b111bdd", color: "#cbd5e1", cursor: "pointer", fontSize: 15 }}
            title="Reset View"
          >
            ⟳
          </button>
        </div>
      </div>

      {/* Selected Component Information Banner */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 6,
          padding: "10px 14px",
          minHeight: 58,
          flexShrink: 0
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 3 }}>
          {selectedPart.title}
        </div>
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
          {selectedPart.desc}
        </div>
      </div>
    </div>
  );
}
