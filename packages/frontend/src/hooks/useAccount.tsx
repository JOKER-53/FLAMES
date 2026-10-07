import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export interface AccountUser { id: string; email: string; name: string; role: "student" | "instructor"; }
interface AccountContext {
  user: AccountUser | null;
  loading: boolean;
  registrationEnabled: boolean;
  authRequired: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}
export async function accountRequest<T>(path: string, data?: unknown): Promise<T> {
  const response = await fetch(`/api/account/${path}`, {
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
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      const session = await accountRequest<{ user: AccountUser | null; registrationEnabled: boolean; authRequired: boolean }>("session");
      setUser(session.user); setRegistrationEnabled(session.registrationEnabled); setError(null);
      setAuthRequired(session.authRequired);
    } catch (error) { setError(error instanceof Error ? error.message : "Account service unavailable."); }
    finally { setLoading(false); }
  }, []);
  const logout = useCallback(async () => {
    await accountRequest("logout", {});
    setUser(null);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return <Context.Provider value={{ user, loading, registrationEnabled, authRequired, error, refresh, logout }}>{children}</Context.Provider>;
}
export function useAccount() {
  const context = useContext(Context);
  if (!context) throw new Error("AccountProvider is required.");
  return context;
}
