'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const credentialsSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

function destination(path: string, kind: 'error' | 'message', message: string): never {
  const params = new URLSearchParams({ [kind]: message });
  redirect(`${path}?${params.toString()}`);
}

export async function signUp(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    destination('/signup', 'error', parsed.error.issues[0]?.message ?? 'Invalid signup data');
  }

  const supabase = await createClient();
  const origin = (await headers()).get('origin') ?? process.env.NEXT_PUBLIC_APP_URL;
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: origin ? { emailRedirectTo: `${origin}/auth/confirm?next=/onboarding` } : undefined,
  });

  if (error) {
    destination('/signup', 'error', 'Account creation failed. Check the form and try again.');
  }

  if (data.session) {
    redirect('/onboarding');
  }

  destination('/login', 'message', 'Check your email to confirm your account, then sign in.');
}

export async function signIn(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    destination('/login', 'error', parsed.error.issues[0]?.message ?? 'Invalid login data');
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    destination('/login', 'error', 'Email or password is incorrect.');
  }

  const requested = String(formData.get('next') ?? '/dashboard');
  redirect(['/dashboard', '/onboarding', '/settings'].includes(requested) ? requested : '/dashboard');
}

export async function requestPasswordReset(formData: FormData) {
  const email = z.string().trim().email().safeParse(formData.get('email'));

  if (!email.success) {
    destination('/forgot-password', 'error', 'Enter a valid email address.');
  }

  const supabase = await createClient();
  const origin = (await headers()).get('origin') ?? process.env.NEXT_PUBLIC_APP_URL;
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.data,
    origin ? { redirectTo: `${origin}/auth/confirm?next=/reset-password` } : undefined,
  );

  if (error) {
    destination('/forgot-password', 'error', 'Password reset could not be started. Try again.');
  }

  destination('/login', 'message', 'If that account exists, a password-reset email is on its way.');
}

export async function updatePassword(formData: FormData) {
  const password = z.string().min(8).safeParse(formData.get('password'));

  if (!password.success) {
    destination('/reset-password', 'error', 'Password must be at least 8 characters.');
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: password.data });

  if (error) {
    destination('/reset-password', 'error', 'Password could not be updated. Request a new link.');
  }

  destination('/login', 'message', 'Password updated. Sign in with your new password.');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
