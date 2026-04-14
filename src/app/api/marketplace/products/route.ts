import { platformStore } from '@/lib/server/store';
import { fail, ok } from '@/lib/server/http';

export async function GET() {
  try {
    const items = await platformStore.listProducts();
    return ok(items);
  } catch (error) {
    return fail('Failed to fetch products', 500, (error as Error).message);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      category?: string;
      price?: number;
      currency?: string;
      unit?: string;
      rating?: number;
      inStock?: boolean;
    };

    if (!body.name || !body.category || body.price == null) {
      return fail('name, category, and price are required', 400);
    }

    const created = await platformStore.createProduct({
      name: body.name,
      category: body.category,
      price: Number(body.price),
      currency: body.currency ?? 'INR',
      unit: body.unit ?? 'unit',
      rating: body.rating ?? 4.5,
      inStock: body.inStock ?? true,
    });
    return ok(created, { status: 201 });
  } catch (error) {
    return fail('Failed to create product', 500, (error as Error).message);
  }
}
