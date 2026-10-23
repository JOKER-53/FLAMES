import { notifyAcademy } from "../integration/academy";
import { useCourseCatalog } from "../course/CourseCatalog";
import { useCallback, useEffect, useRef, useState } from "react";
import { accountRequest, useAccount } from "./useAccount";

function readProgress(key: string, valid: (id: unknown) => id is string): Set<string> {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return new Set(Array.isArray(data) ? data.filter(valid) : []);
  } catch { return new Set(); }
}

export function useProgress(platform: "fortigate" | "paloalto") {
  const { user, loading, integration } = useAccount();
  const { validTask, loading: catalogLoading, error: catalogError } = useCourseCatalog();
  const valid = (id: unknown): id is string => validTask(platform, id);
  const filter = (ids: unknown[]): string[] => [...new Set(ids.filter(valid))];
  const academy = integration?.mode === "academy";
  const read = () => academy || !integration ? new Set<string>() : readProgress(key, valid);
  const key = academy ? `academy:${platform}:${user?.id ?? "guest"}` : user ? `${platform}-completed:${user.id}` : `${platform === "fortigate" ? "fortigate" : "pan"}-completed`;
  const [state, setState] = useState(() => ({ key, ids: read() }));
  const [syncError, setSyncError] = useState<string | null>(null);
  const completedTaskIds = state.key === key ? state.ids : read();
  const live = useRef({ key, ids: completedTaskIds });
  if (live.current.key !== key) live.current = { key, ids: read() };

  useEffect(() => {
    let cancelled = false;
    const ids = read();
    live.current = { key, ids };
    setState({ key, ids }); setSyncError(null);
    if (!loading && !catalogLoading && !catalogError && user) {
      // Merge only this account's cached progress, never the guest's history.
      accountRequest<{ completed: string[] }>(`progress/${platform}`, { completed: [...ids] })
        .then(data => {
          if (cancelled) return;
          const merged = new Set(filter([...data.completed, ...live.current.ids]));
          live.current = { key, ids: merged };
          setState({ key, ids: merged });
          try { if (!academy) localStorage.setItem(key, JSON.stringify([...merged])); } catch { /* Memory still works. */ }
        })
        .catch(error => { if (!cancelled) setSyncError(error.message); });
    }
    return () => { cancelled = true; };
  }, [key, platform, user, loading, academy, validTask, catalogLoading, catalogError]);

  const markTaskComplete = useCallback((id: string) => {
    if (!validTask(platform, id)) return;
    const ids = new Set(live.current.key === key ? live.current.ids : read());
    ids.add(id); setState({ key, ids });
    live.current = { key, ids };
    try { if (!academy) localStorage.setItem(key, JSON.stringify([...ids])); } catch { /* Keep in memory. */ }


    if (user) accountRequest<{ completed: string[] }>(`progress/${platform}`, { completed: [...ids] })
      .then(data => {
        if (live.current.key !== key) return;
        const merged = new Set(filter([...data.completed, ...live.current.ids]));
        live.current = { key, ids: merged }; setState({ key, ids: merged }); setSyncError(null);
        try { if (!academy) localStorage.setItem(key, JSON.stringify([...merged])); } catch { /* Keep memory. */ }
        notifyAcademy("FORTISIM_PROGRESS_SAVED", { platform, taskId: id, completed: data.completed });
      })
      .catch(error => { if (live.current.key === key) setSyncError(error.message); });
  }, [key, platform, user, academy, validTask]);

  return { completedTaskIds, markTaskComplete, syncError };
}
