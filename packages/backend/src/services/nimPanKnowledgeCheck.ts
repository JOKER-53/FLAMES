import { validateGeneratedQuestion } from "./questionStore";
import { sendLLMRequest, getStaticFallbackQuestion } from "./llmClient";

// ============================================================================
// AI-generated knowledge check questions for PAN-OS exercises.
// Returns a fresh MCQ on each call — with fallback support.
// ============================================================================

const SYSTEM_PROMPT = `
You generate multiple-choice exam questions about PAN-OS and Palo Alto Networks firewall concepts.
Output ONLY valid JSON, no markdown, no explanation, no preamble.
Format exactly: {"question":"...","choices":["...","...","...","..."],"correctIndex":0}
Rules:
- One correct answer, three plausible wrong answers that real students might choose
- Vary correctIndex (0,1,2,3) — never always 0
- Concept-level only — no specific IP/port values from any scenario
- Requires genuine understanding of PAN-OS to answer correctly
- Wrong answers should be common misconceptions, not obviously wrong
`.trim();

interface GeneratedQuestion {
  question: string;
  choices: string[];
  correctIndex: number;
  /** "ai" when generated for this request, "bank" when taken from the curated fallback set. */
  source?: "ai" | "bank";
}

export const TASK_CONCEPTS: Record<string, { title: string; concept: string }> = {
"pan-sec-dns": {"title": "DNS-Only Egress", "concept": "App-ID allowlists and explicit default deny for outbound DNS."},
"pan-sec-admin": {"title": "Dedicated Administration Zone", "concept": "Asymmetric administration trust with a separate management zone."},
"pan-sec-mail": {"title": "DMZ Mail Relay Isolation", "concept": "Bidirectional named application paths without lateral access to trusted networks."},

  // Security Policy
  "pan-sec-01": { title:"Basic Outbound Access", concept:"Why App-ID is more precise than port-based service matching, and why a deny-all rule must sit at the bottom of a PAN-OS policy." },
  "pan-sec-02": { title:"DMZ Web Server",        concept:"Zone directionality in PAN-OS security policy — why a rule allowing Untrust→DMZ does NOT automatically allow DMZ→Trust, and the semi-trusted zone model." },
  "pan-sec-03": { title:"App-ID Enforcement",    concept:"Why blocking an application by App-ID is more reliable than blocking by port, and how rule ordering affects App-ID enforcement in first-match-wins evaluation." },
  "pan-sec-04": { title:"Split Tunneling Prevention", concept:"How to enforce an application whitelist using App-ID — deny unknown-tcp/udp, deny all non-approved apps, and why port blocking alone fails for evasive apps." },
  "pan-sec-05": { title:"Inter-Zone Trust Hierarchy", concept:"Designing asymmetric zone trust — why Management→Trust is allowed but Trust→Management is not, and how explicit deny rules override implicit allow." },
  "pan-sec-final": { title:"Security Policy Final", concept:"Complete PAN-OS security policy design covering App-ID, zone hierarchy, implicit deny, and rule ordering for a multi-zone network." },
  // Zone Config
  "pan-zone-01": { title:"Basic Zone Setup",          concept:"Why interfaces must be assigned to zones before security policy applies, and what Layer3 zone type means in PAN-OS." },
  "pan-zone-02": { title:"HA Zone Configuration",     concept:"Why HA interfaces use a special 'ha' zone type and must never be placed in data-plane zones — and what happens to HA sync if misconfigured." },
  "pan-zone-03": { title:"Management Zone Isolation",  concept:"Why out-of-band management must be on a dedicated zone isolated from data-plane traffic, and the security risk of sharing management with production interfaces." },
  "pan-zone-final": { title:"Zone Design Final",       concept:"Complete zone architecture for a branch firewall — Trust, Untrust, DMZ, HA, and Management zones with correct types and interface assignments." },
  // NAT
  "pan-nat-01": { title:"Outbound SNAT",    concept:"How dynamic-ip-and-port Source NAT works in PAN-OS, why it must be configured separately from security policy, and when to use interface vs static IP as the translated address." },
  "pan-nat-02": { title:"Web Server DNAT",  concept:"How Destination NAT redirects inbound traffic to internal servers — why both a security policy AND a NAT rule are required, and the order of evaluation." },
  "pan-nat-03": { title:"Static NAT",       concept:"When to use 1:1 static NAT vs DNAT — the bidirectional nature of static NAT and why it creates both inbound and outbound translation automatically." },
  "pan-nat-final": { title:"NAT Policy Final", concept:"Complete PAN-OS NAT design with SNAT, DNAT, and static NAT; NAT policy matches pre-NAT zones, while security policy matches original addresses and post-NAT zones. Translation alone does not authorize traffic." },
  // Interfaces
  "pan-iface-01": { title:"Interface Configuration", concept:"How Palo Alto interface types (Layer2, Layer3, Virtual Wire, Tap) work, and why an interface must be assigned to a zone before security policies apply." },
};

// Fallback questions for Palo Alto tasks when offline or LLM fails
const PAN_STATIC_FALLBACKS: Record<string, GeneratedQuestion> = {
  "pan-sec-01": {
    question: "In PAN-OS security policy, why is configuring an application (App-ID) preferable to simply allowing TCP port 80/443?",
    choices: [
      "App-ID consumes less CPU than port inspection",
      "App-ID inspects actual application signatures regardless of what port or evasion technique is used",
      "PAN-OS doesn't allow rules without an App-ID",
      "Port-based rules only work on outbound traffic",
    ],
    correctIndex: 1,
  },
  "pan-sec-02": {
    question: "When publishing a web server in the DMZ zone from Untrust, why should the firewall policy explicitly prohibit DMZ-initiated connections to the Trust zone?",
    choices: [
      "Trust zone interfaces cannot route traffic to the DMZ",
      "In the event the DMZ web server is compromised, it prevents lateral pivot attacks into the private network",
      "PAN-OS automatically allows DMZ to Trust unless blocked by an admin profile",
      "HTTP traffic requires symmetric bi-directional policies to function",
    ],
    correctIndex: 1,
  },
  "pan-nat-01": {
    question: "Many internal users share the firewall's single public IP address with outbound Source NAT. Which translation type makes this possible?",
    choices: [
      "Static IP, because it maps each user to the public address 1:1",
      "Dynamic IP and Port (DIPP), because it translates both the source address and the source port so many sessions can share one address",
      "Destination NAT, because it rewrites the public address on the way out",
      "No NAT is needed; the security rule translates the address",
    ],
    correctIndex: 1,
  },
  "pan-zone-01": {
    question: "Why must every physical interface in PAN-OS be bound to a Security Zone before passing routed traffic?",
    choices: [
      "PAN-OS is a zone-based firewall; all security policies are evaluated between source and destination zones",
      "Without a zone, the interface hardware turns off",
      "Zones are only needed if OSPF routing is enabled",
      "Interfaces only support DHCP when assigned to a zone",
    ],
    correctIndex: 0,
  },
  "pan-sec-03": {
    question: "A rule above your general allow rule blocks the application 'bittorrent' by App-ID. A user runs BitTorrent over TCP 443. What happens?",
    choices: [
      "It is allowed, because port 443 matches the HTTPS allow rule first",
      "It is blocked, because App-ID identifies the application from its traffic signature regardless of the port it uses",
      "It is blocked only if SSL decryption is disabled",
      "It is allowed, because App-ID only inspects well-known application ports",
    ],
    correctIndex: 1,
  },
  "pan-sec-04": {
    question: "To stop users tunnelling unapproved traffic, you allow only a list of approved applications. Why should you also deny 'unknown-tcp' and 'unknown-udp'?",
    choices: [
      "They are only used by PAN-OS management traffic",
      "Tunnels and custom protocols that App-ID cannot classify appear as unknown applications, so allowing them reopens the gap",
      "PAN-OS requires an explicit deny for every application that is not allowed",
      "Unknown applications always use ports below 1024",
    ],
    correctIndex: 1,
  },
  "pan-sec-05": {
    question: "You allow Management→Trust but want to stop Trust→Management. Without an explicit rule, how does PAN-OS treat Trust→Management traffic?",
    choices: [
      "It is allowed, because a session allowed in one direction is allowed in both",
      "It is denied by the default interzone rule, so no rule is needed — though an explicit logged deny makes the intent visible",
      "It is allowed by the default intrazone rule",
      "It is dropped only if both zones are Layer 3 zones",
    ],
    correctIndex: 1,
  },
  "pan-sec-final": {
    question: "In a complete PAN-OS rulebase, what is the effect of placing an 'any-any allow' rule above specific App-ID rules?",
    choices: [
      "None — PAN-OS picks the most specific matching rule",
      "Everything matches the broad rule first, so the specific rules below it never apply (they are shadowed)",
      "The broad rule only applies to traffic App-ID cannot identify",
      "PAN-OS rejects the commit because of the conflict",
    ],
    correctIndex: 1,
  },
  "pan-zone-02": {
    question: "Why should the interfaces used for HA links never be placed in a data-plane zone such as Trust?",
    choices: [
      "HA interfaces are faster when they have no zone",
      "HA links carry control and session synchronisation between peers; mixing them with production traffic exposes that channel and can disrupt failover",
      "Trust zones cannot contain more than four interfaces",
      "PAN-OS automatically encrypts HA traffic only in data-plane zones",
    ],
    correctIndex: 1,
  },
  "pan-zone-03": {
    question: "An administrator puts the management network in the same zone as user workstations to simplify rules. What is the main risk?",
    choices: [
      "Management traffic gets lower QoS priority",
      "Any compromised workstation can reach the firewall's administrative interfaces directly, with no zone boundary or policy in between",
      "The firewall cannot log management sessions",
      "Workstations lose access to the internet",
    ],
    correctIndex: 1,
  },
  "pan-zone-final": {
    question: "When designing zones for a branch firewall, what should decide how interfaces are grouped into zones?",
    choices: [
      "Physical port numbers, keeping consecutive ports in the same zone",
      "Trust level and function, so each zone holds networks that need the same security treatment",
      "Link speed, so all 1 Gbps ports share a zone",
      "Alphabetical order of the connected device names",
    ],
    correctIndex: 1,
  },
  "pan-nat-02": {
    question: "You publish an internal web server with Destination NAT from Untrust. Traffic is translated but still blocked. What is missing?",
    choices: [
      "A second NAT rule for the return traffic",
      "A security rule allowing the traffic: NAT only translates addresses and never permits a session by itself",
      "An App-ID override on the NAT rule",
      "Nothing — Destination NAT does not work for HTTP",
    ],
    correctIndex: 1,
  },
  "pan-nat-03": {
    question: "How does a bidirectional static NAT rule differ from a one-way Destination NAT rule?",
    choices: [
      "Static NAT translates ports while Destination NAT does not",
      "Bidirectional static NAT maps one address to another 1:1 for both inbound and outbound sessions, so one rule covers both directions",
      "Static NAT bypasses security policy",
      "Destination NAT can only be used with IPv6",
    ],
    correctIndex: 1,
  },
  "pan-nat-final": {
    question: "For inbound Destination NAT traffic, which addresses and zone does the PAN-OS security rule match?",
    choices: [
      "The post-NAT (translated) destination address and the pre-NAT zone",
      "The original (pre-NAT) destination address and the post-NAT destination zone",
      "Only the translated address; zones are ignored after NAT",
      "Security rules are evaluated after NAT, so they match the translated address and zone",
    ],
    correctIndex: 1,
  },
  "pan-iface-01": {
    question: "Which PAN-OS interface type lets the firewall inspect and enforce policy on traffic passing between two segments without routing or IP addresses on its interfaces?",
    choices: [
      "Layer 3",
      "Virtual Wire",
      "Tap",
      "Loopback",
    ],
    correctIndex: 1,
  },
};

export async function generatePanKnowledgeCheck(taskId: string): Promise<GeneratedQuestion> {
  const meta = Object.prototype.hasOwnProperty.call(TASK_CONCEPTS, taskId) ? TASK_CONCEPTS[taskId] : undefined;
  if (!meta) throw new Error(`No concept mapping for PAN task: ${taskId}`);

  const userContent = `Task: ${meta.title}\nConcept to test: ${meta.concept}\n\nGenerate a hard multiple-choice question. Wrong answers should be plausible misconceptions a student might actually hold.`;

  try {
    const raw = await sendLLMRequest({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      maxTokens: 400,
      temperature: 0.7,
    });

    const jsonMatch = raw.match(/\{[\s\S]*"question"[\s\S]*"choices"[\s\S]*"correctIndex"[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.question || !Array.isArray(parsed.choices) || parsed.choices.length !== 4 || typeof parsed.correctIndex !== "number")
      throw new Error("Invalid shape");
    validateGeneratedQuestion(parsed);
    return { question: parsed.question, choices: parsed.choices, correctIndex: parsed.correctIndex, source: "ai" };
  } catch (err) {
    console.warn(`[PanKnowledgeCheck] LLM generation failed for ${taskId} (${(err as Error).message}). Using static fallback.`);
    const fallback = PAN_STATIC_FALLBACKS[taskId] || getStaticFallbackQuestion(taskId);
    if (fallback) return { ...fallback, source: "bank" };
    throw new Error("Knowledge check question is temporarily unavailable.");
  }
}
