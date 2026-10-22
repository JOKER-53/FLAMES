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
      <header className="mb-5">
        {module && lesson && (
          <div className="eyebrow mb-2 flex flex-wrap items-center gap-x-2">
            <Link to={`${course.base}/modules/${module.id}`} className="hover:text-ink">{module.title}</Link>
            <span className="text-faint">·</span>
            <span>{lesson.final ? "Module assessment" : `Lesson ${index + 1} of ${module.lessons.filter(l => !l.final).length}`}</span>
          </div>
        )}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold">{lesson?.title ?? title}</h1>
          {done && <span className="badge h-6 px-2 bg-success-soft text-success text-xs"><Icon name="check" size={13} strokeWidth={2.25} />Completed</span>}
        </div>
        {lesson && (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5"><Icon name="clock" size={14} className="text-faint" />{lesson.minutes} min</span>
            <LevelBadge level={lesson.level} />
          </div>
        )}
      </header>

      <section className="card mb-6 p-5 border-l-[3px] border-l-accent" aria-label="Scenario">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink mb-1.5"><Icon name="target" size={16} className="text-accent" />Scenario</div>
        <div className="text-body leading-relaxed max-w-4xl">{brief}</div>
        {hint && (
          <div className="mt-3">
            <button className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink" aria-expanded={showHint} onClick={() => setShowHint(!showHint)}>
              <Icon name="lightbulb" size={15} />{showHint ? "Hide hint" : "Show a hint"}
            </button>
            {showHint && <div className="mt-2 rounded-md bg-warn-soft px-3.5 py-2.5 text-sm text-body">{hint}</div>}
          </div>
        )}
      </section>

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
