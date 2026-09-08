## Private enquiry inbox

The optional inbox is a **separate loopback-only service**, default port 3089. It provides password sign-in, newest-first enquiries (50 per page), full questionnaire/contact/consent details, New/Contacted/Closed status and follow-up notes. Refresh to see new enquiries. No notification emails are sent. Do not route the public enquiry tunnel to this port.

On the actual host, verify 3089 is unused, make a consistent database backup, and use the existing independent Node 24 runtime. Generate credentials **in your own terminal**, not in a shared agent log:

```sh
node selfhost/inbox/setup.mjs /home/clarence/revenue-recovery-data/inbox.env
```

This refuses overwrite, writes a private password-hash environment file, and shows a random password once. Save it in a password manager. Do not commit either the environment file or password. Install `selfhost/inbox/revenue-recovery-inbox.service.example` as a separate user service after verifying its paths. The example loads the environment file and existing database. Enable/start only `revenue-recovery-inbox.service`; no public-funnel restart is needed. Open **http://localhost:3089** on the always-on computer. Set `RR_INBOX_PORT` to a verified unused port if needed. Use localhost exactly; other Host headers are rejected.

This first version is for access on that computer. Phone/off-site access requires a separately designed private connection; no public admin exposure is configured. Sessions expire after eight hours, end on logout/restart, and use HttpOnly/SameSite cookies. Failed login attempts are throttled. Mutations require the exact same origin. Keep the computer account private; Windows ACLs must protect data and credentials.

Follow-up fields live in an additive `enquiry_followup` table; original questionnaire payloads and idempotent submission behavior are preserved. Concurrent edits are rejected rather than silently overwritten. SQLite backups include the new table. **The existing enquiry JSON export does not include follow-up notes/status**; use a full SQLite backup to preserve both. The inbox does not schedule its own backups: retain the public funnel's daily backups and off-device copies.

Before installation, review the branch and pass tests. After installation verify sign-in, a synthetic enquiry, status/notes after an inbox-only restart, and unchanged public-funnel/TAVEY listeners. Rollback: stop/disable only the inbox service and revert its checkout changes if needed; leave the additive table and data intact. Password rotation: generate a new environment file privately, update only the inbox service's EnvironmentFile, and restart that service. Never overwrite a live database.
