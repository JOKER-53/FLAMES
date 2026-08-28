// ============================================================================
// AI-generated knowledge check questions for PAN-OS exercises.
// Returns a fresh MCQ on each call — one attempt only.
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
}

const TASK_CONCEPTS: Record<string, { title: string; concept: string }> = {
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
  "pan-nat-final": { title:"NAT Policy Final", concept:"Complete PAN-OS NAT design with SNAT for outbound, DNAT for services, and static NAT — plus the critical rule that security policy is evaluated before NAT." },
  // Interfaces
  "pan-iface-01": { title:"Interface Configuration", concept:"How Palo Alto interface types (Layer2, Layer3, Virtual Wire, Tap) work, and why an interface must be assigned to a zone before security policies apply." },
};

export async function generatePanKnowledgeCheck(taskId: string): Promise<GeneratedQuestion> {
  const meta = TASK_CONCEPTS[taskId];
  if (!meta) throw new Error(`No concept mapping for PAN task: ${taskId}`);

  const userContent = `Task: ${meta.title}\nConcept to test: ${meta.concept}\n\nGenerate a hard multiple-choice question. Wrong answers should be plausible misconceptions a student might actually hold.`;

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
      max_tokens: 400,
      temperature: 0.7,
    }),
  });

  if (!response.ok) throw new Error(`NIM API error: ${response.status}`);

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content ?? "";

  try {
    const jsonMatch = raw.match(/\{[\s\S]*"question"[\s\S]*"choices"[\s\S]*"correctIndex"[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.question || !Array.isArray(parsed.choices) || parsed.choices.length !== 4 || typeof parsed.correctIndex !== "number")
      throw new Error("Invalid shape");
    return parsed;
  } catch {
    throw new Error(`Failed to parse question: ${raw.slice(0, 100)}`);
  }
}
