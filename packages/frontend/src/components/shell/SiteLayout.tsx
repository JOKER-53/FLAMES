// Frame for pages outside a course: landing, account, and classroom.
import type { ReactNode } from "react";
import { AccountMenu, BrandMark } from "./CourseShell";

export function SiteLayout({ children, wide = false, fullWidth = false }: { children: ReactNode; wide?: boolean; fullWidth?: boolean }) {
  const containerWidth = fullWidth ? "w-full" : wide ? "max-w-[1280px]" : "max-w-[1120px]";
  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="min-h-14 shrink-0 bg-surface border-b border-line">
        <div className={`mx-auto min-h-14 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 lg:px-8 py-2 ${containerWidth}`}>
          <BrandMark />
          <AccountMenu />
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="flex-1">
        <div className={`mx-auto px-4 lg:px-8 py-10 lg:py-14 ${containerWidth}`}>{children}</div>
      </main>
      <footer className="border-t border-line bg-surface">
        <div className={`mx-auto ${fullWidth ? "w-full" : "max-w-[1120px]"} px-4 lg:px-8 py-5 flex flex-wrap justify-between gap-2 text-xs text-muted`}>
          <span>FLAMES Academy · Firewall training on simulated FortiOS and PAN-OS consoles. No live equipment is configured.</span>
          <span>Not affiliated with Fortinet or Palo Alto Networks.</span>
        </div>
      </footer>
    </div>
  );
}
