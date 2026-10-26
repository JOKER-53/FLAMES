import { TaskTopology } from "../../components/policyObjects/TaskTopology";
import { useSimulatorDraft } from "../../drafts/useSimulatorDraft";
import { DraftWorkspace } from "../../drafts/DraftWorkspace";
import { LessonFrame } from "../../components/shell/LessonFrame";
import { CheckYourWork, ConsoleFrame } from "../../components/lesson/LessonParts";
import { KnowledgeCheckCard } from "../../components/HardQuestionCard";
import { Callout, Section } from "../../components/ui/primitives";
import { Icon } from "../../components/ui/Icon";
import { usePanGrading } from "../../hooks/usePanGrading";
import { PAN_ZONE_SCENARIOS as SCENARIOS } from "@fortisim/engine";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { PanSession } from "../../hooks/usePanSession";

type ZoneType = "layer3" | "layer2" | "tap" | "ha" | "management";
type ZoneProfile = "none" | "default" | "strict";
interface Zone { id:number; name:string; type:ZoneType; profile:ZoneProfile; interfaces:string[]; logForwarding:boolean; }

const INTERFACES = ["ethernet1/1","ethernet1/2","ethernet1/3","ethernet1/4","ethernet1/5","ethernet1/6","ethernet1/7","ethernet1/8"];
const ZONE_COLOR: Record<string,string> = { Trust:"#22c55e", Untrust:"#ef4444", DMZ:"#f97316", Management:"#7c3aed", HA:"#3b82f6" };
function getColor(name:string){ return ZONE_COLOR[name]??"#3b82f6"; }


export function PanZones({ session }: { session: PanSession }) {
  const location = useLocation();
  const [scenIdx, setSceIdx] = useState(() => Math.max(0, SCENARIOS.findIndex(scenario => scenario.id === (location.state?.taskId ?? new URLSearchParams(location.search).get("task")))));
  const scenario = SCENARIOS[scenIdx];
  const persisted = useSimulatorDraft<Zone[]>("paloalto", scenario.id, "pan-zones", []);
  const zones = persisted.value, setZones = persisted.setValue;

  const [adding, setAdding] = useState(false);
  const [nz, setNz] = useState<Partial<Zone>>({ name:"", type:"layer3", profile:"none", interfaces:[], logForwarding:false });
  const { results, setResults, aiFeedback, aiSource, loadingFeedback, grading, gradeError, grade: submitGrade } = usePanGrading(scenario.id, scenario.title, session.markTaskComplete);

  const [selected, setSelected] = useState<Zone|null>(null);

  useEffect(() => {
    const id = location.state?.taskId ?? new URLSearchParams(location.search).get("task");
    const index = SCENARIOS.findIndex(scenario => scenario.id === id);
    if (index >= 0) setSceIdx(index);
  }, [location.key]);
  useEffect(() => { setResults(null); }, [scenario.id, zones, setResults]);

  function addZone() {
    if (!nz.name) return;
    setZones(z=>[...z,{ id:Math.max(0, ...zones.map(item => item.id)) + 1, name:nz.name!, type:nz.type!, profile:nz.profile!, interfaces:nz.interfaces??[], logForwarding:nz.logForwarding??false }]);
     setAdding(false); setResults(null);
    setNz({ name:"", type:"layer3", profile:"none", interfaces:[], logForwarding:false });
  }
  function delZone(id:number){ setZones(z=>z.filter(x=>x.id!==id)); setResults(null); }
  function toggleIface(i:string){ setNz(z=>({...z,interfaces:z.interfaces?.includes(i)?z.interfaces.filter(x=>x!==i):[...(z.interfaces??[]),i]})); }

  function grade() { void submitGrade(zones); }


  const passed = results?.filter(r=>r.pass).length??0;

  const ZONE_TYPES: [ZoneType, string][] = [["layer3", "Routed interfaces — the most common"], ["layer2", "Switched interfaces"], ["tap", "Mirrored traffic, monitoring only"], ["ha", "HA heartbeat and sync links"], ["management", "Out-of-band management"]];

  return (
    <LessonFrame title={scenario.title} brief={scenario.desc} hint={scenario.hint}>
      <DraftWorkspace draft={persisted.controls}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <ConsoleFrame
            path={["Network", "Zones"]}
            actions={<button onClick={() => setAdding(!adding)} className="btn-accent btn-sm"><Icon name="plus" size={14} />Add zone</button>}
          >
            {zones.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-line bg-sunken" aria-label="Zone map">
                {zones.map(z => (
                  <button key={z.id} onClick={() => setSelected(selected?.id === z.id ? null : z)} aria-pressed={selected?.id === z.id}
                    className={`rounded-md border-2 px-3 py-1.5 text-left ${selected?.id === z.id ? "shadow-raised" : ""}`}
                    style={{ borderColor: getColor(z.name), background: `${getColor(z.name)}12` }}>
                    <div className="text-xs font-semibold" style={{ color: getColor(z.name) }}>{z.name}</div>
                    <div className="text-2xs text-muted">{z.type} · {z.interfaces.length} interface{z.interfaces.length === 1 ? "" : "s"}</div>
                  </button>
                ))}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="bg-sunken text-body text-left border-b border-line-strong">
                    {["Name", "Type", "Zone Protection", "Interfaces", "Log Forwarding", ""].map((h, i) => <th key={i} className="px-3 py-2 font-semibold">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {zones.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-muted">No zones yet. Use “Add zone” to create one.</td></tr>}
                  {zones.map(z => (
                    <tr key={z.id} className="border-b border-line hover:bg-sunken/60">
                      <td className="px-3 py-2"><span className="flex items-center gap-2 font-medium text-ink"><span className="w-2 h-2 rounded-full" style={{ background: getColor(z.name) }} />{z.name}</span></td>
                      <td className="px-3 py-2 font-mono text-xs">{z.type}</td>
                      <td className="px-3 py-2"><span className={`badge ${z.profile === "strict" ? "bg-danger-soft text-danger" : z.profile === "default" ? "bg-info-soft text-info" : "bg-sunken text-muted"}`}>{z.profile}</span></td>
                      <td className="px-3 py-2 font-mono text-xs text-body">{z.interfaces.join(", ") || "—"}</td>
                      <td className="px-3 py-2">{z.logForwarding ? <Icon name="check" size={15} strokeWidth={2.25} className="text-success" title="Enabled" /> : <span className="text-faint">—</span>}</td>
                      <td className="pr-3 py-2 text-right"><button aria-label={`Delete ${z.name}`} onClick={() => delZone(z.id)} className="text-faint hover:text-danger"><Icon name="trash" size={15} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {adding && (
              <div className="p-4 border-t border-line-strong bg-sunken">
                <div className="text-sm font-semibold text-ink mb-3">New zone</div>
                <div className="grid gap-3 sm:grid-cols-3 mb-4">
                  <label><span className="field-label">Zone name</span>
                    <input className="input" value={nz.name ?? ""} onChange={e => setNz(z => ({ ...z, name: e.target.value }))} placeholder="e.g. Trust" />
                  </label>
                  <label><span className="field-label">Type</span>
                    <select className="input" value={nz.type} onChange={e => setNz(z => ({ ...z, type: e.target.value as ZoneType }))}>{ZONE_TYPES.map(([t]) => <option key={t}>{t}</option>)}</select>
                  </label>
                  <label><span className="field-label">Zone protection profile</span>
                    <select className="input" value={nz.profile} onChange={e => setNz(z => ({ ...z, profile: e.target.value as ZoneProfile }))}>{["none", "default", "strict"].map(o => <option key={o}>{o}</option>)}</select>
                  </label>
                </div>
                <fieldset className="mb-4">
                  <legend className="field-label">Interfaces</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {INTERFACES.map(i => {
                      const on = !!nz.interfaces?.includes(i);
                      return (
                        <button key={i} aria-pressed={on} onClick={() => toggleIface(i)}
                          className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded border text-xs font-mono ${on ? "border-accent bg-accent-soft text-ink" : "border-line-strong bg-surface text-body hover:border-faint"}`}>
                          {on && <Icon name="check" size={12} strokeWidth={2.5} className="text-accent" />}{i}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={nz.logForwarding} onChange={e => setNz(z => ({ ...z, logForwarding: e.target.checked }))} />Log forwarding
                  </label>
                  <div className="ml-auto flex gap-2">
                    <button onClick={() => setAdding(false)} className="btn-secondary btn-sm">Cancel</button>
                    <button onClick={addZone} disabled={!nz.name} className="btn-primary btn-sm">Add zone</button>
                  </div>
                </div>
              </div>
            )}
          </ConsoleFrame>

          <CheckYourWork
            onSubmit={grade}
            grading={grading}
            error={gradeError}
            result={results && { passed: passed === scenario.checks.length, checks: results.map(r => ({ label: r.desc, passed: r.pass })) }}
            tutor={{ text: aiFeedback, source: aiSource, loading: loadingFeedback }}
          />

          <KnowledgeCheckCard platform="paloalto" taskId={scenario.id} completed={session.completedTaskIds.has(scenario.id)} onComplete={session.markTaskComplete} />
        </div>

        <aside className="min-w-0 space-y-4">
          <TaskTopology vendor="paloalto" family="pan-zones" config={zones}/>
          <Section title="Zone types" bodyClassName="px-5 py-2">
            <dl className="divide-y divide-line">
              {ZONE_TYPES.map(([type, description]) => (
                <div key={type} className="py-2.5">
                  <dt className="font-mono text-xs font-semibold text-ink">{type}</dt>
                  <dd className="text-xs text-muted mt-0.5">{description}</dd>
                </div>
              ))}
            </dl>
          </Section>
          <Callout tone="info" title="Key rule">
            Interfaces in the same zone can talk freely. Traffic between zones always needs an explicit security rule.
          </Callout>
          <Callout tone="tip" title="Simplified for practice">
            In real PAN-OS, HA links are configured as HA interfaces and management uses the dedicated MGT port. Here they appear as zone types so you can practise keeping them apart from data zones.
          </Callout>
        </aside>
      </div>
    </DraftWorkspace>
    </LessonFrame>
  );
}
