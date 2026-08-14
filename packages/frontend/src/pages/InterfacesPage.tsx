import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import type { AdminAccess, InterfaceConfig, InterfaceGradingReport, PortGradingReport } from "@fortisim/engine";
import { ALL_INTERFACE_SCENARIOS, ALL_PORT_SCENARIOS, interfaceFullScenario, portFinalScenario } from "@fortisim/engine";
import { ChassisDiagram } from "../components/policyObjects/ChassisDiagram";
import { CableDragDiagram } from "../components/policyObjects/CableDragDiagram";
import type { PortZone, PortAssignment } from "../components/policyObjects/ChassisDiagram";
import { InterfaceTopology } from "../components/policyObjects/InterfaceTopology";
import { HardQuestionCard } from "../components/HardQuestionCard";
import { ScenarioSession } from "../hooks/useScenarioSession";

const ADMIN_ACCESS_OPTIONS: AdminAccess[] = ["PING", "HTTPS", "SSH", "HTTP"];
type TrackType = "interface" | "port";

// ALL_PORT_SCENARIOS covers only the 5 regular exercises; the Final
// Assignment (port-final-01) lives separately in finalAssignments.ts. Any
// lookup by id (not just the "browse exercises" list) needs to search both,
// or navigating straight to the Final renders a blank scenario.
const ALL_PORT_SCENARIOS_AND_FINAL = [...ALL_PORT_SCENARIOS, portFinalScenario];
// ALL_INTERFACE_SCENARIOS covers only the 3 regular exercises; the Final
// Assignment (interface-full-01) is defined separately, same reasoning as
// the port track above.
const ALL_INTERFACE_SCENARIOS_AND_FINAL = [...ALL_INTERFACE_SCENARIOS, interfaceFullScenario];

interface InterfacesPageProps {
  session: ScenarioSession;
}

export function InterfacesPage({ session }: InterfacesPageProps) {
  const [searchParams] = useSearchParams();
  const urlTrack = searchParams.get("track");
  const urlScenario = searchParams.get("scenario");
  const cameFromTask = !!urlScenario;

  const [track, setTrack] = useState<TrackType>(urlTrack === "port" ? "port" : "interface");
  const [activeIfaceScenarioId, setActiveIfaceScenarioId] = useState<string>(
    urlTrack === "interface" && urlScenario ? urlScenario : ALL_INTERFACE_SCENARIOS[0].id
  );
  const [interfaces, setInterfaces] = useState<InterfaceConfig[]>([]);
  const [ifaceGrading, setIfaceGrading] = useState(false);
  const [ifaceReport, setIfaceReport] = useState<InterfaceGradingReport | null>(null);
  const [ifaceAiRemark, setIfaceAiRemark] = useState<string | null>(null);
  const [ifaceError, setIfaceError] = useState<string | null>(null);

  const [activePortScenarioId, setActivePortScenarioId] = useState<string>(
    urlTrack === "port" && urlScenario ? urlScenario : ALL_PORT_SCENARIOS[0].id
  );
  const portScenario = ALL_PORT_SCENARIOS_AND_FINAL.find((s) => s.id === activePortScenarioId);
  const [portAssignments, setPortAssignments] = useState<PortAssignment[]>(
    portScenario ? portScenario.ports.map((p) => ({ portId: p.portId, label: p.label, zone: "unassigned" as PortZone, locked: p.locked })) : []
  );
  const [portGrading, setPortGrading] = useState(false);
  const [portReport, setPortReport] = useState<PortGradingReport | null>(null);
  const [portAiRemark, setPortAiRemark] = useState<string | null>(null);
  const [portError, setPortError] = useState<string | null>(null);

  useEffect(() => {
    const scenario = ALL_INTERFACE_SCENARIOS_AND_FINAL.find((s) => s.id === activeIfaceScenarioId);
    if (scenario) {
      setInterfaces(scenario.starterInterfaces.map((i) => ({ ...i, adminAccess: [...i.adminAccess] })));
      setIfaceReport(null);
      setIfaceAiRemark(null);
      setIfaceError(null);
    }
  }, [activeIfaceScenarioId]);

  useEffect(() => {
    const scenario = ALL_PORT_SCENARIOS_AND_FINAL.find((s) => s.id === activePortScenarioId);
    if (scenario) {
      setPortAssignments(scenario.ports.map((p) => ({ portId: p.portId, label: p.label, zone: "unassigned" as PortZone, locked: p.locked })));
      setPortReport(null);
      setPortError(null);
    }
  }, [activePortScenarioId]);

  function updateField(name: string, field: keyof InterfaceConfig, value: string | string[]) {
    setInterfaces((prev) => prev.map((i) => i.name === name ? { ...i, [field]: value } : i));
  }

  function toggleAccess(name: string, access: AdminAccess) {
    setInterfaces((prev) => prev.map((i) => {
      if (i.name !== name) return i;
      const next = i.adminAccess.includes(access)
        ? i.adminAccess.filter((a) => a !== access)
        : [...i.adminAccess, access];
      return { ...i, adminAccess: next };
    }));
  }

  function handlePortChange(portId: string, zone: PortZone) {
    setPortAssignments((prev) => prev.map((p) => p.portId === portId ? { ...p, zone } : p));
  }

  async function submitIfaceGrading() {
    setIfaceGrading(true);
    setIfaceReport(null);
    setIfaceAiRemark(null);
    setIfaceError(null);
    try {
      const res = await fetch(`/api/interface-submissions/${activeIfaceScenarioId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: activeIfaceScenarioId, interfaces }),
      });
      if (!res.ok) throw new Error("Grading request failed");
      const result = await res.json();
      setIfaceReport(result.report);
      setIfaceAiRemark(result.aiRemark ?? null);
      if (result.report?.overallPassed) {
        session.markTaskComplete(activeIfaceScenarioId);
      }
    } catch (err: any) {
      setIfaceError(err.message ?? "Grading failed");
    } finally {
      setIfaceGrading(false);
    }
  }

  async function submitPortGrading() {
    if (!portScenario) return;
    setPortGrading(true);
    setPortReport(null);
    setPortAiRemark(null);
    setPortError(null);
    try {
      const res = await fetch(`/api/port-submissions/${portScenario.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: portScenario.id, assignments: portAssignments.map(({ portId, zone }) => ({ portId, zone })) }),
      });
      if (!res.ok) throw new Error("Grading request failed");
      const result = await res.json();
      setPortReport(result.report ?? result);
      setPortAiRemark(result.aiRemark ?? null);
      if ((result.report ?? result)?.overallPassed) {
        session.markTaskComplete(portScenario.id);
      }
    } catch (err: any) {
      setPortError(err.message ?? "Grading failed");
    } finally {
      setPortGrading(false);
    }
  }

  return (
    <div className={track === "port" ? "w-full" : "max-w-4xl"}>
      {cameFromTask && (
        <Link to={`/tasks/${track}`} className="inline-block text-[12px] text-forti-red hover:underline mb-3">
          ← Back to Tasks
        </Link>
      )}
      <h1 className="text-lg font-semibold text-forti-dark mb-1">Interfaces</h1>
      <p className="text-gray-500 text-[12.5px] mb-4">
        Configure network interfaces and assign physical ports to zones before writing firewall policies.
      </p>

      {!cameFromTask && (
        <div className="flex gap-2 mb-5">
          <button onClick={() => setTrack("interface")} className={`px-4 py-1.5 rounded-sm text-[12.5px] border transition-colors ${track === "interface" ? "bg-forti-red text-white border-forti-red" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
            Interface Configuration
          </button>
          <button onClick={() => setTrack("port")} className={`px-4 py-1.5 rounded-sm text-[12.5px] border transition-colors ${track === "port" ? "bg-forti-red text-white border-forti-red" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
            Port Assignment
          </button>
        </div>
      )}

      {track === "interface" && (
        <>
          {(() => {
            const activeScenario = ALL_INTERFACE_SCENARIOS_AND_FINAL.find((s) => s.id === activeIfaceScenarioId);
            if (!activeScenario) return null;
            return (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-5">
                <div className="text-[13px] font-semibold text-amber-900 mb-1">{activeScenario.title}</div>
                <p className="text-[12.5px] text-amber-800 leading-relaxed">{activeScenario.description}</p>
              </div>
            );
          })()}

          {!cameFromTask && (
          <div className="bg-white border border-gray-200 rounded-md p-4 mb-5">
            <div className="text-[13px] font-medium text-gray-700 mb-3">Select Exercise</div>
            <div className="space-y-2">
              {ALL_INTERFACE_SCENARIOS.map((s, idx) => {
                const completed = session.completedTaskIds.has(s.id);
                return (
                  <div key={s.id} onClick={() => setActiveIfaceScenarioId(s.id)} className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-colors ${activeIfaceScenarioId === s.id ? "border-forti-red bg-red-50" : "border-gray-200 hover:bg-gray-50"}`}>
                    <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 text-[11px] font-bold ${completed ? "bg-emerald-500 border-emerald-500 text-white" : activeIfaceScenarioId === s.id ? "border-forti-red text-forti-red" : "border-gray-300 text-gray-400"}`}>{completed ? "✓" : idx + 1}</div>
                    <div>
                      <div className="text-[13px] font-medium text-gray-800">{s.title}</div>
                      <div className="text-[12px] text-gray-500 mt-0.5">{s.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}

          <div className="mb-5">
            <InterfaceTopology
              interfaces={interfaces}
              focus={
                activeIfaceScenarioId === "interface-ip-01" ? "ip"
                : activeIfaceScenarioId === "interface-access-01" ? "access"
                : "all"
              }
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-md overflow-hidden mb-5">
            <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
              <span className="text-[13px] font-medium text-gray-700">{ALL_INTERFACE_SCENARIOS_AND_FINAL.find((s) => s.id === activeIfaceScenarioId)?.title}</span>
            </div>
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-left border-b border-gray-200">
                  <th className="px-3 py-2 font-medium">Interface</th>
                  <th className="px-3 py-2 font-medium">Zone</th>
                  <th className="px-3 py-2 font-medium">IP Address</th>
                  <th className="px-3 py-2 font-medium">Subnet (CIDR)</th>
                  <th className="px-3 py-2 font-medium">Administrative Access</th>
                </tr>
              </thead>
              <tbody>
                {interfaces.map((intf) => (
                  <tr key={intf.name} className="border-b border-gray-100">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                        <span className="font-medium text-gray-800">{intf.name}</span>
                      </div>
                      <div className="text-[11px] text-gray-400 ml-4">{intf.description}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-100 text-blue-700">{intf.role}</span>
                    </td>
                    <td className="px-3 py-3">
                      <input type="text" value={intf.ip} onChange={(e) => updateField(intf.name, "ip", e.target.value)} className="w-36 border border-gray-300 rounded px-2 py-1 text-[12px] font-mono" placeholder="e.g. 10.0.2.1" />
                    </td>
                    <td className="px-3 py-3">
                      <input type="text" value={intf.subnet} onChange={(e) => updateField(intf.name, "subnet", e.target.value)} className="w-20 border border-gray-300 rounded px-2 py-1 text-[12px] font-mono" placeholder="e.g. 24" />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2 flex-wrap">
                        {ADMIN_ACCESS_OPTIONS.map((access) => (
                          <label key={access} className="flex items-center gap-1 text-[12px] cursor-pointer">
                            <input type="checkbox" checked={intf.adminAccess.includes(access)} onChange={() => toggleAccess(intf.name, access)} />
                            {access}
                          </label>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[13px] font-medium text-gray-700">Submit for Grading</div>
              <button onClick={submitIfaceGrading} disabled={ifaceGrading} className="px-3 py-1.5 bg-forti-red text-white rounded-sm text-[12.5px] hover:bg-forti-red/90 disabled:opacity-50">
                {ifaceGrading ? "Grading…" : "Submit"}
              </button>
            </div>
            {ifaceError && <div className="text-red-600 text-[12.5px]">{ifaceError}</div>}
            {ifaceReport && (
              <div>
                <div className={`text-[13px] font-medium mb-2 ${ifaceReport.overallPassed ? "text-emerald-600" : "text-red-600"}`}>
                  {ifaceReport.overallPassed ? "Passed" : "Not yet correct"} — {ifaceReport.passedChecks}/{ifaceReport.totalChecks} checks
                </div>
                <div className="space-y-1.5 mb-3">
                  {ifaceReport.results.map((r, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[12.5px] border-b border-gray-100 pb-1.5">
                      <span className="text-gray-700">{r.description} ({r.interfaceName})</span>
                      <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${r.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {r.passed ? "PASS" : "FAIL"}
                      </span>
                    </div>
                  ))}
                </div>
                {ifaceAiRemark && (
                  <div className="bg-amber-50 border border-amber-200 rounded p-3 text-[12.5px] text-amber-900">
                    <div className="font-medium mb-1">Tutor feedback</div>
                    {ifaceAiRemark}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4">
            <HardQuestionCard taskId={activeIfaceScenarioId} session={session} />
          </div>
        </>
      )}

      {track === "port" && (
        <>
          {/* Scenario description */}
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
            <div className="text-[13px] font-semibold text-amber-900 mb-0.5">{portScenario?.title}</div>
            <p className="text-[12px] text-amber-800 leading-relaxed">{portScenario?.description}</p>
          </div>

          {/* Full-width two-column layout */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:16, alignItems:"start" }}>

            {/* LEFT — full-width 3D cable drag */}
            <div className="bg-white border border-gray-200 rounded-md p-4" style={{ minHeight:520 }}>
              <CableDragDiagram ports={portAssignments} onChange={handlePortChange} fullHeight />
            </div>

            {/* RIGHT — exercise list + grading */}
            <div className="space-y-4">

              {/* Exercise selector */}
              {!cameFromTask && (
                <div className="bg-white border border-gray-200 rounded-md p-4">
                  <div className="text-[12px] font-medium text-gray-700 mb-2">Exercises</div>
                  <div className="space-y-1.5">
                    {ALL_PORT_SCENARIOS.map((s, idx) => {
                      const completed = session.completedTaskIds.has(s.id);
                      return (
                        <div key={s.id} onClick={() => setActivePortScenarioId(s.id)}
                          className={`flex items-center gap-2.5 p-2 rounded border cursor-pointer transition-colors ${activePortScenarioId === s.id ? "border-forti-red bg-red-50" : "border-gray-200 hover:bg-gray-50"}`}>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 text-[10px] font-bold ${completed ? "bg-emerald-500 border-emerald-500 text-white" : activePortScenarioId === s.id ? "border-forti-red text-forti-red" : "border-gray-300 text-gray-400"}`}>
                            {completed ? "✓" : idx + 1}
                          </div>
                          <div className="text-[12px] font-medium text-gray-800 truncate">{s.title}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Grading */}
              <div className="bg-white border border-gray-200 rounded-md p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[13px] font-medium text-gray-700">Submit for Grading</div>
                  <button onClick={submitPortGrading} disabled={portGrading}
                    className="px-3 py-1.5 bg-forti-red text-white rounded-sm text-[12.5px] hover:bg-forti-red/90 disabled:opacity-50">
                    {portGrading ? "Grading…" : "Submit"}
                  </button>
                </div>
                {portError && <div className="text-red-600 text-[12.5px]">{portError}</div>}
                {portReport && (
                  <div>
                    <div className={`text-[13px] font-medium mb-2 ${portReport.overallPassed ? "text-emerald-600" : "text-red-600"}`}>
                      {portReport.overallPassed ? "✓ Passed" : "Not yet correct"} — {portReport.passedChecks}/{portReport.totalChecks} checks
                    </div>
                    <div className="space-y-1.5">
                      {portReport.results.map((r, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[12px] border-b border-gray-100 pb-1.5">
                          <span className="text-gray-700 text-[11.5px]">{r.description}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${r.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                            {r.passed ? "PASS" : "FAIL"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {portAiRemark && (
                  <div className="bg-amber-50 border border-amber-200 rounded p-3 text-[12px] text-amber-900 mt-3">
                    <div className="font-medium mb-1">Tutor feedback</div>
                    {portAiRemark}
                  </div>
                )}
              </div>

              {/* Knowledge check */}
              <HardQuestionCard taskId={portScenario?.id} session={session} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
