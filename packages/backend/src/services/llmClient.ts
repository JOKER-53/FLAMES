import { HARD_QUESTIONS } from "@fortisim/engine";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMRequestOptions {
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
}

/**
 * Universal OpenAI-compatible LLM request handler.
 * Supports:
 * - OpenAI (api.openai.com)
 * - NVIDIA NIM (integrate.api.nvidia.com)
 * - OpenRouter, Groq, Ollama, or any custom base URL.
 */
export async function sendLLMRequest(options: LLMRequestOptions): Promise<string> {
  // Select a complete provider namespace: never pair one provider's credential
  // with another provider's URL/model left in the environment.
  const prefix = process.env.OPENAI_API_KEY ? "OPENAI" : process.env.LLM_API_KEY ? "LLM" : "NVIDIA_NIM";
  const apiKey = process.env[`${prefix}_API_KEY`];
  const baseUrl = (process.env[`${prefix}_BASE_URL`] || (prefix === "OPENAI" ? "https://api.openai.com/v1" : prefix === "NVIDIA_NIM" ? "https://integrate.api.nvidia.com/v1" : "")).replace(/\/$/, "");
  const model = process.env[`${prefix}_MODEL`] || (baseUrl === "https://api.openai.com/v1" ? "gpt-4o-mini" : "");
  if (!apiKey || !baseUrl) throw new Error("No LLM API key or Base URL configured.");
  const endpoint = new URL(baseUrl);
  if (!["http:", "https:"].includes(endpoint.protocol) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) throw new Error("Invalid LLM base URL.");
  if (!model) throw new Error(`No LLM model configured. Set ${prefix}_MODEL.`);

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      max_tokens: options.maxTokens ?? 400,
      temperature: options.temperature ?? 0.5,
      ...(baseUrl.includes("integrate.api.nvidia.com") ? { chat_template_kwargs: { enable_thinking: false } } : {}),
    }),
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`LLM provider error (${response.status}): ${(errorBody || response.statusText).split(apiKey).join("[redacted]").slice(0, 1000)}`);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  // Reasoning models prefix their chain of thought; callers only want the answer.
  return (data.choices?.[0]?.message?.content ?? "").replace(/<think>[\s\S]*?(<\/think>|$)/gi, "").trim();
}

/**
 * Helper to get a curated fallback question from engine's HARD_QUESTIONS
 */
export function getStaticFallbackQuestion(taskId: string): { question: string; choices: string[]; correctIndex: number } | null {
  const fallback = HARD_QUESTIONS[taskId];
  if (!fallback) return null;
  return {
    question: fallback.question,
    choices: [...fallback.choices],
    correctIndex: fallback.correctIndex,
  };
}
