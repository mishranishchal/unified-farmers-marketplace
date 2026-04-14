'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, CheckCircle, XCircle, MoreHorizontal } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

type LoanApplication = {
  id: string;
  userName: string;
  amount: number;
  purpose: string;
  risk: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
};

export default function LoanManagementPage() {
  const { toast } = useToast();
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<LoanApplication | null>(null);
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/finance/loans', { credentials: 'include' });
      const payload = await res.json();
      if (payload.success) setApplications(payload.data as LoanApplication[]);
    };
    void load();
  }, []);

  const openModal = (app: LoanApplication, action: 'approve' | 'reject' | 'view') => {
    setSelectedApplication(app);
    setDecision(action === 'view' ? null : action);
    setIsModalOpen(true);
  };

  const updateDecision = async (status: 'Approved' | 'Rejected') => {
    if (!selectedApplication) return;
    const res = await fetch('/api/finance/loans', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedApplication.id, status }),
    });
    const payload = await res.json();
    if (payload.success) {
      setApplications((prev) => prev.map((app) => (app.id === selectedApplication.id ? (payload.data as LoanApplication) : app)));
      toast({ title: 'Updated', description: `Loan ${selectedApplication.id} marked ${status}.` });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold font-headline">Loan & Credit Management</h1>
        <p className="text-muted-foreground">Review credit applications coming from the live finance module.</p>
      </header>

      <Tabs defaultValue="applications">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="applications">Applications</TabsTrigger>
          </TabsList>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Search by Farmer or ID..." className="pl-10" />
          </div>
        </div>

        <TabsContent value="applications" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Loan Applications</CardTitle>
              <CardDescription>Review pending loan applications and make approval decisions.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loan ID</TableHead>
                    <TableHead>Farmer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>AI Risk</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-mono">{app.id}</TableCell>
                      <TableCell className="font-medium">{app.userName}</TableCell>
                      <TableCell>INR {app.amount.toLocaleString()}</TableCell>
                      <TableCell><Badge variant={app.risk === 'Low' ? 'default' : app.risk === 'Medium' ? 'secondary' : 'destructive'}>{app.risk}</Badge></TableCell>
                      <TableCell><Badge variant={app.status === 'Approved' ? 'default' : app.status === 'Pending' ? 'outline' : 'destructive'}>{app.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openModal(app, 'view')}>View Details</DropdownMenuItem>
                            <DropdownMenuItem className="text-green-600 flex items-center gap-2" onClick={() => openModal(app, 'approve')}><CheckCircle size={16} /> Approve</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive flex items-center gap-2" onClick={() => openModal(app, 'reject')}><XCircle size={16} /> Reject</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{decision ? `${decision === 'approve' ? 'Approve' : 'Reject'} Loan Application?` : 'Loan Application Details'}</DialogTitle>
            <DialogDescription>
              {decision ? `This will update loan ${selectedApplication?.id}.` : `Reviewing details for loan ${selectedApplication?.id}.`}
            </DialogDescription>
          </DialogHeader>
          {!decision && (
            <div className="py-4 space-y-4">
              <div><strong>Farmer:</strong> {selectedApplication?.userName}</div>
              <div><strong>Amount:</strong> INR {selectedApplication?.amount?.toLocaleString()}</div>
              <div><strong>Purpose:</strong> {selectedApplication?.purpose}</div>
              <div><strong>AI Risk:</strong> {selectedApplication?.risk}</div>
            </div>
          )}
          {decision && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button variant={decision === 'approve' ? 'default' : 'destructive'} onClick={() => updateDecision(decision === 'approve' ? 'Approved' : 'Rejected')}>
                {decision === 'approve' ? 'Yes, Approve' : 'Yes, Reject'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
