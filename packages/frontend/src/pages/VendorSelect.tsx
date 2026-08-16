// ============================================================================
// Vendor selection screen — shown at "/" before the user picks a platform.
// FortiGate → /fortigate (existing app)
// Palo Alto  → /paloalto  (new PAN-OS sim)
// ============================================================================
import { useNavigate } from "react-router-dom";

export function VendorSelect() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0f1a",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "#4b6080", textTransform: "uppercase", marginBottom: 12 }}>
          Firewall Simulation Lab
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: "#e2e8f0", margin: 0, letterSpacing: "-0.5px" }}>
          Choose Your Platform
        </h1>
        <p style={{ color: "#4b6080", fontSize: 14, marginTop: 10 }}>
          Select a firewall vendor to begin your training session
        </p>
      </div>

      {/* Vendor cards */}
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center", padding: "0 24px" }}>

        {/* FortiGate card */}
        <button
          onClick={() => navigate("/fortigate")}
          style={{
            width: 300, background: "#0d1117", border: "1px solid #1e2d45",
            borderRadius: 12, padding: "32px 28px", cursor: "pointer",
            textAlign: "left", transition: "all 0.2s",
            position: "relative", overflow: "hidden",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.border = "1px solid #ee1111";
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-4px)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 12px 40px #ee111122";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.border = "1px solid #1e2d45";
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
          }}
        >
          {/* Fortinet red accent bar */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#ee1111", borderRadius: "12px 12px 0 0" }} />

          {/* Logo area */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 10,
              background: "#ee1111", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: "white", fontWeight: 900, fontSize: 22, fontFamily: "serif" }}>F</span>
            </div>
            <div>
              <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 18 }}>FortiGate</div>
              <div style={{ color: "#4b6080", fontSize: 12 }}>by Fortinet</div>
            </div>
          </div>

          <div style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
            Train on FortiOS — configure firewall policies, interface zones, port assignments, and security profiles on a simulated FortiGate 60F.
          </div>

          {/* Feature pills */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
            {["FortiOS 7.6", "Policy Engine", "3D Hardware", "AI Tutor"].map(f => (
              <span key={f} style={{
                fontSize: 10, padding: "3px 8px", borderRadius: 4,
                background: "#ee111118", color: "#ee8888", border: "1px solid #ee111130",
              }}>{f}</span>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ color: "#ee1111", fontSize: 13, fontWeight: 600 }}>Start Training →</span>
            <span style={{ fontSize: 11, color: "#2d4060", background: "#0f1923", padding: "3px 8px", borderRadius: 4, border: "1px solid #1e2d45" }}>
              Available
            </span>
          </div>
        </button>

        {/* Palo Alto card */}
        <button
          onClick={() => navigate("/paloalto")}
          style={{
            width: 300, background: "#0d1117", border: "1px solid #1e2d45",
            borderRadius: 12, padding: "32px 28px", cursor: "pointer",
            textAlign: "left", transition: "all 0.2s",
            position: "relative", overflow: "hidden",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.border = "1px solid #fa4616";
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-4px)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 12px 40px #fa461622";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.border = "1px solid #1e2d45";
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
          }}
        >
          {/* PAN orange accent bar */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#fa4616", borderRadius: "12px 12px 0 0" }} />

          {/* Logo area */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 10,
              background: "#fa4616", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {/* PA simplified logo */}
              <svg width="28" height="28" viewBox="0 0 28 28">
                <circle cx="14" cy="14" r="11" fill="none" stroke="white" strokeWidth="2.5"/>
                <path d="M14 3 L14 25 M3 14 L25 14" stroke="white" strokeWidth="2" opacity="0.6"/>
                <circle cx="14" cy="14" r="4" fill="white"/>
              </svg>
            </div>
            <div>
              <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 18 }}>PA-Series</div>
              <div style={{ color: "#4b6080", fontSize: 12 }}>by Palo Alto Networks</div>
            </div>
          </div>

          <div style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
            Train on PAN-OS — configure security policies, App-ID rules, zone-based protection, and Panorama-style management on a simulated PA-220.
          </div>

          {/* Feature pills */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
            {["PAN-OS 11", "App-ID", "Zone Policy", "AI Tutor"].map(f => (
              <span key={f} style={{
                fontSize: 10, padding: "3px 8px", borderRadius: 4,
                background: "#fa461618", color: "#fa8060", border: "1px solid #fa461630",
              }}>{f}</span>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ color: "#fa4616", fontSize: 13, fontWeight: 600 }}>Start Training →</span>
            <span style={{ fontSize: 11, color: "#2d4060", background: "#0f1923", padding: "3px 8px", borderRadius: 4, border: "1px solid #1e2d45" }}>
              Available
            </span>
          </div>
        </button>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 48, color: "#2d4060", fontSize: 12, textAlign: "center" }}>
        FortiSim — Firewall Training Platform &nbsp;·&nbsp; FortiOS v7.6 &nbsp;·&nbsp; PAN-OS 11
      </div>
    </div>
  );
}
