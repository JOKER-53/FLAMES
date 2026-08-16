export function PanSecurityPolicy() {
  const rules = [
    { id:1, name:"Allow-Outbound-Web", srcZone:"Trust",   dstZone:"Untrust", app:"web-browsing,ssl", action:"allow" },
    { id:2, name:"Block-All",          srcZone:"any",     dstZone:"any",     app:"any",              action:"deny"  },
  ];
  return (
    <div>
      <h1 style={{ fontSize:18, fontWeight:700, color:"#1e293b", marginBottom:4 }}>Security Policy Rules</h1>
      <p style={{ color:"#64748b", fontSize:13, marginBottom:16 }}>
        PAN-OS evaluates rules top-down, first match wins. App-ID identifies traffic by application, not just port.
      </p>
      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, overflow:"hidden", marginBottom:16 }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead>
            <tr style={{ background:"#f8fafc", borderBottom:"1px solid #e2e8f0" }}>
              {["#","Name","Source Zone","Dest Zone","Application","Action"].map(h => (
                <th key={h} style={{ padding:"10px 14px", textAlign:"left", color:"#64748b", fontWeight:600, fontSize:11, textTransform:"uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rules.map((r,i) => (
              <tr key={r.id} style={{ borderBottom:"1px solid #f1f5f9" }}>
                <td style={{ padding:"10px 14px", color:"#94a3b8" }}>{i+1}</td>
                <td style={{ padding:"10px 14px", color:"#374151", fontWeight:500 }}>{r.name}</td>
                <td style={{ padding:"10px 14px" }}><span style={{ background:"#dbeafe", color:"#1d4ed8", padding:"2px 8px", borderRadius:4, fontSize:11 }}>{r.srcZone}</span></td>
                <td style={{ padding:"10px 14px" }}><span style={{ background:"#fef3c7", color:"#92400e", padding:"2px 8px", borderRadius:4, fontSize:11 }}>{r.dstZone}</span></td>
                <td style={{ padding:"10px 14px", color:"#64748b", fontFamily:"monospace", fontSize:11 }}>{r.app}</td>
                <td style={{ padding:"10px 14px" }}>
                  <span style={{ background:r.action==="allow"?"#dcfce7":"#fee2e2", color:r.action==="allow"?"#166534":"#991b1b", padding:"2px 10px", borderRadius:4, fontSize:11, fontWeight:600 }}>
                    {r.action.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:8, padding:14 }}>
        <div style={{ fontSize:13, fontWeight:600, color:"#0369a1", marginBottom:4 }}>PAN-OS vs FortiOS — Key Difference</div>
        <p style={{ fontSize:12, color:"#0c4a6e", margin:0, lineHeight:1.6 }}>
          FortiOS uses service ports (TCP/443) to identify traffic. PAN-OS uses <strong>App-ID</strong> — it identifies the actual application regardless of port, making rules more precise and harder to bypass.
        </p>
      </div>
    </div>
  );
}
