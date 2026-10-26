import { Icon } from "../ui/Icon";

type Row = Record<string, unknown>;
type Family = "pan-security" | "pan-nat" | "pan-zones" | "pan-interfaces" | "ports" | "interfaces" | "routing";
interface Node { id: string; name: string; detail: string; }
const text = (value: unknown, fallback = "Not configured") => typeof value === "string" && value.trim() ? value : fallback;
const list = (value: unknown) => Array.isArray(value) ? value.filter(item => typeof item === "string").join(", ") : "";

/** Logical relationships from the student's configuration, never the answer key. */
export function TaskTopology({ vendor, family, config }: { vendor: "fortigate" | "paloalto"; family: Family; config: unknown }) {
 const rows: Row[] = Array.isArray(config) ? config.filter((row): row is Row => !!row && typeof row === "object" && !Array.isArray(row)) : [];
 const nodes: Node[] = rows.map((row, index) => {
  const id = `${String(row.id ?? row.name ?? row.portId ?? index)}-${index}`;
  if (family === "pan-security") return {id, name: text(row.name), detail: `${text(row.srcZone)} → ${text(row.dstZone)} · ${list(row.apps) || "No applications"} · ${text(row.action)}`};
  if (family === "pan-nat") return {id, name: text(row.name), detail: `${text(row.srcZone)} → ${text(row.dstZone)} · ${text(row.dstAddr)} → ${text(row.translated)} (${text(row.type)})`};
  if (family === "pan-zones") return {id, name: text(row.name), detail: `${text(row.type)} · ${list(row.interfaces) || "No interfaces assigned"}`};
  if (family === "routing") return {id, name: text(row.destination), detail: `${text(row.interfaceName)} → gateway ${text(row.gateway)} · distance ${String(row.distance ?? "—")}`};
  if (family === "ports") return {id, name: text(row.label, text(row.portId, text(row.id))), detail: `Zone: ${text(row.zone)}${row.locked ? " · dedicated" : ""}`};
  return {id, name: text(row.name, text(row.id)), detail: `${text(row.role, text(row.zone))} · ${text(row.ip, "No IP assigned")}${row.subnet ? ` / ${row.subnet}` : ""}${row.link === false ? " · link down" : ""}`};
 });
 return <section aria-label="Network topology" data-vendor={vendor} className="card p-4 min-w-0 space-y-3">
  <h2 className="text-xs font-medium uppercase tracking-wide text-body">Network topology</h2>
  <div className="rounded-md border border-line bg-sunken p-3 min-w-0">
   <div className="mx-auto flex w-fit max-w-full items-center gap-2 rounded-md border border-accent bg-surface px-3 py-2 text-sm font-semibold text-ink"><Icon name="shield" size={16} className="text-accent shrink-0"/>{vendor === "paloalto" ? "PA-220" : "FortiGate 60F"}</div>
   {nodes.length ? <><div aria-hidden="true" className="mx-auto h-4 w-px bg-line-strong"/><ul className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(min(100%,190px),1fr))]">{nodes.map(node => <li key={node.id} data-topology-device={node.id} className="min-w-0 rounded-md border border-line-strong bg-surface p-3 text-xs [overflow-wrap:anywhere]"><p className="font-semibold text-ink">{node.name}</p><p className="mt-1 leading-relaxed text-muted">{node.detail}</p></li>)}</ul></> : <p className="mt-3 text-center text-xs text-muted">No configured connections yet. Add your configuration to see it here.</p>}
  </div>
  <p className="text-xs leading-relaxed text-muted">Current configuration · logical relationships only. {family === "pan-nat" ? "NAT translation does not grant security permission." : "Connections do not imply permitted traffic or physical cabling."}</p>
 </section>;
}
