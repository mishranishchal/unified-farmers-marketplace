'use client';

import { useEffect, useMemo, useState } from 'react';
import { Coins, Download, ShoppingCart, TrendingUp, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import type { FinanceTransaction, LoanApplication, WalletFundingRequest } from '@/lib/types';

export default function FinancialsPage() {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loans, setLoans] = useState<LoanApplication[]>([]);
  const [walletRequests, setWalletRequests] = useState<WalletFundingRequest[]>([]);
  const [accountNote, setAccountNote] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      const [txRes, loanRes, walletRes] = await Promise.all([
        fetch('/api/finance/transactions', { credentials: 'include' }),
        fetch('/api/finance/loans', { credentials: 'include' }),
        fetch('/api/finance/wallet-requests', { credentials: 'include' }),
      ]);
      const [txPayload, loanPayload, walletPayload] = await Promise.all([txRes.json(), loanRes.json(), walletRes.json()]);
      if (txPayload.success) setTransactions(txPayload.data as FinanceTransaction[]);
      if (loanPayload.success) setLoans(loanPayload.data as LoanApplication[]);
      if (walletPayload.success) setWalletRequests(walletPayload.data.requests as WalletFundingRequest[]);
    };
    void load();
  }, []);

  const revenueData = useMemo(
    () =>
      ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'].map((name, index) => ({
        name,
        revenue: transactions
          .filter((item) => item.direction === 'in')
          .slice(0, index + 1)
          .reduce((sum, item) => sum + item.amount, 0),
      })),
    [transactions]
  );

  const grossRevenue = transactions.filter((item) => item.direction === 'in').reduce((sum, item) => sum + item.amount, 0);

  const patchWallet = async (id: string, payload: Record<string, unknown>) => {
    const response = await fetch('/api/finance/wallet-requests', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...payload }),
    });
    const data = await response.json();
    if (data.success) {
      setWalletRequests((current) => current.map((item) => (item.id === id ? (data.data as WalletFundingRequest) : item)));
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold font-headline">Financial & Subscription Control</h1>
        <p className="text-muted-foreground">Verify wallet funding, approve credit, and audit platform finance activity.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Verified Revenue</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">INR {grossRevenue.toLocaleString()}</div><p className="text-xs text-muted-foreground">{transactions.length} ledger rows</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Active Wallet Requests</CardTitle><Users className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{walletRequests.filter((item) => item.status !== 'verified' && item.status !== 'rejected').length}</div><p className="text-xs text-muted-foreground">Pending admin action</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Loan Queue</CardTitle><ShoppingCart className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{loans.filter((loan) => loan.status === 'Pending').length}</div><p className="text-xs text-muted-foreground">Trust-gated loan reviews</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">AI Usage Credits</CardTitle><Coins className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{transactions.filter((item) => item.type.toLowerCase().includes('wallet')).length}</div><p className="text-xs text-muted-foreground">Wallet-related finance events</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Revenue Growth</CardTitle>
            <CardDescription>Monthly inflow curve derived from verified platform ledger entries.</CardDescription>
          </div>
          <Button variant="outline"><Download className="mr-2"/> Export CSV</Button>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }}/>
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `₹${Math.round(Number(value)/1000)}k`}/>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Wallet Funding Approval Desk</CardTitle>
          <CardDescription>Share payment instructions, receive proof, and verify customer wallet requests.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {walletRequests.map((request) => (
            <div key={request.id} className="rounded-2xl border p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-semibold">{request.userName} · {request.role}</p>
                  <p className="text-sm text-muted-foreground">{request.id} · INR {request.amount.toLocaleString()} · {request.status}</p>
                  {request.paymentReference && <p className="mt-1 text-sm">Payment Ref: {request.paymentReference}</p>}
                </div>
                <div className="flex flex-col gap-2 md:min-w-[360px]">
                  <Input
                    value={accountNote[request.id] ?? request.adminInstructions ?? ''}
                    onChange={(event) => setAccountNote((current) => ({ ...current, [request.id]: event.target.value }))}
                    placeholder="Share bank / UPI instruction"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => patchWallet(request.id, { status: 'account_shared', adminInstructions: accountNote[request.id] ?? request.adminInstructions ?? '' })}>Share Account</Button>
                    <Button size="sm" onClick={() => patchWallet(request.id, { status: 'verified', adminInstructions: accountNote[request.id] ?? request.adminInstructions ?? '' })}>Verify Payment</Button>
                    <Button variant="destructive" size="sm" onClick={() => patchWallet(request.id, { status: 'rejected', adminInstructions: accountNote[request.id] ?? request.adminInstructions ?? '' })}>Reject</Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
