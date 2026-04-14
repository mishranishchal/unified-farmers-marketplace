import { clearBackendAuthCookies } from '@/lib/server/upstream';
import { fail, ok } from '@/lib/server/http';
import { platformStore } from '@/lib/server/store';
import { setLocalSessionCookie } from '@/lib/server/auth';
import type { UserRole } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string; role?: UserRole };
    if (!body.email || !body.password || !body.role) {
      return fail('Email, password, and role are required.', 400);
    }

    const user = await platformStore.login(body.email, body.password, body.role);
    if (!user) {
      return fail('Invalid email, password, or role.', 401);
    }

    clearBackendAuthCookies();
    setLocalSessionCookie(user);
    return ok(user);
  } catch (error) {
    return fail('Login failed', 500, (error as Error).message);
  }
}
