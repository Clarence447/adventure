'use client';

import { useRef, useState, type FormEvent } from 'react';

const questions = [
  { key: 'business_type', title: 'What kind of business do you run?', choices: ['Automotive', 'Home services', 'Professional services', 'Other'] },
  { key: 'inquiries', title: 'How many enquiries do you receive each month?', choices: ['Under 25', '25–100', 'Over 100', 'Not sure'] },
  { key: 'missed_calls', title: 'How often do calls go unanswered?', choices: ['Rarely', 'A few each week', 'Every day', 'Not sure'] },
  { key: 'response_time', title: 'How quickly do you usually respond?', choices: ['Within 5 minutes', 'Within an hour', 'Later that day', 'Next day or longer'] },
  { key: 'follow_up', title: 'Do you follow up when someone hasn’t booked?', choices: ['Every inquiry', 'Some inquiries', 'No consistent process'] },
  { key: 'goal', title: 'What would you most like to improve?', choices: ['Recover missed calls', 'Follow up faster', 'Get more bookings', 'Understand my gaps'] },
];
const field = 'mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-base text-slate-950 focus:outline-emerald-600';

export function AcquisitionForm() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [received, setReceived] = useState(false);
  const [error, setError] = useState('');
  const id = useRef<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const question = questions[step];
  function move(next: number) {
    setError(''); setStep(next);
    requestAnimationFrame(() => heading.current?.focus());
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (step < 7) { move(step + 1); return; }
    setBusy(true); setError('');
    id.current ??= crypto.randomUUID();
    try {
      const response = await fetch('/api/acquisition', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...answers, submission_id: id.current, consent, phone: answers.phone ?? '', website: answers.website ?? '' }),
      });
      const result = await response.json();
      if (!response.ok || result.received !== true) { setError(result.error ?? 'Could not save your request. Please try again.'); return; }
      setReceived(true);
    } catch { setError('Connection interrupted. Your answers are still here. Please try again.'); }
    finally { setBusy(false); }
  }
  function input(name: string, label: string, type = 'text', required = true, maxLength = 150) {
    return <label className="block text-base font-medium">{label}<input className={field} name={name} type={type} required={required} maxLength={maxLength} minLength={required && type === 'text' ? 2 : undefined} value={answers[name] ?? ''} onChange={e => setAnswers({ ...answers, [name]: e.target.value })} /></label>;
  }
  if (received) return <section role="status" className="mt-9 rounded-2xl bg-white p-7 text-slate-950 sm:p-9">
    <p className="text-sm font-bold text-emerald-700">REQUEST RECEIVED</p><h2 className="mt-3 text-2xl font-bold">Thank you, {answers.contact_name}.</h2>
    <p className="mt-4 leading-7">Your business details and answers have been saved for review. We can contact you at {answers.email} about your enquiry.</p>
  </section>;
  return <section className="mt-9 rounded-2xl bg-white p-6 text-slate-950 sm:p-9">
    <p className="text-sm font-semibold text-emerald-700">Step {step + 1} of 8</p>
    <progress className="mt-3 h-2 w-full accent-emerald-600" max={8} value={step + 1} aria-label="Form progress" />
    <h2 ref={heading} tabIndex={-1} className="mt-7 text-2xl font-bold outline-none">{question?.title ?? (step === 6 ? 'What’s your business called?' : 'Where can we reach you?')}</h2>
    <form onSubmit={submit} className="mt-6 space-y-5">
      {question ? <fieldset className="space-y-3"><legend className="sr-only">{question.title}</legend>{question.choices.map(choice => <label key={choice} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-base ${answers[question.key] === choice ? 'border-emerald-600 bg-emerald-50' : 'border-slate-300'}`}><input type="radio" name={question.key} value={choice} required checked={answers[question.key] === choice} onChange={() => setAnswers({ ...answers, [question.key]: choice })} className="h-4 w-4 accent-emerald-600" />{choice}</label>)}</fieldset> : step === 6 ? input('business_name', 'Business name') : <>
        {input('contact_name', 'Your name', 'text', true, 100)}
        {input('email', 'Email address', 'email', true, 254)}
        {input('phone', 'Phone number (optional)', 'tel', false, 30)}
        <div className="hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" value={answers.website ?? ''} onChange={e => setAnswers({ ...answers, website: e.target.value })} /></label></div>
        <p className="text-sm leading-6 text-slate-600">Revenue Recovery AI will store these details and your answers to review and respond to this enquiry.</p>
        <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-emerald-600" />I agree to be contacted about this enquiry by email or, if supplied, by phone. This is not consent to automated marketing texts.</label>
      </>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="flex items-center justify-between gap-3 pt-3">
        {step > 0 ? <button type="button" disabled={busy} onClick={() => move(step - 1)} className="rounded-xl border border-slate-300 px-5 py-3 font-semibold disabled:opacity-50">Back</button> : <span />}
        <button type="submit" disabled={busy} className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : step === 7 ? 'Send my enquiry' : 'Next question'}</button>
      </div>
    </form>
  </section>;
}
