# FortiSim

A dual-vendor firewall training lab with FortiOS-style and PAN-OS-style consoles. It simulates configuration and traffic checks; it does not connect to or configure real firewalls.

## What works

- FortiGate: 11 policy exercises including a final, three interface exercises plus a final, five port exercises plus a final, and a static-routing exercise.
- Palo Alto: five security exercises plus a final, three zone exercises plus a final, three NAT exercises plus a final, interface practice, port assignment, and App-ID reference.
- FortiGate hardware: clean Explore mode, empty-by-default cable practice, seven cable categories across 13 sockets, manual rotation, reset, and keyboard-accessible port controls. Power, USB, and RJ-45 have distinct connector shapes.
- Optional student accounts, password hashing, expiring HTTP-only sessions, SQLite-saved completion across devices, and an instructor roster. Guests retain device-local completion.
- Optional NVIDIA NIM tutoring and one-use generated knowledge questions. Grading remains usable when AI is unavailable.
- Responsive navigation and account/classroom screens; page-level code splitting, error recovery, tests, and CI.

## Run locally

Use Node 22.13 or newer and npm. No browser automation or extra browser installation is required.

```bash
npm ci
cp packages/backend/.env.example packages/backend/.env
npm run backend:dev
```

In a second terminal:

```bash
npm run frontend:dev
```

Open http://localhost:5173. The development proxy defaults to 127.0.0.1:4000. For Docker networking it uses API_PROXY_TARGET=http://backend:4000.

AI settings are optional. Never put an API key in a VITE_ variable. To create the first instructor, set INSTRUCTOR_EMAIL and a unique 12–128 character INSTRUCTOR_PASSWORD in the backend environment before starting. The bootstrap does not change an existing account's password or promote students. Remove both bootstrap fields from the environment after creating the account.

For development containers, copy the example environment file and run `docker compose up --build`. Ports bind to localhost; completion uses a persistent volume. Engine source edits in Docker require rebuilding its compiled output; frontend source edits hot-reload.

## Verify

```bash
npm run verify
```

This builds the shared engine and API, runs engine/API/render-smoke regression tests, type-checks the frontend, and builds the production SPA. API tests open a temporary localhost listener. CI also validates the production Compose configuration and builds deployment images.

Production setup: [deployment guide](docs/DEPLOYMENT.md). Architecture: [architecture guide](docs/ARCHITECTURE.md). Changes and verification: [upgrade report](docs/UPGRADE_2026-10-02.md).

## Teaching and security boundaries

Completion is student-reported practice progress, not a certified exam score. Policy/interface/port grading uses backend endpoints; Palo Alto security, zones, and NAT use a shared engine and server grading. Some reference/practice tools, including routing and Palo Alto interface practice, evaluate locally. Configuration drafts are not saved to the account; only completion markers are synchronized.

Scenario definitions used by browser exercises are included in frontend bundles. The scenario API removes expected outcomes, but this is not an answer-key secrecy guarantee. Tutor prompts request conceptual hints; they cannot guarantee that an LLM never supplies an answer. Secrets stay in backend environment variables, and provider requests have a 15-second timeout.

The PAN model is intentionally simplified: HA and Management are synthetic practice buckets rather than native security-zone types, NAT does not simulate a full packet/session pipeline, and App-ID is represented by a selected application label. NAT guidance distinguishes pre-NAT policy zones from post-NAT security zones; see [Palo Alto's NAT policy documentation](https://docs.paloaltonetworks.com/ngfw/networking/nat/nat-policy-rules).

A public deployment still needs HTTPS, backup/restore operations, an operator-defined account recovery process, and visual acceptance on actual devices. No deployment or GitHub push is performed by these changes.
