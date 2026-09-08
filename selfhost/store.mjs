import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync, chmodSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';

export function databasePath() {
  const path = process.env.RR_DB_PATH;
  if (process.env.VERCEL || !path || !isAbsolute(path)) {
    throw new Error('Local storage requires an absolute RR_DB_PATH on a persistent host.');
  }
  return path;
}
export function openStore(path) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  chmodSync(path, 0o600);
  db.exec(`PRAGMA busy_timeout=3000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
    CREATE TABLE IF NOT EXISTS acquisition_requests (
      submission_id TEXT PRIMARY KEY, payload TEXT NOT NULL,
      email TEXT NOT NULL, created_at TEXT NOT NULL,
      consent_at TEXT NOT NULL, consent_version TEXT NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS acquisition_email_created ON acquisition_requests(email, created_at);`);
  return db;
}
export function submitLocal(payload, path = databasePath()) {
  if (payload.consent !== true) throw new Error('Consent required');
  const normalized = { ...payload, email: payload.email.trim().toLowerCase() };
  delete normalized.website;
  const encoded = JSON.stringify(normalized, Object.keys(normalized).sort());
  const db = openStore(path);
  try {
    db.exec('BEGIN IMMEDIATE');
    const prior = db.prepare('SELECT payload FROM acquisition_requests WHERE submission_id=?').get(payload.submission_id);
    if (prior) {
      db.exec('COMMIT');
      return prior.payload === encoded ? 'received' : 'submission_mismatch';
    }
    const cutoff = new Date(Date.now() - 3600000).toISOString();
    const count = db.prepare('SELECT count(*) AS n FROM acquisition_requests WHERE email=? AND created_at>?').get(normalized.email, cutoff);
    if (count.n >= 3) { db.exec('COMMIT'); return 'rate_limited'; }
    const now = new Date().toISOString();
    db.prepare('INSERT INTO acquisition_requests VALUES (?,?,?,?,?,?)').run(payload.submission_id, encoded, normalized.email, now, now, 'enquiry-contact-v1');
    db.exec('COMMIT');
    return 'received';
  } catch (error) {
    if (db.isTransaction) db.exec('ROLLBACK');
    throw error;
  } finally { db.close(); }
}
export async function backupStore(path, destination) {
  if (!existsSync(path) || resolve(path) === resolve(destination) || existsSync(destination)) throw new Error('Use an existing source and a new backup filename.');
  mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path, { readOnly: true });
  try { await backup(db, destination); chmodSync(destination, 0o600); }
  finally { db.close(); }
}
export function exportStore(path, destination) {
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    const rows = db.prepare('SELECT * FROM acquisition_requests ORDER BY created_at, submission_id').all();
    const records = rows.map(row => {
      const { submission_id, business_name, contact_name, email, phone, consent: _consent, ...answers } = JSON.parse(row.payload);
      return { submission_id, business_name, contact_name, email, phone, answers,
        created_at: row.created_at, consent_at: row.consent_at, consent_version: row.consent_version };
    });
    writeFileSync(destination, JSON.stringify({ schema_version: 1, acquisition_requests: records }, null, 2), { flag: 'wx', mode: 0o600 });
    return records.length;
  } finally { db.close(); }
}
