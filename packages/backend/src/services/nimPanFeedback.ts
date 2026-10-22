import { panTopic, tutorHint, TUTOR_RULES, type TutorHint } from "./tutor";

// AI tutor feedback for PAN-OS exercises; the topic comes from the task id.
const SYSTEM_PROMPT = `You are a concise PAN-OS firewall tutor. A student is configuring a Palo Alto Networks firewall. Hint at the PAN-OS concept involved, such as App-ID versus port-based matching, zone direction, zone types, or NAT versus security policy evaluation. ${TUTOR_RULES}`;

export function getPanFeedback(exerciseTitle: string, failingChecks: string[], taskId?: string): Promise<TutorHint> {
  const userContent = [
    `Exercise: ${exerciseTitle}`,
    `Failing checks (${failingChecks.length}):`,
    ...failingChecks.map((c) => `- ${c}`),
  ].join("\n");
  return tutorHint(panTopic(taskId), SYSTEM_PROMPT, userContent, failingChecks);
}
