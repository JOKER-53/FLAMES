import { useState } from "react";

type ZoneType = "layer3" | "tap" | "virtual-wire";
type ZoneProfile = "none" | "default" | "strict";

interface Zone {
  id: number;
  name: string;
  type: ZoneType;
  profile: ZoneProfile;
  interfaces: string[];
  logForwarding: boolean;
}

const INTERFACES = ["ethernet1/1","ethernet1/2","ethernet1/3","ethernet1/4","ethernet1/5","ethernet1/6","ethernet1/7","ethernet1/8"];

import { PanSession } from "../../hooks/usePanSession";
export function PanZones({ session: _ }: { session: PanSession }) {
  const [zones, setZones] = useState<Zone[]>([
    { id:1, name:"Trust",   type:"layer3", profile:"default", interfaces:["ethernet1/5","ethernet1/6"], logForwarding:true },
    { id:2, name:"Untrust", type:"layer3", profile:"strict",  interfaces:["ethernet1/1"], logForwarding:true },
  ]);
  const [nextId, setNextId] = useState(3);
  const [adding, setAdding] = useState(false);
  const [newZone, setNewZone] = useState<Partial<Zone>>({ name:"", type:"layer3", profile:"default", interfaces:[], logForwarding:true });
  const [selected, setSelected] = useState<Zone|null>(null);

  const ZONE_COLOR: Record<string,string> = {
    Trust:"#22c55e", Untrust:"#ef4444", DMZ:"#f97316", Management:"#7c3aed",
  };

  function getColor(name:string) { return ZONE_COLOR[name] ?? "#3b82f6"; }

  function addZone() {
    if (!newZone.name) return;
    const z:Zone = { id:nextId, name:newZone.name!, type:newZone.type!, profile:newZone.profile!, interfaces:newZone.interfaces??[], logForwarding:newZone.logForwarding??true };
    setZones(prev=>[...prev,z]);
    setNextId(n=>n+1);
    setNewZone({ name:"", type:"layer3", profile:"default", interfaces:[], logForwarding:true });
    setAdding(false);
  }

  function toggleIface(iface:string) {
    setNewZone(z=>({ ...z, interfaces: z.interfaces?.includes(iface) ? z.interfaces.filter(i=>i!==iface) : [...(z.interfaces??[]),iface] }));
  }

  return (
    <div style={{ maxWidth:900 }}>
      <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:16 }}>
        <div>
          <h1 style={{ fontSize:18, fontWeight:700, color:"#1e293b", margin:0 }}>Security Zones</h1>
          <p style={{ color:"#64748b", fontSize:12, marginTop:4 }}>
            Zones group interfaces with the same trust level. All inter-zone traffic must match a security policy.
          </p>
        </div>
        <button onClick={()=>setAdding(!adding)}
          style={{ padding:"6px 14px", fontSize:12, borderRadius:4, background:"#fa4616", color:"#fff", border:"none", cursor:"pointer" }}>
          + New Zone
        </button>
      </div>

      {/* Zone topology diagram */}
      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:16, marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:600, color:"#64748b", marginBottom:12, textTransform:"uppercase", letterSpacing:"0.05em" }}>Zone Topology</div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:0, overflowX:"auto" }}>
          {zones.map((z,i)=>(
            <div key={z.id} style={{ display:"flex", alignItems:"center" }}>
              <div onClick={()=>setSelected(selected?.id===z.id?null:z)}
                style={{ padding:"12px 20px", borderRadius:8, border:`2px solid ${getColor(z.name)}`,
                  background:`${getColor(z.name)}11`, cursor:"pointer", textAlign:"center", minWidth:100,
                  boxShadow: selected?.id===z.id ? `0 0 12px ${getColor(z.name)}44` : "none" }}>
                <div style={{ fontSize:13, fontWeight:700, color:getColor(z.name) }}>{z.name}</div>
                <div style={{ fontSize:10, color:"#94a3b8", marginTop:3 }}>{z.interfaces.length} interface{z.interfaces.length!==1?"s":""}</div>
              </div>
              {i<zones.length-1 && (
                <div style={{ display:"flex", alignItems:"center", padding:"0 8px" }}>
                  <div style={{ width:40, height:1, background:"#e2e8f0", position:"relative" }}>
                    <div style={{ position:"absolute", top:-8, left:"50%", transform:"translateX(-50%)", fontSize:9, color:"#94a3b8", whiteSpace:"nowrap" }}>policy required</div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {zones.length===0 && <span style={{ color:"#94a3b8", fontSize:12 }}>No zones defined yet</span>}
        </div>
      </div>

      {/* Selected zone detail */}
      {selected && (
        <div style={{ background:"#fff", border:`1px solid ${getColor(selected.name)}44`, borderRadius:8, padding:14, marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:getColor(selected.name) }}/>
            <span style={{ fontSize:13, fontWeight:600, color:"#374151" }}>{selected.name}</span>
            <span style={{ fontSize:11, color:"#94a3b8", background:"#f1f5f9", padding:"1px 6px", borderRadius:3 }}>{selected.type}</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, fontSize:12 }}>
            <div><span style={{ color:"#64748b" }}>Profile: </span><span style={{ color:"#374151", fontWeight:500 }}>{selected.profile}</span></div>
            <div><span style={{ color:"#64748b" }}>Log Forwarding: </span><span style={{ color:selected.logForwarding?"#166534":"#94a3b8", fontWeight:500 }}>{selected.logForwarding?"Enabled":"Disabled"}</span></div>
            <div><span style={{ color:"#64748b" }}>Interfaces: </span><span style={{ color:"#374151", fontWeight:500 }}>{selected.interfaces.join(", ")||"None"}</span></div>
          </div>
        </div>
      )}

      {/* Zones list */}
      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, overflow:"hidden", marginBottom:16 }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead>
            <tr style={{ background:"#f8fafc", borderBottom:"1px solid #e2e8f0" }}>
              {["Zone Name","Type","Zone Protection Profile","Interfaces","Log Forwarding"].map(h=>(
                <th key={h} style={{ padding:"9px 14px", textAlign:"left", color:"#64748b", fontWeight:600, fontSize:11, textTransform:"uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {zones.map(z=>(
              <tr key={z.id} style={{ borderBottom:"1px solid #f1f5f9", cursor:"pointer" }} onClick={()=>setSelected(selected?.id===z.id?null:z)}>
                <td style={{ padding:"10px 14px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:getColor(z.name) }}/>
                    <span style={{ fontWeight:600, color:"#374151" }}>{z.name}</span>
                  </div>
                </td>
                <td style={{ padding:"10px 14px", color:"#64748b", fontFamily:"monospace", fontSize:11 }}>{z.type}</td>
                <td style={{ padding:"10px 14px" }}>
                  <span style={{ padding:"2px 8px", borderRadius:4, fontSize:11,
                    background:z.profile==="strict"?"#fee2e2":z.profile==="default"?"#dbeafe":"#f1f5f9",
                    color:z.profile==="strict"?"#991b1b":z.profile==="default"?"#1d4ed8":"#64748b" }}>
                    {z.profile}
                  </span>
                </td>
                <td style={{ padding:"10px 14px", color:"#64748b", fontSize:11 }}>{z.interfaces.join(", ")||<span style={{ color:"#d1d5db" }}>None</span>}</td>
                <td style={{ padding:"10px 14px" }}>
                  <span style={{ color:z.logForwarding?"#166534":"#94a3b8", fontSize:11 }}>{z.logForwarding?"✓ Enabled":"—"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add zone form */}
      {adding && (
        <div style={{ background:"#fff", border:"1px solid #fa461644", borderRadius:8, padding:16, marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:600, color:"#374151", marginBottom:12 }}>New Zone</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:12 }}>
            <div>
              <label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:3 }}>Zone Name</label>
              <input value={newZone.name??""} onChange={e=>setNewZone(z=>({...z,name:e.target.value}))}
                placeholder="e.g. DMZ"
                style={{ width:"100%", padding:"6px 8px", border:"1px solid #e2e8f0", borderRadius:4, fontSize:12, boxSizing:"border-box" }}/>
            </div>
            <div>
              <label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:3 }}>Type</label>
              <select value={newZone.type} onChange={e=>setNewZone(z=>({...z,type:e.target.value as ZoneType}))}
                style={{ width:"100%", padding:"6px 8px", border:"1px solid #e2e8f0", borderRadius:4, fontSize:12 }}>
                <option value="layer3">Layer 3</option>
                <option value="tap">TAP</option>
                <option value="virtual-wire">Virtual Wire</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:3 }}>Zone Protection Profile</label>
              <select value={newZone.profile} onChange={e=>setNewZone(z=>({...z,profile:e.target.value as ZoneProfile}))}
                style={{ width:"100%", padding:"6px 8px", border:"1px solid #e2e8f0", borderRadius:4, fontSize:12 }}>
                <option value="none">None</option>
                <option value="default">Default</option>
                <option value="strict">Strict</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:6 }}>Assign Interfaces</label>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {INTERFACES.map(i=>(
                <button key={i} onClick={()=>toggleIface(i)}
                  style={{ padding:"3px 10px", fontSize:11, borderRadius:4, cursor:"pointer",
                    border:`1.5px solid ${newZone.interfaces?.includes(i)?"#fa4616":"#e2e8f0"}`,
                    background:newZone.interfaces?.includes(i)?"#fa461622":"#f8fafc",
                    color:newZone.interfaces?.includes(i)?"#fa4616":"#64748b" }}>
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, cursor:"pointer" }}>
              <input type="checkbox" checked={newZone.logForwarding} onChange={e=>setNewZone(z=>({...z,logForwarding:e.target.checked}))}/>
              Enable Log Forwarding
            </label>
            <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
              <button onClick={()=>setAdding(false)} style={{ padding:"5px 12px", fontSize:11, borderRadius:4, border:"1px solid #e2e8f0", background:"#f8fafc", cursor:"pointer", color:"#64748b" }}>Cancel</button>
              <button onClick={addZone} disabled={!newZone.name} style={{ padding:"5px 12px", fontSize:11, borderRadius:4, background:"#fa4616", color:"#fff", border:"none", cursor:"pointer", opacity:!newZone.name?0.4:1 }}>
                Create Zone
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Concept box */}
      <div style={{ background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:8, padding:14 }}>
        <div style={{ fontSize:12, fontWeight:600, color:"#0369a1", marginBottom:6 }}>Zone-Based Security Model</div>
        <p style={{ fontSize:12, color:"#0c4a6e", margin:0, lineHeight:1.6 }}>
          In PAN-OS, <strong>all traffic between zones is denied by default</strong> — even if the zones are on the same firewall.
          Unlike FortiOS where intra-zone traffic is allowed by default, PAN-OS requires explicit security policy rules for every zone pair.
          Intra-zone traffic (same zone) is allowed by default.
        </p>
      </div>
    </div>
  );
}
