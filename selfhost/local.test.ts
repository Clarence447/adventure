import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { backupStore, exportStore, openStore, submitLocal } from './store.mjs';
import { POST } from '../src/app/api/acquisition/route';
import { GET } from '../src/app/api/health/route';
import { proxy } from '../src/proxy';
import type { AcquisitionInput } from '../src/lib/acquisition';
let dir: string;
let path: string;
const valid: AcquisitionInput = { submission_id: '11111111-1111-4111-8111-111111111111', business_name: 'Test Shop', business_type: 'Automotive', inquiries: 'Under 25', missed_calls: 'Rarely', response_time: 'Within an hour', follow_up: 'Every inquiry', goal: 'Recover missed calls', contact_name: 'Test Owner', email: 'owner@example.com', phone: '', consent: true, website: '' };
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'revenue-test-')); path = join(dir, 'enquiries.sqlite');
  vi.stubEnv('RR_STORAGE', 'sqlite'); vi.stubEnv('RR_DB_PATH', path);
  vi.stubEnv('RR_PUBLIC_ORIGIN', 'https://revenue.example'); vi.stubEnv('VERCEL', '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', ''); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
});
afterEach(() => { vi.unstubAllEnvs(); rmSync(dir, { recursive: true, force: true }); });
function request(payload = valid, origin = 'https://revenue.example') {
  return new Request('http://localhost:3088/api/acquisition', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(payload) });
}
it('saves through the real endpoint without Supabase and survives reopening', async () => {
  expect((await POST(request())).status).toBe(200);
  const db = openStore(path);
  expect(db.prepare('SELECT count(*) AS n FROM acquisition_requests').get()?.n).toBe(1); db.close();
  expect((await GET()).status).toBe(200);
  expect((await POST(request())).status).toBe(200);
  const reopened = openStore(path);
  expect(reopened.prepare('SELECT count(*) AS n FROM acquisition_requests').get()?.n).toBe(1); reopened.close();
});
it('rejects edited retries and preserves the original record', async () => {
  await POST(request());
  expect((await POST(request({ ...valid, business_name: 'Edited Shop' }))).status).toBe(409);
  const file = join(dir, 'export.json'); expect(exportStore(path, file)).toBe(1);
  const row = JSON.parse(readFileSync(file, 'utf8')).acquisition_requests[0];
  expect(row.business_name).toBe('Test Shop'); expect(row.answers.goal).toBe(valid.goal);
  expect(row.consent_version).toBe('enquiry-contact-v1'); expect(row.consent_at).toMatch(/^\d{4}-/);
  expect(() => exportStore(path, file)).toThrow();
});
it('enforces normalized per-email limits and retains successful retry acknowledgements', () => {
  expect(submitLocal(valid, path)).toBe('received');
  for (let i = 0; i < 2; i++) expect(submitLocal({ ...valid, email: 'OWNER@example.com', submission_id: randomUUID() }, path)).toBe('received');
  expect(submitLocal({ ...valid, submission_id: randomUUID() }, path)).toBe('rate_limited');
  expect(submitLocal(valid, path)).toBe('received');
});
it('backs up an open WAL database and restores exportable records', async () => {
  const db = openStore(path); submitLocal(valid, path);
  const snapshot = join(dir, 'backup.sqlite'); await backupStore(path, snapshot); db.close();
  expect(exportStore(snapshot, join(dir, 'restored.json'))).toBe(1);
  await expect(backupStore(path, snapshot)).rejects.toThrow();
});
it('fails closed for invalid paths and serverless deployment', async () => {
  vi.stubEnv('RR_DB_PATH', 'relative.sqlite'); expect((await POST(request())).status).toBe(503);
  vi.stubEnv('RR_DB_PATH', path); vi.stubEnv('VERCEL', '1'); expect((await POST(request())).status).toBe(503);
});
it('accepts only the configured public origin behind a local proxy', async () => {
  expect((await POST(request(valid, 'https://attacker.example'))).status).toBe(403);
  expect((await POST(request())).status).toBe(200);
});
it.each(['/signup', '/login', '/dashboard', '/settings', '/auth/confirm', '/api/export', '/.revenue-data/enquiries.sqlite'])('does not expose account or enquiry read routes: %s', async path => {
  expect((await proxy(new NextRequest(`http://localhost:3088${path}`))).status).toBe(404);
});
it('blocks server actions on public pages but allows the enquiry endpoint', async () => {
  expect((await proxy(new NextRequest('http://localhost:3088/', { method: 'POST' }))).status).toBe(404);
  expect((await proxy(new NextRequest('http://localhost:3088/api/acquisition', { method: 'POST' }))).status).toBe(200);
});

it('serializes simultaneous writers across processes without exceeding the cap', async () => {
  openStore(path).close();
  const moduleUrl = pathToFileURL(resolve('selfhost/store.mjs')).href;
  const results = await Promise.all(Array.from({ length: 6 }, async () => {
    const code = `import { submitLocal } from ${JSON.stringify(moduleUrl)}; console.log(submitLocal(JSON.parse(process.argv[1]), process.argv[2]));`;
    const result = await promisify(execFile)(process.execPath, ['--input-type=module', '-e', code, JSON.stringify({ ...valid, submission_id: randomUUID() }), path]);
    return result.stdout.trim();
  }));
  expect(results.filter(r => r === 'received')).toHaveLength(3);
  expect(results.filter(r => r === 'rate_limited')).toHaveLength(3);
});
