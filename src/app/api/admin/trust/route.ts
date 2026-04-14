import { requireSessionUser } from '@/lib/server/auth';
import { fail, ok } from '@/lib/server/http';
import { generatePlatformInsightDigest } from '@/lib/server/platform-insights';
import { buildAdminSnapshot } from '@/lib/server/platform-data';
import { platformStore } from '@/lib/server/store';

export async function GET() {
  try {
    const user = await requireSessionUser();
    if (user.role !== 'admin') return fail('Forbidden', 403);
    const [users, forms, submissions, fieldReports, walletFundingRequests, financeTransactions, buyers, orders, buyerInteractions, listings, shipments, notifications] =
      await Promise.all([
        platformStore.listUsers(),
        platformStore.listAgriTrustForms(),
        platformStore.listAgriTrustSubmissions(),
        platformStore.listFieldReports(),
        platformStore.listWalletFundingRequests(),
        platformStore.listFinanceTransactions(),
        platformStore.listBuyers(),
        platformStore.listOrders(),
        platformStore.listBuyerInteractions(),
        platformStore.listListings(),
        platformStore.listShipments(),
        platformStore.listNotifications(),
      ]);
    const profiles = (await Promise.all(users.map((entry) => platformStore.getUserWorkspace(entry.email)))).filter(
      (profile): profile is NonNullable<typeof profile> => Boolean(profile)
    );
    const snapshot = buildAdminSnapshot({
      users,
      buyers,
      orders,
      financeTransactions,
      buyerInteractions,
      listings,
      shipments,
      notifications,
      profiles,
      agriTrustSubmissions: submissions,
      fieldReports,
      walletFundingRequests,
    });
    const insight = await generatePlatformInsightDigest({
      context: 'admin',
      payload: {
        trustReady: snapshot.liveOps.trustVerified,
        shipmentsOpen: snapshot.liveOps.shipmentsOpen,
        fieldReports: fieldReports.filter((item) => item.status === 'submitted').length,
        topPrice: snapshot.kpis[1]?.change ?? 'Trade data available',
      },
    });
    return ok({ profiles, forms, submissions, fieldReports, walletFundingRequests, snapshot, insight });
  } catch (error) {
    const message = (error as Error).message;
    return fail(message, message === 'Authentication required' ? 401 : 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireSessionUser();
    if (user.role !== 'admin') return fail('Forbidden', 403);
    const body = (await request.json()) as
      | {
          action: 'verify-profile';
          userEmail: string;
          role: 'user' | 'buyer';
          label?: string;
        }
      | {
          action: 'review-submission';
          submissionId: string;
          status: 'reviewed' | 'verified' | 'rejected';
        }
      | {
          action: 'review-field-report';
          reportId: string;
          status: 'verified' | 'rejected';
        }
      | {
          action: 'grant-wallet';
          userEmail: string;
          amount: number;
          reason?: string;
        };

    if (body.action === 'verify-profile') {
      const updated = await platformStore.verifyAgriTrustProfile({
        userEmail: body.userEmail,
        role: body.role,
        label: body.label?.trim() || 'AgriTrust verified by admin control desk',
        verifiedByEmail: user.email,
        verifiedByRole: 'admin',
      });
      if (!updated) return fail('Profile not found', 404);
      return ok(updated);
    }

    if (body.action === 'review-submission') {
      const updated = await platformStore.reviewAgriTrustSubmission(body.submissionId, {
        status: body.status,
        reviewedBy: user.email,
      });
      if (!updated) return fail('Submission not found', 404);
      if (body.status === 'verified') {
        await platformStore.verifyAgriTrustProfile({
          userEmail: updated.userEmail,
          role: updated.role === 'user' ? 'user' : 'buyer',
          label: 'AgriTrust form reviewed and approved by admin',
          verifiedByEmail: user.email,
          verifiedByRole: 'admin',
        });
      }
      return ok(updated);
    }

    if (body.action === 'review-field-report') {
      const updated = await platformStore.reviewFieldReport(body.reportId, {
        status: body.status,
        verifiedBy: user.email,
      });
      if (!updated) return fail('Field report not found', 404);
      return ok(updated);
    }

    if (body.action === 'grant-wallet') {
      if (!body.userEmail || !body.amount || body.amount <= 0) {
        return fail('Valid user email and amount are required.', 400);
      }
      const transaction = await platformStore.grantWalletCredit({
        userEmail: body.userEmail,
        amount: body.amount,
        reason: body.reason?.trim() || 'Admin-approved AgriTrust proof grant',
        approvedBy: user.email,
      });
      return ok(transaction);
    }

    return fail('Unsupported trust action', 400);
  } catch (error) {
    const message = (error as Error).message;
    return fail(message, message === 'Authentication required' ? 401 : 500);
  }
}
