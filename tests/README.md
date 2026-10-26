# Test ownership

Package tests live with the behavior they exercise: `packages/engine/test`, `packages/backend/test`, and `packages/frontend/test`. Cross-package browser workflows live in `tests/browser/`.

From the root, `npm run verify` builds the engine/API, runs all package tests, type-checks the frontend and builds the SPA. Use `npm run docs:check` for active Markdown links. Generate documentation and the Academy contract after editing their sources.

Browser setup and execution:

```bash
npm run build
npx playwright install chromium firefox
npm run test:browser
PLAYWRIGHT_BROWSER=firefox npm run test:browser
```

The browser runner starts isolated servers through `scripts/browser-server.cjs`, creates temporary databases and fixture identities, disables live AI credentials and cleans up on exit. It explicitly enables guides for general learning fixtures; dedicated visibility regressions test administrator hide/show behavior and restore fixture settings. It never opens the developer's account/content databases.

Do not run separate browser suites concurrently: they share fixture ports 4101/4173. `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chromium` overrides the local Chromium executable when needed. Firefox intentionally skips the two software-WebGL model rendering cases; fallback/keyboard checks still run. Actual-device rendering and assistive-technology acceptance remain manual.

`test-results/` and `playwright-report/` are ignored artifacts. See [browser guide](../docs/BROWSER_TESTING.md) and [accessibility acceptance](../docs/ACCESSIBILITY.md).
