import { sendLLMRequest } from "./llmClient";

// ============================================================================
// AI Feedback for PAN-OS exercises.
// Supports OpenAI / NIM / generic LLM, with graceful fallback.
// ============================================================================

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
    ...failingChecks.map((c) => `- ${c}`),
  ].join("\n");

  try {
    let text = await sendLLMRequest({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      maxTokens: 200,
      temperature: 0.5,
    });

    // Strip markdown
    text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
    text = text.replace(/^#+\s+/gm, "");
    text = text.replace(/^[-*]\s+/gm, "");
    text = text.replace(/\n{3,}/g, "\n\n");
    const sentences = text.split(/(?<=[.!?])\s+/);
    if (sentences.length > 4) text = sentences.slice(0, 4).join(" ");
    return text.trim();
  } catch (err) {
    console.warn(`[PanFeedback] LLM call failed (${(err as Error).message}). Using rule-based fallback.`);
    const firstCheck = failingChecks[0] || "One or more rules did not behave as expected.";
    return `In PAN-OS, review zone assignment and rule ordering carefully. Your configuration did not pass: "${firstCheck}". Remember that policies are evaluated top-down and require correct source/destination zone pairings.`;
  }
}
