import { createServer } from 'node:http';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { openStore, databasePath } from '../store.mjs';

export function passwordHash(password, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function createInbox({ path, credential, origin, now = Date.now }) {
  if (!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(credential ?? '')) throw new Error('Configure a valid RR_INBOX_PASSWORD_HASH');
  if (!existsSync(path)) throw new Error('Use the existing enquiry database');
  const db = openStore(path);
  db.exec(`CREATE TABLE IF NOT EXISTS enquiry_followup (
    submission_id TEXT PRIMARY KEY REFERENCES acquisition_requests(submission_id),
    status TEXT NOT NULL CHECK(status IN ('New','Contacted','Closed')),
    notes TEXT NOT NULL, revision INTEGER NOT NULL, updated_at TEXT NOT NULL
  ) STRICT;`);
  const sessions = new Map();
  let failures = 0, blockedUntil = 0;
  const html = readFileSync(new URL('./view.html', import.meta.url));
  const server = createServer(async (req, res) => {
    const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    if (req.headers.host !== new URL(origin).host) return send(403, { error: 'Invalid host' });
    const url = new URL(req.url, origin);
    for (const [key, session] of sessions) if (session.expires <= now()) sessions.delete(key);
    const token = /(?:^|;\s*)rr_inbox=([a-f0-9]+)/.exec(req.headers.cookie ?? '')?.[1];
    const session = sessions.get(token);
    try {
      if (req.method === 'GET' && url.pathname === '/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(html); }
      if (req.method === 'GET' && ['/app.js', '/style.css'].includes(url.pathname)) {
        res.writeHead(200, { 'Content-Type': url.pathname.endsWith('.js') ? 'text/javascript' : 'text/css' });
        return res.end(readFileSync(new URL(`.${url.pathname}`, import.meta.url)));
      }
      let body;
      if (req.method === 'POST') {
        if (req.headers.origin !== origin) return send(403, { error: 'Invalid origin' });
        if (req.headers['content-type']?.split(';')[0] !== 'application/json') return send(415, { error: 'JSON required' });
        let raw = '', size = 0;
        for await (const chunk of req) { size += chunk.length; if (size > 20000) return send(413, { error: 'Request too large' }); raw += chunk; }
        try { body = JSON.parse(raw); } catch { return send(400, { error: 'Invalid JSON' }); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) return send(400, { error: 'Invalid request' });
      }
      if (req.method === 'POST' && url.pathname === '/api/login') {
        if (now() < blockedUntil) return send(429, { error: 'Too many attempts. Wait 5 minutes.' });
        const password = body.password;
        if (typeof password !== 'string' || password.length > 1024) return send(400, { error: 'Invalid password' });
        const [salt, hash] = credential.split(':');
        if (!timingSafeEqual(Buffer.from(passwordHash(password, salt).split(':')[1], 'hex'), Buffer.from(hash, 'hex'))) {
          if (++failures >= 5) { blockedUntil = now() + 300000; failures = 0; }
          return send(401, { error: 'Incorrect password' });
        }
        failures = 0;
        const id = randomBytes(32).toString('hex');
        if (sessions.size >= 20) sessions.delete(sessions.keys().next().value);
        sessions.set(id, { expires: now() + 8 * 3600000 });
        res.setHeader('Set-Cookie', `rr_inbox=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${origin.startsWith('https:') ? '; Secure' : ''}`);
        return send(200, { ok: true });
      }
      if (!session) return send(401, { error: 'Sign in to view enquiries' });
      if (req.method === 'POST' && url.pathname === '/api/logout') {
        sessions.delete(token); res.setHeader('Set-Cookie', 'rr_inbox=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'); return send(200, { ok: true });
      }
      if (req.method === 'GET' && url.pathname === '/api/enquiries') {
        const offset = Number(url.searchParams.get('offset') ?? 0);
        if (!Number.isSafeInteger(offset) || offset < 0) return send(400, { error: 'Invalid offset' });
        const rows = db.prepare(`SELECT a.*, COALESCE(f.status,'New') status, COALESCE(f.notes,'') notes,
          COALESCE(f.revision,0) revision FROM acquisition_requests a LEFT JOIN enquiry_followup f USING(submission_id)
          ORDER BY a.created_at DESC, a.submission_id DESC LIMIT 51 OFFSET ?`).all(offset);
        return send(200, { more: rows.length > 50, enquiries: rows.slice(0,50).map(row => ({ ...row, payload: JSON.parse(row.payload) })) });
      }
      if (req.method === 'POST' && url.pathname === '/api/followup') {
        const { id, status, notes, revision } = body;
        if (typeof id !== 'string' || !['New','Contacted','Closed'].includes(status) || typeof notes !== 'string' || notes.length > 5000 || !Number.isSafeInteger(revision) || revision < 0) return send(400, { error: 'Invalid update' });
        db.exec('BEGIN IMMEDIATE');
        try {
          if (!db.prepare('SELECT 1 FROM acquisition_requests WHERE submission_id=?').get(id)) { db.exec('ROLLBACK'); return send(404, { error: 'Enquiry not found' }); }
          const prior = db.prepare('SELECT revision FROM enquiry_followup WHERE submission_id=?').get(id);
          if ((prior?.revision ?? 0) !== revision) { db.exec('ROLLBACK'); return send(409, { error: 'Changed in another window. Reload before editing.' }); }
          db.prepare(`INSERT INTO enquiry_followup VALUES (?,?,?,?,?) ON CONFLICT(submission_id) DO UPDATE SET
            status=excluded.status, notes=excluded.notes, revision=excluded.revision, updated_at=excluded.updated_at`).run(id,status,notes,revision+1,new Date(now()).toISOString());
          db.exec('COMMIT'); return send(200, { revision: revision + 1 });
        } catch (error) { if (db.isTransaction) db.exec('ROLLBACK'); throw error; }
      }
      return send(404, { error: 'Not found' });
    } catch { return send(500, { error: 'Could not complete request' }); }
  });
  server.on('close', () => db.close());
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return server;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.RR_INBOX_PORT ?? 3089);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid inbox port');
  const origin = `http://localhost:${port}`;
  const server = createInbox({ path: databasePath(), credential: process.env.RR_INBOX_PASSWORD_HASH, origin });
  server.on('error', () => { console.error('Inbox could not start. Check its port; do not stop another service.'); process.exit(78); });
  server.listen(port, '127.0.0.1', () => console.log(`Private inbox: ${origin}`));
}
