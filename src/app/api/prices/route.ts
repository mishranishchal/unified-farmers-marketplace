import { platformStore } from '@/lib/server/store';
import { fail, ok } from '@/lib/server/http';
import { fetchBackend, hasBackendUpstream, normalizeBackendPrices } from '@/lib/server/upstream';
import { enrichCommodityPrice } from '@/lib/server/pricing';

export async function GET() {
  try {
    if (hasBackendUpstream()) {
      const response = await fetchBackend('/api/prices');
      const payload = (await response.json()) as { data?: { prices?: Array<Record<string, unknown>> }; message?: string };
      if (!response.ok) return fail(payload.message || 'Failed to fetch price feed', response.status);
      const normalized = normalizeBackendPrices(payload.data?.prices ?? []);
      return ok(normalized.map((row) => enrichCommodityPrice(row, normalized)));
    }

    const prices = await platformStore.listPrices();
    return ok(prices);
  } catch (error) {
    return fail('Failed to fetch price feed', 500, (error as Error).message);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      commodity?: string;
      market?: string;
      price?: number;
      unit?: string;
      changePct?: number;
      trend?: 'up' | 'down' | 'stable';
    };
    if (!body.commodity || !body.market || body.price == null || !body.trend) {
      return fail('commodity, market, price, and trend are required', 400);
    }

    const created = await platformStore.addPriceEntry({
      commodity: body.commodity,
      market: body.market,
      price: Number(body.price),
      unit: body.unit ?? 'INR/quintal',
      changePct: body.changePct ?? 0,
      trend: body.trend,
    });
    return ok(created, { status: 201 });
  } catch (error) {
    return fail('Failed to create price entry', 500, (error as Error).message);
  }
}
