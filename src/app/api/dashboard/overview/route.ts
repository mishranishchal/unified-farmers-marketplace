import { requireSessionUser } from '@/lib/server/auth';
import { fail, ok } from '@/lib/server/http';
import { buildDashboardSnapshot } from '@/lib/server/platform-data';
import { generatePlatformInsightDigest } from '@/lib/server/platform-insights';
import { platformStore } from '@/lib/server/store';

export async function GET() {
  try {
    const user = await requireSessionUser();
    const [listings, buyers, prices, predictions, buyerInteractions, financeTransactions, users, notifications, shipments, fieldReports, agriTrustSubmissions] =
      await Promise.all([
        platformStore.listListings(),
        platformStore.listBuyers(),
        platformStore.listPrices(),
        platformStore.listPredictions(),
        platformStore.listBuyerInteractions(),
        platformStore.listFinanceTransactions(),
        platformStore.listUsers(),
        platformStore.listNotifications(user.role === 'admin' ? undefined : user.email),
        platformStore.listShipments(user.role === 'admin' ? undefined : user.email),
        platformStore.listFieldReports(user.role === 'admin' ? undefined : user.email),
        platformStore.listAgriTrustSubmissions(user.role === 'admin' ? undefined : user.email),
      ]);
    const profiles = (await Promise.all(users.map((entry) => platformStore.getUserWorkspace(entry.email)))).filter(
      (profile): profile is NonNullable<typeof profile> => Boolean(profile)
    );

    const snapshot = buildDashboardSnapshot({
      listings,
      buyers,
      prices,
      predictions,
      buyerInteractions,
      financeTransactions,
      profiles,
      notifications,
      shipments,
      fieldReports,
      agriTrustSubmissions,
    });

    const insight = await generatePlatformInsightDigest({
      context: 'dashboard',
      payload: {
        trustReady: snapshot.rolePulse.trustReady,
        shipmentBacklog: snapshot.rolePulse.shipmentBacklog,
        fieldReports: snapshot.trustQueue.newFieldReports,
        topPrice: snapshot.aiUpdates[0],
      },
    });

    return ok({ snapshot, insight });
  } catch (error) {
    const message = (error as Error).message;
    return fail(message, message === 'Authentication required' ? 401 : 500);
  }
}
