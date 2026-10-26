# Academy integration

FLAMES supports two runtime modes. `standalone` retains its own optional accounts and SQLite completion; `academy` delegates identity and saved completion to the parent Academy project. Set the mode on the **backend**, not with a browser query parameter.

## Inspected source and college host

The public reference is [liyander/Incogn1tr1x-Academy](https://github.com/liyander/Incogn1tr1x-Academy), `main` commit `e7b04c60a92fe81c40130dbeae369fd69cebbee5` (2026-10-21). Its backend is Express/MySQL, `authenticate` validates bearer tokens, and `/api/auth/me` returns the token identity. The frontend reads its session through `getAuthSession()` and calls APIs through `src/services/api.js`.

The originally supplied college frontend was `http://110.172.151.108:5173/`. A previous read-only check is historical evidence only; the user later reported that server unavailable and planned AWS hosting. No current deployment availability, deployed source revision or backend configuration is established by this repository. On the server, run `git rev-parse HEAD` inside the actual Academy checkout and compare the middleware, `/api/auth/me`, API base URL, and MySQL `users.id` schema before applying the adapter. The API port is not established by the frontend port; confirm it with the server operator.

## Runtime flow

1. A student signs in to Academy using its existing flow.
2. Academy renders `FlamesLab`, an iframe wrapper. The lab sends `FORTISIM_READY` to the exact configured parent origin.
3. The wrapper replies with `FORTISIM_AUTH` and the current bearer token. Both sides check the exact origin, message version, and iframe/parent window identity. No token or user ID is put in URLs.
4. FLAMES keeps that token in memory, sends it only on same-origin API calls, and validates it against Academy `/auth/me`. It neither shares Academy's signing secret nor creates a duplicate local student.
5. Completion goes through FLAMES's API to Academy's authenticated adapter. Academy derives `user_id` from `req.user`, validates public lesson IDs, and merges completion into its own MySQL table.
6. Only after a successful save does FLAMES send `FORTISIM_PROGRESS_SAVED`. The wrapper refreshes progress from the Academy API; it does not trust a message's score or count.
7. Parent logout clears the iframe credential and training access. Reloading restores completion from Academy.

In Academy mode, FLAMES writes no account/progress database file and no browser progress or token cache. Temporary in-memory progress and the optional local theme preference are separate from saved Academy completion. There is no fallback to standalone accounts if Academy is unavailable.

## Install the Academy adapter

The reviewable files are in [`integrations/academy`](../integrations/academy/README.md). They are supplied for installation; the college server has not been modified.

1. Copy `fortisim.routes.mjs`, `simulator-contract.mjs`, and `lesson-manifest.mjs` into Academy's `backend/src/routes/`.
2. Apply `schema.sql` to Academy's existing MySQL database using its normal migration procedure. It creates `fortisim_progress` with a foreign key to Academy `users`; it does not create a second user table.
3. In Academy `backend/src/app.js`, add imports:

   ```js
   import { createFortisimRouter } from './routes/fortisim.routes.mjs'
   import { authenticate } from './middleware/auth.js'
   import { pool } from './db/pool.js'
   ```

   Mount before the final error handler:

   ```js
   app.use('/api/integrations/fortisim', createFortisimRouter({
     Router: express.Router, authenticate, pool,
   }))
   ```

4. Copy `FlamesLab.jsx` into Academy `src/components/`. It uses the inspected project's existing `../auth` and `../services/api` helpers.
5. Set Academy's frontend build environment:

   ```dotenv
   VITE_FORTISIM_URL=http://110.172.151.108:5174
   ```

6. Import the component in Academy `src/App.jsx` and add routes inside its **authenticated student** `<Routes>` block (after its existing login/role gates):

   ```jsx
   import FlamesLab from './components/FlamesLab'

   <Route path="/firewall-lab" element={<FlamesLab />} />
   <Route path="/firewall-lab/paloalto" element={<FlamesLab vendor="paloalto" />} />
   ```

   Add links in Academy's navigation. The component can also be rendered directly inside a room page or dashboard.

7. Restart Academy's backend and rebuild/restart its frontend using the college's normal deployment process.

The wrapper displays both firewall courses' saved counts in Academy and refreshes them after task completion. The adapter also exposes `/api/integrations/fortisim/summary` for other Academy dashboard components. It does **not** automatically change existing room-question scores, leaderboards, certificates, or room completion; that requires an explicit room/task mapping rather than inventing one.

## Configure FLAMES locally or on the college server

Backend environment:

```dotenv
PLATFORM_MODE=academy
ACADEMY_ORIGIN=http://110.172.151.108:5173
ACADEMY_API_URL=http://110.172.151.108:4000/api
FRONTEND_ORIGIN=http://110.172.151.108:5174
```

The API URL above is an example; confirm its actual port and reachability. `ACADEMY_ORIGIN` must be an exact origin, without paths. `FRONTEND_ORIGIN` is the lab origin, not the Academy origin. Keep both apps on different ports/origins. Academy mode ignores instructor-bootstrap credentials and its own cookie accounts.

For the container topology:

```bash
cp .env.academy.example .env.academy
# Set the actual Academy API URL and desired bind address in .env.academy.
node scripts/configure-academy.mjs http://110.172.151.108:5173
docker compose --env-file .env.academy -f compose.academy.yml config --quiet
docker compose --env-file .env.academy -f compose.academy.yml up -d --build
```

The example uses `host.docker.internal:4000/api` for an Academy API on the Docker host; Linux Compose adds the host-gateway mapping. If Academy is another container, use its reachable service address/network instead. The lab API is not published on a host port.

`FORTISIM_BIND` defaults to loopback for a reverse proxy. To expose port 5174 directly during college acceptance, set it to `0.0.0.0` and confirm the host firewall permits access. The supplied Academy Nginx configuration allows only `http://110.172.151.108:5173` as a frame ancestor. Regenerate it with `node scripts/configure-academy.mjs YOUR_ACADEMY_ORIGIN` whenever changing `ACADEMY_ORIGIN`, including a move to HTTPS. Standalone production continues to forbid embedding.

The supplied public address is HTTP. Academy bearer credentials cross this connection; use HTTPS for both parent and lab before real authenticated student use. An HTTPS parent also requires an HTTPS lab to avoid mixed-content blocking. No API secret belongs in frontend build variables.

## Endpoints and messages

| Endpoint | Owner | Purpose |
| --- | --- | --- |
| `GET /api/integration/config` | FLAMES | Public runtime mode and trusted parent frontend origin |
| `GET /api/account/session` | FLAMES | Academy-validated display identity in Academy mode |
| `GET/POST /api/account/progress/:platform` | FLAMES | Authenticated proxy; no local persistent writes in Academy mode |
| `GET /api/integrations/fortisim/summary` | Academy adapter | Current user's course completion and totals |
| `GET/POST /api/integrations/fortisim/progress/:platform` | Academy adapter | Current user's idempotent task completion merge/read |

Messages have `version: 1`. Parent → lab: `{ type: 'FORTISIM_AUTH', version: 1, token }`; use `token: null` on logout. Lab → parent: `FORTISIM_READY`, and `FORTISIM_PROGRESS_SAVED` with `platform`, `taskId`, and saved `completed` IDs. `FORTISIM_AUTH_REQUIRED` reports an expired/rejected parent credential; the wrapper refreshes Academy state and its existing API helper handles authentication expiry. Credentials never appear in lab → parent notifications. No wildcard message origins are used.

The parent wrapper checks for token changes every five seconds and on focus/storage/auth-expiry events. Repeated unchanged credentials do not reload the lab. A failed save shows a warning in the lab; it is not reported as saved to Academy.

## Acceptance before deployment

- Confirm the live Academy commit/API address and test migrations against a database backup.
- Confirm two different users see only their own task IDs.
- Complete a lab, confirm the wrapper updates, reload it, and check that completion returns.
- Log out of Academy; confirm the iframe loses training access.
- Test forged origins/windows, expired tokens, and parent API failure; no local-account fallback should occur.
- Check direct navigation: Academy-mode training must ask users to launch through Academy.
- Verify the actual framing headers, HTTPS, firewall/port routing, and both vendor flows.
- Keep `lesson-manifest.mjs` synchronized with engine completion IDs when adding lessons; a repository test checks the shipped manifest.

Automated API/adapter/bridge tests use a mock Academy and injected database interface; they do not establish live MySQL migration or college deployment acceptance.

## Content administrators and custom lessons

Verified Academy users with the `admin` role can open the FLAMES `/admin` page inside the lab. Expose the wrapper in an authenticated admin route if needed. Authored modules and answer keys persist in FLAMES content storage; student identity and completion remain in Academy. Set `FLAMES_CATALOG_URL` in the Academy backend to the reachable FLAMES `/api/content/catalog` endpoint so the updated adapter recognizes newly published lessons and updates totals. See [content administration](ADMIN_CONTENT.md).

## Simulator configuration drafts

Academy mode also stores unfinished simulator configurations in the parent `fortisim_simulator_drafts` table. Apply the additive schema update and copy the generated `simulator-contract.mjs` with the updated router. Versioned writes and resets reject stale revisions and mismatched owners. Custom FortiGate policy drafts use the published catalog version; configure `FLAMES_CATALOG_URL`. See [autosave and builder upgrade](AUTOSAVE_AND_EXERCISE_BUILDER.md).

## Classroom assignment adapter update

The updated adapter adds admin-only `POST /api/integrations/fortisim/classroom/progress` for validated batches of up to 500 student IDs. Install the updated router before integrated instructor reports are used. FLAMES stores group/assignment teaching metadata and parent ID references in its content database; account identity, completion and simulator drafts remain in Academy. Group ownership is checked by FLAMES before requesting parent results. No Academy UI/schema change for assignments is installed automatically. Back up both systems and preserve parent IDs during restore.

## Roll numbers for internal completion certificates

The authenticated `/auth/me` user must supply a string `rollNumber` or `roll_number` (up to 64 characters) for certificate issuance. Map the existing authoritative Academy college roll-number field in that response; do not infer it from username/email and do not allow FLAMES clients to overwrite it. Missing roll numbers keep new certificates unavailable until staff update the parent profile. Existing login/progress behavior does not require the optional field. [Certificate details](CERTIFICATES.md) explain current practice-progress semantics and the fixed internal-use disclaimer. This contract must be checked against the actual deployed Academy version.
