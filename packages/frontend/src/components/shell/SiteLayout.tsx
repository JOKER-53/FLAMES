// Frame for pages outside a course: landing, account, and classroom.
import type { ReactNode } from "react";
import { AccountMenu, BrandMark } from "./CourseShell";

export function SiteLayout({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <header className="h-14 shrink-0 bg-surface border-b border-line">
        <div className={`mx-auto h-full flex items-center justify-between gap-4 px-4 lg:px-8 ${wide ? "max-w-[1280px]" : "max-w-[1120px]"}`}>
          <BrandMark />
          <AccountMenu />
        </div>
      </header>
      <main className="flex-1">
        <div className={`mx-auto px-4 lg:px-8 py-10 lg:py-14 ${wide ? "max-w-[1280px]" : "max-w-[1120px]"}`}>{children}</div>
      </main>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto max-w-[1120px] px-4 lg:px-8 py-5 flex flex-wrap justify-between gap-2 text-xs text-muted">
          <span>FLAMES Academy · Firewall training on simulated FortiOS and PAN-OS consoles. No live equipment is configured.</span>
          <span>Not affiliated with Fortinet or Palo Alto Networks.</span>
        </div>
      </footer>
    </div>
  );
}
