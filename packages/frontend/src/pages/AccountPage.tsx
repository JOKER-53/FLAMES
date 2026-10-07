import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { accountRequest, useAccount } from "../hooks/useAccount";

export function AccountPage() {
  const { user, loading, registrationEnabled, authRequired, error: serviceError, refresh, logout } = useAccount();
  const navigate = useNavigate();
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ fortigate: number; paloalto: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (user) Promise.all(["fortigate", "paloalto"].map(platform => accountRequest<{ completed: string[] }>(`progress/${platform}`)))
      .then(([fortigate, paloalto]) => { if (!cancelled) setProgress({ fortigate: fortigate.completed.length, paloalto: paloalto.completed.length }); })
      .catch(error => { if (!cancelled) setError(error.message); });
    return () => { cancelled = true; };
  }, [user]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await accountRequest(register ? "register" : "login", { name: form.get("name"), email: form.get("email"), password: form.get("password") });
      await refresh(); navigate("/");
    } catch (error) { setError(error instanceof Error ? error.message : "Sign-in failed."); }
    finally { setBusy(false); }
  }
  return <div className="platform-page"><main className="account-panel">
    <Link to="/" className="platform-back">Back to lab</Link>
    <h1>{user ? `Your lab, ${user.name}` : register ? "Create your lab account" : "Sign in to your lab"}</h1>
    <p className="platform-subtitle">Save exercise completion across devices and pick up your training where you left off.</p>
    {loading && <p role="status">Checking your session…</p>}
    {(error || serviceError) && <p className="platform-error" role="alert">{error || serviceError}</p>}
    {user ? <>
      <p>{user.email} · {user.role === "instructor" ? "Instructor" : "Student"}</p>
      {progress && <dl className="progress-summary"><div><dt>FortiGate exercises completed</dt><dd>{progress.fortigate}</dd></div><div><dt>Palo Alto exercises completed</dt><dd>{progress.paloalto}</dd></div></dl>}
      <div className="platform-actions"><Link className="platform-primary" to="/fortigate/tasks">Continue training</Link>{user.role === "instructor" && <Link to="/classroom">View classroom</Link>}
      <button disabled={busy} onClick={async () => { setBusy(true); try { await logout(); setProgress(null); } catch (error) { setError((error as Error).message); } finally { setBusy(false); } }}>Sign out</button></div>
    </> : <>
      <form onSubmit={submit} className="account-form">
        {register && <label>Name<input name="name" autoComplete="name" required maxLength={80} /></label>}
        <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
        <label>Password<input name="password" type="password" autoComplete={register ? "new-password" : "current-password"} required minLength={12} maxLength={128} /></label>
        <p className="platform-hint">Use 12–128 characters. Your instructor can help if account registration is disabled.</p>
        <button className="platform-primary" disabled={busy || loading}>{busy ? "Please wait…" : register ? "Create account" : "Sign in"}</button>
      </form>
      {registrationEnabled && <button className="platform-text-button" onClick={() => { setRegister(!register); setError(null); }}>{register ? "Already have an account? Sign in" : "New student? Create an account"}</button>}
      {!authRequired && <Link to="/" className="platform-back">Practice as a guest</Link>}
    </>}
  </main></div>;
}
