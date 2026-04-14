import { requireSessionUser } from '@/lib/server/auth';
import { fail, ok } from '@/lib/server/http';
import { platformStore } from '@/lib/server/store';

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = (await request.json()) as { id?: string };
    if (!body.id) return fail('Shipment id is required', 400);
    const updated = await platformStore.acknowledgeShipment(body.id, user.email);
    if (!updated) return fail('Shipment not found', 404);
    return ok(updated);
  } catch (error) {
    const message = (error as Error).message;
    return fail(message, message === 'Authentication required' ? 401 : 500);
  }
}
