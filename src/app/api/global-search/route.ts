import { fail, ok } from '@/lib/server/http';
import { getSessionUser } from '@/lib/server/auth';
import { platformStore } from '@/lib/server/store';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') ?? '';
    const user = await getSessionUser();
    const results = await platformStore.searchGlobal(q, user?.role === 'admin' ? undefined : user?.email);
    return ok(results);
  } catch (error) {
    return fail('Search failed', 500, (error as Error).message);
  }
}
