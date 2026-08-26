// ============================================================================
// NVIDIA NIM feedback service. CRITICAL: must only ever receive a
// GradingReport (facts about the student's own submission). Must NEVER
// receive expectedOutcomes or a model config.
// ============================================================================

import { GradingReport } from "@fortisim/engine";

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
      max_tokens: 300,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    throw new Error(`NIM API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  let text = data.choices?.[0]?.message?.content ?? "No feedback returned.";
  // Strip markdown formatting and chain-of-thought leakage
  text = text.replace(/\*\*[^*]+\*\*/g, (m: string) => m.slice(2,-2)); // **bold** -> bold
  text = text.replace(/^#+\s+/gm, '');           // remove headers
  text = text.replace(/^[-*]\s+/gm, '');          // remove bullet points
  text = text.replace(/\n{3,}/g, '\n\n');         // collapse extra newlines
  // If response contains thinking/analysis preamble, extract just the feedback part
  const feedbackMatch = text.match(/(?:feedback|hint|suggestion|tip)[:\s]+([\s\S]+)$/i);
  if (feedbackMatch && feedbackMatch[1].length > 20) text = feedbackMatch[1].trim();
  // Trim to first 3 sentences max
  const sentences = text.split(/(?<=[.!?])\s+/);
  if (sentences.length > 3) text = sentences.slice(0,3).join(' ');
  return text.trim();
}
