# Internal completion certificates

FLAMES provides one internal college e-certificate for FortiGate and one for Palo Alto. These are practice completion records, not professional qualifications, vendor certifications, accredited assessment evidence, or placement credentials.

Every preview, download page, and downloaded certificate contains the fixed note:

> Not an approved certificate. Valid only for internal college use; not for placements.

## Student flow

Open **Certificates** in the header. Sign in, complete every required course task, and ensure your student profile has a roll number. The certificate is issued automatically when the signed-in student opens this page after becoming eligible. Download the self-contained SVG; browsers can open it at full resolution. This release does not send email or automatically award a professional credential.

Required tasks are all built-in vendor completion IDs (28 FortiGate, 20 Palo Alto), plus currently published authored lessons for that vendor. Alternate knowledge-check completion still counts: this is the platform's existing practice-progress meaning. Retired/unpublished lessons are not new requirements. An existing certificate remains a historical record of its issuance requirements when content changes.

The backend reads saved completion from the owning account service. Guest/browser caches, a supplied user ID, and a client-reported percentage do not grant a certificate. However, the existing practice progress APIs permit student-reported completion; the certificate is **not** a secure examination result. Certification would require a separate assessment design.

## Staff flow

Open **Admin → Completion certificates**. Choose the vendor, edit organization/title/colors, choose a classic frame or side accent, and inspect the live preview. Save explicitly. FortiGate and Palo Alto templates are independent.

For your own layout, upload a PNG, JPEG, or WebP background up to 90 KB and adjust text positions/sizes under **Text positions and sizes**. The 1000 × 700 canvas reserves the bottom 100 pixels for the mandatory note. Text centers can be placed within the validated bounds. Layouts are declarative; arbitrary HTML, SVG uploads, remote image URLs and scripts are not accepted. Long identity text fits within the canvas. Backgrounds are embedded in the SVG download, so no image host is required.

For standalone accounts, staff enter the existing student email and roll number in this section. Students cannot edit roll numbers through this API. For Academy accounts, the authoritative `/auth/me` user must provide `rollNumber` or `roll_number` as a string of up to 64 characters. Update that field in Academy; the local assignment endpoint refuses integrated accounts. No roll number is guessed from a name, email or username. Verify this profile field on the actual Academy deployment.

## Storage and permissions

Certificate templates, staff-assigned roll numbers and immutable issuance snapshots live in the FLAMES content database, under the checksummed `certificates/1` migration. Student identity keys include the standalone/Academy origin scope. Issued records capture name, roll number, vendor, date, UUID, template and required task IDs. Subsequent design/profile changes do not silently rewrite an issued record. Back up the content database alongside authored materials; treat these records as student information and apply the college's retention policy.

`GET /api/certificates/:vendor` reads current eligibility and idempotently creates the one-per-account/vendor record when eligible. `GET /api/certificates/admin/templates`, `PUT /api/certificates/admin/templates/:vendor` and `PUT /api/certificates/admin/roll-number` require a content administrator. Downloads are returned only to the signed-in owner. There is no public certificate lookup exposing student identities, and no promise that an exported SVG cannot be edited by its recipient.

No Academy credentials/progress are copied into a competing FLAMES account database. Certificates require the reachable authenticated parent progress/profile APIs in integrated mode. Live AWS/Academy acceptance remains pending deployment.
