import { useState } from "react";
import { PanSession } from "../../hooks/usePanSession";

type IfaceType = "layer3" | "layer2" | "tap" | "ha" | "management";
type IfaceZone = "Trust" | "Untrust" | "DMZ" | "Management" | "HA" | "—";

interface Interface {
  id: string;
  type: IfaceType;
  zone: IfaceZone;
  ip: string;
  link: boolean;
  speed: string;
  comment: string;
}

const DEFAULT_IFACES: Interface[] = [
  { id:"ethernet1/1", type:"layer3",     zone:"—",          ip:"",                link:true,  speed:"1G",   comment:"WAN uplink to ISP" },
  { id:"ethernet1/2", type:"layer3",     zone:"—",          ip:"",                link:true,  speed:"1G",   comment:"Internal LAN" },
  { id:"ethernet1/3", type:"layer3",     zone:"—",          ip:"",                link:false, speed:"1G",   comment:"DMZ segment" },
  { id:"ethernet1/4", type:"layer3",     zone:"—",          ip:"",                link:false, speed:"1G",   comment:"" },
  { id:"ethernet1/5", type:"layer3",     zone:"—",          ip:"",                link:false, speed:"1G",   comment:"" },
  { id:"ethernet1/6", type:"ha",         zone:"—",          ip:"",                link:true,  speed:"1G",   comment:"HA1 heartbeat" },
  { id:"ethernet1/7", type:"ha",         zone:"—",          ip:"",                link:true,  speed:"1G",   comment:"HA2 sync" },
  { id:"ethernet1/8", type:"layer3",     zone:"—",          ip:"",                link:false, speed:"1G",   comment:"" },
  { id:"management",  type:"management", zone:"—",          ip:"",                link:true,  speed:"1G",   comment:"OOB management" },
];

const ZONE_COLOR: Record<string,string> = {
  Trust:"#22c55e", Untrust:"#ef4444", DMZ:"#f97316", Management:"#7c3aed", HA:"#3b82f6", "—":"#d1d5db",
};

const ZONES: IfaceZone[] = ["Trust","Untrust","DMZ","Management","HA","—"];

export function PanInterfaces({ session }: { session: PanSession }) {
  const [ifaces, setIfaces] = useState<Interface[]>(DEFAULT_IFACES);
  const [editing, setEditing] = useState<string|null>(null);
  const [editVal, setEditVal] = useState<Partial<Interface>>({});
  
  const [results, setResults] = useState<{desc:string;pass:boolean}[]|null>(null);
  const [aiFeedback, setAiFeedback] = useState<string|null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  
  const [kqLoading, setKqLoading] = useState(false);
  const [kqError, setKqError] = useState<string|null>(null);
  const [kqData, setKqData] = useState<{question:string;choices:string[];correctIndex:number}|null>(null);
  const [kqSelected, setKqSelected] = useState<number|null>(null);
  const [kqResult, setKqResult] = useState<"correct"|"incorrect"|null>(null);
  const [kqLocked, setKqLocked] = useState(false);

  const scenarioId = "pan-iface-01";

  function startEdit(iface: Interface) {
    setEditing(iface.id);
    setEditVal({ zone:iface.zone, ip:iface.ip, type:iface.type, comment:iface.comment });
  }

  function saveEdit(id: string) {
    setIfaces(prev=>prev.map(i=>i.id===id?{...i,...editVal}:i));
    setEditing(null);
  }

  function grade() {
    const checks = [
      { desc: "ethernet1/1 in Untrust with IP 203.0.113.1/30", pass: ifaces.some(i => i.id === "ethernet1/1" && i.zone === "Untrust" && i.ip === "203.0.113.1/30") },
      { desc: "ethernet1/2 in Trust with IP 10.0.0.1/24", pass: ifaces.some(i => i.id === "ethernet1/2" && i.zone === "Trust" && i.ip === "10.0.0.1/24") },
      { desc: "management in Management with IP 192.168.1.1/24", pass: ifaces.some(i => i.id === "management" && i.zone === "Management" && i.ip === "192.168.1.1/24") },
    ];
    setResults(checks);
    if (checks.every(c => c.pass)) {
      session.markTaskComplete(scenarioId);
    } else {
      const failing = checks.filter(c => !c.pass).map(c => c.desc);
      setLoadingFeedback(true); setAiFeedback(null);
      fetch("/api/pan/feedback", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ exerciseTitle: "Interface Configuration", failingChecks: failing })
      }).then(r=>r.json()).then(d=>setAiFeedback(d.feedback??null)).catch(()=>setAiFeedback(null)).finally(()=>setLoadingFeedback(false));
    }
  }

  function loadKQ() {
    setKqLoading(true); setKqError(null); setKqData(null); setKqSelected(null); setKqResult(null); setKqLocked(false);
    fetch(`/api/pan/knowledge-check/${scenarioId}`)
      .then(r=>r.ok?r.json():Promise.reject(r.status))
      .then(d=>setKqData(d)).catch(e=>setKqError("Failed: "+e)).finally(()=>setKqLoading(false));
  }

  function answerKQ() {
    if (kqSelected===null||!kqData||kqLocked) return;
    if (kqSelected===kqData.correctIndex){setKqResult("correct");session.markTaskComplete(scenarioId);}
    else{setKqResult("incorrect");setKqLocked(true);}
  }

  const passed = results?.filter(r=>r.pass).length??0;

  return (
    <div style={{ maxWidth:1000 }}>
      <div style={{ marginBottom:16 }}>
        <h1 style={{ fontSize:18, fontWeight:700, color:"#1e293b", margin:0 }}>Network Interfaces</h1>
        <p style={{ color:"#64748b", fontSize:12, marginTop:4 }}>
          Task: Assign ethernet1/1 to Untrust (IP 203.0.113.1/30), ethernet1/2 to Trust (IP 10.0.0.1/24), and management to Management (IP 192.168.1.1/24).
        </p>
      </div>

      {/* Interface diagram */}
      <div style={{ background:"#1a2332", borderRadius:8, padding:16, marginBottom:16 }}>
        <div style={{ fontSize:10, color:"#4b6080", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:10 }}>PA-220 Interface Map</div>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <div style={{ background:"#fa4616", borderRadius:4, padding:"4px 8px", color:"white", fontSize:11, fontWeight:700, marginRight:4 }}>PA</div>
          {ifaces.filter(i=>i.id!=="management").map(i=>(
            <div key={i.id} style={{ textAlign:"center" }}>
              <div style={{ width:32, height:26, borderRadius:3, border:`2px solid ${ZONE_COLOR[i.zone]}`,
                background: i.link ? ZONE_COLOR[i.zone]+"22" : "#0d1117",
                display:"flex", alignItems:"center", justifyContent:"center", marginBottom:2 }}>
                {i.link && <div style={{ width:6, height:6, borderRadius:"50%", background:ZONE_COLOR[i.zone], boxShadow:`0 0 4px ${ZONE_COLOR[i.zone]}` }}/>}
              </div>
              <div style={{ fontSize:8, color:"#4b6080" }}>{i.id.replace("ethernet","")}</div>
              <div style={{ fontSize:7, color:ZONE_COLOR[i.zone] }}>{i.zone}</div>
            </div>
          ))}
          <div style={{ marginLeft:16, textAlign:"center" }}>
            <div style={{ width:32, height:26, borderRadius:3, border:"2px solid #7c3aed", background:"#7c3aed22", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:2 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#7c3aed", boxShadow:"0 0 4px #7c3aed" }}/>
            </div>
            <div style={{ fontSize:8, color:"#4b6080" }}>MGT</div>
            <div style={{ fontSize:7, color:"#7c3aed" }}>Mgmt</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:12, marginTop:10, flexWrap:"wrap" }}>
          {Object.entries(ZONE_COLOR).filter(([k])=>k!=="—").map(([zone,color])=>(
            <span key={zone} style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, color:"#94a3b8" }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:color, display:"inline-block" }}/>
              {zone}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 280px", gap:16 }}>
        <div>
          {/* Interface table */}
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, overflow:"hidden", marginBottom:12 }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:"#f8fafc", borderBottom:"1px solid #e2e8f0" }}>
                  {["Interface","Type","Zone","IP Address","Link","Comment",""].map(h=>(
                    <th key={h} style={{ padding:"9px 12px", textAlign:"left", color:"#64748b", fontWeight:600, fontSize:11, textTransform:"uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ifaces.map(iface=>(
                  <tr key={iface.id} style={{ borderBottom:"1px solid #f1f5f9" }}>
                    <td style={{ padding:"9px 12px", fontFamily:"monospace", fontWeight:600, color:"#374151", fontSize:11 }}>{iface.id}</td>
                    <td style={{ padding:"9px 12px", color:"#64748b", fontSize:11 }}>{editing===iface.id?(
                      <select value={editVal.type} onChange={e=>setEditVal(v=>({...v,type:e.target.value as IfaceType}))}
                        style={{ padding:"3px 6px", border:"1px solid #e2e8f0", borderRadius:3, fontSize:11 }}>
                        <option value="layer3">Layer 3</option>
                        <option value="layer2">Layer 2</option>
                        <option value="tap">TAP</option>
                        <option value="ha">HA</option>
                        <option value="management">Management</option>
                      </select>
                    ):iface.type}</td>
                    <td style={{ padding:"9px 12px" }}>{editing===iface.id?(
                      <select value={editVal.zone} onChange={e=>setEditVal(v=>({...v,zone:e.target.value as IfaceZone}))}
                        style={{ padding:"3px 6px", border:"1px solid #e2e8f0", borderRadius:3, fontSize:11 }}>
                        {ZONES.map(z=><option key={z}>{z}</option>)}
                      </select>
                    ):(
                      <span style={{ padding:"2px 8px", borderRadius:4, fontSize:10, fontWeight:600,
                        background:ZONE_COLOR[iface.zone]+"22", color:ZONE_COLOR[iface.zone] }}>
                        {iface.zone}
                      </span>
                    )}</td>
                    <td style={{ padding:"9px 12px", fontFamily:"monospace", fontSize:11, color:"#374151" }}>{editing===iface.id?(
                      <input value={editVal.ip??""} onChange={e=>setEditVal(v=>({...v,ip:e.target.value}))}
                        placeholder="x.x.x.x/xx"
                        style={{ padding:"3px 6px", border:"1px solid #e2e8f0", borderRadius:3, fontSize:11, width:140 }}/>
                    ):iface.ip||<span style={{ color:"#d1d5db" }}>—</span>}</td>
                    <td style={{ padding:"9px 12px" }}>
                      <span style={{ color:iface.link?"#166534":"#94a3b8", fontSize:11 }}>{iface.link?"● Up":"○ Down"}</span>
                    </td>
                    <td style={{ padding:"9px 12px", color:"#94a3b8", fontSize:11 }}>{editing===iface.id?(
                      <input value={editVal.comment??""} onChange={e=>setEditVal(v=>({...v,comment:e.target.value}))}
                        style={{ padding:"3px 6px", border:"1px solid #e2e8f0", borderRadius:3, fontSize:11, width:160 }}/>
                    ):iface.comment||<span style={{ color:"#e2e8f0" }}>—</span>}</td>
                    <td style={{ padding:"9px 12px" }}>
                      {editing===iface.id?(
                        <div style={{ display:"flex", gap:4 }}>
                          <button onClick={()=>saveEdit(iface.id)} style={{ padding:"2px 8px", fontSize:10, borderRadius:3, background:"#fa4616", color:"#fff", border:"none", cursor:"pointer" }}>Save</button>
                          <button onClick={()=>setEditing(null)} style={{ padding:"2px 8px", fontSize:10, borderRadius:3, border:"1px solid #e2e8f0", background:"#f8fafc", cursor:"pointer", color:"#64748b" }}>Cancel</button>
                        </div>
                      ):(
                        <button onClick={()=>startEdit(iface)} style={{ padding:"2px 8px", fontSize:10, borderRadius:3, border:"1px solid #e2e8f0", background:"#f8fafc", cursor:"pointer", color:"#64748b" }}>Edit</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:14 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:results?12:0 }}>
              <span style={{ fontSize:13, fontWeight:600, color:"#374151" }}>Submit for Grading</span>
              <button onClick={grade} style={{ padding:"6px 16px", fontSize:12, borderRadius:4, background:"#fa4616", color:"#fff", border:"none", cursor:"pointer" }}>Submit</button>
            </div>
            {results && (
              <div>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:8, color:passed===3?"#166534":"#dc2626" }}>
                  {passed===3?"✓ All checks passed!":"Not yet correct"} — {passed}/3 checks
                </div>
                {results.map((r,i)=>(
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid #f1f5f9", fontSize:12 }}>
                    <span style={{ color:"#374151" }}>{r.desc}</span>
                    <span style={{ padding:"1px 8px", borderRadius:3, fontSize:11, fontWeight:600,
                      background:r.pass?"#dcfce7":"#fee2e2", color:r.pass?"#166534":"#991b1b" }}>
                      {r.pass?"PASS":"FAIL"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          {(aiFeedback||loadingFeedback) && (
            <div style={{ background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:8, padding:14, marginBottom:12 }}>
              <div style={{ fontSize:12, fontWeight:600, color:"#9a3412", marginBottom:4 }}>Tutor Feedback</div>
              {loadingFeedback
                ? <div style={{ fontSize:12, color:"#c2410c", fontStyle:"italic" }}>Analysing your configuration…</div>
                : <p style={{ fontSize:12, color:"#7c2d12", margin:0, lineHeight:1.6 }}>{aiFeedback}</p>}
            </div>
          )}

          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:14, marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
              <div style={{ fontSize:12, fontWeight:600, color:"#374151" }}>Knowledge Check</div>
              {session.completedTaskIds.has(scenarioId) && <span style={{ fontSize:10, padding:"1px 6px", borderRadius:3, background:"#dcfce7", color:"#166534", fontWeight:600 }}>Task Complete</span>}
            </div>
            <p style={{ fontSize:11, color:"#64748b", margin:"0 0 10px" }}>Answer correctly to complete without hands-on. <span style={{ color:"#ef4444", fontWeight:500 }}>One attempt only.</span></p>
            {!kqData && !kqLoading && !kqError && (
              <button onClick={loadKQ} style={{ padding:"5px 12px", fontSize:11, borderRadius:4, background:"#fa4616", color:"#fff", border:"none", cursor:"pointer" }}>Load Question</button>
            )}
            {kqLoading && <div style={{ fontSize:12, color:"#94a3b8", fontStyle:"italic" }}>Generating question…</div>}
            {kqError  && <div style={{ fontSize:12, color:"#ef4444" }}>{kqError}</div>}
            {kqData && (
              <>
                <p style={{ fontSize:12, color:"#374151", fontWeight:500, margin:"0 0 10px", lineHeight:1.5 }}>{kqData.question}</p>
                <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:10 }}>
                  {kqData.choices.map((c,i)=>(
                    <label key={i} style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"7px 10px", borderRadius:6, border:`1px solid ${kqSelected===i?"#fa4616":"#e2e8f0"}`, background:kqSelected===i?"#fff7f0":"#f8fafc", cursor:kqLocked||session.completedTaskIds.has(scenarioId)?"not-allowed":"pointer", fontSize:12, lineHeight:1.4 }}>
                      <input type="radio" name={`kq-${scenarioId}`} checked={kqSelected===i} disabled={kqLocked||session.completedTaskIds.has(scenarioId)} onChange={()=>{if(!kqLocked&&!session.completedTaskIds.has(scenarioId)){setKqSelected(i);setKqResult(null);}}} style={{ marginTop:2, flexShrink:0 }}/>
                      {c}
                    </label>
                  ))}
                </div>
                <button onClick={answerKQ} disabled={kqSelected===null||kqLocked||session.completedTaskIds.has(scenarioId)}
                  style={{ padding:"5px 14px", fontSize:11, borderRadius:4, background:"#fa4616", color:"#fff", border:"none", cursor:"pointer", opacity:(kqSelected===null||kqLocked||session.completedTaskIds.has(scenarioId))?0.4:1 }}>
                  Answer
                </button>
                {kqResult==="correct"   && <div style={{ marginTop:8, fontSize:12, color:"#166534", fontWeight:500 }}>✓ Correct — task marked complete.</div>}
                {kqResult==="incorrect" && <div style={{ marginTop:8, fontSize:12, color:"#ef4444", fontWeight:500 }}>✗ Incorrect — question locked. Complete the hands-on exercise instead.</div>}
              </>
            )}
          </div>

          <div style={{ background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:8, padding:12, fontSize:12, color:"#0c4a6e" }}>
            <strong>Key point:</strong> In PAN-OS, an interface must be assigned to a zone before any security policy applies to traffic on it.
            Interfaces in the same zone can communicate freely (intra-zone). All inter-zone traffic requires an explicit security policy rule.
          </div>
        </div>
      </div>
    </div>
  );
}
