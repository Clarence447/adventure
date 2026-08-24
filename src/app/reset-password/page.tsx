import { updatePassword } from '@/app/auth/actions';
import { AuthCard, fieldClassName } from '@/components/auth-card';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthCard title="Choose a new password" description="Use at least eight characters." error={error}>
      <form action={updatePassword} className="mt-6 space-y-4">
        <label className="block text-sm font-medium">
          New password
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
          Update password
        </button>
      </form>
    </AuthCard>
  );
}
