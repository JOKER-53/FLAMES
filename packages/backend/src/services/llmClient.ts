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
  const apiKey =
    process.env.OPENAI_API_KEY ||
    process.env.LLM_API_KEY ||
    process.env.NVIDIA_NIM_API_KEY;

  const baseUrl = (
    process.env.OPENAI_BASE_URL ||
    process.env.LLM_BASE_URL ||
    process.env.NVIDIA_NIM_BASE_URL ||
    (process.env.OPENAI_API_KEY ? "https://api.openai.com/v1" : "")
  ).replace(/\/$/, "");

  const model =
    process.env.OPENAI_MODEL ||
    process.env.LLM_MODEL ||
    process.env.NVIDIA_NIM_MODEL ||
    // The OpenAI default only makes sense against OpenAI itself.
    (baseUrl === "https://api.openai.com/v1" ? "gpt-4o-mini" : "");

  if (!apiKey || !baseUrl) {
    throw new Error("No LLM API key or Base URL configured.");
  }
  if (!model) throw new Error("No LLM model configured. Set LLM_MODEL (or NVIDIA_NIM_MODEL).");

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
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`LLM provider error (${response.status}): ${errorBody || response.statusText}`);
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
