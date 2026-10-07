import { useKnowledgeCheck } from "../../hooks/useKnowledgeCheck";
import { usePanGrading } from "../../hooks/usePanGrading";
import { PAN_NAT_SCENARIOS as SCENARIOS } from "@fortisim/engine";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { PanSession } from "../../hooks/usePanSession";

type NATType = "source" | "destination" | "static";
interface NATRule { id:number; name:string; type:NATType; srcZone:string; dstZone:string; dstAddr:string; translated:string; }


const TYPE_COLOR: Record<NATType,string> = { source:"#3b82f6", destination:"#f97316", static:"#7c3aed" };

export function PanNAT({ session }: { session: PanSession }) {
  const location = useLocation();
  const [scenIdx, setSceIdx] = useState(() => Math.max(0, SCENARIOS.findIndex(scenario => scenario.id === (location.state?.taskId ?? new URLSearchParams(location.search).get("task")))));
  const scenario = SCENARIOS[scenIdx];
  const [rules, setRules] = useState<NATRule[]>([]);
  const [nextId, setNextId] = useState(1);
  const [adding, setAdding] = useState(false);
  const [nr, setNr] = useState<Partial<NATRule>>({ name:"", type:"source", srcZone:"Trust", dstZone:"Untrust", dstAddr:"any", translated:"" });
  const { results, setResults, aiFeedback, loadingFeedback, grading, gradeError, grade: submitGrade } = usePanGrading(scenario.id, scenario.title, session.markTaskComplete);
  const { kqLoading, kqError, kqData, kqSelected, setKqSelected, kqResult, kqLocked, loadKQ, answerKQ } = useKnowledgeCheck("paloalto", scenario.id, session.markTaskComplete);


  useEffect(() => {
    const id = location.state?.taskId ?? new URLSearchParams(location.search).get("task");
    const index = SCENARIOS.findIndex(scenario => scenario.id === id);
    if (index >= 0) setSceIdx(index);
  }, [location.key]);
  useEffect(() => { setRules([]); setResults(null); }, [scenario.id]);

  function addRule() {
    if (!nr.name||!nr.translated) return;
    setRules(r=>[...r,{ id:nextId, name:nr.name!, type:nr.type!, srcZone:nr.srcZone!, dstZone:nr.dstZone!, dstAddr:nr.dstAddr||"any", translated:nr.translated! }]);
    setNextId(n=>n+1); setAdding(false); setResults(null);
    setNr({ name:"", type:"source", srcZone:"Trust", dstZone:"Untrust", dstAddr:"any", translated:"" });
  }

  function grade() { void submitGrade(rules); }


  const passed = results?.filter(r=>r.pass).length??0;

  return (
    <div style={{ maxWidth:900 }}>
      {gradeError && <p className="platform-error" role="alert">{gradeError}</p>}
      <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:16 }}>
        <div>
          <h1 style={{ fontSize:18, fontWeight:700, color:"#1e293b", margin:0 }}>NAT Policy</h1>
          <p style={{ color:"#64748b", fontSize:12, marginTop:4 }}>NAT uses pre-NAT zones. Security policy uses original addresses and post-NAT zones. Translation alone does not permit traffic.</p>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {SCENARIOS.map((s,i)=>(
            <button key={s.id} onClick={()=>{ setSceIdx(i); setRules([]); setResults(null); }}
              style={{ padding:"4px 10px", fontSize:11, borderRadius:4, cursor:"pointer",
                background:scenIdx===i?"#7c3aed":"transparent", color:scenIdx===i?"#fff":"#64748b",
                border:`1px solid ${scenIdx===i?"#7c3aed":"#e2e8f0"}` }}>
              {i+1}. {s.title.split(" ").slice(0,2).join(" ")}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background:"#faf5ff", border:"1px solid #e9d5ff", borderRadius:8, padding:14, marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:600, color:"#6b21a8", marginBottom:4 }}>{scenario.title}</div>
        <p style={{ fontSize:12, color:"#581c87", margin:0 }}>{scenario.desc}</p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 260px", gap:16 }}>
        <div>
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, overflow:"hidden", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderBottom:"1px solid #f1f5f9" }}>
              <span style={{ fontSize:12, fontWeight:600, color:"#374151" }}>NAT Rules ({rules.length})</span>
              <button onClick={()=>setAdding(!adding)}
                style={{ padding:"4px 12px", fontSize:11, borderRadius:4, background:"#7c3aed", color:"#fff", border:"none", cursor:"pointer" }}>+ Add Rule</button>
            </div>
            {rules.length===0 && <div style={{ padding:20, textAlign:"center", color:"#94a3b8", fontSize:12 }}>No rules yet</div>}
            {rules.map((r,i)=>(
              <div key={r.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 14px", borderBottom:"1px solid #f8fafc", fontSize:12 }}>
                <span style={{ color:"#94a3b8", width:20 }}>{i+1}</span>
                <span style={{ fontWeight:500, color:"#374151", minWidth:140 }}>{r.name}</span>
                <span style={{ padding:"2px 7px", borderRadius:3, fontSize:10, fontWeight:600, background:TYPE_COLOR[r.type]+"22", color:TYPE_COLOR[r.type] }}>{r.type}</span>
                <span style={{ color:"#64748b", fontSize:11 }}>{r.srcZone}→{r.dstZone}</span>
                <span style={{ color:"#94a3b8", fontSize:11, flex:1 }}>{r.dstAddr}</span>
                <span style={{ color:"#7c3aed", fontFamily:"monospace", fontSize:11 }}>→ {r.translated}</span>
                <button onClick={()=>{ setRules(x=>x.filter(y=>y.id!==r.id)); setResults(null); }}
                  style={{ background:"none", border:"none", cursor:"pointer", color:"#ef4444" }}>✕</button>
              </div>
            ))}
          </div>

          {adding && (
            <div style={{ background:"#fff", border:"1px solid #7c3aed44", borderRadius:8, padding:14, marginBottom:12 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:10 }}>
                {[["Name","name","text"],["NAT Type","type","sel-type"],["Translated To","translated","text"],
                  ["Src Zone","srcZone","sel-zone"],["Dst Zone","dstZone","sel-zone"],["Original Dst","dstAddr","text"]].map(([label,key,type])=>(
                  <div key={key}>
                    <label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:3 }}>{label}</label>
                    {type==="text"
                      ? <input value={(nr as any)[key]??""} onChange={e=>setNr(x=>({...x,[key]:e.target.value}))}
                          placeholder={key==="translated"?"e.g. interface / 10.0.1.10":""}
                          style={{ width:"100%", padding:"6px 8px", border:"1px solid #e2e8f0", borderRadius:4, fontSize:12, boxSizing:"border-box" as any }}/>
                      : type==="sel-type"
                        ? <select value={nr.type} onChange={e=>setNr(x=>({...x,type:e.target.value as NATType}))}
                            style={{ width:"100%", padding:"6px 8px", border:"1px solid #e2e8f0", borderRadius:4, fontSize:12 }}>
                            {["source","destination","static"].map(o=><option key={o}>{o}</option>)}
                          </select>
                        : <select value={(nr as any)[key]} onChange={e=>setNr(x=>({...x,[key]:e.target.value}))}
                            style={{ width:"100%", padding:"6px 8px", border:"1px solid #e2e8f0", borderRadius:4, fontSize:12 }}>
                            {["Trust","Untrust","DMZ","any"].map(o=><option key={o}>{o}</option>)}
                          </select>
                    }
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", justifyContent:"flex-end", gap:6 }}>
                <button onClick={()=>setAdding(false)} style={{ padding:"5px 12px", fontSize:11, borderRadius:4, border:"1px solid #e2e8f0", background:"#f8fafc", cursor:"pointer", color:"#64748b" }}>Cancel</button>
                <button onClick={addRule} disabled={!nr.name||!nr.translated}
                  style={{ padding:"5px 12px", fontSize:11, borderRadius:4, background:"#7c3aed", color:"#fff", border:"none", cursor:"pointer", opacity:(!nr.name||!nr.translated)?0.4:1 }}>Add</button>
              </div>
            </div>
          )}

          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:14 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:results?12:0 }}>
              <span style={{ fontSize:13, fontWeight:600, color:"#374151" }}>Submit for Grading</span>
              <button disabled={grading} onClick={grade} style={{ padding:"6px 16px", fontSize:12, borderRadius:4, background:"#7c3aed", color:"#fff", border:"none", cursor:"pointer" }}>Submit</button>
            </div>
            {results && (
              <div>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:8, color:passed===scenario.checks.length?"#166534":"#dc2626" }}>
                  {passed===scenario.checks.length?"✓ Passed!":"Not yet"} — {passed}/{scenario.checks.length}
                </div>
                {results.map((r,i)=>(
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid #f1f5f9", fontSize:12 }}>
                    <span style={{ color:"#374151" }}>{r.desc}</span>
                    <span style={{ padding:"1px 8px", borderRadius:3, fontSize:11, fontWeight:600, background:r.pass?"#dcfce7":"#fee2e2", color:r.pass?"#166534":"#991b1b" }}>{r.pass?"PASS":"FAIL"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(aiFeedback||loadingFeedback)&&(
            <div style={{ background:"#faf5ff", border:"1px solid #e9d5ff", borderRadius:8, padding:14, marginBottom:12 }}>
              <div style={{ fontSize:12, fontWeight:600, color:"#6b21a8", marginBottom:4 }}>Tutor Feedback</div>
              {loadingFeedback?<div style={{ fontSize:12, color:"#7c3aed", fontStyle:"italic" }}>Analysing…</div>:<p style={{ fontSize:12, color:"#581c87", margin:0, lineHeight:1.6 }}>{aiFeedback}</p>}
            </div>
          )}
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:14, marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
              <span style={{ fontSize:12, fontWeight:600, color:"#374151" }}>Knowledge Check</span>
              {session.completedTaskIds.has(scenario.id)&&<span style={{ fontSize:10, padding:"1px 6px", borderRadius:3, background:"#dcfce7", color:"#166534", fontWeight:600 }}>Complete</span>}
            </div>
            <p style={{ fontSize:11, color:"#64748b", margin:"0 0 8px" }}>Answer correctly to complete without hands-on. <span style={{ color:"#ef4444", fontWeight:500 }}>One attempt only.</span></p>
            {!kqData&&!kqLoading&&!kqError&&<button onClick={loadKQ} style={{ padding:"4px 12px", fontSize:11, borderRadius:4, background:"#7c3aed", color:"#fff", border:"none", cursor:"pointer" }}>Load Question</button>}
            {kqLoading&&<div style={{ fontSize:12, color:"#94a3b8", fontStyle:"italic" }}>Generating…</div>}
            {kqError&&<div style={{ fontSize:12, color:"#ef4444" }}>{kqError}</div>}
            {kqData&&(<>
              <p style={{ fontSize:12, color:"#374151", fontWeight:500, margin:"0 0 8px", lineHeight:1.5 }}>{kqData.question}</p>
              <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:8 }}>
                {kqData.choices.map((c,i)=>(
                  <label key={i} style={{ display:"flex", gap:8, padding:"6px 10px", borderRadius:5, border:`1px solid ${kqSelected===i?"#7c3aed":"#e2e8f0"}`, background:kqSelected===i?"#faf5ff":"#f8fafc", cursor:kqLocked||session.completedTaskIds.has(scenario.id)?"not-allowed":"pointer", fontSize:12 }}>
                    <input type="radio" checked={kqSelected===i} disabled={kqLocked||session.completedTaskIds.has(scenario.id)} onChange={()=>{if(!kqLocked&&!session.completedTaskIds.has(scenario.id)){setKqSelected(i);}}}/>
                    {c}
                  </label>
                ))}
              </div>
              <button onClick={answerKQ} disabled={kqSelected===null||kqLocked||session.completedTaskIds.has(scenario.id)}
                style={{ padding:"4px 12px", fontSize:11, borderRadius:4, background:"#7c3aed", color:"#fff", border:"none", cursor:"pointer", opacity:(kqSelected===null||kqLocked||session.completedTaskIds.has(scenario.id))?0.4:1 }}>
                Answer
              </button>
              {kqResult==="correct"&&<div style={{ marginTop:6, fontSize:12, color:"#166534", fontWeight:500 }}>✓ Correct — task complete.</div>}
              {kqResult==="incorrect"&&<div style={{ marginTop:6, fontSize:12, color:"#ef4444", fontWeight:500 }}>✗ Incorrect — locked.</div>}
            </>)}
          </div>

        </div>

        <div>
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:14, marginBottom:12 }}>
            <div style={{ fontSize:12, fontWeight:600, color:"#374151", marginBottom:10 }}>NAT Types</div>
            {[["source","#3b82f6","SNAT — translate source IP outbound"],["destination","#f97316","DNAT — redirect inbound traffic"],["static","#7c3aed","1:1 bidirectional mapping"]].map(([t,c,d])=>(
              <div key={t} style={{ marginBottom:8, paddingBottom:8, borderBottom:"1px solid #f8fafc" }}>
                <span style={{ background:c+"22", color:c, padding:"1px 6px", borderRadius:3, fontSize:10, fontWeight:600 }}>{t}</span>
                <div style={{ fontSize:11, color:"#64748b", marginTop:3 }}>{d}</div>
              </div>
            ))}
          </div>
          <div style={{ background:"#faf5ff", border:"1px solid #e9d5ff", borderRadius:8, padding:12 }}>
            <div style={{ fontSize:11, fontWeight:600, color:"#6b21a8", marginBottom:4 }}>⚠ PAN-OS Order</div>
            <p style={{ fontSize:11, color:"#581c87", margin:0, lineHeight:1.5 }}>
              Security policy is checked FIRST. NAT is applied AFTER. Always create a security rule allowing the traffic before creating the NAT rule.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
