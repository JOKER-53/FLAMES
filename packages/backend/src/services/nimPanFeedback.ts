// ============================================================================
// NVIDIA NIM feedback for PAN-OS exercises.
// Receives failing check descriptions and returns tutor guidance.
// NEVER reveals correct values — concept-level hints only.
// ============================================================================
import { GradingReport } from "@fortisim/engine";

const SYSTEM_PROMPT = `
You are a concise PAN-OS firewall tutor. A student is configuring a Palo Alto Networks firewall.
Given failing check descriptions, provide 2-4 sentences of plain text feedback.
Rules:
- No markdown, no bullet points, no headers, no asterisks.
- NEVER state the correct zone name, IP, app-id value, or exact config field value.
- DO hint at WHICH concept to revisit (App-ID vs port-based, zone direction, NAT order, etc.).
- DO explain WHY the config failed in PAN-OS terms.
- Be encouraging and specific to the failing checks.
- Output plain conversational English only.
`.trim();

export async function getPanFeedback(
  exerciseTitle: string,
  failingChecks: string[]
): Promise<string> {
  const userContent = [
    `Exercise: ${exerciseTitle}`,
    `Failing checks (${failingChecks.length}):`,
    ...failingChecks.map(c => `- ${c}`),
  ].join("\n");

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
      max_tokens: 200,
      temperature: 0.5,
    }),
  });

  if (!response.ok) {
    throw new Error(`NIM API error: ${response.status}`);
  }

  const data = await response.json();
  let text = data.choices?.[0]?.message?.content ?? "Review your configuration and try again.";
  // Strip any markdown that leaks through
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/^#+\s+/gm, "");
  text = text.replace(/^[-*]\s+/gm, "");
  text = text.replace(/\n{3,}/g, "\n\n");
  const sentences = text.split(/(?<=[.!?])\s+/);
  if (sentences.length > 4) text = sentences.slice(0, 4).join(" ");
  return text.trim();
}
