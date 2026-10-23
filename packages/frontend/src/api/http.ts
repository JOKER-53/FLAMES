import { academyAuthorization, expireAcademySession } from "../integration/academy";
/** All lab requests are same-origin and bounded, including optional tutor calls. */
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const authorization = academyAuthorization();
  const target = typeof input === "string" || input instanceof URL ? String(input) : input.url;
  const sameOrigin = typeof window === "undefined" ? target.startsWith("/") : new URL(target, window.location.origin).origin === window.location.origin;
  if (authorization && sameOrigin) headers.set("Authorization", authorization);
  const response = await fetch(input, { credentials: "same-origin", ...init, headers, signal: init.signal ?? AbortSignal.timeout(25_000) });
  if (response.status === 401 && sameOrigin) expireAcademySession();
  return response;
}

export async function apiJson<T>(path: string, data?: unknown): Promise<T> {
  const response = await apiFetch(path, data === undefined ? {} : {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "The request failed. Try again.");
  return result;
}
