import { Link, Navigate, useParams } from "react-router-dom";
import { Icon } from "../../components/ui/Icon";
import { PageHeader, ProgressBar, StatusIcon } from "../../components/ui/primitives";
import { allLessons, courseMinutes, courseProgress, lessonStatus, moduleProgress, nextLesson, type Course, type Level } from "../../course/curriculum";

const formatMinutes = (minutes: number) => minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60 ? `${minutes % 60} min` : ""}`.trim() : `${minutes} min`;

const LEVEL_STYLE: Record<Level, string> = {
  Foundation: "bg-success-soft text-success",
  Intermediate: "bg-info-soft text-info",
  Advanced: "bg-warn-soft text-warn",
};
export function LevelBadge({ level }: { level: Level }) {
  return <span className={`badge ${LEVEL_STYLE[level]}`}>{level}</span>;
}

function Meta({ icon, children }: { icon: Parameters<typeof Icon>[0]["name"]; children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1.5"><Icon name={icon} size={14} className="text-faint" />{children}</span>;
}

export function CourseOverviewPage({ course, completed }: { course: Course; completed: Set<string> }) {
  const progress = courseProgress(course, completed);
  const next = nextLesson(course, completed);
  const started = progress.completed > 0;

  return (
    <>
      <PageHeader
        eyebrow={`${course.product} · ${course.os}`}
        title={course.name}
        description="Hands-on lessons on a simulated firewall. Each lesson gives you a scenario, a console to configure, and instant grading with tutor hints."
      />
      <div className="flex flex-wrap gap-x-5 gap-y-1 -mt-3 mb-7 text-sm text-muted">
        <Meta icon="grid">{course.modules.length} modules</Meta>
        <Meta icon="book">{allLessons(course).length} lessons</Meta>
        <Meta icon="clock">About {formatMinutes(courseMinutes(course))}</Meta>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px] mb-10">
        <section className="card p-6 flex flex-col justify-between gap-6 border-l-[3px] border-l-accent">
          {next ? (
            <>
              <div>
                <div className="eyebrow">{started ? "Continue where you left off" : "Start here"}</div>
                <div className="mt-3 text-sm text-muted">{next.module.title}</div>
                <h2 className="mt-0.5 text-xl font-semibold">{next.lesson.title}</h2>
                <p className="mt-1.5 text-body max-w-xl">{next.lesson.summary}</p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Link to={next.lesson.route} className="btn-primary">
                  {started ? "Continue lesson" : "Start first lesson"}<Icon name="arrowRight" size={16} />
                </Link>
                <span className="flex items-center gap-3 text-sm text-muted">
                  <Meta icon="clock">{next.lesson.minutes} min</Meta><LevelBadge level={next.lesson.level} />
                </span>
              </div>
            </>
          ) : (
            <div>
              <div className="eyebrow text-success">Course complete</div>
              <h2 className="mt-3 text-xl font-semibold">You have finished every lesson.</h2>
              <p className="mt-1.5 text-body">Revisit any assessment to practise, or try the other vendor's course to compare the platforms.</p>
              <div className="mt-5 flex flex-wrap gap-3"><Link to="/certificates" className="btn-primary">View completion certificate</Link><Link to="/" className="btn-secondary">Browse courses</Link></div>
            </div>
          )}
        </section>

        <section className="card p-6">
          <div className="eyebrow">Your progress</div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-4xl font-semibold text-ink tabular-nums">{Math.round(progress.pct)}</span>
            <span className="text-lg text-muted">%</span>
          </div>
          <ProgressBar value={progress.pct} label="Course progress" className="mt-3" />
          <p className="mt-3 text-sm text-muted">{progress.completed} of {progress.total} lessons complete</p>
          <dl className="mt-4 pt-4 border-t border-line space-y-2 text-sm">
            {course.modules.map(module => {
              const mp = moduleProgress(module, completed);
              return (
                <div key={module.id} className="flex justify-between gap-3">
                  <dt className="text-body truncate">{module.title}</dt>
                  <dd className={`tabular-nums ${mp.completed === mp.total ? "text-success font-medium" : "text-muted"}`}>{mp.completed}/{mp.total}</dd>
                </div>
              );
            })}
          </dl>
        </section>
      </div>

      <h2 className="text-lg font-semibold mb-4">Modules</h2>
      <ol className="grid gap-3">
        {course.modules.map((module, index) => {
          const mp = moduleProgress(module, completed);
          const minutes = module.lessons.reduce((n, l) => n + l.minutes, 0);
          return (
            <li key={module.id}>
              <Link to={`${course.base}/modules/${module.id}`} className="card group flex flex-col sm:flex-row sm:items-center gap-4 p-5 hover:border-line-strong hover:shadow-raised transition-shadow">
                <span className="grid place-items-center w-11 h-11 rounded-lg bg-accent-soft text-accent shrink-0"><Icon name={module.icon} size={20} /></span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted">Module {index + 1}</div>
                  <h3 className="text-base font-semibold group-hover:text-accent">{module.title}</h3>
                  <p className="text-sm text-muted mt-0.5">{module.summary}</p>
                </div>
                <div className="sm:w-56 shrink-0">
                  <div className="flex justify-between text-xs text-muted mb-1.5">
                    <span>{module.lessons.length} lessons · {formatMinutes(minutes)}</span>
                    <span className="tabular-nums">{mp.completed}/{mp.total}</span>
                  </div>
                  <ProgressBar value={mp.pct} label={`${module.title} progress`} />
                </div>
                <Icon name="chevronRight" size={18} className="hidden sm:block text-faint group-hover:text-ink" />
              </Link>
            </li>
          );
        })}
      </ol>
    </>
  );
}

export function ModulePage({ course, completed }: { course: Course; completed: Set<string> }) {
  const { moduleId } = useParams();
  const index = course.modules.findIndex(m => m.id === moduleId);
  if (index < 0) return <Navigate to={course.base} replace />;
  const module = course.modules[index];
  const mp = moduleProgress(module, completed);
  const firstOpen = module.lessons.find(l => lessonStatus(module, l, completed) === "todo");

  return (
    <>
      <header className="mb-7 flex flex-wrap items-center justify-between gap-5">
        <div className="min-w-0">
          <p className="text-xs text-muted mb-2">Module {index + 1} of {course.modules.length}</p>
          <h1 className="text-2xl sm:text-[28px] font-semibold leading-tight tracking-tight">{module.title}</h1>
          <p className="mt-3 max-w-[80ch] text-sm text-muted leading-relaxed">{module.summary}</p>
        </div>
        {firstOpen && <Link to={firstOpen.route} className="btn-primary shrink-0">{mp.completed ? "Continue" : "Start module"}<Icon name="arrowRight" size={16} /></Link>}
      </header>
      <div className="card p-5 mb-7 flex flex-wrap sm:flex-nowrap items-center gap-4">
        <ProgressBar value={mp.pct} label={`${module.title} progress`} className="flex-1 min-w-[100px]" />
        <span className="text-sm text-muted shrink-0 tabular-nums">{mp.completed} of {mp.total} complete</span>
      </div>

      <ol className="space-y-3" aria-label="Module lessons">
        {module.lessons.map((lesson, i) => {
          const status = lessonStatus(module, lesson, completed);
          const locked = status === "locked";
          const body = (
            <>
              <span className="w-6 text-sm tabular-nums text-faint text-right shrink-0">{lesson.final ? <Icon name="flag" size={16} className="inline text-muted" /> : i + 1}</span>
              <StatusIcon status={status} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`font-medium ${locked ? "text-muted" : "text-ink group-hover:text-accent"}`}>{lesson.title}</span>
                  {lesson.final && <span className="badge bg-sunken text-body">Assessment</span>}
                </div>
                <p className="text-sm text-muted mt-1.5 leading-relaxed">{locked ? "Complete the other lessons in this module to unlock." : lesson.summary}</p>
              </div>
              <div className="hidden md:flex items-center gap-3 text-sm text-muted shrink-0">
                <LevelBadge level={lesson.level} />
                <span className="w-14 text-right tabular-nums">{lesson.minutes} min</span>
              </div>
              <span className={`hidden sm:inline-flex w-24 justify-end text-sm font-medium shrink-0 ${locked ? "text-faint" : status === "done" ? "text-muted" : "text-accent"}`}>
                {locked ? "Locked" : status === "done" ? "Review" : "Start"}
              </span>
            </>
          );
          return (
            <li key={lesson.id} className="card overflow-hidden">
              {locked
                ? <div className="flex items-start sm:items-center gap-3 sm:gap-5 px-4 sm:px-6 py-5">{body}</div>
                : <Link to={lesson.route} className="group flex items-start sm:items-center gap-3 sm:gap-5 px-4 sm:px-6 py-5 hover:bg-sunken/60">{body}</Link>}
            </li>
          );
        })}
      </ol>
    </>
  );
}
