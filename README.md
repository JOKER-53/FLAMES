# FLAMES - Firewall Learning And Monitoring Engine Simulater

>An interactive web-based training platform where students learn firewall and
>network configuration by working in a FortiOS and PAN-OS styled interfaces, get graded
>on the *behavior* and *correctness* of their configuration (not exact text
>matching), and receive Socratic, non-answer-revealing hints from an AI tutor
>when they get something wrong.

Built for classroom use alongside a real FortiGate 6000F lab unit, so the
visual language and workflow are intentionally modeled on the real FortiOS
web admin console.

## What students can practice? 

### Firewall Policy (5 scenarios) to learn
Students configure firewall policies — source/destination addresses,
services, actions, logging — and the engine runs a battery of simulated
test packets against their configuration to verify the resulting traffic
behavior matches what the exercise requires.

1. **Web Server Access** — interface direction, service matching, default-deny
2. **Database Server Lockdown** — rule-order sensitivity (first-match-wins)
3. **DMZ Multi-Service** — configuring multiple required services correctly
4. **Inter-Zone Trust** — asymmetric zone rules (one direction allowed, not the reverse)
5. **Full Network Policy** — composing a complete multi-zone policy set

### Network Interfaces (3 scenarios)
Students configure interface IP addresses, subnets, and administrative
access settings for the WAN/LAN/DMZ zones.

1. **Interface IP Assignment** — assigning correct IPs and subnets
2. **Administrative Access Control** — restricting management protocols per zone
3. **Full Interface Setup** — complete interface configuration from scratch

### Port Assignment (5 scenarios)
Students assign physical chassis ports to logical zones using a visual
FortiGate-style chassis diagram.

1. **Basic Port Assignment**
2. **Multi-Server DMZ**
3. **Redundant WAN Uplinks**
4. **Larger Office Network**
5. **Don't Assume by Position**

All exercises are accessible at any time — there is no locked progression.
Every submission is graded immediately, and on a failed submission an AI
tutor (via NVIDIA NIM) gives conceptual, non-prescriptive feedback: it
explains *why* something is wrong without ever stating the correct value.

## Project structure
See `Architecture.md` for a detailed breakdown of the new MVC architecture.

```mermaid
flowchart TB
    classDef frontend fill:#333,stroke:#666,stroke-width:2px,color:#fff;
    classDef backend fill:#222,stroke:#444,stroke-width:2px,color:#fff;
    classDef engine fill:#8e44ad,stroke:#fff,stroke-width:2px,color:#fff;
    classDef keys fill:#c0392b,stroke:#e74c3c,stroke-width:2px,color:#fff,stroke-dasharray: 5 5;
    classDef external fill:#2980b9,stroke:#3498db,stroke-width:2px,color:#fff;
    classDef process fill:#16a085,stroke:#2ecc71,stroke-width:2px,color:#fff;

    subgraph FE [Frontend: React + Vite]
        UI[FortiOS Console UI]:::frontend
        LocEng[Local Engine Instance]:::engine
    end

    subgraph BE [Backend: Express API]
        API[API Endpoints]:::backend
        Eval(Evaluate):::process
        Ret(Retrieve):::process
        Diag(Request Diagnostics):::process
        Key[(Answer Keys & NIM API Key)]:::keys
        ServEng[Server Engine Instance]:::engine
    end

    subgraph EXT [External]
        NIM[NVIDIA NIM AI Service]:::external
    end

    UI -- User Submission --> API
    UI -- Simulate --> LocEng
    UI -- Result --> API
    
    API --> Eval
    API --> Ret
    API --> Diag
    
    Eval --> ServEng
    Ret --> Key
    Diag --> NIM
    NIM -- Feedback --> API
```
## Running locally

Requires Docker and Docker Compose.

```bash
cp packages/backend/.env.example packages/backend/.env
# edit packages/backend/.env and set a real NVIDIA_NIM_API_KEY

docker compose up
```


Frontend: http://localhost:5173
Backend health check: http://localhost:4000/api/health

The frontend dev server proxies `/api` requests to the backend container
over the Docker Compose network (`http://backend:4000`), not `localhost`,
since the proxy config runs inside the frontend container.

## Why answer keys and API keys never reach the browser

This is a structural guarantee, not just a convention:

- `getStudentFacingScenario()` in the backend strips `expectedOutcomes`
  (the answer key) before any scenario is sent to the frontend.
- The AI feedback service only ever receives a `GradingReport` —
  diagnostic facts about what the *student's own* configuration did —
  never the scenario's correct values. The AI cannot leak what it was
  never given.
- The NVIDIA NIM API key lives only in the backend's `.env` file and is
  never included in any response sent to the client.

See `docs/ARCHITECTURE.md` for the full request flow diagram.

## Design principles this project follows

- **Minimal, focused scope.** This is a teaching tool for firewall and
  network fundamentals — not an attempt to replicate every FortiOS
  feature. Sections not yet built (Security Profiles, VPN, SD-WAN, etc.)
  are deliberately left out rather than added as broken placeholders.
- **Behavioral grading over exact-match grading.** Firewall policy
  scenarios are graded on the resulting traffic behavior (does the right
  traffic get accepted/denied), not on matching a specific configuration
  text — multiple valid configurations should all pass.
- **One evaluator, two consumers.** The same matching/grading logic
  backs both the student's instant local feedback and the backend's
  authoritative grade, so they can never disagree.
- **AI as a Socratic guide, never an answer key.** The AI tutor is
  structurally prevented from seeing correct values, not just prompted
  not to reveal them.

## Tech stack

- **Engine:** TypeScript, no runtime dependencies
- **Backend:** Node.js, Express
- **Frontend:** React, Vite, Tailwind CSS, React Router
- **AI:** NVIDIA NIM (Llama 3.1 70B Instruct)
- **Infrastructure:** Docker Compose, npm workspaces monorepo
