import { platformStore } from '@/lib/server/store';
import { fail, ok } from '@/lib/server/http';
import { requireSessionUser } from '@/lib/server/auth';

export async function GET() {
  try {
    const items = await platformStore.listListings();
    return ok(items);
  } catch (error) {
    return fail('Failed to fetch listings', 500, (error as Error).message);
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await requireSessionUser();
    const body = (await request.json()) as {
      name?: string;
      commodity?: string;
      farmerName?: string;
      description?: string;
      price?: number;
      unit?: string;
      location?: string;
      quantity?: number;
      grade?: string;
      pricingMode?: 'fixed' | 'negotiable' | 'market-linked';
      priceFloor?: number;
      priceCeiling?: number;
      moisture?: number;
      imageHint?: string;
    };
    if (!body.name || !body.farmerName || body.price == null || !body.location) {
      return fail('name, farmerName, price, and location are required', 400);
    }

    const created = await platformStore.createListing({
      name: body.name,
      commodity: body.commodity,
      farmerName: body.farmerName || sessionUser.name,
      description: body.description,
      imageHint: body.imageHint,
      price: Number(body.price),
      unit: body.unit ?? 'quintal',
      location: body.location,
      quantity: Number(body.quantity ?? 0) || undefined,
      grade: body.grade,
      pricingMode: body.pricingMode,
      priceFloor: body.priceFloor == null ? undefined : Number(body.priceFloor),
      priceCeiling: body.priceCeiling == null ? undefined : Number(body.priceCeiling),
      moisture: body.moisture == null ? undefined : Number(body.moisture),
    });
    return ok(created, { status: 201 });
  } catch (error) {
    const message = (error as Error).message;
    return fail('Failed to create listing', message === 'Authentication required' ? 401 : 500, message);
  }
}
