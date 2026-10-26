import { StagedHints } from "./StagedHints";
import { useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { Icon } from "../ui/Icon";
import { TutorSourceTag, type TutorSource } from "../TutorSourceTag";
import { useCourse } from "../shell/CourseShell";

/**
 * Marks the interactive workspace as the simulated vendor console, so it is
 * visually distinct from the course material around it.
 */
export function ConsoleFrame({ path, actions, children, className = "" }: { path: string[]; actions?: ReactNode; children: ReactNode; className?: string }) {
  const { course } = useCourse();
  return (
    <section className={`rounded-lg border border-line-strong bg-surface shadow-card overflow-hidden ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 min-h-11 py-1.5 bg-[#1f2633] text-white/90">
        <div className="flex items-center gap-2 text-xs min-w-0">
          <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
          <span className="font-semibold">{course.product}</span>
          {path.map(part => (
            <span key={part} className="flex items-center gap-2 text-white/60 truncate"><Icon name="chevronRight" size={12} />{part}</span>
          ))}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export interface CheckRow { label: ReactNode; passed: boolean; detail?: ReactNode; }

interface CheckYourWorkProps {
  onSubmit: () => void;
  grading?: boolean;
  error?: string | null;
  result?: { passed: boolean; checks: CheckRow[] } | null;
  tutor?: { text: string | null; source?: TutorSource | null; loading?: boolean };
  /** Extra explanation under the heading. */
  note?: ReactNode;
  hintTopic?: string;
}

export function CheckYourWork({ onSubmit, grading, error, result, tutor, note, hintTopic }: CheckYourWorkProps) {
  const location = useLocation();
  const failures = result?.checks.filter(check => !check.passed).map(check => typeof check.label === "string" ? check.label : "Configuration check") ?? [];
  const passedCount = result?.checks.filter(c => c.passed).length ?? 0;
  const total = result?.checks.length ?? 0;
  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold">Check your work</h2>
          <p className="text-sm text-muted mt-0.5">{note ?? "Your configuration is graded against every requirement in the scenario."}</p>
        </div>
        <button onClick={onSubmit} disabled={grading} className="btn-primary">
          {grading ? "Checking…" : result ? "Check again" : "Check my work"}
        </button>
      </div>

      {error && <div className="mx-5 mb-4 rounded-md bg-danger-soft px-3.5 py-2.5 text-sm text-danger" role="alert">{error}</div>}

      {result && (
        <div className="border-t border-line" aria-live="polite">
          <div className={`flex items-center gap-3 px-5 py-3.5 ${result.passed ? "bg-success-soft" : "bg-sunken"}`}>
            <Icon name={result.passed ? "checkCircle" : "info"} size={20} className={result.passed ? "text-success" : "text-muted"} />
            <div className="flex-1">
              <div className={`font-semibold ${result.passed ? "text-success" : "text-ink"}`}>
                {result.passed ? "Lesson complete" : "Not quite yet"}
              </div>
              <div className="text-sm text-muted">{passedCount} of {total} checks passed{result.passed ? "." : ". Fix the failing checks and try again."}</div>
            </div>
            <span className="text-lg font-semibold tabular-nums text-ink">{passedCount}/{total}</span>
          </div>
          <ul className="divide-y divide-line">
            {result.checks.map((check, i) => (
              <li key={i} className="flex items-start gap-3 px-5 py-2.5 text-sm">
                <Icon name={check.passed ? "check" : "x"} size={16} strokeWidth={2.25} className={`mt-0.5 shrink-0 ${check.passed ? "text-success" : "text-danger"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-body">{check.label}</div>
                  {check.detail && <div className="text-xs text-muted mt-0.5">{check.detail}</div>}
                </div>
                <span className={`text-2xs font-semibold uppercase tracking-wide ${check.passed ? "text-success" : "text-danger"}`}>{check.passed ? "Pass" : "Fail"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result && !result.passed && <StagedHints key={location.pathname + location.search + JSON.stringify(result.checks)} topic={hintTopic ?? location.pathname} failures={failures} />}
      {tutor && (tutor.loading || tutor.text) && (
        <div className="border-t border-line px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink mb-1.5">
            <Icon name="message" size={16} className="text-accent" />Tutor
            <TutorSourceTag source={tutor.loading ? null : tutor.source} />
          </div>
          {tutor.loading
            ? <p className="text-sm text-muted">Reviewing your configuration…</p>
            : <p className="text-sm text-body leading-relaxed">{tutor.text}</p>}
        </div>
      )}
    </section>
  );
}
