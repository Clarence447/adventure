import { it, expect } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInbox, passwordHash } from './server.mjs';
import { submitLocal, openStore, backupStore } from '../store.mjs';
it('integrated authentication, CSRF, conflicts, logout, expiry, filters and backup preserve original submissions', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rr-inbox-')), path = join(dir, 'db.sqlite'), origin = 'http://localhost:3088', credential = passwordHash('test-password');
    const payload = { submission_id: 'test', email: 'owner@example.com', consent: true, business_name: 'Example', contact_name: 'Owner', business_type: 'Automotive', inquiries: 'Under 25', missed_calls: 'Rarely', response_time: 'Within an hour', follow_up: 'Every inquiry', goal: 'Recover missed calls', phone: '' } as const;
    submitLocal(payload, path);
    let clock = Date.now(), cookie = '';
    let inbox = createInbox({ path, credential, origin, now: () => clock });
    const req = (route: string, body?: unknown, headers = {}) => inbox.handle(new Request(origin + '/api/inbox/' + route, { method: body === undefined ? 'GET' : 'POST', headers: { origin, 'content-type': 'application/json', cookie, ...headers }, body: body === undefined ? undefined : JSON.stringify(body) }));
    try {
        expect((await req('enquiries')).status).toBe(401);
        expect((await req('login', { password: 'wrong' })).status).toBe(401);
        expect((await req('login', { password: 'test-password' }, { origin: 'https://evil.test' })).status).toBe(403);
        const login = await req('login', { password: 'test-password' });
        expect(login.status).toBe(200);
        expect(login.headers.get('set-cookie')).toContain('HttpOnly');
        cookie = login.headers.get('set-cookie')!.split(';')[0];
        expect(inbox.authenticated(cookie)).toBe(true);
        expect((await (await req('enquiries')).json()).enquiries).toHaveLength(1);
        const update = { id: 'test', status: 'Contacted', notes: 'Call tomorrow', revision: 0 };
        expect((await req('followup', update, { origin: 'https://evil.test' })).status).toBe(403);
        expect((await req('followup', update)).status).toBe(200);
        expect((await req('followup', update)).status).toBe(409);
        expect((await req('followup', { ...update, id: 'missing' })).status).toBe(404);
        expect((await req('followup', { ...update, status: 'invalid' })).status).toBe(400);
        expect((await (await req('enquiries?status=New')).json()).enquiries).toHaveLength(0);
        expect(submitLocal(payload, path)).toBe('received');
        inbox.close();
        inbox = createInbox({ path, credential, origin, now: () => clock });
        expect(inbox.authenticated(cookie)).toBe(true);
        const backup = join(dir, 'backup.sqlite');
        await backupStore(path, backup);
        const restored = openStore(backup);
        expect(restored.prepare('SELECT notes FROM enquiry_followup').get()?.notes).toBe('Call tomorrow');
        restored.close();
        clock += 9 * 3600000;
        expect((await req('enquiries')).status).toBe(401);
        cookie = (await req('login', { password: 'test-password' })).headers.get('set-cookie')!.split(';')[0];
        expect((await req('logout', {})).status).toBe(200);
        expect((await req('enquiries')).status).toBe(401);
    }
    finally {
        inbox.close();
        rmSync(dir, { recursive: true, force: true });
    }
});
it('persists throttling across workers and rotation invalidates sessions', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rr-auth-')), path = join(dir, 'db.sqlite'), origin = 'https://revenue.example.com';
    openStore(path).close();
    const credential = passwordHash('correct');
    let inbox = createInbox({ path, credential, origin });
    const login = (password: string) => inbox.handle(new Request(origin + '/api/inbox/login', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ password }) }));
    try {
        const response = await login('correct');
        expect(response.headers.get('set-cookie')).toContain('Secure');
        const cookie = response.headers.get('set-cookie')!.split(';')[0];
        inbox.close();
        inbox = createInbox({ path, credential: passwordHash('changed'), origin });
        expect(inbox.authenticated(cookie)).toBe(false);
        for (let i = 0; i < 5; i++)
            expect((await login('wrong')).status).toBe(401);
        inbox.close();
        inbox = createInbox({ path, credential, origin });
        expect((await login('correct')).status).toBe(429);
    }
    finally {
        inbox.close();
        rmSync(dir, { recursive: true, force: true });
    }
});
