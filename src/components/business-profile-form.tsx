import { saveBusinessProfile } from '@/app/onboarding/actions';
import { fieldClassName } from '@/components/auth-card';

type Business = {
  name: string | null;
  phone_number: string | null;
  services: string[] | null;
  service_area: string | null;
  calendly_booking_link: string | null;
  google_review_link: string | null;
};

export function BusinessProfileForm({
  business,
  returnPath,
  submitLabel,
}: {
  business?: Business | null;
  returnPath: '/onboarding' | '/settings';
  submitLabel: string;
}) {
  return (
    <form action={saveBusinessProfile} className="mt-8 grid gap-5">
      <input type="hidden" name="return_path" value={returnPath} />
      <label className="block text-sm font-medium">
        Business name
        <input className={fieldClassName} name="name" defaultValue={business?.name ?? ''} required />
      </label>
      <label className="block text-sm font-medium">
        Twilio/business phone number
        <input
          className={fieldClassName}
          name="phone_number"
          type="tel"
          placeholder="+14075551212"
          defaultValue={business?.phone_number ?? ''}
          required
        />
        <span className="mt-1 block text-xs text-slate-500">Use E.164 format so inbound events can resolve the tenant.</span>
      </label>
      <label className="block text-sm font-medium">
        Services
        <textarea
          className={fieldClassName}
          name="services"
          rows={3}
          placeholder="Leak repair, drain cleaning, water heaters"
          defaultValue={business?.services?.join(', ') ?? ''}
          required
        />
      </label>
      <label className="block text-sm font-medium">
        Service area
        <input className={fieldClassName} name="service_area" defaultValue={business?.service_area ?? ''} required />
      </label>
      <label className="block text-sm font-medium">
        Booking link
        <input
          className={fieldClassName}
          name="calendly_booking_link"
          type="url"
          defaultValue={business?.calendly_booking_link ?? ''}
          required
        />
      </label>
      <label className="block text-sm font-medium">
        Review link
        <input
          className={fieldClassName}
          name="google_review_link"
          type="url"
          defaultValue={business?.google_review_link ?? ''}
          required
        />
      </label>
      <button className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950" type="submit">
        {submitLabel}
      </button>
    </form>
  );
}
