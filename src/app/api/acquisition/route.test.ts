import { beforeEach, expect, it, vi } from 'vitest';
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ rpc }) }));
import { POST } from './route';
const valid = { submission_id: '11111111-1111-4111-8111-111111111111', business_name: 'Test Shop', business_type: 'Automotive', inquiries: 'Under 25', missed_calls: 'Rarely', response_time: 'Within an hour', follow_up: 'Every inquiry', goal: 'Recover missed calls', contact_name: 'Test Owner', email: 'owner@example.com', phone: '', consent: true, website: '' };
function request(body = JSON.stringify(valid), origin = 'https://example.com') {
  return new Request('https://example.com/api/acquisition', { method: 'POST', headers: { 'content-type': 'application/json', origin }, body });
}
beforeEach(() => {
  rpc.mockReset();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test');
});
it('confirms only acknowledged storage', async () => {
  rpc.mockResolvedValue({ data: 'received', error: null });
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ received: true });
  expect(rpc).toHaveBeenCalledWith('submit_acquisition_request', { payload: expect.objectContaining({ submission_id: valid.submission_id, email: valid.email }) });
});
it('does not claim success after a database failure', async () => {
  rpc.mockResolvedValue({ error: { message: 'private detail' } });
  const response = await POST(request());
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain('private detail');
});
it('reports the database rate limit', async () => {
  rpc.mockResolvedValue({ data: 'rate_limited', error: null });
  expect((await POST(request())).status).toBe(429);
});
it('rejects cross-origin posts without storage access', async () => {
  expect((await POST(request(undefined, 'https://other.example'))).status).toBe(403);
  expect(rpc).not.toHaveBeenCalled();
});
it.each(['{broken', JSON.stringify({ ...valid, consent: false }), JSON.stringify({ ...valid, website: 'bot' })])('rejects malformed input', async body => {
  expect((await POST(request(body))).status).toBe(400);
  expect(rpc).not.toHaveBeenCalled();
});
it('rejects oversized bodies without relying on content length', async () => {
  expect((await POST(request('x'.repeat(8193)))).status).toBe(413);
  expect(rpc).not.toHaveBeenCalled();
});
it('fails clearly when server storage is not configured', async () => {
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
  expect((await POST(request())).status).toBe(503);
  expect(rpc).not.toHaveBeenCalled();
});
