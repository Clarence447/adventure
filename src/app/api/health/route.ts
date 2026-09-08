export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  if (process.env.RR_STORAGE !== 'sqlite') return Response.json({ status: 'unavailable' }, { status: 503 });
  try {
    const { openStore, databasePath } = await import('../../../../selfhost/store.mjs');
    const db = openStore(databasePath());
    try { db.exec('BEGIN IMMEDIATE; ROLLBACK;'); } finally { db.close(); }
    return Response.json({ status: 'ready' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ status: 'unavailable' }, { status: 503 }); }
}
