# Content studio verification — 2026-10-23

Implemented `/admin` for authorized FLAMES instructors and verified Academy admins. It supports persistent draft modules, ordered lessons, instructions, multiple-choice and short-answer tasks, preview, publishing, unpublishing, and draft deletion. Student courses merge published content with the built-in curriculum. Task grading runs on the server and answer keys are omitted from public responses.

Validation performed:

- `npm run verify`: 39 engine, 44 backend, and 23 frontend tests passed (106 total), plus API compilation, frontend type checking, and production SPA build.
- Content API tests cover guest/student denial, draft privacy, answer-key redaction, grading/normalization, custom progress and vendor isolation, stale revision conflicts, publication snapshots, unpublish/republish behavior, invalid publishing, reading-only lessons, deletion restrictions, and SQLite restart persistence.
- Academy tests cover verified admin authoring permissions, dynamic published-lesson validation/totals, and failure behavior when a configured catalog is unavailable.
- Frontend tests cover catalog merging without mutating built-ins, lesson route construction, and ID generation on HTTP origins lacking `crypto.randomUUID`.
- A headless Chromium check against the actual Docker-backed `http://localhost:5173` passed module creation, lesson/task editing, draft save, preview, publication, student course visibility, wrong-answer retry, successful completion, reload persistence, answer-key privacy, guest rejection, and mobile width. The instructor mobile header overflow found during the check was fixed.
- Rebuilt/recreated the development backend with the administrator setup utility included. Verified `docker compose exec -T backend npm --prefix /app run admin:create -- --help`; creation itself remains an interactive owner action with hidden password entry.
- Development and Academy Compose definitions validate. Markdown links and `git diff --check` pass.

Temporary browser-test administrator accounts and sample modules were removed. No default administrator password was installed, and no college Academy deployment was changed. Live MySQL/Academy deployment acceptance remains an operator task. The existing lazy-loaded Three.js chunk-size warning remains.

See [administrator setup](ADMIN_CONTENT.md) for first access and authoring instructions.
