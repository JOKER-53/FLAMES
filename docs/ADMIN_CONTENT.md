# FLAMES content administration

Open `/admin` to manage custom modules, lessons, and tasks. The content studio uses the same FLAMES typography, cards, controls, and light/dark themes as student pages.

## Your administrator access

Standalone FLAMES instructors have content-administrator access. Public registration always creates a student; it cannot assign this permission.

For local development, create your own account interactively from the repository root:

```bash
npm run admin:create
```

For the development Docker setup:

```bash
docker compose exec backend npm --prefix /app run admin:create
```

The command asks for your email, display name, and a password with hidden input. It does not print or save the plaintext password. Existing accounts are not overwritten or promoted. Sign in at `/account`, then open `/admin`; the header includes an Admin link for authorized users.

Production containers can use the existing `INSTRUCTOR_EMAIL` + `INSTRUCTOR_PASSWORD` first-start bootstrap described in [deployment](DEPLOYMENT.md). Remove bootstrap credentials after creating the account. No shared/default administrator password is installed.

In Academy mode, the verified Academy `admin` role grants content access. Student/operator roles and local FLAMES cookies do not. Launch the iframe from an authenticated Academy admin route if the parent currently exposes firewall labs only in its student routes. Local account creation is disabled in Academy mode.

## Create and publish

1. Select **New module**, choose FortiGate or Palo Alto, and enter its title.
2. Add a summary and one or more lessons. Reorder lessons with the up/down buttons.
3. Give each lesson a title, summary, duration, level, and instructions. Instructions are plain text with paragraph breaks.
4. Add multiple-choice tasks with at least two distinct choices and a selected correct choice, or short-answer tasks with accepted answers (one per line). Short answers ignore capitalization and extra whitespace.
5. Use **Save draft** to keep unfinished work privately. **Preview lesson** shows the instructions and questions without exposing the answer key in the preview.
6. Select **Publish module** when ready. Publishing validates and saves the draft, then replaces the public snapshot. New modules and lessons appear in course overviews, sidebars, module pages, progress totals, and previous/next navigation.

Students open published lessons, read instructions, and check task answers against the server. Correct completion uses the existing guest/account/Academy progress flow. A lesson without tasks has a **Mark as read** action.

Published content remains available while you edit its draft. Later edits require publishing again to change what students see. Unpublishing hides the module and its lessons; completion records are retained and become visible again when the same lesson IDs are republished. A module must be unpublished before it can be deleted.

The editor checks revisions so saving an old browser tab cannot silently overwrite newer work. A conflict prompts you to reload the module. Unsaved browser changes trigger a warning when closing/reloading the page; save before leaving the studio.

## Supported content and boundaries

The studio adds instructional lessons with multiple-choice/short-answer tasks, including reading-only lessons. Existing built-in firewall configuration exercises remain available. Adding a new packet-grading capability or a new simulator console still requires engine/UI code; the text/task editor does not invent those behaviors.

Only published metadata is exposed through the public catalog. Student lesson responses omit correct indices and accepted answers. Student-provided HTML and scripts are never executed. Server endpoints enforce editing roles, field limits, ID uniqueness, and publication validation.

Current limits are 100 authored modules, 30 lessons per module, 20 tasks per lesson, eight choices per multiple-choice task, and ten accepted answers per short-answer task. A module document is limited to 200 KB.

## Storage and backups

Content lives in a separate SQLite database, configurable with `CONTENT_DATABASE_PATH`. By default it is `content.sqlite` beside the standalone account database path. The development Docker data volume retains it across restarts. Standalone production stores it alongside its existing data; Academy Compose has an `authored-content` volume for content only.

Academy continues to own student identity and saved completion. The local authored-content database contains teaching material and answer keys, not a duplicate account/progress store. Include it in consistent SQLite backups and restoration tests.

## Custom lessons in Academy progress

Install the updated adapter and set this variable in the **Academy backend**:

```dotenv
FLAMES_CATALOG_URL=http://110.172.151.108:5174/api/content/catalog
```

Use an address reachable from the Academy backend; it may differ from the public iframe origin. This endpoint returns published metadata without answer keys and requires no user credential. The adapter fetches only the fixed operator-configured URL, adds published custom lesson IDs to its validation registry, and includes them in course totals. Unpublished/unknown IDs are rejected. A configured catalog outage returns a visible error rather than silently dropping custom progress.

Without `FLAMES_CATALOG_URL`, the parent adapter recognizes built-in lessons only. See [Academy setup](PARENT_LMS_INTEGRATION_GUIDE.md) for auth, API routing, and iframe installation.
