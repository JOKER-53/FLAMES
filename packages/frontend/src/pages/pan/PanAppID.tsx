import { useState } from "react";

const APPS = [
  { id:"web-browsing", category:"General Internet", risk:1, ports:"TCP/80", evasive:false, desc:"Standard HTTP web traffic. Identified by HTTP headers and content.", behavior:"Uses standard port 80. PAN-OS checks URI patterns and headers.", fortiEquiv:"service HTTP (TCP/80)" },
  { id:"ssl",          category:"General Internet", risk:1, ports:"TCP/443",evasive:false, desc:"SSL/TLS encrypted traffic. PAN-OS decrypts to identify inner application.", behavior:"Requires SSL decryption policy for full App-ID.", fortiEquiv:"service HTTPS (TCP/443)" },
  { id:"dns",          category:"General Internet", risk:1, ports:"UDP/53", evasive:false, desc:"Domain Name System. Tunneling DNS can bypass firewalls.", behavior:"PAN-OS detects DNS tunneling (dns-tunneling threat signature).", fortiEquiv:"service DNS (UDP/53)" },
  { id:"ssh",          category:"Remote Access",    risk:3, ports:"TCP/22", evasive:true,  desc:"Secure Shell. Can tunnel other protocols — a major evasion risk.", behavior:"SSH tunneling detected as a separate App-ID signature.", fortiEquiv:"service SSH (TCP/22)" },
  { id:"rdp",          category:"Remote Access",    risk:4, ports:"TCP/3389",evasive:false,desc:"Remote Desktop Protocol. High-value target for attackers.", behavior:"Blocked at App-ID layer even if running on port 80.", fortiEquiv:"service RDP (TCP/3389)" },
  { id:"bittorrent",   category:"File Sharing",     risk:4, ports:"varies", evasive:true,  desc:"Peer-to-peer file sharing. Deliberately evades port-based blocks.", behavior:"Uses ports 6881-6889 AND 80/443 to bypass firewalls.", fortiEquiv:"No direct equivalent — port block unreliable" },
  { id:"youtube-base", category:"Video Streaming",  risk:2, ports:"TCP/443",evasive:false, desc:"YouTube traffic. Runs on HTTPS but identified by App-ID signatures.", behavior:"Can be blocked independently of other HTTPS traffic.", fortiEquiv:"Web filter URL category" },
  { id:"office365",    category:"Business SaaS",    risk:1, ports:"TCP/443",evasive:false, desc:"Microsoft 365 suite. Single App-ID covers all M365 services.", behavior:"App-ID groups: office365-base, sharepoint, teams, etc.", fortiEquiv:"Web filter + SSL inspection" },
  { id:"smtp",         category:"Email",            risk:2, ports:"TCP/25", evasive:false, desc:"Simple Mail Transfer Protocol. Used by mail servers.", behavior:"PAN-OS can inspect email content for threats.", fortiEquiv:"service SMTP (TCP/25)" },
  { id:"unknown-tcp",  category:"Unknown",          risk:5, ports:"varies", evasive:true,  desc:"Traffic App-ID cannot identify. Often malware or custom protocols.", behavior:"Block unknown-tcp/udp if not needed — high risk.", fortiEquiv:"No direct equivalent" },
];

const RISK_LABEL = ["","Low","Medium","Medium-High","High","Critical"];
const RISK_COLOR = ["","#22c55e","#84cc16","#f97316","#ef4444","#7c3aed"];

export function PanAppID() {
  const [selected, setSelected] = useState<typeof APPS[0]|null>(null);
  const [filter, setFilter] = useState("");
  const [showDemo, setShowDemo] = useState(false);

  const filtered = APPS.filter(a=>
    a.id.includes(filter.toLowerCase()) ||
    a.category.toLowerCase().includes(filter.toLowerCase()) ||
    a.desc.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div style={{ maxWidth:1000 }}>
      <div style={{ marginBottom:16 }}>
        <h1 style={{ fontSize:18, fontWeight:700, color:"#1e293b", margin:0 }}>App-ID Explorer</h1>
        <p style={{ color:"#64748b", fontSize:12, marginTop:4 }}>
          App-ID is PAN-OS's application classification engine. It identifies applications at Layer 7, regardless of port, protocol, or evasion technique.
        </p>
      </div>

      {/* Key concept banner */}
      <div style={{ background:"#1a2332", border:"1px solid #2d3f55", borderRadius:8, padding:16, marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
          <div style={{ textAlign:"center", flex:1, minWidth:150 }}>
            <div style={{ fontSize:24, marginBottom:4 }}>🔌</div>
            <div style={{ fontSize:11, fontWeight:600, color:"#94a3b8", textTransform:"uppercase" }}>FortiOS (Port-based)</div>
            <div style={{ fontSize:13, color:"#e2e8f0", marginTop:4 }}>Allow TCP/443</div>
            <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>Allows ALL HTTPS traffic</div>
          </div>
          <div style={{ fontSize:24, color:"#4b6080" }}>→</div>
          <div style={{ textAlign:"center", flex:1, minWidth:150 }}>
            <div style={{ fontSize:24, marginBottom:4 }}>🔍</div>
            <div style={{ fontSize:11, fontWeight:600, color:"#fa8060", textTransform:"uppercase" }}>PAN-OS (App-ID)</div>
            <div style={{ fontSize:13, color:"#e2e8f0", marginTop:4 }}>Allow ssl + youtube-base</div>
            <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>Allows HTTPS + YouTube only</div>
          </div>
        </div>
        <div style={{ marginTop:12, textAlign:"center" }}>
          <button onClick={()=>setShowDemo(!showDemo)}
            style={{ fontSize:11, background:"none", border:"1px solid #2d3f55", color:"#94a3b8", padding:"4px 12px", borderRadius:4, cursor:"pointer" }}>
            {showDemo?"Hide":"Show"} evasion demo
          </button>
        </div>
        {showDemo && (
          <div style={{ marginTop:12, background:"#0d1117", borderRadius:6, padding:12, fontFamily:"monospace", fontSize:11, color:"#4ade80" }}>
            <div style={{ color:"#64748b", marginBottom:6 }}># FortiOS: block bittorrent by port</div>
            <div>deny service TCP/6881-6889  <span style={{ color:"#ef4444" }}># ✗ bittorrent just switches to TCP/80</span></div>
            <div style={{ marginTop:8, color:"#64748b" }}># PAN-OS: block bittorrent by App-ID</div>
            <div>deny application bittorrent  <span style={{ color:"#4ade80" }}># ✓ catches it on any port</span></div>
          </div>
        )}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:16 }}>
        {/* App list */}
        <div>
          <input value={filter} onChange={e=>setFilter(e.target.value)}
            placeholder="Filter apps..."
            style={{ width:"100%", padding:"8px 12px", border:"1px solid #e2e8f0", borderRadius:6, fontSize:12, marginBottom:10, boxSizing:"border-box" }}/>
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:"#f8fafc", borderBottom:"1px solid #e2e8f0" }}>
                  {["App-ID","Category","Risk","Default Port","Evasive"].map(h=>(
                    <th key={h} style={{ padding:"9px 12px", textAlign:"left", color:"#64748b", fontWeight:600, fontSize:11, textTransform:"uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(a=>(
                  <tr key={a.id} onClick={()=>setSelected(selected?.id===a.id?null:a)}
                    style={{ borderBottom:"1px solid #f1f5f9", cursor:"pointer",
                      background:selected?.id===a.id?"#fff7ed":"transparent" }}>
                    <td style={{ padding:"9px 12px", fontFamily:"monospace", fontWeight:600, color:"#374151" }}>{a.id}</td>
                    <td style={{ padding:"9px 12px", color:"#64748b" }}>{a.category}</td>
                    <td style={{ padding:"9px 12px" }}>
                      <span style={{ padding:"2px 8px", borderRadius:4, fontSize:10, fontWeight:600,
                        background:RISK_COLOR[a.risk]+"22", color:RISK_COLOR[a.risk] }}>
                        {RISK_LABEL[a.risk]}
                      </span>
                    </td>
                    <td style={{ padding:"9px 12px", fontFamily:"monospace", fontSize:11, color:"#64748b" }}>{a.ports}</td>
                    <td style={{ padding:"9px 12px" }}>
                      {a.evasive
                        ? <span style={{ color:"#ef4444", fontSize:11 }}>⚠ Yes</span>
                        : <span style={{ color:"#94a3b8", fontSize:11 }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail panel */}
        <div>
          {selected ? (
            <div style={{ background:"#fff", border:`1px solid ${RISK_COLOR[selected.risk]}44`, borderRadius:8, padding:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                <span style={{ fontFamily:"monospace", fontWeight:700, fontSize:14, color:"#374151" }}>{selected.id}</span>
                <span style={{ padding:"2px 8px", borderRadius:4, fontSize:10, fontWeight:600,
                  background:RISK_COLOR[selected.risk]+"22", color:RISK_COLOR[selected.risk] }}>
                  Risk: {RISK_LABEL[selected.risk]}
                </span>
                {selected.evasive && <span style={{ fontSize:10, color:"#ef4444", background:"#fee2e2", padding:"2px 6px", borderRadius:4 }}>Evasive</span>}
              </div>
              <p style={{ fontSize:12, color:"#374151", lineHeight:1.6, marginBottom:12 }}>{selected.desc}</p>
              <div style={{ fontSize:11, color:"#64748b", marginBottom:8 }}>
                <strong style={{ color:"#374151" }}>PAN-OS behavior:</strong><br/>{selected.behavior}
              </div>
              <div style={{ background:"#f8fafc", borderRadius:6, padding:10, fontSize:11 }}>
                <strong style={{ color:"#374151" }}>FortiOS equivalent:</strong><br/>
                <span style={{ color:"#64748b" }}>{selected.fortiEquiv}</span>
              </div>
            </div>
          ) : (
            <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:16, color:"#94a3b8", fontSize:12, textAlign:"center" }}>
              Click an App-ID to see details and FortiOS comparison
            </div>
          )}

          {/* Quick rule builder */}
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:14, marginTop:12 }}>
            <div style={{ fontSize:11, fontWeight:600, color:"#374151", marginBottom:8 }}>Quick Rule Syntax</div>
            <div style={{ background:"#0d1117", borderRadius:6, padding:10, fontFamily:"monospace", fontSize:11, color:"#e2e8f0" }}>
              <div style={{ color:"#64748b", marginBottom:4 }}># Allow web from Trust to Untrust</div>
              <div><span style={{ color:"#fa8060" }}>rule</span> <span style={{ color:"#4ade80" }}>Allow-Web</span> {'{'}</div>
              <div>  from Trust; to Untrust;</div>
              <div>  application <span style={{ color:"#60a5fa" }}>web-browsing ssl</span>;</div>
              <div>  action <span style={{ color:"#22c55e" }}>allow</span>;</div>
              <div>{'}'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
