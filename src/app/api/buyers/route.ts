import { platformStore } from '@/lib/server/store';
import { fail, ok } from '@/lib/server/http';
import { requireSessionUser } from '@/lib/server/auth';

export async function GET() {
  try {
    const buyers = await platformStore.listBuyers();
    return ok(buyers);
  } catch (error) {
    return fail('Failed to fetch buyers', 500, (error as Error).message);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    if (user.role !== 'admin') return fail('Forbidden', 403);
    const body = (await request.json()) as {
      name?: string;
      location?: string;
      demand?: string[];
      capacity?: string;
      type?: string;
      contact?: string;
      verified?: boolean;
      trades?: number;
      status?: 'Verified' | 'Pending' | 'Suspended';
    };
    if (!body.name || !body.location || !body.capacity || !body.type) return fail('Missing required buyer fields', 400);
    const buyer = await platformStore.createBuyer({
      name: body.name,
      location: body.location,
      demand: body.demand ?? [],
      capacity: body.capacity,
      type: body.type,
      verified: body.verified ?? false,
      contact: body.contact,
      trades: body.trades ?? 0,
      status: body.status ?? 'Pending',
    });
    return ok(buyer, { status: 201 });
  } catch (error) {
    const message = (error as Error).message;
    return fail('Failed to create buyer', message === 'Authentication required' ? 401 : 500, message);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireSessionUser();
    if (user.role !== 'admin') return fail('Forbidden', 403);
    const body = (await request.json()) as { id?: string; updates?: Record<string, unknown> };
    if (!body.id || !body.updates) return fail('id and updates are required', 400);
    const updated = await platformStore.updateBuyer(body.id, body.updates as never);
    if (!updated) return fail('Buyer not found', 404);
    return ok(updated);
  } catch (error) {
    const message = (error as Error).message;
    return fail('Failed to update buyer', message === 'Authentication required' ? 401 : 500, message);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireSessionUser();
    if (user.role !== 'admin') return fail('Forbidden', 403);
    const body = (await request.json()) as { id?: string };
    if (!body.id) return fail('id is required', 400);
    const deleted = await platformStore.deleteBuyer(body.id);
    return ok({ deleted });
  } catch (error) {
    const message = (error as Error).message;
    return fail('Failed to delete buyer', message === 'Authentication required' ? 401 : 500, message);
  }
}
