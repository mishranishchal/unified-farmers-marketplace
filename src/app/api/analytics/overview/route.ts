import { platformStore } from '@/lib/server/store';
import { buildAnalyticsSnapshot } from '@/lib/server/platform-data';
import { generatePlatformInsightDigest } from '@/lib/server/platform-insights';
import { fail, ok } from '@/lib/server/http';
import { requireSessionUser } from '@/lib/server/auth';

export async function GET() {
  try {
    await requireSessionUser();
    const [listings, prices, financeTransactions, orders, payments, predictions, shipments, notifications, users, fieldReports, agriTrustSubmissions] =
      await Promise.all([
        platformStore.listListings(),
        platformStore.listPrices(),
        platformStore.listFinanceTransactions(),
        platformStore.listOrders(),
        platformStore.listPayments(),
        platformStore.listPredictions(),
        platformStore.listShipments(),
        platformStore.listNotifications(),
        platformStore.listUsers(),
        platformStore.listFieldReports(),
        platformStore.listAgriTrustSubmissions(),
      ]);
    const profiles = (await Promise.all(users.map((entry) => platformStore.getUserWorkspace(entry.email)))).filter(
      (profile): profile is NonNullable<typeof profile> => Boolean(profile)
    );
    const snapshot = buildAnalyticsSnapshot({
      listings,
      prices,
      financeTransactions,
      orders,
      payments,
      predictions,
      shipments,
      notifications,
      profiles,
      fieldReports,
      agriTrustSubmissions,
    });
    const insight = await generatePlatformInsightDigest({
      context: 'analytics',
      payload: {
        verifiedProfiles: snapshot.trustMetrics.verifiedProfiles,
        pendingProfiles: snapshot.trustMetrics.pendingProfiles,
        fieldReports: snapshot.fieldSignals.length,
        topPrice: `${snapshot.weather.city} weather synced with trade analytics`,
      },
    });
    return ok({ snapshot, insight });
  } catch (error) {
    const message = (error as Error).message;
    return fail(message, message === 'Authentication required' ? 401 : 500);
  }
}
