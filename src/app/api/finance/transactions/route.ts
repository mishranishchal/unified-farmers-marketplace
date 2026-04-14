import { requireSessionUser } from '@/lib/server/auth';
import { fail, ok } from '@/lib/server/http';
import { platformStore } from '@/lib/server/store';

export async function GET() {
  try {
    const user = await requireSessionUser();
    const transactions = await platformStore.listFinanceTransactions(user.role === 'admin' ? undefined : user.email);
    return ok(transactions);
  } catch (error) {
    const message = (error as Error).message;
    return fail('Failed to fetch transactions', message === 'Authentication required' ? 401 : 500, message);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = (await request.json()) as { type?: string; amount?: number; direction?: 'in' | 'out'; method?: string };
    if (!body.type || body.amount == null || !body.direction || !body.method) {
      return fail('type, amount, direction, and method are required', 400);
    }
    const transaction = await platformStore.createFinanceTransaction({
      userEmail: user.email,
      type: body.type,
      amount: Number(body.amount),
      direction: body.direction,
      method: body.method,
    });
    return ok(transaction, { status: 201 });
  } catch (error) {
    const message = (error as Error).message;
    return fail('Failed to create transaction', message === 'Authentication required' ? 401 : 500, message);
  }
}

