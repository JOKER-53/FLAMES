import { useNavigate } from "react-router-dom";
import { PanSession } from "../../hooks/usePanSession";
import { PanChassisDiagram, PanPortAssignment } from "../../components/policyObjects/PanChassisDiagram";
import { TRACK_META, TRACK_TASKS, TRACK_FINALS, PanTrack } from "./panTasks";

export function PanDashboard({ session }: { session: PanSession }) {
  const navigate = useNavigate();
  const tracks: PanTrack[] = ["security", "zones", "nat"];

  function trackProgress(track: PanTrack) {
    const finalDone = session.completedTaskIds.has(TRACK_FINALS[track].id);
    if (finalDone) return 100;
    const tasks = TRACK_TASKS[track];
    const done = tasks.filter(t => session.completedTaskIds.has(t.id)).length;
    return tasks.length ? Math.min(99, Math.round((done / tasks.length) * 99)) : 0;
  }

  const overall = Math.round(tracks.reduce((s, t) => s + trackProgress(t), 0) / tracks.length);

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 6 }}>
          Palo Alto Networks · PAN-OS 11.0 Simulation
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1e293b", margin: 0 }}>PA-220 Training Lab</h1>
        <p style={{ color: "#64748b", fontSize: 13, marginTop: 6 }}>
          Learn next-generation firewall concepts — App-ID, zone-based security, and NAT — on a simulated PA-220.
        </p>
      </div>

      {/* Overall progress */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>Overall Progress</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: "#fa4616" }}>{overall}%</span>
        </div>
        <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
          <div style={{ height: "100%", width: `${overall}%`, background: "linear-gradient(90deg,#fa4616,#fb923c)", borderRadius: 4, transition: "width 0.6s" }} />
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>
          {tracks.reduce((s, t) => s + TRACK_TASKS[t].filter(x => session.completedTaskIds.has(x.id)).length, 0)} of{" "}
          {tracks.reduce((s, t) => s + TRACK_TASKS[t].length, 0)} exercises completed
        </div>
      </div>

      {/* Track cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
        {tracks.map(track => {
          const meta = TRACK_META[track];
          const pct = trackProgress(track);
          const done = TRACK_TASKS[track].filter(t => session.completedTaskIds.has(t.id)).length;
          const total = TRACK_TASKS[track].length;
          return (
            <button key={track} onClick={() => navigate(meta.path)}
              style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 18, cursor: "pointer", textAlign: "left", transition: "all 0.15s", position: "relative", overflow: "hidden" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = meta.color; el.style.transform = "translateY(-2px)"; el.style.boxShadow = `0 4px 20px ${meta.color}22`; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "#e2e8f0"; el.style.transform = ""; el.style.boxShadow = ""; }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: meta.color, borderRadius: "10px 10px 0 0", opacity: pct > 0 ? 1 : 0.3 }} />
              <div style={{ fontSize: 28, marginBottom: 10 }}>{meta.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>{meta.label}</div>
              <div style={{ height: 5, background: "#f1f5f9", borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
                <div style={{ height: "100%", width: `${pct}%`, background: meta.color, borderRadius: 3, transition: "width 0.5s" }} />
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{pct}% · {done}/{total} done</div>
            </button>
          );
        })}
      </div>

      {/* PA-220 front panel */}
      <div style={{ background: "#0d1117", border: "1px solid #1e2d45", borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 14 }}>PA-220 — 3D Hardware View</div>
        <div style={{ height: 350, borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
          <PanChassisDiagram 
            ports={[
              { id: "ethernet1/1", zone: "Untrust", label: "eth1/1" },
              { id: "ethernet1/2", zone: "Untrust", label: "eth1/2" },
              { id: "ethernet1/3", zone: "Untrust", label: "eth1/3" },
              { id: "ethernet1/4", zone: "Untrust", label: "eth1/4" },
              { id: "ethernet1/5", zone: "Trust", label: "eth1/5" },
              { id: "ethernet1/6", zone: "Trust", label: "eth1/6" },
              { id: "ethernet1/7", zone: "Trust", label: "eth1/7" },
              { id: "ethernet1/8", zone: "Trust", label: "eth1/8" },
              { id: "management",  zone: "Management", label: "MGT" }
            ] as PanPortAssignment[]} 
            onChange={() => {}} 
          />
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap", justifyContent: "center" }}>
          {[["#7c3aed","Management/HA"],["#ef4444","Untrust (E1/1-4)"],["#22c55e","Trust (E1/5-8)"]].map(([c,l]) => (
            <span key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#94a3b8" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, display: "inline-block" }} />{l}
            </span>
          ))}
        </div>
      </div>

      {/* Key differences vs FortiGate */}
      <div style={{ background: "#0f172a", border: "1px solid #1e2d45", borderRadius: 10, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 14 }}>PAN-OS vs FortiOS — Key Differences</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { topic: "Traffic Identification", pan: "App-ID — identifies by application signature (L7)", forti: "Service — identifies by port number (L4)" },
            { topic: "Default Zone Policy",    pan: "Inter-zone DENY by default, intra-zone ALLOW", forti: "Depends on zone; intra-zone traffic may be allowed" },
            { topic: "NAT Placement",          pan: "Separate NAT policy, evaluated AFTER security", forti: "Inline with security policy (SNAT checkbox)" },
            { topic: "Rule Evaluation",        pan: "Top-down, first match, implicit deny-all", forti: "Top-down, first match, implicit deny-all" },
          ].map(({ topic, pan, forti }) => (
            <div key={topic} style={{ background: "#1a2332", borderRadius: 6, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>{topic}</div>
              <div style={{ fontSize: 11, color: "#fa8060", marginBottom: 4 }}>🔵 PAN-OS: {pan}</div>
              <div style={{ fontSize: 11, color: "#86a8cc" }}>🔴 FortiOS: {forti}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
