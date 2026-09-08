import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-6">
      <div className="max-w-4xl text-center">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
          Revenue Recovery AI
        </h1>
        <p className="mt-6 text-lg text-slate-300">
          Tell us how your business handles missed calls and follow-up. Request a conversation about improving your process.
        </p>
        <div className="mt-10 flex gap-4 justify-center flex-wrap">
          <Link href="/assessment" className="bg-emerald-400 text-slate-950 px-6 py-3 rounded-xl font-semibold">
            Tell us about your business
          </Link>
          {process.env.RR_STORAGE !== 'sqlite' && <Link href="/bellpro" className="border border-slate-700 px-6 py-3 rounded-xl">
            BellPro v2.1
          </Link>}
        </div>
        <Link href="/login" className="mt-10 inline-block text-sm text-slate-300 underline underline-offset-4">Owner sign in</Link>
      </div>
    </main>
  );
}
