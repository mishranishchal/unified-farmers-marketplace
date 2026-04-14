import AdminDashboardClient from './admin-dashboard-client';
import { platformStore } from '@/lib/server/store';
import { buildAdminSnapshot } from '@/lib/server/platform-data';

export default async function AdminDashboardPage() {
  const [users, buyers, orders, financeTransactions, buyerInteractions, listings, shipments, notifications, agriTrustSubmissions, fieldReports, walletFundingRequests] = await Promise.all([
    platformStore.listUsers(),
    platformStore.listBuyers(),
    platformStore.listOrders(),
    platformStore.listFinanceTransactions(),
    platformStore.listBuyerInteractions(),
    platformStore.listListings(),
    platformStore.listShipments(),
    platformStore.listNotifications(),
    platformStore.listAgriTrustSubmissions(),
    platformStore.listFieldReports(),
    platformStore.listWalletFundingRequests(),
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
    agriTrustSubmissions,
    fieldReports,
    walletFundingRequests,
  });

  return <AdminDashboardClient snapshot={snapshot} />;
}
