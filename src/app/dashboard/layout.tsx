import Link from 'next/link';
import { signOut } from '@/app/auth/actions';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b bg-white px-6 py-4">
        <nav className="mx-auto flex max-w-5xl items-center justify-between">
          <Link className="font-bold" href="/dashboard">Revenue Recovery AI</Link>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/settings">Settings</Link>
            <form action={signOut}>
              <button className="font-semibold text-slate-700" type="submit">Sign out</button>
            </form>
          </div>
        </nav>
      </header>
      {children}
    </div>
  );
}
