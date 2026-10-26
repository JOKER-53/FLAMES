import { useLearningAccess } from "../../course/useLearningAccess";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import { ThemeToggle } from "../ThemeToggle";
// ============================================================================
// Learning-platform frame shared by both vendors: course outline on the left,
// breadcrumb and account on top, lesson content in the middle. Lesson
// workspaces inside keep their vendor-console styling.
// ============================================================================
import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Icon } from "../ui/Icon";
import { ProgressBar, StatusIcon } from "../ui/primitives";
import { useAccount } from "../../hooks/useAccount";
import { courseProgress, lessonStatus, moduleProgress, type Course, type Lesson, type Module } from "../../course/curriculum";

const CourseContext = createContext<{ course: Course; completed: Set<string> } | null>(null);
/** The course and progress of the surrounding CourseShell. */
export function useCourse() {
  const value = useContext(CourseContext);
  if (!value) throw new Error("useCourse must be used inside CourseShell");
  return value;
}

/** Lesson whose route (path and query) matches the current location. */
export function lessonForLocation(course: Course, pathname: string, search: string): { module: Module; lesson: Lesson } | null {
  const params = new URLSearchParams(search);
  for (const module of course.modules) {
    for (const lesson of module.lessons) {
      const url = new URL(lesson.route, "http://x");
      if (url.pathname !== pathname) continue;
      if ([...url.searchParams].every(([key, value]) => key === "track" || params.get(key) === value)) return { module, lesson };
    }
  }
  return null;
}

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 ${className}`} aria-label="FLAMES home">
      <span className="grid place-items-center w-7 h-7 rounded-md bg-ink text-white">
        <Icon name="shield" size={15} strokeWidth={2} />
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-ink">FLAMES</span>
      <span className="hidden sm:inline text-2xs font-medium text-muted border border-line rounded px-1.5 py-px">Academy</span>
    </Link>
  );
}

export function AccountMenu() {
  return <div className="flex max-w-full flex-wrap items-center justify-end gap-2"><NavLink to="/credits" className={({ isActive }) => `btn-secondary btn-sm shrink-0 ${isActive ? "bg-sunken font-semibold" : ""}`}>Credits</NavLink><ThemeToggle /><AccountActions /></div>;
}

function AccountActions() {
  const { user, integration } = useAccount();
  if (integration?.mode === "academy") return <div className="flex items-center gap-2">{user && <Link to="/classroom" className="btn-ghost btn-sm">{user.role === "instructor" ? "Classroom" : "Assignments"}</Link>}{user?.canManageContent && <Link to="/admin" className="btn-ghost btn-sm">Admin</Link>}<span className="hidden md:block text-sm text-muted">{user?.name || "Academy lab"}</span><a className="btn-secondary btn-sm" href={integration.parentUrl ?? "/"} target="_top">Back to Academy</a></div>;
  if (!user) return <Link to="/account" className="btn-secondary btn-sm"><span className="sm:hidden">Sign in</span><span className="hidden sm:inline">Sign in to save progress</span></Link>;
  const initials = user.name.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-2">
      {user.role === "instructor" && <Link to="/admin" className="btn-ghost btn-sm">Admin</Link>}
      <Link to="/classroom" aria-label={user.role === "instructor" ? "Classroom" : "Assignments"} className="btn-ghost btn-sm"><Icon name="users" size={15} /><span className="hidden sm:inline">{user.role === "instructor" ? "Classroom" : "Assignments"}</span></Link>
      <Link to="/account" className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-sunken" title={`Signed in as ${user.email}`}>
        <span className="grid place-items-center w-7 h-7 rounded-full bg-sunken text-2xs font-semibold text-ink">{initials}</span>
        <span className="hidden md:block text-sm font-medium text-ink max-w-[140px] truncate">{user.name}</span>
      </Link>
    </div>
  );
}

function Sidebar({ course, done, current, onNavigate }: { course: Course; done: Set<string>; current: { module: Module; lesson: Lesson } | null; onNavigate: () => void }) {
  const { canView: canViewLearning } = useLearningAccess();
  const location = useLocation();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const progress = courseProgress(course, done);
  const isOpen = (module: Module) => open[module.id] ?? (current?.module.id === module.id || location.pathname === `${course.base}/modules/${module.id}`);

  return (
    <nav aria-label={`${course.product} course`} className="flex flex-col h-full" onClick={event => { if ((event.target as HTMLElement).closest("a")) onNavigate(); }}>
      <div className="px-4 pt-4 pb-3 border-b border-line">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.08em] text-accent">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />{course.product}
            </div>
            <div className="mt-1 text-sm font-semibold text-ink leading-snug">{course.name}</div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <ProgressBar value={progress.pct} label="Course progress" />
          <span className="text-2xs tabular-nums text-muted shrink-0">{progress.completed}/{progress.total}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        <NavLink end to={course.base} className={({ isActive }) => `flex items-center gap-2.5 px-2.5 h-9 rounded-md text-sm ${isActive ? "bg-sunken text-ink font-medium" : "text-body hover:bg-sunken hover:text-ink"}`}>
          <Icon name="home" size={16} />Course overview
        </NavLink>

        <div className="eyebrow px-2.5 mt-5 mb-1.5">Modules</div>
        {course.modules.map(module => {
          const mp = moduleProgress(module, done);
          const expanded = isOpen(module);
          return (
            <div key={module.id} className="mb-0.5">
              <div className="flex items-center">
                <NavLink to={`${course.base}/modules/${module.id}`} className={({ isActive }) => `flex-1 min-w-0 flex items-center gap-2.5 pl-2.5 pr-1 h-9 rounded-md text-sm ${isActive || current?.module.id === module.id ? "text-ink font-medium" : "text-body hover:text-ink"} hover:bg-sunken`}>
                  <Icon name={module.icon} size={16} className="shrink-0" />
                  <span className="flex-1 truncate">{module.title}</span>
                  <span className={`text-2xs tabular-nums ${mp.completed === mp.total ? "text-success" : "text-faint"}`}>{mp.completed}/{mp.total}</span>
                </NavLink>
                <button aria-label={`${expanded ? "Collapse" : "Expand"} ${module.title}`} aria-expanded={expanded} onClick={() => setOpen(state => ({ ...state, [module.id]: !expanded }))} className="grid place-items-center w-7 h-9 rounded-md text-faint hover:text-ink hover:bg-sunken">
                  <Icon name="chevronDown" size={14} className={`transition-transform ${expanded ? "" : "-rotate-90"}`} />
                </button>
              </div>
              {expanded && (
                <ol className="ml-[18px] pl-3 border-l border-line my-1">
                  {module.lessons.map(lesson => {
                    const status = lessonStatus(module, lesson, done, current?.lesson.id);
                    const active = current?.lesson.id === lesson.id;
                    const row = `flex items-center gap-2 pl-2 pr-2 py-1.5 rounded-md text-xs leading-snug ${active ? "bg-accent-soft text-ink font-medium" : status === "locked" ? "text-faint" : "text-body hover:bg-sunken hover:text-ink"}`;
                    return (
                      <li key={lesson.id}>
                        {status === "locked"
                          ? <span className={row} title="Complete the other lessons in this module to unlock the assessment"><StatusIcon status="locked" size={15} /><span className="truncate">{lesson.title}</span></span>
                          : <Link to={lesson.route} className={row} aria-current={active ? "page" : undefined}><StatusIcon status={status} size={15} /><span className="truncate">{lesson.title}</span></Link>}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          );
        })}

        <div className="eyebrow px-2.5 mt-5 mb-1.5">Reference</div>
        {course.reference.filter(item => !item.path.endsWith("/learn") || canViewLearning).map(item => (
          <NavLink key={item.path} to={item.path} className={({ isActive }) => `flex items-center gap-2.5 px-2.5 h-9 rounded-md text-sm ${isActive ? "bg-sunken text-ink font-medium" : "text-body hover:bg-sunken hover:text-ink"}`}>
            <Icon name={item.icon} size={16} />{item.label}
          </NavLink>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-line text-2xs text-muted leading-relaxed">
        <Link to="/" className="flex items-center gap-1.5 text-xs font-medium text-body hover:text-ink mb-1.5"><Icon name="arrowLeft" size={14} />All courses</Link>
        <p>Simulated {course.os} · no live traffic</p>
      </div>
    </nav>
  );
}

export function CourseShell({ course, completed, children }: { course: Course; completed: Set<string>; children: ReactNode }) {
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const drawerRef=useRef<HTMLElement>(null);
  const closeDrawer=useCallback(()=>setDrawer(false),[]);
  useDialogFocus(drawer,drawerRef,closeDrawer);
  const current = lessonForLocation(course, location.pathname, location.search);
  const moduleFromPath = course.modules.find(m => location.pathname === `${course.base}/modules/${m.id}`);
  const reference = course.reference.find(r => r.path === location.pathname);
  const crumbs: { label: string; to?: string }[] = [{ label: course.product, to: course.base }];
  if (current) crumbs.push({ label: current.module.title, to: `${course.base}/modules/${current.module.id}` }, { label: current.lesson.title });
  else if (moduleFromPath) crumbs.push({ label: moduleFromPath.title });
  else if (reference) crumbs.push({ label: reference.label });

  useEffect(() => { setDrawer(false); }, [location.pathname, location.search]);
  useEffect(() => {
    document.title = current ? `${current.lesson.title} · ${course.product} · FLAMES` : `${course.product} · FLAMES`;
  }, [current, course.product]);

  return (
    <CourseContext.Provider value={{ course, completed }}>
    <a href="#main-content" className="skip-link">Skip to content</a>
    <div data-vendor={course.vendor} className="flex h-screen bg-canvas text-base">
      <aside className="hidden lg:flex w-[272px] shrink-0 flex-col bg-surface border-r border-line">
        <div className="h-14 shrink-0 flex items-center px-4 border-b border-line"><BrandMark /></div>
        <Sidebar course={course} done={completed} current={current} onNavigate={() => undefined} />
      </aside>

      {drawer && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setDrawer(false)} />
          <aside ref={drawerRef} role="dialog" aria-modal="true" aria-label="Course navigation" tabIndex={-1} className="relative w-[300px] max-w-[85vw] flex flex-col bg-surface shadow-raised">
            <div className="h-14 flex items-center justify-between px-4 border-b border-line">
              <BrandMark />
              <button className="btn-ghost w-9 px-0" aria-label="Close navigation" onClick={() => setDrawer(false)}><Icon name="x" size={18} /></button>
            </div>
            <Sidebar course={course} done={completed} current={current} onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div data-course-content className="flex-1 min-w-0 flex flex-col">
        <header className="min-h-14 shrink-0 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 lg:px-6 py-2 bg-surface border-b border-line">
          <div className="flex items-center gap-2 min-w-0">
            <button className="lg:hidden btn-ghost w-9 px-0" aria-label="Open navigation" aria-expanded={drawer} onClick={() => setDrawer(true)}><Icon name="menu" size={18} /></button>
            <ol className="flex items-center gap-1.5 text-sm min-w-0" aria-label="Breadcrumb">
              {crumbs.map((crumb, i) => (
                <li key={i} className={`flex items-center gap-1.5 min-w-0 ${i < crumbs.length - 1 ? "hidden sm:flex" : ""}`}>
                  {i > 0 && <Icon name="chevronRight" size={14} className="hidden sm:block text-faint shrink-0" />}
                  {crumb.to && i < crumbs.length - 1
                    ? <Link to={crumb.to} className="text-muted hover:text-ink truncate">{crumb.label}</Link>
                    : <span className="text-ink font-medium truncate" aria-current="page">{crumb.label}</span>}
                </li>
              ))}
            </ol>
          </div>
          <AccountMenu />
        </header>
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto">
          <div className={location.pathname === `${course.base}/hardware`
            ? "mx-auto w-full px-4 lg:px-6 py-4"
            : current ? "w-full px-4 lg:px-6 py-5 lg:py-6" : "w-full px-4 lg:px-6 py-6 lg:py-8"}>{children}</div>
        </main>
      </div>
    </div>
    </CourseContext.Provider>
  );
}
