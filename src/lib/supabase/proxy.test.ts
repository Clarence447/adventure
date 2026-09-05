import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const { getClaims } = vi.hoisted(() => ({ getClaims: vi.fn() }));
vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: { setAll: (cookies: unknown[]) => void } }) => ({
    auth: { getClaims: async () => {
      options.cookies.setAll([{ name: 'session', value: '', options: { maxAge: 0, path: '/', httpOnly: true } }]);
      return getClaims();
    } },
  }),
}));
vi.mock('./config', () => ({ getSupabaseUrl: () => 'https://example.supabase.co', getSupabasePublicKey: () => 'test' }));
import { updateSession } from './proxy';
beforeEach(() => getClaims.mockReset());
it('preserves cleared auth cookies when redirecting an expired session', async () => {
  getClaims.mockResolvedValue({ data: null });
  const response = await updateSession(new NextRequest('https://example.com/settings'));
  expect(response.headers.get('location')).toBe('https://example.com/login?next=%2Fsettings');
  expect(response.cookies.get('session')).toMatchObject({ value: '', maxAge: 0, httpOnly: true });
});
it('allows a verified session through', async () => {
  getClaims.mockResolvedValue({ data: { claims: { sub: 'owner' } } });
  const response = await updateSession(new NextRequest('https://example.com/dashboard'));
  expect(response.headers.get('location')).toBeNull();
});
