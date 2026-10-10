import Link from 'next/link';
import { signUp } from '@/app/auth/actions';
import { AuthCard, fieldClassName } from '@/components/auth-card';

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthCard
      title="Start recovering missed calls"
      description="Create the owner account for your local service business."
      error={error}
    >
      <form action={signUp} className="mt-6 space-y-4">
        <label className="block text-sm font-medium">
          Email
          <input className={fieldClassName} name="email" type="email" autoComplete="email" required />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input
            className={fieldClassName}
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        <button className="w-full rounded-xl bg-slate-950 py-3 font-semibold text-white" type="submit">
          Create account
        </button>
      </form>
      <p className="mt-5 text-sm text-slate-600">
        Already registered? <Link className="font-semibold text-emerald-700" href="/login">Sign in</Link>
      </p>
    </AuthCard>
  );
}
