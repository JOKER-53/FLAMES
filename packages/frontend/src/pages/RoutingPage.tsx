import { useState } from "react";
import { useScenarioSession } from "../hooks/useScenarioSession";
import { StaticRoute, evaluateRoutingConfiguration, staticRoutingScenario } from "@fortisim/engine";

export function RoutingPage({ session }: { session: ReturnType<typeof useScenarioSession> }) {
  const [routes, setRoutes] = useState<StaticRoute[]>([]);
  const [newDest, setNewDest] = useState("");
  const [newGw, setNewGw] = useState("");
  const [newIface, setNewIface] = useState("port1");
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const scenarioId = staticRoutingScenario.id;

  function addRoute() {
    const ipv4 = (value: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(value) && value.split(".").every(octet => Number(octet) <= 255);
    const [address, prefix, extra] = newDest.trim().split("/");
    if (!ipv4(address) || !/^\d{1,2}$/.test(prefix ?? "") || Number(prefix) > 32 || extra !== undefined || !ipv4(newGw.trim())) {
      setError("Enter an IPv4 destination with a /0–/32 prefix and a valid gateway."); return;
    }
    setRoutes(prev => [...prev, { id: crypto.randomUUID(), destination: newDest.trim(), gateway: newGw.trim(), interfaceName: newIface, distance: 10 }]);
    setResults(null); setError(null);
    setNewDest(""); setNewGw("");
  }

  function grade() {
    const report = evaluateRoutingConfiguration({ staticRoutes: routes, sdwanMembers: [], sdwanRules: [] }, staticRoutingScenario.expectedConfig);
    setResults(report);
    if (report.success) session.markTaskComplete(scenarioId);
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Static Routing</h1>
      <p style={{ color: "#64748b", marginBottom: 20 }}>{staticRoutingScenario.description}</p>
      {error && <p className="platform-error" role="alert">{error}</p>}

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Add New Route</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Destination IP/Mask</div>
            <input value={newDest} onChange={e => setNewDest(e.target.value)} placeholder="0.0.0.0/0" style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 4 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Gateway Address</div>
            <input value={newGw} onChange={e => setNewGw(e.target.value)} placeholder="192.168.1.254" style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 4 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Interface</div>
            <select value={newIface} onChange={e => setNewIface(e.target.value)} style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 4 }}>
              <option value="port1">port1</option>
              <option value="port2">port2</option>
              <option value="lan">lan</option>
            </select>
          </div>
          <button onClick={addRoute} style={{ padding: "7px 16px", background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>Add</button>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, marginBottom: 20 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            <tr>
              <th style={{ padding: 12, fontSize: 12, color: "#64748b" }}>Destination</th>
              <th style={{ padding: 12, fontSize: 12, color: "#64748b" }}>Gateway</th>
              <th style={{ padding: 12, fontSize: 12, color: "#64748b" }}>Interface</th>
              <th style={{ padding: 12, fontSize: 12, color: "#64748b" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {routes.map(r => (
              <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: 12, fontSize: 13, fontFamily: "monospace" }}>{r.destination}</td>
                <td style={{ padding: 12, fontSize: 13, fontFamily: "monospace" }}>{r.gateway}</td>
                <td style={{ padding: 12, fontSize: 13 }}>{r.interfaceName}</td>
                <td style={{ padding: 12 }}><button aria-label={`Delete route ${r.destination}`} onClick={() => { setRoutes(previous => previous.filter(route => route.id !== r.id)); setResults(null); }}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Grade Configuration</span>
          <button onClick={grade} style={{ padding: "6px 16px", background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>Submit</button>
        </div>
        {results && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 4, background: results.success ? "#dcfce7" : "#fee2e2", color: results.success ? "#166534" : "#991b1b", fontSize: 13 }}>
            {results.message}
          </div>
        )}
      </div>
    </div>
  );
}
