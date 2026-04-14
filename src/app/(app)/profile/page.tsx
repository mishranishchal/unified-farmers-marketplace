import { requireSessionUser } from '@/lib/server/auth';
import { platformStore } from '@/lib/server/store';
import ProfileClient from './profile-client';

export default async function ProfilePage() {
  const user = await requireSessionUser();
  const [profile, orders, invoices, shipments, notifications, interactions, transactions, loans, locationOptions] = await Promise.all([
    platformStore.getUserWorkspace(user.email),
    platformStore.listOrders(user.email),
    platformStore.listInvoices(user.email),
    platformStore.listShipments(user.email),
    platformStore.listNotifications(user.email),
    platformStore.listBuyerInteractions(user.email),
    platformStore.listFinanceTransactions(user.email),
    platformStore.listLoanApplications(user.email),
    platformStore.listLocations(),
  ]);

  return (
    <ProfileClient
      user={user}
      initialProfile={profile}
      orders={orders}
      invoices={invoices}
      shipments={shipments}
      notifications={notifications}
      interactions={interactions}
      transactions={transactions}
      loans={loans}
      locationOptions={locationOptions}
    />
  );
}
