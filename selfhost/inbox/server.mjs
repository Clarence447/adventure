import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { openStore, databasePath } from '../store.mjs';
export function passwordHash(password, salt = randomBytes(16).toString('hex')) {
    return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
const digest = value => createHash('sha256').update(value).digest('hex');
export function createInbox({ path, credential, origin, now = Date.now }) {
    if (!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(credential ?? ''))
        throw new Error('Configure RR_INBOX_PASSWORD_HASH');
    const url = new URL(origin);
    if (url.origin !== origin || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))))
        throw new Error('Configure an exact HTTPS or localhost origin');
    if (!existsSync(path))
        throw new Error('Use the existing enquiry database');
    const db = openStore(path);
    db.exec(`CREATE TABLE IF NOT EXISTS enquiry_followup (
    submission_id TEXT PRIMARY KEY REFERENCES acquisition_requests(submission_id),
    status TEXT NOT NULL CHECK(status IN ('New','Contacted','Closed')),
    notes TEXT NOT NULL, revision INTEGER NOT NULL, updated_at TEXT NOT NULL
  ) STRICT;
  CREATE TABLE IF NOT EXISTS inbox_sessions (token TEXT PRIMARY KEY, credential TEXT NOT NULL, expires INTEGER NOT NULL) STRICT;
  CREATE TABLE IF NOT EXISTS inbox_login_limit (id INTEGER PRIMARY KEY CHECK(id=1), failures INTEGER NOT NULL, blocked_until INTEGER NOT NULL) STRICT;
  INSERT OR IGNORE INTO inbox_login_limit VALUES(1,0,0);`);
    const validSession = cookie => {
        const token = /(?:^|;\s*)rr_inbox=([a-f0-9]{64})(?:;|$)/.exec(cookie ?? '')?.[1];
        return token && db.prepare('SELECT token FROM inbox_sessions WHERE token=? AND credential=? AND expires>?').get(digest(token), digest(credential), now());
    };
    const send = (status, data, headers = {}) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
    const handle = async (request) => {
        const route = new URL(request.url).pathname;
        if (!['GET', 'POST'].includes(request.method))
            return send(405, { error: 'Method not allowed' });
        try {
            let body;
            if (request.method === 'POST') {
                if (request.headers.get('origin') !== origin)
                    return send(403, { error: 'Please use this website to make changes.' });
                if (request.headers.get('content-type')?.split(';')[0] !== 'application/json')
                    return send(415, { error: 'JSON required' });
                const reader = request.body?.getReader();
                if (!reader)
                    return send(400, { error: 'Request required' });
                const chunks = [];
                let size = 0;
                while (true) {
                    const { value, done } = await reader.read();
                    if (done)
                        break;
                    size += value.length;
                    if (size > 20000) {
                        await reader.cancel();
                        return send(413, { error: 'Request too large' });
                    }
                    chunks.push(value);
                }
                try {
                    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                }
                catch {
                    return send(400, { error: 'Invalid JSON' });
                }
                if (!body || typeof body !== 'object' || Array.isArray(body))
                    return send(400, { error: 'Invalid request' });
            }
            if (request.method === 'POST' && route === '/api/inbox/login') {
                if (typeof body.password !== 'string' || body.password.length > 1024)
                    return send(400, { error: 'Invalid password' });
                db.exec('BEGIN IMMEDIATE');
                try {
                    const limit = db.prepare('SELECT * FROM inbox_login_limit WHERE id=1').get();
                    if (now() < limit.blocked_until) {
                        db.exec('COMMIT');
                        return send(429, { error: 'Too many attempts. Try again in five minutes.' }, { 'Retry-After': '300' });
                    }
                    const [salt, hash] = credential.split(':');
                    if (!timingSafeEqual(Buffer.from(passwordHash(body.password, salt).split(':')[1], 'hex'), Buffer.from(hash, 'hex'))) {
                        const failures = limit.failures + 1;
                        db.prepare('UPDATE inbox_login_limit SET failures=?,blocked_until=? WHERE id=1').run(failures >= 5 ? 0 : failures, failures >= 5 ? now() + 300000 : 0);
                        db.exec('COMMIT');
                        return send(401, { error: 'Incorrect password.' });
                    }
                    db.prepare('UPDATE inbox_login_limit SET failures=0,blocked_until=0 WHERE id=1').run();
                    db.prepare('DELETE FROM inbox_sessions WHERE expires<=? OR credential<>?').run(now(), digest(credential));
                    db.exec('DELETE FROM inbox_sessions WHERE token IN (SELECT token FROM inbox_sessions ORDER BY expires DESC LIMIT -1 OFFSET 19)');
                    const token = randomBytes(32).toString('hex');
                    db.prepare('INSERT INTO inbox_sessions VALUES(?,?,?)').run(digest(token), digest(credential), now() + 8 * 3600000);
                    db.exec('COMMIT');
                    return send(200, { ok: true }, { 'Set-Cookie': `rr_inbox=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${url.protocol === 'https:' ? '; Secure' : ''}` });
                }
                catch (error) {
                    if (db.isTransaction)
                        db.exec('ROLLBACK');
                    throw error;
                }
            }
            const session = validSession(request.headers.get('cookie'));
            if (!session)
                return send(401, { error: 'Your session ended. Sign in again to continue.' });
            if (request.method === 'POST' && route === '/api/inbox/logout') {
                db.prepare('DELETE FROM inbox_sessions WHERE token=?').run(session.token);
                return send(200, { ok: true }, { 'Set-Cookie': `rr_inbox=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${url.protocol === 'https:' ? '; Secure' : ''}` });
            }
            if (request.method === 'GET' && route === '/api/inbox/enquiries') {
                const params = new URL(request.url).searchParams, offset = Number(params.get('offset') ?? 0), status = params.get('status') ?? 'All';
                if (!Number.isSafeInteger(offset) || offset < 0 || !['All', 'New', 'Contacted', 'Closed'].includes(status))
                    return send(400, { error: 'Invalid filter' });
                const rows = db.prepare(`SELECT a.*,COALESCE(f.status,'New') status,COALESCE(f.notes,'') notes,COALESCE(f.revision,0) revision
          FROM acquisition_requests a LEFT JOIN enquiry_followup f USING(submission_id)
          WHERE (?='All' OR COALESCE(f.status,'New')=?) ORDER BY a.created_at DESC,a.submission_id DESC LIMIT 51 OFFSET ?`).all(status, status, offset);
                const counts = db.prepare(`SELECT COALESCE(f.status,'New') status,count(*) count FROM acquisition_requests a LEFT JOIN enquiry_followup f USING(submission_id) GROUP BY COALESCE(f.status,'New')`).all();
                return send(200, { more: rows.length > 50, counts, enquiries: rows.slice(0, 50).map(row => ({ ...row, payload: JSON.parse(row.payload) })) });
            }
            if (request.method === 'POST' && route === '/api/inbox/followup') {
                const { id, status, notes, revision } = body;
                if (typeof id !== 'string' || !['New', 'Contacted', 'Closed'].includes(status) || typeof notes !== 'string' || notes.length > 5000 || !Number.isSafeInteger(revision) || revision < 0)
                    return send(400, { error: 'Check the status and notes (maximum 5,000 characters).' });
                db.exec('BEGIN IMMEDIATE');
                try {
                    if (!db.prepare('SELECT 1 FROM acquisition_requests WHERE submission_id=?').get(id)) {
                        db.exec('ROLLBACK');
                        return send(404, { error: 'Enquiry not found' });
                    }
                    const prior = db.prepare('SELECT revision FROM enquiry_followup WHERE submission_id=?').get(id);
                    if ((prior?.revision ?? 0) !== revision) {
                        db.exec('ROLLBACK');
                        return send(409, { error: 'This enquiry changed in another window. Copy your notes, then reload the enquiry before saving.' });
                    }
                    db.prepare(`INSERT INTO enquiry_followup VALUES(?,?,?,?,?) ON CONFLICT(submission_id) DO UPDATE SET status=excluded.status,notes=excluded.notes,revision=excluded.revision,updated_at=excluded.updated_at`).run(id, status, notes, revision + 1, new Date(now()).toISOString());
                    db.exec('COMMIT');
                    return send(200, { revision: revision + 1 });
                }
                catch (error) {
                    if (db.isTransaction)
                        db.exec('ROLLBACK');
                    throw error;
                }
            }
            return send(404, { error: 'Not found' });
        }
        catch {
            return send(503, { error: 'Could not complete this request. Please try again.' });
        }
    };
    return { handle, authenticated: cookie => Boolean(validSession(cookie)), close: () => db.close() };
}
export function configuredInbox() {
    if (process.env.RR_STORAGE !== 'sqlite')
        throw new Error('Local inbox only');
    return createInbox({ path: databasePath(), credential: process.env.RR_INBOX_PASSWORD_HASH, origin: process.env.RR_PUBLIC_ORIGIN });
}
