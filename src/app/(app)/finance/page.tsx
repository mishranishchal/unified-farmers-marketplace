import FinanceClient from './finance-client';
import { requireSessionUser } from '@/lib/server/auth';
import { platformStore } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

export default async function FinancePage() {
  const user = await requireSessionUser();
  const [transactions, loans, walletRequests, config] = await Promise.all([
    platformStore.listFinanceTransactions(user.role === 'admin' ? undefined : user.email),
    platformStore.listLoanApplications(user.role === 'admin' ? undefined : user.email),
    platformStore.listWalletFundingRequests(user.role === 'admin' ? undefined : user.email),
    platformStore.getConfig(),
  ]);

  return <FinanceClient initialTransactions={transactions} initialLoans={loans} initialWalletRequests={walletRequests} financeConfig={config.finance} />;
}
