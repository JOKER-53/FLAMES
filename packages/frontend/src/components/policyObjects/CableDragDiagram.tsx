// ============================================================================
// Cable assignment exercise for the Port Assignment track.
// Pick a cable (zone), then click a socket on the model or use the port list.
// The parent's `ports` array is the only source of truth: cables on the model
// are redrawn from it, so switching scenarios never leaves stale cables behind.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import type { PortZone, PortAssignment } from "./ChassisDiagram";
import { PORTS, PORT_Y, SOCKET_WIDTH, EXERCISE_SOCKETS } from "../../hardware/cables";
import { buildCable, disposeObject, fitFortiGateModel, fortiGateSocket, labelSprite } from "../../hardware/cableMesh";

interface CableDragDiagramProps {
  ports: PortAssignment[];
  onChange: (portId: string, zone: PortZone) => void;
  fullHeight?: boolean;
}

const ZONE_COLOR: Record<PortZone, string> = {
  WAN: "#f97316", LAN: "#22c55e", DMZ: "#3b82f6", unassigned: "#6b7280",
};
const IDLE_DOT = "#94a3b8";

const CABLE_OPTIONS: { zone: PortZone; label: string; desc: string }[] = [
  { zone: "WAN",        label: "WAN Cable",        desc: "Internet-facing uplink" },
  { zone: "LAN",        label: "LAN Cable",        desc: "Internal trusted network" },
  { zone: "DMZ",        label: "DMZ Cable",        desc: "Public-facing servers" },
  { zone: "unassigned", label: "Unplug",           desc: "Leave the port unused" },
];

function portName(port: PortAssignment) {
  return /^W\d$/.test(port.label) ? `WAN${port.label.slice(1)}` : `Port ${port.label}`;
}

function socketLabel(portId: string) {
  const socket = PORTS.find(p => p.id === EXERCISE_SOCKETS[portId]);
  return socket ? socket.label : "list only";
}

interface SceneState {
  camera: THREE.PerspectiveCamera;
  group: THREE.Group;
  cables: THREE.Group;
  dots: Record<string, THREE.Mesh>;   // exercise portId → indicator
  labels: THREE.Group;
  size: THREE.Vector3;
  baseDistance: number;
}

export function CableDragDiagram({ ports, onChange, fullHeight }: CableDragDiagramProps) {
  const mountRef  = useRef<HTMLDivElement>(null);
  const sceneRef  = useRef<SceneState | null>(null);
  const [ready,    setReady]    = useState(false);
  const [loadErr,  setLoadErr]  = useState<string | null>(null);
  const [selZone,  setSelZone]  = useState<PortZone | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const selZoneRef  = useRef<PortZone | null>(null);
  const portsRef    = useRef(ports);
  const onChangeRef = useRef(onChange);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const height = fullHeight ? 440 : 320;

  useEffect(() => { selZoneRef.current = selZone; }, [selZone]);
  useEffect(() => { portsRef.current = ports; }, [ports]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current); }, []);

  function showFeedback(msg: string, ok: boolean) {
    setFeedback({ msg, ok });
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 2500);
  }

  function assign(portId: string, zone: PortZone) {
    const port = portsRef.current.find(p => p.portId === portId);
    if (!port || port.locked) return;
    onChangeRef.current(portId, zone);
    showFeedback(zone === "unassigned" ? `Unplugged ${portName(port)}.` : `✓ ${zone} cable → ${portName(port)}`, true);
  }

  // Scene setup runs once; everything that changes is read through refs.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); }
    catch { setLoadErr("3D rendering is unavailable. Use the port list below."); return; }
    const W = mount.clientWidth || 700;
    renderer.setSize(W, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111827);
    const camera = new THREE.PerspectiveCamera(35, W / height, 0.01, 200);
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    [[3, 8, 10, 0.9], [-4, 4, 8, 0.7], [0, -4, 8, 0.4]].forEach(([x, y, z, i]) => {
      const light = new THREE.DirectionalLight(0xffffff, i);
      light.position.set(x, y, z); scene.add(light);
    });

    const group = new THREE.Group();
    // Positive X tilt shows the front panel from slightly above, never the underside.
    const view = { rotX: 0.32, rotY: 0 };
    group.rotation.set(view.rotX, view.rotY, 0);
    scene.add(group);

    let disposed = false;
    new GLTFLoader().load("/firewall.glb", gltf => {
      if (disposed) { disposeObject(gltf.scene); return; }
      const model = gltf.scene;
      const size = fitFortiGateModel(model);
      group.add(model);
      const cables = new THREE.Group(); group.add(cables);
      const labels = new THREE.Group(); group.add(labels);
      // Fit the front panel's width; it sits size.z/2 in front of the origin.
      const dist = (size.x / 2) * 1.08 / (Math.tan((camera.fov * Math.PI / 180) / 2) * camera.aspect) + size.z / 2;
      camera.position.set(0, 0, dist);
      camera.lookAt(0, 0, 0);
      sceneRef.current = { camera, group, cables, dots: {}, labels, size, baseDistance: dist };
      setReady(true);
    }, undefined, () => { if (!disposed) setLoadErr("Could not load the FortiGate model. Use the port list below."); });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let down: { x: number; y: number } | null = null, dragged = false, prev = { x: 0, y: 0 };

    const pick = (e: PointerEvent) => {
      const s = sceneRef.current; if (!s) return null;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(Object.values(s.dots))[0];
      return hit ? hit.object.userData.portId as string : null;
    };
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; prev = { ...down }; dragged = false; };
    const onMove = (e: PointerEvent) => {
      if (down) {
        if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) dragged = true;
        if (dragged) {
          view.rotY = Math.max(-0.9, Math.min(0.9, view.rotY + (e.clientX - prev.x) * 0.006));
          view.rotX = Math.max(-0.1, Math.min(0.9, view.rotX + (e.clientY - prev.y) * 0.005));
          group.rotation.set(view.rotX, view.rotY, 0);
        }
        prev = { x: e.clientX, y: e.clientY };
      }
      renderer.domElement.style.cursor = pick(e) ? "pointer" : dragged ? "grabbing" : "grab";
    };
    const onUp = (e: PointerEvent) => {
      const wasClick = down && !dragged;
      down = null;
      if (!wasClick) return;
      const portId = pick(e);
      if (!portId) return;
      const zone = selZoneRef.current;
      const current = portsRef.current.find(p => p.portId === portId);
      if (zone) assign(portId, zone);
      else if (current && current.zone !== "unassigned") assign(portId, "unassigned");
      else showFeedback("Select a cable type first.", false);
    };
    const onWheel = (e: WheelEvent) => {
      const s = sceneRef.current; if (!s) return;
      e.preventDefault();
      camera.position.z = Math.min(s.baseDistance * 1.8, Math.max(s.baseDistance * 0.35, camera.position.z * (1 + Math.sign(e.deltaY) * 0.1)));
    };
    const canvas = renderer.domElement;
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    const resize = new ResizeObserver(() => {
      const w = mount.clientWidth; if (!w) return;
      renderer.setSize(w, height); camera.aspect = w / height; camera.updateProjectionMatrix();
    });
    resize.observe(mount);

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const s = sceneRef.current;
      if (s) {
        const zone = selZoneRef.current;
        const pulse = 0.65 + Math.sin(Date.now() * 0.006) * 0.35;
        for (const [portId, dot] of Object.entries(s.dots)) {
          const material = dot.material as THREE.MeshBasicMaterial;
          const assigned = portsRef.current.find(p => p.portId === portId)?.zone ?? "unassigned";
          // Empty sockets pulse in the selected cable's colour so targets are obvious.
          if (assigned === "unassigned") {
            const active = zone && zone !== "unassigned";
            material.color.set(active ? ZONE_COLOR[zone] : IDLE_DOT);
            material.opacity = active ? pulse : 0.7;
          }
        }
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("wheel", onWheel);
      disposeObject(group);
      sceneRef.current = null;
      renderer.dispose();
      if (mount.contains(canvas)) mount.removeChild(canvas);
    };
  }, [height]);

  // Redraw indicators, labels, and cables from the parent's port assignments.
  useEffect(() => {
    const s = sceneRef.current;
    if (!s || !ready) return;
    for (const child of [...s.cables.children, ...s.labels.children, ...Object.values(s.dots)]) {
      child.parent?.remove(child); disposeObject(child);
    }
    s.dots = {};
    const unit = SOCKET_WIDTH * s.size.x;
    for (const port of ports) {
      const socket = PORTS.find(p => p.id === EXERCISE_SOCKETS[port.portId]);
      if (!socket) continue;
      const at = fortiGateSocket(socket.x, PORT_Y, s.size);
      const label = labelSprite(port.label, unit * 0.9);
      label.position.set(at.x, at.y + unit * 1.05, at.z + unit * 0.3);
      s.labels.add(label);
      if (port.zone !== "unassigned") {
        const cable = buildCable(at, unit, ZONE_COLOR[port.zone], "rj45", [...port.portId].reduce((n, c) => n + c.charCodeAt(0), 0));
        s.cables.add(cable);
      }
      if (port.locked) continue;
      const color = port.zone === "unassigned" ? IDLE_DOT : ZONE_COLOR[port.zone];
      // Assigned sockets keep a small hit target in front of the plug so they can be unplugged.
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(unit * (port.zone === "unassigned" ? 0.24 : 0.2), 16, 16),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
      );
      dot.position.set(at.x, at.y, at.z + (port.zone === "unassigned" ? unit * 0.2 : unit * 1.9));
      dot.userData.portId = port.portId;
      s.group.add(dot);
      s.dots[port.portId] = dot;
    }
  }, [ports, ready]);

  function zoom(factor: number) {
    const s = sceneRef.current; if (!s) return;
    s.camera.position.z = Math.min(s.baseDistance * 1.8, Math.max(s.baseDistance * 0.35, s.camera.position.z * factor));
  }
  function resetView() {
    const s = sceneRef.current; if (!s) return;
    s.camera.position.set(0, 0, s.baseDistance);
    s.group.rotation.set(0.32, 0, 0);
  }

  const assignable = ports.filter(p => !p.locked);
  const connected = assignable.filter(p => p.zone !== "unassigned").length;

  return (
    <div className="space-y-3">
      {/* Cable selector */}
      <div className="bg-gray-900 border border-gray-700 rounded-md p-3">
        <div className="text-[10px] text-faint uppercase tracking-wider mb-2 font-mono">
          1. Pick a cable &nbsp;→&nbsp; 2. Click a labelled socket on the model, or use the port list
        </div>
        <div className="flex gap-2 flex-wrap">
          {CABLE_OPTIONS.map(({ zone, label, desc }) => (
            <button
              key={zone}
              aria-pressed={selZone === zone}
              onClick={() => setSelZone(selZone === zone ? null : zone)}
              title={desc}
              className="flex items-center gap-2 px-3 py-2 rounded select-none transition-all"
              style={{
                background:   selZone === zone ? ZONE_COLOR[zone] + "33" : ZONE_COLOR[zone] + "11",
                border:       `2px solid ${selZone === zone ? ZONE_COLOR[zone] : ZONE_COLOR[zone] + "55"}`,
                color:        zone === "unassigned" ? "#9ca3af" : ZONE_COLOR[zone],
                fontWeight:   selZone === zone ? 600 : 400,
              }}
            >
              <svg width="26" height="18" viewBox="0 0 26 18" aria-hidden="true">
                <rect x="0" y="5" width="11" height="8" rx="1.5" fill={ZONE_COLOR[zone]} opacity="0.85"/>
                <rect x="11" y="8" width="15" height="2" rx="1" fill={ZONE_COLOR[zone]} opacity="0.6"/>
              </svg>
              <span style={{ fontSize: 12 }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3D viewport */}
      <div style={{ position: "relative" }}>
        <div
          ref={mountRef}
          style={{ width: "100%", height, borderRadius: 8, overflow: "hidden", border: "1px solid #1f2937", background: "#111827" }}
        />
        {!ready && !loadErr && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", color:"#6b7280", fontSize:12 }}>Loading FortiGate model…</div>
        )}
        {loadErr && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", color:"#f87171", fontSize:12, padding:20, textAlign:"center" }}>{loadErr}</div>
        )}
        <div style={{ position:"absolute", top:8, left:10, fontSize:11, color:"#6b7280", pointerEvents:"none" }}>
          {selZone ? (selZone === "unassigned" ? "Click a plugged socket to unplug it" : `Click a socket to connect the ${selZone} cable`) : "drag to rotate · scroll to zoom · click a plugged socket to unplug"}
        </div>
        <div style={{ position:"absolute", bottom:10, right:10, display:"flex", flexDirection:"column", gap:3 }}>
          {[{ l: "+", t: "Zoom in", f: () => zoom(0.85) }, { l: "−", t: "Zoom out", f: () => zoom(1.18) }, { l: "⟳", t: "Reset view", f: resetView }].map(({ l, t, f }) => (
            <button key={l} onClick={f} title={t} aria-label={t}
              style={{ width:28, height:28, borderRadius:4, border:"1px solid #374151", background:"rgba(17,24,39,0.9)", color:"#9ca3af", fontSize:15, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div role="status" style={{ padding:"6px 12px", borderRadius:4, fontSize:12, fontWeight:500,
          background: feedback.ok ? "#052e16" : "#450a0a", color: feedback.ok ? "#4ade80" : "#f87171",
          border: `1px solid ${feedback.ok ? "#166534" : "#991b1b"}` }}>
          {feedback.msg}
        </div>
      )}

      {/* Port list: every exercise port is configurable here, including ports without a socket on the 60F model. */}
      <div className="border border-line rounded-md">
        <div className="flex items-center justify-between px-3 py-2 border-b border-line bg-sunken">
          <span className="text-[12px] font-medium text-body">Ports — {connected}/{assignable.length} connected</span>
          {connected > 0 && (
            <button className="text-[11px] text-muted hover:text-ink" onClick={() => assignable.forEach(p => p.zone !== "unassigned" && onChange(p.portId, "unassigned"))}>
              ↺ Unplug all
            </button>
          )}
        </div>
        <div className="grid gap-x-4 gap-y-1.5 p-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))" }}>
          {ports.map(port => (
            <label key={port.portId} className="flex items-center gap-2 text-[12px]">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: ZONE_COLOR[port.zone] }} />
              <span className="font-medium text-ink w-14">{portName(port)}</span>
              <span className="text-[10px] text-faint w-14 truncate" title="Socket on the 3D model">{socketLabel(port.portId)}</span>
              {port.locked ? (
                <span className="text-[11px] text-muted">{port.zone} (fixed)</span>
              ) : (
                <select
                  aria-label={`Zone for ${portName(port)}`}
                  value={port.zone}
                  onChange={e => onChange(port.portId, e.target.value as PortZone)}
                  className="text-[12px] px-1.5 py-0.5 rounded border border-line-strong bg-surface"
                >
                  <option value="unassigned">Unassigned</option>
                  <option value="WAN">WAN</option>
                  <option value="LAN">LAN</option>
                  <option value="DMZ">DMZ</option>
                </select>
              )}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
