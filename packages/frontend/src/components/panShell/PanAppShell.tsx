import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

interface PanAppShellProps { children: ReactNode; }

const NAV = [
  { label: "Dashboard",       path: "/paloalto",                icon: "⊞" },
  { label: "Security Policy", path: "/paloalto/security",       icon: "🛡" },
  { label: "NAT Policy",      path: "/paloalto/nat",            icon: "↔" },
  { label: "Zones",           path: "/paloalto/zones",          icon: "◎" },
  { label: "Interfaces",      path: "/paloalto/interfaces",     icon: "⚡" },
  { label: "App-ID",          path: "/paloalto/appid",          icon: "🔍" },
];

export function PanAppShell({ children }: PanAppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div style={{ display:"flex", height:"100vh", width:"100vw", fontFamily:"system-ui,sans-serif", fontSize:13, background:"#f0f2f5" }}>
      <aside style={{ width:220, background:"#1a2332", display:"flex", flexDirection:"column", flexShrink:0 }}>
        <div style={{ padding:"16px 16px 12px", borderBottom:"1px solid #ffffff14" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:"#fa4616", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="18" height="18" viewBox="0 0 28 28">
                <circle cx="14" cy="14" r="11" fill="none" stroke="white" strokeWidth="2.5"/>
                <circle cx="14" cy="14" r="4" fill="white"/>
              </svg>
            </div>
            <div>
              <div style={{ color:"#fff", fontWeight:700, fontSize:13 }}>PAN-OS Sim</div>
              <div style={{ color:"#4b6080", fontSize:11 }}>PA-220</div>
            </div>
          </div>
        </div>

        <nav style={{ flex:1, padding:"8px 0", overflowY:"auto" }}>
          {NAV.map(item => {
            const active = location.pathname === item.path ||
              (item.path !== "/paloalto" && location.pathname.startsWith(item.path));
            return (
              <Link key={item.path} to={item.path} style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"9px 16px", textDecoration:"none",
                background: active ? "#fa461622" : "transparent",
                borderLeft: active ? "3px solid #fa4616" : "3px solid transparent",
                color: active ? "#fa8060" : "#94a3b8",
              }}>
                <span style={{ fontSize:15 }}>{item.icon}</span>
                <span style={{ fontSize:12.5 }}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div style={{ padding:"12px 16px", borderTop:"1px solid #ffffff14" }}>
          <button onClick={() => navigate("/")}
            style={{ background:"none", border:"1px solid #2d3f55", color:"#4b6080", borderRadius:4, padding:"5px 10px", fontSize:11, cursor:"pointer", width:"100%" }}>
            ← Switch Platform
          </button>
          <div style={{ color:"#2d4060", fontSize:10, marginTop:6, textAlign:"center" }}>PAN-OS 11.0 (Simulated)</div>
        </div>
      </aside>

      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        <header style={{ height:44, background:"#fff", borderBottom:"1px solid #e2e8f0", display:"flex", alignItems:"center", padding:"0 20px", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ color:"#64748b", fontSize:12 }}>
            {NAV.find(n => location.pathname === n.path || (n.path !== "/paloalto" && location.pathname.startsWith(n.path)))?.label ?? "Dashboard"}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:12, color:"#94a3b8" }}>Student View</span>
            <div style={{ width:28, height:28, borderRadius:"50%", background:"#fa4616", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:11, fontWeight:600 }}>ST</div>
          </div>
        </header>
        <main style={{ flex:1, overflowY:"auto", padding:20 }}>{children}</main>
      </div>
    </div>
  );
}
