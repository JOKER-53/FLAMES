import { useEffect, useRef, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import type { PublicLesson } from "@fortisim/engine";
import { apiJson } from "../../api/http";
import { useCourse } from "../../components/shell/CourseShell";
import { LessonFrame } from "../../components/shell/LessonFrame";
import { Callout } from "../../components/ui/primitives";

export function LessonInstructions({ body }: { body: string }) {
  return <div className="space-y-4 text-body leading-relaxed">{body.split(/\n\s*\n/).map((paragraph, index) => <p key={index} className="whitespace-pre-wrap break-words">{paragraph}</p>)}</div>;
}
interface Report { overallPassed: boolean; results: { taskId: string; passed: boolean }[]; }
export function AuthoredLessonPage({ complete }: { complete: (id: string) => void }) {
  const { lessonId = "" } = useParams();
  const { course } = useCourse();
  const [lesson, setLesson] = useState<PublicLesson | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    const current = ++generation.current;
    setLesson(null); setError(null); setAnswers({}); setReport(null); setBusy(false);
    apiJson<PublicLesson>(`/api/content/lessons/${encodeURIComponent(lessonId)}`).then(data => { if (current === generation.current) setLesson(data); }).catch(error => { if (current === generation.current) setError(error.message); });
    return () => { generation.current++; };
  }, [lessonId]);
  async function submit() {
    if (!lesson) return;
    const current = ++generation.current; setBusy(true); setError(null); setReport(null);
    try {
      const result = await apiJson<Report>(`/api/content/lessons/${encodeURIComponent(lessonId)}/grade`, {
        answers: Object.entries(answers).map(([taskId, value]) => ({ taskId, value })),
      });
      if (current !== generation.current) return;
      setReport(result); if (result.overallPassed) complete(lessonId);
    } catch (error) { if (current === generation.current) setError(error instanceof Error ? error.message : "Could not check your answers."); }
    finally { if (current === generation.current) setBusy(false); }
  }
  if (lesson && lesson.vendor !== course.vendor) return <Navigate to={`/${lesson.vendor}/lessons/${lesson.id}`} replace />;
  return <LessonFrame title={lesson?.title ?? "Lesson"} brief={lesson?.summary || "Read the instructions, then complete the lesson tasks."}>
    {error && <Callout tone="danger" className="mb-5">{error}</Callout>}
    {!lesson ? !error && <p role="status" className="text-muted">Loading lesson…</p> : <div className="space-y-6">
      <section className="card p-6"><LessonInstructions body={lesson.body} /></section>
      {lesson.tasks.length > 0 && <h2 className="text-lg font-semibold">Tasks</h2>}
      {lesson.tasks.map((task, index) => {
        const result = report?.results.find(result => result.taskId === task.id);
        return <fieldset key={task.id} className="card p-5 space-y-3">
          <legend className="px-2 text-sm font-semibold text-ink">Task {index + 1}</legend>
          <p className="whitespace-pre-wrap break-words text-ink">{task.prompt}</p>
          {task.type === "choice" ? task.choices.map((choice, i) => <label key={i} className="flex items-start gap-3 rounded border border-line p-3 cursor-pointer hover:bg-sunken">
            <input type="radio" name={task.id} value={i} checked={answers[task.id] === i} onChange={() => { generation.current++; setBusy(false); setReport(null); setAnswers(previous => ({ ...previous, [task.id]: i })); }} className="mt-1" />
            <span className="break-words min-w-0">{choice}</span>
          </label>) : <label className="block"><span className="field-label">Your answer</span><input aria-label="Your answer" className="input" maxLength={1000} value={answers[task.id] ?? ""} onChange={event => { generation.current++; setBusy(false); setReport(null); setAnswers(previous => ({ ...previous, [task.id]: event.target.value })); }} /><span className="text-xs text-muted">Capitalization and extra spaces do not affect grading.</span></label>}
          {result && <p className={`text-sm ${result.passed ? "text-success" : "text-danger"}`}>{result.passed ? "Correct" : "Review this answer and try again."}</p>}
        </fieldset>;
      })}
      <div className="card p-5 flex flex-wrap items-center gap-4">
        <button className="btn-primary" disabled={busy} onClick={() => void submit()}>{busy ? "Checking…" : lesson.tasks.length ? "Check lesson tasks" : "Mark as read"}</button>
        {report && <p className={`text-sm ${report.overallPassed ? "text-success" : "text-danger"}`} role="status">{report.overallPassed ? "Lesson complete." : "Some tasks need another look."}</p>}
      </div>
    </div>}
  </LessonFrame>;
}
