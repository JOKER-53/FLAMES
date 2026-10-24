# FLAMES code audit — 2026-10-24

The previously uncommitted features were saved and pushed in `3b1f1e2`. This follow-up audit checks the FLAMES repository, its Academy adapter contract, and local production containers. It does not claim that Academy or AWS has been deployed, or that testing can prove an absence of all defects.

## Reproduced issues and fixes

| Trigger / incorrect behavior | Correction | Commit |
| --- | --- | --- |
| Installed packages had dependency advisories | Patched runtime/test dependencies, Router 7, and shared selector parser; audit now clean | `a11c512` |
| Provider returns malformed question text/choices/index | Validate inside generation; use the question bank instead of an endpoint error | `783a29f` |
| Separate content connection publishes or writes | Observe SQLite data-version changes; serialize revision/collision/limit reads with writes | `635bf9f` |
| Instructor withdraws a completed custom lesson | Assignment reports retain historical credit; current course totals still filter publication | `2bb608b` |
| Client supplies coerced enum arrays or incomplete exercise lists/ports | Reject invalid shapes before persistence/evaluation | `f0c0b8c` |
| Grading passes but completion synchronization fails | Report passed checks without claiming persistence succeeded | `1877dbb` |
| Routing input contains null/missing OSPF or SD-WAN structures | Return a validation failure instead of throwing | `aca0e80` |
| Correct NAT row is below an earlier matching wrong row | Grade the effective first match and intended outbound destination scope | `c17375e` |
| Several AI namespaces are configured together | Keep key, endpoint and model in one namespace; reject redirects and redact echoed credentials | `2f612c8` |
| Initial catalog response arrives after a publication refresh | Ignore the stale response/error/loading update | `d74a61b` |
| Restored configuration has duplicate/empty row identities | Reject ambiguous IDs/names before restore; regenerate the Academy contract | `577dbbf` |
| Knowledge task name is `constructor`, `__proto__`, `toString` or unknown | Require own metadata properties and return 404 before generation | `8865eab` |
| Private auxiliary artifacts are present while building images | Exclude whole backup/release/recording directories from Docker context | `6077a38` |
| Static NAT is entirely or partly shadowed in its configured zone scope | Validate effective translation across that scope and clarify final-exercise ordering | `c3c744d` |
| Academy reports an empty, invalid or non-finite identity | Fail closed before admin access; retain optional nullable email and least-privilege unknown roles | `7711485` |

Each fix was committed separately. Browser regression infrastructure is in `0cd6fd4`.

## Verification evidence

- `npm run verify`: **146 tests passed** — 43 engine, 78 backend/API, 25 frontend — and frontend production build passed.
- `npm run test:browser`: **five Chromium workflows passed** using temporary accounts/content databases and disabled AI credentials. They cover authoring/publication, accounts, separate-device completion, theme persistence, mobile keyboard/reduced-motion behavior, guest/account draft separation, a catalog race, and a progress-write outage.
- `npm audit`: **zero reported vulnerabilities**, including development dependencies, as checked on this date. This is time-dependent advisory data.
- Both production images built from the audited runtime source. Backend image: `sha256:5ba0258e080df0966d0425333bca91619324778e58b0de036ae5742f5b42a9e5`; frontend image: `sha256:6f16c254b185beb9bd9497444094ada00a733bfdad13bb8ba2f46739bfa03b84`.
- Isolated production smoke check: read-only containers with temporary writable data/tmp mounts, backend health 200, anonymous training access 401, frontend health/SPA successful. No host ports were published; fixture containers/network were removed.
- Standalone and Academy Compose configuration checks passed; `git diff --check` passed.

AI tests in this pass use controlled provider responses, including malformed output, retired-model responses, timeouts and credential mixing. Prior real provider checks are documented separately in the operations runbook; this pass does not claim a new live provider quality evaluation.

## Remaining deployment and feature work

The college server is unavailable. The user plans an AWS test deployment of Academy plus FLAMES. AWS access/region, HTTPS hostnames, parent installation, authenticated two-student acceptance, coordinated parent MySQL restoration and real-device WebGL checks remain pending. No external Academy installation/database was modified in this audit. The updated adapter must be installed for archived assignment credit and the classroom reporting contract.

`TODO.md` continues to distinguish completed repository work from deployment acceptance and future features. Additional visual-builder families, fuller packet explanations, hosted recovery, and the other unchecked feature items were not relabelled as completed by this bug-audit pass.
