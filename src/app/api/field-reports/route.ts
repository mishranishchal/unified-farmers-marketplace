import { requireSessionUser } from '@/lib/server/auth';
import { fail, ok } from '@/lib/server/http';
import { platformStore } from '@/lib/server/store';

export async function GET() {
  try {
    const user = await requireSessionUser();
    const reports = await platformStore.listFieldReports(user.role === 'admin' ? undefined : user.email);
    return ok(reports);
  } catch (error) {
    const message = (error as Error).message;
    return fail(message, message === 'Authentication required' ? 401 : 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    if (user.role !== 'user') return fail('Only farmers can submit field reports.', 403);
    const profile = await platformStore.getUserWorkspace(user.email);
    if (!profile) return fail('Profile unavailable', 404);
    const body = (await request.json()) as {
      reportType?: 'mandi-price' | 'weather' | 'crop-status';
      commodity?: string;
      mandi?: string;
      reportedPrice?: number;
      weatherCondition?: string;
      rainfallMm?: number;
      summary?: string;
      proofNote?: string;
    };
    if (!body.reportType || !body.summary?.trim()) {
      return fail('Report type and summary are required.', 400);
    }
    const created = await platformStore.createFieldReport({
      userEmail: user.email,
      userName: user.name,
      city: profile.city,
      state: profile.state,
      reportType: body.reportType,
      commodity: body.commodity?.trim() || undefined,
      mandi: body.mandi?.trim() || undefined,
      reportedPrice: body.reportedPrice,
      weatherCondition: body.weatherCondition?.trim() || undefined,
      rainfallMm: body.rainfallMm,
      summary: body.summary.trim(),
      proofNote: body.proofNote?.trim() || undefined,
    });
    return ok(created, { status: 201 });
  } catch (error) {
    const message = (error as Error).message;
    return fail(message, message === 'Authentication required' ? 401 : 500);
  }
}
