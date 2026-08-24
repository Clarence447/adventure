import { redirect } from 'next/navigation';
import { BusinessProfileForm } from '@/components/business-profile-form';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: message } = await searchParams;
  const { supabase, userId } = await requireUser();
  const { data: business } = await supabase
    .from('businesses')
    .select('name, phone_number, services, service_area, calendly_booking_link, google_review_link')
    .eq('owner_user_id', userId)
    .maybeSingle();

  if (!business) {
    redirect('/onboarding');
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-12">
      <section className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-emerald-700">Customer settings</p>
        <h1 className="mt-3 text-3xl font-bold">Business profile</h1>
        {message ? <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800">{message}</p> : null}
        <BusinessProfileForm business={business} returnPath="/settings" submitLabel="Save settings" />
      </section>
    </main>
  );
}
