import { useState } from "react";
import { PanSession } from "../../hooks/usePanSession";

const APPS = [
  { id: "web-browsing", category: "General Internet", risk: 1 },
  { id: "ssl",          category: "General Internet", risk: 1 },
  { id: "dns",          category: "General Internet", risk: 1 },
  { id: "ssh",          category: "Remote Access",    risk: 3 },
  { id: "rdp",          category: "Remote Access",    risk: 4 },
  { id: "bittorrent",   category: "File Sharing",     risk: 4 },
  { id: "youtube-base", category: "Video Streaming",  risk: 2 },
  { id: "office365",    category: "Business SaaS",    risk: 1 },
  { id: "smtp",         category: "Email",            risk: 2 },
  { id: "unknown-tcp",  category: "Unknown",          risk: 5 },
];

export function PanAppID({ session }: { session?: PanSession }) {
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [results, setResults] = useState<{desc:string; pass:boolean}[]|null>(null);

  // Scenario: Allow standard web traffic and Office 365, but block BitTorrent and unknown protocols.
  const scenario = {
    id: "pan-appid-01",
    title: "Secure Web Access",
    description: "Select the minimum required App-IDs to allow standard web browsing and Office 365 traffic, while keeping the attack surface as small as possible. Do NOT allow evasive or unknown applications.",
    checks: [
      { desc: "Allow web-browsing", fn: (apps: string[]) => apps.includes("web-browsing") },
      { desc: "Allow ssl", fn: (apps: string[]) => apps.includes("ssl") },
      { desc: "Allow office365", fn: (apps: string[]) => apps.includes("office365") },
      { desc: "Block bittorrent", fn: (apps: string[]) => !apps.includes("bittorrent") },
      { desc: "Block unknown-tcp", fn: (apps: string[]) => !apps.includes("unknown-tcp") },
    ]
  };

  const passed = results?.filter(r => r.pass).length ?? 0;
  const total = scenario.checks.length;

  function toggleApp(id: string) {
    setSelectedApps(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function grade() {
    const res = scenario.checks.map(c => ({ desc: c.desc, pass: c.fn(selectedApps) }));
    setResults(res);
    if (res.every(r => r.pass) && session) {
      session.markTaskComplete(scenario.id);
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>App-ID Configuration</h1>
      <p style={{ color: "#64748b", marginBottom: 20 }}>Configure Application Identification (App-ID) rules for the scenario.</p>

      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 14, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px 0" }}>Scenario: {scenario.title}</h3>
        <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.5 }}>{scenario.description}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Available Applications</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {APPS.map(app => (
              <label key={app.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, background: selectedApps.includes(app.id) ? "#f0f9ff" : "#f8fafc", border: `1px solid ${selectedApps.includes(app.id) ? "#bae6fd" : "#e2e8f0"}`, borderRadius: 6, cursor: "pointer" }}>
                <input type="checkbox" checked={selectedApps.includes(app.id)} onChange={() => toggleApp(app.id)} />
                <span style={{ fontFamily: "monospace", fontSize: 13 }}>{app.id}</span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "#64748b" }}>Risk: {app.risk}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: results ? 12 : 0 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Submit for Grading</span>
            <button onClick={grade} style={{ padding: "6px 16px", fontSize: 12, borderRadius: 4, background: "#fa4616", color: "#fff", border: "none", cursor: "pointer" }}>Submit</button>
          </div>
          {results && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: passed === total ? "#166534" : "#dc2626" }}>
                {passed === total ? "✓ All checks passed!" : "Not yet correct"} — {passed}/{total} checks
              </div>
              {results.map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f1f5f9", fontSize: 12 }}>
                  <span style={{ color: "#374151" }}>{r.desc}</span>
                  <span style={{ padding: "1px 8px", borderRadius: 3, fontSize: 11, fontWeight: 600, background: r.pass ? "#dcfce7" : "#fee2e2", color: r.pass ? "#166534" : "#991b1b" }}>{r.pass ? "PASS" : "FAIL"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
