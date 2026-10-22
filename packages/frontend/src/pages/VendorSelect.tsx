import { Link } from "react-router-dom";
import { SiteLayout } from "../components/shell/SiteLayout";
import { Icon, type IconName } from "../components/ui/Icon";
import { ProgressBar } from "../components/ui/primitives";
import { useProgress } from "../hooks/useProgress";
import { allLessons, courseMinutes, courseProgress, nextLesson, COURSES, type Course } from "../course/curriculum";

const hours = (course: Course) => `${Math.round(courseMinutes(course) / 60)} hours`;

function CourseCard({ course }: { course: Course }) {
  const { completedTaskIds } = useProgress(course.vendor);
  const progress = courseProgress(course, completedTaskIds);
  const next = nextLesson(course, completedTaskIds);
  const started = progress.completed > 0;
  return (
    <article data-vendor={course.vendor} className="card flex flex-col overflow-hidden">
      <div className="h-1 bg-accent" />
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-accent">{course.vendor === "fortigate" ? "Fortinet" : "Palo Alto Networks"}</span>
          <span className="text-xs text-muted">{course.os} · {course.product}</span>
        </div>
        <h2 className="mt-3 text-xl font-semibold">{course.name}</h2>
        <ul className="mt-4 space-y-2 text-sm text-body">
          {course.modules.map(module => (
            <li key={module.id} className="flex items-center gap-2.5">
              <Icon name={module.icon} size={16} className="text-muted shrink-0" />
              <span className="flex-1">{module.title}</span>
              <span className="text-xs text-faint tabular-nums">{module.lessons.length} lessons</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span>{allLessons(course).length} lessons</span><span>About {hours(course)}</span><span>Graded labs</span>
        </div>
        <div className="mt-auto pt-6">
          {started && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-muted mb-1.5"><span>{progress.completed} of {progress.total} complete</span><span className="tabular-nums">{Math.round(progress.pct)}%</span></div>
              <ProgressBar value={progress.pct} label={`${course.product} progress`} />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Link to={started && next ? next.lesson.route : course.base} className="btn-primary">
              {started ? (next ? "Continue" : "Review course") : "Start course"}<Icon name="arrowRight" size={16} />
            </Link>
            <Link to={course.base} className="btn-ghost">View syllabus</Link>
          </div>
        </div>
      </div>
    </article>
  );
}

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: "target", title: "Read the scenario", text: "Each lesson describes a small network and what it needs, the way a ticket would." },
  { icon: "grid", title: "Configure the console", text: "Build policies, zones, NAT, interfaces, and cabling in a simulated FortiOS or PAN-OS console." },
  { icon: "checkCircle", title: "Check your work", text: "Every requirement is graded instantly, with tutor hints that explain the concept without giving away answers." },
];

export function VendorSelect() {
  return (
    <SiteLayout>
      <section className="max-w-2xl">
        <div className="eyebrow">Firewall training</div>
        <h1 className="mt-3 text-3xl sm:text-4xl font-semibold leading-tight">Learn firewall administration by configuring one.</h1>
        <p className="mt-4 text-lg text-muted leading-relaxed">
          Two hands-on courses on simulated FortiGate and Palo Alto firewalls. Work through graded lessons at your own pace; sign in to keep your progress across devices.
        </p>
      </section>

      <section className="mt-10 grid gap-5 md:grid-cols-2" aria-label="Courses">
        <CourseCard course={COURSES.fortigate} />
        <CourseCard course={COURSES.paloalto} />
      </section>

      <section className="mt-14" aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="text-lg font-semibold">How lessons work</h2>
        <ol className="mt-5 grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <div className="flex items-center gap-3">
                <span className="grid place-items-center w-9 h-9 rounded-lg bg-surface border border-line text-ink"><Icon name={step.icon} size={18} /></span>
                <span className="text-xs font-medium text-muted">Step {i + 1}</span>
              </div>
              <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted leading-relaxed">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </SiteLayout>
  );
}
