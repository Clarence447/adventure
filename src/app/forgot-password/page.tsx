import { requestPasswordReset } from '@/app/auth/actions';
import { AuthCard, fieldClassName } from '@/components/auth-card';

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthCard title="Reset password" description="We will send a secure reset link to your account email." error={error}>
      <form action={requestPasswordReset} className="mt-6 space-y-4">
        <label className="block text-sm font-medium">
          Email
          <input className={fieldClassName} name="email" type="email" autoComplete="email" required />
        </label>
        <button className="w-full rounded-xl bg-slate-950 py-3 font-semibold text-white" type="submit">
          Send reset link
        </button>
      </form>
    </AuthCard>
  );
}
