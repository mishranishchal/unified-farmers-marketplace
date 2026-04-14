'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Trash2, Plus } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

type AdminUser = {
  id?: string;
  name: string;
  email: string;
  role: 'user' | 'buyer' | 'admin';
  status?: string;
};

type ConfigPayload = {
  accessPolicy: { farmerPlan: string; buyerPlan: string };
  categories: { crops: string[]; inputs: string[] };
  ui?: { supportedLanguages: ('en' | 'hi')[]; defaultLanguage: 'en' | 'hi' };
  finance: {
    settlementAccountName: string;
    settlementAccountNumber: string;
    settlementIfsc: string;
    settlementUpi: string;
  };
  developer: {
    name: string;
    photoUrl: string;
    college: string;
    rollNo: string;
    address: string;
    contact: string;
    bio: string;
  };
};

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState('');
  const [config, setConfig] = useState<ConfigPayload>({
    accessPolicy: { farmerPlan: '', buyerPlan: '' },
    categories: { crops: [], inputs: [] },
    ui: { supportedLanguages: ['en', 'hi'], defaultLanguage: 'en' },
    finance: { settlementAccountName: '', settlementAccountNumber: '', settlementIfsc: '', settlementUpi: '' },
    developer: { name: '', photoUrl: '', college: '', rollNo: '', address: '', contact: '', bio: '' },
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('support-agent');
  const [selectedExistingUser, setSelectedExistingUser] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [usersRes, configRes] = await Promise.all([
          fetch('/api/users', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/admin/config', { credentials: 'include', cache: 'no-store' }),
        ]);
        const [usersPayload, configPayload] = await Promise.all([usersRes.json(), configRes.json()]);
        if (!usersRes.ok || !usersPayload.success) throw new Error(usersPayload.error || 'Unable to load users.');
        if (!configRes.ok || !configPayload.success) throw new Error(configPayload.error || 'Unable to load admin config.');
        setAdmins(usersPayload.data as AdminUser[]);
        setConfig(configPayload.data as ConfigPayload);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Load failed', description: (error as Error).message });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [toast]);

  const saveConfig = async (section: string, next: Partial<ConfigPayload>) => {
    setSavingSection(section);
    const merged: ConfigPayload = {
      accessPolicy: { ...config.accessPolicy, ...(next.accessPolicy ?? {}) },
      categories: {
        crops: next.categories?.crops ?? config.categories.crops,
        inputs: next.categories?.inputs ?? config.categories.inputs,
      },
      ui: {
        supportedLanguages: next.ui?.supportedLanguages ?? config.ui?.supportedLanguages ?? ['en', 'hi'],
        defaultLanguage: next.ui?.defaultLanguage ?? config.ui?.defaultLanguage ?? 'en',
      },
      finance: { ...config.finance, ...(next.finance ?? {}) },
      developer: { ...config.developer, ...(next.developer ?? {}) },
    };
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) {
        toast({ variant: 'destructive', title: 'Failed', description: payload.error || 'Unable to save config.' });
        return;
      }
      setConfig(payload.data as ConfigPayload);
      router.refresh();
      toast({ title: 'Saved', description: 'Platform configuration updated.' });
    } finally {
      setSavingSection('');
    }
  };

  const inviteAdmin = async () => {
    const email = selectedExistingUser || inviteEmail;
    const res = await fetch('/api/admin/invitations', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role: inviteRole }),
    });
    const payload = await res.json();
    if (!res.ok || !payload.success) {
      toast({ variant: 'destructive', title: 'Failed', description: payload.error || 'Unable to invite admin.' });
      return;
    }
    const nextUser = payload.data.user as AdminUser;
    setAdmins((prev) => {
      const filtered = prev.filter((user) => user.email.toLowerCase() !== nextUser.email.toLowerCase());
      return [...filtered, nextUser];
    });
    toast({
      title: payload.data.promotedExistingUser ? 'User promoted to admin' : 'Admin invited',
      description: payload.data.promotedExistingUser
        ? `${nextUser.email} can now access the admin workspace.`
        : `Temporary password: ${payload.data.temporaryPassword}`,
    });
    setInviteEmail('');
    setSelectedExistingUser('');
    setIsModalOpen(false);
  };

  const adminUsers = admins.filter((user) => user.role === 'admin');
  const promotableUsers = admins.filter((user) => user.role !== 'admin');

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold font-headline">Settings & Admin Roles</h1>
        <p className="text-muted-foreground">Control platform-wide settings and admin permissions.</p>
      </header>
      {loading && <p className="text-sm text-muted-foreground">Loading admin configuration...</p>}

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General Config</TabsTrigger>
          <TabsTrigger value="finance">Finance & Developer</TabsTrigger>
          <TabsTrigger value="admins">Admin Users & Roles</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>General App Configuration</CardTitle>
              <CardDescription>Manage platform-wide settings like categories and access policy.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Access Policy</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="monthly-price">Farmer Access Plan</Label>
                    <Input
                      id="monthly-price"
                      value={config.accessPolicy.farmerPlan}
                      onChange={(e) => setConfig((prev) => ({ ...prev, accessPolicy: { ...prev.accessPolicy, farmerPlan: e.target.value } }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yearly-price">Buyer Access Plan</Label>
                    <Input
                      id="yearly-price"
                      value={config.accessPolicy.buyerPlan}
                      onChange={(e) => setConfig((prev) => ({ ...prev, accessPolicy: { ...prev.accessPolicy, buyerPlan: e.target.value } }))}
                    />
                  </div>
                  <Button onClick={() => saveConfig('policy', { accessPolicy: config.accessPolicy })} disabled={savingSection === 'policy'}>
                    {savingSection === 'policy' ? 'Saving...' : 'Save Policy'}
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-lg">App Categories</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="crop-cats">Crop Categories</Label>
                    <Input
                      id="crop-cats"
                      value={config.categories.crops.join(', ')}
                      onChange={(e) => setConfig((prev) => ({ ...prev, categories: { ...prev.categories, crops: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) } }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="input-cats">Input Categories</Label>
                    <Input
                      id="input-cats"
                      value={config.categories.inputs.join(', ')}
                      onChange={(e) => setConfig((prev) => ({ ...prev, categories: { ...prev.categories, inputs: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) } }))}
                    />
                  </div>
                  <Button onClick={() => saveConfig('categories', { categories: config.categories })} disabled={savingSection === 'categories'}>
                    {savingSection === 'categories' ? 'Saving...' : 'Save Categories'}
                  </Button>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="finance" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Wallet Settlement Details</CardTitle>
                <CardDescription>Admins can publish the bank and UPI details shared with trusted customers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input value={config.finance.settlementAccountName} onChange={(e) => setConfig((prev) => ({ ...prev, finance: { ...prev.finance, settlementAccountName: e.target.value } }))} />
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input value={config.finance.settlementAccountNumber} onChange={(e) => setConfig((prev) => ({ ...prev, finance: { ...prev.finance, settlementAccountNumber: e.target.value } }))} />
                </div>
                <div className="space-y-2">
                  <Label>IFSC</Label>
                  <Input value={config.finance.settlementIfsc} onChange={(e) => setConfig((prev) => ({ ...prev, finance: { ...prev.finance, settlementIfsc: e.target.value } }))} />
                </div>
                <div className="space-y-2">
                  <Label>UPI</Label>
                  <Input value={config.finance.settlementUpi} onChange={(e) => setConfig((prev) => ({ ...prev, finance: { ...prev.finance, settlementUpi: e.target.value } }))} />
                </div>
                <Button onClick={() => saveConfig('finance', { finance: config.finance })} disabled={savingSection === 'finance'}>
                  {savingSection === 'finance' ? 'Saving...' : 'Save Finance Details'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Site Developer Section</CardTitle>
                <CardDescription>These details are shown on the public developer information page.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={config.developer.name} onChange={(e) => setConfig((prev) => ({ ...prev, developer: { ...prev.developer, name: e.target.value } }))} />
                </div>
                <div className="space-y-2">
                  <Label>Photo URL</Label>
                  <Input value={config.developer.photoUrl} onChange={(e) => setConfig((prev) => ({ ...prev, developer: { ...prev.developer, photoUrl: e.target.value } }))} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>College</Label>
                    <Input value={config.developer.college} onChange={(e) => setConfig((prev) => ({ ...prev, developer: { ...prev.developer, college: e.target.value } }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Roll No.</Label>
                    <Input value={config.developer.rollNo} onChange={(e) => setConfig((prev) => ({ ...prev, developer: { ...prev.developer, rollNo: e.target.value } }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Contact</Label>
                  <Input value={config.developer.contact} onChange={(e) => setConfig((prev) => ({ ...prev, developer: { ...prev.developer, contact: e.target.value } }))} />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={config.developer.address} onChange={(e) => setConfig((prev) => ({ ...prev, developer: { ...prev.developer, address: e.target.value } }))} />
                </div>
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Input value={config.developer.bio} onChange={(e) => setConfig((prev) => ({ ...prev, developer: { ...prev.developer, bio: e.target.value } }))} />
                </div>
                <Button onClick={() => saveConfig('developer', { developer: config.developer })} disabled={savingSection === 'developer'}>
                  {savingSection === 'developer' ? 'Saving...' : 'Save Developer Details'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="admins" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Admin Users</CardTitle>
                <CardDescription>Manage who has access to this admin dashboard.</CardDescription>
              </div>
              <Button onClick={() => setIsModalOpen(true)}><Plus className="mr-2" /> Invite Admin</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>2FA Enabled</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminUsers.map((user) => (
                    <TableRow key={user.email}>
                      <TableCell>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2"><Shield size={16} className="text-primary" /> Platform Admin</div>
                      </TableCell>
                      <TableCell><Switch checked /></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" disabled className="text-muted-foreground"><Trash2 size={16} /></Button>
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Invite New Admin</DialogTitle>
            <DialogDescription>Enter the email and assign a role for the new admin user.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="existing-user">Or Promote Existing User</Label>
              <Select value={selectedExistingUser} onValueChange={setSelectedExistingUser}>
                <SelectTrigger id="existing-user"><SelectValue placeholder="Select an existing user" /></SelectTrigger>
                <SelectContent>
                  {promotableUsers.map((user) => (
                    <SelectItem key={user.email} value={user.email}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Admin Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger id="role"><SelectValue placeholder="Select a role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="super-admin">Super Admin</SelectItem>
                  <SelectItem value="content-admin">Content Admin</SelectItem>
                  <SelectItem value="loan-officer">Loan Officer</SelectItem>
                  <SelectItem value="support-agent">Support Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" onClick={inviteAdmin} disabled={!inviteEmail && !selectedExistingUser}>
              {selectedExistingUser ? 'Promote User' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
