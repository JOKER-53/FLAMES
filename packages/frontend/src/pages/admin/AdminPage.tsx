import { RevisionHistory } from "./RevisionHistory";
import { CONFIGURATION_FAMILIES, type ConfigurationFamily } from "@fortisim/engine";
import { ConfigurationExerciseEditor, exampleConfigurationExercise } from "./ConfigurationExerciseEditor";
import { ContentTransfer } from "./ContentTransfer";
import { PolicyExerciseEditor, examplePolicyExercise } from "./PolicyExerciseEditor";
import { contentId } from "../../utils/id";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { AuthoredLesson, AuthoredModule, AuthoredTask, ContentDraft, ContentSummary, ContentVendor } from "@fortisim/engine";
import { apiFetch } from "../../api/http";
import { useAccount } from "../../hooks/useAccount";
import { useCourseCatalog } from "../../course/CourseCatalog";
import { SiteLayout } from "../../components/shell/SiteLayout";
import { Callout, PageHeader } from "../../components/ui/primitives";
import { Icon } from "../../components/ui/Icon";
import { LessonInstructions } from "../course/AuthoredLessonPage";

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await apiFetch(`/api/admin${path}`, { method, ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Content request failed.");
  return data;
}
const newLesson = (): AuthoredLesson => ({ id: `custom-${contentId()}`, kind: "reading", title: "Untitled lesson", summary: "", minutes: 10, level: "Foundation", body: "", tasks: [] });
const newTask = (type: AuthoredTask["type"]): AuthoredTask => ({ id: `task-${contentId()}`, type, prompt: "", choices: type === "choice" ? ["", ""] : [], correctIndex: -1, acceptedAnswers: [] });
const vendorName = (vendor: ContentVendor) => vendor === "fortigate" ? "FortiGate" : "Palo Alto";

export function AdminPage() {
  const { user, loading, integration } = useAccount();
  const { refresh: refreshCatalog } = useCourseCatalog();
  const allowed = integration?.mode === "academy" ? !!user?.canManageContent : user?.role === "instructor";
  const [query,setQuery]=useState("");
  const [lessonQuery,setLessonQuery]=useState("");
  const [courseFilter,setCourseFilter]=useState("");
  const [modules, setModules] = useState<ContentSummary[]>([]);
  const [draft, setDraft] = useState<ContentDraft | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false); dirtyRef.current = dirty;
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [vendor, setVendor] = useState<ContentVendor>("fortigate");
  const reloadList = useCallback(async () => {
    const result = await request<{ modules: ContentSummary[] }>("/modules"); setModules(result.modules);
  }, []);
  useEffect(() => { if (allowed) void reloadList().catch(error => setError(error.message)); }, [allowed, reloadList]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirtyRef.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, []);
  const lesson = draft?.module.lessons.find(lesson => lesson.id === selectedLesson) ?? null;
  function updateModule(update: Partial<AuthoredModule>) {
    if (!draft) return; setDraft({ ...draft, module: { ...draft.module, ...update } }); setDirty(true); setNotice(null); setError(null);
  }
  function updateLesson(update: Partial<AuthoredLesson>) {
    if (!draft || !lesson) return;
    updateModule({ lessons: draft.module.lessons.map(item => item.id === lesson.id ? { ...item, ...update } : item) });
  }
  function updateTask(id: string, update: Partial<AuthoredTask>) {
    if (!lesson) return; updateLesson({ tasks: lesson.tasks.map(task => task.id === id ? { ...task, ...update } : task) });
  }
  async function open(id: string) {
    if (busy || dirty && !window.confirm("Discard unsaved changes and open another module?")) return;
    setBusy(true); setError(null); setNotice(null);
    try { const result = await request<ContentDraft>(`/modules/${id}`); setDraft(result); setSelectedLesson(null); setLessonQuery(""); setDirty(false); setPreview(false); }
    catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (dirty && !window.confirm("Discard unsaved changes and create another module?")) return;
    setBusy(true); setError(null);
    try {
      const result = await request<ContentDraft>("/modules", "POST", { vendor, title });
      setDraft(result); setSelectedLesson(null); setDirty(false); setCreating(false); setTitle(""); setNotice("Module created as a private draft."); await reloadList();
    } catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  async function action(kind: "save" | "publish" | "unpublish" | "delete") {
    if (!draft || busy) return;
    if (kind === "delete" && !window.confirm(`Delete the draft module “${draft.module.title}” and its lessons?`)) return;
    if (kind === "unpublish" && !window.confirm("Hide this module from students? Saved completion will be retained.")) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      let current = draft;
      if (dirty && kind !== "delete") current = await request<ContentDraft>(`/modules/${current.module.id}`, "PUT", { module: current.module, revision: current.revision });
      setDraft(current); setDirty(false);
      if (kind === "publish" || kind === "unpublish") current = await request<ContentDraft>(`/modules/${current.module.id}/${kind}`, "POST", { revision: current.revision });
      if (kind === "delete") { await request(`/modules/${current.module.id}`, "DELETE", { revision: current.revision }); setDraft(null); setSelectedLesson(null); }
      else setDraft(current);
      setNotice(kind === "publish" ? "Module published. Students can now open its lessons." : kind === "unpublish" ? "Module hidden from students." : kind === "delete" ? "Draft deleted." : "Draft saved. Published lessons remain unchanged until you publish.");
      await reloadList(); await refreshCatalog();
    } catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  async function duplicateModule(){
    if(!draft||busy)return;setBusy(true);setError(null);
    try{let current=draft;if(dirty){current=await request<ContentDraft>(`/modules/${current.module.id}`,"PUT",{module:current.module,revision:current.revision});setDraft(current);setDirty(false);}const copy=await request<ContentDraft>(`/modules/${current.module.id}/duplicate`,"POST",{revision:current.revision});setDraft(copy);setSelectedLesson(null);setLessonQuery("");setPreview(false);setNotice("Module duplicated as a private draft with new lesson and task identities.");await reloadList();}catch(error){setError((error as Error).message);}finally{setBusy(false);}
  }
  const filteredModules=modules.filter(module=>(!courseFilter||module.vendor===courseFilter)&&[module.title,module.summary,...(module.lessonTitles??[])].join(" ").toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  if (loading) return <SiteLayout><p role="status" className="text-muted">Checking administrator access…</p></SiteLayout>;
  if (!allowed) return <SiteLayout><PageHeader title="Administrator access" description="Manage FLAMES modules, lessons, and tasks." /><Callout tone="info" title="An administrator account is required">{integration?.mode === "academy" ? "Open FLAMES from an Academy account with the admin role." : "Sign in with your instructor account. To create the first instructor, run the admin setup command on the FLAMES server."}</Callout><Link to="/account" className="btn-primary mt-5">{user ? "Your account" : "Sign in"}</Link></SiteLayout>;

  return <SiteLayout wide>
    <PageHeader eyebrow="FLAMES administration" title="Content studio" description="Build modules, write lessons, and add tasks. Publish when you are ready for students to see them." actions={<button className="btn-primary" disabled={busy} onClick={() => { setCreating(true); setPreview(false); }}><Icon name="plus" size={15} />New module</button>} />
    {error && <Callout tone="danger" className="mb-5">{error} {error.includes("another editor") && draft && <button className="link ml-2" onClick={() => void open(draft.module.id)}>Reload module</button>}</Callout>}
    {notice && <p className="mb-5 rounded-md bg-success-soft text-success border border-success/20 px-4 py-3 text-sm" role="status">{notice}</p>}
    <ContentTransfer moduleId={draft?.module.id} dirty={dirty} onImported={async result => { setDraft(result); setSelectedLesson(null); setLessonQuery(""); setDirty(false); setPreview(false); await reloadList(); }} />
    {creating && <form onSubmit={create} className="card p-5 mb-6 flex flex-wrap items-end gap-4">
      <label className="min-w-[180px]"><span className="field-label">Course</span><select aria-label="Course" className="input" value={vendor} onChange={event => setVendor(event.target.value as ContentVendor)}><option value="fortigate">FortiGate 60F</option><option value="paloalto">Palo Alto PA-220</option></select></label>
      <label className="flex-1 min-w-[200px]"><span className="field-label">Module title</span><input autoFocus required maxLength={160} className="input" value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Branch network fundamentals" /></label>
      <button className="btn-primary" disabled={busy}>Create draft</button><button type="button" className="btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
    </form>}
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] items-start">
      <aside className="card overflow-hidden lg:sticky lg:top-5">
        <div className="px-4 py-3 border-b border-line flex justify-between text-sm font-semibold text-ink"><span>Your modules</span><span className="text-muted font-normal">{modules.length}</span></div>
        <div className="p-3 border-b border-line space-y-2"><label className="block"><span className="sr-only">Search modules</span><input type="search" className="input" placeholder="Search modules or lesson titles" value={query} onChange={event=>setQuery(event.target.value)}/></label><label className="block"><span className="sr-only">Filter modules by course</span><select aria-label="Filter modules by course" className="input" value={courseFilter} onChange={event=>setCourseFilter(event.target.value)}><option value="">Both courses</option><option value="fortigate">FortiGate</option><option value="paloalto">Palo Alto</option></select></label><p className="text-xs text-muted" role="status">{filteredModules.length} matching modules</p></div>
        {modules.length === 0 ? <p className="p-4 text-sm text-muted">Create your first module to add lessons. Existing simulator modules stay available in the courses.</p> : <nav aria-label="Content modules">{filteredModules.map(module => <button key={module.id} disabled={busy} onClick={() => void open(module.id)} className={`w-full text-left p-4 border-b last:border-b-0 border-line hover:bg-sunken ${draft?.module.id === module.id ? "bg-sunken border-l-[3px] border-l-accent" : ""}`}>
          <span className="block text-xs text-muted mb-1">{vendorName(module.vendor)}</span><span className="block font-medium text-ink break-words">{module.title}</span>
          <span className="mt-2 flex items-center justify-between gap-2 text-xs"><span className="text-muted">{module.lessonCount} lessons</span><span className={`badge ${module.publishedAt ? "bg-success-soft text-success" : "bg-warn-soft text-warn"}`}>{module.publishedAt ? module.hasUnpublishedChanges ? "Changes saved" : "Published" : "Draft"}</span></span>
        </button>)}{!filteredModules.length&&<p className="p-4 text-sm text-muted">No modules match these filters.</p>}</nav>}
      </aside>
      {!draft ? <section className="card p-8 sm:p-12"><Icon name="book" size={28} className="text-accent" /><h2 className="text-xl font-semibold mt-4">A place for your next lesson</h2><p className="text-muted mt-2 max-w-lg">Start a module for either vendor, add lesson instructions, and create tasks students can check as they learn. Drafts are visible only to administrators.</p><button className="btn-secondary mt-6" onClick={() => setCreating(true)}>Create a module</button></section> : <div className="min-w-0 space-y-5" data-vendor={draft.module.vendor}>
        <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
          <div><div className="text-xs text-muted">{vendorName(draft.module.vendor)} · {dirty ? "Unsaved changes" : "Draft saved"}</div><h2 className="font-semibold mt-1">{draft.module.title}</h2></div>
          <div className="flex flex-wrap gap-2"><button className="btn-secondary btn-sm" disabled={busy} onClick={()=>void duplicateModule()}>Duplicate module</button><button className="btn-secondary btn-sm" disabled={busy} onClick={() => void action("save")}>{busy ? "Working…" : "Save draft"}</button><button className="btn-primary btn-sm" disabled={busy} onClick={() => void action("publish")}>Publish module</button></div>
        </div>
        <RevisionHistory module={draft.module} revision={draft.revision}/>
        <fieldset disabled={busy} className="card p-5 space-y-4 min-w-0">
          <legend className="px-2 text-sm font-semibold">Module details</legend>
          <label className="block"><span className="field-label">Title</span><input className="input" maxLength={160} value={draft.module.title} onChange={event => updateModule({ title: event.target.value })} /></label>
          <label className="block"><span className="field-label">Summary</span><textarea aria-label="Summary" className="input h-20 py-2 resize-y" maxLength={1000} value={draft.module.summary} onChange={event => updateModule({ summary: event.target.value })} placeholder="What will students learn?" /></label>
        </fieldset>
        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4"><h3 className="font-semibold">Lessons <span className="font-normal text-muted">({draft.module.lessons.length})</span></h3><button className="btn-secondary btn-sm" disabled={busy || draft.module.lessons.length >= 30} onClick={() => { const item = newLesson(); updateModule({ lessons: [...draft.module.lessons, item] }); setSelectedLesson(item.id); setPreview(false); }}>Add lesson</button></div>
          <label className="block mb-3"><span className="sr-only">Search lessons</span><input type="search" className="input" placeholder="Search lessons" value={lessonQuery} onChange={event=>setLessonQuery(event.target.value)}/></label>
          {draft.module.lessons.length === 0 ? <p className="text-sm text-muted">Add a lesson, then write instructions and tasks.</p> : <ol className="space-y-2">{draft.module.lessons.map((item, index) => <li key={item.id} style={![item.title,item.summary,item.body].join(" ").toLocaleLowerCase().includes(lessonQuery.trim().toLocaleLowerCase())?{display:"none"}:undefined} className={`flex items-center gap-2 rounded border px-3 py-2 ${selectedLesson === item.id ? "border-accent bg-accent-soft" : "border-line"}`}>
            <button className="flex-1 min-w-0 text-left text-sm text-ink" onClick={() => { setSelectedLesson(item.id); setPreview(false); }}><span className="text-muted mr-2">{index + 1}.</span>{item.title || "Untitled lesson"}<span className="text-muted ml-2">· {item.tasks.length} tasks</span></button>
            <button className="btn-ghost btn-sm" disabled={busy || draft.module.lessons.length>=30} aria-label={`Duplicate ${item.title}`} onClick={()=>{const copy=structuredClone(item);copy.id=`custom-${contentId()}`;copy.title=`Copy of ${item.title}`.slice(0,160);copy.tasks=copy.tasks.map(task=>({...task,id:`task-${contentId()}`}));updateModule({lessons:[...draft.module.lessons.slice(0,index+1),copy,...draft.module.lessons.slice(index+1)]});setSelectedLesson(copy.id);setPreview(false);}}>Duplicate</button>
            <button className="btn-ghost btn-sm px-2" disabled={busy || index === 0} aria-label={`Move ${item.title} up`} onClick={() => { const lessons = [...draft.module.lessons]; [lessons[index - 1], lessons[index]] = [lessons[index], lessons[index - 1]]; updateModule({ lessons }); }}><Icon name="chevronUp" size={14} /></button>
            <button className="btn-ghost btn-sm px-2" disabled={busy || index === draft.module.lessons.length - 1} aria-label={`Move ${item.title} down`} onClick={() => { const lessons = [...draft.module.lessons]; [lessons[index + 1], lessons[index]] = [lessons[index], lessons[index + 1]]; updateModule({ lessons }); }}><Icon name="chevronDown" size={14} /></button>
          </li>)}</ol>}
        </section>
        {lesson && <section className="card p-5 space-y-5">
          <div className="flex flex-wrap justify-between gap-3"><h3 className="font-semibold">{preview ? "Lesson preview" : "Lesson editor"}</h3><button className="btn-secondary btn-sm" onClick={() => setPreview(!preview)}>{preview ? "Back to editor" : "Preview lesson"}</button></div>
          {preview ? <><h2 className="text-xl font-semibold">{lesson.title}</h2><p className="text-muted">{lesson.summary}</p><LessonInstructions body={lesson.body || "Instructions will appear here."} />{lesson.tasks.map((task, index) => <div key={task.id} className="rounded border border-line p-4"><h4 className="text-sm font-semibold">Task {index + 1}</h4><p className="mt-2 whitespace-pre-wrap">{task.prompt || "Question text"}</p>{task.type === "choice" ? <ul className="mt-3 space-y-2">{task.choices.map((choice, i) => <li key={i} className="rounded border border-line p-2 text-sm">{choice || "Answer choice"}</li>)}</ul> : <input disabled className="input mt-3" placeholder="Student answer" />}</div>)}</> : <fieldset disabled={busy} className="space-y-4 min-w-0">
            <label className="block"><span className="field-label">Lesson type</span><select aria-label="Lesson type" className="input" value={lesson.kind === "configuration" ? lesson.configurationExercise?.family : lesson.kind ?? "reading"} onChange={event => {
              const value = event.target.value;
              const kind = value === "reading" || value === "policy" ? value : "configuration";
              if ((lesson.policyExercise || lesson.configurationExercise || lesson.tasks.length) && !window.confirm("Switch lesson type and replace its current tasks or exercise? Save a draft first if you want to keep them.")) return;
              updateLesson({ kind, tasks: [], policyExercise: kind === "policy" ? examplePolicyExercise() : undefined, configurationExercise: kind === "configuration" ? exampleConfigurationExercise(value as ConfigurationFamily) : undefined });
            }}><option value="reading">Instructions and question tasks</option>{draft.module.vendor === "fortigate" && <option value="policy">FortiGate policy simulator exercise</option>}{(Object.keys(CONFIGURATION_FAMILIES) as ConfigurationFamily[]).filter(family => CONFIGURATION_FAMILIES[family].vendor === draft.module.vendor).map(family => <option key={family} value={family}>{CONFIGURATION_FAMILIES[family].label} simulator exercise</option>)}</select></label>
            <label className="block"><span className="field-label">Lesson title</span><input className="input" maxLength={160} value={lesson.title} onChange={event => updateLesson({ title: event.target.value })} /></label>
            <label className="block"><span className="field-label">Lesson summary</span><textarea aria-label="Lesson summary" className="input h-20 py-2" maxLength={1000} value={lesson.summary} onChange={event => updateLesson({ summary: event.target.value })} /></label>
            <div className="grid grid-cols-2 gap-4"><label><span className="field-label">Minutes</span><input className="input" type="number" min={1} max={240} value={lesson.minutes} onChange={event => updateLesson({ minutes: Number(event.target.value) })} /></label><label><span className="field-label">Level</span><select className="input" value={lesson.level} onChange={event => updateLesson({ level: event.target.value as AuthoredLesson["level"] })}><option>Foundation</option><option>Intermediate</option><option>Advanced</option></select></label></div>
            <label className="block"><span className="field-label">Instructions</span><textarea aria-label="Instructions" className="input h-56 py-3 leading-relaxed resize-y" maxLength={30000} value={lesson.body} onChange={event => updateLesson({ body: event.target.value })} placeholder="Explain the lesson and what students should do. Use blank lines to separate paragraphs." /><span className="text-xs text-muted">Plain text. Student content never runs HTML or scripts.</span></label>
            {lesson.kind === "policy" ? <PolicyExerciseEditor exercise={lesson.policyExercise!} change={policyExercise => updateLesson({ policyExercise })} /> : lesson.kind === "configuration" ? <ConfigurationExerciseEditor exercise={lesson.configurationExercise!} change={configurationExercise => updateLesson({ configurationExercise })} /> : <div className="border-t border-line pt-5 space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold">Tasks</h4><div className="flex gap-2"><button className="btn-secondary btn-sm" disabled={lesson.tasks.length >= 20} onClick={() => updateLesson({ tasks: [...lesson.tasks, newTask("choice")] })}>Add multiple choice</button><button className="btn-secondary btn-sm" disabled={lesson.tasks.length >= 20} onClick={() => updateLesson({ tasks: [...lesson.tasks, newTask("answer")] })}>Add short answer</button></div></div>
              {!lesson.tasks.length && <p className="text-sm text-muted">Without tasks, students complete this lesson by marking it as read.</p>}
              {lesson.tasks.map((task, index) => <div key={task.id} className="rounded-lg border border-line p-4 space-y-3 bg-sunken/40">
                <div className="flex justify-between gap-2"><h5 className="text-sm font-semibold">Task {index + 1} · {task.type === "choice" ? "Multiple choice" : "Short answer"}</h5><button aria-label={`Remove task ${index + 1}`} className="btn-ghost btn-sm px-2 text-danger" onClick={() => updateLesson({ tasks: lesson.tasks.filter(item => item.id !== task.id) })}><Icon name="trash" size={14} /></button></div>
                <label className="block"><span className="field-label">Question</span><textarea aria-label={`Question for task ${index + 1}`} className="input h-20 py-2" maxLength={2000} value={task.prompt} onChange={event => updateTask(task.id, { prompt: event.target.value })} /></label>
                {task.type === "choice" ? <><p className="text-xs text-muted">Select the radio button beside the correct answer.</p>{task.choices.map((choice, choiceIndex) => <div key={choiceIndex} className="flex items-center gap-2"><input aria-label={`Correct answer ${choiceIndex + 1} for task ${index + 1}`} type="radio" name={`correct-${task.id}`} checked={task.correctIndex === choiceIndex} onChange={() => updateTask(task.id, { correctIndex: choiceIndex })} /><input className="input" aria-label={`Choice ${choiceIndex + 1} for task ${index + 1}`} maxLength={500} value={choice} onChange={event => updateTask(task.id, { choices: task.choices.map((value, i) => i === choiceIndex ? event.target.value : value) })} />{task.choices.length > 2 && <button className="btn-ghost btn-sm px-2" aria-label={`Remove choice ${choiceIndex + 1} for task ${index + 1}`} onClick={() => updateTask(task.id, { choices: task.choices.filter((_, i) => i !== choiceIndex), correctIndex: task.correctIndex === choiceIndex ? -1 : task.correctIndex > choiceIndex ? task.correctIndex - 1 : task.correctIndex })}><Icon name="x" size={14} /></button>}</div>)}<button className="btn-ghost btn-sm" disabled={task.choices.length >= 8} onClick={() => updateTask(task.id, { choices: [...task.choices, ""] })}>Add choice</button></> : <label className="block"><span className="field-label">Accepted answers</span><textarea aria-label="Accepted answers" className="input h-24 py-2" value={task.acceptedAnswers.join("\n")} onChange={event => updateTask(task.id, { acceptedAnswers: event.target.value.split("\n") })} placeholder="One accepted answer per line" /><span className="text-xs text-muted">Up to 10 answers; capitalization and extra spaces are ignored.</span></label>}
              </div>)}
            </div>}
            <button className="btn-ghost btn-sm text-danger" onClick={() => { if (window.confirm(`Remove “${lesson.title}” from this draft?`)) { updateModule({ lessons: draft.module.lessons.filter(item => item.id !== lesson.id) }); setSelectedLesson(null); } }}>Remove lesson</button>
          </fieldset>}
        </section>}
        <div className="flex flex-wrap justify-between gap-3 text-sm"><p className="text-muted">{draft.publishedAt ? `Last published ${new Date(draft.publishedAt).toLocaleString()}. Edits stay in the draft until republished.` : "Only administrators can see this draft."}</p><button className="link text-danger" disabled={busy} onClick={() => void action(draft.publishedAt ? "unpublish" : "delete")}>{draft.publishedAt ? "Unpublish module" : "Delete draft"}</button></div>
      </div>}
    </div>
  </SiteLayout>;
}
