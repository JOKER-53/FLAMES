import { useState } from "react";

type Action = "allow" | "deny";
type AppOption = { id: string; label: string; ports: string; risk: string };

const APP_OPTIONS: AppOption[] = [
  { id:"web-browsing", label:"web-browsing", ports:"TCP/80", risk:"low" },
  { id:"ssl",          label:"ssl",          ports:"TCP/443", risk:"low" },
  { id:"dns",          label:"dns",          ports:"UDP/53",  risk:"low" },
  { id:"ssh",          label:"ssh",          ports:"TCP/22",  risk:"medium" },
  { id:"ftp",          label:"ftp",          ports:"TCP/21",  risk:"medium" },
  { id:"smtp",         label:"smtp",         ports:"TCP/25",  risk:"medium" },
  { id:"rdp",          label:"rdp",          ports:"TCP/3389",risk:"high" },
  { id:"bittorrent",   label:"bittorrent",   ports:"varies",  risk:"high" },
  { id:"any",          label:"any",          ports:"any",     risk:"—" },
];

const ZONES = ["Trust","Untrust","DMZ","Management","any"];

interface Rule {
  id: number;
  name: string;
  srcZone: string;
  dstZone: string;
  apps: string[];
  action: Action;
}

const SCENARIOS = [
  {
    id: "pan-basic-01",
    title: "Basic Outbound Access",
    description: "Allow internal users (Trust zone) to browse the web and use DNS. Block everything else. Remember: PAN-OS uses App-ID — specify the application, not the port.",
    hint: "You need two rules: one allowing web-browsing+ssl+dns from Trust→Untrust, and a deny-all at the bottom.",
    checks: [
      { desc:"Allow web-browsing from Trust → Untrust", fn: (r:Rule[]) => r.some(x=>x.action==="allow"&&x.srcZone==="Trust"&&x.dstZone==="Untrust"&&x.apps.includes("web-browsing")) },
      { desc:"Allow ssl from Trust → Untrust",          fn: (r:Rule[]) => r.some(x=>x.action==="allow"&&x.srcZone==="Trust"&&x.dstZone==="Untrust"&&x.apps.includes("ssl")) },
      { desc:"Allow dns from Trust → Untrust",          fn: (r:Rule[]) => r.some(x=>x.action==="allow"&&x.srcZone==="Trust"&&x.dstZone==="Untrust"&&x.apps.includes("dns")) },
      { desc:"Deny-all rule exists at bottom",          fn: (r:Rule[]) => r.length>0&&r[r.length-1].action==="deny"&&r[r.length-1].srcZone==="any"&&r[r.length-1].dstZone==="any" },
    ],
  },
  {
    id: "pan-dmz-01",
    title: "DMZ Web Server Access",
    description: "A web server in the DMZ must accept HTTPS (ssl) from Untrust (internet). Internal Trust users can also reach it via HTTP (web-browsing) and HTTPS. DMZ must NOT initiate connections to Trust.",
    hint: "Three rules: Untrust→DMZ allow ssl; Trust→DMZ allow web-browsing+ssl; DMZ→Trust deny.",
    checks: [
      { desc:"Allow ssl from Untrust → DMZ",            fn:(r:Rule[])=>r.some(x=>x.action==="allow"&&x.srcZone==="Untrust"&&x.dstZone==="DMZ"&&x.apps.includes("ssl")) },
      { desc:"Allow web-browsing from Trust → DMZ",     fn:(r:Rule[])=>r.some(x=>x.action==="allow"&&x.srcZone==="Trust"&&x.dstZone==="DMZ"&&x.apps.includes("web-browsing")) },
      { desc:"Block DMZ → Trust traffic",               fn:(r:Rule[])=>r.some(x=>x.action==="deny"&&x.srcZone==="DMZ"&&(x.dstZone==="Trust"||x.dstZone==="any")&&x.apps.some(a=>a==="any"||a==="web-browsing")) },
    ],
  },
  {
    id: "pan-appid-01",
    title: "App-ID Enforcement",
    description: "Block high-risk applications (bittorrent, rdp) for all users while allowing general web access. Show why App-ID beats port-based rules: RDP on TCP/3389 could be renamed — App-ID catches it regardless.",
    hint: "Block bittorrent and rdp explicitly (any→any deny), then allow web-browsing+ssl from Trust→Untrust.",
    checks: [
      { desc:"Block bittorrent (any zone)",             fn:(r:Rule[])=>r.some(x=>x.action==="deny"&&x.apps.includes("bittorrent")) },
      { desc:"Block rdp (any zone)",                    fn:(r:Rule[])=>r.some(x=>x.action==="deny"&&x.apps.includes("rdp")) },
      { desc:"Allow web-browsing Trust→Untrust",        fn:(r:Rule[])=>r.some(x=>x.action==="allow"&&x.srcZone==="Trust"&&x.dstZone==="Untrust"&&x.apps.includes("web-browsing")) },
      { desc:"Block rules placed BEFORE allow rules",   fn:(r:Rule[])=>{
        const blockIdx = Math.min(...r.filter(x=>x.apps.includes("bittorrent")||x.apps.includes("rdp")).map((_,i)=>i));
        const allowIdx = r.findIndex(x=>x.action==="allow"&&x.apps.includes("web-browsing"));
        return blockIdx < allowIdx;
      }},
    ],
  },
];

const RISK_COLOR: Record<string,string> = { low:"#22c55e", medium:"#f97316", high:"#ef4444", "—":"#94a3b8" };

import { PanSession } from "../../hooks/usePanSession";
export function PanSecurityPolicy({ session }: { session: PanSession }) {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const scenario = SCENARIOS[scenarioIdx];
  const [rules, setRules] = useState<Rule[]>([]);
  const [nextId, setNextId] = useState(1);
  const [showNew, setShowNew] = useState(false);
  const [newRule, setNewRule] = useState<Partial<Rule>>({ srcZone:"Trust", dstZone:"Untrust", apps:[], action:"allow", name:"" });
  const [results, setResults] = useState<{desc:string;pass:boolean}[]|null>(null);
  const [showHint, setShowHint] = useState(false);

  function addRule() {
    if (!newRule.name || !newRule.apps?.length) return;
    setRules(r => [...r, { id:nextId, name:newRule.name!, srcZone:newRule.srcZone!, dstZone:newRule.dstZone!, apps:newRule.apps!, action:newRule.action! }]);
    setNextId(n=>n+1);
    setNewRule({ srcZone:"Trust", dstZone:"Untrust", apps:[], action:"allow", name:"" });
    setShowNew(false);
    setResults(null);
  }

  function deleteRule(id:number) { setRules(r=>r.filter(x=>x.id!==id)); setResults(null); }
  function moveUp(idx:number) { if(idx===0)return; const r=[...rules]; [r[idx-1],r[idx]]=[r[idx],r[idx-1]]; setRules(r); setResults(null); }
  function moveDown(idx:number) { if(idx===rules.length-1)return; const r=[...rules]; [r[idx],r[idx+1]]=[r[idx+1],r[idx]]; setRules(r); setResults(null); }

  function grade() {
    const res = scenario.checks.map(c=>({ desc:c.desc, pass:c.fn(rules) }));
    setResults(res);
    if (res.every(r=>r.pass)) session.markTaskComplete(scenario.id);
  }

  function toggleApp(app:string) {
    setNewRule(r=>({ ...r, apps: r.apps?.includes(app) ? r.apps.filter(a=>a!==app) : [...(r.apps??[]),app] }));
  }

  const passed = results?.filter(r=>r.pass).length??0;
  const total  = scenario.checks.length;

  return (
    <div style={{ maxWidth:1100 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:16 }}>
        <div>
          <h1 style={{ fontSize:18, fontWeight:700, color:"#1e293b", margin:0 }}>Security Policy — PAN-OS</h1>
          <p style={{ color:"#64748b", fontSize:12, marginTop:4 }}>App-ID based rules. First match wins. Rules evaluated top-down.</p>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {SCENARIOS.map((s,i)=>(
            <button key={s.id} onClick={()=>{ setScenarioIdx(i); setRules([]); setResults(null); setShowHint(false); }}
              style={{ padding:"4px 12px", fontSize:11, borderRadius:4, cursor:"pointer",
                background:scenarioIdx===i?"#fa4616":"transparent",
                color:scenarioIdx===i?"#fff":"#64748b",
                border:`1px solid ${scenarioIdx===i?"#fa4616":"#e2e8f0"}` }}>
              {i+1}. {s.title.split(" ").slice(0,2).join(" ")}
            </button>
          ))}
        </div>
      </div>

      {/* Scenario description */}
      <div style={{ background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:8, padding:14, marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:600, color:"#9a3412", marginBottom:4 }}>{scenario.title}</div>
        <p style={{ fontSize:12, color:"#7c2d12", margin:0, lineHeight:1.6 }}>{scenario.description}</p>
        <button onClick={()=>setShowHint(!showHint)}
          style={{ marginTop:8, background:"none", border:"none", color:"#fa4616", fontSize:11, cursor:"pointer", padding:0 }}>
          {showHint?"▼ Hide hint":"▶ Show hint"}
        </button>
        {showHint && <p style={{ fontSize:11, color:"#9a3412", marginTop:6, marginBottom:0, fontStyle:"italic" }}>{scenario.hint}</p>}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 280px", gap:16 }}>
        {/* Left: rule table */}
        <div>
          {/* Rules table */}
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, overflow:"hidden", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderBottom:"1px solid #f1f5f9" }}>
              <span style={{ fontSize:12, fontWeight:600, color:"#374151" }}>Security Rules ({rules.length})</span>
              <button onClick={()=>setShowNew(!showNew)}
                style={{ padding:"4px 12px", fontSize:11, borderRadius:4, background:"#fa4616", color:"#fff", border:"none", cursor:"pointer" }}>
                + Add Rule
              </button>
            </div>

            {rules.length === 0 && (
              <div style={{ padding:24, textAlign:"center", color:"#94a3b8", fontSize:12 }}>
                No rules yet — click "Add Rule" to create your first security policy rule.
              </div>
            )}

            {rules.map((r,i) => (
              <div key={r.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", borderBottom:"1px solid #f8fafc", fontSize:12 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:2, marginRight:4 }}>
                  <button onClick={()=>moveUp(i)}   style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", fontSize:10, padding:0, lineHeight:1 }}>▲</button>
                  <button onClick={()=>moveDown(i)} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", fontSize:10, padding:0, lineHeight:1 }}>▼</button>
                </div>
                <span style={{ color:"#94a3b8", width:20 }}>{i+1}</span>
                <span style={{ fontWeight:500, color:"#374151", minWidth:140, flex:1 }}>{r.name}</span>
                <span style={{ background:"#dbeafe", color:"#1d4ed8", padding:"2px 7px", borderRadius:4, fontSize:10 }}>{r.srcZone}</span>
                <span style={{ color:"#94a3b8", fontSize:10 }}>→</span>
                <span style={{ background:"#fef3c7", color:"#92400e", padding:"2px 7px", borderRadius:4, fontSize:10 }}>{r.dstZone}</span>
                <span style={{ color:"#64748b", fontFamily:"monospace", fontSize:10, flex:1 }}>{r.apps.join(", ")}</span>
                <span style={{ background:r.action==="allow"?"#dcfce7":"#fee2e2", color:r.action==="allow"?"#166534":"#991b1b", padding:"2px 8px", borderRadius:4, fontSize:10, fontWeight:600 }}>
                  {r.action.toUpperCase()}
                </span>
                <button onClick={()=>deleteRule(r.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#ef4444", fontSize:12, padding:"0 4px" }}>✕</button>
              </div>
            ))}

            {/* Implicit deny */}
            <div style={{ padding:"8px 14px", background:"#fafafa", borderTop:"1px solid #f1f5f9", fontSize:11, color:"#94a3b8", fontStyle:"italic" }}>
              Implicit deny-all — any traffic not matched above is denied (PAN-OS default)
            </div>
          </div>

          {/* New rule form */}
          {showNew && (
            <div style={{ background:"#fff", border:"1px solid #fa461644", borderRadius:8, padding:16, marginBottom:12 }}>
              <div style={{ fontSize:12, fontWeight:600, color:"#374151", marginBottom:12 }}>New Rule</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:12 }}>
                <div>
                  <label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:3 }}>Rule Name</label>
                  <input value={newRule.name??""} onChange={e=>setNewRule(r=>({...r,name:e.target.value}))}
                    placeholder="e.g. Allow-Web-Outbound"
                    style={{ width:"100%", padding:"6px 8px", border:"1px solid #e2e8f0", borderRadius:4, fontSize:12, boxSizing:"border-box" }}/>
                </div>
                <div>
                  <label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:3 }}>Source Zone</label>
                  <select value={newRule.srcZone} onChange={e=>setNewRule(r=>({...r,srcZone:e.target.value}))}
                    style={{ width:"100%", padding:"6px 8px", border:"1px solid #e2e8f0", borderRadius:4, fontSize:12 }}>
                    {ZONES.map(z=><option key={z}>{z}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:3 }}>Destination Zone</label>
                  <select value={newRule.dstZone} onChange={e=>setNewRule(r=>({...r,dstZone:e.target.value}))}
                    style={{ width:"100%", padding:"6px 8px", border:"1px solid #e2e8f0", borderRadius:4, fontSize:12 }}>
                    {ZONES.map(z=><option key={z}>{z}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:6 }}>Applications (App-ID)</label>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {APP_OPTIONS.map(a=>(
                    <button key={a.id} onClick={()=>toggleApp(a.id)}
                      style={{ padding:"4px 10px", fontSize:11, borderRadius:4, cursor:"pointer", border:"1.5px solid",
                        borderColor: newRule.apps?.includes(a.id) ? RISK_COLOR[a.risk] : "#e2e8f0",
                        background:  newRule.apps?.includes(a.id) ? RISK_COLOR[a.risk]+"22" : "#f8fafc",
                        color:       newRule.apps?.includes(a.id) ? RISK_COLOR[a.risk] : "#64748b" }}>
                      {a.label}
                      <span style={{ fontSize:9, marginLeft:4, opacity:0.7 }}>{a.ports}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <label style={{ fontSize:11, color:"#64748b" }}>Action:</label>
                {(["allow","deny"] as Action[]).map(a=>(
                  <label key={a} style={{ display:"flex", alignItems:"center", gap:4, fontSize:12, cursor:"pointer" }}>
                    <input type="radio" checked={newRule.action===a} onChange={()=>setNewRule(r=>({...r,action:a}))}/>
                    <span style={{ color:a==="allow"?"#166534":"#991b1b", fontWeight:500 }}>{a.toUpperCase()}</span>
                  </label>
                ))}
                <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
                  <button onClick={()=>setShowNew(false)}
                    style={{ padding:"5px 12px", fontSize:11, borderRadius:4, border:"1px solid #e2e8f0", background:"#f8fafc", cursor:"pointer", color:"#64748b" }}>Cancel</button>
                  <button onClick={addRule} disabled={!newRule.name||!newRule.apps?.length}
                    style={{ padding:"5px 12px", fontSize:11, borderRadius:4, background:"#fa4616", color:"#fff", border:"none", cursor:"pointer", opacity:(!newRule.name||!newRule.apps?.length)?0.4:1 }}>
                    Add Rule
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:14 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: results?12:0 }}>
              <span style={{ fontSize:13, fontWeight:600, color:"#374151" }}>Submit for Grading</span>
              <button onClick={grade}
                style={{ padding:"6px 16px", fontSize:12, borderRadius:4, background:"#fa4616", color:"#fff", border:"none", cursor:"pointer" }}>
                Submit
              </button>
            </div>
            {results && (
              <div>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:8, color:passed===total?"#166534":"#dc2626" }}>
                  {passed===total?"✓ All checks passed!":"Not yet correct"} — {passed}/{total} checks
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

        {/* Right: App-ID reference */}
        <div>
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:14, marginBottom:12 }}>
            <div style={{ fontSize:12, fontWeight:600, color:"#374151", marginBottom:10 }}>App-ID Reference</div>
            {APP_OPTIONS.filter(a=>a.id!=="any").map(a=>(
              <div key={a.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid #f8fafc", fontSize:11 }}>
                <span style={{ fontFamily:"monospace", color:"#374151" }}>{a.label}</span>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <span style={{ color:"#94a3b8", fontSize:10 }}>{a.ports}</span>
                  <span style={{ padding:"1px 6px", borderRadius:3, fontSize:9, fontWeight:600,
                    background:RISK_COLOR[a.risk]+"22", color:RISK_COLOR[a.risk] }}>{a.risk}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:8, padding:12 }}>
            <div style={{ fontSize:11, fontWeight:600, color:"#0369a1", marginBottom:6 }}>PAN-OS vs FortiOS</div>
            <p style={{ fontSize:11, color:"#0c4a6e", margin:0, lineHeight:1.6 }}>
              <strong>FortiOS:</strong> Service = TCP/443<br/>
              <strong>PAN-OS:</strong> App = ssl (port doesn't matter)<br/><br/>
              App-ID signatures identify apps at L7, even if they run on non-standard ports.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
