'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { parseBusinessProfile } from '@/lib/onboarding';

const allowedReturnPaths = new Set(['/onboarding', '/settings']);

export async function saveBusinessProfile(formData: FormData) {
  const returnPathCandidate = String(formData.get('return_path') ?? '/onboarding');
  const returnPath = allowedReturnPaths.has(returnPathCandidate) ? returnPathCandidate : '/onboarding';
  const parsed = parseBusinessProfile(formData);

  if (!parsed.success) {
    const params = new URLSearchParams({
      error: parsed.error.issues[0]?.message ?? 'Complete every required field.',
    });
    redirect(`${returnPath}?${params.toString()}`);
  }

  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from('businesses').upsert(
    {
      owner_user_id: userId,
      ...parsed.data,
    },
    { onConflict: 'owner_user_id' },
  );

  if (error) {
    const message = error.code === '23505'
      ? 'That business phone number is already assigned.'
      : 'Business settings could not be saved. Try again.';
    redirect(`${returnPath}?${new URLSearchParams({ error: message }).toString()}`);
  }

  redirect('/dashboard');
}
