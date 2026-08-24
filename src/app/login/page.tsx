import Link from 'next/link';
import { signIn } from '@/app/auth/actions';
import { AuthCard, fieldClassName } from '@/components/auth-card';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const { error, message, next } = await searchParams;

  return (
    <AuthCard title="Sign in" description="Open your Revenue Recovery customer account." error={error} message={message}>
      <form action={signIn} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next ?? '/dashboard'} />
        <label className="block text-sm font-medium">
          Email
          <input className={fieldClassName} name="email" type="email" autoComplete="email" required />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input className={fieldClassName} name="password" type="password" autoComplete="current-password" required />
        </label>
        <button className="w-full rounded-xl bg-slate-950 py-3 font-semibold text-white" type="submit">
          Sign in
        </button>
      </form>
      <div className="mt-5 flex justify-between text-sm">
        <Link className="font-semibold text-emerald-700" href="/signup">Create account</Link>
        <Link className="text-slate-600" href="/forgot-password">Forgot password?</Link>
      </div>
    </AuthCard>
  );
}
