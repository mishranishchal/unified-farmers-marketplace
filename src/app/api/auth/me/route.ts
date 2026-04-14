import { fail, ok } from '@/lib/server/http';
import { getSessionUser } from '@/lib/server/auth';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return fail('Not authenticated', 401);
    return ok(user);
  } catch (error) {
    return fail('Failed to read session', 500, (error as Error).message);
  }
}
