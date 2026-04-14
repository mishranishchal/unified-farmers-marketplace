import { fail, ok } from '@/lib/server/http';
import { requireSessionUser } from '@/lib/server/auth';
import { platformStore } from '@/lib/server/store';

export async function GET() {
  try {
    const user = await requireSessionUser();
    const orders = await platformStore.listOrders(user.role === 'admin' ? undefined : user.email);
    return ok(orders);
  } catch (error) {
    return fail((error as Error).message, 401);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = (await request.json()) as {
      items?: Array<{ name?: string; price?: number; quantity?: number }>;
      shippingAddress?: string;
    };

    if (!body.items?.length || !body.shippingAddress?.trim()) {
      return fail('Items and shippingAddress are required', 400);
    }

    const items = body.items
      .filter((item) => item.name && item.price != null)
      .map((item) => ({
        name: item.name as string,
        price: Number(item.price),
        quantity: Math.max(1, Number(item.quantity ?? 1)),
      }));

    if (!items.length) {
      return fail('At least one valid item is required', 400);
    }

    const order = await platformStore.createOrder({
      userEmail: user.email,
      userName: user.name,
      items,
      shippingAddress: body.shippingAddress.trim(),
    });

    return ok(order, { status: 201 });
  } catch (error) {
    const message = (error as Error).message;
    return fail(message, message === 'Authentication required' ? 401 : 500);
  }
}
