import { sendLLMRequest, getStaticFallbackQuestion } from "./llmClient";

// ============================================================================
// Generates a multiple-choice knowledge check question for a task.
// Tries LLM (OpenAI / NIM / custom) first, then gracefully falls back
// to curated engine questions if the LLM is down or misconfigured.
// ============================================================================

const SYSTEM_PROMPT = `You generate multiple-choice exam questions about firewall and networking concepts. Output ONLY valid JSON, no markdown, no explanation, no preamble. Format exactly: {"question":"...","choices":["...","...","...","..."],"correctIndex":0}. Rules: one correct answer, three plausible wrong answers, vary correctIndex position, concept-level only (no specific IP/port values from any scenario), requires genuine understanding to answer correctly.`.trim();

export interface GeneratedQuestion {
  question: string;
  choices: string[];
  correctIndex: number;
}

export async function generateKnowledgeCheck(
  taskId: string,
  taskTitle: string,
  taskConcept: string
): Promise<GeneratedQuestion> {
  const userContent = `
Task ID: ${taskId}
Task Title: ${taskTitle}
Core concept to test: ${taskConcept}

Generate a hard multiple-choice question that tests deep understanding of this concept.
A student who merely memorised terminology should fail. Only someone who truly understands
the underlying networking/security principle should answer correctly.
`.trim();

  try {
    const raw = await sendLLMRequest({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      maxTokens: 400,
      temperature: 0.4,
    });

    const jsonMatch = raw.match(/\{[\s\S]*"question"[\s\S]*"choices"[\s\S]*"correctIndex"[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in LLM response");
    const parsed = JSON.parse(jsonMatch[0]);
    if (
      typeof parsed.question !== "string" ||
      !Array.isArray(parsed.choices) ||
      parsed.choices.length !== 4 ||
      typeof parsed.correctIndex !== "number"
    ) {
      throw new Error("Invalid shape from LLM");
    }
    return parsed as GeneratedQuestion;
  } catch (err) {
    console.warn(`[KnowledgeCheck] LLM generation failed for ${taskId} (${(err as Error).message}). Using static fallback.`);
    const fallback = getStaticFallbackQuestion(taskId);
    if (fallback) {
      return fallback;
    }
    throw new Error("Knowledge check generation is temporarily unavailable.");
  }
}
