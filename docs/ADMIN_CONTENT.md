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

The studio adds instructional lessons with multiple-choice/short-answer tasks and visual FortiGate policy simulator exercises. Choose the lesson type before editing its content. Policy exercises include starter objects, traffic checks, and a reference solution that must pass before publication. See [the builder guide](AUTOSAVE_AND_EXERCISE_BUILDER.md). Existing built-in exercises remain available; additional simulator families still require dedicated builder support.

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

## Content transfer and instructor recovery

Use the studio import/export panel to preview a version 1 module file, then import it as a private draft. Exports contain answer keys and saved draft content; every import receives new IDs. See [content transfer](CLASSROOM_AND_CONTENT_TRANSFER.md). Run `npm run admin:create -- --reset-password` in an operator terminal for existing instructor recovery/session revocation. Production rejects the checking-only password; see [operations](OPERATIONS_RUNBOOK.md).

Expanded authoring: [configuration exercise builder](CONFIGURATION_EXERCISE_BUILDER.md) — FortiGate interfaces/routing and Palo Alto security/NAT/zones.

## Find, copy and compare content

Search modules by title, summary or saved lesson titles, and filter by vendor. Search lessons inside the selected module by title, summary or instructions. Clear filters to see the full library again.

**Duplicate lesson** copies the selected draft lesson next to its source, mints new lesson/task identities, and preserves exercise-internal references. Save/publish explicitly when ready. **Duplicate module** first saves any local changes with the existing revision guard, then creates a private copy with new module/lesson/task identities. It never copies publication state or student completion. Existing size/library limits still apply.

**Revision history** compares a chosen server-saved snapshot against the current editor, including local unsaved changes. It shows changed field paths with saved/current values, including additions/removals. Open it after a save to refresh available versions. History contains the most recent 50 create/import/duplicate/save/publish/unpublish events; earlier versions are pruned. Existing modules start with an adopted baseline at upgrade. No older history is invented. Only content administrators can access snapshots, which can contain private grading answers; public catalog and lesson endpoints never expose history. Comparisons do not restore or republish anything. Large comparisons display the first 200 changed fields. Deleting a draft also deletes its history; retain exports/backups for long-term archival.
