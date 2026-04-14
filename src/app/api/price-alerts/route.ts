import { requireSessionUser } from '@/lib/server/auth';
import { fail, ok } from '@/lib/server/http';
import { platformStore } from '@/lib/server/store';

export async function GET() {
  try {
    const user = await requireSessionUser();
    const alerts = await platformStore.listPriceAlerts(user.role === 'admin' ? undefined : user.email);
    return ok(alerts);
  } catch (error) {
    const message = (error as Error).message;
    return fail('Failed to fetch alerts', message === 'Authentication required' ? 401 : 500, message);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = (await request.json()) as {
      commodity?: string;
      market?: string;
      currentPrice?: number;
      targetPrice?: number;
    };
    if (!body.commodity || !body.market || body.currentPrice == null || body.targetPrice == null) {
      return fail('commodity, market, currentPrice, and targetPrice are required', 400);
    }
    const created = await platformStore.createPriceAlert({
      userEmail: user.email,
      commodity: body.commodity,
      market: body.market,
      currentPrice: Number(body.currentPrice),
      targetPrice: Number(body.targetPrice),
    });
    return ok(created, { status: 201 });
  } catch (error) {
    const message = (error as Error).message;
    return fail('Failed to create alert', message === 'Authentication required' ? 401 : 500, message);
  }
}

