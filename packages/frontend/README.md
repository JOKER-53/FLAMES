# FLAMES web application

React/Vite app with shared light/dark tokens. `src/App.tsx` owns public, account, administrator and vendor route trees. `components/shell/` owns headers, course navigation, account actions and site framing.

| Location | Owns |
| --- | --- |
| `pages/fortigate/`, `pages/pan/` | Native vendor exercise and hardware screens |
| `pages/course/` | Course/module views, published authored lessons and learning guide |
| `pages/admin/` | Content studio, visual builders, revision comparison, guide visibility |
| `pages/*.tsx` | Vendor selection, account, classroom and public credits |
| `course/curriculum.ts` | Public native task metadata and ordering |
| `course/learning.json` | Ten learning chapters and study plans for all 48 native tasks |
| `course/CourseCatalog.tsx` | Published modules and server guide visibility |
| `course/useLearningAccess.ts` | Shared guide access for navigation and direct routes |
| `drafts/`, `hooks/`, `api/` | Autosave, identity/progress/grading state and HTTP behavior |
| `hardware/` | Loading/cache, frame scheduling, cable compatibility and calibrated sockets |
| `components/` | Shared primitives, configuration forms, packet traces and network view |
| `public/` | Original models, theme initialization and credits photograph |
| `test/` | Frontend unit/static rendering and metadata coverage |

Run root `npm run frontend:dev` (Vite at port 5173, API proxy to port 4000). `npm run build --workspace=@fortisim/frontend` type-checks and creates the SPA. Predev/prebuild prepares model derivatives; ignore generated GLBs/gzip/manifest output. Use only the root dependency lockfile.

Learning guide access defaults to hidden for students; administrators enable both vendors together and retain preview access. Credits is a public full-width page at `/credits`, reached through the header only, with the original `public/images/beyondbug-team.png` photo. Other site pages keep their standard content widths.

Shared shell styles and public route URLs are compatibility boundaries. Never place credentials in `VITE_` variables or import private authored reference solutions. See [application flow](../../docs/APPLICATION_FLOW.md), [hardware behavior](../../docs/HARDWARE_PERFORMANCE.md) and [browser testing](../../docs/BROWSER_TESTING.md).
