# Classroom assignments, targeted hints and content transfer

Implemented 2026-10-23.

## Groups and assignments

Signed-in students and instructors open `/classroom` from the header. Instructors create named groups, share a random invitation code, and assign a built-in or published custom module. The due date uses the instructor browser's local time and is stored as an absolute timestamp. Required lesson count defaults to the whole module and can be lowered explicitly. Only the group owner can see its roster, issue/replace invitation codes, remove members, assign modules, export results, or delete groups/assignments. Students enroll themselves using their authenticated identity; request bodies cannot select another student. Students see only their own assignment results and no roster/invitation code.

Opening an assigned module records a start marker. Existing course completion also counts, so prior learning can satisfy an assignment. An assignment is `completed` when its required lesson count is met; otherwise it becomes `overdue` after the due date, `started` after opening/partial completion, or `assigned`. Completion is student-reported practice evidence, not certified scoring. Refresh progress to retrieve current results. Student-name and status filters aid review; CSV exports include the visible student's results, deadline and provenance, with formula-like cell contents neutralized. Removing membership revokes classroom/assignment access but retains course progress. Deleting groups or assignments also retains course progress.

Assignment lesson IDs and requirements are snapshots. Later module edits/unpublication do not silently replace them. If content is withdrawn, cancel the old assignment and issue a replacement; old completed work is retained. An assignment does not restrict access to other practice modules.

## Academy ownership

FLAMES stores groups, owner/membership references, invitation codes, assignment requirements and start markers in `content.sqlite`, scoped separately for standalone mode and each configured Academy parent origin. Member display names/emails are enrollment-time snapshots, not a second login directory. Passwords/tokens, completion, and configuration drafts stay in Academy. Preserve parent user IDs when migrating/restoring. Group metadata is FLAMES-owned teaching metadata; Academy's own assignment pages are not modified automatically.

Every integrated request verifies the current Academy identity. Student results use the student's own parent progress endpoints. An Academy admin viewing their owned groups uses the new admin-only parent endpoint `POST /api/integrations/fortisim/classroom/progress`, with validated batches of up to 500 IDs. The FLAMES server derives IDs from its authorized group memberships, not client-supplied roster IDs. Academy's supplied adapter accepts only its `admin` role for this endpoint. No shared service credential is added. Parent failure fails the report request; the UI does not silently claim zero or locally saved completion. Install the updated supplied adapter on Academy before using integrated instructor reports.

The legacy standalone `/api/account/classroom` endpoint is also restricted to students enrolled in that instructor's groups. It no longer exposes every registered student to every instructor.

## Learning hints

After failed grading, **Show a hint** and **Show next step** provide deterministic concept guidance based on failed check labels and the exercise track. Covered concepts include rule order, address/CIDR scope, services/protocols, route selection, zone ownership, NAT direction, traffic logging and administrative exposure. FortiGate tutor input additionally distinguishes unmatched packets and logging-only failures using the structured report. Guidance does not take private expected values as input and does not change a grade. The controls work with no live provider. They reset when the grading report or lesson changes; existing request-generation guards discard late responses after edits.

AI hints remain optional and separately labelled. This feature is concept guidance, not a claim to identify every root cause from a check label.

## Module import/export

The content studio `/admin` has an import/export panel. Save edits, then **Export saved module**. Exports include the saved draft, lesson/task order, question answer keys and policy reference definitions; only content administrators can export, preview or import. A draft export may differ from its currently published snapshot. Do not share these files with students.

Version 1 format:

```json
{"format":"flames-module","schemaVersion":1,"exportedAt":"2026-10-23T00:00:00.000Z","assets":"none","module":{}}
```

`module` follows the validated authored module schema, including the policy exercise schema for supported simulator lessons. The backend validates size, version, vendor, identity shapes, lesson/task structure and exercise definitions before preview/import. The current module limit is 200 KB serialized; the UI accepts files up to 230 KB to allow the export envelope/formatting. Compact JSON may be needed for a large, heavily indented export. Requests remain bounded by the API's 256 KB body limit.

Choose a JSON file to preview its title, vendor and lesson/task counts, then explicitly import. Import always creates a new private module, new lesson IDs, and new question-task IDs, even on the same deployment. No completion or configuration draft is transferred. Ordering and answer keys are preserved. Review the imported draft using normal studio preview/reference testing and publish explicitly. Publication runs the normal strict validation again.

Version 1 is self-contained text/configuration only: no upload archive, remote asset fetch, HTML renderer or script execution. Instruction text, titles and questions are rendered as React text. HTML-looking strings remain visible text; URLs are not automatically loaded as assets. Unknown asset modes/versions are rejected.

## Network view

The policy network dialog now uses the same theme tokens, icon set, typography, surfaces, buttons, and result badges as the course UI. Its SVG diagram updates with light/dark mode and shows actual packet endpoints and source/destination interfaces, including Internet hosts that were absent from the old address-only drawing. It identifies the correct **FortiGate 60F**. Packet playback, activity results and replay are retained; keyboard Escape/focus restoration, focus trapping, a scrollable mobile diagram, and reduced-motion presentation are supported. It is a teaching illustration of simulated paths, not a physical cabling detector.

## Validation

Automated checks cover instructor isolation, forged enrollment IDs, invitation rotation/removal, assignment validation/status, Academy-backed reports without local progress copies, admin-only transfer, fresh IDs/draft-only imports, equivalent answer grading, unsafe-text rendering in browser verification, targeted concepts, AI failure labels, password rotation/session revocation, and WAL-aware backup/isolated restore/checksum rejection. Browser verification exercises the real local Docker deployment. College deployment acceptance still requires its operator and authenticated Academy accounts.
