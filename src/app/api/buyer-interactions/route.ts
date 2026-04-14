import { requireSessionUser } from '@/lib/server/auth';
import { fail, ok } from '@/lib/server/http';
import { platformStore } from '@/lib/server/store';

export async function GET() {
  try {
    const user = await requireSessionUser();
    const items = await platformStore.listBuyerInteractions(user.role === 'admin' ? undefined : user.email);
    return ok(items);
  } catch (error) {
    const message = (error as Error).message;
    return fail('Failed to fetch interactions', message === 'Authentication required' ? 401 : 500, message);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = (await request.json()) as {
      buyerId?: string;
      buyerName?: string;
      mode?: 'message' | 'call';
      lotDetails?: string;
      message?: string;
    };
    if (!body.buyerId || !body.buyerName || !body.mode) return fail('buyerId, buyerName, and mode are required', 400);
    const created = await platformStore.createBuyerInteraction({
      buyerId: body.buyerId,
      buyerName: body.buyerName,
      senderEmail: user.email,
      senderName: user.name,
      mode: body.mode,
      lotDetails: body.lotDetails ?? '',
      message: body.message ?? '',
    });
    return ok(created, { status: 201 });
  } catch (error) {
    const message = (error as Error).message;
    return fail('Failed to create interaction', message === 'Authentication required' ? 401 : 500, message);
  }
}

