export function PanDashboard() {
  return (
    <div style={{ maxWidth:800 }}>
      <h1 style={{ fontSize:20, fontWeight:700, color:"#1e293b", marginBottom:4 }}>PA-220 — Hardware Reference</h1>
      <p style={{ color:"#64748b", fontSize:13, marginBottom:24 }}>
        The Palo Alto Networks PA-220 is a next-generation firewall for small offices and branch deployments.
      </p>

      <div style={{ background:"#d4d0c8", borderRadius:8, padding:"16px 20px", display:"flex", alignItems:"center", gap:10, marginBottom:20, fontFamily:"monospace" }}>
        <div style={{ background:"#fa4616", borderRadius:4, padding:"4px 8px", color:"white", fontSize:11, fontWeight:700 }}>PA</div>
        {["MGT"].map(p => (
          <div key={p} style={{ textAlign:"center" }}>
            <div style={{ width:22, height:18, background:"#222", borderRadius:2, border:"1px solid #94a3b8", marginBottom:2 }}/>
            <div style={{ fontSize:9, color:"#555" }}>{p}</div>
          </div>
        ))}
        {["HA1","HA2"].map(p => (
          <div key={p} style={{ textAlign:"center" }}>
            <div style={{ width:22, height:18, background:"#222", borderRadius:2, border:"1px solid #7c3aed", marginBottom:2 }}/>
            <div style={{ fontSize:9, color:"#555" }}>{p}</div>
          </div>
        ))}
        {["1","2","3","4","5","6","7","8"].map(p => (
          <div key={p} style={{ textAlign:"center" }}>
            <div style={{ width:22, height:18, background:"#222", borderRadius:2, border:"1px solid #374151", marginBottom:2, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div style={{ width:16, height:12, background:"#0a0f1a", borderRadius:1 }}/>
            </div>
            <div style={{ fontSize:9, color:"#555" }}>E1/{p}</div>
          </div>
        ))}
        <div style={{ marginLeft:"auto", display:"flex", flexDirection:"column", gap:3 }}>
          {["#22c55e","#22c55e","#374151"].map((c,i) => (
            <div key={i} style={{ width:8, height:8, borderRadius:"50%", background:c, boxShadow: c!=="#374151"?`0 0 5px ${c}`:undefined }}/>
          ))}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
        {[
          { name:"Management (MGT)", color:"#94a3b8", desc:"Out-of-band management. Web UI at https://192.168.1.1. Always separate from data plane." },
          { name:"HA1 / HA2",        color:"#7c3aed", desc:"High-availability ports. HA1=control link, HA2=data sync for active/passive failover." },
          { name:"E1/1–E1/4",        color:"#f97316", desc:"Typically Untrust zone (WAN-facing). Connect to ISP or untrusted networks." },
          { name:"E1/5–E1/8",        color:"#22c55e", desc:"Typically Trust zone (LAN-facing). Connect to internal switches and workstations." },
        ].map(({ name, color, desc }) => (
          <div key={name} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <div style={{ width:10, height:10, borderRadius:"50%", background:color, boxShadow:`0 0 6px ${color}88` }}/>
              <div style={{ fontSize:13, fontWeight:600, color:"#374151" }}>{name}</div>
            </div>
            <p style={{ fontSize:12, color:"#64748b", margin:0, lineHeight:1.5 }}>{desc}</p>
          </div>
        ))}
      </div>

      <div style={{ background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:8, padding:14 }}>
        <div style={{ fontSize:13, fontWeight:600, color:"#9a3412", marginBottom:4 }}>🚧 Interactive exercises coming soon</div>
        <p style={{ fontSize:12, color:"#c2410c", margin:0 }}>
          Security policy, App-ID rules, zone protection, and NAT exercises are being built.
          Switch to FortiGate for the full simulation experience.
        </p>
      </div>
    </div>
  );
}
