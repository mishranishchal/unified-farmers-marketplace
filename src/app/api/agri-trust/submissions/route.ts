import { requireSessionUser } from '@/lib/server/auth';
import { fail, ok } from '@/lib/server/http';
import { platformStore } from '@/lib/server/store';

export async function GET() {
  try {
    const user = await requireSessionUser();
    const submissions = await platformStore.listAgriTrustSubmissions(user.role === 'admin' ? undefined : user.email);
    return ok(submissions);
  } catch (error) {
    const message = (error as Error).message;
    return fail(message, message === 'Authentication required' ? 401 : 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    if (user.role === 'admin') return fail('Admin accounts cannot submit AgriTrust customer forms.', 403);
    const body = (await request.json()) as {
      formId?: string;
      responses?: Array<{ fieldId: string; label: string; value: string }>;
      proofNote?: string;
    };
    if (!body.formId || !body.responses?.length) {
      return fail('Form id and at least one response are required.', 400);
    }
    const created = await platformStore.submitAgriTrustForm({
      formId: body.formId,
      userEmail: user.email,
      userName: user.name,
      role: user.role,
      responses: body.responses,
      proofNote: body.proofNote?.trim() || undefined,
    });
    return ok(created, { status: 201 });
  } catch (error) {
    const message = (error as Error).message;
    return fail(message, message === 'Authentication required' ? 401 : 500);
  }
}
