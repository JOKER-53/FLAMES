// ============================================================================
// The persistent FortiOS chrome: top bar + collapsible left sidebar nav,
// wrapping whatever page is active.
// ============================================================================

import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { NAV_STRUCTURE, NavItem } from "./navConfig";
import { ICONS } from "./icons";

interface AppShellProps {
  children: ReactNode;
}

function isActive(pathname: string, item: NavItem): boolean {
  if (item.path === "/") return pathname === "/";
  return pathname === item.path || pathname.startsWith(item.path + "/");
}

function findBreadcrumb(pathname: string): string[] {
  for (const item of NAV_STRUCTURE) {
    if (item.children) {
      const child = item.children.find((c) => pathname === c.path);
      if (child) return [item.label, child.label];
    }
    if (pathname === item.path) return [item.label];
  }
  return ["FortiSim"];
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const breadcrumb = findBreadcrumb(location.pathname);

  return (
    <div className="flex h-screen w-screen bg-forti-panel text-[13px] text-gray-800">
      <aside className="w-60 bg-forti-sidebar text-gray-200 flex flex-col shrink-0">
        <div className="flex items-center gap-2 px-4 py-3.5 border-b border-white/10">
          <div className="w-6 h-6 rounded-sm bg-forti-red flex items-center justify-center text-white font-bold text-[11px]">
            F
          </div>
          <div className="leading-tight">
            <div className="text-white font-semibold text-[13px]">FortiSim</div>
            <div className="text-[11px] text-gray-400">FortiGate-600F</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-1">
          {NAV_STRUCTURE.map((item) => {
            const Icon = ICONS[item.icon];
            const active = isActive(location.pathname, item);
            const hasChildren = !!item.children;
            const open = expanded[item.path] ?? active;

            const rowClasses = [
              "flex items-center gap-2.5 px-4 py-2 cursor-pointer transition-colors select-none",
              active && !hasChildren ? "bg-forti-red/90 text-white" : "text-gray-300 hover:bg-white/10 hover:text-white",
            ].join(" ");

            const content = (
              <>
                {Icon && <Icon className="w-[15px] h-[15px] shrink-0" />}
                <span className="flex-1 truncate">{item.label}</span>
                {hasChildren && (
                  <svg
                    viewBox="0 0 12 12"
                    className={`w-3 h-3 stroke-current fill-none transition-transform ${open ? "rotate-90" : ""}`}
                    strokeWidth={1.6}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setExpanded((s) => ({ ...s, [item.path]: !open }));
                    }}
                  >
                    <path d="M4 2.5 8 6l-4 3.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </>
            );

            return (
              <div key={item.path}>
                <Link
                  to={item.path}
                  className={rowClasses}
                  onClick={() => setExpanded((s) => ({ ...s, [item.path]: true }))}
                >
                  {content}
                </Link>

                {hasChildren && open && (
                  <div className="pb-1">
                    {item.children!.map((child) => {
                      const childActive = location.pathname === child.path;
                      return (
                        <Link
                          key={child.path}
                          to={child.path}
                          className={[
                            "flex items-center gap-2 pl-[42px] pr-4 py-1.5 transition-colors",
                            childActive
                              ? "bg-forti-red/90 text-white"
                              : "text-gray-400 hover:bg-white/10 hover:text-white",
                          ].join(" ")}
                        >
                          <span className="truncate">{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="px-4 py-2.5 border-t border-white/10 text-[11px] text-gray-500 leading-relaxed">
          <a href="/" className="block mb-2 px-2 py-1 text-center rounded border border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20 transition-colors" style={{textDecoration:"none",fontSize:10}}>
            ← Switch Platform
          </a>
          <div>FortiOS v7.6 (Simulated)</div>
          <div>Training Mode — No Live Traffic</div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-11 bg-white border-b border-gray-200 flex items-center px-4 justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-gray-500">
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-gray-300">/</span>}
                <span className={i === breadcrumb.length - 1 ? "text-gray-800 font-medium" : ""}>
                  {crumb}
                </span>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-4 text-gray-500">
            <span className="text-[12px]">Student View</span>
            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-[11px] font-medium">
              ST
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5">{children}</main>
      </div>
    </div>
  );
}
