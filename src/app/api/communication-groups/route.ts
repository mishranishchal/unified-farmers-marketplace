import { requireSessionUser } from '@/lib/server/auth';
import { fail, ok } from '@/lib/server/http';
import { platformStore } from '@/lib/server/store';
import type { UserRole } from '@/lib/types';

export async function GET() {
  try {
    const user = await requireSessionUser();
    const groups = await platformStore.listCommunicationGroups(user.role === 'admin' ? undefined : user.email);
    return ok(groups);
  } catch (error) {
    const message = (error as Error).message;
    return fail(message, message === 'Authentication required' ? 401 : 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    if (user.role !== 'admin') return fail('Forbidden', 403);
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      memberEmails?: string[];
      memberRoles?: UserRole[];
    };
    if (!body.name?.trim() || !body.memberEmails?.length) {
      return fail('Group name and at least one member are required.', 400);
    }
    const created = await platformStore.createCommunicationGroup({
      name: body.name.trim(),
      description: body.description?.trim() || 'Admin-managed communication channel',
      memberEmails: Array.from(new Set(body.memberEmails.map((item) => item.trim().toLowerCase()).filter(Boolean))),
      memberRoles: body.memberRoles?.length ? body.memberRoles : ['user', 'buyer'],
      createdBy: user.email,
    });
    return ok(created, { status: 201 });
  } catch (error) {
    const message = (error as Error).message;
    return fail(message, message === 'Authentication required' ? 401 : 500);
  }
}
