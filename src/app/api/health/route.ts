import { platformStore } from '@/lib/server/store';
import { fail, ok } from '@/lib/server/http';

export async function GET() {
  try {
    const data = await platformStore.health();
    return ok(data);
  } catch (error) {
    return fail('Health check failed', 500, (error as Error).message);
  }
}
