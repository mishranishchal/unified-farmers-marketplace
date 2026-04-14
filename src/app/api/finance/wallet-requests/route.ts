import { requireSessionUser } from '@/lib/server/auth';
import { fail, ok } from '@/lib/server/http';
import { platformStore } from '@/lib/server/store';

export async function GET() {
  try {
    const user = await requireSessionUser();
    const items = await platformStore.listWalletFundingRequests(user.role === 'admin' ? undefined : user.email);
    const config = user.role === 'admin' ? await platformStore.getConfig() : null;
    return ok({ requests: items, financeConfig: config?.finance ?? null });
  } catch (error) {
    const message = (error as Error).message;
    return fail(message, message === 'Authentication required' ? 401 : 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = (await request.json()) as { amount?: number };
    if (body.amount == null || Number(body.amount) <= 0) return fail('Valid amount is required', 400);
    const created = await platformStore.createWalletFundingRequest({
      userEmail: user.email,
      userName: user.name,
      role: user.role,
      amount: Number(body.amount),
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
      status?: 'requested' | 'account_shared' | 'payment_submitted' | 'verified' | 'rejected';
      adminInstructions?: string;
      paymentReference?: string;
    };
    if (!body.id) return fail('Request id is required', 400);

    if (user.role === 'admin') {
      const updated = await platformStore.updateWalletFundingRequest(body.id, {
        status: body.status,
        adminInstructions: body.adminInstructions,
        verifiedBy: user.email,
      });
      if (!updated) return fail('Request not found', 404);
      return ok(updated);
    }

    const mine = await platformStore.listWalletFundingRequests(user.email);
    if (!mine.some((item) => item.id === body.id)) return fail('Forbidden', 403);
    const updated = await platformStore.updateWalletFundingRequest(body.id, {
      paymentReference: body.paymentReference,
      status: body.paymentReference ? 'payment_submitted' : body.status,
    });
    if (!updated) return fail('Request not found', 404);
    return ok(updated);
  } catch (error) {
    const message = (error as Error).message;
    return fail(message, message === 'Authentication required' ? 401 : 500);
  }
}
