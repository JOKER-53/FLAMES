import { useEffect, useRef, useState, type CSSProperties } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { loadHardwareModel, type ModelProgress } from "../../hardware/modelLoader";
import { ModelLoading } from "../../hardware/ModelLoading";
import { renderScheduler } from "../../hardware/renderScheduler";
import { PanSession } from "../../hooks/usePanSession";
import { PAN_SOCKETS, PAN_CABLE_TYPES, panAcceptsCable } from "../../hardware/panCables";
import { buildSocketCable, disposeObject, labelSprite, measureSockets, type MeasuredSocket } from "../../hardware/cableMesh";

interface PartInfo { title: string; desc: string; }

const OVERVIEW: PartInfo = {
  title: "PA-220 Next-Generation Firewall",
  desc: "Compact desktop form-factor enterprise firewall featuring Palo Alto Networks PAN-OS architecture with dedicated management, console, high availability, and 8 GbE data interfaces."
};
const PART_INFO: Record<string, PartInfo> = {
  data:         { title: "Ethernet 1/1–1/8 — Data Plane", desc: "Eight 10/100/1000 RJ-45 copper interfaces for data-plane traffic. Each supports Layer 2, Layer 3, Virtual Wire, and Tap modes, and must join a zone before policy applies." },
  management:   { title: "MGT — Out-of-Band Management", desc: "Dedicated 10/100/1000 management port for the web UI, CLI over SSH, and Panorama. It is separate from the data plane and never joins a security zone." },
  console:      { title: "CONSOLE (RJ-45) — Serial", desc: "RJ-45 serial console (9600 baud, 8N1) using a rollover cable. Used for initial setup and recovery when MGT is unreachable." },
  "micro-usb":  { title: "CONSOLE (Micro-USB) — Serial", desc: "Micro-USB serial console, an alternative to the RJ-45 console. Only one console connection is active at a time." },
  usb:          { title: "USB — Bootstrap & Support", desc: "USB Type-A port for bootstrapping a configuration and for approved support workflows. Not a network interface." },
  power:        { title: "PWR 1 / PWR 2 — Rear DC Inputs", desc: "Two 12V DC barrel inputs on the rear panel. Connecting both adapters gives power redundancy; the front PWR LED shows input status." },
};

/** Socket marker colour: the colour of the cable that fits it. */
const SOCKET_COLOR = Object.fromEntries(PAN_SOCKETS.map(s => [s.id, PAN_CABLE_TYPES.find(c => c.accepts.includes(s.part))?.color ?? "#94a3b8"]));
const VIEW_TILT = 0.32;

interface SceneState {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  group: THREE.Group;
  overlay: THREE.Group;
  sockets: Record<string, MeasuredSocket>;
  targets: Record<string, THREE.Mesh>;
  distance: number;
  invalidate:()=>void;
}

export function PanHardwarePage({ session: _session }: { session: PanSession }) {
  const [attempt,setAttempt]=useState(0);
  const [progress,setProgress]=useState<ModelProgress>({phase:"download",loaded:0});
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [selectedPart, setSelectedPart] = useState<PartInfo>(OVERVIEW);
  const [mode, setMode] = useState<"explore" | "cable">("explore");
  const [selCable, setSelCable] = useState<string | null>(null);
  const [plugged, setPlugged] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const modeRef = useRef(mode), cableRef = useRef(selCable), pluggedRef = useRef(plugged);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { cableRef.current = selCable; }, [selCable]);
  useEffect(() => { pluggedRef.current = plugged; }, [plugged]);
  useEffect(() => () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current); }, []);

  function showFeedback(msg: string, ok: boolean) {
    setFeedback({ msg, ok });
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 3000);
  }

  function handleSocket(socketId: string) {
    const socket = PAN_SOCKETS.find(s => s.id === socketId)!;
    if (modeRef.current === "explore") { setSelectedPart(PART_INFO[socket.part] ?? OVERVIEW); return; }
    // A plugged socket is always unplugged, whichever cable is selected.
    if (pluggedRef.current[socketId]) {
      setPlugged(p => { const n = { ...p }; delete n[socketId]; return n; });
      showFeedback(`Unplugged ${socket.label}.`, true);
      return;
    }
    const cable = PAN_CABLE_TYPES.find(c => c.id === cableRef.current);
    if (!cable) { showFeedback("Select a cable first.", false); return; }
    if (!panAcceptsCable(cable.id, socketId)) { showFeedback(`✗ ${cable.label} cannot plug into ${socket.label}.`, false); return; }
    setPlugged(p => ({ ...p, [socketId]: cable.id }));
    showFeedback(`✓ ${cable.label} → ${socket.label}.`, true);
  }
  const handleRef = useRef(handleSocket); handleRef.current = handleSocket;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    setLoading(true);setLoadErr(null);setProgress({phase:"download",loaded:0});
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); }
    catch { setLoadErr("3D rendering is unavailable. Enable WebGL or try another browser."); setLoading(false); return; }
    const w = mount.clientWidth || 900, h = mount.clientHeight || 500;
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.domElement.setAttribute("role","img");renderer.domElement.setAttribute("aria-label","Interactive 3D appliance. Use Inspect appliance and the port controls for keyboard access.");
    const contextLost=(event:Event)=>{event.preventDefault();setLoadErr("The 3D graphics context was lost. Retry the viewer to recover.");setLoading(false);};renderer.domElement.addEventListener("webglcontextlost",contextLost);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1117);
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.05, 200);
    camera.position.set(0, 5, 12);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.autoRotate = modeRef.current==="explore"&&!window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    controls.autoRotateSpeed = 0.6;
    renderer.domElement.addEventListener("pointerdown", () => { controls.autoRotate = false; }, { once: true });

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    [[5, 10, 10, 1.2], [-5, 5, 10, 0.9], [0, -5, 10, 0.5], [0, 5, -10, 0.9]].forEach(([x, y, z, i]) => {
      const light = new THREE.DirectionalLight(0xffffff, i); light.position.set(x, y, z); scene.add(light);
    });

    const group = new THREE.Group();
    scene.add(group);
    let disposed = false;

    const cancelLoad=loadHardwareModel("paloalto", gltf => {
      if (disposed) { disposeObject(gltf.scene); return; }
      const model = gltf.scene;
      const raw = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
      model.scale.setScalar(8 / Math.max(raw.x, raw.y, raw.z));
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      model.position.sub(box.getCenter(new THREE.Vector3()));
      group.add(model);
      const size = box.getSize(new THREE.Vector3());

      const sockets = measureSockets(model, group, PAN_SOCKETS);
      const targets: Record<string, THREE.Mesh> = {};
      for (const [id, s] of Object.entries(sockets)) {
        // Thin hit plates flush with each opening; deeper boxes overlap neighbouring rows.
        const plate = new THREE.Mesh(new THREE.BoxGeometry(s.width * 1.1, s.height * 1.1, s.width * 0.05), new THREE.MeshBasicMaterial({ visible: false }));
        plate.position.copy(s.center);
        plate.userData.socketId = id;
        group.add(plate);
        targets[id] = plate;
      }
      const overlay = new THREE.Group(); group.add(overlay);

      const fov = camera.fov * Math.PI / 180;
      // Leave room around the appliance in the expanded viewer, including when rotated.
      const distance = ((size.x / 2) * 1.15 / (Math.tan(fov / 2) * camera.aspect) + size.z / 2) * 1.45;
      camera.position.set(0, distance * VIEW_TILT, distance);
      controls.minDistance = distance * 0.35;
      controls.maxDistance = distance * 2;
      controls.update();
      sceneRef.current = { camera, controls, group, overlay, sockets, targets, distance, invalidate:loop.invalidate };
      loop.invalidate();setLoading(false);
    }, setProgress, () => {
      if (disposed) return;
      setLoadErr("The 3D model could not be loaded. Check the connection and retry.");
      setLoading(false);
    });

    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
    const pick = (e: PointerEvent) => {
      const s = sceneRef.current; if (!s) return null;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      return (raycaster.intersectObjects(Object.values(s.targets))[0]?.object.userData.socketId as string) ?? null;
    };
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; };
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 5) return;
      const id = pick(e);
      if (id) handleRef.current(id);
      else if (modeRef.current === "explore") setSelectedPart(OVERVIEW);
    };
    const onHover = (e: PointerEvent) => { renderer.domElement.style.cursor = pick(e) ? "pointer" : "grab"; };
    const canvas = renderer.domElement;
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointermove", onHover);

    const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)");
    const loop=renderScheduler(mount, () => {
      if(sceneRef.current)controls.update();
      const s = sceneRef.current;
      if (s) {
        const pulse = 0.6 + Math.sin(Date.now() * 0.006) * 0.35;
        const fits = (id: string) => !!cableRef.current && panAcceptsCable(cableRef.current, id);
        s.overlay.children.forEach(child => {
          // Labels draw over the model, so hide those on the panel facing away from the camera.
          if (child.userData.facing) child.visible = child.userData.facing * s.camera.position.z > 0;
          if (!child.userData.dot) return;
          // Sockets that accept the selected cable pulse; the rest stay dim.
          (((child as THREE.Mesh).material) as THREE.MeshBasicMaterial).opacity = fits(child.userData.dot) ? reducedMotion.matches?0.9:pulse : cableRef.current ? 0.25 : 0.8;
        });
      }
      renderer.render(scene, camera);
    },()=>!!sceneRef.current&&!reducedMotion.matches&&(controls.autoRotate||modeRef.current==="cable"&&!!cableRef.current));
    controls.addEventListener("change",loop.invalidate);
    const motionChange=()=>{if(reducedMotion.matches)controls.autoRotate=false;loop.invalidate();};reducedMotion.addEventListener("change",motionChange);

    const resize = new ResizeObserver(() => {
      const nw = mount.clientWidth, nh = mount.clientHeight;
      if (!nw || !nh) return;
      camera.aspect = nw / nh; camera.updateProjectionMatrix(); renderer.setSize(nw, nh);loop.invalidate();
    });
    resize.observe(mount);

    return () => {
      disposed = true;
      cancelLoad();loop.dispose();controls.removeEventListener("change",loop.invalidate);reducedMotion.removeEventListener("change",motionChange);
      resize.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointermove", onHover);
      controls.dispose();
      disposeObject(group);
      sceneRef.current = null;
      renderer.domElement.removeEventListener("webglcontextlost",contextLost);
      renderer.dispose();
      if (mount.contains(canvas)) mount.removeChild(canvas);
    };
  }, [attempt]);

  // Redraw cables, socket markers, and labels whenever the plugged set or mode changes.
  useEffect(() => {
    const s = sceneRef.current;
    if (!s || loading) return;
    s.invalidate();
    for (const child of [...s.overlay.children]) { s.overlay.remove(child); disposeObject(child); }
    if (mode !== "cable") return;
    for (const meta of PAN_SOCKETS) {
      const socket = s.sockets[meta.id];
      if (!socket) continue;
      const label = labelSprite(meta.short, socket.width * (meta.part === "power" ? 3.5 : 1.05));
      const lift = meta.part === "power" ? socket.width * 1.3 : socket.height * 0.95;
      label.position.set(socket.center.x, socket.center.y + (meta.upper || meta.part === "power" ? lift : -lift), socket.center.z + socket.facing * socket.width * 0.3);
      label.userData.facing = socket.facing;
      s.overlay.add(label);
      const cable = PAN_CABLE_TYPES.find(c => c.id === plugged[meta.id]);
      if (cable) {
        const seed = [...meta.id].reduce((n, ch) => n + ch.charCodeAt(0), 0);
        s.overlay.add(buildSocketCable(socket, cable.color, cable.kind, seed, meta.upper ? "up" : "down"));
        continue;
      }
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(Math.min(socket.width, socket.height) * 0.32, 16, 16),
        new THREE.MeshBasicMaterial({ color: SOCKET_COLOR[meta.id], transparent: true, opacity: 0.8 })
      );
      dot.position.copy(socket.center);
      dot.position.z += socket.facing * socket.width * 0.15;
      dot.userData.dot = meta.id;
      s.overlay.add(dot);
    }
  }, [plugged, loading, mode, selCable]);

  function zoom(factor: number) {
    const s = sceneRef.current; if (!s) return;
    s.camera.position.sub(s.controls.target).multiplyScalar(factor).add(s.controls.target);
    s.controls.update();
  }
  function view(side: 1 | -1) {
    const s = sceneRef.current; if (!s) return;
    s.controls.autoRotate = false;
    s.controls.target.set(0, 0, 0);
    s.camera.position.set(0, s.distance * VIEW_TILT, side * s.distance);
    s.controls.update();
  }
  function switchMode(next: "explore" | "cable") {
    setMode(next);
    if (next === "cable") { view(1); setSelectedPart(OVERVIEW); }
    else { setSelCable(null); cableRef.current = null; setFeedback(null); }
  }
  function unplug(id: string) {
    setPlugged(p => { const n = { ...p }; delete n[id]; return n; });
    showFeedback(`Unplugged ${PAN_SOCKETS.find(s => s.id === id)?.label}.`, true);
  }

  const overlayButton = (active: boolean, color: string): CSSProperties => ({
    padding: "5px 12px", fontSize: 11, borderRadius: 20, cursor: "pointer", backdropFilter: "blur(8px)",
    border: `1.5px solid ${active ? color : "#2d3f5a"}`, background: active ? color + "dd" : "rgba(13,17,23,0.82)", color: active ? "#fff" : "#94a3b8",
  });
  const iconButton: CSSProperties = { width: 32, height: 32, borderRadius: 6, border: "1px solid #334155", background: "#0b111bdd", color: "#cbd5e1", cursor: "pointer", fontSize: 16 };

  return (
    <div style={{ width: "100%", minHeight: "calc(100dvh - 88px)", display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="flex flex-wrap items-end justify-between gap-3 shrink-0">
        <div>
          <div className="eyebrow mb-2">Reference</div>
          <h1 className="text-2xl font-semibold">PA-220 hardware</h1>
          <p className="mt-1.5 text-muted">
            {mode === "explore" ? "Drag to rotate, scroll to zoom, and click any port to learn what it does." : "Choose a cable, then click a matching socket. Power inputs are on the rear panel."}
          </p>
        </div>
        {mode === "explore" && (
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { label: "Overview", info: OVERVIEW },
              { label: "Data Ports (1-8)", info: PART_INFO.data },
              { label: "Management & HA", info: PART_INFO.management },
            ].map(item => (
              <button key={item.label} onClick={() => setSelectedPart(item.info)}
                style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4, border: "1px solid rgb(var(--line-strong))", cursor: "pointer", fontWeight: 500,
                  background: selectedPart === item.info ? "rgb(var(--accent-soft))" : "rgb(var(--surface))", color: "rgb(var(--ink))" }}>
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <label className="flex flex-wrap items-center gap-3 text-sm"><span className="font-medium">Inspect appliance</span><select aria-label="Inspect appliance" className="input w-auto max-w-full" value={Object.entries(PART_INFO).find(([,info])=>info===selectedPart)?.[0]??""} onChange={event=>setSelectedPart(PART_INFO[event.target.value]??OVERVIEW)}><option value="">Overview</option>{Object.entries(PART_INFO).map(([id,info])=><option key={id} value={id}>{info.title}</option>)}</select></label>
      {/* 3D Viewport */}
      <div style={{ position: "relative", flex: "0 0 auto", height: "max(480px, 78dvh)", borderRadius: 8, overflow: "hidden", border: "1px solid #1e2d45", background: "#0d1117" }}>
        <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

        <ModelLoading loading={loading} error={loadErr} progress={progress} retry={()=>setAttempt(value=>value+1)}/>

        <div style={{ position: "absolute", top: 12, left: 14, color: "#94a3b8", fontSize: 11, pointerEvents: "none" }}>
          {mode === "explore" ? "drag · scroll · click a port to learn" : "select cable → click glowing socket · power inputs are on the rear"}
        </div>

        {/* Feedback toast — overlaid so it never resizes the canvas */}
        {feedback && (
          <div role="status" style={{ position: "absolute", top: 10, right: 12, padding: "6px 14px", borderRadius: 4, fontSize: 12, fontWeight: 500,
            background: feedback.ok ? "#052e16ee" : "#450a0aee", color: feedback.ok ? "#4ade80" : "#f87171", border: `1px solid ${feedback.ok ? "#166534" : "#991b1b"}` }}>
            {feedback.msg}
          </div>
        )}

        {/* Mode pills and views — bottom left */}
        <div style={{ position: "absolute", bottom: 12, left: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button aria-pressed={mode === "explore"} onClick={() => switchMode("explore")} style={overlayButton(mode === "explore", "#334155")}>Explore</button>
          <button aria-pressed={mode === "cable"} onClick={() => switchMode("cable")} style={overlayButton(mode === "cable", "#334155")}>Cable mode</button>
          {mode === "cable" && <>
            <button onClick={() => view(1)} style={overlayButton(false, "#2563eb")}>Front</button>
            <button onClick={() => view(-1)} style={overlayButton(false, "#2563eb")}>Rear (power)</button>
            {Object.keys(plugged).length > 0 && <button onClick={() => setPlugged({})} style={overlayButton(false, "#2563eb")}>↺ Reset</button>}
          </>}
        </div>

        {/* Zoom & View Controls */}
        <div style={{ position: "absolute", right: 12, bottom: 12, display: "flex", flexDirection: "column", gap: 5 }}>
          <button onClick={() => zoom(0.8)} style={iconButton} title="Zoom in" aria-label="Zoom in">+</button>
          <button onClick={() => zoom(1.25)} style={iconButton} title="Zoom out" aria-label="Zoom out">−</button>
          <button onClick={() => view(1)} style={{ ...iconButton, fontSize: 15 }} title="Reset view" aria-label="Reset view">⟳</button>
        </div>
      </div>

      {/* Cable selector */}
      {mode === "cable" && (
        <div style={{ flexShrink: 0, background: "rgb(var(--surface))", border: "1px solid rgb(var(--line-strong))", borderRadius: 6, padding: "10px 12px" }}>
          <div style={{ fontSize: 11, color: "rgb(var(--muted))", marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.06em" }}>Select a cable — then click the matching glowing socket on the model</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {PAN_CABLE_TYPES.map(c => (
              <button key={c.id} aria-pressed={selCable === c.id} onClick={() => { const next = selCable === c.id ? null : c.id; cableRef.current = next; setSelCable(next); }}
                style={{ padding: "4px 10px", fontSize: 11, borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                  border: `1.5px solid ${selCable === c.id ? c.color : "#e2e8f0"}`, background: selCable === c.id ? c.color + "22" : "rgb(var(--sunken))", color: "rgb(var(--ink))" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, display: "inline-block" }} />
                {c.label}{Object.values(plugged).includes(c.id) ? " ✓" : ""}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 12, margin: "10px 0 6px", color: "rgb(var(--body))" }}>
            {Object.keys(plugged).length} / {PAN_SOCKETS.length} sockets connected. Select a cable, then use the model or a socket button below. Connected sockets can be unplugged.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }} aria-label="Cable practice sockets">
            {PAN_SOCKETS.map(socket => {
              const cable = PAN_CABLE_TYPES.find(c => c.id === plugged[socket.id]);
              return (
                <button key={socket.id} aria-pressed={!!cable} onClick={() => cable ? unplug(socket.id) : handleSocket(socket.id)}
                  style={{ fontSize: 11, padding: "6px 9px", borderRadius: 4, cursor: "pointer", border: `1px solid ${cable ? cable.color + "88" : "#e2e8f0"}`,
                    background: cable ? cable.color + "1a" : "rgb(var(--sunken))", color: "rgb(var(--ink))" }}>
                  {socket.label} {cable ? "✓ Unplug" : "Connect"}
                </button>
              );
            })}
          </div>
          {selCable && <p style={{ fontSize: 11, color: "rgb(var(--muted))", marginTop: 7, marginBottom: 0 }}>{PAN_CABLE_TYPES.find(c => c.id === selCable)?.desc}</p>}
        </div>
      )}

      {/* Selected Component Information Banner */}
      {mode === "explore" && (
        <div style={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--line-strong))", borderRadius: 6, padding: "10px 14px", minHeight: 58, flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "rgb(var(--ink))", marginBottom: 3 }}>{selectedPart.title}</div>
          <div style={{ fontSize: 12, color: "rgb(var(--muted))", lineHeight: 1.5 }}>{selectedPart.desc}</div>
        </div>
      )}
    </div>
  );
}
