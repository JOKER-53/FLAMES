# Contributing to FLAMES

Follow the [Code of Conduct](CODE_OF_CONDUCT.md). Create a focused branch from `main`, make the change, and open a pull request describing its behavior and validation.

## Development

Use Node 22.13+ and npm. Install workspace dependencies with `npm ci` from the root. Copy `packages/backend/.env.example` to `packages/backend/.env`, then run `npm run backend:dev` and `npm run frontend:dev` in separate terminals. The app opens at http://localhost:5173.

See [repository structure](docs/REPOSITORY_STRUCTURE.md) for file placement and [application flow](docs/APPLICATION_FLOW.md) for existing behavior. Never commit credentials or SQLite data. Rebuild the engine when changing shared code used by the running backend.

## Verification

Run `npm run verify` before submitting. It builds the engine/API, runs engine, backend, and frontend tests, type-checks the frontend, and builds the SPA. API tests require permission to open a temporary localhost listener. Add regression coverage for behavior changes; use manual browser checks for visual and WebGL changes.

Update current documentation when routes, scripts, environment settings, or behavior change. Preserve public routes and engine exports during file moves. Historical documents belong in `docs/archive/`.

Use a clear commit message. In the pull request, explain the problem, resulting behavior, tests performed, and remaining limitations. Reference relevant issues and include screenshots for visual changes.
