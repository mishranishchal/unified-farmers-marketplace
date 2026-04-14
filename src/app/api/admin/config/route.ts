import { requireSessionUser } from '@/lib/server/auth';
import { fail, ok } from '@/lib/server/http';
import { platformStore } from '@/lib/server/store';
import type { PlatformConfig } from '@/lib/types';

export async function GET() {
  try {
    const user = await requireSessionUser();
    if (user.role !== 'admin') return fail('Forbidden', 403);
    return ok(await platformStore.getConfig());
  } catch (error) {
    const message = (error as Error).message;
    return fail('Failed to load config', message === 'Authentication required' ? 401 : 500, message);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireSessionUser();
    if (user.role !== 'admin') return fail('Forbidden', 403);
    const body = (await request.json()) as {
      accessPolicy?: { farmerPlan?: string; buyerPlan?: string };
      categories?: { crops?: string[]; inputs?: string[] };
      ui?: { supportedLanguages?: ('en' | 'hi')[]; defaultLanguage?: 'en' | 'hi' };
      finance?: {
        settlementAccountName?: string;
        settlementAccountNumber?: string;
        settlementIfsc?: string;
        settlementUpi?: string;
      };
      developer?: {
        name?: string;
        photoUrl?: string;
        college?: string;
        rollNo?: string;
        address?: string;
        contact?: string;
        bio?: string;
      };
    };
    const config = await platformStore.updateConfig(body as Partial<PlatformConfig>);
    return ok(config);
  } catch (error) {
    const message = (error as Error).message;
    return fail('Failed to save config', message === 'Authentication required' ? 401 : 500, message);
  }
}
