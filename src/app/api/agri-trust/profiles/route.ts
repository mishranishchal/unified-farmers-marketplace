import { requireSessionUser } from '@/lib/server/auth';
import { fail, ok } from '@/lib/server/http';
import { platformStore } from '@/lib/server/store';

export async function GET() {
  try {
    const user = await requireSessionUser();
    if (user.role !== 'admin' && user.role !== 'buyer') return fail('Forbidden', 403);
    const profiles = await platformStore.listAgriTrustProfiles(user.role);
    return ok(profiles);
  } catch (error) {
    const message = (error as Error).message;
    return fail(message, message === 'Authentication required' ? 401 : 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireSessionUser();
    if (user.role !== 'admin' && user.role !== 'buyer') return fail('Forbidden', 403);
    const body = (await request.json()) as { userEmail?: string; role?: 'user' | 'buyer'; label?: string };
    if (!body.userEmail || !body.role) return fail('userEmail and role are required', 400);
    if (user.role === 'buyer' && body.role !== 'user') return fail('Buyers can validate farmers only.', 403);
    const updated = await platformStore.verifyAgriTrustProfile({
      userEmail: body.userEmail,
      role: body.role,
      label: body.label?.trim() || (user.role === 'buyer' ? 'Validated by verified buyer' : 'Validated by platform admin'),
      verifiedByEmail: user.email,
      verifiedByRole: user.role,
    });
    if (!updated) return fail('Profile not found', 404);
    return ok(updated);
  } catch (error) {
    const message = (error as Error).message;
    return fail(message, message === 'Authentication required' ? 401 : 500);
  }
}
