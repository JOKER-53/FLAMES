import { apiFetch } from "./http";
import type { GradingReport, StudentSubmission } from "@fortisim/engine";

export async function fetchScenarioList() {
  const res = await apiFetch("/api/scenarios");
  if (!res.ok) throw new Error("Failed to load scenario list");
  return res.json();
}

export async function fetchScenario(scenarioId: string) {
  const res = await apiFetch(`/api/scenarios/${scenarioId}`);
  if (!res.ok) throw new Error(`Failed to load scenario "${scenarioId}"`);
  return res.json();
}

export async function gradeSubmission(
  scenarioId: string,
  submission: StudentSubmission
): Promise<GradingReport> {
  const res = await apiFetch(`/api/submissions/${scenarioId}/grade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(submission),
  });
  if (!res.ok) throw new Error("Grading request failed");
  return res.json();
}

export async function getSubmissionFeedback(
  scenarioId: string,
  submission: StudentSubmission
): Promise<{ report: GradingReport; aiRemark: string | null }> {
  const res = await apiFetch(`/api/submissions/${scenarioId}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(submission),
  });
  if (!res.ok) throw new Error("Feedback request failed");
  return res.json();
}
