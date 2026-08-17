import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

interface PanAppShellProps { children: ReactNode; }

interface NavItem {
  label: string;
  path: string;
  icon: string;
  children?: { label: string; path: string }[];
}

const NAV: NavItem[] = [
  { label: "Hardware Ref",    path: "/paloalto",           icon: "⊞" },
  {
    label: "Tasks", path: "/paloalto/tasks", icon: "📋",
    children: [
      { label: "Security Policy", path: "/paloalto/tasks/security" },
      { label: "Zone Config",     path: "/paloalto/tasks/zones"    },
      { label: "NAT Policy",      path: "/paloalto/tasks/nat"      },
    ],
  },
  { label: "Security Policy", path: "/paloalto/security",  icon: "🛡" },
  { label: "NAT Policy",      path: "/paloalto/nat",       icon: "↔" },
  { label: "Zones",           path: "/paloalto/zones",     icon: "◎" },
  { label: "Interfaces",      path: "/paloalto/interfaces",icon: "⚡" },
  { label: "App-ID",          path: "/paloalto/appid",     icon: "🔍" },
];

export function PanAppShell({ children }: PanAppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Record<string,boolean>>({ "/paloalto/tasks": true });

  function isActive(path: string) {
    return location.pathname === path || (path !== "/paloalto" && location.pathname.startsWith(path));
  }

  return (
    <div style={{ display:"flex", height:"100vh", width:"100vw", fontFamily:"system-ui,sans-serif", fontSize:13, background:"#f0f2f5" }}>
      <aside style={{ width:220, background:"#1a2332", display:"flex", flexDirection:"column", flexShrink:0 }}>
        {/* Logo */}
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

        {/* Nav */}
        <nav style={{ flex:1, padding:"8px 0", overflowY:"auto" }}>
          {NAV.map(item => {
            const active = isActive(item.path);
            const open   = expanded[item.path] ?? active;
            return (
              <div key={item.path}>
                <div style={{ display:"flex", alignItems:"center" }}>
                  <Link to={item.path} onClick={() => item.children && setExpanded(e=>({...e,[item.path]:!open}))}
                    style={{ flex:1, display:"flex", alignItems:"center", gap:10, padding:"9px 16px", textDecoration:"none",
                      background: active && !item.children ? "#fa461622" : "transparent",
                      borderLeft: active && !item.children ? "3px solid #fa4616" : "3px solid transparent",
                      color: active ? "#fa8060" : "#94a3b8" }}>
                    <span style={{ fontSize:14 }}>{item.icon}</span>
                    <span style={{ fontSize:12.5, flex:1 }}>{item.label}</span>
                    {item.children && (
                      <span style={{ fontSize:10, color:"#4b6080" }}>{open?"▼":"▶"}</span>
                    )}
                  </Link>
                </div>
                {item.children && open && (
                  <div>
                    {item.children.map(child => (
                      <Link key={child.path} to={child.path}
                        style={{ display:"block", padding:"7px 16px 7px 42px", textDecoration:"none", fontSize:12,
                          background: location.pathname===child.path ? "#fa461622" : "transparent",
                          borderLeft: location.pathname===child.path ? "3px solid #fa4616" : "3px solid transparent",
                          color: location.pathname===child.path ? "#fa8060" : "#64748b" }}>
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding:"12px 16px", borderTop:"1px solid #ffffff14" }}>
          <button onClick={() => navigate("/")}
            style={{ background:"none", border:"1px solid #2d3f55", color:"#4b6080", borderRadius:4, padding:"5px 10px", fontSize:11, cursor:"pointer", width:"100%" }}>
            ← Switch Platform
          </button>
          <div style={{ color:"#2d4060", fontSize:10, marginTop:6, textAlign:"center" }}>PAN-OS 11.0 (Simulated)</div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        <header style={{ height:44, background:"#fff", borderBottom:"1px solid #e2e8f0", display:"flex", alignItems:"center", padding:"0 20px", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ color:"#64748b", fontSize:12 }}>
            {NAV.flatMap(n=>[n,...(n.children??[])]).find(n=>location.pathname===n.path||location.pathname.startsWith(n.path+"/"))?.label ?? "PAN-OS Sim"}
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
