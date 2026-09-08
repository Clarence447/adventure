import { createClient } from '@supabase/supabase-js';
import { acquisitionSchema } from '../../../lib/acquisition';

export async function POST(request: Request) {
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) {
    return Response.json({ error: 'Please submit from this website.' }, { status: 403 });
  }
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return Response.json({ error: 'Invalid submission.' }, { status: 415 });
  }
  // Bound the streamed body as well as declared content length.
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: 'Invalid submission.' }, { status: 400 });
  let text = '';
  let bytes = 0;
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 8192) {
        await reader.cancel();
        return Response.json({ error: 'Submission is too large.' }, { status: 413 });
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    const parsed = acquisitionSchema.safeParse(JSON.parse(text));
    if (!parsed.success) return Response.json({ error: 'Check the form and complete all required fields.' }, { status: 400 });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return Response.json({ error: 'The form is temporarily unavailable. Please try again later.' }, { status: 503 });
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { website: _website, ...lead } = parsed.data;
    void _website;
    const { data, error } = await db.rpc('submit_acquisition_request', { payload: lead });
    if (error) return Response.json({ error: 'Your request could not be saved. Please try again.' }, { status: 503 });
    if (data === 'rate_limited') return Response.json({ error: 'Too many requests. Please try again in an hour.' }, { status: 429 });
    if (data === 'submission_mismatch') return Response.json({ error: 'Your answers changed after the first submission attempt. Please reload the form and submit again.' }, { status: 409 });
    if (data !== 'received') return Response.json({ error: 'Your request could not be saved. Please try again.' }, { status: 503 });
    return Response.json({ received: true });
  } catch {
    return Response.json({ error: 'Your request could not be processed. Please try again.' }, { status: 400 });
  }
}
