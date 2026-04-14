'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, ArrowDownLeft, Landmark, Plus, Receipt, Wallet, CheckCircle, Download, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { FinanceTransaction, LoanApplication, WalletFundingRequest } from '@/lib/types';

type FinanceClientProps = {
  initialTransactions: FinanceTransaction[];
  initialLoans: LoanApplication[];
  initialWalletRequests: WalletFundingRequest[];
  financeConfig: {
    settlementAccountName: string;
    settlementAccountNumber: string;
    settlementIfsc: string;
    settlementUpi: string;
  };
};

export default function FinanceClient({ initialTransactions, initialLoans, initialWalletRequests, financeConfig }: FinanceClientProps) {
  const [isAddMoneyModalOpen, setIsAddMoneyModalOpen] = useState(false);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>(initialTransactions);
  const [loans, setLoans] = useState<LoanApplication[]>(initialLoans);
  const [walletRequests, setWalletRequests] = useState<WalletFundingRequest[]>(initialWalletRequests);
  const [amount, setAmount] = useState('50000');
  const [loanAmount, setLoanAmount] = useState('500000');
  const [loanPurpose, setLoanPurpose] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const { toast } = useToast();

  const walletBalance = useMemo(
    () => transactions.reduce((sum, transaction) => sum + (transaction.direction === 'in' ? transaction.amount : -transaction.amount), 0),
    [transactions]
  );

  const downloadLedger = () => {
    const content = transactions
      .map((transaction) => `${transaction.createdAt},${transaction.type},${transaction.direction},${transaction.amount},${transaction.status}`)
      .join('\n');
    const blob = new Blob([`date,type,direction,amount,status\n${content}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'finance-ledger.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleAddMoney = async () => {
    const response = await fetch('/api/finance/wallet-requests', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(amount) }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast({ variant: 'destructive', title: 'Failed', description: payload.error || 'Top-up failed.' });
      return;
    }
    setWalletRequests((prev) => [payload.data as WalletFundingRequest, ...prev]);
    setIsAddMoneyModalOpen(false);
    toast({ title: 'Request sent', description: 'Admin can now share settlement details for this wallet request.' });
  };

  const handleApplyLoan = async () => {
    const response = await fetch('/api/finance/loans', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Number(loanAmount),
        purpose: loanPurpose,
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast({ variant: 'destructive', title: 'Failed', description: payload.error || 'Unable to apply for loan.' });
      return;
    }
    setLoans((prev) => [payload.data as LoanApplication, ...prev]);
    setIsLoanModalOpen(false);
    toast({ title: 'Application submitted', description: 'Your loan request is now in review.' });
  };

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-headline text-3xl font-bold">Finance Hub</h1>
        <p className="text-muted-foreground">Manage your wallet, request admin-approved funding, and access trust-based credit.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 font-headline">
                <Wallet /> My Wallet
              </CardTitle>
              <CardDescription>Credits are added only after admin verification.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsAddMoneyModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Money
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-4xl font-bold">INR {walletBalance.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="relative flex flex-col items-center justify-center overflow-hidden bg-gray-900 p-6 text-center text-white">
          <CardHeader>
            <CardTitle className="font-headline text-primary">Agri-Credit</CardTitle>
            <CardDescription className="text-white/80">Only AgriTrust verified customers can request credit.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-grow flex-col items-center justify-center">
            <p className="text-sm text-white/60">Open Applications</p>
            <p className="text-4xl font-bold text-white">{loans.filter((loan) => loan.status === 'Pending').length}</p>
          </CardContent>
          <CardFooter className="w-full">
            <Button variant="secondary" className="w-full" onClick={() => setIsLoanModalOpen(true)}>
              <Landmark className="mr-2 h-4 w-4" />
              Apply for Loan
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Wallet Funding Requests</CardTitle>
          <CardDescription>Ask admin for settlement details, submit payment reference, then wait for verification.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {walletRequests.map((request) => (
            <div key={request.id} className="rounded-xl border p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold">{request.id}</p>
                  <p className="text-sm text-muted-foreground">INR {request.amount.toLocaleString()} · {request.status}</p>
                  {request.adminInstructions && <p className="mt-2 text-sm">{request.adminInstructions}</p>}
                </div>
                <div className="flex flex-col gap-2 md:items-end">
                  {request.status === 'account_shared' && (
                    <>
                      <div className="rounded-lg bg-secondary p-3 text-xs">
                        <p>{financeConfig.settlementAccountName}</p>
                        <p>{financeConfig.settlementAccountNumber} · {financeConfig.settlementIfsc}</p>
                        <p>UPI: {financeConfig.settlementUpi}</p>
                      </div>
                      <div className="flex gap-2">
                        <Input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="Payment reference" />
                        <Button
                          onClick={async () => {
                            const response = await fetch('/api/finance/wallet-requests', {
                              method: 'PATCH',
                              credentials: 'include',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ id: request.id, paymentReference }),
                            });
                            const payload = await response.json();
                            if (!response.ok || !payload.success) {
                              toast({ variant: 'destructive', title: 'Failed', description: payload.error || 'Unable to submit reference.' });
                              return;
                            }
                            setWalletRequests((current) => current.map((item) => (item.id === request.id ? (payload.data as WalletFundingRequest) : item)));
                            setPaymentReference('');
                          }}
                        >
                          Submit Ref
                        </Button>
                      </div>
                    </>
                  )}
                  {request.status === 'verified' && (
                    <div className="flex items-center gap-2 text-emerald-700">
                      <ShieldCheck className="h-4 w-4" />
                      Admin verified
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your latest financial activities.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={`rounded-full p-1.5 ${transaction.direction === 'in' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        {transaction.direction === 'in' ? (
                          <ArrowDownLeft className="h-4 w-4 text-green-500" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <span className="font-medium">{transaction.type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{new Date(transaction.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className={`text-right font-semibold ${transaction.direction === 'in' ? 'text-green-600' : 'text-destructive'}`}>
                    {transaction.direction === 'out' ? '-' : '+'}INR {Math.abs(transaction.amount).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button
            variant="outline"
            onClick={() =>
              downloadLedger()
            }
          >
            <Receipt className="mr-2" />
            View Statement
          </Button>
          <Button onClick={downloadLedger}>
            <Download className="mr-2" />
            Download Ledger
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Loan Applications</CardTitle>
          <CardDescription>Track the current backend review state of your applications.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell>{loan.id}</TableCell>
                  <TableCell>{loan.purpose}</TableCell>
                  <TableCell>{loan.risk}</TableCell>
                  <TableCell>{loan.status}</TableCell>
                  <TableCell className="text-right">INR {loan.amount.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isAddMoneyModalOpen} onOpenChange={setIsAddMoneyModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Money to Wallet</DialogTitle>
            <DialogDescription>This sends a funding request to admin. Admin shares account details, then verifies your payment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (INR)</Label>
              <Input id="amount" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMoneyModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMoney}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirm Top-up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isLoanModalOpen} onOpenChange={setIsLoanModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply for Agri-Credit</DialogTitle>
            <DialogDescription>Submit a loan application to the platform review queue.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="loan-amount">Loan Amount (INR)</Label>
              <Input id="loan-amount" type="number" value={loanAmount} onChange={(event) => setLoanAmount(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loan-purpose">Loan Purpose</Label>
              <Input id="loan-purpose" value={loanPurpose} onChange={(event) => setLoanPurpose(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLoanModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyLoan}>
              <Landmark className="mr-2 h-4 w-4" />
              Submit Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
