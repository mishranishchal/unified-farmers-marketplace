import { requireSessionUser } from '@/lib/server/auth';
import { fail, ok } from '@/lib/server/http';
import { platformStore } from '@/lib/server/store';

export async function GET() {
  try {
    const user = await requireSessionUser();
    const items = await platformStore.listNegotiations(user.role === 'admin' ? undefined : user.email);
    return ok(items);
  } catch (error) {
    const message = (error as Error).message;
    return fail(message, message === 'Authentication required' ? 401 : 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = (await request.json()) as {
      targetName?: string;
      targetEmail?: string;
      targetRole?: 'user' | 'buyer' | 'admin' | 'audience';
      commodity?: string;
      quantity?: number;
      proposedPrice?: number;
      terms?: string;
      mode?: 'offer' | 'counter' | 'form' | 'notice';
    };
    if (!body.targetName || !body.commodity || body.quantity == null || body.proposedPrice == null || !body.terms || !body.mode || !body.targetRole) {
      return fail('Incomplete negotiation payload', 400);
    }
    const created = await platformStore.createNegotiation({
      creatorEmail: user.email,
      creatorName: user.name,
      creatorRole: user.role,
      targetName: body.targetName,
      targetEmail: body.targetEmail,
      targetRole: body.targetRole,
      commodity: body.commodity,
      quantity: Number(body.quantity),
      proposedPrice: Number(body.proposedPrice),
      terms: body.terms,
      mode: body.mode,
    });
    return ok(created, { status: 201 });
  } catch (error) {
    const message = (error as Error).message;
    return fail(message, message === 'Authentication required' ? 401 : 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = (await request.json()) as {
      id?: string;
      status?: 'open' | 'awaiting-response' | 'accepted' | 'rejected' | 'closed';
      terms?: string;
      proposedPrice?: number;
    };
    if (!body.id) return fail('Negotiation id is required', 400);
    const items = await platformStore.listNegotiations(user.role === 'admin' ? undefined : user.email);
    if (!items.some((item) => item.id === body.id)) return fail('Forbidden', 403);
    const updated = await platformStore.updateNegotiation(body.id, {
      status: body.status,
      terms: body.terms,
      proposedPrice: body.proposedPrice,
    });
    if (!updated) return fail('Negotiation not found', 404);
    return ok(updated);
  } catch (error) {
    const message = (error as Error).message;
    return fail(message, message === 'Authentication required' ? 401 : 500);
  }
}
