import { TaskTopology } from "../../components/policyObjects/TaskTopology";
import { PacketExplorer } from "../../components/configuration/PacketExplorer";
import { focusConfigurationRow } from "../../components/configuration/DecisionTrace";
import { useSimulatorDraft } from "../../drafts/useSimulatorDraft";
import { DraftWorkspace } from "../../drafts/DraftWorkspace";
import { LessonFrame } from "../../components/shell/LessonFrame";
import { CheckYourWork, ConsoleFrame } from "../../components/lesson/LessonParts";
import { KnowledgeCheckCard } from "../../components/HardQuestionCard";
import { Callout, Section } from "../../components/ui/primitives";
import { Icon } from "../../components/ui/Icon";
import { usePanGrading } from "../../hooks/usePanGrading";
import { PAN_NAT_SCENARIOS as SCENARIOS } from "@fortisim/engine";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { PanSession } from "../../hooks/usePanSession";

type NATType = "source" | "destination" | "static";
interface NATRule { id:number; name:string; type:NATType; srcZone:string; dstZone:string; dstAddr:string; translated:string; }



export function PanNAT({ session }: { session: PanSession }) {
  const [highlightedRow, setHighlightedRow] = useState<string | null>(null);
  function showTraceRow(id: string) { setHighlightedRow(id); focusConfigurationRow("nat-row", id); }
  const location = useLocation();
  const [scenIdx, setSceIdx] = useState(() => Math.max(0, SCENARIOS.findIndex(scenario => scenario.id === (location.state?.taskId ?? new URLSearchParams(location.search).get("task")))));
  const scenario = SCENARIOS[scenIdx];
  const persisted = useSimulatorDraft<NATRule[]>("paloalto", scenario.id, "pan-nat", []);
  const rules = persisted.value, setRules = persisted.setValue;

  const [adding, setAdding] = useState(false);
  const [nr, setNr] = useState<Partial<NATRule>>({ name:"", type:"source", srcZone:"Trust", dstZone:"Untrust", dstAddr:"any", translated:"" });
  const { results, setResults, aiFeedback, aiSource, loadingFeedback, grading, gradeError, grade: submitGrade } = usePanGrading(scenario.id, scenario.title, session.markTaskComplete);


  useEffect(() => {
    const id = location.state?.taskId ?? new URLSearchParams(location.search).get("task");
    const index = SCENARIOS.findIndex(scenario => scenario.id === id);
    if (index >= 0) setSceIdx(index);
  }, [location.key]);
  useEffect(() => { setHighlightedRow(null); setResults(null); }, [scenario.id, rules, setResults]);

  function addRule() {
    if (!nr.name||!nr.translated) return;
    setRules(r=>[...r,{ id:Math.max(0, ...rules.map(item => item.id)) + 1, name:nr.name!, type:nr.type!, srcZone:nr.srcZone!, dstZone:nr.dstZone!, dstAddr:nr.dstAddr||"any", translated:nr.translated! }]);
     setAdding(false); setResults(null);
    setNr({ name:"", type:"source", srcZone:"Trust", dstZone:"Untrust", dstAddr:"any", translated:"" });
  }

  function grade() { void submitGrade(rules); }


  const passed = results?.filter(r=>r.pass).length??0;

  const TYPE_BADGE: Record<NATType, string> = { source: "bg-info-soft text-info", destination: "bg-warn-soft text-warn", static: "bg-accent-soft text-accent" };
  const zoneSelect = (key: "srcZone" | "dstZone", label: string) => (
    <label><span className="field-label">{label}</span>
      <select className="input" value={nr[key]} onChange={e => setNr(x => ({ ...x, [key]: e.target.value }))}>{["Trust", "Untrust", "DMZ", "any"].map(o => <option key={o}>{o}</option>)}</select>
    </label>
  );

  return (
    <LessonFrame title={scenario.title} brief={scenario.desc} hint={scenario.hint}>
      <DraftWorkspace draft={persisted.controls}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <ConsoleFrame
            path={["Policies", "NAT"]}
            actions={<button onClick={() => setAdding(!adding)} className="btn-accent btn-sm"><Icon name="plus" size={14} />Add rule</button>}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="bg-sunken text-body text-left border-b border-line-strong">
                    {["#", "Name", "Type", "Original Packet", "Original Destination", "Translated To", ""].map((h, i) => <th key={i} className="px-3 py-2 font-semibold">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rules.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-muted">No NAT rules yet. Use “Add rule” to create one.</td></tr>}
                  {rules.map((r, i) => (
                    <tr key={r.id} id={`nat-row-${encodeURIComponent(String(r.id))}`} tabIndex={-1} className={`border-b border-line ${highlightedRow===String(r.id)?"bg-info-soft":"hover:bg-sunken/60"}`}>
                      <td className="px-3 py-2 text-muted tabular-nums">{i + 1}</td>
                      <td className="px-3 py-2 font-medium text-ink">{r.name}</td>
                      <td className="px-3 py-2"><span className={`badge ${TYPE_BADGE[r.type]}`}>{r.type}</span></td>
                      <td className="px-3 py-2 text-body">{r.srcZone} <Icon name="arrowRight" size={12} className="inline text-faint" /> {r.dstZone}</td>
                      <td className="px-3 py-2 font-mono text-xs text-body">{r.dstAddr}</td>
                      <td className="px-3 py-2 font-mono text-xs text-ink">{r.translated}</td>
                      <td className="pr-3 py-2 text-right"><button aria-label={`Delete ${r.name}`} onClick={() => { setRules(x => x.filter(y => y.id !== r.id)); setResults(null); }} className="text-faint hover:text-danger"><Icon name="trash" size={15} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {adding && (
              <div className="p-4 border-t border-line-strong bg-sunken">
                <div className="text-sm font-semibold text-ink mb-3">New NAT rule</div>
                <div className="grid gap-3 sm:grid-cols-3 mb-4">
                  <label><span className="field-label">Rule name</span>
                    <input className="input" value={nr.name ?? ""} onChange={e => setNr(x => ({ ...x, name: e.target.value }))} placeholder="e.g. Outbound-SNAT" />
                  </label>
                  <label><span className="field-label">NAT type</span>
                    <select className="input" value={nr.type} onChange={e => setNr(x => ({ ...x, type: e.target.value as NATType }))}>{["source", "destination", "static"].map(o => <option key={o}>{o}</option>)}</select>
                  </label>
                  <label><span className="field-label">Translated to</span>
                    <input className="input font-mono" value={nr.translated ?? ""} onChange={e => setNr(x => ({ ...x, translated: e.target.value }))} placeholder="interface or 10.0.1.10" />
                  </label>
                  {zoneSelect("srcZone", "Source zone (pre-NAT)")}
                  {zoneSelect("dstZone", "Destination zone (pre-NAT)")}
                  <label><span className="field-label">Original destination</span>
                    <input className="input font-mono" value={nr.dstAddr ?? ""} onChange={e => setNr(x => ({ ...x, dstAddr: e.target.value }))} placeholder="any" />
                  </label>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setAdding(false)} className="btn-secondary btn-sm">Cancel</button>
                  <button onClick={addRule} disabled={!nr.name || !nr.translated} className="btn-primary btn-sm">Add rule</button>
                </div>
              </div>
            )}
          </ConsoleFrame>

        <PacketExplorer family="pan-nat" config={rules} onShowRow={showTraceRow}/>
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
          <TaskTopology vendor="paloalto" family="pan-nat" config={rules}/>
          <Section title="NAT types" bodyClassName="px-5 py-2">
            <dl className="divide-y divide-line">
              {([["source", "Translate the source address of outbound traffic"], ["destination", "Redirect inbound traffic to an internal server"], ["static", "1:1 mapping that works in both directions"]] as [NATType, string][]).map(([type, text]) => (
                <div key={type} className="py-2.5">
                  <dt><span className={`badge ${TYPE_BADGE[type]}`}>{type}</span></dt>
                  <dd className="text-xs text-muted mt-1">{text}</dd>
                </div>
              ))}
            </dl>
          </Section>
          <Callout tone="info" title="How PAN-OS evaluates NAT">
            NAT rules match the original packet and its pre-NAT zones. Security rules use the original addresses with the post-NAT destination zone. A NAT rule never allows traffic by itself.
          </Callout>
        </aside>
      </div>
    </DraftWorkspace>
    </LessonFrame>
  );
}
