import DashboardClientContent from '@/components/dashboard-client-content';
import { requireSessionUser } from '@/lib/server/auth';
import { platformStore } from '@/lib/server/store';
import { buildDashboardSnapshot } from '@/lib/server/platform-data';

export default async function DashboardPage() {
  const user = await requireSessionUser();
  const [listings, buyers, prices, predictions, buyerInteractions, financeTransactions, users, notifications, shipments, fieldReports, agriTrustSubmissions] = await Promise.all([
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

  return <DashboardClientContent user={{ name: user.name, role: user.role }} snapshot={snapshot} />;
}
