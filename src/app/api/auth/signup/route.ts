import { fail, ok } from '@/lib/server/http';

export async function POST(request: Request) {
  try {
    await request.json().catch(() => ({}));
    return fail('Direct signup is disabled. Request and verify an OTP instead.', 403);
  } catch (error) {
    return fail((error as Error).message || 'Signup failed', 400);
  }
}
