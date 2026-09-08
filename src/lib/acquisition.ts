import { z } from 'zod';

export const acquisitionSchema = z.object({
  submission_id: z.string().uuid(),
  business_name: z.string().trim().min(2).max(150),
  business_type: z.enum(['Automotive', 'Home services', 'Professional services', 'Other']),
  inquiries: z.enum(['Under 25', '25–100', 'Over 100', 'Not sure']),
  missed_calls: z.enum(['Rarely', 'A few each week', 'Every day', 'Not sure']),
  response_time: z.enum(['Within 5 minutes', 'Within an hour', 'Later that day', 'Next day or longer']),
  follow_up: z.enum(['Every inquiry', 'Some inquiries', 'No consistent process']),
  goal: z.enum(['Recover missed calls', 'Follow up faster', 'Get more bookings', 'Understand my gaps']),
  contact_name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().trim().max(30).refine(v => !v || ( /^[+\d\s().-]+$/.test(v) && v.replace(/\D/g, '').length >= 10), 'Enter a valid phone number or leave it blank'),
  consent: z.literal(true),
  website: z.string().max(0),
});
export type AcquisitionInput = z.infer<typeof acquisitionSchema>;
