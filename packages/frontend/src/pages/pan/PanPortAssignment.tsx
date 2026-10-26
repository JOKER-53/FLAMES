import { TaskTopology } from "../../components/policyObjects/TaskTopology";
import { useSimulatorDraft } from "../../drafts/useSimulatorDraft";
import { DraftWorkspace } from "../../drafts/DraftWorkspace";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PanSession } from "../../hooks/usePanSession";
import { LessonFrame } from "../../components/shell/LessonFrame";
import { CheckYourWork, ConsoleFrame } from "../../components/lesson/LessonParts";
import { Section } from "../../components/ui/primitives";
import { Icon } from "../../components/ui/Icon";
import { PanChassisDiagram, PanPortZone, PanPortAssignment as PPA, PAN_ZONE_COLORS } from "../../components/policyObjects/PanChassisDiagram";

type Check = { desc: string; fn: (p: PPA[]) => boolean };
const zoneOf = (p: PPA[], id: string) => p.find(x => x.id === id)?.zone;
const inZone = (id: string, zone: PanPortZone): Check => ({ desc: `${id} in ${zone}`, fn: p => zoneOf(p, id) === zone });
const othersUnassigned = (used: string[]): Check => ({
  desc: "All other data ports left unassigned",
  fn: p => p.filter(x => x.id.startsWith("ethernet") && !used.includes(x.id)).every(x => x.zone === "unassigned"),
});

const SCENARIOS: { id: string; title: string; description: string; checks: Check[] }[] = [
  {
    id: "pan-port-01",
    title: "Basic Port Assignment",
    description: "Assign ethernet1/1 to Untrust (WAN) and ethernet1/2 to Trust (LAN). Leave others unassigned.",
    checks: [
      inZone("ethernet1/1", "Untrust"),
      inZone("ethernet1/2", "Trust"),
      othersUnassigned(["ethernet1/1", "ethernet1/2"]),
    ],
  },
  {
    id: "pan-port-02",
    title: "DMZ & HA Assignment",
    description: "Keep eth1/1 Untrust and eth1/2 Trust. Add eth1/3 as DMZ and eth1/6 as HA. Leave the remaining data ports unassigned.",
    checks: [
      inZone("ethernet1/1", "Untrust"),
      inZone("ethernet1/2", "Trust"),
      inZone("ethernet1/3", "DMZ"),
      inZone("ethernet1/6", "HA"),
      othersUnassigned(["ethernet1/1", "ethernet1/2", "ethernet1/3", "ethernet1/6"]),
    ],
  },
];

const INIT_PORTS: PPA[] = [
  ...Array.from({ length: 8 }, (_, i): PPA => ({ id: `ethernet1/${i + 1}`, zone: "unassigned", label: `eth1/${i + 1}` })),
  // MGT is a dedicated out-of-band interface; it never joins a data-plane zone.
  { id: "management", zone: "Management", label: "MGT", locked: true },
];
const DATA_ZONES: PanPortZone[] = ["unassigned", "Trust", "Untrust", "DMZ", "HA"];

export function PanPortAssignment({ session }: { session: PanSession }) {
  const requested = useSearchParams()[0].get("task");
  const [scenarioIdx, setScenarioIdx] = useState(() => Math.max(0, SCENARIOS.findIndex(s => s.id === requested)));
  useEffect(() => {
    const index = SCENARIOS.findIndex(s => s.id === requested);
    if (index >= 0) { setScenarioIdx(index); setResults(null); }
  }, [requested]);
  const scenario = SCENARIOS[scenarioIdx];
  const persisted = useSimulatorDraft<PPA[]>("paloalto", scenario.id, "pan-ports", INIT_PORTS);
  const ports = persisted.value, setPorts = persisted.setValue;
  const [results, setResults] = useState<{desc:string; pass:boolean}[]|null>(null);

  useEffect(() => { setResults(null); }, [ports]);

  const passed = results?.filter(r => r.pass).length ?? 0;
  const total = scenario.checks.length;

  function onChangeZone(id: string, newZone: PanPortZone) {
    setPorts(prev => prev.map(p => p.id === id && !p.locked ? { ...p, zone: newZone } : p));
    setResults(null);
  }

  function grade() {
    const res = scenario.checks.map(c => ({ desc: c.desc, pass: c.fn(ports) }));
    setResults(res);
    if (res.every(r => r.pass)) {
      session.markTaskComplete(scenario.id);
    }
  }

  return (
    <LessonFrame title={scenario.title} brief={scenario.description}>
      <DraftWorkspace draft={persisted.controls}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <ConsoleFrame path={["Device", "Physical ports"]}>
            <div className="p-4">
              <PanChassisDiagram ports={ports} onChange={onChangeZone} />
            </div>
          </ConsoleFrame>

          <CheckYourWork
            onSubmit={grade}
            result={results && { passed: passed === total, checks: results.map(r => ({ label: r.desc, passed: r.pass })) }}
          />
        </div>

        <aside className="min-w-0 space-y-4">
          <TaskTopology vendor="paloalto" family="ports" config={ports}/>
          <Section
            title="Zone assignments"
            actions={<button onClick={() => { setPorts(INIT_PORTS); setResults(null); }} className="btn-ghost btn-sm"><Icon name="refresh" size={14} />Reset</button>}
            bodyClassName="px-5 py-2"
          >
            <ul className="divide-y divide-line">
              {ports.map(p => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="flex items-center gap-2 font-mono text-xs text-ink">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PAN_ZONE_COLORS[p.zone] }} />{p.id}
                  </span>
                  {p.locked
                    ? <span className="text-xs text-muted">{p.zone} (dedicated)</span>
                    : <select aria-label={`Zone for ${p.id}`} value={p.zone} onChange={e => onChangeZone(p.id, e.target.value as PanPortZone)} className="input h-8 w-32 text-xs">
                        {DATA_ZONES.map(z => <option key={z} value={z}>{z === "unassigned" ? "Unassigned" : z}</option>)}
                      </select>}
                </li>
              ))}
            </ul>
          </Section>
        </aside>
      </div>
    </DraftWorkspace>
    </LessonFrame>
  );
}
