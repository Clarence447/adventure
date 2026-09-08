import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  if (process.env.RR_STORAGE === 'sqlite') {
    const path = request.nextUrl.pathname;
    const publicRead = ['/', '/assessment', '/api/health'].includes(path);
    const allowed = (publicRead && ['GET', 'HEAD'].includes(request.method)) ||
      (path === '/api/acquisition' && request.method === 'POST') ||
      (path.startsWith('/_next/') && ['GET', 'HEAD'].includes(request.method));
    return allowed ? NextResponse.next() : new NextResponse('Not found', { status: 404 });
  }
  return updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
