// ============================================================================
// One "hard question" per task, across all three tracks (Firewall Policy,
// Interface Config, Port Assignment), keyed by scenario id. Each question
// tests the underlying networking/security concept the task is built around,
// not just terminology. Answering correctly is an alternate path to
// completing the task (the hands-on configuration exercise remains the
// other, unchanged path) — see HardQuestionCard.tsx on the frontend.
// ============================================================================

export interface HardQuestion {
  question: string;
  choices: string[];
  correctIndex: number;
}

export const HARD_QUESTIONS: Record<string, HardQuestion> = {
  // ---------------- Port Assignment track ----------------
  "port-assignment-01": {
    question:
      "A firewall has three zones: WAN, LAN, and DMZ. A public web server needs to be reachable from the internet but must not be able to freely reach the internal LAN if it's ever compromised. Which zone should its port be assigned to?",
    choices: ["WAN", "LAN", "DMZ", "It doesn't matter — zones are just labels"],
    correctIndex: 2,
  },
  "port-multi-dmz-01": {
    question:
      "A site hosts two public-facing servers (web and mail) that should stay isolated from each other in case one is compromised, while both remain in the DMZ. What's the most defensible port design?",
    choices: [
      "Put both servers on the same DMZ port/segment",
      "Assign each server its own dedicated DMZ port, so compromising one doesn't automatically expose the other on the same segment",
      "Put one server in LAN and the other in WAN",
      "Combine DMZ, WAN, and LAN onto a single shared port",
    ],
    correctIndex: 1,
  },
  "port-redundant-wan-01": {
    question:
      "A branch office has two ISPs: WAN1 (primary) and WAN2 (backup). If both are simply assigned as WAN-zone ports with nothing else configured, what real risk does this leave unaddressed?",
    choices: [
      "There's no risk — redundancy is automatic once two ports are in the WAN zone",
      "Assigning two ports to the WAN zone doesn't by itself define failover behavior or which link is preferred — that requires additional routing/SD-WAN configuration beyond zone assignment",
      "WAN2 will always be used first since it was configured second",
      "A firewall cannot have two WAN-zone ports at the same time",
    ],
    correctIndex: 1,
  },
  "port-large-office-01": {
    question:
      "In a larger office design where ports 1-6 are all internal LAN ports feeding different departments, what's the main security weakness of treating all six as one flat LAN zone instead of segmenting them further?",
    choices: [
      "There is no weakness — more ports always means more security",
      "Every department can reach every other department by default, so one compromised workstation can directly attack systems in other departments with no policy in between",
      "LAN ports can't exceed four on any firewall",
      "Ports 1-6 must always be WAN ports, never LAN",
    ],
    correctIndex: 1,
  },
  "port-position-trap-01": {
    question:
      "This task warns 'Don't Assume by Position.' Why is it risky to assign a port's zone purely from its physical position/number on the chassis, without checking what it's actually connected to?",
    choices: [
      "Physical port numbering always matches logical grouping on every vendor's device",
      "Port layout and numbering can be inconsistent across models, so assuming a port is 'obviously LAN' just because nearby ports are LAN can silently misassign a WAN or DMZ link",
      "Port position never matters, only the color of the cable",
      "Only DMZ ports are numbered — LAN and WAN ports aren't",
    ],
    correctIndex: 1,
  },

  // ---------------- Interface Config track ----------------
  "interface-ip-01": {
    question:
      "You're assigning 10.0.1.1/24 to one interface and 10.0.2.1/24 to another. What's the main reason these must be different subnets rather than the same one?",
    choices: [
      "Two routed interfaces on the same firewall can't share a subnet without an addressing/routing conflict — each needs its own distinct subnet",
      "It's purely a naming convention with no functional requirement",
      "/24 always means an interface is internet-facing",
      "Subnets only affect DNS, not routing",
    ],
    correctIndex: 0,
  },
  "interface-access-01": {
    question:
      "A WAN-facing interface has PING, HTTPS, SSH, and HTTP all enabled for administrative access. What's the security problem, specifically because this is the WAN interface?",
    choices: [
      "There's no problem — enabling every access method makes management easiest",
      "Exposing SSH/HTTPS admin access directly on the interface reachable from the entire internet massively increases attack surface against the management plane; admin access should generally stay on trusted internal interfaces",
      "HTTP and HTTPS can never both be enabled at the same time",
      "PING must always be disabled on every interface, regardless of zone",
    ],
    correctIndex: 1,
  },
  "interface-custom-01": {
    question:
      "This branch's DMZ uses a /26 subnet instead of the usual /24, even though both could technically host the same servers. Why might an admin deliberately choose the smaller /26 for a DMZ with only a few hosts?",
    choices: [
      "A /26 subnet supports far fewer usable addresses than a /24, which keeps the DMZ's address space and broadcast domain scoped to roughly what's actually needed, reducing exposed surface if the segment is scanned",
      "/26 and /24 are functionally identical — the number is just a labeling preference",
      "/26 subnets can only be assigned to WAN interfaces, never to a DMZ",
      "Smaller subnets like /26 automatically make network traffic faster",
    ],
    correctIndex: 0,
  },

  // ---------------- Firewall Policy track ----------------
  "web-server-access-01": {
    question:
      "You need to allow the internet to reach a DMZ web server over HTTPS only — nothing else. Which rule design is correct?",
    choices: [
      "Source: WAN/any, Destination: DMZ web server, Service: HTTPS, Action: ACCEPT — with everything else denied",
      "Source: DMZ, Destination: WAN, Service: HTTPS, Action: ACCEPT",
      "Source: WAN/any, Destination: LAN, Service: HTTPS, Action: ACCEPT",
      "Source: WAN/any, Destination: DMZ web server, Service: ANY, Action: ACCEPT",
    ],
    correctIndex: 0,
  },
  "db-lockdown-01": {
    question:
      "A database server should only ever be reached by the application server, on one specific port — never directly from the internet or the general LAN. What's the most defensible policy design?",
    choices: [
      "One broad ACCEPT rule from LAN/any to the DB server on any port, since it's already inside the network",
      "A narrow ACCEPT rule scoped to the application server's address and the specific database port only, with everything else denied",
      "ACCEPT from WAN to the DB server, in case a remote admin needs access",
      "No rules are needed, since the DB server isn't in the DMZ",
    ],
    correctIndex: 1,
  },
  "dmz-multi-service-01": {
    question:
      "A DMZ hosts web and mail servers, each needing different inbound ports from WAN, but neither should freely reach the internal LAN. What's the key design principle here?",
    choices: [
      "One rule allowing DMZ to LAN on any service, since DMZ servers are trusted once deployed",
      "Separate, narrowly-scoped ACCEPT rules per service from WAN into DMZ, with no general ACCEPT rule for DMZ-to-LAN traffic — DMZ hosts should be treated as compromisable",
      "A single ACCEPT-all rule between all three zones, for simplicity",
      "DMZ services don't need inbound rules since they're public by default",
    ],
    correctIndex: 1,
  },
  "inter-zone-trust-01": {
    question:
      "If a rule allows DMZ → LAN on 'any' service, and a DMZ web server is compromised, what does that rule do to the internal network's security, regardless of how well-configured the LAN hosts themselves are?",
    choices: [
      "Nothing — zones are logically separate no matter what rules exist between them",
      "It gives an attacker a direct, unrestricted pivot path from the compromised DMZ host into the LAN, erasing the isolation the DMZ was meant to provide",
      "It only matters if the LAN hosts lack antivirus software",
      "Inter-zone rules only affect outbound internet traffic, never internal zones",
    ],
    correctIndex: 1,
  },
  "full-network-policy-01": {
    question:
      "When writing a full policy set covering WAN, LAN, and DMZ on a firewall that evaluates rules top-down and stops at the first match, how should specific vs. general rules typically be ordered?",
    choices: [
      "Order doesn't matter — the firewall checks every rule and combines the results",
      "More specific rules (narrow source/destination/service) should sit above broader rules, since a broad rule placed too early can silently shadow a more specific one below it",
      "General deny-all rules should always be placed first, above everything else",
      "Rule order only affects logging, not actual traffic decisions",
    ],
    correctIndex: 1,
  },
  "multi-system-block-01": {
    question:
      "You need to block one specific system (System 2) from a service while still allowing every other system on the same subnet to access it. Given first-match-wins evaluation, what's the correct approach?",
    choices: [
      "Place a DENY rule scoped to System 2's address ABOVE the general ACCEPT rule for the rest of the subnet",
      "Place a DENY rule scoped to System 2's address BELOW the general ACCEPT rule for the subnet",
      "Block the entire subnet, since one exception doesn't matter much",
      "Deny rules never need to be more specific than allow rules",
    ],
    correctIndex: 0,
  },
  "web-filter-instagram-01": {
    question:
      "You need to block one specific website (e.g. Instagram) for LAN users while leaving all other HTTPS browsing untouched. What mechanism is actually designed for this?",
    choices: [
      "A standard ACCEPT/DENY rule based only on source IP and port, since IP-based rules can identify any website",
      "A web-filtering profile applied to the relevant policy, which can match and block specific domains regardless of the destination server's IP",
      "Blocking all of TCP port 443 for the entire LAN",
      "Renaming the LAN zone to 'restricted'",
    ],
    correctIndex: 1,
  },
  "server-segmentation-01": {
    question:
      "Workstations and servers sit on two separate subnets. Workstations can reach servers over HTTP, but servers are blocked from initiating connections back to workstations. Why is that one-way asymmetry a deliberate design rather than an oversight?",
    choices: [
      "It's a mistake — access should always be symmetric between subnets",
      "Servers are more exposed to compromise (e.g. via a vulnerable web app), so blocking server-initiated connections back to workstations limits how far an attacker can pivot after breaching a server",
      "Workstations are always more trusted than servers in every network",
      "HTTP traffic can only physically flow in one direction",
    ],
    correctIndex: 1,
  },
  "guest-isolation-01": {
    question:
      "Guest Wi-Fi and the corporate LAN share the same physical zone but use different subnets. Guests should reach the internet but never the corporate subnet, and vice versa. What single design choice makes this enforceable at the firewall policy level?",
    choices: [
      "Physically separating the Wi-Fi access points — firewall rules alone can't achieve this",
      "Explicit DENY rules between the guest and corporate subnets in both directions, plus an ACCEPT rule for guest-to-WAN only, even though both subnets share a zone",
      "Give guest devices weaker Wi-Fi passwords",
      "Isolation is automatic once two different subnets exist — no policy is required",
    ],
    correctIndex: 1,
  },
  "multi-dmz-access-01": {
    question:
      "A DMZ has a web server (HTTPS from WAN), a mail server (SMTP from WAN), and a management server that should only ever accept SSH from the internal LAN, never from WAN. How should that management-server requirement be expressed in policy?",
    choices: [
      "One broad rule allowing both WAN and LAN to reach the management server over SSH, for convenience",
      "A rule allowing only LAN → management server over SSH, with no corresponding WAN → management server SSH rule at all",
      "Allow WAN → management server over SSH, since firewalls block brute-force attempts automatically",
      "SSH doesn't need a policy, since it's internal-only by default",
    ],
    correctIndex: 1,
  },
};
