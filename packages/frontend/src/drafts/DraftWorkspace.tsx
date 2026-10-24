import { Icon } from "../components/ui/Icon";
import type { ReactNode } from "react";
import type { DraftControls } from "./useSimulatorDraft";
export function DraftBar({ draft }: { draft: DraftControls }) {
  const warning = ["error", "conflict", "outdated"].includes(draft.status);
  return <div className={`mb-3 flex flex-wrap items-center justify-between gap-2 text-xs ${warning ? "rounded-md border bg-warn-soft border-warn/30 text-warn px-3 py-2" : "px-1 text-muted"}`}>
    <span role="status" className="flex items-center gap-2 min-w-0"><Icon name={warning ? "alert" : draft.status === "saved" ? "checkCircle" : "clock"} size={14} className="shrink-0" />{draft.message}</span><div className="flex flex-wrap gap-2">
      {draft.status === "error" && <button className="btn-secondary btn-sm" onClick={draft.retry}>Retry saving</button>}
      {draft.status === "conflict" && <button className="btn-secondary btn-sm" onClick={draft.reload}>Reload saved version</button>}
      <button className="btn-ghost btn-sm h-8 text-xs" disabled={!draft.canReset} onClick={draft.reset}>Reset draft</button>
    </div>
  </div>;
}
export function DraftWorkspace({ draft, children }: { draft: DraftControls; children: ReactNode }) {
  return <><DraftBar draft={draft} /><fieldset disabled={!draft.ready} className="min-w-0 contents">{children}</fieldset></>;
}
