import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  if (process.env.RR_STORAGE === 'sqlite') {
    const path = request.nextUrl.pathname;
    const publicRead = ['/', '/assessment', '/api/health', '/login', '/dashboard', '/dashboard/enquiries'].includes(path);
    const allowed = (publicRead && ['GET', 'HEAD'].includes(request.method)) ||
      (path === '/api/acquisition' && request.method === 'POST') ||
      (['/api/inbox/login', '/api/inbox/logout', '/api/inbox/followup'].includes(path) && request.method === 'POST') ||
      (path === '/api/inbox/enquiries' && request.method === 'GET') ||
      (path.startsWith('/_next/') && ['GET', 'HEAD'].includes(request.method));
    const response = allowed ? NextResponse.next() : new NextResponse('Not found', { status: 404 });
    if (path === '/login' || path.startsWith('/dashboard') || path.startsWith('/api/inbox/')) {
      response.headers.set('Cache-Control', 'no-store');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('Referrer-Policy', 'no-referrer');
      response.headers.set('X-Content-Type-Options', 'nosniff');
    }
    return response;
  }
  return updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
