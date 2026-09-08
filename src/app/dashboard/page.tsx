import { requireOwner } from '@/lib/owner-auth';
import { OwnerWorkspace } from '@/components/owner-workspace';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  if (process.env.RR_STORAGE === 'sqlite') { await requireOwner(); return <OwnerWorkspace />; }
  const { supabase, userId } = await requireUser();
  const { data: business, error } = await supabase
    .from('businesses')
    .select('name, phone_number, services, service_area, subscription_status')
    .eq('owner_user_id', userId)
    .maybeSingle();

  if (!business && !error) {
    redirect('/onboarding');
  }

  if (error || !business) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900">
          Customer data could not be loaded. Try again or check the Supabase migration.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <p className="text-sm font-semibold text-emerald-700">Protected customer account</p>
      <h1 className="mt-2 text-4xl font-bold">{business.name}</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Routing number</p>
          <p className="mt-2 font-semibold">{business.phone_number}</p>
        </section>
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Service area</p>
          <p className="mt-2 font-semibold">{business.service_area}</p>
        </section>
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Subscription</p>
          <p className="mt-2 font-semibold capitalize">{business.subscription_status}</p>
        </section>
      </div>
      <section className="mt-6 rounded-xl bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Configured services</p>
        <p className="mt-2 font-semibold">{business.services?.join(', ') || 'No services configured'}</p>
      </section>
      <p className="mt-8 text-sm text-slate-500">
        Lead metrics remain intentionally out of this slice until signed, idempotent Twilio capture exists.
      </p>
    </main>
  );
}
