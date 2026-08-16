import { useState } from "react";

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
  { id:"ethernet1/1", type:"layer3",     zone:"Untrust",    ip:"203.0.113.1/30",  link:true,  speed:"1G",   comment:"WAN uplink to ISP" },
  { id:"ethernet1/2", type:"layer3",     zone:"Trust",      ip:"10.0.0.1/24",     link:true,  speed:"1G",   comment:"Internal LAN" },
  { id:"ethernet1/3", type:"layer3",     zone:"DMZ",        ip:"172.16.0.1/24",   link:false, speed:"1G",   comment:"DMZ segment" },
  { id:"ethernet1/4", type:"layer3",     zone:"—",          ip:"",                link:false, speed:"1G",   comment:"" },
  { id:"ethernet1/5", type:"layer3",     zone:"—",          ip:"",                link:false, speed:"1G",   comment:"" },
  { id:"ethernet1/6", type:"ha",         zone:"HA",         ip:"",                link:true,  speed:"1G",   comment:"HA1 heartbeat" },
  { id:"ethernet1/7", type:"ha",         zone:"HA",         ip:"",                link:true,  speed:"1G",   comment:"HA2 sync" },
  { id:"ethernet1/8", type:"layer3",     zone:"—",          ip:"",                link:false, speed:"1G",   comment:"" },
  { id:"management",  type:"management", zone:"Management", ip:"192.168.1.1/24",  link:true,  speed:"1G",   comment:"OOB management" },
];

const ZONE_COLOR: Record<string,string> = {
  Trust:"#22c55e", Untrust:"#ef4444", DMZ:"#f97316", Management:"#7c3aed", HA:"#3b82f6", "—":"#d1d5db",
};

const ZONES: IfaceZone[] = ["Trust","Untrust","DMZ","Management","HA","—"];

export function PanInterfaces() {
  const [ifaces, setIfaces] = useState<Interface[]>(DEFAULT_IFACES);
  const [editing, setEditing] = useState<string|null>(null);
  const [editVal, setEditVal] = useState<Partial<Interface>>({});

  function startEdit(iface: Interface) {
    setEditing(iface.id);
    setEditVal({ zone:iface.zone, ip:iface.ip, type:iface.type, comment:iface.comment });
  }

  function saveEdit(id: string) {
    setIfaces(prev=>prev.map(i=>i.id===id?{...i,...editVal}:i));
    setEditing(null);
  }

  return (
    <div style={{ maxWidth:1000 }}>
      <div style={{ marginBottom:16 }}>
        <h1 style={{ fontSize:18, fontWeight:700, color:"#1e293b", margin:0 }}>Network Interfaces</h1>
        <p style={{ color:"#64748b", fontSize:12, marginTop:4 }}>
          Assign interfaces to zones and configure IP addresses. Interfaces must be in a zone before security policy applies.
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

      {/* Interface table */}
      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, overflow:"hidden" }}>
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

      <div style={{ marginTop:12, background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:8, padding:12, fontSize:12, color:"#0c4a6e" }}>
        <strong>Key point:</strong> In PAN-OS, an interface must be assigned to a zone before any security policy applies to traffic on it.
        Interfaces in the same zone can communicate freely (intra-zone). All inter-zone traffic requires an explicit security policy rule.
      </div>
    </div>
  );
}
