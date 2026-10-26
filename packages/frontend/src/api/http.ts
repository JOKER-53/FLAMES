import { academyAuthorization, expireAcademySession } from "../integration/academy";
/** All lab requests are same-origin and bounded, including optional tutor calls. */
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const authorization = academyAuthorization();
  const target = typeof input === "string" || input instanceof URL ? String(input) : input.url;
  const sameOrigin = typeof window === "undefined" ? target.startsWith("/") : new URL(target, window.location.origin).origin === window.location.origin;
  if (authorization && sameOrigin) headers.set("Authorization", authorization);
  let response: Response;
  try { response = await fetch(input, { credentials: "same-origin", ...init, headers, signal: init.signal ?? AbortSignal.timeout(25_000) }); }
  catch { throw new Error("Cannot reach the server. Please try again."); }
  if (response.status === 401 && sameOrigin && authorization && academyAuthorization() === authorization) expireAcademySession();
  if (!response.ok) {
    try { await response.clone().json(); }
    catch {
      const headers = new Headers(response.headers); headers.set("Content-Type", "application/json"); headers.delete("Content-Length"); headers.delete("Content-Encoding");
      return new Response(JSON.stringify({ error: response.status >= 500 ? "The server is temporarily unavailable. Please try again." : response.status === 401 ? "Your session expired. Please sign in again." : "The request could not be completed. Please try again." }), { status: response.status, headers });
    }
  }
  return response;
}
export async function readApiJson(response: Response): Promise<any> {
  try { return await response.json(); }
  catch { throw new Error("The server could not complete the request. Please try again."); }
}

export async function apiJson<T>(path: string, data?: unknown): Promise<T> {
  const response = await apiFetch(path, data === undefined ? {} : {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  const result = await readApiJson(response);
  if (!response.ok) throw new Error(result?.error || "The request failed. Try again.");
  return result;
}
