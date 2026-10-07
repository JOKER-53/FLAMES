export function nimRequest(body: unknown): Promise<Response> {
  const base = process.env.NVIDIA_NIM_BASE_URL;
  const key = process.env.NVIDIA_NIM_API_KEY;
  if (!base || !key || !process.env.NVIDIA_NIM_MODEL) throw new Error("AI tutor is not configured.");
  return fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
}
