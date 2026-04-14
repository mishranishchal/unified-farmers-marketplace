import { fail, ok } from '@/lib/server/http';
import { requireSessionUser } from '@/lib/server/auth';
import { platformStore } from '@/lib/server/store';

export async function GET() {
  try {
    const user = await requireSessionUser();
    const notifications = await platformStore.listNotifications(user.role === 'admin' ? undefined : user.email);
    return ok(notifications);
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
      title?: string;
      body?: string;
      audience?: 'all' | 'farmers' | 'buyers' | 'admins';
      category?: 'system' | 'trade' | 'community' | 'finance' | 'ops';
      actionHref?: string;
    };

    if (!body.title?.trim() || !body.body?.trim()) {
      return fail('Title and body are required', 400);
    }

    const users = await platformStore.listUsers();
    const targets = users.filter((target) => {
      if (body.audience === 'buyers') return target.role === 'buyer';
      if (body.audience === 'admins') return target.role === 'admin';
      if (body.audience === 'farmers') return target.role === 'user';
      return true;
    });

    const created = await Promise.all(
      targets.map((target) =>
        platformStore.createNotificationForUser({
          userEmail: target.email,
          title: body.title!.trim(),
          body: body.body!.trim(),
          category: body.category ?? 'system',
          actionHref: body.actionHref || '/',
        })
      )
    );

    return ok({ count: created.length, notifications: created }, { status: 201 });
  } catch (error) {
    const message = (error as Error).message;
    return fail(message, message === 'Authentication required' ? 401 : 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = (await request.json()) as { id?: string };
    if (!body.id) return fail('Notification id is required', 400);
    if (user.role !== 'admin') {
      const allowed = await platformStore.listNotifications(user.email);
      if (!allowed.some((notification) => notification.id === body.id)) {
        return fail('Forbidden', 403);
      }
    }
    const updated = await platformStore.markNotificationRead(body.id);
    if (!updated) return fail('Notification not found', 404);
    return ok(updated);
  } catch (error) {
    const message = (error as Error).message;
    return fail(message, message === 'Authentication required' ? 401 : 500);
  }
}
