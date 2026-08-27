import { useState } from "react";
import { PanSession } from "../../hooks/usePanSession";

type ZoneType = "layer3" | "layer2" | "tap" | "ha" | "management";
type ZoneProfile = "none" | "default" | "strict";
interface Zone { id:number; name:string; type:ZoneType; profile:ZoneProfile; interfaces:string[]; logForwarding:boolean; }

const INTERFACES = ["ethernet1/1","ethernet1/2","ethernet1/3","ethernet1/4","ethernet1/5","ethernet1/6","ethernet1/7","ethernet1/8"];
const ZONE_COLOR: Record<string,string> = { Trust:"#22c55e", Untrust:"#ef4444", DMZ:"#f97316", Management:"#7c3aed", HA:"#3b82f6" };
function getColor(name:string){ return ZONE_COLOR[name]??"#3b82f6"; }

const SCENARIOS = [
  { id:"pan-zone-01", title:"Basic Zone Setup",
    desc:"Create Trust (layer3, eth1/2), Untrust (layer3, eth1/1, strict profile), DMZ (layer3, eth1/3) zones.",
    checks:[
      { desc:"Trust zone exists (layer3)", fn:(z:Zone[])=>z.some(x=>x.name==="Trust"&&x.type==="layer3") },
      { desc:"Untrust zone exists with strict profile", fn:(z:Zone[])=>z.some(x=>x.name==="Untrust"&&x.profile==="strict") },
      { desc:"DMZ zone exists (layer3)", fn:(z:Zone[])=>z.some(x=>x.name==="DMZ"&&x.type==="layer3") },
      { desc:"ethernet1/1 assigned to Untrust", fn:(z:Zone[])=>z.some(x=>x.name==="Untrust"&&x.interfaces.includes("ethernet1/1")) },
      { desc:"ethernet1/2 assigned to Trust",   fn:(z:Zone[])=>z.some(x=>x.name==="Trust"&&x.interfaces.includes("ethernet1/2")) },
    ]
  },
  { id:"pan-zone-02", title:"HA Zone Configuration",
    desc:"Assign ethernet1/6 to HA zone (type=ha). Assign ethernet1/7 to HA zone as well.",
    checks:[
      { desc:"HA zone exists with type=ha", fn:(z:Zone[])=>z.some(x=>x.name==="HA"&&x.type==="ha") },
      { desc:"ethernet1/6 in HA zone",      fn:(z:Zone[])=>z.some(x=>x.name==="HA"&&x.interfaces.includes("ethernet1/6")) },
      { desc:"ethernet1/7 in HA zone",      fn:(z:Zone[])=>z.some(x=>x.name==="HA"&&x.interfaces.includes("ethernet1/7")) },
    ]
  },
  { id:"pan-zone-03", title:"Management Zone Isolation",
    desc:"Create a Management zone (type=management) on ethernet1/8 with log forwarding enabled.",
    checks:[
      { desc:"Management zone exists",                fn:(z:Zone[])=>z.some(x=>x.name==="Management"&&x.type==="management") },
      { desc:"ethernet1/8 in Management zone",        fn:(z:Zone[])=>z.some(x=>x.name==="Management"&&x.interfaces.includes("ethernet1/8")) },
      { desc:"Management zone has log forwarding",    fn:(z:Zone[])=>z.some(x=>x.name==="Management"&&x.logForwarding) },
    ]
  },
];

export function PanZones({ session }: { session: PanSession }) {
  const [scenIdx, setSceIdx] = useState(0);
  const scenario = SCENARIOS[scenIdx];
  const [zones, setZones] = useState<Zone[]>([]);
  const [nextId, setNextId] = useState(1);
  const [adding, setAdding] = useState(false);
  const [nz, setNz] = useState<Partial<Zone>>({ name:"", type:"layer3", profile:"none", interfaces:[], logForwarding:false });
  const [results, setResults] = useState<{desc:string;pass:boolean}[]|null>(null);
  const [aiFeedback, setAiFeedback] = useState<string|null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [kqLoading, setKqLoading] = useState(false);
  const [kqError, setKqError] = useState<string|null>(null);
  const [kqData, setKqData] = useState<{question:string;choices:string[];correctIndex:number}|null>(null);
  const [kqSelected, setKqSelected] = useState<number|null>(null);
  const [kqResult, setKqResult] = useState<"correct"|"incorrect"|null>(null);
  const [kqLocked, setKqLocked] = useState(false);
  const [selected, setSelected] = useState<Zone|null>(null);

  function addZone() {
    if (!nz.name) return;
    setZones(z=>[...z,{ id:nextId, name:nz.name!, type:nz.type!, profile:nz.profile!, interfaces:nz.interfaces??[], logForwarding:nz.logForwarding??false }]);
    setNextId(n=>n+1); setAdding(false); setResults(null);
    setNz({ name:"", type:"layer3", profile:"none", interfaces:[], logForwarding:false });
  }
  function delZone(id:number){ setZones(z=>z.filter(x=>x.id!==id)); setResults(null); }
  function toggleIface(i:string){ setNz(z=>({...z,interfaces:z.interfaces?.includes(i)?z.interfaces.filter(x=>x!==i):[...(z.interfaces??[]),i]})); }

  function grade() {
    const res = scenario.checks.map(c=>({ desc:c.desc, pass:c.fn(zones) }));
    setResults(res);
    if (res.every(r=>r.pass)) { session.markTaskComplete(scenario.id); }
    else {
      const failing = res.filter(r=>!r.pass).map(r=>r.desc);
      setLoadingFeedback(true); setAiFeedback(null);
      fetch("/api/pan/feedback",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({exerciseTitle:scenario.title,failingChecks:failing})})
        .then(r=>r.json()).then(d=>setAiFeedback(d.feedback??null)).catch(()=>setAiFeedback(null)).finally(()=>setLoadingFeedback(false));
    }
  }

  function loadKQ() {
    setKqLoading(true);setKqError(null);setKqData(null);setKqSelected(null);setKqResult(null);setKqLocked(false);
    fetch(`/api/pan/knowledge-check/${scenario.id}`)
      .then(r=>r.ok?r.json():Promise.reject(r.status))
      .then(d=>setKqData(d)).catch(e=>setKqError("Failed: "+e)).finally(()=>setKqLoading(false));
  }

  function answerKQ() {
    if (kqSelected===null||!kqData||kqLocked) return;
    if (kqSelected===kqData.correctIndex){setKqResult("correct");session.markTaskComplete(scenario.id);}
    else{setKqResult("incorrect");setKqLocked(true);}
  }

  const passed = results?.filter(r=>r.pass).length??0;

  return (
    <div style={{ maxWidth:900 }}>
      <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:16 }}>
        <div>
          <h1 style={{ fontSize:18, fontWeight:700, color:"#1e293b", margin:0 }}>Security Zones</h1>
          <p style={{ color:"#64748b", fontSize:12, marginTop:4 }}>All inter-zone traffic is denied by default in PAN-OS.</p>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {SCENARIOS.map((s,i)=>(
            <button key={s.id} onClick={()=>{ setSceIdx(i); setZones([]); setResults(null); }}
              style={{ padding:"4px 10px", fontSize:11, borderRadius:4, cursor:"pointer",
                background:scenIdx===i?"#3b82f6":"transparent", color:scenIdx===i?"#fff":"#64748b",
                border:`1px solid ${scenIdx===i?"#3b82f6":"#e2e8f0"}` }}>
              {i+1}. {s.title.split(" ").slice(0,2).join(" ")}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:8, padding:14, marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:600, color:"#1e40af", marginBottom:4 }}>{scenario.title}</div>
        <p style={{ fontSize:12, color:"#1e3a8a", margin:0 }}>{scenario.desc}</p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 260px", gap:16 }}>
        <div>
          {/* Topology */}
          {zones.length>0 && (
            <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:14, marginBottom:12 }}>
              <div style={{ fontSize:11, color:"#64748b", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.05em" }}>Zone Topology</div>
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                {zones.map((z,i)=>(
                  <div key={z.id} style={{ display:"flex", alignItems:"center" }}>
                    <div onClick={()=>setSelected(selected?.id===z.id?null:z)}
                      style={{ padding:"10px 16px", borderRadius:6, border:`2px solid ${getColor(z.name)}`,
                        background:`${getColor(z.name)}11`, cursor:"pointer", textAlign:"center",
                        boxShadow:selected?.id===z.id?`0 0 10px ${getColor(z.name)}44`:"none" }}>
                      <div style={{ fontSize:12, fontWeight:700, color:getColor(z.name) }}>{z.name}</div>
                      <div style={{ fontSize:10, color:"#94a3b8" }}>{z.type}</div>
                    </div>
                    {i<zones.length-1 && <div style={{ width:30, height:1, background:"#e2e8f0", margin:"0 4px" }}/>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Zone table */}
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, overflow:"hidden", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderBottom:"1px solid #f1f5f9" }}>
              <span style={{ fontSize:12, fontWeight:600, color:"#374151" }}>Zones ({zones.length})</span>
              <button onClick={()=>setAdding(!adding)}
                style={{ padding:"4px 12px", fontSize:11, borderRadius:4, background:"#3b82f6", color:"#fff", border:"none", cursor:"pointer" }}>+ Add Zone</button>
            </div>
            {zones.length===0 && <div style={{ padding:20, textAlign:"center", color:"#94a3b8", fontSize:12 }}>No zones yet — click Add Zone</div>}
            {zones.map(z=>(
              <div key={z.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 14px", borderBottom:"1px solid #f8fafc", fontSize:12 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:getColor(z.name), flexShrink:0 }}/>
                <span style={{ fontWeight:600, color:"#374151", minWidth:90 }}>{z.name}</span>
                <span style={{ color:"#64748b", minWidth:80 }}>{z.type}</span>
                <span style={{ padding:"1px 6px", borderRadius:3, fontSize:10,
                  background:z.profile==="strict"?"#fee2e2":z.profile==="default"?"#dbeafe":"#f1f5f9",
                  color:z.profile==="strict"?"#991b1b":z.profile==="default"?"#1d4ed8":"#64748b" }}>{z.profile}</span>
                <span style={{ color:"#94a3b8", flex:1, fontSize:11 }}>{z.interfaces.join(", ")||"—"}</span>
                <span style={{ color:z.logForwarding?"#166534":"#94a3b8", fontSize:11 }}>{z.logForwarding?"Log ✓":""}</span>
                <button onClick={()=>delZone(z.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#ef4444", fontSize:12 }}>✕</button>
              </div>
            ))}
          </div>

          {/* Add zone form */}
          {adding && (
            <div style={{ background:"#fff", border:"1px solid #3b82f644", borderRadius:8, padding:14, marginBottom:12 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:10 }}>
                {[["Zone Name","text","name"],["Type","sel","type"],["Protection Profile","sel","profile"]].map(([label,type,key])=>(
                  <div key={key}>
                    <label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:3 }}>{label}</label>
                    {type==="text"
                      ? <input value={(nz as any)[key]??""} onChange={e=>setNz(z=>({...z,[key]:e.target.value}))}
                          style={{ width:"100%", padding:"6px 8px", border:"1px solid #e2e8f0", borderRadius:4, fontSize:12, boxSizing:"border-box" as any }}/>
                      : key==="type"
                        ? <select value={nz.type} onChange={e=>setNz(z=>({...z,type:e.target.value as ZoneType}))}
                            style={{ width:"100%", padding:"6px 8px", border:"1px solid #e2e8f0", borderRadius:4, fontSize:12 }}>
                            {["layer3","layer2","tap","ha","management"].map(o=><option key={o}>{o}</option>)}
                          </select>
                        : <select value={nz.profile} onChange={e=>setNz(z=>({...z,profile:e.target.value as ZoneProfile}))}
                            style={{ width:"100%", padding:"6px 8px", border:"1px solid #e2e8f0", borderRadius:4, fontSize:12 }}>
                            {["none","default","strict"].map(o=><option key={o}>{o}</option>)}
                          </select>
                    }
                  </div>
                ))}
              </div>
              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:6 }}>Assign Interfaces</label>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                  {INTERFACES.map(i=>(
                    <button key={i} onClick={()=>toggleIface(i)}
                      style={{ padding:"3px 9px", fontSize:11, borderRadius:4, cursor:"pointer",
                        border:`1.5px solid ${nz.interfaces?.includes(i)?"#3b82f6":"#e2e8f0"}`,
                        background:nz.interfaces?.includes(i)?"#dbeafe":"#f8fafc",
                        color:nz.interfaces?.includes(i)?"#1d4ed8":"#64748b" }}>{i}</button>
                  ))}
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, cursor:"pointer" }}>
                  <input type="checkbox" checked={nz.logForwarding} onChange={e=>setNz(z=>({...z,logForwarding:e.target.checked}))}/>
                  Log Forwarding
                </label>
                <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
                  <button onClick={()=>setAdding(false)} style={{ padding:"5px 12px", fontSize:11, borderRadius:4, border:"1px solid #e2e8f0", background:"#f8fafc", cursor:"pointer", color:"#64748b" }}>Cancel</button>
                  <button onClick={addZone} disabled={!nz.name} style={{ padding:"5px 12px", fontSize:11, borderRadius:4, background:"#3b82f6", color:"#fff", border:"none", cursor:"pointer", opacity:!nz.name?0.4:1 }}>Add Zone</button>
                </div>
              </div>
            </div>
          )}

          {/* AI Feedback */}
          {(aiFeedback||loadingFeedback) && (
            <div style={{ background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:8, padding:14, marginBottom:12 }}>
              <div style={{ fontSize:12, fontWeight:600, color:"#9a3412", marginBottom:4 }}>Tutor Feedback</div>
              {loadingFeedback?<div style={{ fontSize:12, color:"#c2410c", fontStyle:"italic" }}>Analysing…</div>:<p style={{ fontSize:12, color:"#7c2d12", margin:0, lineHeight:1.6 }}>{aiFeedback}</p>}
            </div>
          )}

          {/* Knowledge Check */}
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:14, marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
              <span style={{ fontSize:12, fontWeight:600, color:"#374151" }}>Knowledge Check</span>
              {session.completedTaskIds.has(scenario.id) && <span style={{ fontSize:10, padding:"1px 6px", borderRadius:3, background:"#dcfce7", color:"#166534", fontWeight:600 }}>Complete</span>}
            </div>
            <p style={{ fontSize:11, color:"#64748b", margin:"0 0 8px" }}>Answer correctly to complete without hands-on. <span style={{ color:"#ef4444", fontWeight:500 }}>One attempt only.</span></p>
            {!kqData&&!kqLoading&&!kqError&&<button onClick={loadKQ} style={{ padding:"4px 12px", fontSize:11, borderRadius:4, background:"#3b82f6", color:"#fff", border:"none", cursor:"pointer" }}>Load Question</button>}
            {kqLoading&&<div style={{ fontSize:12, color:"#94a3b8", fontStyle:"italic" }}>Generating…</div>}
            {kqError&&<div style={{ fontSize:12, color:"#ef4444" }}>{kqError}</div>}
            {kqData&&(<>
              <p style={{ fontSize:12, color:"#374151", fontWeight:500, margin:"0 0 8px", lineHeight:1.5 }}>{kqData.question}</p>
              <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:8 }}>
                {kqData.choices.map((c,i)=>(
                  <label key={i} style={{ display:"flex", gap:8, padding:"6px 10px", borderRadius:5, border:`1px solid ${kqSelected===i?"#3b82f6":"#e2e8f0"}`, background:kqSelected===i?"#eff6ff":"#f8fafc", cursor:kqLocked||session.completedTaskIds.has(scenario.id)?"not-allowed":"pointer", fontSize:12 }}>
                    <input type="radio" checked={kqSelected===i} disabled={kqLocked||session.completedTaskIds.has(scenario.id)} onChange={()=>{if(!kqLocked&&!session.completedTaskIds.has(scenario.id)){setKqSelected(i);setKqResult(null);}}}/>
                    {c}
                  </label>
                ))}
              </div>
              <button onClick={answerKQ} disabled={kqSelected===null||kqLocked||session.completedTaskIds.has(scenario.id)}
                style={{ padding:"4px 12px", fontSize:11, borderRadius:4, background:"#3b82f6", color:"#fff", border:"none", cursor:"pointer", opacity:(kqSelected===null||kqLocked||session.completedTaskIds.has(scenario.id))?0.4:1 }}>
                Answer
              </button>
              {kqResult==="correct"&&<div style={{ marginTop:6, fontSize:12, color:"#166534", fontWeight:500 }}>✓ Correct — task complete.</div>}
              {kqResult==="incorrect"&&<div style={{ marginTop:6, fontSize:12, color:"#ef4444", fontWeight:500 }}>✗ Incorrect — locked. Complete the hands-on exercise.</div>}
            </>)}
          </div>

          {/* Grading */}
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:14 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:results?12:0 }}>
              <span style={{ fontSize:13, fontWeight:600, color:"#374151" }}>Submit for Grading</span>
              <button onClick={grade} style={{ padding:"6px 16px", fontSize:12, borderRadius:4, background:"#3b82f6", color:"#fff", border:"none", cursor:"pointer" }}>Submit</button>
            </div>
            {results && (
              <div>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:8, color:passed===scenario.checks.length?"#166534":"#dc2626" }}>
                  {passed===scenario.checks.length?"✓ All checks passed!":"Not yet correct"} — {passed}/{scenario.checks.length}
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

        {/* Right: concept */}
        <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:14 }}>
          <div style={{ fontSize:12, fontWeight:600, color:"#374151", marginBottom:10 }}>Zone Types</div>
          {[["layer3","Routed interfaces — most common","#22c55e"],["layer2","Switched interfaces","#3b82f6"],["tap","Mirror/monitoring only","#94a3b8"],["ha","HA heartbeat links","#7c3aed"],["management","OOB management","#f97316"]].map(([t,d,c])=>(
            <div key={t} style={{ marginBottom:8, paddingBottom:8, borderBottom:"1px solid #f8fafc" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                <span style={{ background:c+"22", color:c, padding:"1px 6px", borderRadius:3, fontSize:10, fontWeight:600 }}>{t}</span>
              </div>
              <div style={{ fontSize:11, color:"#64748b" }}>{d}</div>
            </div>
          ))}
          <div style={{ background:"#f0f9ff", borderRadius:6, padding:10, marginTop:10 }}>
            <div style={{ fontSize:11, fontWeight:600, color:"#0369a1", marginBottom:4 }}>Key Rule</div>
            <p style={{ fontSize:11, color:"#0c4a6e", margin:0, lineHeight:1.5 }}>
              Interfaces in the SAME zone talk freely. All inter-zone traffic needs an explicit security policy rule.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
