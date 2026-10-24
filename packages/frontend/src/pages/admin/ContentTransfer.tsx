import { useState } from "react";
import type { ContentDraft } from "@fortisim/engine";
import { apiFetch } from "../../api/http";

async function transfer(path: string, body?: unknown) {
  const response = await apiFetch(`/api/admin${path}`, body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Content transfer failed.");
  return data;
}
export function ContentTransfer({ moduleId, dirty, onImported }: { moduleId?: string; dirty: boolean; onImported: (draft: ContentDraft) => Promise<void> }) {
  const [file, setFile] = useState<unknown>(null);
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function read(input: HTMLInputElement) {
    const selected = input.files?.[0]; if (!selected) return;
    setFile(null); setPreview(null); setError(""); setNotice(""); setBusy(true);
    try {
      if (selected.size > 230000) throw new Error("Choose a module export smaller than 230 KB.");
      const value = JSON.parse(await selected.text());
      const checked = await transfer("/imports/preview", value); setFile(value); setPreview(checked);
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); input.value = ""; }
  }
  async function download() {
    setBusy(true); setError("");
    try {
      const data = await transfer(`/modules/${moduleId}/export`);
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `flames-${moduleId}.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("Export includes saved draft content and answer keys. Share it with authorized instructors only.");
    } catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  async function importDraft() {
    if (dirty && !window.confirm("Discard unsaved edits and open the imported draft?")) return;
    setBusy(true); setError("");
    try { await onImported(await transfer("/imports", file)); setPreview(null); setFile(null); setNotice("Imported as a private draft. Review it before publishing."); }
    catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  return <section className="card p-4 mb-6 space-y-3" aria-label="Content transfer">
    <div className="flex flex-wrap items-center gap-3"><h2 className="font-semibold mr-auto">Import / export</h2><label className={`btn-secondary btn-sm ${busy ? "opacity-50" : ""}`}>Preview import<input aria-label="Import module file" type="file" accept=".json,application/json" className="sr-only" disabled={busy} onChange={event => void read(event.currentTarget)} /></label><button className="btn-secondary btn-sm" disabled={!moduleId || busy || dirty} onClick={() => void download()}>Export saved module</button></div>
    <p className="text-xs text-muted">Versioned module files include answer keys. Imports receive new IDs and remain private until published. Save edits before exporting.</p>
    {preview && <div className="bg-sunken p-4 rounded-md space-y-2"><p className="font-medium">{preview.module.title}</p><p className="text-sm text-muted">{preview.lessonCount} lessons · {preview.taskCount} question tasks · {preview.module.vendor}</p><p className="text-sm">{preview.warning}</p><button className="btn-primary btn-sm" disabled={busy} onClick={() => void importDraft()}>Import private draft</button><button className="btn-ghost btn-sm ml-2" disabled={busy} onClick={() => { setPreview(null); setFile(null); }}>Cancel</button></div>}
    {notice && <p className="text-sm text-success" role="status">{notice}</p>}{error && <p className="text-sm text-danger" role="alert">{error}</p>}
  </section>;
}
