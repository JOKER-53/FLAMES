import { useState } from "react";
import { PanSession } from "../../hooks/usePanSession";
import { PanChassisDiagram, PanPortZone, PanPortAssignment as PPA } from "../../components/policyObjects/PanChassisDiagram";

const SCENARIOS = [
  {
    id: "pan-port-01",
    title: "Basic Port Assignment",
    description: "Assign ethernet1/1 to Untrust (WAN) and ethernet1/2 to Trust (LAN). Leave others unassigned.",
    checks: [
      { desc: "ethernet1/1 in Untrust", fn: (p: PPA[]) => p.find(x => x.id === "ethernet1/1")?.zone === "Untrust" },
      { desc: "ethernet1/2 in Trust",   fn: (p: PPA[]) => p.find(x => x.id === "ethernet1/2")?.zone === "Trust" },
    ]
  },
  {
    id: "pan-port-02",
    title: "DMZ & HA Assignment",
    description: "Keep eth1/1 Untrust, eth1/2 Trust. Add eth1/3 as DMZ, and eth1/6 as HA.",
    checks: [
      { desc: "ethernet1/3 in DMZ", fn: (p: PPA[]) => p.find(x => x.id === "ethernet1/3")?.zone === "DMZ" },
      { desc: "ethernet1/6 in HA",  fn: (p: PPA[]) => p.find(x => x.id === "ethernet1/6")?.zone === "HA" },
    ]
  }
];

const INIT_PORTS: PPA[] = [
  { id: "ethernet1/1", zone: "unassigned", label: "eth1/1" },
  { id: "ethernet1/2", zone: "unassigned", label: "eth1/2" },
  { id: "ethernet1/3", zone: "unassigned", label: "eth1/3" },
  { id: "ethernet1/4", zone: "unassigned", label: "eth1/4" },
  { id: "ethernet1/5", zone: "unassigned", label: "eth1/5" },
  { id: "ethernet1/6", zone: "unassigned", label: "eth1/6" },
  { id: "ethernet1/7", zone: "unassigned", label: "eth1/7" },
  { id: "ethernet1/8", zone: "unassigned", label: "eth1/8" },
  { id: "management",  zone: "Management", label: "MGT" }
];

export function PanPortAssignment({ session }: { session: PanSession }) {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const scenario = SCENARIOS[scenarioIdx];
  const [ports, setPorts] = useState<PPA[]>(INIT_PORTS);
  const [results, setResults] = useState<{desc:string; pass:boolean}[]|null>(null);

  const passed = results?.filter(r => r.pass).length ?? 0;
  const total = scenario.checks.length;

  function onChangeZone(id: string, newZone: PanPortZone) {
    setPorts(prev => prev.map(p => p.id === id ? { ...p, zone: newZone } : p));
  }

  function grade() {
    const res = scenario.checks.map(c => ({ desc: c.desc, pass: c.fn(ports) }));
    setResults(res);
    if (res.every(r => r.pass)) {
      session.markTaskComplete(scenario.id);
    }
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", margin: 0 }}>Port Assignment</h1>
        <p style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>Assign physical chassis ports to logical zones.</p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {SCENARIOS.map((s, i) => (
          <button key={s.id} onClick={() => { setScenarioIdx(i); setResults(null); }}
            style={{ padding: "6px 14px", fontSize: 11, borderRadius: 20, border: "none", cursor: "pointer",
              background: scenarioIdx === i ? "#fa4616" : "#e2e8f0", color: scenarioIdx === i ? "#fff" : "#475569", fontWeight: 600 }}>
            {i + 1}. {s.title}
          </button>
        ))}
      </div>

      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 14, marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: "#374151", margin: 0, lineHeight: 1.5 }}>{scenario.description}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>
        <div>
          <PanChassisDiagram ports={ports} onChange={onChangeZone} />
        </div>
        <div>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 14, marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, margin: "0 0 10px 0" }}>Zone Assignments</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ports.map(p => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                  <span style={{ fontFamily: "monospace", color: "#374151" }}>{p.id}</span>
                  <select value={p.zone} onChange={(e) => onChangeZone(p.id, e.target.value as PanPortZone)}
                    style={{ padding: "4px", borderRadius: 4, border: "1px solid #cbd5e1" }}>
                    <option value="unassigned">Unassigned</option>
                    <option value="Trust">Trust</option>
                    <option value="Untrust">Untrust</option>
                    <option value="DMZ">DMZ</option>
                    <option value="HA">HA</option>
                    <option value="Management">Management</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: results ? 12 : 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Submit for Grading</span>
              <button onClick={grade} style={{ padding: "6px 16px", fontSize: 12, borderRadius: 4, background: "#fa4616", color: "#fff", border: "none", cursor: "pointer" }}>Submit</button>
            </div>
            {results && (
              <div>
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
    </div>
  );
}
