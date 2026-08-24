import { describe, expect, it } from 'vitest';
import { businessProfileSchema } from './onboarding';

const validProfile = {
  name: 'Orange County Plumbing',
  phone_number: '+14075551212',
  services: ['Leak repair', 'Drain cleaning'],
  service_area: 'Orlando, Florida',
  calendly_booking_link: 'https://calendly.com/orange-county-plumbing/service',
  google_review_link: 'https://example.com/reviews/orange-county-plumbing',
};

describe('businessProfileSchema', () => {
  it('accepts a complete tenant profile', () => {
    expect(businessProfileSchema.safeParse(validProfile).success).toBe(true);
  });

  it('rejects incomplete onboarding data', () => {
    expect(businessProfileSchema.safeParse({ ...validProfile, services: [] }).success).toBe(false);
  });

  it('rejects a phone number that cannot route a Twilio tenant', () => {
    expect(
      businessProfileSchema.safeParse({ ...validProfile, phone_number: '(407) 555-1212' }).success,
    ).toBe(false);
  });
});
