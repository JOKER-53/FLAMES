// ============================================================================
// Generates a fresh, AI-crafted multiple-choice knowledge check question
// for a given task concept via NVIDIA NIM. Questions are generated on-demand
// so no two attempts are identical and guessing patterns won't work.
// NEVER reveals correct configuration values — concept-level only.
// ============================================================================

const SYSTEM_PROMPT = `
You are a firewall and network security instructor creating exam-quality
multiple-choice questions for advanced students.

Rules you must follow without exception:
1. Generate exactly ONE question testing the CORE CONCEPT of the given task.
2. Provide exactly FOUR answer choices labeled internally as index 0,1,2,3.
3. Only ONE choice must be correct. The other three must be plausible but
   clearly wrong to someone who truly understands the concept — not trivially
   dismissible by guessing.
4. Do NOT make the correct answer always the same index position.
   Vary it: sometimes 0, sometimes 1, 2, or 3.
5. Make wrong answers realistic misconceptions a student might actually hold,
   not obviously absurd options. Avoid choices like "it doesn't matter" or
   "this is impossible" unless they are genuinely defensible distractors.
6. NEVER reveal specific IP addresses, port numbers, or exact config values
   from any real scenario. Keep questions concept-level.
7. Questions must require genuine understanding — not solvable by elimination
   or keyword spotting.
8. Respond ONLY with valid JSON, no markdown, no explanation, exactly:
{
  "question": "...",
  "choices": ["...", "...", "...", "..."],
  "correctIndex": <0|1|2|3>
}
`.trim();

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
      max_tokens: 600,
      temperature: 0.85,
    }),
  });

  if (!response.ok) {
    throw new Error(`NIM API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content ?? "";

  try {
    const parsed = JSON.parse(raw.trim());
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
