import { apiFetch } from "../api/http";
import { acceptAcademyMessage, notifyAcademy, setIntegration, type IntegrationConfig } from "../integration/academy";
import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";

export interface AccountUser { id: string; email: string; name: string; role: "student" | "instructor"; canManageContent?: boolean; }
interface AccountContext {
  integration: IntegrationConfig | null;
  user: AccountUser | null;
  loading: boolean;
  registrationEnabled: boolean;
  authRequired: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}
export async function accountRequest<T>(path: string, data?: unknown): Promise<T> {
  const response = await apiFetch(`/api/account/${path}`, {
    credentials: "same-origin",
    ...(data === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    signal: AbortSignal.timeout(20_000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "The request failed. Try again.");
  return result;
}
const Context = createContext<AccountContext | null>(null);
export function AccountProvider({ children }: { children: ReactNode }) {
  const [integration, updateIntegration] = useState<IntegrationConfig | null>(null);
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshVersion = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++refreshVersion.current;
    try {
      const session = await accountRequest<{ user: AccountUser | null; registrationEnabled: boolean; authRequired: boolean }>("session");
      if (version !== refreshVersion.current) return;
      setUser(session.user); setRegistrationEnabled(session.registrationEnabled); setError(null);
      setAuthRequired(session.authRequired);
    } catch (error) { if (version !== refreshVersion.current) return; setUser(null); setError(error instanceof Error ? error.message : "Account service unavailable."); }
    finally { if (version === refreshVersion.current) setLoading(false); }
  }, []);
  const logout = useCallback(async () => {
    await accountRequest("logout", {});
    setUser(null);
  }, []);
  useEffect(() => {
    let active = true;
    let revision = 0;
    const onMessage = (event: MessageEvent) => {
      if (!acceptAcademyMessage(event, window.parent)) return;
      revision++;
      setUser(null); setLoading(true);
      void refresh();
    };
    const onExpiry = () => {
      refreshVersion.current++;
      setUser(null); setLoading(false); setError("Academy session expired. Sign in again in Academy.");
    };
    window.addEventListener("message", onMessage);
    window.addEventListener("fortisim:auth-expired", onExpiry);
    apiFetch("/api/integration/config").then(async response => {
      if (!response.ok) throw new Error("Integration settings unavailable.");
      return response.json() as Promise<IntegrationConfig>;
    }).then(value => {
      if (!active) return;
      setIntegration(value); updateIntegration(value);
      if (value.mode === "academy") {
        setAuthRequired(true); setRegistrationEnabled(false);
        notifyAcademy("FORTISIM_READY");
        if (!revision) setLoading(false);
      } else void refresh();
    }).catch(error => { if (active) { setError(error.message); setLoading(false); } });
    return () => { active = false; refreshVersion.current++; window.removeEventListener("message", onMessage); window.removeEventListener("fortisim:auth-expired", onExpiry); };
  }, [refresh]);
  return <Context.Provider value={{ integration, user, loading, registrationEnabled, authRequired, error, refresh, logout }}>{children}</Context.Provider>;
}
export function useAccount() {
  const context = useContext(Context);
  if (!context) throw new Error("AccountProvider is required.");
  return context;
}
