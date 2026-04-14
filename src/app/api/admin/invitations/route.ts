import { requireSessionUser } from '@/lib/server/auth';
import { fail, ok } from '@/lib/server/http';
import { platformStore } from '@/lib/server/store';

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    if (user.role !== 'admin') return fail('Forbidden', 403);
    const body = (await request.json()) as { email?: string; role?: string; name?: string };
    if (!body.email) return fail('email is required', 400);
    const existing = await platformStore.findUserByEmail(body.email);
    if (existing) {
      const promoted = await platformStore.updateUser(body.email, { role: 'admin' });
      return ok({
        user: promoted,
        promotedExistingUser: true,
        role: body.role || 'Admin',
      }, { status: 200 });
    }

    const created = await platformStore.createAdminUser(body.name || body.email.split('@')[0], body.email);
    return ok({ ...created, promotedExistingUser: false, role: body.role || 'Admin' }, { status: 201 });
  } catch (error) {
    return fail((error as Error).message || 'Failed to invite admin', 400);
  }
}
