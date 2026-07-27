import { useState } from "react";
import { Link } from "react-router-dom";
import type { FirewallPolicy, TestPacket, PolicyTraceEntry, InterfaceZone, WebFilterProfile } from "@fortisim/engine";
import { evaluatePacket } from "@fortisim/engine";
import { PacketFlowPanel } from "../components/policyObjects/PacketFlowPanel";
import { NetworkSimCanvas } from "../components/policyObjects/NetworkSimCanvas";
import { NetworkTopology } from "../components/policyObjects/NetworkTopology";
import { HardQuestionCard } from "../components/HardQuestionCard";
import { getSubmissionFeedback } from "../api/client";
import { ScenarioSession } from "../hooks/useScenarioSession";

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
        <label className="block text-[11px] text-gray-500 mb-1">Profile Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-[12px]" placeholder="e.g. Block-Social-Media" />
      </div>
      <div className="flex-1">
        <label className="block text-[11px] text-gray-500 mb-1">Blocked Domains (comma-separated)</label>
        <input value={domains} onChange={(e) => setDomains(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-[12px] font-mono" placeholder="instagram.com, facebook.com" />
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

  const [draft, setDraft] = useState<Omit<FirewallPolicy, "id">>(emptyPolicyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{ packet: TestPacket; action: "ACCEPT" | "DENY"; matchedPolicyName: string | null }[]>([]);
  const [flowTraces, setFlowTraces] = useState<{ packet: TestPacket; trace: PolicyTraceEntry[]; finalAction: "ACCEPT" | "DENY" }[]>([]);
  const [activeFlow, setActiveFlow] = useState<{ srcZone: InterfaceZone; dstZone: InterfaceZone; action: "ACCEPT" | "DENY" } | null>(null);
  const [showSim, setShowSim] = useState(false);
  const [grading, setGrading] = useState(false);
  const [gradeReport, setGradeReport] = useState<any>(null);
  const [aiRemark, setAiRemark] = useState<string | null>(null);
  const [gradeError, setGradeError] = useState<string | null>(null);

  function resetDraft() { setDraft(emptyPolicyDraft()); setEditingId(null); }

  function startEdit(policy: FirewallPolicy) {
    const { id, ...rest } = policy;
    setDraft(rest); setEditingId(id); setSelectedRow(id);
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
    setGrading(true); setGradeError(null); setGradeReport(null); setAiRemark(null);
    try {
      const { report, aiRemark } = await getSubmissionFeedback(scenarioId, { scenarioId, addresses, services, webFilterProfiles, policies });
      setGradeReport(report); setAiRemark(aiRemark);
      if (report?.overallPassed) session.markTaskComplete(scenarioId);
    } catch (err: any) {
      setGradeError(err.message ?? "Grading request failed");
    } finally {
      setGrading(false);
    }
  }

  function nameForIds(ids: string[], list: { id: string; name: string }[]): string {
    if (ids.length === 0) return "—";
    return ids.map((id) => list.find((x) => x.id === id)?.name ?? id).join(", ");
  }

  if (loadError) return <div className="text-red-600">Failed to load scenario: {loadError}</div>;
  if (!scenario) return <div className="text-gray-500">Loading scenario…</div>;

  return (
    <div className="grid grid-cols-[1fr_300px] gap-5 max-w-[1400px]">
      <div>
        <div className="mb-4">
          <Link to="/tasks/policy" className="inline-flex items-center gap-1 text-[11.5px] text-forti-red hover:underline mb-2">← Back to Tasks</Link>
          <h1 className="text-lg font-bold text-forti-dark">Firewall Policy</h1>
        </div>

        <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-md p-4 mb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-400 text-white rounded uppercase tracking-wide">Mission</span>
            <span className="text-[13px] font-bold text-amber-900">{scenario.title}</span>
          </div>
          <p className="text-[12.5px] text-amber-800 leading-relaxed">{scenario.description}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-md overflow-hidden mb-5">
          <div className="flex items-center gap-2 px-2 py-1.5 border-b border-gray-200 bg-gray-50">
            <button onClick={resetDraft} className="text-[12px] px-2.5 py-1 bg-forti-red text-white rounded-sm hover:bg-forti-red/90 flex items-center gap-1"><span className="text-[13px] leading-none">+</span> Create New</button>
            <button onClick={() => { const p = policies.find((p) => p.id === selectedRow); if (p) startEdit(p); else alert("Select a policy row first."); }} className="text-[12px] px-2.5 py-1 border border-gray-300 rounded-sm text-gray-600 hover:bg-gray-100">Edit</button>
            <button onClick={() => { if (selectedRow) deletePolicy(selectedRow); }} disabled={!selectedRow} className="text-[12px] px-2.5 py-1 border border-gray-300 rounded-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40">Delete</button>
          </div>
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-left border-b border-gray-200">
                {["#","Name","Src Intf","Dst Intf","Src Addr","Dst Addr","Service","Action","NAT","Security","Log","Type",""].map((h, i) => (
                  <th key={i} className="px-3 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {policies.length === 0 && <tr><td colSpan={13} className="px-3 py-6 text-center text-gray-400">No policies yet — use "Create New" below.</td></tr>}
              {policies.map((p, idx) => (
                <tr key={p.id} onClick={() => setSelectedRow(p.id)} className={`border-b border-gray-100 cursor-pointer ${selectedRow === p.id ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                  <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium text-gray-800">{p.name}</td>
                  <td className="px-3 py-2">{p.srcIntf}</td>
                  <td className="px-3 py-2">{p.dstIntf}</td>
                  <td className="px-3 py-2">{nameForIds(p.srcAddrIds, addresses)}</td>
                  <td className="px-3 py-2">{nameForIds(p.dstAddrIds, addresses)}</td>
                  <td className="px-3 py-2">{nameForIds(p.serviceIds, services)}</td>
                  <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${p.action === "ACCEPT" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{p.action}</span></td>
                  <td className="px-3 py-2 text-gray-400">Disabled</td>
                  <td className="px-3 py-2 text-gray-400">—</td>
                  <td className="px-3 py-2">{p.log ? "On" : "Off"}</td>
                  <td className="px-3 py-2 text-gray-400">Standard</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={(e) => { e.stopPropagation(); movePolicy(p.id, -1); }} disabled={idx === 0} className="px-1 text-gray-500 hover:text-gray-800 disabled:opacity-30">↑</button>
                      <button onClick={(e) => { e.stopPropagation(); movePolicy(p.id, 1); }} disabled={idx === policies.length - 1} className="px-1 text-gray-500 hover:text-gray-800 disabled:opacity-30">↓</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2 text-[11.5px] text-gray-400 border-t border-gray-100 bg-gray-50">Implicit rule: any traffic not matched above is denied (default-deny).</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-4 mb-5">
          <div className="text-[13px] font-medium text-gray-700 mb-3">{editingId ? "Edit Policy" : "New Policy"}</div>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Name</label>
              <input type="text" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} className="w-full border border-gray-300 rounded px-2 py-1.5 text-[12.5px]" placeholder="e.g. Allow-HTTPS-to-WebServer" />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-[11px] text-gray-500 mb-1">Source Interface</label>
                <select value={draft.srcIntf} onChange={(e) => setDraft((d) => ({ ...d, srcIntf: e.target.value as InterfaceZone }))} className="w-full border border-gray-300 rounded px-2 py-1.5 text-[12.5px]">
                  {INTERFACES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-[11px] text-gray-500 mb-1">Dest Interface</label>
                <select value={draft.dstIntf} onChange={(e) => setDraft((d) => ({ ...d, dstIntf: e.target.value as InterfaceZone }))} className="w-full border border-gray-300 rounded px-2 py-1.5 text-[12.5px]">
                  {INTERFACES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-3">
            {(["srcAddrIds", "dstAddrIds"] as const).map((field) => (
              <div key={field}>
                <label className="block text-[11px] text-gray-500 mb-1">{field === "srcAddrIds" ? "Source" : "Dest"} Address</label>
                <div className="border border-gray-300 rounded p-2 max-h-28 overflow-y-auto space-y-1">
                  {addresses.map((a) => (
                    <label key={a.id} className="flex items-center gap-1.5 text-[12px]">
                      <input type="checkbox" checked={draft[field].includes(a.id)} onChange={() => toggleMultiSelect(field, a.id)} />
                      {a.name} <span className="text-gray-400">({a.value})</span>
                    </label>
                  ))}
                  {addresses.length === 0 && <div className="text-gray-400 text-[12px]">No addresses yet.</div>}
                </div>
              </div>
            ))}
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Service</label>
              <div className="border border-gray-300 rounded p-2 max-h-28 overflow-y-auto space-y-1">
                {services.map((s) => (
                  <label key={s.id} className="flex items-center gap-1.5 text-[12px]">
                    <input type="checkbox" checked={draft.serviceIds.includes(s.id)} onChange={() => toggleMultiSelect("serviceIds", s.id)} />
                    {s.name} <span className="text-gray-400">({s.protocol}{s.port ? `/${s.port}` : ""})</span>
                  </label>
                ))}
                {services.length === 0 && <div className="text-gray-400 text-[12px]">No services yet.</div>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-5 mb-3">
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-gray-500">Action</label>
              <select value={draft.action} onChange={(e) => setDraft((d) => ({ ...d, action: e.target.value as "ACCEPT" | "DENY" }))} className="border border-gray-300 rounded px-2 py-1 text-[12.5px]">
                <option value="ACCEPT">ACCEPT</option>
                <option value="DENY">DENY</option>
              </select>
            </div>
            <label className="flex items-center gap-1.5 text-[12.5px] text-gray-600">
              <input type="checkbox" checked={draft.log} onChange={(e) => setDraft((d) => ({ ...d, log: e.target.checked }))} />
              Enable logging
            </label>
            {webFilterProfiles.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-gray-500">Web Filter</label>
                <select value={draft.webFilterProfileId ?? ""} onChange={(e) => setDraft((d) => ({ ...d, webFilterProfileId: e.target.value || undefined }))} className="border border-gray-300 rounded px-2 py-1 text-[12.5px]">
                  <option value="">None</option>
                  {webFilterProfiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={savePolicy} className="px-3 py-1.5 bg-forti-red text-white rounded-sm text-[12.5px] hover:bg-forti-red/90">{editingId ? "Save Changes" : "Add Policy"}</button>
            {editingId && <button onClick={resetDraft} className="px-3 py-1.5 border border-gray-300 rounded-sm text-[12.5px] text-gray-600 hover:bg-gray-50">Cancel</button>}
          </div>
        </div>

        {scenario.starterWebFilterProfiles !== undefined && (
          <div className="bg-white border border-gray-200 rounded-md p-4 mb-5">
            <div className="text-[13px] font-medium text-gray-700 mb-1">Web Filter Profiles</div>
            <p className="text-[11.5px] text-gray-400 mb-3">Create a profile with blocked domains, then attach it to a policy using the Web Filter dropdown above.</p>
            <div className="space-y-2 mb-3">
              {webFilterProfiles.map((profile) => (
                <div key={profile.id} className="flex items-start justify-between border border-gray-200 rounded p-2.5 text-[12.5px]">
                  <div>
                    <div className="font-medium text-gray-800">{profile.name}</div>
                    <div className="text-gray-400 text-[11px] mt-0.5">Blocks: {profile.blockedDomains.join(", ") || "—"}</div>
                  </div>
                  <button onClick={() => setWebFilterProfiles((prev) => prev.filter((p) => p.id !== profile.id))} className="text-gray-400 hover:text-red-500 text-[11px]">✕</button>
                </div>
              ))}
              {webFilterProfiles.length === 0 && <div className="text-gray-400 text-[12px]">No profiles yet.</div>}
            </div>
            <WebFilterProfileForm onAdd={(p) => setWebFilterProfiles((prev) => [...prev, p])} />
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-md p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[13px] font-medium text-gray-700">Test Connectivity</div>
            <div className="flex gap-2">
              <button onClick={runTestConnectivity} className="px-3 py-1.5 border border-gray-300 rounded-sm text-[12.5px] text-gray-700 hover:bg-gray-50">Run Test Packets</button>
              <button onClick={runVisualPacketTest} className="px-3 py-1.5 bg-forti-red text-white rounded-sm text-[12.5px] hover:bg-forti-red/90">Run Packet Test (Visual)</button>
              <button onClick={() => { runVisualPacketTest(); setShowSim(true); }} className="px-3 py-1.5 bg-gray-800 text-white rounded-sm text-[12.5px] hover:bg-gray-700">🌐 Network Sim</button>
            </div>
          </div>
          <p className="text-[11.5px] text-gray-400 mb-2">Runs instantly in your browser. Does not submit or grade your work.</p>
          {testResults.length > 0 && (
            <div className="space-y-1.5">
              {testResults.map((r) => (
                <div key={r.packet.id} className="flex items-center justify-between text-[12.5px] border-b border-gray-100 pb-1.5">
                  <span className="text-gray-700">{r.packet.description}</span>
                  <span className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${r.action === "ACCEPT" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{r.action}</span>
                    <span className="text-gray-400">{r.matchedPolicyName ? `via "${r.matchedPolicyName}"` : "default-deny"}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[13px] font-medium text-gray-700">Submit for Grading</div>
            <button onClick={submitForGrading} disabled={grading} className="px-3 py-1.5 bg-forti-red text-white rounded-sm text-[12.5px] hover:bg-forti-red/90 disabled:opacity-50">{grading ? "Grading…" : "Submit"}</button>
          </div>
          {gradeError && <div className="text-red-600 text-[12.5px]">{gradeError}</div>}
          {gradeReport && (
            <div>
              <div className={`text-[13px] font-medium mb-2 ${gradeReport.overallPassed ? "text-emerald-600" : "text-red-600"}`}>
                {gradeReport.overallPassed ? "✓ Passed" : "✕ Not yet correct"} — {gradeReport.passedChecks}/{gradeReport.totalChecks} checks
              </div>
              <div className="space-y-1.5 mb-3">
                {gradeReport.diagnostics.map((d: any) => (
                  <div key={d.testPacketId} className="flex items-center justify-between text-[12.5px] border-b border-gray-100 pb-1.5">
                    <span className="text-gray-700">{d.description}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${d.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{d.passed ? "PASS" : "FAIL"}</span>
                  </div>
                ))}
              </div>
              {aiRemark && (
                <div className="bg-amber-50 border border-amber-200 rounded p-3 text-[12.5px] text-amber-900">
                  <div className="font-medium mb-1">Tutor feedback</div>
                  {aiRemark}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <NetworkTopology addresses={addresses} activeFlow={activeFlow} />
        <PacketFlowPanel traces={flowTraces} />
        <HardQuestionCard taskId={scenarioId} session={session} />
      </div>

      {showSim && (
        <NetworkSimCanvas
          addresses={addresses}
          traces={flowTraces}
          onClose={() => setShowSim(false)}
        />
      )}
    </div>
  );
}
