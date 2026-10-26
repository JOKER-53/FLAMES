# Browser regression checks

Build first, install the browsers and run one suite at a time from the repository root:

```bash
npm run build
npx playwright install chromium firefox
npm run test:browser
PLAYWRIGHT_BROWSER=firefox npm run test:browser
```

CI installs browser system dependencies with `--with-deps` and runs both browsers. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` can point to an existing local Chromium-compatible executable. Firefox is selected through `PLAYWRIGHT_BROWSER=firefox`.

## Isolation and artifacts

The fixture in `scripts/browser-server.cjs` starts an API on `127.0.0.1:4101` and Vite on `127.0.0.1:4173`. Both ports must be free. It creates temporary SQLite databases and an ephemeral instructor, disables live AI credentials and cleans up its data/servers on shutdown. It does not load the backend `.env` or open development runtime databases. Do not run these authoring/registration workflows against a deployment or run separate suites concurrently on the shared ports.

General learning fixtures explicitly enable guide visibility. Dedicated visibility tests hide/show it and restore their fixture setting; real installations remain hidden by default. Browser traces and reports belong in ignored `test-results/` and `playwright-report/`, not source folders.

## Workflow coverage

| File in `tests/browser/` | Exercises |
| --- | --- |
| `workflows.spec.mjs` | Instructor publication, student registration/completion, account isolation, autosave, catalog races, sync/API failures, five configuration families, packet traces and network interactions |
| `topology.spec.mjs` | Every native task's topology at desktop/mobile widths and updates from student rules |
| `lesson-layout.spec.mjs` | Compact introductions, readable scenarios, available course/module width and responsive lesson rows |
| `studio.spec.mjs` | Search, identity-safe duplication and private revision comparison |
| `learning.spec.mjs` | Study paths, chapter/task navigation, search, examples and light/dark accessibility |
| `learning-visibility.spec.mjs` | Admin show/hide, student direct routes/study links, persistent setting and administrator previews |
| `credits.spec.mjs` | Header access, contributor/organization destinations, original photo loading, themes and mobile headers |
| `accessibility.spec.mjs` | Representative student/admin WCAG scans, named controls, keyboard skip/navigation and mobile drawer focus |
| `pan-interface-model.spec.mjs` | Real PA-220 socket picking, interface editing/autosave/topology, shared model transport and accessible no-WebGL editing |
| `hardware.spec.mjs` | Real software-WebGL loading/retry/cache, reduced-motion idle behavior and useful no-WebGL keyboard references |

Firefox intentionally skips actual model-rendering cases (two hardware-reference cases and the PA-220 interface-model case); software-WebGL model tests run in Chromium. Firefox still runs fallback/keyboard/layout coverage. Native topology coverage is generated from curriculum so new lessons enter the check automatically.

## Limits and manual acceptance

Automated WCAG scans are not accessibility certification. Review actual screen readers, browser zoom, touch targets and assistive technologies using [accessibility guidance](ACCESSIBILITY.md). Software-WebGL evidence does not prove real-device GPU compatibility, performance or calibrated socket alignment. Actual-device model acceptance remains necessary after model changes.

Fixtures intentionally avoid live AI and remote Academy/AWS dependencies. Verify real provider credentials, parent login/progress/draft round trips, deployment storage, HTTPS and restore/rollback separately in the target environment. See the [release checklist](RELEASE_CHECKLIST.md).
