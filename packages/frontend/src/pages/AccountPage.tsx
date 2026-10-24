import { useCourseCatalog } from "../course/CourseCatalog";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { accountRequest, useAccount } from "../hooks/useAccount";
import { SiteLayout } from "../components/shell/SiteLayout";
import { Callout, ProgressBar } from "../components/ui/primitives";
import { allLessons, type Vendor } from "../course/curriculum";

export function AccountPage() {
  const { courses: COURSES } = useCourseCatalog();
  const { integration, user, loading, registrationEnabled, authRequired, error: serviceError, refresh, logout } = useAccount();
  const navigate = useNavigate();
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<Vendor, number> | null>(null);
  const [progressRetry, setProgressRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setError(null); setProgress(null);
    if (user) Promise.all(["fortigate", "paloalto"].map(platform => accountRequest<{ completed: string[] }>(`progress/${platform}`)))
      .then(([fortigate, paloalto]) => { if (!cancelled) setProgress({ fortigate: fortigate.completed.length, paloalto: paloalto.completed.length }); })
      .catch(error => { if (!cancelled) setError(error.message); });
    return () => { cancelled = true; };
  }, [user, progressRetry]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await accountRequest(register ? "register" : "login", { name: form.get("name"), email: form.get("email"), password: form.get("password") });
      await refresh(); navigate("/");
    } catch (error) { setError(error instanceof Error ? error.message : "Sign-in failed."); }
    finally { setBusy(false); }
  }

  if (integration?.mode === "academy") return <SiteLayout><h1 className="text-2xl font-semibold">Managed by Academy</h1><p className="mt-3 text-muted">Sign-in, profile, and progress are managed in Academy.</p><a href={integration.parentUrl ?? "/"} target="_top" className="btn-primary mt-5">Back to Academy</a></SiteLayout>;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold">{user ? "Your account" : register ? "Create your account" : "Sign in"}</h1>
        <p className="mt-1.5 text-muted">{user ? `Signed in as ${user.email}` : "Save lesson progress across devices and pick up where you left off."}</p>

        {loading && <p className="mt-6 text-muted" role="status">Checking your session…</p>}
        {(error || serviceError) && <Callout tone="danger" className="mt-6">{error || serviceError} <button type="button" className="link ml-2" onClick={() => { setError(null); if (serviceError) window.location.reload(); else setProgressRetry(value => value + 1); }}>Retry</button></Callout>}

        {user ? (
          <div className="card mt-6 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-ink">{user.name}</div>
                <div className="text-sm text-muted">{user.role === "instructor" ? "Instructor" : "Student"}</div>
              </div>
              <button className="btn-secondary btn-sm" disabled={busy} onClick={async () => { setBusy(true); try { await logout(); setProgress(null); } catch (error) { setError((error as Error).message); } finally { setBusy(false); } }}>Sign out</button>
            </div>
            {progress && (
              <dl className="mt-6 space-y-4">
                {(Object.keys(COURSES) as Vendor[]).map(vendor => {
                  const total = allLessons(COURSES[vendor]).length;
                  return (
                    <div key={vendor} data-vendor={vendor}>
                      <div className="flex justify-between text-sm mb-1.5"><dt className="text-body">{COURSES[vendor].name}</dt><dd className="text-muted tabular-nums">{progress[vendor]}/{total}</dd></div>
                      <ProgressBar value={(progress[vendor] / total) * 100} label={`${COURSES[vendor].product} progress`} />
                    </div>
                  );
                })}
              </dl>
            )}
            <div className="mt-6 flex flex-wrap gap-2">
              <Link className="btn-primary" to="/">Go to courses</Link>
              {user.role === "instructor" && <Link className="btn-secondary" to="/classroom">Classroom</Link>}
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="card mt-6 p-6 space-y-4">
            {register && <label className="block"><span className="field-label">Name</span><input className="input" name="name" autoComplete="name" required maxLength={80} /></label>}
            <label className="block"><span className="field-label">Email</span><input className="input" name="email" type="email" autoComplete="email" required maxLength={254} /></label>
            <label className="block">
              <span className="field-label">Password</span>
              <input aria-label="Password" className="input" name="password" type="password" autoComplete={register ? "new-password" : "current-password"} required minLength={register ? 12 : 1} maxLength={128} aria-describedby="password-help" />
              <span id="password-help" className="mt-1.5 block text-xs text-muted">{register ? "12–128 characters. Ask your instructor if registration is disabled." : "Enter the password for your account."}</span>
            </label>
            <button className="btn-primary w-full" disabled={busy || loading}>{busy ? "Please wait…" : register ? "Create account" : "Sign in"}</button>
            <div className="flex flex-wrap justify-between gap-2 pt-1 text-sm">
              {registrationEnabled && <button type="button" className="link" onClick={() => { setRegister(!register); setError(null); }}>{register ? "Already have an account? Sign in" : "New student? Create an account"}</button>}
              {!authRequired && <Link to="/" className="text-muted hover:text-ink">Continue as guest</Link>}
            </div>
          </form>
        )}
      </div>
    </SiteLayout>
  );
}
