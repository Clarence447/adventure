// Run after npm run build. Uses only a disposable database and an unused loopback port.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { passwordHash } from './server.mjs';
import { openStore } from '../store.mjs';
const probe = createServer();
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const dir = mkdtempSync(join(tmpdir(), 'rr-integrated-smoke-')), path = join(dir, 'db.sqlite');
openStore(path).close();
const origin = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { env: { ...process.env, RR_STORAGE: 'sqlite', RR_DB_PATH: path, RR_PUBLIC_ORIGIN: origin, RR_INBOX_PASSWORD_HASH: passwordHash('synthetic-smoke-password'), VERCEL: '' }, stdio: 'ignore' });
let cookie = '';
async function request(route, body, auth = true) { return fetch(origin + route, { redirect: 'manual', headers: { origin, 'content-type': 'application/json', ...(auth ? { cookie } : {}) }, ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }) }); }
try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
        try {
            if ((await fetch(origin + '/api/health')).ok) {
                ready = true;
                break;
            }
        }
        catch { }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert(ready, 'Server readiness');
    assert.equal((await request('/dashboard')).status, 307);
    assert.equal((await request('/dashboard/enquiries')).status, 307);
    assert.equal((await request('/api/inbox/enquiries')).status, 401);
    assert.match(await (await request('/login')).text(), /Owner sign in/);
    assert.match(await (await request('/')).text(), /Owner sign in/);
    const payload = { submission_id: '11111111-1111-4111-8111-111111111111', business_name: 'Synthetic Example Shop', business_type: 'Automotive', inquiries: 'Under 25', missed_calls: 'Rarely', response_time: 'Within an hour', follow_up: 'Every inquiry', goal: 'Recover missed calls', contact_name: 'Synthetic Owner', email: 'test@example.com', phone: '', consent: true, website: '' };
    assert.equal((await request('/api/acquisition', payload, false)).status, 200);
    const login = await request('/api/inbox/login', { password: 'synthetic-smoke-password' });
    assert.equal(login.status, 200);
    cookie = login.headers.get('set-cookie').split(';')[0];
    assert.equal((await request('/dashboard')).status, 200);
    assert.equal((await request('/dashboard/enquiries')).status, 200);
    let result = await (await request('/api/inbox/enquiries')).json();
    assert.equal(result.enquiries.length, 1);
    assert.equal((await request('/api/inbox/followup', { id: payload.submission_id, status: 'Contacted', notes: 'Synthetic follow-up', revision: 0 })).status, 200);
    result = await (await request('/api/inbox/enquiries')).json();
    assert.equal(result.enquiries[0].notes, 'Synthetic follow-up');
    assert.equal((await request('/api/acquisition', payload, false)).status, 200);
    assert.equal((await request('/api/inbox/enquiries', undefined, false)).status, 401);
    assert.equal((await request('/dashboard', {})).status, 404);
    assert.equal((await request('/api/export')).status, 404);
    assert.equal((await request('/api/inbox/logout', {})).status, 200);
    assert.equal((await request('/dashboard')).status, 307);
    assert.equal((await request('/api/inbox/enquiries')).status, 401);
    console.log('PASS: built application public submission, owner login, dashboard, enquiries, save, retry preservation, anonymous denial and logout');
}
finally {
    child.kill('SIGTERM');
    await once(child, 'exit');
    rmSync(dir, { recursive: true, force: true });
}
