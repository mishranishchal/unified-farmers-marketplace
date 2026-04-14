import { requireSessionUser } from '@/lib/server/auth';
import { fail, ok } from '@/lib/server/http';
import { platformStore } from '@/lib/server/store';
import type { AgriTrustFormField } from '@/lib/types';

export async function GET() {
  try {
    const user = await requireSessionUser();
    const forms = await platformStore.listAgriTrustForms(user.role === 'admin' ? undefined : user.email, user.role);
    return ok(forms);
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
      description?: string;
      audienceRole?: 'user' | 'buyer' | 'all';
      targetEmail?: string;
      fields?: AgriTrustFormField[];
    };
    if (!body.title?.trim() || !body.description?.trim() || !body.fields?.length) {
      return fail('Title, description, and at least one field are required.', 400);
    }
    const created = await platformStore.createAgriTrustForm({
      title: body.title.trim(),
      description: body.description.trim(),
      audienceRole: body.audienceRole ?? 'all',
      targetEmail: body.targetEmail?.trim() || undefined,
      fields: body.fields,
      createdBy: user.email,
    });
    return ok(created, { status: 201 });
  } catch (error) {
    const message = (error as Error).message;
    return fail(message, message === 'Authentication required' ? 401 : 500);
  }
}
