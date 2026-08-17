import { useNavigate } from "react-router-dom";
import { PanSession } from "../../hooks/usePanSession";
import { TRACK_META, TRACK_TASKS, TRACK_FINALS, PanTrack } from "./panTasks";

export function PanTasksOverview({ session }: { session: PanSession }) {
  const navigate = useNavigate();
  const tracks: PanTrack[] = ["security", "zones", "nat"];

  function trackProgress(track: PanTrack): number {
    const finalDone = session.completedTaskIds.has(TRACK_FINALS[track].id);
    if (finalDone) return 100;
    const tasks = TRACK_TASKS[track];
    const done  = tasks.filter(t => session.completedTaskIds.has(t.id)).length;
    return tasks.length ? Math.min(99, Math.round((done / tasks.length) * 99)) : 0;
  }

  const overall = Math.round(tracks.reduce((s, t) => s + trackProgress(t), 0) / tracks.length);

  return (
    <div style={{ maxWidth:800 }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:20, fontWeight:700, color:"#1e293b", margin:0 }}>PAN-OS Training Tasks</h1>
        <p style={{ color:"#64748b", fontSize:13, marginTop:6 }}>
          Pick a track from the sidebar to see and complete its exercises.
        </p>
      </div>

      {/* Overall progress */}
      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:16, marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
          <span style={{ fontSize:13, fontWeight:600, color:"#374151" }}>Overall Progress</span>
          <span style={{ fontSize:13, fontWeight:700, color:"#fa4616" }}>{overall}%</span>
        </div>
        <div style={{ height:8, background:"#f1f5f9", borderRadius:4, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${overall}%`, background:"#fa4616", borderRadius:4, transition:"width 0.5s" }}/>
        </div>
      </div>

      {/* Track cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
        {tracks.map(track => {
          const meta = TRACK_META[track];
          const pct  = trackProgress(track);
          const done = TRACK_TASKS[track].filter(t => session.completedTaskIds.has(t.id)).length;
          const total = TRACK_TASKS[track].length;
          return (
            <button key={track} onClick={() => navigate(meta.path)}
              style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:16,
                cursor:"pointer", textAlign:"left", transition:"all 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = meta.color; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 1px ${meta.color}33`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <span style={{ fontSize:20 }}>{meta.icon}</span>
                <span style={{ fontSize:13, fontWeight:600, color:"#374151" }}>{meta.label}</span>
              </div>
              <div style={{ height:6, background:"#f1f5f9", borderRadius:3, overflow:"hidden", marginBottom:6 }}>
                <div style={{ height:"100%", width:`${pct}%`, background:meta.color, borderRadius:3, transition:"width 0.5s" }}/>
              </div>
              <div style={{ fontSize:11, color:"#94a3b8" }}>{pct}% · {done}/{total} exercises</div>
            </button>
          );
        })}
      </div>

      {/* Comparison callout */}
      <div style={{ marginTop:20, background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:8, padding:14 }}>
        <div style={{ fontSize:13, fontWeight:600, color:"#9a3412", marginBottom:4 }}>📊 FortiOS vs PAN-OS</div>
        <p style={{ fontSize:12, color:"#7c2d12", margin:0, lineHeight:1.6 }}>
          Complete all three tracks on both platforms to understand the key architectural differences:
          FortiOS uses port-based service matching while PAN-OS uses App-ID; FortiOS zones are interface-level
          while PAN-OS zones are policy enforcement boundaries; FortiOS NAT is inline while PAN-OS NAT is separate.
        </p>
      </div>
    </div>
  );
}
