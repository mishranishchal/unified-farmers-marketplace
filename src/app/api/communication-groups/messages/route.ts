import { requireSessionUser } from '@/lib/server/auth';
import { fail, ok } from '@/lib/server/http';
import { platformStore } from '@/lib/server/store';

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser();
    const url = new URL(request.url);
    const groupId = url.searchParams.get('groupId') || undefined;
    if (!groupId) return fail('groupId is required', 400);
    const groups = await platformStore.listCommunicationGroups(user.role === 'admin' ? undefined : user.email);
    if (user.role !== 'admin' && !groups.some((group) => group.id === groupId)) return fail('Forbidden', 403);
    const messages = await platformStore.listCommunicationMessages(groupId);
    return ok(messages);
  } catch (error) {
    const message = (error as Error).message;
    return fail(message, message === 'Authentication required' ? 401 : 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = (await request.json()) as { groupId?: string; body?: string };
    if (!body.groupId || !body.body?.trim()) return fail('groupId and body are required', 400);
    const groups = await platformStore.listCommunicationGroups(user.role === 'admin' ? undefined : user.email);
    if (user.role !== 'admin' && !groups.some((group) => group.id === body.groupId)) return fail('Forbidden', 403);
    const created = await platformStore.createCommunicationMessage({
      groupId: body.groupId,
      senderEmail: user.email,
      senderName: user.name,
      body: body.body.trim(),
    });
    return ok(created, { status: 201 });
  } catch (error) {
    const message = (error as Error).message;
    return fail(message, message === 'Authentication required' ? 401 : 500);
  }
}
