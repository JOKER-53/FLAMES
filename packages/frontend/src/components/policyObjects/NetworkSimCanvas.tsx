import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AddressObject, TestPacket, PolicyTraceEntry } from "@fortisim/engine";
import { Icon } from "../ui/Icon";
interface SimTrace { packet:TestPacket; trace:PolicyTraceEntry[]; finalAction:"ACCEPT"|"DENY"; }
interface NetworkSimCanvasProps { addresses:AddressObject[]; traces:SimTrace[]; onClose:()=>void; }
interface Device { id:string;zone:string;ip:string;name:string;x:number;y:number; }
const DURATION=2000;
const zoneColor=(zone:string)=>zone==="WAN"?"text-warn":zone==="DMZ"?"text-info":"text-success";

/** SVG inherits FLAMES theme tokens; devices are actual packet endpoints, not inferred cabling. */
export function NetworkSimCanvas({addresses,traces,onClose}:NetworkSimCanvasProps) {
  const dialog=useRef<HTMLDivElement>(null);const closeButton=useRef<HTMLButtonElement>(null);const titleId=useId();const descriptionId=useId();const graphId=useId().replace(/:/g,"");
  const [replay,setReplay]=useState(0);const [elapsed,setElapsed]=useState(0);
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const {devices,height}=useMemo(()=>{
    const endpoints=new Map<string,{zone:string;ip:string;name:string}>();
    for(const {packet} of traces) for(const [zone,ip] of [[packet.srcIntf,packet.srcIp],[packet.dstIntf,packet.dstIp]]) {
      const name=addresses.find(address=>address.value.split("/")[0]===ip)?.name??(zone==="WAN"?"Internet host":`${zone} host`);
      endpoints.set(`${zone}:${ip}`,{zone,ip,name});
    }
    const zones=[...new Set([...endpoints.values()].map(endpoint=>endpoint.zone))];
    const left=zones.includes("WAN")?["WAN"]:zones.slice(0,1);const right=zones.filter(zone=>!left.includes(zone));
    const columns=[left,right];const maxRows=Math.max(1,...columns.map(zones=>[...endpoints.values()].filter(endpoint=>zones.includes(endpoint.zone)).length));
    const height=Math.max(360,maxRows*98+64);
    const devices:Device[]=[];
    columns.forEach((zones,column)=>{
      const entries=[...endpoints.entries()].filter(([,endpoint])=>zones.includes(endpoint.zone)).sort((a,b)=>a[1].zone.localeCompare(b[1].zone));
      entries.forEach(([id,endpoint],index)=>devices.push({...endpoint,id,x:column===0?150:810,y:height/2+(index-(entries.length-1)/2)*98}));
    });return{devices,height};
  },[addresses,traces]);
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;document.body.style.overflow="hidden";closeButton.current?.focus();
    const key=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){event.preventDefault();onClose();}
      if(event.key==="Tab"){
        const nodes=dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex="0"]');if(!nodes?.length)return;
        const first=nodes[0],last=nodes[nodes.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
    };
    document.addEventListener("keydown",key);return()=>{document.body.style.overflow=overflow;document.removeEventListener("keydown",key);previous?.focus();};
  },[onClose]);
  useEffect(()=>{
    const total=traces.length*DURATION;
    if(reduced){setElapsed(total);return;}
    let frame=0;const start=performance.now();setElapsed(0);
    const tick=(now:number)=>{const next=Math.min(total,now-start);setElapsed(next);if(next<total)frame=requestAnimationFrame(tick);};
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[traces,replay,reduced]);
  const finished=elapsed>=traces.length*DURATION;
  const index=Math.min(Math.floor(elapsed/DURATION),traces.length-1);const current=traces[index];const phase=(elapsed%DURATION)/DURATION;
  const source=current&&devices.find(device=>device.id===`${current.packet.srcIntf}:${current.packet.srcIp}`);const destination=current&&devices.find(device=>device.id===`${current.packet.dstIntf}:${current.packet.dstIp}`);
  const firewall={x:480,y:height/2};
  let packet=firewall;
  if(source&&destination){if(phase<0.4){const t=phase/0.4;packet={x:source.x+(firewall.x-source.x)*t,y:source.y+(firewall.y-source.y)*t};}else if(phase>0.6&&current.finalAction==="ACCEPT"){const t=(phase-0.6)/0.4;packet={x:firewall.x+(destination.x-firewall.x)*t,y:firewall.y+(destination.y-firewall.y)*t};}}
  const outcome=current?.finalAction==="ACCEPT"?"text-success":"text-danger";
  const accepted=traces.filter(trace=>trace.finalAction==="ACCEPT").length;
  return createPortal(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} data-vendor="fortigate" className="w-full max-w-[1120px] max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden rounded-lg border border-line-strong bg-surface text-body shadow-2xl">
      <header className="shrink-0 px-5 sm:px-6 py-4 border-b border-line flex items-start justify-between gap-4">
        <div className="flex items-start gap-3"><span className="rounded-md bg-sunken text-accent p-2"><Icon name="network" size={20}/></span><div><h2 id={titleId} className="text-lg font-semibold text-ink">Network view</h2><p className="text-xs text-muted mt-1">FortiGate 60F · Simulated packet paths</p></div></div>
        <button ref={closeButton} onClick={onClose} aria-label="Close network view" className="btn-ghost btn-sm p-2"><Icon name="x" size={18}/></button>
      </header>
      <div className="px-5 sm:px-6 py-3 bg-sunken border-b border-line flex flex-wrap items-center justify-between gap-3 shrink-0"><p id={descriptionId} className="text-sm text-muted">Follow test traffic through your current policies. Grading is separate.</p><span className="badge bg-surface text-muted">{traces.length} test packets</span></div>
      <p className="sm:hidden shrink-0 bg-canvas px-5 pt-3 text-xs text-muted">Swipe the diagram sideways to see every endpoint.</p>
      <div className="overflow-auto min-h-0 bg-canvas" tabIndex={0} aria-label="Network diagram. Scroll to explore on smaller screens.">
        <svg role="img" aria-label="Packet endpoints connected through the simulated FortiGate 60F" viewBox={`0 0 960 ${height}`} className="block w-full min-w-[840px]" style={{maxHeight:"48dvh",minHeight:300}}>
          <defs><pattern id={graphId} width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.8" className="text-line-strong" fill="currentColor" opacity="0.55"/></pattern></defs><rect width="960" height={height} fill={`url(#${graphId})`}/>
          {devices.map(device=><path key={device.id} d={`M ${device.x} ${device.y} L ${firewall.x} ${firewall.y}`} fill="none" className={current&&(device.id===source?.id||device.id===destination?.id)?zoneColor(device.zone):"text-line-strong"} stroke="currentColor" strokeWidth={current&&(device.id===source?.id||device.id===destination?.id)?2:1.5} opacity={finished?0.6:1}/>)}
          {devices.map(device=><g key={device.id} transform={`translate(${device.x-100},${device.y-34})`}><title>{device.name} · {device.ip} · {device.zone}</title><rect width="200" height="68" rx="6" className="text-surface" fill="currentColor"/><rect width="200" height="68" rx="6" className="text-line-strong" stroke="currentColor" fill="none"/><rect x="0" y="0" width="3" height="68" rx="1" className={zoneColor(device.zone)} fill="currentColor"/><text x="14" y="18" className={`${zoneColor(device.zone)} font-semibold`} fill="currentColor" fontSize="10">{device.zone}</text><text x="14" y="36" className="text-ink font-semibold" fill="currentColor" fontSize="12">{device.name.length>24?`${device.name.slice(0,23)}…`:device.name}</text><text x="14" y="53" className="text-muted font-mono" fill="currentColor" fontSize="11">{device.ip}</text></g>)}
          <g transform={`translate(${firewall.x-76},${firewall.y-43})`}><rect width="152" height="86" rx="8" className="text-surface" fill="currentColor"/><rect width="152" height="86" rx="8" className="text-accent" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M24 17l9 4v7c0 6-9 10-9 10s-9-4-9-10v-7z" className="text-accent" stroke="currentColor" fill="none" strokeWidth="1.7"/><text x="42" y="32" className="text-ink font-semibold" fill="currentColor" fontSize="14">FortiGate</text><text x="76" y="54" textAnchor="middle" className="text-muted" fill="currentColor" fontSize="12">60F · Simulated</text><text x="76" y="72" textAnchor="middle" className="text-muted" fill="currentColor" fontSize="10">Policy evaluation</text></g>
          {!finished&&current&&<g className={outcome}><circle cx={packet.x} cy={packet.y} r="7" fill="currentColor"/><circle cx={packet.x} cy={packet.y} r="12" fill="currentColor" opacity="0.15"/><rect x={packet.x-44} y={packet.y-31} width="88" height="20" rx="4" className="text-surface" fill="currentColor"/><text x={packet.x} y={packet.y-17} textAnchor="middle" className="font-mono" fill="currentColor" fontSize="11">{current.packet.protocol}/{current.packet.port??"any"}</text></g>}
        </svg>
      </div>
      <section className="border-t border-line min-h-0 overflow-auto px-5 sm:px-6 py-4" aria-label="Packet activity">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3"><h3 className="font-semibold text-sm text-ink">Packet activity</h3><p role="status" className="text-xs text-muted">{!traces.length?"No packets to replay":finished?`Replay complete · ${accepted} accepted · ${traces.length-accepted} denied`:`Packet ${index+1} of ${traces.length} · ${phase<0.4?"Travelling to firewall":phase<0.6?"Evaluating policy":"Applying decision"}`}</p></div>
        <ol className="divide-y divide-line">{traces.map((trace,i)=>{const complete=finished||elapsed>=(i+1)*DURATION;const active=!finished&&i===index;return <li key={trace.packet.id} className="flex items-start justify-between gap-4 py-2 text-sm"><div className="min-w-0"><p className={active?"text-ink font-medium":"text-body"}>{trace.packet.description}</p><p className="font-mono text-xs text-muted mt-1 break-all">{trace.packet.srcIp} → {trace.packet.dstIp} · {trace.packet.protocol}{trace.packet.port?`/${trace.packet.port}`:""}</p></div><span className={`badge shrink-0 ${complete?trace.finalAction==="ACCEPT"?"bg-success-soft text-success":"bg-danger-soft text-danger":"bg-sunken text-muted"}`}>{complete?trace.finalAction==="ACCEPT"?"Accepted":"Denied":active?"In transit":"Waiting"}</span></li>;})}</ol>
      </section>
      <footer className="shrink-0 px-5 sm:px-6 py-3 border-t border-line bg-sunken flex items-center justify-between gap-3"><p className="text-xs text-muted">{reduced?"Reduced motion: results shown without animation.":"Packet colors indicate the decision made by your rules."}</p><button className="btn-primary btn-sm shrink-0" disabled={!traces.length} onClick={()=>setReplay(value=>value+1)}><Icon name="refresh" size={14}/>Replay packets</button></footer>
    </div>
  </div>,document.body);
}
