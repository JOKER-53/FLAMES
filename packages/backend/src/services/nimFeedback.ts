import { sendLLMRequest } from "./llmClient";
import { GradingReport } from "@fortisim/engine";

// ============================================================================
// AI Tutor feedback service.
// Supports OpenAI / NIM / generic LLM, with deterministic fallback hints.
// ============================================================================

const SYSTEM_PROMPT = `You are a concise firewall tutor. A student is debugging their FortiGate policy. Respond with ONLY 2-3 short sentences of plain text. No markdown, no bullet points, no headers, no asterisks. Never reveal the correct IP, port, or service name. Hint at which concept to re-examine and why the traffic was denied. Be encouraging and specific.`.trim();

export async function getFeedbackForReport(
  scenarioTitle: string,
  report: GradingReport
): Promise<string> {
  const failing = report.diagnostics.filter((d) => !d.passed);

  const userContent = [
    `Scenario: ${scenarioTitle}`,
    `Failing checks (${failing.length}/${report.totalChecks}):`,
    ...failing.map(
      (d) =>
        `- "${d.description}": student's config resulted in ${d.studentAction}` +
        (d.webFiltered ? " (blocked by Web Filter profile)" : " (no matching policy or wrong action)")
    ),
  ].join("\n");

  try {
    let text = await sendLLMRequest({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      maxTokens: 300,
      temperature: 0.4,
    });

    // Strip markdown formatting and chain-of-thought leakage
    text = text.replace(/\*\*[^*]+\*\*/g, (m: string) => m.slice(2, -2)); // **bold** -> bold
    text = text.replace(/^#+\s+/gm, ""); // remove headers
    text = text.replace(/^[-*]\s+/gm, ""); // remove bullet points
    text = text.replace(/\n{3,}/g, "\n\n"); // collapse extra newlines
    const sentences = text.split(/(?<=[.!?])\s+/);
    if (sentences.length > 4) text = sentences.slice(0, 4).join(" ");
    return text.trim();
  } catch (err) {
    console.warn(`[Feedback] LLM call failed (${(err as Error).message}). Using rule-based hint.`);
    // Fallback guidance based on failure diagnostics
    const firstFail = failing[0];
    if (firstFail) {
      return `Notice how traffic was treated: ${firstFail.description} resulted in "${firstFail.studentAction}". Check your policy ordering and ensure source/destination interfaces and services match your intended route.`;
    }
    return "Check that your rules match the required source, destination, and service parameters, and review rule evaluation order.";
  }
}
