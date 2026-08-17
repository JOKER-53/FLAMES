import { useState } from "react";

type NATType = "source" | "destination" | "static";

interface NATRule {
  id: number;
  name: string;
  type: NATType;
  srcZone: string;
  dstZone: string;
  srcAddr: string;
  dstAddr: string;
  translated: string;
  active: boolean;
}

import { PanSession } from "../../hooks/usePanSession";
export function PanNAT({ session: _ }: { session: PanSession }) {
  const [rules, setRules] = useState<NATRule[]>([
    { id:1, name:"Outbound-SNAT",  type:"source",      srcZone:"Trust",   dstZone:"Untrust", srcAddr:"10.0.0.0/24", dstAddr:"any",         translated:"interface(ethernet1/1)", active:true },
    { id:2, name:"Web-Server-DNAT",type:"destination",  srcZone:"Untrust", dstZone:"Trust",   srcAddr:"any",         dstAddr:"203.0.113.10", translated:"10.0.0.100:443",         active:true },
  ]);
  const [adding, setAdding] = useState(false);
  const [newRule, setNewRule] = useState<Partial<NATRule>>({ name:"", type:"source", srcZone:"Trust", dstZone:"Untrust", srcAddr:"", dstAddr:"any", translated:"", active:true });
  const [nextId, setNextId] = useState(3);
  const [activeTab, setActiveTab] = useState<"rules"|"concept">("rules");

  function addRule() {
    if (!newRule.name||!newRule.translated) return;
    setRules(r=>[...r,{ id:nextId, name:newRule.name!, type:newRule.type!, srcZone:newRule.srcZone!, dstZone:newRule.dstZone!, srcAddr:newRule.srcAddr||"any", dstAddr:newRule.dstAddr||"any", translated:newRule.translated!, active:true }]);
    setNextId(n=>n+1);
    setNewRule({ name:"", type:"source", srcZone:"Trust", dstZone:"Untrust", srcAddr:"", dstAddr:"any", translated:"", active:true });
    setAdding(false);
  }

  const TYPE_COLOR: Record<NATType,string> = { source:"#3b82f6", destination:"#f97316", static:"#7c3aed" };

  return (
    <div style={{ maxWidth:900 }}>
      <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:16 }}>
        <div>
          <h1 style={{ fontSize:18, fontWeight:700, color:"#1e293b", margin:0 }}>NAT Policy</h1>
          <p style={{ color:"#64748b", fontSize:12, marginTop:4 }}>
            Network Address Translation rules. Evaluated after security policy — traffic must be allowed first.
          </p>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {(["rules","concept"] as const).map(t=>(
            <button key={t} onClick={()=>setActiveTab(t)}
              style={{ padding:"5px 12px", fontSize:11, borderRadius:4, cursor:"pointer",
                background:activeTab===t?"#fa4616":"transparent",
                color:activeTab===t?"#fff":"#64748b",
                border:`1px solid ${activeTab===t?"#fa4616":"#e2e8f0"}` }}>
              {t==="rules"?"NAT Rules":"Concepts"}
            </button>
          ))}
        </div>
      </div>

      {activeTab==="concept" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
          {[
            { type:"Source NAT (SNAT)", color:"#3b82f6", icon:"→",
              desc:"Translates the source IP of outgoing packets. Used when internal hosts need internet access via a single public IP.",
              example:"10.0.0.50 → internet becomes 203.0.113.1 → internet",
              when:"Outbound traffic from Trust → Untrust. Hides internal addressing." },
            { type:"Destination NAT (DNAT)", color:"#f97316", icon:"←",
              desc:"Translates the destination IP of incoming packets. Used to expose internal servers to the internet.",
              example:"203.0.113.10:443 becomes 10.0.0.100:443",
              when:"Inbound traffic from Untrust → DMZ/Trust. Port forwarding." },
            { type:"Static NAT", color:"#7c3aed", icon:"⇌",
              desc:"1-to-1 mapping between a public IP and private IP. Bidirectional — works for both inbound and outbound.",
              example:"203.0.113.20 ↔ 10.0.0.200",
              when:"Servers needing a dedicated public IP for both inbound and outbound." },
            { type:"PAN-OS vs FortiOS", color:"#22c55e", icon:"≠",
              desc:"In PAN-OS, NAT is evaluated AFTER security policy. FortiOS NAT can be embedded in policy rules (SNAT checkbox). PAN-OS keeps them completely separate.",
              example:"Security policy must ALLOW the traffic first, then NAT translates it.",
              when:"Always create a security policy rule before the NAT rule in PAN-OS." },
          ].map(({type,color,icon,desc,example,when})=>(
            <div key={type} style={{ background:"#fff", border:`1px solid ${color}33`, borderRadius:8, padding:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <span style={{ fontSize:18, color }}>{icon}</span>
                <span style={{ fontSize:13, fontWeight:700, color:"#374151" }}>{type}</span>
              </div>
              <p style={{ fontSize:12, color:"#64748b", margin:"0 0 8px", lineHeight:1.5 }}>{desc}</p>
              <div style={{ background:"#f8fafc", borderRadius:4, padding:8, fontSize:11, fontFamily:"monospace", color:"#374151", marginBottom:6 }}>{example}</div>
              <div style={{ fontSize:11, color:color }}>Use when: {when}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab==="rules" && (
        <>
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, overflow:"hidden", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderBottom:"1px solid #f1f5f9" }}>
              <span style={{ fontSize:12, fontWeight:600, color:"#374151" }}>NAT Rules ({rules.length})</span>
              <button onClick={()=>setAdding(!adding)}
                style={{ padding:"4px 12px", fontSize:11, borderRadius:4, background:"#fa4616", color:"#fff", border:"none", cursor:"pointer" }}>
                + Add NAT Rule
              </button>
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:"#f8fafc", borderBottom:"1px solid #e2e8f0" }}>
                  {["#","Name","Type","Src Zone","Dst Zone","Original Dst","Translated To","Status"].map(h=>(
                    <th key={h} style={{ padding:"8px 12px", textAlign:"left", color:"#64748b", fontWeight:600, fontSize:11, textTransform:"uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map((r,i)=>(
                  <tr key={r.id} style={{ borderBottom:"1px solid #f1f5f9" }}>
                    <td style={{ padding:"9px 12px", color:"#94a3b8" }}>{i+1}</td>
                    <td style={{ padding:"9px 12px", fontWeight:500, color:"#374151" }}>{r.name}</td>
                    <td style={{ padding:"9px 12px" }}>
                      <span style={{ padding:"2px 8px", borderRadius:4, fontSize:10, fontWeight:600,
                        background:TYPE_COLOR[r.type]+"22", color:TYPE_COLOR[r.type] }}>
                        {r.type.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding:"9px 12px", color:"#64748b", fontSize:11 }}>{r.srcZone}</td>
                    <td style={{ padding:"9px 12px", color:"#64748b", fontSize:11 }}>{r.dstZone}</td>
                    <td style={{ padding:"9px 12px", fontFamily:"monospace", fontSize:11, color:"#374151" }}>{r.dstAddr}</td>
                    <td style={{ padding:"9px 12px", fontFamily:"monospace", fontSize:11, color:"#fa4616" }}>{r.translated}</td>
                    <td style={{ padding:"9px 12px" }}>
                      <span style={{ color:r.active?"#166534":"#94a3b8", fontSize:11 }}>{r.active?"● Active":"○ Disabled"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {adding && (
            <div style={{ background:"#fff", border:"1px solid #fa461644", borderRadius:8, padding:16, marginBottom:12 }}>
              <div style={{ fontSize:12, fontWeight:600, color:"#374151", marginBottom:12 }}>New NAT Rule</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:10 }}>
                <div>
                  <label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:3 }}>Rule Name</label>
                  <input value={newRule.name??""} onChange={e=>setNewRule(r=>({...r,name:e.target.value}))}
                    style={{ width:"100%", padding:"6px 8px", border:"1px solid #e2e8f0", borderRadius:4, fontSize:12, boxSizing:"border-box" }}/>
                </div>
                <div>
                  <label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:3 }}>NAT Type</label>
                  <select value={newRule.type} onChange={e=>setNewRule(r=>({...r,type:e.target.value as NATType}))}
                    style={{ width:"100%", padding:"6px 8px", border:"1px solid #e2e8f0", borderRadius:4, fontSize:12 }}>
                    <option value="source">Source NAT</option>
                    <option value="destination">Destination NAT</option>
                    <option value="static">Static NAT</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:3 }}>Translated Address/Port</label>
                  <input value={newRule.translated??""} onChange={e=>setNewRule(r=>({...r,translated:e.target.value}))}
                    placeholder="e.g. 10.0.0.100:443 or interface(eth1/1)"
                    style={{ width:"100%", padding:"6px 8px", border:"1px solid #e2e8f0", borderRadius:4, fontSize:12, boxSizing:"border-box" }}/>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, marginBottom:10 }}>
                {[["Source Zone","srcZone",["Trust","Untrust","DMZ","any"]],["Dest Zone","dstZone",["Trust","Untrust","DMZ","any"]],["Source Address","srcAddr"],["Dest Address","dstAddr"]].map(([label,key,opts])=>(
                  <div key={key as string}>
                    <label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:3 }}>{label as string}</label>
                    {opts ? (
                      <select value={(newRule as any)[key as string]??""} onChange={e=>setNewRule(r=>({...r,[key as string]:e.target.value}))}
                        style={{ width:"100%", padding:"6px 8px", border:"1px solid #e2e8f0", borderRadius:4, fontSize:12 }}>
                        {(opts as string[]).map(o=><option key={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input value={(newRule as any)[key as string]??""} onChange={e=>setNewRule(r=>({...r,[key as string]:e.target.value}))}
                        placeholder="any"
                        style={{ width:"100%", padding:"6px 8px", border:"1px solid #e2e8f0", borderRadius:4, fontSize:12, boxSizing:"border-box" }}/>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", justifyContent:"flex-end", gap:6 }}>
                <button onClick={()=>setAdding(false)} style={{ padding:"5px 12px", fontSize:11, borderRadius:4, border:"1px solid #e2e8f0", background:"#f8fafc", cursor:"pointer", color:"#64748b" }}>Cancel</button>
                <button onClick={addRule} disabled={!newRule.name||!newRule.translated}
                  style={{ padding:"5px 12px", fontSize:11, borderRadius:4, background:"#fa4616", color:"#fff", border:"none", cursor:"pointer", opacity:(!newRule.name||!newRule.translated)?0.4:1 }}>
                  Add Rule
                </button>
              </div>
            </div>
          )}

          <div style={{ background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:8, padding:12, fontSize:12, color:"#7c2d12" }}>
            <strong>⚠ Important:</strong> In PAN-OS, NAT policy is evaluated AFTER security policy.
            You must have a matching security policy rule that allows the traffic before the NAT rule will take effect.
          </div>
        </>
      )}
    </div>
  );
}
