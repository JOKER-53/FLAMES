import { InterfaceCli } from "../../components/configuration/InterfaceCli";
import { TaskTopology } from "../../components/policyObjects/TaskTopology";
import { useSimulatorDraft } from "../../drafts/useSimulatorDraft";
import { DraftWorkspace } from "../../drafts/DraftWorkspace";
import { apiFetch } from "../../api/http";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import type { AdminAccess, InterfaceConfig, InterfaceGradingReport, PortGradingReport } from "@fortisim/engine";
import { ALL_INTERFACE_SCENARIOS, ALL_PORT_SCENARIOS, interfaceFullScenario, portFinalScenario } from "@fortisim/engine";
import { CableDragDiagram } from "../../components/policyObjects/CableDragDiagram";
import type { PortZone, PortAssignment } from "../../components/policyObjects/ChassisDiagram";
import { InterfaceTopology } from "../../components/policyObjects/InterfaceTopology";
import { HardQuestionCard } from "../../components/HardQuestionCard";
import { type TutorSource } from "../../components/TutorSourceTag";
import { LessonFrame } from "../../components/shell/LessonFrame";
import { CheckYourWork, ConsoleFrame } from "../../components/lesson/LessonParts";
import { ScenarioSession } from "../../hooks/useScenarioSession";

const ADMIN_ACCESS_OPTIONS: AdminAccess[] = ["PING", "HTTPS", "SSH", "HTTP"];
type TrackType = "interface" | "port";

// The port registry already contains its final; do not duplicate its ID.
const ALL_PORT_SCENARIOS_AND_FINAL = ALL_PORT_SCENARIOS;
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

  const [track, setTrack] = useState<TrackType>(urlTrack === "port" ? "port" : "interface");
  const [activeIfaceScenarioId, setActiveIfaceScenarioId] = useState<string>(
    urlTrack === "interface" && urlScenario ? urlScenario : ALL_INTERFACE_SCENARIOS[0].id
  );
  const ifaceDraft = useSimulatorDraft<InterfaceConfig[]>("fortigate", activeIfaceScenarioId, "interfaces", ALL_INTERFACE_SCENARIOS_AND_FINAL.find(s => s.id === activeIfaceScenarioId)?.starterInterfaces ?? [], "1", track === "interface");
  const interfaces = ifaceDraft.value, setInterfaces = ifaceDraft.setValue;
  const [ifaceGrading, setIfaceGrading] = useState(false);
  const [ifaceReport, setIfaceReport] = useState<InterfaceGradingReport | null>(null);
  const [ifaceAiRemark, setIfaceAiRemark] = useState<string | null>(null);
  const [ifaceRemarkSource, setIfaceRemarkSource] = useState<TutorSource | null>(null);
  const [ifaceError, setIfaceError] = useState<string | null>(null);

  const [activePortScenarioId, setActivePortScenarioId] = useState<string>(
    urlTrack === "port" && urlScenario ? urlScenario : ALL_PORT_SCENARIOS[0].id
  );
  const portScenario = ALL_PORT_SCENARIOS_AND_FINAL.find((s) => s.id === activePortScenarioId);
  const portDraft = useSimulatorDraft<PortAssignment[]>("fortigate", activePortScenarioId, "ports", portScenario ? portScenario.ports.map(p => ({ portId: p.portId, label: p.label, zone: "unassigned" as PortZone, locked: p.locked })) : [], "1", track === "port");
  const portAssignments = portDraft.value, setPortAssignments = portDraft.setValue;
  const [portGrading, setPortGrading] = useState(false);
  const [portReport, setPortReport] = useState<PortGradingReport | null>(null);
  const [portAiRemark, setPortAiRemark] = useState<string | null>(null);
  const [portRemarkSource, setPortRemarkSource] = useState<TutorSource | null>(null);
  const [portError, setPortError] = useState<string | null>(null);

  const ifaceGeneration = useRef(0);
  const portGeneration = useRef(0);
  useEffect(() => {
    ifaceGeneration.current++;
    setIfaceGrading(false); setIfaceReport(null); setIfaceAiRemark(null); setIfaceRemarkSource(null); setIfaceError(null);
    return () => { ifaceGeneration.current++; };
  }, [activeIfaceScenarioId, interfaces, track]);
  useEffect(() => {
    portGeneration.current++;
    setPortGrading(false); setPortReport(null); setPortAiRemark(null); setPortRemarkSource(null); setPortError(null);
    return () => { portGeneration.current++; };
  }, [activePortScenarioId, portAssignments, track]);

  // Lessons share this page, so follow the URL when the student moves between them.
  useEffect(() => {
    setTrack(urlTrack === "port" ? "port" : "interface");
    if (!urlScenario) return;
    if (urlTrack === "port") setActivePortScenarioId(urlScenario);
    else setActiveIfaceScenarioId(urlScenario);
  }, [urlTrack, urlScenario]);

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
    const generation = ++ifaceGeneration.current;
    setIfaceGrading(true);
    setIfaceReport(null);
    setIfaceAiRemark(null);
    setIfaceError(null);
    try {
      const res = await apiFetch(`/api/interface-submissions/${activeIfaceScenarioId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: activeIfaceScenarioId, interfaces }),
      });
      if (!res.ok) throw new Error("Grading request failed");
      const result = await res.json();
      if (generation !== ifaceGeneration.current) return;
      setIfaceReport(result.report);
      setIfaceAiRemark(result.aiRemark ?? null);
      setIfaceRemarkSource(result.remarkSource ?? null);
      if (result.report?.overallPassed) {
        session.markTaskComplete(activeIfaceScenarioId);
      }
    } catch (err: any) {
      if (generation !== ifaceGeneration.current) return;
      setIfaceError(err.message ?? "Grading failed");
    } finally {
      if (generation === ifaceGeneration.current) setIfaceGrading(false);
    }
  }

  async function submitPortGrading() {
    if (!portScenario) return;
    const generation = ++portGeneration.current;
    setPortGrading(true);
    setPortReport(null);
    setPortAiRemark(null);
    setPortError(null);
    try {
      const res = await apiFetch(`/api/port-submissions/${portScenario.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: portScenario.id, assignments: portAssignments.map(({ portId, zone }) => ({ portId, zone })) }),
      });
      if (!res.ok) throw new Error("Grading request failed");
      const result = await res.json();
      if (generation !== portGeneration.current) return;
      setPortReport(result.report ?? result);
      setPortAiRemark(result.aiRemark ?? null);
      setPortRemarkSource(result.remarkSource ?? null);
      if ((result.report ?? result)?.overallPassed) {
        session.markTaskComplete(portScenario.id);
      }
    } catch (err: any) {
      if (generation !== portGeneration.current) return;
      setPortError(err.message ?? "Grading failed");
    } finally {
      if (generation === portGeneration.current) setPortGrading(false);
    }
  }

  const ifaceScenario = ALL_INTERFACE_SCENARIOS_AND_FINAL.find((s) => s.id === activeIfaceScenarioId);
  const lessonScenario = track === "port" ? portScenario : ifaceScenario;

  return (
    <LessonFrame title={lessonScenario?.title.replace(/^\W+\s*/, "") ?? "Interfaces"} brief={lessonScenario?.description}>
      <DraftWorkspace draft={track === "port" ? portDraft.controls : ifaceDraft.controls}>
      {track === "interface" && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-6">
            <InterfaceTopology
              interfaces={interfaces}
              focus={activeIfaceScenarioId === "interface-ip-01" ? "ip" : activeIfaceScenarioId === "interface-access-01" ? "access" : "all"}
            />

            <ConsoleFrame path={["Network", "Interfaces"]}>
              <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="bg-sunken text-muted text-left border-b border-line">
                    <th className="px-3 py-2 font-medium">Interface</th>
                    <th className="px-3 py-2 font-medium">Zone</th>
                    <th className="px-3 py-2 font-medium">IP Address</th>
                    <th className="px-3 py-2 font-medium">Subnet (CIDR)</th>
                    <th className="px-3 py-2 font-medium">Administrative Access</th>
                  </tr>
                </thead>
                <tbody>
                  {interfaces.map((intf) => (
                    <tr key={intf.name} className="border-b border-line last:border-0">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                          <span className="font-medium text-ink">{intf.name}</span>
                        </div>
                        <div className="text-[11px] text-faint ml-4">{intf.description}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-info-soft text-info">{intf.role}</span>
                      </td>
                      <td className="px-3 py-3">
                        <input type="text" aria-label={`${intf.name} IP address`} value={intf.ip} onChange={(e) => updateField(intf.name, "ip", e.target.value)} className="w-36 border border-line-strong rounded px-2 py-1 text-[12px] font-mono" placeholder="e.g. 10.0.2.1" />
                      </td>
                      <td className="px-3 py-3">
                        <input type="text" aria-label={`${intf.name} subnet prefix`} value={intf.subnet} onChange={(e) => updateField(intf.name, "subnet", e.target.value)} className="w-20 border border-line-strong rounded px-2 py-1 text-[12px] font-mono" placeholder="e.g. 24" />
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
            </ConsoleFrame>

            <InterfaceCli key={ifaceDraft.controls.scopeKey} rows={interfaces} apply={setInterfaces} />

          <CheckYourWork
              onSubmit={submitIfaceGrading}
              grading={ifaceGrading}
              error={ifaceError}
              result={ifaceReport && { passed: ifaceReport.overallPassed, checks: ifaceReport.results.map(r => ({ label: r.description, detail: r.interfaceName, passed: r.passed })) }}
              tutor={{ text: ifaceAiRemark, source: ifaceRemarkSource }}
            />
          </div>
          <aside className="min-w-0">
            <HardQuestionCard taskId={activeIfaceScenarioId} session={session} />
          </aside>
        </div>
      )}

      {track === "port" && (
        <div className="space-y-6">
          <TaskTopology vendor="fortigate" family="ports" config={portAssignments}/>
          <ConsoleFrame path={["Network", "Physical ports"]}>
            <div className="p-4">
              <CableDragDiagram ports={portAssignments} onChange={handlePortChange} fullHeight />
            </div>
          </ConsoleFrame>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] items-start">
            <CheckYourWork
              onSubmit={submitPortGrading}
              grading={portGrading}
              error={portError}
              result={portReport && { passed: portReport.overallPassed, checks: portReport.results.map(r => ({ label: r.description, passed: r.passed })) }}
              tutor={{ text: portAiRemark, source: portRemarkSource }}
            />
            <HardQuestionCard taskId={portScenario?.id} session={session} />
          </div>
        </div>
      )}
    </DraftWorkspace>
    </LessonFrame>
  );
}
