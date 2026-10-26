import { useState } from "react";
import { runInterfaceCli, type InterfaceConfig } from "@fortisim/engine";
export function InterfaceCli({rows,apply}:{rows:InterfaceConfig[];apply:(rows:InterfaceConfig[])=>void}) {
 const [input,setInput]=useState('help');const [history,setHistory]=useState<string[]>([]);
 return <details className="card p-4 min-w-0"><summary className="cursor-pointer font-semibold text-sm text-ink">CLI practice (FortiGate interfaces)</summary><div className="mt-4 space-y-3">
  <p className="text-xs leading-relaxed text-muted">A limited simulator command subset. Submit a complete interface block ending with end. Commands change this lesson’s draft; they do not configure live equipment or grant completion.</p>
  <form className="space-y-3" onSubmit={event=>{event.preventDefault();try{const result=runInterfaceCli(rows,input);if(result.applied)apply(result.rows);setHistory(old=>[...old,`> ${input}\n${result.output}`].slice(-20));}catch(error){setHistory(old=>[...old,`> ${input}\n${error instanceof Error?error.message:'Command failed.'}`].slice(-20));}}}>
   <label className="block"><span className="field-label">Simulator CLI commands</span><textarea aria-label="Simulator CLI commands" className="input min-h-[140px] font-mono text-xs" maxLength={8000} value={input} onChange={event=>setInput(event.target.value)} spellCheck={false}/></label>
   <div className="flex flex-wrap gap-2"><button className="btn-secondary btn-sm" type="submit">Run simulated commands</button><button className="btn-ghost btn-sm" type="button" onClick={()=>setHistory([])}>Clear CLI history</button></div>
  </form>
  <div role="log" aria-label="Simulator CLI output" aria-live="polite" className="max-h-80 overflow-auto rounded-md border border-line bg-sunken p-3 text-xs text-body"><pre className="whitespace-pre-wrap break-words">{history.length?history.join('\n\n'):'Use help to list the supported commands. History lasts for this visit.'}</pre></div>
 </div></details>;
}
