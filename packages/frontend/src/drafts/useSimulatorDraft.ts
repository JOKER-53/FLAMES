import { useCallback, useEffect, useMemo, useState, type SetStateAction } from "react";
import { isSimulatorConfiguration, type SimulatorDraft, type SimulatorKind } from "@fortisim/engine";
import { apiFetch } from "../api/http";
import { useAccount } from "../hooks/useAccount";
export type DraftStatus = "loading" | "saved" | "unsaved" | "saving" | "error" | "conflict" | "outdated";
export interface DraftComparison { before: unknown; current: unknown; label: string; canCapture: boolean; capture: () => void; }
export interface DraftControls {
  scopeKey?: string;
  comparison?: DraftComparison;
  ready: boolean; status: DraftStatus; message: string; canReset: boolean;
  retry: () => void; reload: () => void; reset: () => void;
}
interface Scope<T> {
  comparison: string | null; comparisonLabel: string;
  key: string; value: T; baseline: string; revision: number; version: string;
  ready: boolean; loaded: boolean; blocked: boolean; alive: boolean; dirty: boolean;
  status: DraftStatus; message: string; timer?: ReturnType<typeof setTimeout>; flight: Promise<void> | null;
}
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function stored(key: string): SimulatorDraft | null {
  const text = localStorage.getItem(key); return text ? JSON.parse(text) : null;
}
export function validDraftRecord(value: unknown): value is SimulatorDraft {
  const draft = value as SimulatorDraft;
  return !!draft && draft.schemaVersion === 1 && typeof draft.scenarioVersion === "string" && Number.isSafeInteger(draft.revision) && draft.revision > 0 && typeof draft.updatedAt === "number" && Object.prototype.hasOwnProperty.call(draft, "config");
}
export function useSimulatorDraft<T>(platform: "fortigate" | "paloalto", taskId: string, kind: SimulatorKind, initial: T, version = "1", enabled = true): { value: T; setValue: (value: SetStateAction<T>) => void; controls: DraftControls } {
  const { user, loading, integration } = useAccount();
  const active = enabled && !loading && !!integration && (integration.mode !== "academy" || !!user);
  const guest = !user;
  const key = `${active ? "active" : "idle"}:${integration?.mode ?? "pending"}:${user?.id ?? "guest"}:${platform}:${taskId}:${version}`;
  const storageKey = `flames:simulator-draft:v1:${platform}:${taskId}`;
  const scope = useMemo<Scope<T>>(() => ({ comparison: null, comparisonLabel: "Configuration loaded for this visit", key, value: clone(initial), baseline: JSON.stringify(initial), revision: 0, version, ready: false, loaded: false, blocked: false, alive: true, dirty: false, status: "loading", message: "Loading saved configuration…", flight: null }), [key]);
  const [, redraw] = useState(0);
  const render = useCallback(() => { if (scope.alive) redraw(value => value + 1); }, [scope]);
  const endpoint = `/api/drafts/${platform}/${encodeURIComponent(taskId)}`;
  const savedMessage = guest ? "Saved on this device" : integration?.mode === "academy" ? "Saved in Academy" : "Saved to your account";
  const fail = useCallback((error: unknown) => {
    const e = error as Error & { status?: number };
    scope.status = e.status === 409 ? "conflict" : "error";
    scope.message = e.message || "Configuration could not be saved.";
    if (e.status === 409 || e.status === 401 || e.status === 403) { scope.blocked = true; scope.ready = false; }
    render();
  }, [scope, render]);
  const request = useCallback(async (method: string, config?: unknown, keepalive = false) => {
    if (guest) {
      const operation = async () => {
        let current: SimulatorDraft | null;
        try { current = stored(storageKey); } catch (error) { if (method !== "DELETE") throw error; current = null; }
        if (method === "DELETE" && current && (!Number.isSafeInteger(current.revision) || current.revision < 1)) current = null;
        if ((current?.revision ?? 0) !== scope.revision) throw Object.assign(new Error("Another tab changed this configuration. Reload the saved version."), { status: 409 });
        const draft: SimulatorDraft = { schemaVersion: 1, scenarioVersion: scope.version, revision: scope.revision + 1, config: method === "DELETE" ? null : config, updatedAt: Date.now() };
        localStorage.setItem(storageKey, JSON.stringify(draft)); return draft;
      };
      return navigator.locks ? navigator.locks.request(storageKey, operation) : operation();
    }
    const body = JSON.stringify({ ownerId: user!.id, schemaVersion: 1, scenarioVersion: scope.version, revision: scope.revision, config });
    const response = await apiFetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body, keepalive: keepalive && new Blob([body]).size < 60000 });
    const data = await response.json();
    if (!response.ok) throw Object.assign(new Error(data.error || "Configuration save failed."), { status: response.status });
    if (!validDraftRecord(data.draft)) throw new Error("Invalid saved configuration response.");
    return data.draft as SimulatorDraft;
  }, [scope, guest, storageKey, user?.id, endpoint]);
  const load = useCallback(async () => {
    if (!active) return;
    scope.ready = false; scope.blocked = false; scope.status = "loading"; scope.message = "Loading saved configuration…"; render();
    try {
      let record: SimulatorDraft | null;
      let currentVersion = version;
      if (guest) record = stored(storageKey);
      else {
        const response = await apiFetch(endpoint, { headers: { "X-Flames-Draft-Owner": user!.id } }); const data = await response.json();
        if (!response.ok) throw Object.assign(new Error(data.error || "Saved configuration unavailable."), { status: response.status });
        record = data.draft; currentVersion = data.spec?.scenarioVersion;
        if (data.spec?.kind !== kind || typeof currentVersion !== "string") throw new Error("Invalid configuration format.");
      }
      if (!scope.alive) return;
      if (record !== null && !validDraftRecord(record)) {
        if (Number.isSafeInteger((record as SimulatorDraft)?.revision) && (record as SimulatorDraft).revision > 0) {
          scope.loaded = true; scope.revision = (record as SimulatorDraft).revision; scope.version = currentVersion;
          scope.blocked = true; scope.status = "outdated"; scope.message = "The exercise or draft format changed. Reset this draft to start the current version."; render(); return;
        }
        throw new Error("Saved configuration format is invalid. Reset it to continue.");
      }
      scope.loaded = true; scope.revision = record?.revision ?? 0; scope.version = currentVersion;
      if (currentVersion !== version || record?.config !== null && record && (record.scenarioVersion !== version || !isSimulatorConfiguration(kind, record.config))) {
        scope.blocked = true; scope.status = "outdated"; scope.message = "The exercise or draft format changed. Reset this draft to start the current version."; render(); return;
      }
      scope.value = record?.config == null ? clone(initial) : record.config as T;
      if (scope.comparison === null) scope.comparison = JSON.stringify(scope.value);
      scope.baseline = JSON.stringify(scope.value); scope.dirty = false; scope.ready = true; scope.status = "saved"; scope.message = record?.config != null ? savedMessage : "Ready · changes save automatically"; render();
    } catch (error) {
      if (!scope.alive) return;
      if (guest) { scope.ready = true; scope.loaded = true; }
      fail(error);
    }
  }, [scope, active, guest, storageKey, endpoint, kind, version, render, fail]);
  const save = useCallback(async function persist(keepalive = false): Promise<void> {
    if (!active || !scope.ready || scope.blocked || !scope.dirty) return;
    if (scope.flight) { await scope.flight; if (scope.dirty && !scope.blocked) await persist(keepalive); return; }
    const config = clone(scope.value); const json = JSON.stringify(config);
    scope.status = "saving"; scope.message = "Saving configuration…"; render();
    scope.flight = (async () => {
      try {
        const record = await request("PUT", config, keepalive);
        scope.revision = record.revision; scope.baseline = json; scope.dirty = JSON.stringify(scope.value) !== json;
        scope.status = scope.dirty ? "unsaved" : "saved"; scope.message = scope.dirty ? "Changes waiting to save" : savedMessage;
      } catch (error) { fail(error); }
      finally { scope.flight = null; render(); }
    })();
    await scope.flight;
  }, [scope, active, request, render, fail, savedMessage]);
  const setValue = useCallback((update: SetStateAction<T>) => {
    if (!scope.ready || scope.blocked) return;
    scope.value = typeof update === "function" ? (update as (old: T) => T)(scope.value) : update;
    scope.dirty = JSON.stringify(scope.value) !== scope.baseline || !!scope.flight || scope.status === "error";
    if (scope.timer) clearTimeout(scope.timer);
    if (scope.dirty) { scope.status = "unsaved"; scope.message = "Changes waiting to save"; scope.timer = setTimeout(() => void save(), 650); }
    else { scope.status = "saved"; scope.message = savedMessage; }
    render();
  }, [scope, save, render, savedMessage]);
  const reset = useCallback(async () => {
    if (!scope.loaded || scope.status === "conflict" || !window.confirm("Reset this lesson's saved configuration? Completion and other lessons will stay unchanged.")) return;
    if (scope.timer) clearTimeout(scope.timer);
    if (scope.flight) await scope.flight;
    try {
      const record = await request("DELETE"); scope.revision = record.revision;
      if (scope.version !== version) { window.location.reload(); return; }
      scope.value = clone(initial); scope.baseline = JSON.stringify(scope.value); scope.dirty = false; scope.blocked = false; scope.ready = true; scope.status = "saved"; scope.message = "Configuration reset"; render();
    } catch (error) { fail(error); }
  }, [scope, request, version, render, fail]);
  useEffect(() => {
    scope.alive = true; void load();
    const unload = (event: BeforeUnloadEvent) => { if (scope.dirty || scope.flight) { event.preventDefault(); event.returnValue = ""; } };
    const hide = () => { if (document.visibilityState === "hidden") void save(true); };
    const storage = (event: StorageEvent) => {
      if (!guest || event.key !== storageKey || !scope.loaded) return;
      if (scope.dirty || scope.flight) { if (scope.timer) clearTimeout(scope.timer); fail(Object.assign(new Error("Another tab changed this configuration. Reload the saved version."), { status: 409 })); }
      else void load();
    };
    window.addEventListener("beforeunload", unload); document.addEventListener("visibilitychange", hide); window.addEventListener("storage", storage);
    return () => {
      if (scope.timer) clearTimeout(scope.timer); void save(true); scope.alive = false;
      window.removeEventListener("beforeunload", unload); document.removeEventListener("visibilitychange", hide); window.removeEventListener("storage", storage);
    };
  }, [scope]);
  return { value: scope.value, setValue, controls: { scopeKey: key, comparison: scope.comparison !== null && scope.ready ? { before: JSON.parse(scope.comparison), current: scope.value, label: scope.comparisonLabel, canCapture: scope.status === "saved", capture: () => { if (scope.status !== "saved" || !scope.ready) return; scope.comparison = JSON.stringify(scope.value); scope.comparisonLabel = "Comparison snapshot captured this visit"; render(); } } : undefined, ready: scope.ready, status: scope.status, message: scope.message, canReset: scope.loaded && scope.status !== "conflict" && scope.status !== "loading" && scope.status !== "saving" && (!scope.blocked || scope.status === "outdated"), retry: () => { if (scope.blocked && scope.status === "error") { window.location.reload(); return; } if (!scope.ready || !scope.loaded || !scope.dirty) void load(); else void save(); }, reload: () => { if (!scope.dirty || window.confirm("Discard your unsaved changes and reload the saved version?")) void load(); }, reset: () => void reset() } };
}
