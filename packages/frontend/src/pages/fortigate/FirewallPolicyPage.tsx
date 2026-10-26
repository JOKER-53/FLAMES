import { ExerciseTopologyDiagram } from "../../components/topology/ExerciseTopologyDiagram";
import { focusConfigurationRow } from "../../components/configuration/DecisionTrace";
import { DraftWorkspace } from "../../drafts/DraftWorkspace";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { FirewallPolicy, TestPacket, PolicyTraceEntry, InterfaceZone, WebFilterProfile } from "@fortisim/engine";
import { evaluatePacket } from "@fortisim/engine";
import { PacketFlowPanel } from "../../components/policyObjects/PacketFlowPanel";
import { NetworkSimCanvas } from "../../components/policyObjects/NetworkSimCanvas";
import { NetworkTopology } from "../../components/policyObjects/NetworkTopology";
import { HardQuestionCard } from "../../components/HardQuestionCard";
import { type TutorSource } from "../../components/TutorSourceTag";
import { LessonFrame } from "../../components/shell/LessonFrame";
import { CheckYourWork, ConsoleFrame } from "../../components/lesson/LessonParts";
import { Callout, Section } from "../../components/ui/primitives";
import { Icon } from "../../components/ui/Icon";
import { getSubmissionFeedback } from "../../api/client";
import { ScenarioSession } from "../../hooks/useScenarioSession";

const INTERFACES: InterfaceZone[] = ["WAN", "LAN", "DMZ"];

interface FirewallPolicyPageProps {
  session: ScenarioSession;
}

function WebFilterProfileForm({ onAdd }: { onAdd: (p: WebFilterProfile) => void }) {
  const [name, setName] = useState("");
  const [domains, setDomains] = useState("");
  function handleAdd() {
    if (!name.trim()) { alert("Profile needs a name."); return; }
    onAdd({ id: `wf_${Date.now()}`, name: name.trim(), blockedDomains: domains.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean) });
    setName(""); setDomains("");
  }
  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1">
        <label className="block text-[11px] text-muted mb-1">Profile Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-line-strong rounded px-2 py-1.5 text-[12px]" placeholder="e.g. Block-Social-Media" />
      </div>
      <div className="flex-1">
        <label className="block text-[11px] text-muted mb-1">Blocked Domains (comma-separated)</label>
        <input value={domains} onChange={(e) => setDomains(e.target.value)} className="w-full border border-line-strong rounded px-2 py-1.5 text-[12px] font-mono" placeholder="instagram.com, facebook.com" />
      </div>
      <button onClick={handleAdd} className="px-3 py-1.5 bg-forti-red text-white rounded-sm text-[12px] hover:bg-forti-red/90 shrink-0">Add Profile</button>
    </div>
  );
}

function emptyPolicyDraft(): Omit<FirewallPolicy, "id"> {
  return { name: "", srcIntf: "WAN", dstIntf: "DMZ", srcAddrIds: [], dstAddrIds: [], serviceIds: [], action: "ACCEPT", log: false, enabled: true };
}

export function FirewallPolicyPage({ session }: FirewallPolicyPageProps) {
  const { scenarioId, scenario, loadError, addresses, services, policies, setPolicies, webFilterProfiles, setWebFilterProfiles } = session;
  // Lessons link here with ?scenario=…, so the URL decides which scenario is loaded.
  const requestedScenario = useSearchParams()[0].get("scenario");
  useEffect(() => {
    if (requestedScenario && requestedScenario !== scenarioId) session.selectScenario(requestedScenario);
  }, [requestedScenario, scenarioId, session]);

  const [draft, setDraft] = useState<Omit<FirewallPolicy, "id">>(emptyPolicyDraft());
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{ packet: TestPacket; action: "ACCEPT" | "DENY"; matchedPolicyName: string | null }[]>([]);
  const [flowTraces, setFlowTraces] = useState<{ packet: TestPacket; trace: PolicyTraceEntry[]; finalAction: "ACCEPT" | "DENY" }[]>([]);
  const [activeFlow, setActiveFlow] = useState<{ srcZone: InterfaceZone; dstZone: InterfaceZone; action: "ACCEPT" | "DENY" } | null>(null);
  const [showSim, setShowSim] = useState(false);
  const [grading, setGrading] = useState(false);
  const [gradeReport, setGradeReport] = useState<any>(null);
  const [aiRemark, setAiRemark] = useState<string | null>(null);
  const [aiRemarkSource, setAiRemarkSource] = useState<TutorSource | null>(null);
  const [gradeError, setGradeError] = useState<string | null>(null);

  const gradeGeneration = useRef(0);
  useEffect(() => {
    gradeGeneration.current++;
    setGrading(false); setGradeReport(null); setGradeError(null); setAiRemark(null); setAiRemarkSource(null);
    setTestResults([]); setFlowTraces([]); setActiveFlow(null);
    return () => { gradeGeneration.current++; };
  }, [scenarioId, addresses, services, policies, webFilterProfiles]);

  function resetDraft() { setDraft(emptyPolicyDraft()); setEditingId(null); setShowEditor(false); }

  useEffect(() => { resetDraft(); setSelectedRow(null); }, [scenarioId]);

  function startEdit(policy: FirewallPolicy) {
    const { id, ...rest } = policy;
    setShowEditor(true); setDraft(rest); setEditingId(id); setSelectedRow(id);
  }

  function savePolicy() {
    if (!draft.name.trim()) { alert("Policy needs a name."); return; }
    if (draft.srcAddrIds.length === 0 || draft.dstAddrIds.length === 0 || draft.serviceIds.length === 0) {
      alert("Select at least one source address, destination address, and service."); return;
    }
    if (editingId) {
      setPolicies((prev) => prev.map((p) => (p.id === editingId ? { ...draft, id: editingId } : p)));
    } else {
      setPolicies((prev) => [...prev, { ...draft, id: `p_${Date.now()}` }]);
    }
    resetDraft();
  }

  function deletePolicy(id: string) {
    setPolicies((prev) => prev.filter((p) => p.id !== id));
    if (editingId === id) resetDraft();
    if (selectedRow === id) setSelectedRow(null);
  }

  function movePolicy(id: string, direction: -1 | 1) {
    setPolicies((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      const newIdx = idx + direction;
      if (idx === -1 || newIdx < 0 || newIdx >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
      return copy;
    });
  }

  function toggleMultiSelect(field: "srcAddrIds" | "dstAddrIds" | "serviceIds", id: string) {
    setDraft((prev) => {
      const current = prev[field];
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      return { ...prev, [field]: next };
    });
  }

  function runTestConnectivity() {
    if (!scenario) return;
    const results = scenario.testPackets.map((packet) => {
      const result = evaluatePacket(packet, policies, addresses, services, webFilterProfiles);
      const matched = policies.find((p) => p.id === result.matchedPolicyId);
      return { packet, action: result.finalAction, matchedPolicyName: matched ? matched.name : null };
    });
    setTestResults(results);
  }

  function runVisualPacketTest() {
    if (!scenario) return;
    const traces = scenario.testPackets.map((packet) => {
      const result = evaluatePacket(packet, policies, addresses, services, webFilterProfiles);
      return { packet, trace: result.trace, finalAction: result.finalAction };
    });
    setFlowTraces(traces);
    if (traces.length > 0) {
      setActiveFlow({ srcZone: traces[0].packet.srcIntf, dstZone: traces[0].packet.dstIntf, action: traces[0].finalAction });
    }
  }

  async function submitForGrading() {
    const generation = ++gradeGeneration.current;
    setGrading(true); setGradeError(null); setGradeReport(null); setAiRemark(null);
    try {
      const { report, aiRemark, remarkSource } = await getSubmissionFeedback(scenarioId, { scenarioId, addresses, services, webFilterProfiles, policies });
      if (generation !== gradeGeneration.current) return;
      setGradeReport(report); setAiRemark(aiRemark); setAiRemarkSource(remarkSource ?? null);
      if (report?.overallPassed) session.markTaskComplete(scenarioId);
    } catch (err: any) {
      if (generation !== gradeGeneration.current) return;
      setGradeError(err.message ?? "Grading request failed");
    } finally {
      if (generation === gradeGeneration.current) setGrading(false);
    }
  }

  function nameForIds(ids: string[], list: { id: string; name: string }[]): string {
    if (ids.length === 0) return "—";
    return ids.map((id) => list.find((x) => x.id === id)?.name ?? id).join(", ");
  }

  if (loadError) return <Callout tone="danger" title="This lesson could not be loaded">{loadError}</Callout>;
  if (!scenario || scenario.id !== scenarioId) return <p className="text-muted" role="status">Loading lesson…</p>;

  return (
    <LessonFrame title={scenario.title.replace(/^\W+\s*/, "")} brief={scenario.description}>
      <DraftWorkspace draft={session.draft}>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-6">
        <ConsoleFrame path={["Policy & Objects", "Firewall Policy"]}>
          <div className="flex items-center gap-2 px-2 py-1.5 border-b border-line bg-sunken">
            <button aria-label="Create New" onClick={() => { resetDraft(); setShowEditor(true); }} className="text-[12px] px-2.5 py-1 bg-forti-red text-white rounded-sm hover:bg-forti-red/90 flex items-center gap-1"><span className="text-[13px] leading-none">+</span> Create New</button>
            <button disabled={!selectedRow} onClick={() => { const p = policies.find((p) => p.id === selectedRow); if (p) startEdit(p); else alert("Select a policy row first."); }} className="text-[12px] px-2.5 py-1 border border-line-strong rounded-sm text-body hover:bg-sunken">Edit</button>
            <button onClick={() => { if (selectedRow) deletePolicy(selectedRow); }} disabled={!selectedRow} className="text-[12px] px-2.5 py-1 border border-line-strong rounded-sm text-body hover:bg-sunken disabled:opacity-40">Delete</button>
          </div>
          <div className="overflow-x-auto" role="region" aria-label="Firewall policies" tabIndex={0}>
          <table className="w-full min-w-[800px] text-[12.5px]">
            <thead>
              <tr className="bg-sunken text-muted text-left border-b border-line">
                {["#","Name","Src Intf","Dst Intf","Src Addr","Dst Addr","Service","Action","NAT","Security","Log","Type",""].map((h, i) => (
                  <th key={i} className="px-3 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {policies.length === 0 && <tr><td colSpan={13} className="px-3 py-6 text-center text-faint">No policies yet — use "Create New" above.</td></tr>}
              {policies.map((p, idx) => (
                <tr key={p.id} id={`policy-row-${encodeURIComponent(p.id)}`} tabIndex={0} aria-selected={selectedRow===p.id} onKeyDown={event=>{if(event.target===event.currentTarget&&(event.key==="Enter"||event.key===" ")){event.preventDefault();setSelectedRow(p.id);}}} onClick={() => setSelectedRow(p.id)} className={`border-b border-line cursor-pointer ${selectedRow === p.id ? "bg-info-soft" : "hover:bg-sunken"}`}>
                  <td className="px-3 py-2 text-faint">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium text-ink">{p.name}</td>
                  <td className="px-3 py-2">{p.srcIntf}</td>
                  <td className="px-3 py-2">{p.dstIntf}</td>
                  <td className="px-3 py-2">{nameForIds(p.srcAddrIds, addresses)}</td>
                  <td className="px-3 py-2">{nameForIds(p.dstAddrIds, addresses)}</td>
                  <td className="px-3 py-2">{nameForIds(p.serviceIds, services)}</td>
                  <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${p.action === "ACCEPT" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>{p.action}</span></td>
                  <td className="px-3 py-2 text-faint">Disabled</td>
                  <td className="px-3 py-2 text-faint">—</td>
                  <td className="px-3 py-2">{p.log ? "On" : "Off"}</td>
                  <td className="px-3 py-2 text-faint">Standard</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1 justify-end">
                      <button aria-label={`Move ${p.name} up`} onClick={(e) => { e.stopPropagation(); movePolicy(p.id, -1); }} disabled={idx === 0} className="px-1 text-muted hover:text-ink disabled:opacity-30">↑</button>
                      <button aria-label={`Move ${p.name} down`} onClick={(e) => { e.stopPropagation(); movePolicy(p.id, 1); }} disabled={idx === policies.length - 1} className="px-1 text-muted hover:text-ink disabled:opacity-30">↓</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="px-3 py-2 text-[11.5px] text-faint border-t border-line bg-sunken">Implicit rule: any traffic not matched above is denied (default-deny).</div>

        {showEditor && <div className="p-4 border-t border-line">
          <div className="text-[13px] font-medium text-body mb-3">{editingId ? "Edit Policy" : "New Policy"}</div>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label htmlFor="policy-name" className="block text-[11px] text-muted mb-1">Name</label>
              <input id="policy-name" type="text" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} className="w-full border border-line-strong rounded px-2 py-1.5 text-[12.5px]" placeholder="e.g. Allow-HTTPS-to-WebServer" />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-[11px] text-muted mb-1">Source Interface</label>
                <select aria-label="Source Interface" value={draft.srcIntf} onChange={(e) => setDraft((d) => ({ ...d, srcIntf: e.target.value as InterfaceZone }))} className="w-full border border-line-strong rounded px-2 py-1.5 text-[12.5px]">
                  {INTERFACES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-[11px] text-muted mb-1">Dest Interface</label>
                <select aria-label="Dest Interface" value={draft.dstIntf} onChange={(e) => setDraft((d) => ({ ...d, dstIntf: e.target.value as InterfaceZone }))} className="w-full border border-line-strong rounded px-2 py-1.5 text-[12.5px]">
                  {INTERFACES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-3">
            {(["srcAddrIds", "dstAddrIds"] as const).map((field) => (
              <div key={field}>
                <label className="block text-[11px] text-muted mb-1">{field === "srcAddrIds" ? "Source" : "Dest"} Address</label>
                <div className="border border-line-strong rounded p-2 max-h-28 overflow-y-auto space-y-1">
                  {addresses.map((a) => (
                    <label key={a.id} className="flex items-center gap-1.5 text-[12px]">
                      <input type="checkbox" checked={draft[field].includes(a.id)} onChange={() => toggleMultiSelect(field, a.id)} />
                      {a.name} <span className="text-faint">({a.value})</span>
                    </label>
                  ))}
                  {addresses.length === 0 && <div className="text-faint text-[12px]">No addresses yet.</div>}
                </div>
              </div>
            ))}
            <div>
              <label className="block text-[11px] text-muted mb-1">Service</label>
              <div className="border border-line-strong rounded p-2 max-h-28 overflow-y-auto space-y-1">
                {services.map((s) => (
                  <label key={s.id} className="flex items-center gap-1.5 text-[12px]">
                    <input type="checkbox" checked={draft.serviceIds.includes(s.id)} onChange={() => toggleMultiSelect("serviceIds", s.id)} />
                    {s.name} <span className="text-faint">({s.protocol}{s.port ? `/${s.port}` : ""})</span>
                  </label>
                ))}
                {services.length === 0 && <div className="text-faint text-[12px]">No services yet.</div>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-5 mb-3">
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-muted">Action</label>
              <select aria-label="Policy action" value={draft.action} onChange={(e) => setDraft((d) => ({ ...d, action: e.target.value as "ACCEPT" | "DENY" }))} className="border border-line-strong rounded px-2 py-1 text-[12.5px]">
                <option value="ACCEPT">ACCEPT</option>
                <option value="DENY">DENY</option>
              </select>
            </div>
            <label className="flex items-center gap-1.5 text-[12.5px] text-body">
              <input type="checkbox" checked={draft.log} onChange={(e) => setDraft((d) => ({ ...d, log: e.target.checked }))} />
              Enable logging
            </label>
            {webFilterProfiles.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-muted">Web Filter</label>
                <select aria-label="Web Filter" value={draft.webFilterProfileId ?? ""} onChange={(e) => setDraft((d) => ({ ...d, webFilterProfileId: e.target.value || undefined }))} className="border border-line-strong rounded px-2 py-1 text-[12.5px]">
                  <option value="">None</option>
                  {webFilterProfiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={savePolicy} className="px-3 py-1.5 bg-forti-red text-white rounded-sm text-[12.5px] hover:bg-forti-red/90">{editingId ? "Save Changes" : "Add Policy"}</button>
            <button onClick={resetDraft} className="px-3 py-1.5 border border-line-strong rounded-sm text-[12.5px] text-body hover:bg-sunken">Cancel</button>
          </div>
        </div>}

        {scenario.starterWebFilterProfiles !== undefined && (
          <div className="p-4 border-t border-line">
            <div className="text-[13px] font-medium text-body mb-1">Web Filter Profiles</div>
            <p className="text-[11.5px] text-faint mb-3">Create a profile with blocked domains, then attach it to a policy using the Web Filter dropdown above.</p>
            <div className="space-y-2 mb-3">
              {webFilterProfiles.map((profile) => (
                <div key={profile.id} className="flex items-start justify-between border border-line rounded p-2.5 text-[12.5px]">
                  <div>
                    <div className="font-medium text-ink">{profile.name}</div>
                    <div className="text-faint text-[11px] mt-0.5">Blocks: {profile.blockedDomains.join(", ") || "—"}</div>
                  </div>
                  <button onClick={() => setWebFilterProfiles((prev) => prev.filter((p) => p.id !== profile.id))} className="text-faint hover:text-red-500 text-[11px]">✕</button>
                </div>
              ))}
              {webFilterProfiles.length === 0 && <div className="text-faint text-[12px]">No profiles yet.</div>}
            </div>
            <WebFilterProfileForm onAdd={(p) => setWebFilterProfiles((prev) => [...prev, p])} />
          </div>
        )}

        </ConsoleFrame>

        <Section
          title="Test your policy"
          description="Send the scenario's test packets through your rules. This runs in your browser and is not graded."
          actions={<>
            <button onClick={runTestConnectivity} className="btn-secondary btn-sm">Run test packets</button>
            <button onClick={runVisualPacketTest} className="btn-secondary btn-sm">Trace packet flow</button>
            <button onClick={() => { runVisualPacketTest(); setShowSim(true); }} className="btn-secondary btn-sm"><Icon name="network" size={14} />Network view</button>
          </>}
          bodyClassName={testResults.length ? "" : "hidden"}
        >
          <ul className="divide-y divide-line">
            {testResults.map((r) => (
              <li key={r.packet.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-sm">
                <span className="text-body">{r.packet.description}</span>
                <span className="flex items-center gap-2">
                  <span className={`badge ${r.action === "ACCEPT" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>{r.action}</span>
                  <span className="text-xs text-muted">{r.matchedPolicyName ? `matched "${r.matchedPolicyName}"` : "implicit deny"}</span>
                </span>
              </li>
            ))}
          </ul>
        </Section>

        {!scenarioId.startsWith("custom-") && <HardQuestionCard taskId={scenarioId} session={session} />}

        <CheckYourWork
          onSubmit={submitForGrading}
          grading={grading}
          error={gradeError}
          result={gradeReport && { passed: gradeReport.overallPassed, checks: gradeReport.diagnostics.map((d: { description: string; passed: boolean }) => ({ label: d.description, passed: d.passed })) }}
          tutor={{ text: aiRemark, source: aiRemarkSource }}
        />
      </div>

      <aside className="space-y-4 min-w-0">
        {scenario.topology&&<ExerciseTopologyDiagram topology={scenario.topology}/>}
        <NetworkTopology addresses={addresses} packets={scenario.testPackets} activeFlow={activeFlow} />
        <PacketFlowPanel traces={flowTraces} onSelectPolicy={id=>{setSelectedRow(id);focusConfigurationRow("policy-row",id);}} />
      </aside>

      {showSim && (
        <NetworkSimCanvas
          addresses={addresses}
          traces={flowTraces}
          onClose={() => setShowSim(false)}
        />
      )}
    </div>
    </DraftWorkspace>
    </LessonFrame>
  );
}
