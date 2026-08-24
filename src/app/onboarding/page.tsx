import { redirect } from 'next/navigation';
import { BusinessProfileForm } from '@/components/business-profile-form';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: message } = await searchParams;
  const { supabase, userId } = await requireUser();
  const { data: existing } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_user_id', userId)
    .maybeSingle();

  if (existing) {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-12">
      <section className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-emerald-700">Revenue Recovery AI</p>
        <h1 className="mt-3 text-3xl font-bold">Configure your business</h1>
        <p className="mt-2 text-slate-600">These settings route leads to the correct tenant and control booking and review links.</p>
        {message ? <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800">{message}</p> : null}
        <BusinessProfileForm returnPath="/onboarding" submitLabel="Complete onboarding" />
      </section>
    </main>
  );
}
