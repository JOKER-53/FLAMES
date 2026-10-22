import { type TutorSource } from "../../components/TutorSourceTag";
import { LessonFrame } from "../../components/shell/LessonFrame";
import { CheckYourWork, ConsoleFrame } from "../../components/lesson/LessonParts";
import { KnowledgeCheckCard } from "../../components/HardQuestionCard";
import { Callout } from "../../components/ui/primitives";
import { Icon } from "../../components/ui/Icon";
import { apiFetch } from "../../api/http";
import { useState } from "react";
import { PanSession } from "../../hooks/usePanSession";

type IfaceType = "layer3" | "layer2" | "tap" | "ha" | "management";
type IfaceZone = "Trust" | "Untrust" | "DMZ" | "Management" | "HA" | "—";

interface Interface {
  id: string;
  type: IfaceType;
  zone: IfaceZone;
  ip: string;
  link: boolean;
  speed: string;
  comment: string;
}

const DEFAULT_IFACES: Interface[] = [
  { id:"ethernet1/1", type:"layer3",     zone:"—",          ip:"",                link:true,  speed:"1G",   comment:"WAN uplink to ISP" },
  { id:"ethernet1/2", type:"layer3",     zone:"—",          ip:"",                link:true,  speed:"1G",   comment:"Internal LAN" },
  { id:"ethernet1/3", type:"layer3",     zone:"—",          ip:"",                link:false, speed:"1G",   comment:"DMZ segment" },
  { id:"ethernet1/4", type:"layer3",     zone:"—",          ip:"",                link:false, speed:"1G",   comment:"" },
  { id:"ethernet1/5", type:"layer3",     zone:"—",          ip:"",                link:false, speed:"1G",   comment:"" },
  { id:"ethernet1/6", type:"ha",         zone:"—",          ip:"",                link:true,  speed:"1G",   comment:"HA1 heartbeat" },
  { id:"ethernet1/7", type:"ha",         zone:"—",          ip:"",                link:true,  speed:"1G",   comment:"HA2 sync" },
  { id:"ethernet1/8", type:"layer3",     zone:"—",          ip:"",                link:false, speed:"1G",   comment:"" },
  { id:"management",  type:"management", zone:"—",          ip:"",                link:true,  speed:"1G",   comment:"OOB management" },
];

const ZONE_COLOR: Record<string,string> = {
  Trust:"#22c55e", Untrust:"#ef4444", DMZ:"#f97316", Management:"#7c3aed", HA:"#3b82f6", "—":"#d1d5db",
};

const ZONES: IfaceZone[] = ["Trust","Untrust","DMZ","Management","HA","—"];

export function PanInterfaces({ session }: { session: PanSession }) {
  const [ifaces, setIfaces] = useState<Interface[]>(DEFAULT_IFACES);
  const [editing, setEditing] = useState<string|null>(null);
  const [editVal, setEditVal] = useState<Partial<Interface>>({});
  
  const [results, setResults] = useState<{desc:string;pass:boolean}[]|null>(null);
  const [aiFeedback, setAiFeedback] = useState<string|null>(null);
  const [aiSource, setAiSource] = useState<TutorSource|null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  

  const scenarioId = "pan-iface-01";

  function startEdit(iface: Interface) {
    setEditing(iface.id);
    setEditVal({ zone:iface.zone, ip:iface.ip, type:iface.type, comment:iface.comment });
  }

  function saveEdit(id: string) {
    setIfaces(prev=>prev.map(i=>i.id===id?{...i,...editVal}:i));
    setEditing(null);
  }

  function grade() {
    const checks = [
      { desc: "ethernet1/1 is a Layer 3 interface in Untrust with 203.0.113.1/30", pass: ifaces.some(i => i.id === "ethernet1/1" && i.type === "layer3" && i.zone === "Untrust" && i.ip.trim() === "203.0.113.1/30") },
      { desc: "ethernet1/2 is a Layer 3 interface in Trust with 10.0.0.1/24", pass: ifaces.some(i => i.id === "ethernet1/2" && i.type === "layer3" && i.zone === "Trust" && i.ip.trim() === "10.0.0.1/24") },
      // MGT is out-of-band: it gets an address but never joins a security zone.
      { desc: "MGT has 192.168.1.1/24 and is not in any security zone", pass: ifaces.some(i => i.id === "management" && i.zone === "—" && i.ip.trim() === "192.168.1.1/24") },
    ];
    setResults(checks);
    if (checks.every(c => c.pass)) {
      session.markTaskComplete(scenarioId);
    } else {
      const failing = checks.filter(c => !c.pass).map(c => c.desc);
      setLoadingFeedback(true); setAiFeedback(null);
      apiFetch("/api/pan/feedback", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ taskId: "pan-iface-01", exerciseTitle: "Interface Configuration", failingChecks: failing })
      }).then(r=>r.json()).then(d=>{ setAiFeedback(d.feedback??null); setAiSource(d.source??null); }).catch(()=>{ setAiFeedback(null); setAiSource(null); }).finally(()=>setLoadingFeedback(false));
    }
  }


  const passed = results?.filter(r=>r.pass).length??0;

  const zoneBadge = (zone: IfaceZone) => zone === "—" ? <span className="text-faint">none</span> : <span className="badge" style={{ background: ZONE_COLOR[zone] + "1f", color: ZONE_COLOR[zone] }}>{zone}</span>;

  return (
    <LessonFrame
      title="Interface Configuration"
      brief={<>Configure the PA-220 for a small branch. Make <code>ethernet1/1</code> a Layer 3 interface in <b>Untrust</b> with <code>203.0.113.1/30</code>, and <code>ethernet1/2</code> a Layer 3 interface in <b>Trust</b> with <code>10.0.0.1/24</code>. Give the out-of-band <code>MGT</code> port <code>192.168.1.1/24</code>.</>}
      hint="The MGT port is separate from the data plane, so think about whether it should belong to a security zone at all."
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <ConsoleFrame path={["Network", "Interfaces", "Ethernet"]}>
            <div className="flex flex-wrap items-end gap-2 px-4 py-3 border-b border-line bg-[#f8fafc]" aria-label="Port status">
              {ifaces.map(i => (
                <div key={i.id} className="text-center w-12">
                  <div className="mx-auto w-9 h-7 rounded border-2 grid place-items-center" style={{ borderColor: i.zone === "—" ? "#cbd5e1" : ZONE_COLOR[i.zone], background: i.zone === "—" ? "#fff" : ZONE_COLOR[i.zone] + "14" }}>
                    <span className={`w-1.5 h-1.5 rounded-full ${i.link ? "bg-success" : "bg-line-strong"}`} />
                  </div>
                  <div className="mt-1 text-2xs font-mono text-muted">{i.id === "management" ? "MGT" : i.id.replace("ethernet", "")}</div>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="bg-[#eef1f5] text-[#3c4a5c] text-left border-b border-line-strong">
                    {["Interface", "Type", "Security Zone", "IP Address", "Link", "Comment", ""].map((h, i) => <th key={i} className="px-3 py-2 font-semibold whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {ifaces.map(iface => {
                    const edit = editing === iface.id;
                    return (
                      <tr key={iface.id} className={`border-b border-line ${edit ? "bg-accent-soft/50" : "hover:bg-sunken/60"}`}>
                        <td className="px-3 py-2 font-mono text-xs font-semibold text-ink">{iface.id}</td>
                        <td className="px-3 py-2">{edit
                          ? <select aria-label={`${iface.id} type`} className="input h-8 w-32" value={editVal.type} onChange={e => setEditVal(v => ({ ...v, type: e.target.value as IfaceType }))}>
                              <option value="layer3">Layer 3</option><option value="layer2">Layer 2</option><option value="tap">Tap</option><option value="ha">HA</option><option value="management">Management</option>
                            </select>
                          : <span className="font-mono text-xs">{iface.type}</span>}</td>
                        <td className="px-3 py-2">{edit
                          ? <select aria-label={`${iface.id} zone`} className="input h-8 w-32" value={editVal.zone} onChange={e => setEditVal(v => ({ ...v, zone: e.target.value as IfaceZone }))}>
                              {ZONES.map(z => <option key={z} value={z}>{z === "—" ? "None" : z}</option>)}
                            </select>
                          : zoneBadge(iface.zone)}</td>
                        <td className="px-3 py-2">{edit
                          ? <input aria-label={`${iface.id} IP address`} className="input h-8 w-40 font-mono" value={editVal.ip ?? ""} onChange={e => setEditVal(v => ({ ...v, ip: e.target.value }))} placeholder="x.x.x.x/nn" />
                          : <span className="font-mono text-xs">{iface.ip || <span className="text-faint">—</span>}</span>}</td>
                        <td className="px-3 py-2 text-xs"><span className={`inline-flex items-center gap-1.5 ${iface.link ? "text-success" : "text-muted"}`}><span className={`w-1.5 h-1.5 rounded-full ${iface.link ? "bg-success" : "bg-line-strong"}`} />{iface.link ? "Up" : "Down"}</span></td>
                        <td className="px-3 py-2 text-xs text-muted">{edit
                          ? <input aria-label={`${iface.id} comment`} className="input h-8 w-44" value={editVal.comment ?? ""} onChange={e => setEditVal(v => ({ ...v, comment: e.target.value }))} />
                          : iface.comment || <span className="text-faint">—</span>}</td>
                        <td className="pr-3 py-2 text-right whitespace-nowrap">{edit
                          ? <span className="inline-flex gap-1.5"><button onClick={() => saveEdit(iface.id)} className="btn-primary btn-sm h-7">Save</button><button onClick={() => setEditing(null)} className="btn-secondary btn-sm h-7">Cancel</button></span>
                          : <button onClick={() => startEdit(iface)} className="btn-secondary btn-sm h-7"><Icon name="edit" size={13} />Edit</button>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ConsoleFrame>

          <CheckYourWork
            onSubmit={grade}
            result={results && { passed: passed === results.length, checks: results.map(r => ({ label: r.desc, passed: r.pass })) }}
            tutor={{ text: aiFeedback, source: aiSource, loading: loadingFeedback }}
          />

          <KnowledgeCheckCard platform="paloalto" taskId={scenarioId} completed={session.completedTaskIds.has(scenarioId)} onComplete={session.markTaskComplete} />
        </div>

        <aside className="min-w-0 space-y-4">
          <Callout tone="info" title="Zones come first">
            An interface must belong to a zone before any security policy applies to its traffic. Interfaces in the same zone talk freely; traffic between zones needs an explicit rule.
          </Callout>
          <Callout tone="tip" title="Interface types">
            <b>Layer 3</b> routes between subnets, <b>Layer 2</b> switches, <b>Virtual Wire</b> inspects transparently, and <b>Tap</b> only monitors mirrored traffic.
          </Callout>
        </aside>
      </div>
    </LessonFrame>
  );
}
