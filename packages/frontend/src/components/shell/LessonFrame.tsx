// ============================================================================
// Standard lesson layout: header, scenario brief, the vendor workspace, and
// previous/next navigation. Pages provide the brief and the workspace only.
// ============================================================================
import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Icon } from "../ui/Icon";
import { lessonStatus } from "../../course/curriculum";
import { lessonForLocation, useCourse } from "./CourseShell";
import { LevelBadge } from "../../pages/course/CoursePages";

interface LessonFrameProps {
  /** Scenario description shown as the lesson brief. */
  brief: ReactNode;
  /** Optional hint, collapsed until the student asks for it. */
  hint?: ReactNode;
  /** Fallback title when the page is opened outside a course lesson. */
  title?: string;
  children: ReactNode;
}

export function LessonFrame({ brief, hint, title, children }: LessonFrameProps) {
  const { course, completed } = useCourse();
  const location = useLocation();
  const [showHint, setShowHint] = useState(false);
  const match = lessonForLocation(course, location.pathname, location.search);
  const module = match?.module, lesson = match?.lesson;
  const index = module && lesson ? module.lessons.indexOf(lesson) : -1;
  const prev = module && index > 0 ? module.lessons[index - 1] : null;
  const next = module && index >= 0 ? module.lessons[index + 1] ?? null : null;
  const nextLocked = !!(module && next && lessonStatus(module, next, completed) === "locked");
  const done = !!lesson && completed.has(lesson.id);

  return (
    <article>
      <header className="mb-3 overflow-hidden rounded-lg border border-line bg-surface">
        <div className="px-4 py-4 sm:px-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            {module && lesson && <div className="mb-1.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
              <Link to={`${course.base}/modules/${module.id}`} className="hover:text-ink">{module.title}</Link>
              <span aria-hidden="true" className="text-faint">/</span>
              <span>{lesson.final ? "Module assessment" : `Lesson ${index + 1} of ${module.lessons.filter(l => !l.final).length}`}</span>
            </div>}
            <h1 className="text-xl sm:text-2xl font-semibold text-ink leading-tight">{lesson?.title ?? title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
            {lesson && <><span className="inline-flex items-center gap-1.5"><Icon name="clock" size={14} />{lesson.minutes} min</span><LevelBadge level={lesson.level} /></>}
            {done && <span className="badge bg-success-soft text-success"><Icon name="check" size={13} strokeWidth={2.25} />Completed</span>}
          </div>
        </div>
        <section className="border-t border-line bg-canvas/60 px-4 py-3 sm:px-5" aria-label="Scenario">
          <div className="flex items-start gap-2.5">
            <Icon name="target" size={16} className="text-accent mt-0.5 shrink-0" />
            <div className="min-w-0"><h2 className="text-xs font-semibold text-ink mb-1">Scenario</h2><div className="text-sm text-body leading-relaxed max-w-5xl">{brief}</div></div>
          </div>
          {hint && <div className="mt-2.5 sm:ml-[26px]">
            <button className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink" aria-expanded={showHint} onClick={() => setShowHint(!showHint)}><Icon name="lightbulb" size={14} />{showHint ? "Hide hint" : "Show a hint"}</button>
            {showHint && <div className="mt-2 rounded-md bg-warn-soft px-3.5 py-2.5 text-sm text-body">{hint}</div>}
          </div>}
        </section>
      </header>

      {children}

      {module && (
        <nav className="mt-10 pt-6 border-t border-line flex flex-wrap items-center justify-between gap-3" aria-label="Lesson navigation">
          {prev ? <Link to={prev.route} className="btn-ghost"><Icon name="arrowLeft" size={16} />{prev.title}</Link> : <Link to={`${course.base}/modules/${module.id}`} className="btn-ghost"><Icon name="arrowLeft" size={16} />{module.title}</Link>}
          {next
            ? nextLocked
              ? <span className="inline-flex items-center gap-2 text-sm text-faint"><Icon name="lock" size={15} />{next.title} unlocks when this module's lessons are complete</span>
              : <Link to={next.route} className={done ? "btn-primary" : "btn-secondary"}>Next: {next.title}<Icon name="arrowRight" size={16} /></Link>
            : <Link to={course.base} className={done ? "btn-primary" : "btn-secondary"}>Back to course overview<Icon name="arrowRight" size={16} /></Link>}
        </nav>
      )}
    </article>
  );
}
