import twilio from 'twilio';

export const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export async function sendSms(to: string, body: string) {
  return twilioClient.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER!,
    to,
    body,
  });
}
