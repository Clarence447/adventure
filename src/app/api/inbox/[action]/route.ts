import { configuredInbox } from '../../../../../selfhost/inbox/server.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function handle(request: Request) {
  if (process.env.RR_STORAGE !== 'sqlite') return new Response('Not found', { status: 404 });
  let inbox;
  try { inbox = configuredInbox(); return await inbox.handle(request); }
  catch { return Response.json({ error: 'Owner access is not available. Check setup on the host.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
  finally { inbox?.close(); }
}
export const GET = handle;
export const POST = handle;
