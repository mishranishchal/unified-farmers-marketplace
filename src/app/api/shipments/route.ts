import { fail, ok } from '@/lib/server/http';
import { requireSessionUser } from '@/lib/server/auth';
import { platformStore } from '@/lib/server/store';

export async function GET() {
  try {
    const user = await requireSessionUser();
    const shipments = await platformStore.listShipments(user.role === 'admin' ? undefined : user.email);
    return ok(shipments);
  } catch (error) {
    const message = (error as Error).message;
    return fail(message, message === 'Authentication required' ? 401 : 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireSessionUser();
    if (user.role !== 'admin') return fail('Forbidden', 403);
    const body = (await request.json()) as {
      id?: string;
      status?: 'processing' | 'packed' | 'in_transit' | 'out_for_delivery' | 'delivered';
      lastCheckpoint?: string;
      etaHours?: number;
      courier?: string;
      routeCode?: string;
      vehicleId?: string;
      checkpointLocation?: string;
    };
    if (!body.id) return fail('Shipment id is required', 400);
    const updated = await platformStore.updateShipment(body.id, {
      status: body.status,
      lastCheckpoint: body.lastCheckpoint,
      etaHours: body.etaHours,
      courier: body.courier,
      routeCode: body.routeCode,
      vehicleId: body.vehicleId,
      checkpointLocation: body.checkpointLocation,
      updatedBy: user.email,
    });
    if (!updated) return fail('Shipment not found', 404);
    return ok(updated);
  } catch (error) {
    const message = (error as Error).message;
    return fail(message, message === 'Authentication required' ? 401 : 500);
  }
}
