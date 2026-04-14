import { requireSessionUser } from '@/lib/server/auth';
import { fail, ok } from '@/lib/server/http';
import { platformStore } from '@/lib/server/store';

export async function GET() {
  try {
    const user = await requireSessionUser();
    const loans = await platformStore.listLoanApplications(user.role === 'admin' ? undefined : user.email);
    return ok(loans);
  } catch (error) {
    const message = (error as Error).message;
    return fail('Failed to fetch loans', message === 'Authentication required' ? 401 : 500, message);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = (await request.json()) as { amount?: number; purpose?: string };
    if (body.amount == null || !body.purpose) return fail('amount and purpose are required', 400);
    const loan = await platformStore.createLoanApplication({
      userEmail: user.email,
      userName: user.name,
      amount: Number(body.amount),
      purpose: body.purpose,
    });
    return ok(loan, { status: 201 });
  } catch (error) {
    const message = (error as Error).message;
    return fail('Failed to submit loan', message === 'Authentication required' ? 401 : 500, message);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireSessionUser();
    if (user.role !== 'admin') return fail('Forbidden', 403);
    const body = (await request.json()) as { id?: string; status?: 'Pending' | 'Approved' | 'Rejected' };
    if (!body.id || !body.status) return fail('id and status are required', 400);
    const loan = await platformStore.updateLoanApplication(body.id, { status: body.status });
    if (!loan) return fail('Loan not found', 404);
    return ok(loan);
  } catch (error) {
    const message = (error as Error).message;
    return fail('Failed to update loan', message === 'Authentication required' ? 401 : 500, message);
  }
}
