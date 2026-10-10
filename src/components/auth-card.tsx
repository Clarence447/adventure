import Link from 'next/link';

export function AuthCard({
  title,
  description,
  error,
  message,
  children,
}: {
  title: string;
  description: string;
  error?: string;
  message?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-16">
      <section className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <Link href="/" className="text-sm font-semibold text-emerald-700">
          Revenue Recovery AI
        </Link>
        <h1 className="mt-5 text-3xl font-bold text-slate-950">{title}</h1>
        <p className="mt-2 text-slate-600">{description}</p>
        {error ? <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
        {message ? (
          <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>
        ) : null}
        {children}
      </section>
    </main>
  );
}

export const fieldClassName =
  'mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600';
