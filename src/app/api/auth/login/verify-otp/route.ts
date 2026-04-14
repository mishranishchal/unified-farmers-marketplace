import { fail } from '@/lib/server/http';

export async function POST(request: Request) {
  try {
    await request.json().catch(() => ({}));
    return fail('Login OTP verification has been retired. Use direct password login instead.', 410);
  } catch (error) {
    return fail((error as Error).message || 'Login OTP verification is no longer available.', 410);
  }
}
