import { useCallback, useEffect, useRef, useState } from "react";
import { accountRequest, useAccount } from "./useAccount";

function readProgress(key: string): Set<string> {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return new Set(Array.isArray(data) ? data.filter((id): id is string => typeof id === "string") : []);
  } catch { return new Set(); }
}

export function useProgress(platform: "fortigate" | "paloalto") {
  const { user, loading } = useAccount();
  const key = user ? `${platform}-completed:${user.id}` : `${platform === "fortigate" ? "fortigate" : "pan"}-completed`;
  const [state, setState] = useState(() => ({ key, ids: readProgress(key) }));
  const [syncError, setSyncError] = useState<string | null>(null);
  const completedTaskIds = state.key === key ? state.ids : readProgress(key);
  const live = useRef({ key, ids: completedTaskIds });
  if (live.current.key !== key) live.current = { key, ids: readProgress(key) };

  useEffect(() => {
    let cancelled = false;
    const ids = readProgress(key);
    live.current = { key, ids };
    setState({ key, ids }); setSyncError(null);
    if (!loading && user) {
      // Merge only this account's cached progress, never the guest's history.
      accountRequest<{ completed: string[] }>(`progress/${platform}`, { completed: [...ids] })
        .then(data => {
          if (cancelled) return;
          const merged = new Set([...data.completed, ...live.current.ids]);
          live.current = { key, ids: merged };
          setState({ key, ids: merged });
          try { localStorage.setItem(key, JSON.stringify([...merged])); } catch { /* Memory still works. */ }
        })
        .catch(error => { if (!cancelled) setSyncError(error.message); });
    }
    return () => { cancelled = true; };
  }, [key, platform, user, loading]);

  const markTaskComplete = useCallback((id: string) => {
    const ids = new Set(live.current.key === key ? live.current.ids : readProgress(key));
    ids.add(id); setState({ key, ids });
    live.current = { key, ids };
    try { localStorage.setItem(key, JSON.stringify([...ids])); } catch { /* Keep in memory. */ }
    if (user) accountRequest(`progress/${platform}`, { completed: [...ids] })
      .then(() => { if (live.current.key === key) setSyncError(null); })
      .catch(error => { if (live.current.key === key) setSyncError(error.message); });
  }, [key, platform, user]);
  return { completedTaskIds, markTaskComplete, syncError };
}
