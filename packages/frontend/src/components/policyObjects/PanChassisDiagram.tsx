import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export type PanPortZone = "Trust" | "Untrust" | "DMZ" | "HA" | "Management" | "unassigned";

export interface PanPortAssignment {
  id: string; // e.g., "ethernet1/1"
  zone: PanPortZone;
  label: string;
}

interface PanChassisDiagramProps {
  ports: PanPortAssignment[];
  onChange: (portId: string, zone: PanPortZone) => void;
  fullHeight?: boolean;
}

const ZONE_COLOR: Record<PanPortZone, string> = {
  Untrust: "#ef4444", 
  Trust: "#22c55e", 
  DMZ: "#f97316", 
  HA: "#3b82f6", 
  Management: "#7c3aed",
  unassigned: "#6b7280"
};

const PORT_METADATA = [
  { id: "ethernet1/1", x: -2.0, y: 0.2 },
  { id: "ethernet1/2", x: -1.5, y: 0.2 },
  { id: "ethernet1/3", x: -1.0, y: 0.2 },
  { id: "ethernet1/4", x: -0.5, y: 0.2 },
  { id: "ethernet1/5", x: 0.0, y: 0.2 },
  { id: "ethernet1/6", x: 0.5, y: 0.2 },
  { id: "ethernet1/7", x: 1.0, y: 0.2 },
  { id: "ethernet1/8", x: 1.5, y: 0.2 },
  { id: "management",  x: 2.2, y: 0.2 },
];

export function PanChassisDiagram({ ports, onChange, fullHeight }: PanChassisDiagramProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selZone, setSelZone] = useState<PanPortZone | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const w = mountRef.current.clientWidth;
    const h = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0d1117");

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 4, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // Chassis Base
    const chassisGeo = new THREE.BoxGeometry(7, 1.5, 4);
    const chassisMat = new THREE.MeshStandardMaterial({ color: "#22252a", roughness: 0.8 });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    scene.add(chassis);

    // Front Panel
    const panelGeo = new THREE.BoxGeometry(7.01, 1.4, 0.1);
    const panelMat = new THREE.MeshStandardMaterial({ color: "#111111", roughness: 0.9 });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.z = 2;
    scene.add(panel);

    // Create ports
    const portMeshes: THREE.Mesh[] = [];
    PORT_METADATA.forEach(pData => {
      const pGeo = new THREE.BoxGeometry(0.35, 0.35, 0.2);
      const pMat = new THREE.MeshStandardMaterial({ color: "#000000" });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.set(pData.x, pData.y, 2.05);
      pMesh.userData = { id: pData.id };
      scene.add(pMesh);
      portMeshes.push(pMesh);

      // Port LED
      const pAssignment = ports.find(p => p.id === pData.id);
      const ledColor = pAssignment ? ZONE_COLOR[pAssignment.zone] : ZONE_COLOR.unassigned;
      const ledGeo = new THREE.BoxGeometry(0.1, 0.05, 0.1);
      const ledMat = new THREE.MeshBasicMaterial({ color: ledColor });
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.set(pData.x - 0.1, pData.y + 0.25, 2.1);
      scene.add(led);
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(portMeshes);
      if (hits.length > 0) {
        const pId = hits[0].object.userData.id;
        // In a real app we might use the selected zone here to trigger onChange.
        console.log("Clicked port", pId);
      }
    };
    renderer.domElement.addEventListener("click", onClick);

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!mountRef.current) return;
      const nw = mountRef.current.clientWidth;
      const nh = mountRef.current.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("click", onClick);
      if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [ports, selZone]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: fullHeight ? "100%" : 500, background: "#0d1117", borderRadius: 8, overflow: "hidden", position: "relative" }}>
      <div ref={mountRef} style={{ flex: 1, minHeight: 0 }} />
      {/* HUD overlays could go here */}
    </div>
  );
}
