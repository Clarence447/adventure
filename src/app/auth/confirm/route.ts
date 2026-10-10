import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const allowedDestinations = new Set(['/dashboard', '/onboarding', '/reset-password']);

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const requestedNext = searchParams.get('next') ?? '/dashboard';
  const next = allowedDestinations.has(requestedNext) ? requestedNext : '/dashboard';
  const supabase = await createClient();

  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error('Missing confirmation token') };

  if (!result.error) {
    return NextResponse.redirect(new URL(next, request.url));
  }

  const url = new URL('/login', request.url);
  url.searchParams.set('error', 'The confirmation link is invalid or expired.');
  return NextResponse.redirect(url);
}
