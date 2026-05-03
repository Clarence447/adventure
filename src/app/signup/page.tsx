export default function SignupPage() {
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-950">Start Free Trial</h1>
        <p className="mt-2 text-slate-600">
          Create your business account and launch missed-call recovery.
        </p>
        <form className="mt-6 space-y-4">
          <input placeholder="Business Name" className="w-full border rounded-xl px-4 py-3" />
          <input placeholder="Business Phone Number" className="w-full border rounded-xl px-4 py-3" />
          <input placeholder="Services Offered" className="w-full border rounded-xl px-4 py-3" />
          <input placeholder="Service Area" className="w-full border rounded-xl px-4 py-3" />
          <input placeholder="Calendly Booking Link" className="w-full border rounded-xl px-4 py-3" />
          <input placeholder="Google Review Link" className="w-full border rounded-xl px-4 py-3" />
          <button type="submit" className="w-full rounded-xl bg-slate-950 text-white py-3 font-semibold">
            Continue to Billing
          </button>
        </form>
      </div>
    </main>
  );
}
