import { sendLLMRequest } from "./llmClient";

// ============================================================================
// Shared AI tutor. Every exercise track asks for hints through here so they get
// the same output cleanup, the same provider settings, and a topic-aware
// guided hint when no AI provider is configured or the provider fails.
// ============================================================================

export type TutorTopic = "fortigate-policy" | "fortigate-interface" | "fortigate-port" | "pan-security" | "pan-zone" | "pan-nat" | "pan-interface";
export interface TutorHint { text: string; source: "ai" | "guide"; }

/** Strips reasoning blocks and markdown, then keeps at most `maxSentences`. */
export function cleanTutorText(raw: string, maxSentences = 4): string {
  let text = raw
    .replace(/<think>[\s\S]*?(<\/think>|$)/gi, "")   // reasoning models (DeepSeek-R1, QwQ…) emit their chain of thought
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|\s)\*([^*\n]+)\*/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#+\s+/gm, "")
    .replace(/^\s*(?:[-*•]|\d+[.)])\s+/gm, "")
    .replace(/\s*\n\s*/g, " ")
    .trim();
  const sentences = text.split(/(?<=[.!?])\s+/);
  if (sentences.length > maxSentences) text = sentences.slice(0, maxSentences).join(" ");
  return text.trim();
}

const CONCEPTS: Record<TutorTopic, string> = {
  "fortigate-policy": "FortiGate policies are checked top-down and the first match wins, so a broad rule above a specific one hides it. Compare each failing flow's incoming and outgoing interfaces, addresses, and service with the rule you expect to match, and check its position in the list.",
  "fortigate-interface": "Each routed interface needs its own non-overlapping subnet, a role that matches what it connects to, and only the administrative access that zone should have. Re-read the scenario's addressing plan and ask whether each setting matches it.",
  "fortigate-port": "Zones follow what is physically connected, not where the port sits on the chassis: internet uplinks are WAN, internal switches are LAN, and public-facing servers belong in the DMZ. Unused ports stay unassigned to reduce the attack surface.",
  "pan-security": "PAN-OS evaluates security rules top-down between a source zone and a destination zone, and App-ID matches the real application rather than its port. Check the zone direction of each failing rule, whether the application or service is right, and whether a broader rule above it matches first.",
  "pan-zone": "Every PAN-OS interface must belong to exactly one zone, and the zone type must match the interface mode, such as Layer 3 for routed data, or HA for synchronisation links. Keep management and HA traffic out of data-plane zones.",
  "pan-nat": "PAN-OS NAT rules match the original (pre-NAT) packet, while security rules use the original addresses with the post-NAT destination zone. A NAT rule only translates; traffic still needs a security rule to be allowed. Check the translation type, the zones the rule matches, and the direction.",
  "pan-interface": "A PAN-OS interface needs a type (Layer 3, Layer 2, Virtual Wire, or Tap), and routed interfaces need an address and a zone before any policy applies. Compare each interface's mode and zone with what it connects to.",
};

/** Rule-based hint used when the AI tutor is unavailable. Never names a correct value. */
export function guidedHint(topic: TutorTopic, failing: string[]): string {
  const count = failing.length;
  const first = failing[0] ? ` Start with "${failing[0].slice(0, 160)}".` : "";
  return `${count} check${count === 1 ? "" : "s"} still failing.${first} ${CONCEPTS[topic]}`;
}

export async function tutorHint(topic: TutorTopic, system: string, user: string, failing: string[], maxSentences = 4): Promise<TutorHint> {
  try {
    const text = cleanTutorText(await sendLLMRequest({ messages: [{ role: "system", content: system }, { role: "user", content: user }], maxTokens: 400, temperature: 0.4 }), maxSentences);
    if (text.length < 20) throw new Error("Empty tutor response");
    return { text, source: "ai" };
  } catch (error) {
    console.warn(`[Tutor:${topic}] AI unavailable (${(error as Error).message}). Using guided hint.`);
    return { text: guidedHint(topic, failing), source: "guide" };
  }
}

/** Shared rules appended to every tutor system prompt. */
export const TUTOR_RULES = "Reply with 2-4 short sentences of plain text: no markdown, lists, or headings. Never state the correct value for any field (zone, IP address, port, service, application, or action). Name the concept to revisit and explain why the current configuration fails. Be encouraging and specific to the failing checks.";

export function panTopic(taskId: unknown): TutorTopic {
  const id = typeof taskId === "string" ? taskId : "";
  return id.startsWith("pan-nat") ? "pan-nat" : id.startsWith("pan-zone") ? "pan-zone" : id.startsWith("pan-iface") ? "pan-interface" : "pan-security";
}
