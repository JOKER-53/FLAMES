import { useEffect, useRef, useState, type ReactNode } from "react";
import { CONFIGURATION_FAMILIES, isSimulatorConfiguration, type ConfigurationFamily, type ConfigurationRow, type ConfigurationResult, type PublicLesson } from "@fortisim/engine";
import { apiJson } from "../../api/http";
import { useSimulatorDraft } from "../../drafts/useSimulatorDraft";
import { DraftWorkspace } from "../../drafts/DraftWorkspace";
import { ConfigurationRowsEditor } from "../../components/configuration/ConfigurationRowsEditor";
import { LessonFrame } from "../../components/shell/LessonFrame";
import { ConsoleFrame, CheckYourWork } from "../../components/lesson/LessonParts";
import { Callout } from "../../components/ui/primitives";
interface PublicConfiguration {family:ConfigurationFamily;version:string;starterConfig:ConfigurationRow[];checks:{id:string;description:string}[];}
export function AuthoredConfigurationLesson({lesson,instructions,complete}:{lesson:PublicLesson;instructions:ReactNode;complete:(id:string)=>void}){
 const [definition,setDefinition]=useState<PublicConfiguration|null>(null);const[error,setError]=useState("");
 useEffect(()=>{let active=true;setDefinition(null);setError("");apiJson<PublicConfiguration>(`/api/content/lessons/${lesson.id}/configuration`).then(value=>{if(!Object.prototype.hasOwnProperty.call(CONFIGURATION_FAMILIES,value.family)||CONFIGURATION_FAMILIES[value.family].vendor!==lesson.vendor||!isSimulatorConfiguration(value.family,value.starterConfig)||typeof value.version!=="string")throw new Error("Invalid exercise configuration.");if(active)setDefinition(value);}).catch(error=>{if(active)setError(error.message);});return()=>{active=false;};},[lesson.id,lesson.vendor]);
 return <LessonFrame title={lesson.title} brief={lesson.summary}>{error?<Callout tone="danger">{error}</Callout>:definition?<Workspace key={`${lesson.id}:${definition.version}`} lesson={lesson} definition={definition} instructions={instructions} complete={complete}/>:<p role="status" className="text-muted">Loading configuration exercise…</p>}</LessonFrame>;
}
function Workspace({lesson,definition,instructions,complete}:{lesson:PublicLesson;definition:PublicConfiguration;instructions:ReactNode;complete:(id:string)=>void}){
 const persisted=useSimulatorDraft<ConfigurationRow[]>(lesson.vendor,lesson.id,definition.family,definition.starterConfig,definition.version);const rows=persisted.value;
 const [report,setReport]=useState<{overallPassed:boolean;results:ConfigurationResult[]}|null>(null);const[error,setError]=useState("");const[busy,setBusy]=useState(false);const generation=useRef(0);
 useEffect(()=>{generation.current++;setReport(null);setError("");setBusy(false);return()=>{generation.current++;};},[rows]);
 async function grade(){const current=++generation.current;setBusy(true);setError("");try{const report=await apiJson<any>(`/api/content/lessons/${lesson.id}/configuration/grade`,{config:rows,version:definition.version});if(current!==generation.current)return;setReport(report);if(report.overallPassed)complete(lesson.id);}catch(error){if(current===generation.current)setError((error as Error).message);}finally{if(current===generation.current)setBusy(false);}}
 return <div className="space-y-4"><section className="card p-4 text-sm leading-relaxed">{instructions}</section><DraftWorkspace draft={persisted.controls}><div className="space-y-5"><ConsoleFrame path={["Custom exercise",CONFIGURATION_FAMILIES[definition.family].label]}><ConfigurationRowsEditor family={definition.family} rows={rows} change={persisted.setValue}/></ConsoleFrame><p className="text-xs text-muted">Simplified practice model. {definition.family==="pan-nat"?"NAT checks original zones and destination; translation does not grant security permission.":definition.family==="routing"?"Static IPv4 routes use longest prefix, then administrative distance; equal-cost paths are checked together.":"Configuration is checked against the instructor's requirements; no live firewall is changed."}</p><CheckYourWork hintTopic={definition.family} onSubmit={()=>void grade()} grading={busy} error={error} result={report&&{passed:report.overallPassed,checks:report.results.map(result=>({label:result.description,passed:result.passed}))}}/>{error.includes("changed")&&<button className="btn-secondary" onClick={()=>window.location.reload()}>Reload lesson</button>}
 </div></DraftWorkspace></div>;
}
