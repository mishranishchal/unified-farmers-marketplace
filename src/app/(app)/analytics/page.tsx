import AnalyticsClient from './analytics-client';
import { platformStore } from '@/lib/server/store';
import { buildAnalyticsSnapshot } from '@/lib/server/platform-data';

export default async function AnalyticsPage() {
  const [listings, prices, financeTransactions, orders, payments, predictions, shipments, notifications, users, fieldReports, agriTrustSubmissions] = await Promise.all([
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

  return <AnalyticsClient snapshot={snapshot} />;
}
