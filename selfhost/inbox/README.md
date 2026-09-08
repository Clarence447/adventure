# Integrated owner workspace

Revenue Recovery now includes **Owner sign in → Dashboard → Enquiries** on the same website and existing service/port. There is no separate inbox server or port 3089. The public form remains available without signing in; the owner dashboard and enquiry APIs require an authenticated owner session. The retained Supabase customer mode is unchanged; owner APIs are disabled in that mode.

The workspace includes counts, newest-first lists (50 per page), status filters, contact links, all questionnaire answers and consent details, New/Contacted/Closed status, follow-up notes, save feedback, conflict detection, and an unsaved-edit warning. Use Refresh to see new submissions. No notification email is sent.

## Install on the existing host

1. Review/merge the PR #10 dependency and this inbox change, then deploy the reviewed revision to the independent Revenue Recovery checkout. Preserve local modifications. Make a consistent SQLite backup before installing. Do not change TAVEY services, ports, runtimes, or credentials.
2. Using the existing private Node 24 runtime, generate the owner credential **in your own terminal** (not a shared agent log):

   `node selfhost/inbox/setup.mjs /home/clarence/revenue-recovery-data/inbox.env`

   The command refuses overwrite, writes a salted password hash with mode 0600, and displays the generated password once. Store it in a password manager. An existing valid inbox.env from the earlier design can be reused. Do not print it or commit it.
3. Add `EnvironmentFile=/home/clarence/revenue-recovery-data/inbox.env` to a **Revenue Recovery-only** systemd drop-in for `revenue-recovery.service`. Retain the existing RR_DB_PATH, RR_BACKUP_DIR and independent runtime. RR_PUBLIC_ORIGIN must exactly match the URL used in the browser (localhost before launch; HTTPS public origin after launch).
4. Run `npm ci` and `npm run build` in the isolated checkout. Reload the user service configuration and restart **only revenue-recovery.service**. Open the existing website and choose **Owner sign in**. No additional server, port, or inbox service is needed. If an earlier standalone inbox was installed, disable only that confirmed Revenue Recovery inbox service.
5. Verify the public questionnaire, sign-in, Dashboard → Enquiries, synthetic status/notes save, refresh, logout, and denied anonymous reads. Verify notes after a Revenue Recovery restart and restore a backup into a separate database. Confirm TAVEY listeners remain unchanged.

## Public launch

Public HTTPS setup still targets only the existing Revenue Recovery loopback port. If tunnel rules currently allow only questionnaire paths, explicitly permit `/login`, `/dashboard`, `/dashboard/enquiries`, `/api/inbox/login`, `/api/inbox/logout`, `/api/inbox/enquiries`, `/api/inbox/followup`, and required Next assets. These routes enforce application authentication; adding them to routing does not grant data access. Do not broaden to operating-system paths or other services. Configure edge abuse controls before public launch and test from another network. No tunnel or DNS changes are made by this PR.

Cookies are HttpOnly, SameSite=Strict, and Secure on HTTPS. Sessions expire after eight hours; hashed tokens live in SQLite so workers/restarts agree. Password rotation invalidates existing sessions. Login throttling is shared in SQLite; five failed attempts trigger a five-minute lockout. Mutations require the exact configured Origin. Keep credentials, backups and database private; protect Windows files with ACLs.

## Data and recovery

Original submissions remain immutable. Additive tables store follow-up notes/status, sessions and login throttling. Full consistent SQLite backups include follow-up data; the existing enquiry JSON export still contains only original submissions. Keep daily and off-device backups. Restoring a backup may restore unexpired sessions: rotate the owner password after recovery to revoke them.

Lost password: generate a new private environment file, update only Revenue Recovery's EnvironmentFile and restart that service. There is no public password-reset endpoint. Rollback: deploy the previously reviewed application build and restart only Revenue Recovery, preserving the database and additive tables. Do not overwrite the live database.

## Product requirement

Keep the operator workflow integrated in one application. New features should account for navigation, authentication, empty/loading/error states, mobile use, unsaved changes, retries and recovery before they are called complete. Do not require operators to jump between standalone tools for routine work.
