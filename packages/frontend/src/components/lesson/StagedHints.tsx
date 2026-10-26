import { useState } from "react";
import { learningHints } from "@fortisim/engine";
export function StagedHints({ topic, failures }: { topic: string; failures: string[] }) {
  const [level, setLevel] = useState(0);
  const hints = learningHints(topic, failures);
  return <div className="border-t border-line px-5 py-4 space-y-3">
    <div className="flex flex-wrap items-center gap-3"><h3 className="text-sm font-semibold">Hints for these checks</h3><span className="text-xs text-muted">Built-in guidance · does not change your grade</span><button className="btn-secondary btn-sm ml-auto" disabled={level >= 2} onClick={() => setLevel(value => value + 1)}>{level === 0 ? "Show a hint" : level === 1 ? "Show next step" : "All hints shown"}</button></div>
    {level > 0 && <ul className="space-y-3 text-sm">{hints.map(hint => <li key={hint.concept}><p className="font-medium">{hint.concept}</p><p className="text-muted mt-1">{hint.first}</p>{level > 1 && <p className="text-body mt-1">{hint.next}</p>}</li>)}</ul>}
  </div>;
}
