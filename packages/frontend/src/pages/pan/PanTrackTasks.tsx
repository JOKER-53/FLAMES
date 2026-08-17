import { useNavigate } from "react-router-dom";
import { PanSession } from "../../hooks/usePanSession";
import { PanTrack, TRACK_META, TRACK_TASKS, TRACK_FINALS } from "./panTasks";

interface Props { session: PanSession; track: PanTrack; }

function Stars({ level }: { level: number }) {
  const filled = Math.round((level / 10) * 5);
  return (
    <div style={{ display:"flex", gap:2 }}>
      {Array.from({length:5}).map((_,i) => (
        <div key={i} style={{ width:8, height:8, borderRadius:"50%", background: i<filled ? "#f59e0b" : "#e2e8f0" }}/>
      ))}
    </div>
  );
}

export function PanTrackTasks({ session, track }: Props) {
  const navigate = useNavigate();
  const meta  = TRACK_META[track];
  const tasks = TRACK_TASKS[track];
  const final = TRACK_FINALS[track];

  const done       = tasks.filter(t => session.completedTaskIds.has(t.id)).length;
  const finalDone  = session.completedTaskIds.has(final.id);
  const pct        = finalDone ? 100 : Math.min(99, Math.round((done/tasks.length)*99));
  const allRegDone = done === tasks.length;

  // Route for each task's exercise page
  const TASK_ROUTE: Record<PanTrack, string> = {
    security: "/paloalto/security",
    zones:    "/paloalto/zones",
    nat:      "/paloalto/nat",
  };

  return (
    <div style={{ maxWidth:800 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
        <span style={{ fontSize:24 }}>{meta.icon}</span>
        <h1 style={{ fontSize:18, fontWeight:700, color:"#1e293b", margin:0 }}>{meta.label}</h1>
      </div>
      <p style={{ color:"#64748b", fontSize:13, marginBottom:20 }}>
        Complete every exercise below to unlock the Final Assignment.
      </p>

      {/* Track progress */}
      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:14, marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
          <span style={{ fontSize:12, color:"#64748b" }}>Track Progress</span>
          <span style={{ fontSize:12, fontWeight:700, color:meta.color }}>{pct}%</span>
        </div>
        <div style={{ height:6, background:"#f1f5f9", borderRadius:3, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`, background:meta.color, borderRadius:3, transition:"width 0.5s" }}/>
        </div>
      </div>

      {/* Task list */}
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:12 }}>
        {tasks.map((task, idx) => {
          const completed = session.completedTaskIds.has(task.id);
          return (
            <div key={task.id}
              onClick={() => navigate(TASK_ROUTE[track], { state: { taskId: task.id } })}
              style={{ background:"#fff", border:`1px solid ${completed ? meta.color+"44" : "#e2e8f0"}`,
                borderRadius:8, padding:14, cursor:"pointer", display:"flex", gap:12, alignItems:"flex-start",
                transition:"all 0.15s" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = meta.color}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = completed ? meta.color+"44" : "#e2e8f0"}>
              {/* Number / check */}
              <div style={{ width:28, height:28, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700,
                background: completed ? meta.color : "transparent",
                border: `2px solid ${completed ? meta.color : "#e2e8f0"}`,
                color: completed ? "#fff" : "#94a3b8" }}>
                {completed ? "✓" : idx+1}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:"#374151" }}>{task.title}</span>
                  {completed && <span style={{ fontSize:10, padding:"1px 6px", borderRadius:3, background:meta.color+"22", color:meta.color, fontWeight:600 }}>Complete</span>}
                </div>
                <p style={{ fontSize:12, color:"#64748b", margin:"0 0 6px", lineHeight:1.5 }}>{task.description}</p>
                <Stars level={task.difficulty}/>
              </div>
              <div style={{ fontSize:12, color:meta.color, fontShrink:0, whiteSpace:"nowrap", marginTop:4 }}>
                {completed ? "Review →" : "Start →"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Final assignment */}
      <div onClick={() => allRegDone || finalDone ? navigate(TASK_ROUTE[track], { state: { taskId: final.id } }) : undefined}
        style={{ background: finalDone ? "#fff" : allRegDone ? "#fffbf5" : "#f8fafc",
          border: `1.5px solid ${finalDone ? meta.color : allRegDone ? "#fed7aa" : "#e2e8f0"}`,
          borderRadius:8, padding:14, cursor: allRegDone||finalDone ? "pointer" : "not-allowed",
          display:"flex", gap:12, alignItems:"flex-start", opacity: allRegDone||finalDone ? 1 : 0.6 }}>
        <div style={{ width:28, height:28, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
          background: finalDone ? meta.color : allRegDone ? "#f59e0b" : "#e2e8f0",
          color: finalDone||allRegDone ? "#fff" : "#94a3b8", fontSize:14 }}>
          🏆
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
            <span style={{ fontSize:13, fontWeight:700, color:"#374151" }}>{final.title}</span>
            <span style={{ fontSize:10, padding:"1px 6px", borderRadius:3, fontWeight:600,
              background: finalDone ? meta.color+"22" : "#fef3c7", color: finalDone ? meta.color : "#92400e" }}>
              Final Assignment
            </span>
          </div>
          <p style={{ fontSize:12, color:"#64748b", margin:"0 0 6px", lineHeight:1.5 }}>{final.description}</p>
          {!allRegDone && !finalDone && (
            <p style={{ fontSize:11, color:"#94a3b8", margin:0 }}>Complete all exercises above to unlock</p>
          )}
        </div>
      </div>
    </div>
  );
}
