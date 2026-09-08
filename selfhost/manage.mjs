import { databasePath, backupStore, exportStore } from './store.mjs';
import { resolve } from 'node:path';
const [command, output] = process.argv.slice(2);
if (!['export', 'backup'].includes(command) || !output) {
  console.error('Usage: node selfhost/manage.mjs export|backup <new-output-path> (set RR_DB_PATH first)');
  process.exitCode = 1;
} else {
  const path = databasePath();
  if (command === 'backup') { await backupStore(path, resolve(output)); console.log('Backup saved.'); }
  else { const count = exportStore(path, resolve(output)); console.log(`Exported ${count} enquiries. Keep the file private.`); }
}
