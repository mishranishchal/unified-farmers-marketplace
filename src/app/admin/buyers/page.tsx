'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, MoreHorizontal, CheckCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

type Buyer = {
  id: string;
  name: string;
  contact?: string;
  type: string;
  status?: 'Verified' | 'Pending' | 'Suspended';
  trades?: number;
  demand: string[];
  location: string;
  capacity: string;
  verified?: boolean;
};

export default function BuyerManagementPage() {
  const { toast } = useToast();
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [isBuyerModalOpen, setIsBuyerModalOpen] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);
  const [form, setForm] = useState({ name: '', contact: '', type: '', crops: '', location: '', capacity: '' });

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/buyers', { credentials: 'include' });
      const payload = await res.json();
      if (payload.success) setBuyers(payload.data as Buyer[]);
    };
    void load();
  }, []);

  const openBuyerModal = (buyer: Buyer | null = null) => {
    setSelectedBuyer(buyer);
    setForm({
      name: buyer?.name || '',
      contact: buyer?.contact || '',
      type: buyer?.type || '',
      crops: buyer?.demand.join(', ') || '',
      location: buyer?.location || '',
      capacity: buyer?.capacity || '',
    });
    setIsBuyerModalOpen(true);
  };

  const saveBuyer = async () => {
    const method = selectedBuyer ? 'PATCH' : 'POST';
    const res = await fetch('/api/buyers', {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        selectedBuyer
          ? {
              id: selectedBuyer.id,
              updates: {
                name: form.name,
                contact: form.contact,
                type: form.type,
                location: form.location,
                capacity: form.capacity,
                demand: form.crops.split(',').map((item) => item.trim()).filter(Boolean),
              },
            }
          : {
              name: form.name,
              contact: form.contact,
              type: form.type,
              location: form.location,
              capacity: form.capacity,
              demand: form.crops.split(',').map((item) => item.trim()).filter(Boolean),
              verified: false,
              status: 'Pending',
            }
      ),
    });
    const payload = await res.json();
    if (!res.ok || !payload.success) {
      toast({ variant: 'destructive', title: 'Failed', description: payload.error || 'Unable to save buyer.' });
      return;
    }
    const item = payload.data as Buyer;
    setBuyers((prev) => (selectedBuyer ? prev.map((buyer) => (buyer.id === item.id ? item : buyer)) : [item, ...prev]));
    setIsBuyerModalOpen(false);
    toast({ title: 'Saved', description: 'Buyer profile updated.' });
  };

  const verifyBuyer = async (buyer: Buyer) => {
    const res = await fetch('/api/buyers', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: buyer.id, updates: { verified: true, status: 'Verified' } }),
    });
    const payload = await res.json();
    if (payload.success) {
      setBuyers((prev) => prev.map((item) => (item.id === buyer.id ? (payload.data as Buyer) : item)));
      toast({ title: 'Verified', description: `${buyer.name} is now marked verified.` });
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold font-headline">Buyer & Co-op Network</h1>
        <p className="text-muted-foreground">Manage buyers and off-takers with persisted backend records.</p>
      </header>

      <Tabs defaultValue="buyers">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="buyers">Buyers</TabsTrigger>
            <TabsTrigger value="co-ops" disabled>Co-operatives</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-10" />
            </div>
            <Button onClick={() => openBuyerModal()}><Plus className="mr-2" /> Add New</Button>
          </div>
        </div>

        <TabsContent value="buyers" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Buyer Profiles</CardTitle>
              <CardDescription>Manage and verify all buyers and off-takers in the network.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Buyer Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Crops of Interest</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {buyers.map((buyer) => (
                    <TableRow key={buyer.id}>
                      <TableCell className="font-medium">{buyer.name}</TableCell>
                      <TableCell>{buyer.type}</TableCell>
                      <TableCell>{buyer.demand.join(', ')}</TableCell>
                      <TableCell><Badge variant={buyer.status === 'Verified' ? 'default' : 'outline'}>{buyer.status || 'Pending'}</Badge></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openBuyerModal(buyer)}>View Profile</DropdownMenuItem>
                            <DropdownMenuItem className="text-green-600 flex items-center gap-2" onClick={() => verifyBuyer(buyer)}>
                              <CheckCircle size={16} /> Verify Buyer
                            </DropdownMenuItem>
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

      <Dialog open={isBuyerModalOpen} onOpenChange={setIsBuyerModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedBuyer ? 'Edit Buyer Profile' : 'Add New Buyer'}</DialogTitle>
            <DialogDescription>{selectedBuyer ? `Editing profile for ${selectedBuyer.name}` : 'Enter the details for the new buyer.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contact" className="text-right">Contact</Label>
              <Input id="contact" value={form.contact} onChange={(e) => setForm((prev) => ({ ...prev, contact: e.target.value }))} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">Type</Label>
              <Input id="type" value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="location" className="text-right">Location</Label>
              <Input id="location" value={form.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="capacity" className="text-right">Capacity</Label>
              <Input id="capacity" value={form.capacity} onChange={(e) => setForm((prev) => ({ ...prev, capacity: e.target.value }))} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="crops" className="text-right">Crops</Label>
              <Input id="crops" value={form.crops} onChange={(e) => setForm((prev) => ({ ...prev, crops: e.target.value }))} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={saveBuyer}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
