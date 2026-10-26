import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useCourse } from "../../components/shell/CourseShell";
import { allLessons } from "../../course/curriculum";
import material from "../../course/learning.json";

const taskNotes = material.tasks as Record<string, { chapter: string; approach: string; verify: string }>;

/** Text-based diagram stays legible at browser zoom and exposes the full flow to screen readers. */
function Flowchart({ steps, decision }: { steps: string[]; decision: boolean }) {
  return <figure className="my-6 rounded-lg border border-line bg-canvas p-4 sm:p-6">
    <figcaption className="mb-4 text-sm font-semibold text-ink">Decision flow</figcaption>
    {decision ? <div className="mx-auto max-w-md space-y-3 text-sm text-center text-body">
      <div className="rounded-md border border-line bg-surface p-3">Receive packet → inspect next enabled rule</div>
      <div aria-hidden="true">↓</div>
      <div className="rounded-md border-2 border-accent bg-surface p-3 font-medium">Do all required fields match?</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><p className="font-semibold">Yes ↓</p><p className="rounded-md border border-line bg-surface p-3">Apply this rule’s action. Stop searching.</p></div>
        <div className="space-y-2"><p className="font-semibold">No ↓</p><p className="rounded-md border border-line bg-surface p-3">Try the next rule. If none remains, deny.</p></div>
      </div>
      <p className="pt-2 text-muted">Inspect the matching rule and any modeled logging or filtering.</p>
    </div> : <ol className="mx-auto max-w-xl space-y-2 text-sm text-body">{steps.map((step, i) => <li key={step}>
      {i > 0 && <div className="mb-2 text-center text-muted" aria-hidden="true">↓</div>}
      <div className="rounded-md border border-line bg-surface px-4 py-3"><span className="mr-2 text-muted">{i + 1}.</span>{step}</div>
    </li>)}</ol>}
  </figure>;
}

export function LearningPage() {
  const { course } = useCourse();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const lessons = allLessons(course);
  const selectedTask = lessons.find(lesson => lesson.id === params.get("task"));
  const requested = params.get("chapter") ?? (selectedTask && taskNotes[selectedTask.id]?.chapter);
  const chapter = material.chapters.find(chapter => chapter.id === requested) ?? material.chapters[0];
  const selectionKey = params.toString();
  useEffect(() => { document.getElementById("main-content")?.scrollTo({ top: 0 }); }, [selectionKey]);
  const needle = query.trim().toLowerCase();
  const matches = useMemo(() => lessons.filter(lesson => `${lesson.title} ${lesson.summary} ${taskNotes[lesson.id]?.approach ?? ""}`.toLowerCase().includes(needle)), [course, needle]);
  const related = lessons.filter(lesson => taskNotes[lesson.id]?.chapter === chapter.id);
  return <article className="mx-auto max-w-[1400px]">
    <header className="mb-6 border-b border-line pb-5">
      <h1 className="text-2xl font-semibold text-ink">Learning guide</h1>
      <p className="mt-2 max-w-[75ch] text-sm leading-relaxed text-muted">Study the concepts, follow a worked example, then practice in {course.product}. Every built-in task has a study path below. Examples use separate networks so you can learn the method before designing your own solution.</p>
    </header>
    <div className="grid items-start gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="min-w-0 space-y-5">
        <div className="lg:hidden"><label className="text-sm font-medium text-ink" htmlFor="study-chapter">Choose a chapter</label><select id="study-chapter" className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink" value={chapter.id} onChange={event => setParams({ chapter: event.target.value })}>{material.chapters.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div>
        <nav aria-label="Learning chapters" className="hidden lg:block rounded-lg border border-line bg-surface p-3">
          {material.chapters.map(item => <Link key={item.id} to={`${course.base}/learn?chapter=${item.id}`} aria-current={item.id === chapter.id ? "page" : undefined} className={`block rounded-md px-3 py-2.5 text-sm ${item.id === chapter.id ? "bg-canvas font-semibold text-ink" : "text-muted hover:text-ink"}`}>{item.title}</Link>)}
        </nav>
        <div><label htmlFor="study-search" className="text-sm font-medium text-ink">Find a task to study</label><input id="study-search" type="search" value={query} onChange={event => setQuery(event.target.value)} className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink" placeholder="DNS, NAT, interfaces…" /></div>
        <p className="text-xs text-muted" role="status">{matches.length} tasks</p>
        <nav aria-label="Task study paths" className="max-h-40 lg:max-h-[420px] overflow-auto rounded-md border border-line bg-surface p-2">{matches.map(lesson => <Link key={lesson.id} to={`${course.base}/learn?task=${lesson.id}`} aria-current={lesson.id === selectedTask?.id ? "page" : undefined} className="block rounded px-2 py-2 text-sm text-body hover:bg-canvas">{lesson.title}</Link>)}{!matches.length && <p className="p-2 text-sm text-muted">No matching tasks. Try a topic or clear the search.</p>}</nav>
      </aside>
      <div className="min-w-0 max-w-[85ch] rounded-lg border border-line bg-surface p-5 sm:p-7">
        {selectedTask && <section aria-label="Selected task study plan" className="mb-7 border-l-2 border-accent bg-canvas p-4">
          <h2 className="text-lg font-semibold text-ink">{selectedTask.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-body">{taskNotes[selectedTask.id]?.approach}</p>
          <p className="mt-2 text-sm leading-relaxed text-body"><strong>Verify:</strong> {taskNotes[selectedTask.id]?.verify}</p>
          <Link to={selectedTask.route} className="btn-primary mt-4">Open practice task</Link>
        </section>}
        <h2 className="text-xl font-semibold text-ink">{chapter.title}</h2>
        <p className="mt-3 text-sm leading-7 text-body">{chapter.intro}</p>
        <h3 className="mt-6 text-base font-semibold text-ink">Understand the model</h3>
        <ul className="mt-3 list-disc space-y-3 pl-5 text-sm leading-7 text-body">{chapter.terms.map(term => <li key={term}>{term}</li>)}</ul>
        <h3 className="mt-6 text-base font-semibold text-ink">Work through it</h3>
        <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-7 text-body">{chapter.steps.map(step => <li key={step}>{step}</li>)}</ol>
        <section className="mt-6 border-l-2 border-accent bg-canvas p-4" aria-label="Worked example"><h3 className="font-semibold text-ink">Worked example</h3><p className="mt-2 text-sm leading-7 text-body">{chapter.example}</p></section>
        <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm text-body"><caption className="mb-3 text-left font-semibold text-ink">Predict the result</caption><thead><tr className="border-b border-line"><th scope="col" className="p-2">Input</th><th scope="col" className="p-2">Expected observation</th><th scope="col" className="p-2">Why</th></tr></thead><tbody>{chapter.exampleCases.map(item => <tr key={item.input} className="border-b border-line"><th scope="row" className="p-2 font-medium leading-relaxed">{item.input}</th><td className="p-2 leading-relaxed">{item.result}</td><td className="p-2 leading-relaxed">{item.reason}</td></tr>)}</tbody></table></div>
        <Flowchart steps={chapter.flow} decision={chapter.id === "policy" || chapter.id === "pan-security"} />
        <h3 className="text-base font-semibold text-ink">Common mistakes</h3>
        <ul className="mt-3 list-disc space-y-3 pl-5 text-sm leading-7 text-body">{chapter.mistakes.map(mistake => <li key={mistake}>{mistake}</li>)}</ul>
        <section className="mt-6 rounded-md bg-canvas p-4"><h3 className="font-semibold text-ink">Check your understanding</h3><p className="mt-2 text-sm leading-7 text-body">{chapter.review}</p><details className="mt-3 text-sm text-body"><summary className="cursor-pointer font-medium text-ink">Show an explanation</summary><p className="mt-2 leading-7">{chapter.reviewAnswer}</p></details><p className="mt-2 text-xs text-muted">Explain your reasoning first; reading this guide does not mark a task complete.</p></section>
        {!!related.length && <section className="mt-7"><h3 className="font-semibold text-ink">Practice this topic</h3><ul className="mt-2 space-y-2">{related.map(lesson => <li key={lesson.id}><Link className="text-sm text-accent underline underline-offset-4" to={`${course.base}/learn?task=${lesson.id}`}>{lesson.title}</Link></li>)}</ul></section>}
        <footer className="mt-8 border-t border-line pt-5 text-xs leading-relaxed text-muted"><p>FLAMES is a teaching simulator. Its independent packet tests, default actions, special-purpose zone types, and simplified NAT do not reproduce every real appliance behavior.</p><p className="mt-3 font-semibold">Further reading</p><ul className="mt-2 space-y-2">{material.sources.map(source => <li key={source.url}><a className="underline underline-offset-4" href={source.url} target="_blank" rel="noreferrer">{source.title} (opens in a new tab)</a></li>)}</ul></footer>
      </div>
    </div>
  </article>;
}
