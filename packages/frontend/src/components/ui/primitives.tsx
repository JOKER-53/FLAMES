import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="mt-1.5 text-muted leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}

export function ProgressBar({ value, label, className = "" }: { value: number; label?: string; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={`h-1.5 w-full rounded-full bg-sunken overflow-hidden ${className}`}
      role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}
    >
      <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

const CALLOUT = {
  info: { icon: "info", box: "bg-info-soft border-info/20", title: "text-info" },
  tip: { icon: "lightbulb", box: "bg-warn-soft border-warn/20", title: "text-warn" },
  success: { icon: "checkCircle", box: "bg-success-soft border-success/20", title: "text-success" },
  danger: { icon: "alert", box: "bg-danger-soft border-danger/20", title: "text-danger" },
} as const satisfies Record<string, { icon: IconName; box: string; title: string }>;

export function Callout({ tone = "info", title, children, className = "" }: { tone?: keyof typeof CALLOUT; title?: ReactNode; children: ReactNode; className?: string }) {
  const style = CALLOUT[tone];
  return (
    <div className={`flex gap-3 rounded-md border px-4 py-3 text-sm ${style.box} ${className}`} role={tone === "danger" ? "alert" : undefined}>
      <Icon name={style.icon} size={16} className={`mt-0.5 shrink-0 ${style.title}`} />
      <div className="min-w-0 text-body leading-relaxed">
        {title && <div className={`font-semibold mb-0.5 ${style.title}`}>{title}</div>}
        {children}
      </div>
    </div>
  );
}

export type LessonStatus = "done" | "current" | "todo" | "locked";

export function StatusIcon({ status, size = 18 }: { status: LessonStatus; size?: number }) {
  if (status === "done") return <Icon name="checkCircle" size={size} className="text-success shrink-0" title="Completed" />;
  if (status === "locked") return <Icon name="lock" size={size - 2} className="text-faint shrink-0" title="Locked" />;
  if (status === "current") return <Icon name="circleDot" size={size} className="text-accent shrink-0" title="In progress" />;
  return <Icon name="circle" size={size} className="text-line-strong shrink-0" title="Not started" />;
}

export function Section({ title, description, actions, children, className = "", bodyClassName = "p-5" }: { title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
          <div className="min-w-0 flex-1 basis-56">
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
