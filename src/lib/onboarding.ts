import { z } from 'zod';

const webUrl = z.string().trim().url('Enter a valid web URL').refine(
  (value) => ['https:', 'http:'].includes(new URL(value).protocol),
  'Use an HTTP or HTTPS URL',
);

const requiredText = z.string().trim().min(1, 'This field is required').max(200);

export const businessProfileSchema = z.object({
  name: requiredText,
  phone_number: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, 'Use E.164 format, for example +14075551212'),
  services: z
    .array(z.string().trim().min(1).max(100))
    .min(1, 'Enter at least one service')
    .max(50),
  service_area: requiredText,
  calendly_booking_link: webUrl,
  google_review_link: webUrl,
});

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;

export function parseBusinessProfile(formData: FormData) {
  const services = String(formData.get('services') ?? '')
    .split(',')
    .map((service) => service.trim())
    .filter(Boolean);

  return businessProfileSchema.safeParse({
    name: formData.get('name'),
    phone_number: formData.get('phone_number'),
    services,
    service_area: formData.get('service_area'),
    calendly_booking_link: formData.get('calendly_booking_link'),
    google_review_link: formData.get('google_review_link'),
  });
}
