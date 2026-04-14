import { setLocalSessionCookie } from '@/lib/server/auth';
import { fail, ok } from '@/lib/server/http';
import { platformStore } from '@/lib/server/store';
import { clearBackendAuthCookies } from '@/lib/server/upstream';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { requestToken?: string; otp?: string };
    if (!body.requestToken || !body.otp) {
      return fail('Request token and OTP are required.', 400);
    }

    const user = await platformStore.verifySignupOtp(body.requestToken, body.otp);
    clearBackendAuthCookies();
    setLocalSessionCookie(user);
    return ok(user, { status: 201 });
  } catch (error) {
    return fail((error as Error).message || 'Failed to verify signup OTP.', 400);
  }
}
