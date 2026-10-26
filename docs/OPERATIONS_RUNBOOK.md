# FLAMES operations and recovery

Implemented 2026-10-23. These tools are available locally; they do not imply a college production deployment or an Academy backup has occurred.

## Before public access

Use the production Compose file behind the documented HTTPS reverse proxy. Development ports and the checking account are for local checking. Production startup now rejects an instructor whose password is `admin123`, including accounts carried over in an existing volume.

Create a permanent instructor with `npm run admin:create`. Recover or rotate an existing instructor with:

```sh
npm run admin:create -- --reset-password
```

This requires an interactive terminal, hides both password entries, requires 12–128 characters, preserves the account ID/progress, and revokes all its sessions. It never promotes students. In a production container run the shipped script directly:

```sh
docker compose -f compose.production.yml run --rm --entrypoint node backend scripts/create-admin.cjs --reset-password
```

Use the real administrator's email and a password stored in the college's password manager. The local checking account was preserved for the user's requested checks; it still must be rotated before public access. Academy administrators recover credentials in Academy, not FLAMES.

## SQLite backup and restoration

`scripts/data-backup.cjs` snapshots `content.sqlite` and, when present, `fortisim.sqlite`. The content database includes unpublished answer keys, groups, memberships and assignment metadata. The account database includes password hashes, sessions, progress and simulator drafts. Store backups privately; the tool writes directories with mode 0700 and files with mode 0600. Keep a separate protected copy of deployment configuration/secrets; this tool does not copy environment files.

```sh
npm run data:backup -- --source-dir /path/to/data --output /private/backups/flames-2026-10-23
npm run data:restore -- --backup /private/backups/flames-2026-10-23 --target-dir /private/restore-check/flames-2026-10-23
```

The backup uses SQLite `VACUUM INTO` rather than copying an active `.sqlite` file. Committed WAL data is included. Every snapshot passes SQLite integrity and foreign-key checks; its SHA-256 digest is recorded in `manifest.json`. Restore verifies all digests and databases before writing, accepts only the known filenames, and refuses existing destination directories. An incomplete backup/restore directory is removed on failure. Set `FLAMES_RELEASE` to the Git commit/release ID to include it in the manifest.

Each database snapshot is consistent independently. **Quiesce application writes during a release backup** when a coordinated account/content snapshot is required. Restrict maintenance access at the reverse proxy, finish active requests, take snapshots, and reopen only after verification. No background scheduler or retention job is installed automatically. Schedule daily protected snapshots and a pre-release snapshot using the college's job runner; retain at least one known-good restore checkpoint.

Production images ship the script; `/tmp` is writable on the read-only container. Example for a running backend:

```sh
docker compose -f compose.production.yml exec backend node scripts/data-backup.cjs backup --source-dir /data --output /tmp/flames-release-backup
docker compose -f compose.production.yml cp backend:/tmp/flames-release-backup /private/backups/flames-release-backup
```

Use a fresh output name for each backup. In Academy Compose, use the configured content data directory and back up the parent database separately.

To restore a deployment, stop writes and the backend, retain the current volume as a rollback checkpoint, restore into a new directory/volume owned by the container's `node` user, and point the backend at that volume. Never replace live SQLite files while a backend has them open. Start an isolated restored backend first; verify an instructor login, a published/draft lesson, group membership, a saved configuration, and completion. Revoke sessions/rotate credentials if recovery follows a suspected compromise.

## Academy backups

Academy remains the source of identity, completion and simulator drafts. Back up its MySQL database together with FLAMES' content database during the same maintenance window. Follow the college's MySQL procedure; for InnoDB, a typical operator-controlled dump uses `mysqldump --single-transaction --routines --triggers` with credentials supplied through a private login path, never a password in a command line or Git file. Include `users`, `fortisim_progress`, `fortisim_simulator_drafts`, and the existing Academy application tables. Restore the dump into a separate test database before trusting a backup. Preserve Academy user IDs when restoring memberships; FLAMES groups reference verified parent IDs.

No server credentials were supplied, so a college MySQL dump/restore has not been run.

## Release and rollback

1. Record the exact Git commit, production backend/frontend image IDs or immutable registry digests, Compose configuration revision, current schema version, backup manifest location, and operator in the college release log. Do not store resolved Compose secrets in Git.
2. Keep the previous two application images and pre-release data backup. Build/review the new images and test against an isolated restored volume before switching production.
3. Run health checks, instructor publishing, group assignment access, two separate student sessions, autosave and parent progress checks after release. If the provider is enabled, check an actual hint and question and confirm `source: ai`; also verify guided/bank fallback with the provider disabled in staging.
4. If application-only rollback is compatible with the current schema, select the recorded previous frontend/backend images through a private Compose override and run `docker compose ... up -d --no-build`. Do not rebuild an old tag from a changed workspace.
5. If a data migration is incompatible, stop both applications, restore the matched pre-release FLAMES and Academy checkpoints into new volumes/databases, switch to the recorded prior images, and validate before opening access. Restoring a checkpoint discards work after that checkpoint; retain the failed-release data for investigation.

This change adds new SQLite tables without deleting previous tables. Older versions ignore the new classroom tables; future migrations still require explicit compatibility review.

## AI provider checks

The configured retired model returned HTTP 410. The local backend configuration now uses a model that passed real requests: `nvidia/nemotron-3.5-lightning-30b-a3b`. Its key remains only in the ignored backend environment. Provider availability is time-dependent; verify after deployment and model changes. FLAMES sends `enable_thinking: false` to the NVIDIA endpoint, bounds calls to 15 seconds, strips reasoning text, sends only vetted concept guidance to the tutor, rejects concrete answer-like values/prescriptions and unsupported NAT explanations, and labels generated hints/questions separately from deterministic guidance/curated questions. Grading never depends on provider availability.

To change Docker `env_file` settings, recreate the backend (`docker compose up -d --force-recreate backend`); a restart alone does not reload container environment variables. AI explanations remain generated teaching guidance; the deterministic grader decides completion.
