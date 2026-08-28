# FortiSim Architecture

FortiSim is a dual-vendor firewall simulator (Fortinet FortiOS and Palo Alto Networks PAN-OS) built as an npm workspace monorepo.

## Project Structure
The project is broken down into three main packages:

1. **@fortisim/engine** (`packages/engine/`)
   - Pure TypeScript library (zero dependencies).
   - Contains all grading evaluators, scenario definitions, and rule-matching logic (first-match-wins) for firewall policies, NAT, zones, and interfaces.
   - Authoritative source of truth for all exercises.

2. **@fortisim/backend** (`packages/backend/`)
   - Express.js API server.
   - **Controllers**: Handle HTTP request/response formatting (`src/controllers/`).
   - **Routes**: Define API endpoints and map them to controllers (`src/routes/`).
   - **Services**: Communicate with external APIs (like NVIDIA NIM Llama 3.1 70B) to generate Socratic AI Tutor feedback and multiple-choice Knowledge Checks (`src/services/`).
   - **Middlewares**: Custom request handling (e.g., error handling, logging) (`src/middlewares/`).

3. **@fortisim/frontend** (`packages/frontend/`)
   - React SPA powered by Vite.
   - **Components**: Reusable UI elements (buttons, modals, 3D canvases) (`src/components/`).
   - **Pages**: Top-level views corresponding to firewall tabs (e.g., Security Policy, Zones) (`src/pages/`).
   - **Hooks**: Custom React hooks for session management and API interactions (`src/hooks/`).
   - **Assets**: Static files (images, 3D `.glb` models) (`src/assets/`).

## AI Integration
The AI Tutoring and Knowledge Checks rely on NVIDIA NIM endpoints. When a student fails a graded submission, the backend strips the correct answer, extracts the failing checks, and prompts an LLM with specific instructions NOT to reveal the direct answer, but rather to guide the student conceptually.
