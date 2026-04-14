import { fail, ok } from '@/lib/server/http';
import { requireSessionUser } from '@/lib/server/auth';
import { platformStore } from '@/lib/server/store';

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = (await request.json()) as {
      orderId?: string;
      method?: 'cod' | 'upi' | 'card' | 'netbanking';
    };

    if (!body.orderId || !body.method) {
      return fail('orderId and method are required', 400);
    }

    const order = await platformStore.getOrderById(body.orderId);
    if (!order) return fail('Order not found', 404);
    if (user.role !== 'admin' && order.userEmail.toLowerCase() !== user.email.toLowerCase()) {
      return fail('Not allowed to pay for this order', 403);
    }

    const payment = await platformStore.recordPayment({
      orderId: order.id,
      userEmail: user.email,
      amount: order.totalAmount,
      method: body.method,
      success: true,
    });

    return ok(payment);
  } catch (error) {
    const message = (error as Error).message;
    return fail(message, message === 'Authentication required' ? 401 : 500);
  }
}
