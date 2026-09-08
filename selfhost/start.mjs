import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { databasePath, openStore, backupStore } from './store.mjs';

if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Use Node 24+ for this service; do not replace TAVEY runtime.');
const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.RR_PORT || 3088);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid RR_PORT');
process.env.RR_STORAGE = 'sqlite';
process.env.RR_DB_PATH ||= join(root, '.revenue-data', 'enquiries.sqlite');
process.env.RR_PUBLIC_ORIGIN ||= `http://localhost:${port}`;
const origin = new URL(process.env.RR_PUBLIC_ORIGIN);
if (origin.origin !== process.env.RR_PUBLIC_ORIGIN || !['http:', 'https:'].includes(origin.protocol)) throw new Error('RR_PUBLIC_ORIGIN must be an exact origin, without a trailing slash.');
if (origin.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(origin.hostname)) throw new Error('A public origin requires HTTPS.');
if (!existsSync(join(root, '.next', 'BUILD_ID'))) throw new Error('Run npm ci and npm run build first.');
const path = databasePath();
openStore(path).close();
const backupDir = resolve(process.env.RR_BACKUP_DIR || join(root, '.revenue-data', 'backups'));
mkdirSync(backupDir, { recursive: true, mode: 0o700 });
let backingUp = false;
async function snapshot() {
  if (backingUp) return;
  backingUp = true;
  try { await backupStore(path, join(backupDir, `enquiries-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`)); }
  catch { console.error('Revenue Recovery backup failed. Check disk space and backup directory access.'); }
  finally { backingUp = false; }
}
await snapshot();
const timer = setInterval(snapshot, 24 * 60 * 60 * 1000);
console.log(`Revenue Recovery starting at http://localhost:${port}; public origin ${origin.origin}.`);
const child = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: root, env: process.env, stdio: 'inherit' });
child.on('exit', code => { clearInterval(timer); process.exitCode = code ?? 1; });
child.on('error', () => { clearInterval(timer); console.error('Unable to start Revenue Recovery.'); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { clearInterval(timer); child.kill(signal); });
