import { useState } from "react";
import { useScenarioSession } from "../../hooks/useScenarioSession";
import { StaticRoute, evaluateRoutingConfiguration, staticRoutingScenario, type RoutingEvaluationResult } from "@fortisim/engine";
import { LessonFrame } from "../../components/shell/LessonFrame";
import { CheckYourWork, ConsoleFrame } from "../../components/lesson/LessonParts";
import { Icon } from "../../components/ui/Icon";

export function RoutingPage({ session }: { session: ReturnType<typeof useScenarioSession> }) {
  const [routes, setRoutes] = useState<StaticRoute[]>([]);
  const [newDest, setNewDest] = useState("");
  const [newGw, setNewGw] = useState("");
  const [newIface, setNewIface] = useState("port1");
  const [newDistance, setNewDistance] = useState("10");
  const [results, setResults] = useState<RoutingEvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const scenarioId = staticRoutingScenario.id;

  function addRoute() {
    const ipv4 = (value: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(value) && value.split(".").every(octet => Number(octet) <= 255);
    const [address, prefix, extra] = newDest.trim().split("/");
    const distance = Number(newDistance);
    if (!ipv4(address) || !/^\d{1,2}$/.test(prefix ?? "") || Number(prefix) > 32 || extra !== undefined || !ipv4(newGw.trim())) {
      setError("Enter an IPv4 destination with a /0–/32 prefix and a valid gateway."); return;
    }
    if (!Number.isInteger(distance) || distance < 1 || distance > 255) { setError("Administrative distance must be a whole number from 1 to 255."); return; }
    setRoutes(prev => [...prev, { id: crypto.randomUUID(), destination: newDest.trim(), gateway: newGw.trim(), interfaceName: newIface, distance }]);
    setResults(null); setError(null);
    setNewDest(""); setNewGw("");
  }

  function grade() {
    const report = evaluateRoutingConfiguration({ staticRoutes: routes, sdwanMembers: [], sdwanRules: [] }, staticRoutingScenario.expectedConfig);
    setResults(report);
    if (report.success) session.markTaskComplete(scenarioId);
  }

  return (
    <LessonFrame title={staticRoutingScenario.title} brief={staticRoutingScenario.description}>
      <div className="space-y-6">
        <ConsoleFrame path={["Network", "Static Routes"]}>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="bg-sunken text-muted text-left border-b border-line">
                  {["Destination", "Gateway", "Interface", "Distance", ""].map((h, i) => <th key={i} className="px-3 py-2 font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {routes.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-muted">No static routes yet. Add one below.</td></tr>}
                {routes.map(r => (
                  <tr key={r.id} className="border-b border-line">
                    <td className="px-3 py-2 font-mono">{r.destination}</td>
                    <td className="px-3 py-2 font-mono">{r.gateway}</td>
                    <td className="px-3 py-2">{r.interfaceName}</td>
                    <td className="px-3 py-2 tabular-nums">{r.distance}</td>
                    <td className="pr-3 py-2 text-right"><button aria-label={`Delete route ${r.destination}`} onClick={() => { setRoutes(previous => previous.filter(route => route.id !== r.id)); setResults(null); }} className="text-faint hover:text-danger"><Icon name="trash" size={15} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-line">
            <div className="text-[13px] font-medium text-body mb-3">Create New</div>
            <div className="flex flex-wrap items-end gap-3">
              <label><span className="field-label">Destination</span><input className="input w-40 font-mono" value={newDest} onChange={e => setNewDest(e.target.value)} placeholder="0.0.0.0/0" /></label>
              <label><span className="field-label">Gateway</span><input className="input w-40 font-mono" value={newGw} onChange={e => setNewGw(e.target.value)} placeholder="192.168.1.254" /></label>
              <label><span className="field-label">Interface</span>
                <select className="input w-28" value={newIface} onChange={e => setNewIface(e.target.value)}><option value="port1">port1</option><option value="port2">port2</option><option value="lan">lan</option></select>
              </label>
              <label><span className="field-label">Distance</span><input className="input w-20 tabular-nums" inputMode="numeric" value={newDistance} onChange={e => setNewDistance(e.target.value)} /></label>
              <button onClick={addRoute} className="h-9 px-4 bg-forti-red text-white rounded-sm text-sm hover:bg-forti-red/90">Add route</button>
            </div>
            {error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}
          </div>
        </ConsoleFrame>

        <CheckYourWork onSubmit={grade} result={results && { passed: results.success, checks: [{ label: results.message, passed: results.success }] }} />
      </div>
    </LessonFrame>
  );
}
