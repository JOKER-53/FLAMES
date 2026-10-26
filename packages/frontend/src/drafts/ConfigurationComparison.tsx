import { compareConfigurations } from "@fortisim/engine";
import type { DraftComparison } from "./useSimulatorDraft";
const display = (value: unknown) => value === undefined ? "—" : typeof value === "string" ? value || '""' : JSON.stringify(value);
export function ConfigurationComparison({ comparison }: { comparison: DraftComparison }) {
 const { changes, truncated } = compareConfigurations(comparison.before, comparison.current);
 return <section className="card mb-4 p-4 space-y-4 min-w-0" aria-label="Configuration comparison">
  <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-sm font-semibold text-ink">Compare your configuration</h2><p className="mt-1 text-xs text-muted">{comparison.label}. The snapshot lasts for this visit; saving does not replace it.</p></div><button type="button" className="btn-secondary btn-sm" disabled={!comparison.canCapture} onClick={comparison.capture}>Use current configuration as snapshot</button></div>
  <p role="status" className="text-xs text-muted">{changes.length} changes{truncated ? " shown; additional changes omitted" : ""}. Comparing your own settings does not grant completion.</p>
  {!changes.length ? <p className="text-sm text-body">No changes from this snapshot.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><caption className="sr-only">Changes from your comparison snapshot</caption><thead><tr className="border-b border-line"><th scope="col" className="p-2">Field / change</th><th scope="col" className="p-2">Snapshot</th><th scope="col" className="p-2">Current</th></tr></thead><tbody>{changes.map((change,index) => <tr key={index} className="border-b border-line"><th scope="row" className="p-2 align-top font-medium text-body [overflow-wrap:anywhere]">{change.path}<span className="mt-1 block text-muted">{change.type}</span></th><td className="p-2 align-top"><pre className="max-w-xs whitespace-pre-wrap break-words text-muted">{display(change.before)}</pre></td><td className="p-2 align-top"><pre className="max-w-xs whitespace-pre-wrap break-words text-body">{display(change.after)}</pre></td></tr>)}</tbody></table></div>}
 </section>;
}
