import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAccount } from "../hooks/useAccount";
import { apiJson } from "../api/http";
import { SiteLayout } from "../components/shell/SiteLayout";
import { Callout, PageHeader } from "../components/ui/primitives";
interface Result { userId:string; name:string; completed:number; required:number; status:"assigned"|"started"|"completed"|"overdue"; }
interface Assignment { id:string; title:string; moduleId:string; vendor:string; dueAt:number; requiredCount:number; results:Result[]; lessonIds:string[]; }
interface Group { id:string; name:string; inviteCode?:string; members:{id:string;name:string;email:string}[]; assignments:Assignment[]; }
interface Module { id:string;vendor:string;title:string;lessons:{id:string}[]; }
interface Snapshot { groups:Group[];modules:Module[];provenance:string; }
const request = <T,>(path="", data?:unknown) => apiJson<T>(`/api/classroom/${path}`,data);
function downloadResults(group:Group, search:string, filter:string) {
  const rows:[[string,string,string,string,string,string,string], ...string[][]] = [["Student","Assignment","Completed lessons","Required lessons","Status","Due date","Provenance"]];
  for(const assignment of group.assignments) for(const result of assignment.results.filter(result=>result.name.toLowerCase().includes(search.toLowerCase())&&(filter==="all"||result.status===filter))) rows.push([result.name,assignment.title,String(result.completed),String(result.required),result.status,new Date(assignment.dueAt).toISOString(),"Student-reported practice completion"]);
  // Neutralize spreadsheet formula cells, including leading whitespace/control chars.
  const cell=(value:string)=>`"${(/^[\s]*[=+@-]/.test(value)?"'":"")+value.replace(/"/g,'""')}"`;
  const url=URL.createObjectURL(new Blob([rows.map(row=>row.map(cell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"}));
  const anchor=document.createElement("a");anchor.href=url;anchor.download="flames-classroom-results.csv";anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function AssignmentForm({group,modules,busy,onAssign}:{group:Group;modules:Module[];busy:boolean;onAssign:(data:unknown)=>Promise<unknown>}) {
  const [selected,setSelected]=useState(""); const [due,setDue]=useState("");const [required,setRequired]=useState(1);
  const module=modules.find(module=>`${module.vendor}:${module.id}`===selected);
  return <form className="border-t border-line p-5 flex flex-wrap items-end gap-3" onSubmit={event=>{event.preventDefault();if(module)void onAssign({vendor:module.vendor,moduleId:module.id,requiredCount:required,dueAt:new Date(due).toISOString()});}}>
    <label className="flex-1 min-w-[180px]"><span className="field-label">Assign module</span><select aria-label={`Module for ${group.name}`} className="input" required value={selected} onChange={event=>{setSelected(event.target.value);const next=modules.find(module=>`${module.vendor}:${module.id}`===event.target.value);setRequired(next?.lessons.length??1);}}><option value="">Choose a module</option>{modules.map(module=><option key={`${module.vendor}:${module.id}`} value={`${module.vendor}:${module.id}`}>{module.vendor==="fortigate"?"FortiGate":"Palo Alto"} · {module.title}</option>)}</select></label>
    <label><span className="field-label">Required lessons</span><input aria-label={`Required lessons for ${group.name}`} type="number" className="input w-28" min={1} max={module?.lessons.length??1} value={required} onChange={event=>setRequired(Number(event.target.value))} required /></label>
    <label><span className="field-label">Due date (your time)</span><input aria-label={`Due date for ${group.name}`} type="datetime-local" className="input" required value={due} onChange={event=>setDue(event.target.value)} /></label><button disabled={busy||!module} className="btn-primary">Assign module</button>
  </form>;
}
export function ClassroomPage() {
  const {user,loading}=useAccount(); const [snapshot,setData]=useState<(Snapshot & {ownerId:string})|null>(null);const data=snapshot?.ownerId===user?.id?snapshot:null;const [error,setError]=useState("");const [busy,setBusy]=useState(false);const [name,setName]=useState("");const [code,setCode]=useState("");const [search,setSearch]=useState("");const [filter,setFilter]=useState("all");
  const generation=useRef(0);
  const reload=useCallback(async()=>{const version=++generation.current;const next=await request<Snapshot>();if(generation.current===version&&user)setData({...next,ownerId:user.id});},[user?.id]);
  useEffect(()=>{setData(null);setError("");if(user)void reload().catch(error=>setError(error.message));return()=>{generation.current++;};},[user?.id,reload]);
  async function mutate(path:string,body:unknown){setBusy(true);setError("");try{await request(path,body);await reload();return true;}catch(error){setError((error as Error).message);return false;}finally{setBusy(false);}}
  const instructor=user?.role==="instructor";
  return <SiteLayout wide><PageHeader eyebrow={instructor?"Instructor":"Learning"} title={instructor?"Classroom assignments":"Your assignments"} description={instructor?"Create a group, invite students, and assign modules with a deadline.":"Join your instructor's group to see assigned modules and due dates."} actions={user?<button className="btn-secondary" disabled={busy} onClick={()=>{setError("");void reload().catch(error=>setError(error.message));}}>Refresh progress</button>:undefined} />
    {loading?<p role="status">Checking access…</p>:!user?<Callout tone="info">Sign in to use assignments. <Link to="/account" className="link">Sign in</Link></Callout>:<>
      {error&&<Callout tone="danger" className="mb-5">{error}</Callout>}
      <form className="card p-5 flex flex-wrap items-end gap-3 mb-6" onSubmit={event=>{event.preventDefault();void mutate(instructor?"groups":"join",instructor?{name}:{code:code.trim()});}}><label className="flex-1 min-w-[180px]"><span className="field-label">{instructor?"Group name":"Group invitation code"}</span><input aria-label={instructor?"Group name":"Group invitation code"} className="input" required maxLength={instructor?120:36} value={instructor?name:code} onChange={event=>instructor?setName(event.target.value):setCode(event.target.value)} placeholder={instructor?"e.g. Network Security · Section A":"Ask your instructor for the code"} /></label><button className="btn-primary" disabled={busy}>{instructor?"Create group":"Join group"}</button></form>
      {instructor&&<div className="flex flex-wrap gap-3 mb-6"><input aria-label="Filter assignment students" className="input max-w-xs" type="search" placeholder="Filter student names" value={search} onChange={event=>setSearch(event.target.value)} /><select aria-label="Filter assignment status" className="input w-44" value={filter} onChange={event=>setFilter(event.target.value)}>{["all","assigned","started","completed","overdue"].map(value=><option key={value} value={value}>{value==="all"?"All statuses":value}</option>)}</select></div>}
      {!data&&!error&&<p role="status">Loading assignments…</p>}{data?.groups.length===0&&<p className="text-muted">{instructor?"Create your first group to assign a module. Students appear after joining with your invitation code.":"You have no groups yet. Enter an invitation code to join."}</p>}
      <div className="space-y-6">{data?.groups.map(group=><section key={group.id} className="card overflow-hidden">
        <div className="p-5 border-b border-line"><div className="flex flex-wrap gap-3 items-center justify-between"><h2 className="text-lg font-semibold">{group.name}</h2>{instructor&&<button className="btn-secondary btn-sm" onClick={()=>downloadResults(group,search,filter)}>Export results CSV</button>}</div>
          {group.inviteCode&&<div className="flex flex-wrap gap-3 mt-3 items-center text-sm"><span className="text-muted">Invitation code</span><code className="font-mono break-all">{group.inviteCode}</code><button className="btn-ghost btn-sm" disabled={busy} onClick={()=>{if(window.confirm("Replace this invitation code? Existing members remain enrolled."))void mutate(`groups/${group.id}/rotate-invite`,{});}}>Replace code</button></div>}
          {instructor&&<details className="mt-4"><summary className="cursor-pointer text-sm text-muted">{group.members.length} group members</summary><ul className="divide-y divide-line mt-2">{group.members.map(member=><li key={member.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><div>{member.name}<span className="text-muted ml-2">{member.email}</span></div><button className="text-danger" disabled={busy} onClick={()=>{if(window.confirm(`Remove ${member.name} from this group?`))void mutate(`groups/${group.id}/remove-member`,{userId:member.id});}}>Remove</button></li>)}</ul></details>}
        </div>
        {group.assignments.length===0?<p className="p-5 text-muted text-sm">No modules assigned yet.</p>:group.assignments.map(assignment=><div className="p-5 border-b border-line" key={assignment.id}><div className="flex flex-wrap justify-between gap-2 mb-3"><div><h3 className="font-semibold">{assignment.title}</h3><p className="text-xs text-muted mt-1">{assignment.vendor==="fortigate"?"FortiGate":"Palo Alto"} · {assignment.requiredCount} required lessons · Due {new Date(assignment.dueAt).toLocaleString()}</p></div>{!instructor&&<Link to={`/${assignment.vendor}/modules/${assignment.moduleId}`} className="btn-secondary btn-sm" onClick={event=>{event.preventDefault();void mutate(`assignments/${assignment.id}/start`,{}).then(ok=>{if(ok)window.location.assign(`/${assignment.vendor}/modules/${assignment.moduleId}`);});}}>Open assigned module</Link>}</div>
          {instructor&&<button className="text-xs text-danger mb-3" disabled={busy} onClick={()=>{if(window.confirm("Delete this assignment? Student course progress will be retained."))void mutate(`groups/${group.id}/assignments/${assignment.id}/delete`,{});}}>Delete assignment</button>}
          <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-xs text-muted"><tr><th className="py-2">Student</th><th className="py-2">Completed / required</th><th className="py-2">Status</th></tr></thead><tbody>{assignment.results.filter(result=>result.name.toLowerCase().includes(search.toLowerCase())&&(filter==="all"||result.status===filter)).map(result=><tr key={result.userId} className="border-t border-line"><td className="py-2">{result.name}</td><td className="py-2">{result.completed} / {result.required}</td><td className="py-2"><span className={`badge ${result.status==="completed"?"bg-success-soft text-success":result.status==="overdue"?"bg-danger-soft text-danger":"bg-sunken text-muted"}`}>{result.status}</span></td></tr>)}</tbody></table></div>
        </div>)}
        {instructor&&<div className="px-5 py-3"><button className="text-sm text-danger" disabled={busy} onClick={()=>{if(window.confirm("Delete this group and its assignments? Student course progress will be retained."))void mutate(`groups/${group.id}/delete`,{});}}>Delete group</button></div>}
        {instructor&&data&&<AssignmentForm group={group} modules={data.modules} busy={busy} onAssign={body=>mutate(`groups/${group.id}/assignments`,body)} />}
      </section>)}</div>
      {data&&<p className="text-xs text-muted mt-6">{data.provenance}. Assignments snapshot their lesson requirements when created; later module edits do not silently change those requirements.</p>}
    </>}
  </SiteLayout>;
}
