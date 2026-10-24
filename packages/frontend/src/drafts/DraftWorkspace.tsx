import type { ReactNode } from "react";
import type { DraftControls } from "./useSimulatorDraft";
export function DraftBar({ draft }: { draft: DraftControls }) {
  const warning = ["error", "conflict", "outdated"].includes(draft.status);
  return <div className={`mb-5 rounded border px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm ${warning ? "bg-warn-soft border-warn/30 text-warn" : "bg-surface border-line text-muted"}`}>
    <span role="status">{draft.message}</span><div className="flex flex-wrap gap-2">
      {draft.status === "error" && <button className="btn-secondary btn-sm" onClick={draft.retry}>Retry saving</button>}
      {draft.status === "conflict" && <button className="btn-secondary btn-sm" onClick={draft.reload}>Reload saved version</button>}
      <button className="btn-ghost btn-sm" disabled={!draft.canReset} onClick={draft.reset}>Reset draft</button>
    </div>
  </div>;
}
export function DraftWorkspace({ draft, children }: { draft: DraftControls; children: ReactNode }) {
  return <><DraftBar draft={draft} /><fieldset disabled={!draft.ready} className="min-w-0 contents">{children}</fieldset></>;
}
