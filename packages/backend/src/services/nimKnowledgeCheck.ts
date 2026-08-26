// ============================================================================
// Generates a fresh, AI-crafted multiple-choice knowledge check question
// for a given task concept via NVIDIA NIM. Questions are generated on-demand
// so no two attempts are identical and guessing patterns won't work.
// NEVER reveals correct configuration values — concept-level only.
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

  const response = await fetch(`${process.env.NVIDIA_NIM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NVIDIA_NIM_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.NVIDIA_NIM_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      max_tokens: 400,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    throw new Error(`NIM API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content ?? "";

  try {
    // Extract JSON object from response (model may include reasoning before it)
    const jsonMatch = raw.match(/\{[\s\S]*"question"[\s\S]*"choices"[\s\S]*"correctIndex"[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    const parsed = JSON.parse(jsonMatch[0]);
    if (
      typeof parsed.question !== "string" ||
      !Array.isArray(parsed.choices) ||
      parsed.choices.length !== 4 ||
      typeof parsed.correctIndex !== "number"
    ) {
      throw new Error("Invalid shape");
    }
    return parsed as GeneratedQuestion;
  } catch {
    throw new Error(`Failed to parse NIM question response: ${raw}`);
  }
}
