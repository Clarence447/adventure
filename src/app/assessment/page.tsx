import Link from 'next/link';
import { AcquisitionForm } from '@/components/acquisition-form';

export const metadata = { title: 'Business enquiry | Revenue Recovery AI', description: 'Tell us how your business handles missed calls and follow-up. Request a review from Revenue Recovery AI.' };
export default function AssessmentPage() {
  return <main className="min-h-screen bg-slate-950 px-5 py-8 text-white sm:py-14">
    <div className="mx-auto max-w-2xl">
      <Link href="/" className="text-sm font-bold tracking-wide text-emerald-400">REVENUE RECOVERY AI</Link>
      <p className="mt-10 text-sm font-medium text-emerald-400">Two-minute business enquiry</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">Turn missed enquiries into your next opportunity.</h1>
      <p className="mt-5 text-base leading-7 text-slate-300">Tell us about your business and how you follow up with potential customers. We’ll use your answers to review where Revenue Recovery AI could help.</p>
      <AcquisitionForm />
      <p className="mt-7 text-sm leading-6 text-slate-400">Submitting this form requests a conversation. It does not create an account, start a subscription or guarantee revenue.</p>
    </div>
  </main>;
}
