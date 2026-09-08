import { expect, it } from 'vitest';
import { acquisitionSchema } from './acquisition';
const valid = { submission_id: '11111111-1111-4111-8111-111111111111', business_name: 'Test Shop', business_type: 'Automotive', inquiries: 'Under 25', missed_calls: 'Rarely', response_time: 'Within an hour', follow_up: 'Every inquiry', goal: 'Recover missed calls', contact_name: 'Test Owner', email: 'OWNER@example.com', phone: '', consent: true, website: '' };
it('accepts complete enquiries without an optional phone and normalizes email', () => {
  expect(acquisitionSchema.parse(valid).email).toBe('owner@example.com');
});
it.each([{ consent: false }, { website: 'spam' }, { email: 'invalid' }, { phone: 'abc1234567890' }, { goal: 'unknown' }, { business_name: '' }])('rejects invalid or unsolicited enquiries %j', change => {
  expect(acquisitionSchema.safeParse({ ...valid, ...change }).success).toBe(false);
});
