import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiFetch } from "../../api/http";
import { useCourseCatalog } from "../../course/CourseCatalog";
export function LearningVisibility() {
  const { refresh } = useCourseCatalog();
  const [visible, setVisible] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function settings(method = "GET", value?: boolean) {
    const response = await apiFetch("/api/admin/learning-settings", { method, ...(value === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ learningGuideVisible: value }) }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not update learning guide visibility.");
    if (typeof data.learningGuideVisible !== "boolean") throw new Error("Invalid learning guide settings response.");
    return data.learningGuideVisible as boolean;
  }
  useEffect(() => { let active = true; void settings().then(value => { if (active) setVisible(value); }).catch(error => { if (active) setError(error.message); }); return () => { active = false; }; }, []);
  async function toggle() {
    if (visible === null || saving) return;
    setSaving(true); setError(""); setNotice("");
    try { const next = await settings("PUT", !visible); setVisible(next); setNotice(next ? "Learning guide is now visible to students." : "Learning guide is now hidden from students."); await refresh(); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not save visibility."); }
    finally { setSaving(false); }
  }
  return <section aria-label="Learning guide visibility" className="card mb-6 p-5">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-semibold text-ink">Student learning guide</h2><p className="mt-1 text-sm text-muted">{visible === null ? "Loading visibility…" : visible ? "Visible to students in both courses." : "Hidden from students in both courses."} Administrators can still preview it.</p></div>
    <button type="button" className="btn-secondary" disabled={visible === null || saving} aria-pressed={visible === true} onClick={() => void toggle()}>{saving ? "Saving…" : visible ? "Hide learning guide" : "Show learning guide"}</button></div>
    <div className="mt-3 flex flex-wrap gap-4 text-sm"><Link className="text-accent underline underline-offset-4" to="/fortigate/learn">Preview FortiGate guide</Link><Link className="text-accent underline underline-offset-4" to="/paloalto/learn">Preview Palo Alto guide</Link></div>
    {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}{notice && <p role="status" className="mt-3 text-sm text-success">{notice}</p>}
  </section>;
}
