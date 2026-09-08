import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { configuredInbox } from '../../selfhost/inbox/server.mjs';
export async function requireOwner() {
  let inbox;
  let authenticated = false;
  try { inbox = configuredInbox(); authenticated = inbox.authenticated((await cookies()).toString()); }
  catch { /* Fail closed when host configuration or storage is unavailable. */ }
  finally { inbox?.close(); }
  if (!authenticated) redirect('/login');
}
