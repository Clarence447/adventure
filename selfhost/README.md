# Independent enquiry funnel on the always-on computer

This runs the existing Revenue Recovery form and a persistent SQLite database on your computer. No Supabase account, hosted database, OpenAI key, SMS provider, or subscription is required for this enquiry-only mode. The full customer SaaS is still separate work: customer accounts, missed-call automation, AI qualification and billing are not provided by this mode.

## Keep TAVEY separate

Use a separate checkout such as `/home/clarence/Projects/revenue-recovery` under Linux/WSL or a separate Revenue Recovery folder under Windows. Do not use TAVEY's directory, database, environment file, process manager name, ports, or credentials. Verify port 3088 is unused. If occupied, set RR_PORT to another unused port; never stop the owner of that port.

Node 24+ is required for this service. Use a separate Node binary if TAVEY depends on a different version. Do not globally upgrade TAVEY's runtime. Only one Revenue Recovery instance should run against this local disk database. Do not place the database on a network drive or in the web-accessible public directory.

## First start

From this checkout, run `npm ci`, then `npm run build`. These commands install/build only this application. Then:

```sh
export RR_DB_PATH="$HOME/revenue-recovery-data/enquiries.sqlite"
node selfhost/start.mjs
```

Windows PowerShell equivalent:

```powershell
$env:RR_DB_PATH = "$env:LOCALAPPDATA\RevenueRecovery\enquiries.sqlite"
node selfhost/start.mjs
```

Open http://localhost:3088 on that computer. The launcher defaults to local storage, loopback-only binding, port 3088, and a private `.revenue-data` directory if no path was supplied. On Windows use an account-private directory; POSIX file modes do not replace Windows ACLs.

`GET /api/health` reports database readiness without exposing enquiries or paths. Customer account/authentication routes and unrelated pages return 404 in local mode. The homepage and assessment do not call Supabase. Every POST other than the acquisition endpoint is blocked in local mode, including customer server actions.

## Public access is a separate deployment step

The localhost address is only usable on this computer. A persistent public HTTPS hostname and a reverse proxy or outbound tunnel are still needed before prospects can visit. Set RR_PUBLIC_ORIGIN to that exact HTTPS origin (no path or trailing slash), then restart this service. The proxy/tunnel must forward only to 127.0.0.1:3088, preserve the public Origin header, and enforce request-size/rate limits. Do not expose TAVEY, a database port, the operating-system account, or a directory listing. The application also caps request bodies and per-email submissions; it is not a distributed bot-defense system.

No domain, tunnel, router change, boot service, or public exposure is configured automatically. Verify the chosen host/network first. A systemd user-service example is included for Linux/WSL with systemd available; it requires replacing the Node path. Windows can run START_REVENUE.cmd manually or use a dedicated Task Scheduler job for the verified Node binary and script, with its own working directory and restart-on-failure settings. Boot/WSL startup must be tested on the actual machine before promising uptime.

## Review, backup and migrate

There is deliberately no public endpoint to list enquiries. Set RR_DB_PATH to the same file used by the running service, then export privately:

```sh
node selfhost/manage.mjs export /private/new-enquiries.json
node selfhost/manage.mjs backup /private/new-backup.sqlite
```

Use real absolute paths in a private directory that already exists. Output filenames must be new; commands refuse to overwrite files. JSON includes contact details, all answers, submission IDs, and server-recorded consent timestamps/version. These fields support later migration to PostgreSQL/Supabase; no automatic migration or import is claimed. Open the JSON locally for manual review/follow-up.

The launcher makes a consistent SQLite backup at startup and every 24 hours, including active WAL data. RR_BACKUP_DIR can select a second disk. Backups otherwise remain on the same computer and do not protect against disk loss: copy verified snapshots to a separate device. No automatic deletion/rotation is performed. Watch available disk space. Export files also contain personal data and must not be committed or placed under public/.

Restore rehearsal: stop only Revenue Recovery, keep the original file plus any WAL/SHM companions intact, point RR_DB_PATH to a separate backup copy, then restart and verify health/export. Never overwrite a live database or copy only the main file while WAL writes are active. Reverting the application does not delete enquiry files. Returning to Supabase requires an explicit validated import and configuration change.

## Launch acceptance

- Check runtime, free memory/disk, and unused port on the TAVEY computer.
- Start this service; verify TAVEY still responds as before.
- Complete the form with synthetic example.com contact details. Verify one exported record.
- Restart only this service and verify the record survives.
- Verify backups can be opened/exported and changed retries cannot overwrite saved data.
- After public HTTPS setup, test desktop/mobile from another network and ensure account/data paths remain unavailable.
- Check automatic restart after a host reboot and confirm the public address still works.

This checkout is prepared/tested elsewhere; installation, reboot behavior, public HTTPS and browser validation on the TAVEY computer remain unverified until performed there.
