import { fail, ok } from '@/lib/server/http';
import { sendOtpEmail } from '@/lib/server/otp-delivery';
import { platformStore } from '@/lib/server/store';
import type { UserRole } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; email?: string; password?: string; role?: UserRole };
    if (!body.name || !body.email || !body.password || !body.role) {
      return fail('Name, email, password, and role are required.', 400);
    }

    const requestOtp = await platformStore.requestOtp({
      purpose: 'signup',
      name: body.name,
      email: body.email,
      password: body.password,
      role: body.role,
    });

    try {
      await sendOtpEmail({
        email: requestOtp.email,
        code: requestOtp.otpCode,
        purpose: 'signup',
        role: body.role,
        name: body.name,
      });
      return ok({ ...requestOtp.challenge, deliveryMode: 'email' });
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        return ok({
          ...requestOtp.challenge,
          deliveryMode: 'preview',
          debugCode: requestOtp.otpCode,
        });
      }
      await platformStore.deleteOtpChallenge(requestOtp.challenge.requestToken);
      throw error;
    }
  } catch (error) {
    const message = (error as Error).message || 'Failed to request signup OTP.';
    const status = message.includes('Please wait') || message.includes('limit reached') ? 429 : 400;
    return fail(message, status);
  }
}
