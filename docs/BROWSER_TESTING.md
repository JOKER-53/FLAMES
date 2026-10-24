# Browser regression checks

Run `npm run build`, install Chromium with `npx playwright install chromium`, then run `npm run test:browser`. CI installs browser system dependencies with `--with-deps`. If Chromium is already installed elsewhere, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its executable path.

The fixture starts an API on `127.0.0.1:4101` and Vite on `127.0.0.1:4173`. Both ports must be free. It creates temporary SQLite databases, seeds an ephemeral instructor only for these tests, disables live provider credentials, and removes its data after shutdown. It does not load the backend `.env` file or open existing runtime databases. Do not point these workflows at a deployed platform; they author fixture content and register fixture students.

`tests/browser/workflows.spec.mjs` exercises real UI/API behavior:

- Instructor sign-in, visual reading authoring/publication, student registration/completion and separate-device progress.
- Persisted light/dark preference and a narrow network dialog with reduced motion, focus trapping and Escape restoration.
- Guest route autosave across reload, followed by a fresh student account with no inherited guest configuration.
- A held initial catalog response arriving after a newer publication, ensuring fresh content stays visible.
- A completion-write outage after successful grading, ensuring the sync warning appears without claiming the write succeeded.

The test runner uses one worker and retains a trace on failure. `test-results/` and `playwright-report/` are ignored. These checks complement engine/API tests; they do not replace real-device WebGL/socket-alignment checks or authenticated AWS/Academy deployment acceptance.
