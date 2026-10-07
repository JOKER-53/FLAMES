/** All lab requests are same-origin and bounded, including optional tutor calls. */
export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  return fetch(input, { credentials: "same-origin", ...init, signal: init.signal ?? AbortSignal.timeout(25_000) });
}

export async function apiJson<T>(path: string, data?: unknown): Promise<T> {
  const response = await apiFetch(path, data === undefined ? {} : {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "The request failed. Try again.");
  return result;
}
