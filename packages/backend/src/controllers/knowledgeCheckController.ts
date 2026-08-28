import { Request, Response } from "express";
import { generateKnowledgeCheck } from "../services/nimKnowledgeCheck";

const TASK_CONCEPTS: Record<string, { title: string; concept: string }> = {
  // Port Assignment
  "port-assignment-01": {
    title: "Basic Port Assignment",
    concept: "Why public-facing servers belong in a DMZ zone rather than the LAN, and what isolation guarantees a zone boundary actually provides vs. what it doesn't.",
  },
  "port-multi-dmz-01": {
    title: "Multi-Server DMZ",
    concept: "Lateral movement risk when multiple servers share a single DMZ segment vs. dedicated ports — and why segment isolation matters even inside the same zone.",
  },
  "port-redundant-wan-01": {
    title: "Redundant WAN Uplinks",
    concept: "What dual-WAN zone assignment does and does NOT configure automatically — specifically that failover/routing policy is separate from zone membership.",
  },
  "port-large-office-01": {
    title: "Larger Office Network",
    concept: "Security consequences of a flat LAN design with many ports in a single zone — blast radius of a single compromised host and why micro-segmentation matters.",
  },
  "port-position-trap-01": {
    title: "Don't Assume by Position",
    concept: "Why physical port position on a chassis is an unreliable indicator of intended zone — and the misassignment risks that follow from position-based assumptions.",
  },
  // Interface Config
  "interface-ip-01": {
    title: "Interface IP Assignment",
    concept: "Why each routed interface must be on a distinct subnet — routing conflicts, ARP behaviour, and what breaks when two interfaces share an overlapping address space.",
  },
  "interface-access-01": {
    title: "Administrative Access Control",
    concept: "Attack surface created by enabling management protocols (SSH, HTTPS) on a WAN-facing interface — and the principle of restricting admin plane access to trusted zones only.",
  },
  "interface-custom-01": {
    title: "Custom Addressing Scheme",
    concept: "Why a smaller subnet prefix (e.g. /26 vs /24) is deliberately chosen for a DMZ with few hosts — address space scoping, broadcast domain size, and exposure reduction.",
  },
  // Firewall Policy
  "web-server-access-01": {
    title: "Web Server Access",
    concept: "Correct directionality and service scope for a WAN-to-DMZ ACCEPT rule — interface direction, service matching, and why 'any' service is dangerous even for a single server.",
  },
  "db-lockdown-01": {
    title: "Database Server Lockdown",
    concept: "First-match-wins rule ordering when a specific DENY must take effect before a broader ACCEPT — and why rule position, not just content, determines behaviour.",
  },
  "dmz-multi-service-01": {
    title: "DMZ Multi-Service",
    concept: "How to allow multiple distinct inbound services to a DMZ host while preventing the DMZ from initiating connections into the LAN — the semi-trusted zone model.",
  },
  "inter-zone-trust-01": {
    title: "Inter-Zone Trust",
    concept: "What a DMZ-to-LAN ACCEPT rule actually enables for an attacker who has compromised a DMZ host — pivot paths and why asymmetric zone rules matter.",
  },
  "full-network-policy-01": {
    title: "Full Network Policy",
    concept: "Ordering specific rules above general rules in a first-match-wins engine — shadowing, rule precedence, and composing a complete multi-zone policy without gaps.",
  },
  "multi-system-block-01": {
    title: "Block System 2",
    concept: "Placing a narrow DENY rule above a broad ACCEPT in first-match-wins evaluation to carve out one host from a subnet-wide allow — and what breaks if the order is reversed.",
  },
  "web-filter-instagram-01": {
    title: "Block Instagram",
    concept: "Why IP/port rules cannot reliably block a specific HTTPS domain — and what web filtering profiles do that standard policy rules cannot.",
  },
  "server-segmentation-01": {
    title: "Server Segmentation",
    concept: "Deliberate one-way asymmetric access between subnets — why blocking server-initiated connections to workstations limits attacker pivot range after a server is compromised.",
  },
  "guest-isolation-01": {
    title: "Guest Network Isolation",
    concept: "Enforcing isolation between two subnets that share a zone via explicit bidirectional DENY rules — and why shared zone membership doesn't imply automatic isolation.",
  },
  "multi-dmz-access-01": {
    title: "Multi-Server DMZ Access Control",
    concept: "Restricting a management server to LAN-only SSH access while other DMZ servers accept WAN traffic — and why the absence of a WAN rule is itself the security control.",
  },
};

export const getKnowledgeCheck = async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const meta = TASK_CONCEPTS[taskId];

  if (!meta) {
    res.status(404).json({ error: `No concept mapping for task: ${taskId}` });
    return;
  }

  try {
    const question = await generateKnowledgeCheck(taskId, meta.title, meta.concept);
    res.json(question);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
};
