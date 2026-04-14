import { platformStore } from '@/lib/server/store';
import { fail, ok } from '@/lib/server/http';
import { requireSessionUser } from '@/lib/server/auth';

export async function GET() {
  try {
    const sessionUser = await requireSessionUser();
    const users = await platformStore.listUsers();
    if (sessionUser.role === 'admin') return ok(users);
    return ok(users.filter((user) => user.email.toLowerCase() === sessionUser.email.toLowerCase()));
  } catch (error) {
    const message = (error as Error).message;
    return fail('Failed to list users', message === 'Authentication required' ? 401 : 500, message);
  }
}

export async function PATCH(request: Request) {
  try {
    const sessionUser = await requireSessionUser();
    const body = (await request.json()) as { email?: string; updates?: Record<string, unknown> };
    if (!body.email || !body.updates) return fail('Email and updates are required', 400);
    if (sessionUser.role !== 'admin' && sessionUser.email.toLowerCase() !== body.email.toLowerCase()) {
      return fail('Forbidden', 403);
    }
    const updated = await platformStore.updateUser(body.email, body.updates as never);
    if (!updated) return fail('User not found', 404);
    return ok(updated);
  } catch (error) {
    const message = (error as Error).message;
    return fail('Failed to update user', message === 'Authentication required' ? 401 : 500, message);
  }
}
