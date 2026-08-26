// ============================================================================
// AI feedback for interface configuration grading.
// Same principle as nimFeedback.ts: AI only sees diagnostic facts,
// never the correct values. Hints are conceptual, not prescriptive.
// ============================================================================

import { InterfaceGradingReport } from "@fortisim/engine";

const SYSTEM_PROMPT = `You are a concise network interface tutor. A student is configuring FortiGate interfaces. Respond with ONLY 2-3 short sentences of plain text. No markdown, no bullet points, no asterisks. Never reveal the exact correct value. Hint at the concept to revisit and why the current config fails. Be encouraging.`.trim();

export async function getFeedbackForInterfaceReport(
  scenarioTitle: string,
  report: InterfaceGradingReport
): Promise<string> {
  const failing = report.results.filter((r) => !r.passed);

  const userContent = [
    `Scenario: ${scenarioTitle}`,
    `Failing checks (${failing.length}/${report.totalChecks}):`,
    ...failing.map(
      (r) => `- "${r.description}" on interface "${r.interfaceName}" (field: ${r.field}): student set "${Array.isArray(r.studentValue) ? r.studentValue.join(", ") : r.studentValue}"`
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

  if (!response.ok) throw new Error(`NIM error: ${response.status}`);
  const data = await response.json();
  let text = data.choices?.[0]?.message?.content ?? "No feedback returned.";
  text = text.replace(/\*\*[^*]+\*\*/g, (m: string) => m.slice(2,-2));
  text = text.replace(/^#+\s+/gm, '');
  text = text.replace(/^[-*]\s+/gm, '');
  text = text.replace(/\n{3,}/g, '\n\n');
  const sentences = text.split(/(?<=[.!?])\s+/);
  if (sentences.length > 3) text = sentences.slice(0,3).join(' ');
  return text.trim();
}
