import { useSimulatorDraft } from "../../drafts/useSimulatorDraft";
import { DraftWorkspace } from "../../drafts/DraftWorkspace";
import { LessonFrame } from "../../components/shell/LessonFrame";
import { CheckYourWork, ConsoleFrame } from "../../components/lesson/LessonParts";
import { KnowledgeCheckCard } from "../../components/HardQuestionCard";
import { Callout, Section } from "../../components/ui/primitives";
import { Icon } from "../../components/ui/Icon";
import { usePanGrading } from "../../hooks/usePanGrading";
import { PAN_SECURITY_SCENARIOS as SCENARIOS } from "@fortisim/engine";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

type Action = "allow" | "deny";
type AppOption = { id: string; label: string; ports: string; risk: string };

const APP_OPTIONS: AppOption[] = [
  { id:"web-browsing", label:"web-browsing", ports:"TCP/80", risk:"low" },
  { id:"ssl",          label:"ssl",          ports:"TCP/443", risk:"low" },
  { id:"dns",          label:"dns",          ports:"UDP/53",  risk:"low" },
  { id:"ssh",          label:"ssh",          ports:"TCP/22",  risk:"medium" },
  { id:"ftp",          label:"ftp",          ports:"TCP/21",  risk:"medium" },
  { id:"smtp",         label:"smtp",         ports:"TCP/25",  risk:"medium" },
  { id:"rdp",          label:"rdp",          ports:"TCP/3389",risk:"high" },
  { id:"bittorrent",   label:"bittorrent",   ports:"varies",  risk:"high" },
  { id:"any",          label:"any",          ports:"any",     risk:"—" },
];

const ZONES = ["Trust","Untrust","DMZ","Management","any"];

interface Rule {
  id: number;
  name: string;
  srcZone: string;
  dstZone: string;
  apps: string[];
  action: Action;
}



import { PanSession } from "../../hooks/usePanSession";
export function PanSecurityPolicy({ session }: { session: PanSession }) {
  const location = useLocation();
  const [scenarioIdx, setScenarioIdx] = useState(() => Math.max(0, SCENARIOS.findIndex(scenario => scenario.id === (location.state?.taskId ?? new URLSearchParams(location.search).get("task")))));
  const scenario = SCENARIOS[scenarioIdx];
  const persisted = useSimulatorDraft<Rule[]>("paloalto", scenario.id, "pan-security", []);
  const rules = persisted.value, setRules = persisted.setValue;

  const [showNew, setShowNew] = useState(false);
  const [newRule, setNewRule] = useState<Partial<Rule>>({ srcZone:"Trust", dstZone:"Untrust", apps:[], action:"allow", name:"" });
  const { results, setResults, aiFeedback, aiSource, loadingFeedback, grading, gradeError, grade: submitGrade } = usePanGrading(scenario.id, scenario.title, session.markTaskComplete);


  useEffect(() => {
    const id = location.state?.taskId ?? new URLSearchParams(location.search).get("task");
    const index = SCENARIOS.findIndex(scenario => scenario.id === id);
    if (index >= 0) setScenarioIdx(index);
  }, [location.key]);
  useEffect(() => { setResults(null); }, [scenario.id, rules, setResults]);

  function addRule() {
    if (!newRule.name || !newRule.apps?.length) return;
    setRules(r => [...r, { id:Math.max(0, ...rules.map(item => item.id)) + 1, name:newRule.name!, srcZone:newRule.srcZone!, dstZone:newRule.dstZone!, apps:newRule.apps!, action:newRule.action! }]);

    setNewRule({ srcZone:"Trust", dstZone:"Untrust", apps:[], action:"allow", name:"" });
    setShowNew(false);
    setResults(null);
  }

  function deleteRule(id:number) { setRules(r=>r.filter(x=>x.id!==id)); setResults(null); }
  function moveUp(idx:number) { if(idx===0)return; const r=[...rules]; [r[idx-1],r[idx]]=[r[idx],r[idx-1]]; setRules(r); setResults(null); }
  function moveDown(idx:number) { if(idx===rules.length-1)return; const r=[...rules]; [r[idx],r[idx+1]]=[r[idx+1],r[idx]]; setRules(r); setResults(null); }

  function grade() { void submitGrade(rules); }


  function toggleApp(app:string) {
    setNewRule(r=>({ ...r, apps: r.apps?.includes(app) ? r.apps.filter(a=>a!==app) : [...(r.apps??[]),app] }));
  }

  const passed = results?.filter(r=>r.pass).length??0;
  const total  = scenario.checks.length;

  const risk = (level: string) => level === "high" ? "bg-danger-soft text-danger" : level === "medium" ? "bg-warn-soft text-warn" : level === "low" ? "bg-success-soft text-success" : "bg-sunken text-muted";

  return (
    <LessonFrame title={scenario.title} brief={scenario.description} hint={scenario.hint}>
      <DraftWorkspace draft={persisted.controls}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <ConsoleFrame
            path={["Policies", "Security"]}
            actions={<button onClick={() => setShowNew(!showNew)} className="btn-sm btn bg-accent text-white hover:bg-accent/90"><Icon name="plus" size={14} />Add rule</button>}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="bg-sunken text-body text-left border-b border-line-strong">
                    {["", "#", "Name", "Source Zone", "Destination Zone", "Application", "Action", ""].map((h, i) => <th key={i} className="px-3 py-2 font-semibold">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rules.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-8 text-center text-muted">No rules yet. Use “Add rule” to create your first security rule.</td></tr>
                  )}
                  {rules.map((r, i) => (
                    <tr key={r.id} className="border-b border-line hover:bg-sunken/60">
                      <td className="pl-3 py-2 w-6">
                        <div className="flex flex-col">
                          <button aria-label={`Move ${r.name} up`} onClick={() => moveUp(i)} disabled={i === 0} className="text-faint hover:text-ink disabled:opacity-30"><Icon name="chevronDown" size={13} className="rotate-180" /></button>
                          <button aria-label={`Move ${r.name} down`} onClick={() => moveDown(i)} disabled={i === rules.length - 1} className="text-faint hover:text-ink disabled:opacity-30"><Icon name="chevronDown" size={13} /></button>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted tabular-nums">{i + 1}</td>
                      <td className="px-3 py-2 font-medium text-ink">{r.name}</td>
                      <td className="px-3 py-2"><span className="badge bg-info-soft text-info">{r.srcZone}</span></td>
                      <td className="px-3 py-2"><span className="badge bg-warn-soft text-warn">{r.dstZone}</span></td>
                      <td className="px-3 py-2 font-mono text-xs text-body">{r.apps.join(", ")}</td>
                      <td className="px-3 py-2"><span className={`badge font-semibold ${r.action === "allow" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>{r.action}</span></td>
                      <td className="pr-3 py-2 text-right"><button aria-label={`Delete ${r.name}`} onClick={() => deleteRule(r.id)} className="text-faint hover:text-danger"><Icon name="trash" size={15} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-2 text-xs italic text-muted bg-sunken border-t border-line">interzone-default — traffic between zones that matches no rule above is denied</div>

            {showNew && (
              <div className="p-4 border-t border-line-strong bg-sunken">
                <div className="text-sm font-semibold text-ink mb-3">New security rule</div>
                <div className="grid gap-3 sm:grid-cols-3 mb-4">
                  <label><span className="field-label">Rule name</span>
                    <input className="input" value={newRule.name ?? ""} onChange={e => setNewRule(r => ({ ...r, name: e.target.value }))} placeholder="e.g. Allow-Web-Outbound" />
                  </label>
                  <label><span className="field-label">Source zone</span>
                    <select className="input" value={newRule.srcZone} onChange={e => setNewRule(r => ({ ...r, srcZone: e.target.value }))}>{ZONES.map(z => <option key={z}>{z}</option>)}</select>
                  </label>
                  <label><span className="field-label">Destination zone</span>
                    <select className="input" value={newRule.dstZone} onChange={e => setNewRule(r => ({ ...r, dstZone: e.target.value }))}>{ZONES.map(z => <option key={z}>{z}</option>)}</select>
                  </label>
                </div>
                <fieldset className="mb-4">
                  <legend className="field-label">Applications (App-ID)</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {APP_OPTIONS.map(a => {
                      const on = !!newRule.apps?.includes(a.id);
                      return (
                        <button key={a.id} aria-pressed={on} onClick={() => toggleApp(a.id)}
                          className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded border text-xs font-mono ${on ? "border-accent bg-accent-soft text-ink" : "border-line-strong bg-surface text-body hover:border-faint"}`}>
                          {on && <Icon name="check" size={12} strokeWidth={2.5} className="text-accent" />}{a.label}<span className="text-faint">{a.ports}</span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
                <div className="flex flex-wrap items-center gap-4">
                  <fieldset className="flex items-center gap-4">
                    <legend className="sr-only">Action</legend>
                    <span className="text-xs font-medium text-ink">Action</span>
                    {(["allow", "deny"] as Action[]).map(a => (
                      <label key={a} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input type="radio" checked={newRule.action === a} onChange={() => setNewRule(r => ({ ...r, action: a }))} />{a}
                      </label>
                    ))}
                  </fieldset>
                  <div className="ml-auto flex gap-2">
                    <button onClick={() => setShowNew(false)} className="btn-secondary btn-sm">Cancel</button>
                    <button onClick={addRule} disabled={!newRule.name || !newRule.apps?.length} className="btn-primary btn-sm">Add rule</button>
                  </div>
                </div>
              </div>
            )}
          </ConsoleFrame>

          <CheckYourWork
            onSubmit={grade}
            grading={grading}
            error={gradeError}
            result={results && { passed: passed === total, checks: results.map(r => ({ label: r.desc, passed: r.pass })) }}
            tutor={{ text: aiFeedback, source: aiSource, loading: loadingFeedback }}
          />

          <KnowledgeCheckCard platform="paloalto" taskId={scenario.id} completed={session.completedTaskIds.has(scenario.id)} onComplete={session.markTaskComplete} />
        </div>

        <aside className="min-w-0 space-y-4">
          <Section title="App-ID reference" bodyClassName="px-5 py-2">
            <ul className="divide-y divide-line">
              {APP_OPTIONS.filter(a => a.id !== "any").map(a => (
                <li key={a.id} className="flex items-center justify-between gap-2 py-2 text-xs">
                  <span className="font-mono text-ink">{a.label}</span>
                  <span className="flex items-center gap-2"><span className="text-muted">{a.ports}</span><span className={`badge ${risk(a.risk)}`}>{a.risk}</span></span>
                </li>
              ))}
            </ul>
          </Section>
          <Callout tone="info" title="PAN-OS compared with FortiOS">
            FortiOS matches a <em>service</em> (TCP/443). PAN-OS matches the <em>application</em> (ssl) from its traffic signature, whatever port it runs on.
          </Callout>
        </aside>
      </div>
    </DraftWorkspace>
    </LessonFrame>
  );
}
