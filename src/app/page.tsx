import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-6">
      <div className="max-w-4xl text-center">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
          Revenue Recovery AI
        </h1>
        <p className="mt-6 text-lg text-slate-300">
          AI missed-call recovery, instant SMS follow-up, lead qualification,
          and booking automation for local businesses.
        </p>
        <div className="mt-10 flex gap-4 justify-center flex-wrap">
          <Link href="/signup" className="bg-emerald-400 text-slate-950 px-6 py-3 rounded-xl font-semibold">
            Start Free Trial
          </Link>
          <Link href="/dashboard" className="border border-slate-700 px-6 py-3 rounded-xl">
            Dashboard Demo
          </Link>
        </div>
      </div>
    </main>
  );
}
