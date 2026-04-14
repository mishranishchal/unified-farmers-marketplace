'use client';

import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, ClipboardList, Coins, Plus, ShieldCheck, Trash2, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { AgriTrustFormField } from '@/lib/types';

type TrustProfile = {
  userEmail: string;
  displayName: string;
  role: 'user' | 'buyer';
  trustScore: number;
  trustLabel: string;
  verification: {
    farmer: { status: 'pending' | 'verified'; label: string } | null;
    buyer: { status: 'pending' | 'verified'; label: string } | null;
    admin: null;
  };
};

type TrustSubmission = {
  id: string;
  userEmail: string;
  userName: string;
  role: 'user' | 'buyer';
  proofNote?: string;
  status: 'submitted' | 'reviewed' | 'verified' | 'rejected';
  createdAt: string;
};

type FieldReport = {
  id: string;
  userEmail: string;
  userName: string;
  city: string;
  reportType: 'mandi-price' | 'weather' | 'crop-status';
  commodity?: string;
  reportedPrice?: number;
  summary: string;
  rewardAmount: number;
  status: 'submitted' | 'verified' | 'rejected';
};

type WalletFundingRequest = {
  id: string;
  userEmail: string;
  userName: string;
  amount: number;
  status: 'requested' | 'account_shared' | 'payment_submitted' | 'verified' | 'rejected';
};

type TrustForm = {
  id: string;
  title: string;
  description: string;
  audienceRole: 'user' | 'buyer' | 'all';
  targetEmail?: string;
  status: 'open' | 'closed';
};

type Insight = {
  headline: string;
  bullets: string[];
  recommendation: string;
  source: 'gemini' | 'fallback';
};

export default function AdminTrustPage() {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<TrustProfile[]>([]);
  const [forms, setForms] = useState<TrustForm[]>([]);
  const [submissions, setSubmissions] = useState<TrustSubmission[]>([]);
  const [fieldReports, setFieldReports] = useState<FieldReport[]>([]);
  const [walletRequests, setWalletRequests] = useState<WalletFundingRequest[]>([]);
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Array<{ email: string; name: string; role: 'user' | 'buyer' | 'admin' }>>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [audienceRole, setAudienceRole] = useState<'user' | 'buyer' | 'all'>('user');
  const [targetEmail, setTargetEmail] = useState('');
  const [customFields, setCustomFields] = useState<AgriTrustFormField[]>([
    { id: `field-${Date.now()}-0`, label: 'Primary proof reference', type: 'text', required: true, placeholder: 'Enter the requested proof detail' },
  ]);
  const [grantEmail, setGrantEmail] = useState('');
  const [grantAmount, setGrantAmount] = useState('2500');
  const [grantReason, setGrantReason] = useState('Admin-approved AgriTrust proof grant');

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/trust', { credentials: 'include', cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Failed to load trust desk');
      setProfiles(payload.data.profiles as TrustProfile[]);
      setForms(payload.data.forms as TrustForm[]);
      setSubmissions(payload.data.submissions as TrustSubmission[]);
      setFieldReports(payload.data.fieldReports as FieldReport[]);
      setWalletRequests(payload.data.walletFundingRequests as WalletFundingRequest[]);
      setInsight(payload.data.insight as Insight);

      const usersResponse = await fetch('/api/users', { credentials: 'include', cache: 'no-store' });
      const usersPayload = await usersResponse.json();
      if (usersResponse.ok && usersPayload.success) {
        setUsers(usersPayload.data as Array<{ email: string; name: string; role: 'user' | 'buyer' | 'admin' }>);
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Load failed', description: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const pendingProfiles = useMemo(
    () =>
      profiles.filter((profile) => {
        if (profile.role === 'user') return profile.verification.farmer?.status !== 'verified';
        if (profile.role === 'buyer') return profile.verification.buyer?.status !== 'verified';
        return false;
      }),
    [profiles]
  );

  const verifyProfile = async (profile: TrustProfile) => {
    const response = await fetch('/api/admin/trust', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify-profile',
        userEmail: profile.userEmail,
        role: profile.role,
        label: 'Verified by AgriTrust admin desk',
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast({ variant: 'destructive', title: 'Verification failed', description: payload.error || 'Unable to verify profile.' });
      return;
    }
    toast({ title: 'Profile verified', description: `${profile.displayName} is now AgriTrust verified.` });
    void load();
  };

  const reviewSubmission = async (submissionId: string, status: 'verified' | 'rejected') => {
    const response = await fetch('/api/admin/trust', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'review-submission', submissionId, status }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast({ variant: 'destructive', title: 'Review failed', description: payload.error || 'Unable to update submission.' });
      return;
    }
    toast({ title: 'Submission updated', description: `Submission moved to ${status}.` });
    void load();
  };

  const reviewFieldReport = async (reportId: string, status: 'verified' | 'rejected') => {
    const response = await fetch('/api/admin/trust', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'review-field-report', reportId, status }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast({ variant: 'destructive', title: 'Review failed', description: payload.error || 'Unable to update report.' });
      return;
    }
    toast({ title: 'Field report updated', description: `Report moved to ${status}.` });
    void load();
  };

  const createForm = async () => {
    const fields = customFields.map((field, index) => ({
      ...field,
      id: field.id || `field-${Date.now()}-${index}`,
      label: field.label.trim(),
      placeholder: field.placeholder?.trim() || `Provide ${field.label.toLowerCase()}`,
    })).filter((field) => field.label);
    if (!fields.length) {
      toast({ variant: 'destructive', title: 'Field required', description: 'Add at least one form field before sending.' });
      return;
    }
    const response = await fetch('/api/agri-trust/forms', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        audienceRole,
        targetEmail: targetEmail.trim() && targetEmail !== '__all__' ? targetEmail.trim() : undefined,
        fields,
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast({ variant: 'destructive', title: 'Form creation failed', description: payload.error || 'Unable to create form.' });
      return;
    }
    toast({ title: 'Form sent', description: 'AgriTrust form has been issued to the selected audience.' });
    setTitle('');
    setDescription('');
    setTargetEmail('');
    setCustomFields([{ id: `field-${Date.now()}-0`, label: 'Primary proof reference', type: 'text', required: true, placeholder: 'Enter the requested proof detail' }]);
    void load();
  };

  const grantWallet = async () => {
    const response = await fetch('/api/admin/trust', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'grant-wallet',
        userEmail: grantEmail,
        amount: Number(grantAmount),
        reason: grantReason,
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast({ variant: 'destructive', title: 'Grant failed', description: payload.error || 'Unable to grant wallet money.' });
      return;
    }
    toast({ title: 'Wallet credited', description: `INR ${Number(grantAmount).toLocaleString()} granted to ${grantEmail}.` });
    void load();
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="brand-panel p-6">
        <Badge className="mb-3 bg-primary text-primary-foreground">AgriTrust Control Desk</Badge>
        <h1 className="text-3xl font-bold">Verification, proofs, rewards, and compliance</h1>
        <p className="mt-2 text-muted-foreground">
          Admin can issue forms, review submissions, verify users, approve farmer intelligence, and grant wallet funds from one place.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="brand-glass">
          <CardContent className="p-4">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">Pending profile reviews</p>
            <p className="text-2xl font-bold">{pendingProfiles.length}</p>
          </CardContent>
        </Card>
        <Card className="brand-glass">
          <CardContent className="p-4">
            <ClipboardList className="h-5 w-5 text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">Open form submissions</p>
            <p className="text-2xl font-bold">{submissions.filter((item) => item.status === 'submitted').length}</p>
          </CardContent>
        </Card>
        <Card className="brand-glass">
          <CardContent className="p-4">
            <Coins className="h-5 w-5 text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">Farmer field reports</p>
            <p className="text-2xl font-bold">{fieldReports.filter((item) => item.status === 'submitted').length}</p>
          </CardContent>
        </Card>
        <Card className="brand-glass">
          <CardContent className="p-4">
            <Wallet className="h-5 w-5 text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">Wallet approvals</p>
            <p className="text-2xl font-bold">{walletRequests.filter((item) => item.status !== 'verified' && item.status !== 'rejected').length}</p>
          </CardContent>
        </Card>
      </div>

      {insight && (
        <Card className="brand-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-primary" />
              {insight.headline}
            </CardTitle>
            <CardDescription>AI digest source: {insight.source}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {insight.bullets.map((bullet) => (
              <p key={bullet}>{bullet}</p>
            ))}
            <p className="font-medium text-foreground">{insight.recommendation}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="reviews" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reviews">Trust Reviews</TabsTrigger>
          <TabsTrigger value="forms">Forms</TabsTrigger>
          <TabsTrigger value="rewards">Rewards & Wallet</TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending profile verification queue</CardTitle>
              <CardDescription>Admin profile remains trusted by default. Farmers and buyers move to verified only after admin review.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Trust</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingProfiles.map((profile) => (
                    <TableRow key={profile.userEmail}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{profile.displayName}</p>
                          <p className="text-xs text-muted-foreground">{profile.userEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>{profile.role}</TableCell>
                      <TableCell>{profile.trustScore}/100</TableCell>
                      <TableCell>{profile.trustLabel}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => verifyProfile(profile)}>
                          Verify
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Submitted AgriTrust forms</CardTitle>
              <CardDescription>Review answers and move submissions into verified or rejected state.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {submissions.map((submission) => (
                <div key={submission.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{submission.userName}</p>
                      <p className="text-sm text-muted-foreground">{submission.userEmail} · {submission.role}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{submission.proofNote || 'No extra proof note submitted.'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={submission.status === 'verified' ? 'default' : 'secondary'}>{submission.status}</Badge>
                      <Button size="sm" variant="outline" onClick={() => reviewSubmission(submission.id, 'rejected')}>
                        Reject
                      </Button>
                      <Button size="sm" onClick={() => reviewSubmission(submission.id, 'verified')}>
                        Verify
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Farmer intelligence reports</CardTitle>
              <CardDescription>Verified reports credit the farmer and strengthen marketplace analytics.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {fieldReports.map((report) => (
                <div key={report.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{report.userName} · {report.city}</p>
                      <p className="text-sm text-muted-foreground">
                        {report.reportType} {report.commodity ? `· ${report.commodity}` : ''} {report.reportedPrice ? `· INR ${report.reportedPrice}` : ''}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{report.summary}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={report.status === 'verified' ? 'default' : 'secondary'}>{report.status}</Badge>
                      <span className="text-xs text-muted-foreground">Reward INR {report.rewardAmount}</span>
                      <Button size="sm" variant="outline" onClick={() => reviewFieldReport(report.id, 'rejected')}>
                        Reject
                      </Button>
                      <Button size="sm" onClick={() => reviewFieldReport(report.id, 'verified')}>
                        Verify
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create AgriTrust form</CardTitle>
              <CardDescription>Issue a form to all users of a role or to one target email.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Title</Label>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Example: Buyer GST verification refresh" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="Explain what the admin needs from the user." />
              </div>
              <div className="space-y-2">
                <Label>Audience role</Label>
                <Select value={audienceRole} onValueChange={(value) => setAudienceRole(value as typeof audienceRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Farmers</SelectItem>
                    <SelectItem value="buyer">Buyers</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target email (optional)</Label>
                <Select value={targetEmail} onValueChange={setTargetEmail}>
                  <SelectTrigger>
                    <SelectValue placeholder="Leave blank to send to the whole role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Whole selected role</SelectItem>
                    {users
                      .filter((user) => user.role !== 'admin' && (audienceRole === 'all' || user.role === audienceRole))
                      .map((user) => (
                      <SelectItem key={user.email} value={user.email}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3 md:col-span-2">
                <div className="flex items-center justify-between">
                  <Label>Custom form fields</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCustomFields((current) => [
                        ...current,
                        { id: `field-${Date.now()}-${current.length}`, label: '', type: 'text', required: true, placeholder: '' },
                      ])
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add field
                  </Button>
                </div>
                {customFields.map((field, index) => (
                  <div key={field.id} className="grid gap-3 rounded-xl border p-3 md:grid-cols-[1.2fr_0.8fr_auto]">
                    <Input
                      value={field.label}
                      placeholder={`Field ${index + 1} label`}
                      onChange={(event) =>
                        setCustomFields((current) => current.map((item) => (item.id === field.id ? { ...item, label: event.target.value } : item)))
                      }
                    />
                    <Select
                      value={field.type}
                      onValueChange={(value) =>
                        setCustomFields((current) => current.map((item) => (item.id === field.id ? { ...item, type: value as AgriTrustFormField['type'] } : item)))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="document">Document</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setCustomFields((current) => current.length === 1 ? current : current.filter((item) => item.id !== field.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex items-end">
                <Button onClick={createForm} className="w-full">
                  Send form
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Issued forms</CardTitle>
              <CardDescription>{loading ? 'Loading...' : `${forms.length} trust forms tracked in the data store.`}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {forms.map((form) => (
                <div key={form.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{form.title}</p>
                      <p className="text-sm text-muted-foreground">{form.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Audience: {form.targetEmail ? form.targetEmail : form.audienceRole}
                      </p>
                    </div>
                    <Badge variant={form.status === 'open' ? 'default' : 'secondary'}>{form.status}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Admin proof-based wallet grant</CardTitle>
              <CardDescription>Use after checking payment proof, document proof, or platform support evidence.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>User email</Label>
                <Input value={grantEmail} onChange={(event) => setGrantEmail(event.target.value)} placeholder="customer@farmersmarketplace.app" />
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" value={grantAmount} onChange={(event) => setGrantAmount(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Input value={grantReason} onChange={(event) => setGrantReason(event.target.value)} />
              </div>
              <div className="md:col-span-3">
                <Button onClick={grantWallet}>Grant wallet money</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Open wallet funding requests</CardTitle>
              <CardDescription>These users still need admin settlement or proof verification.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {walletRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{request.userName}</p>
                          <p className="text-xs text-muted-foreground">{request.userEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>INR {request.amount.toLocaleString()}</TableCell>
                      <TableCell>{request.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
