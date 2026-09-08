'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
const button = 'rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white disabled:opacity-50';
const field = 'mt-2 block w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-950';
type Status = 'New' | 'Contacted' | 'Closed';
type Enquiry = {
    submission_id: string;
    created_at: string;
    consent_at: string;
    consent_version: string;
    status: Status;
    notes: string;
    revision: number;
    payload: Record<string, string>;
};
type Result = {
    enquiries: Enquiry[];
    counts: {
        status: Status;
        count: number;
    }[];
    more: boolean;
};
async function api(path: string, body?: unknown) {
    const response = await fetch(`/api/inbox/${path}`, { cache: 'no-store', ...(body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
    const result = await response.json();
    if (!response.ok)
        throw Object.assign(new Error(result.error || 'Please try again.'), { status: response.status });
    return result;
}
export function OwnerLogin() {
    const router = useRouter();
    const [error, setError] = useState(''), [busy, setBusy] = useState(false);
    return <main className="mx-auto max-w-md px-6 py-16"><Link href="/" className="font-bold text-emerald-800">Revenue Recovery AI</Link><section className="mt-8 rounded-2xl bg-white p-7 shadow-sm"><h1 className="text-3xl font-bold">Owner sign in</h1><p className="mt-3 text-slate-600">Review enquiries and manage your follow-up.</p><form className="mt-6" onSubmit={async (event) => { event.preventDefault(); const form = event.currentTarget; setBusy(true); setError(''); try {
        await api('login', { password: new FormData(form).get('password') });
        form.reset();
        router.replace('/dashboard');
        router.refresh();
    }
    catch (error) {
        setError((error as Error).message);
    }
    finally {
        setBusy(false);
    } }}><label className="font-medium">Password<input name="password" type="password" required maxLength={1024} autoComplete="current-password" className={field}/></label>{error && <p role="alert" className="mt-4 text-red-800">{error}</p>}<button disabled={busy} className={`${button} mt-6 w-full`}>{busy ? 'Signing in…' : 'Sign in'}</button></form><p className="mt-5 text-sm text-slate-600">Use your owner password. If you have lost it, reset it on your host computer.</p></section></main>;
}
export function OwnerWorkspace({ enquiries = false }: {
    enquiries?: boolean;
}) {
    const router = useRouter();
    const [data, setData] = useState<Result | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [filter, setFilter] = useState('All'), [offset, setOffset] = useState(0);
    const [selected, setSelected] = useState<Enquiry | null>(null), [status, setStatus] = useState<Status>('New'), [notes, setNotes] = useState(''), [saving, setSaving] = useState(false), [saved, setSaved] = useState(''), [expired, setExpired] = useState(false);
    const requestId = useRef(0);
    const dirty = !!selected && (status !== selected.status || notes !== selected.notes);
    const load = useCallback(async () => { const id = ++requestId.current; try {
        const result = await api(`enquiries?offset=${offset}&status=${filter}`);
        if (id === requestId.current) {
            setData(result);
            setError('');
        }
    }
    catch (error) {
        if (id === requestId.current) {
            setError((error as Error).message);
            if ((error as {
                status?: number;
            }).status === 401) {
                setExpired(true);
                setData(null);
            }
        }
    }
    finally {
        if (id === requestId.current)
            setLoading(false);
    } }, [offset, filter]);
    useEffect(() => { let active = true; const id = ++requestId.current; api(`enquiries?offset=${offset}&status=${filter}`).then(result => { if (active && id === requestId.current) {
        setData(result);
        setError('');
    } }).catch(error => { if (active && id === requestId.current) {
        setError(error.message);
        if (error.status === 401) {
            setExpired(true);
            setData(null);
        }
    } }).finally(() => { if (active && id === requestId.current)
        setLoading(false); }); return () => { active = false; }; }, [offset, filter]);
    useEffect(() => { if (!dirty)
        return; const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
    function leave() { return !dirty || window.confirm('Discard your unsaved changes?'); }
    function close() { if (leave()) {
        setSelected(null);
        setSaved('');
    } }
    return <div className="min-h-screen bg-slate-50 text-slate-950"><header className="bg-slate-950 px-6 py-5 text-white"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4"><Link href="/dashboard" onClick={e => { if (!leave())
        e.preventDefault(); }} className="text-xl font-bold">Revenue Recovery AI</Link><nav aria-label="Owner navigation" className="flex flex-wrap gap-5 text-sm"><Link href="/dashboard" aria-current={!enquiries ? 'page' : undefined} onClick={e => { if (!leave())
        e.preventDefault(); }}>Dashboard</Link><Link href="/dashboard/enquiries" aria-current={enquiries ? 'page' : undefined} onClick={e => { if (!leave())
        e.preventDefault(); }}>Enquiries</Link><button disabled={saving} onClick={async () => { if (!leave())
        return; try {
        await api('logout', {});
        router.replace('/login');
        router.refresh();
    }
    catch (error) {
        setError((error as Error).message);
    } }}>Sign out</button></nav></div></header><main className="mx-auto max-w-6xl px-6 py-9"><p className="text-sm font-semibold text-emerald-800">YOUR WORKSPACE</p><h1 className="mt-2 text-3xl font-bold">{enquiries ? 'Enquiries' : 'Welcome back'}</h1><p className="mt-3 text-slate-600">{enquiries ? 'Review each request and keep the next conversation moving.' : 'Everything you need to review and follow up on new business enquiries.'}</p>
    {error && <div role="alert" className="my-5 rounded-xl bg-red-50 p-4 text-red-900">{error} {expired ? <Link href="/login" className="underline">Sign in again</Link> : <button className="underline" onClick={() => void load()}>Try again</button>}</div>}
    {!enquiries ? <><div className="my-8 grid gap-4 sm:grid-cols-3">{(['New', 'Contacted', 'Closed'] as Status[]).map(s => <section key={s} className="rounded-2xl border border-slate-200 bg-white p-6"><p className="text-slate-600">{s}</p><p className="mt-3 text-4xl font-bold">{data ? data.counts.find(c => c.status === s)?.count ?? 0 : '—'}</p></section>)}</div><Link href="/dashboard/enquiries" className={`${button} inline-block`}>Open enquiries →</Link><p className="mt-5 text-sm text-slate-600">New submissions are saved here. Check your inbox regularly for requests.</p></> : <>
    <div className="my-7 flex flex-wrap items-end gap-4"><label className="text-sm font-medium">Show status<select value={filter} disabled={saving} className={field} onChange={e => { if (!leave())
            return; setSelected(null); setLoading(true); setFilter(e.target.value); setOffset(0); }}>{['All', 'New', 'Contacted', 'Closed'].map(s => <option key={s}>{s}</option>)}</select></label><button className={button} disabled={loading || saving} onClick={() => { if (!leave())
            return; setSelected(null); setLoading(true); void load(); }}>Refresh</button><p className="pb-3 text-sm text-slate-600">Newest first</p></div>
    {loading ? <p role="status">Loading enquiries…</p> : !expired && data && <div className="grid items-start gap-6 lg:grid-cols-2"><section aria-label="Enquiry list" className="space-y-3">{!data.enquiries.length ? <div className="rounded-2xl border bg-white p-7"><h2 className="text-xl font-semibold">{filter === 'All' ? 'No enquiries yet' : `No ${filter.toLowerCase()} enquiries`}</h2><p className="mt-3 text-slate-600">{filter === 'All' ? 'Completed questionnaires will appear here.' : 'Choose another status to see more requests.'}</p></div> : data.enquiries.map(row => <button key={row.submission_id} className={`w-full rounded-2xl border bg-white p-5 text-left ${selected?.submission_id === row.submission_id ? 'border-emerald-700 ring-1 ring-emerald-700' : 'border-slate-200'}`} disabled={saving} onClick={() => { if (!leave())
                return; setSelected(row); setStatus(row.status); setNotes(row.notes); setSaved(''); }}><span className="flex flex-wrap justify-between gap-2"><strong className="break-words">{row.payload.business_name}</strong><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">{row.status}</span></span><span className="mt-2 block break-words text-sm text-slate-600">{row.payload.contact_name} · {new Date(row.created_at).toLocaleString()}</span><span className="mt-3 block text-sm font-semibold text-emerald-800">Open enquiry →</span></button>)}<div className="flex justify-between gap-3 pt-4"><button disabled={offset === 0 || saving} className={button} onClick={() => { if (leave()) {
                setSelected(null);
                setLoading(true);
                setOffset(Math.max(0, offset - 50));
            } }}>Previous</button><button disabled={!data.more || saving} className={button} onClick={() => { if (leave()) {
                setSelected(null);
                setLoading(true);
                setOffset(offset + 50);
            } }}>Next</button></div></section>
    {selected ? <section aria-label="Enquiry details" className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-start justify-between gap-4"><h2 className="break-words text-2xl font-bold">{selected.payload.business_name}</h2><button disabled={saving} onClick={close} className="text-sm underline">Close</button></div><p className="mt-3 break-words">{selected.payload.contact_name}</p><p className="mt-2 break-all"><a className="text-emerald-800 underline" href={`mailto:${selected.payload.email}`}>{selected.payload.email}</a></p><p className="mt-2">{selected.payload.phone ? <a className="text-emerald-800 underline" href={`tel:${selected.payload.phone}`}>{selected.payload.phone}</a> : 'No phone supplied'}</p><h3 className="mt-6 font-bold">Questionnaire</h3><dl className="mt-3 space-y-3">{Object.entries({ business_type: 'Business type', inquiries: 'Monthly enquiries', missed_calls: 'Unanswered calls', response_time: 'Response time', follow_up: 'Current follow-up', goal: 'Goal' }).map(([key, label]) => <div key={key}><dt className="text-sm text-slate-500">{label}</dt><dd className="break-words">{selected.payload[key] || 'Not supplied'}</dd></div>)}</dl><p className="mt-5 text-xs text-slate-500">Contact consent recorded {new Date(selected.consent_at).toLocaleString()} · {selected.consent_version}</p><form className="mt-6 border-t pt-5" onSubmit={async (e) => { e.preventDefault(); setSaving(true); setSaved(''); try {
                const result = await api('followup', { id: selected.submission_id, status, notes, revision: selected.revision });
                const updated = { ...selected, status, notes, revision: result.revision };
                setSelected(updated);
                setData(prev => prev ? { ...prev, enquiries: prev.enquiries.map(row => row.submission_id === updated.submission_id ? updated : row) } : prev);
                setSaved('Changes saved.');
            }
            catch (error) {
                setSaved((error as Error).message);
            }
            finally {
                setSaving(false);
            } }}><label className="block font-medium">Status<select className={field} value={status} disabled={saving} onChange={e => setStatus(e.target.value as Status)}>{['New', 'Contacted', 'Closed'].map(s => <option key={s}>{s}</option>)}</select></label><label className="mt-5 block font-medium">Follow-up notes<textarea className={field} rows={5} maxLength={5000} value={notes} disabled={saving} onChange={e => setNotes(e.target.value)}/></label><p className="mt-2 text-xs text-slate-500">{notes.length}/5,000 characters{dirty ? ' · Unsaved changes' : ''}</p><button className={`${button} mt-4`} disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save changes'}</button>{saved && <p role="status" className="mt-3">{saved}</p>}</form></section> : <section className="rounded-2xl border border-dashed border-slate-300 p-8 text-slate-600">Select an enquiry to read the questionnaire and record your follow-up.</section>}
    </div>}
    </>}
  </main></div>;
}
