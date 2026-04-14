'use client';

import { useEffect, useMemo, useState } from 'react';
import { MoreHorizontal, Search, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

type Order = {
  id: string;
  userName: string;
  items: Array<{ quantity: number }>;
  totalAmount: number;
  paymentStatus: string;
  status: 'created' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'failed';
  courier: string;
  shipmentId?: string;
  invoiceId?: string;
  createdAt: string;
};

type Shipment = {
  id: string;
  orderId: string;
  status: 'processing' | 'packed' | 'in_transit' | 'out_for_delivery' | 'delivered';
  lastCheckpoint: string;
  courier: string;
  etaHours: number;
};

export default function OrdersManagementPage() {
  const [query, setQuery] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const [ordersRes, shipmentsRes] = await Promise.all([
        fetch('/api/orders', { credentials: 'include' }),
        fetch('/api/shipments', { credentials: 'include' }),
      ]);
      const [ordersPayload, shipmentsPayload] = await Promise.all([ordersRes.json(), shipmentsRes.json()]);
      if (ordersPayload.success) setOrders(ordersPayload.data as Order[]);
      if (shipmentsPayload.success) setShipments(shipmentsPayload.data as Shipment[]);
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return orders;
    const value = query.toLowerCase();
    return orders.filter((order) => order.id.toLowerCase().includes(value) || order.userName.toLowerCase().includes(value));
  }, [orders, query]);

  const updateShipment = async (id: string | undefined, status: Shipment['status']) => {
    if (!id) return;
    const response = await fetch('/api/shipments', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        status,
        lastCheckpoint: `Admin moved shipment to ${status.replace(/_/g, ' ')}`,
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast({ variant: 'destructive', title: 'Update failed', description: payload.error || 'Unable to update shipment.' });
      return;
    }
    setShipments((current) => current.map((shipment) => (shipment.id === id ? (payload.data as Shipment) : shipment)));
    toast({ title: 'Shipment updated', description: `${id} is now ${status.replace(/_/g, ' ')}.` });
  };

  const shipmentLookup = useMemo(() => Object.fromEntries(shipments.map((shipment) => [shipment.id, shipment])), [shipments]);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold font-headline">Marketplace Orders & Logistics</h1>
        <p className="text-muted-foreground">Manage order confirmations, shipment state, and invoice-linked commerce flows.</p>
      </header>

      <Tabs defaultValue="all-orders">
        <div className="flex items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="all-orders">All Orders</TabsTrigger>
            <TabsTrigger value="live-shipments">Live Shipments</TabsTrigger>
          </TabsList>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by Order ID or User..." className="pl-10" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>

        <TabsContent value="all-orders" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Marketplace Orders</CardTitle>
              <CardDescription>Each order now carries payment, shipment, and invoice references.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Shipment</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono">{order.id}</TableCell>
                      <TableCell className="font-medium">{order.userName}</TableCell>
                      <TableCell>INR {order.totalAmount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}>{order.paymentStatus}</Badge>
                      </TableCell>
                      <TableCell>
                        {order.shipmentId ? shipmentLookup[order.shipmentId]?.status || 'processing' : 'Not linked'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>{order.items.length} line items</DropdownMenuItem>
                            <DropdownMenuItem>{order.invoiceId || 'No invoice'}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateShipment(order.shipmentId, 'packed')}>Mark packed</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateShipment(order.shipmentId, 'in_transit')}>Move to transit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateShipment(order.shipmentId, 'delivered')}>Mark delivered</DropdownMenuItem>
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

        <TabsContent value="live-shipments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Live Shipment Board</CardTitle>
              <CardDescription>Admins can now update the logistics state directly from this interface.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {shipments.map((shipment) => (
                <div key={shipment.id} className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium">{shipment.id}</p>
                    <p className="text-xs text-muted-foreground">{shipment.orderId} · {shipment.courier}</p>
                  </div>
                  <div className="text-sm text-muted-foreground">{shipment.lastCheckpoint}</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{shipment.status}</Badge>
                    <span className="text-xs text-muted-foreground">ETA {shipment.etaHours}h</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => updateShipment(shipment.id, 'out_for_delivery')}>
                      <Truck className="mr-2 h-4 w-4" />
                      Out for delivery
                    </Button>
                    <Button size="sm" onClick={() => updateShipment(shipment.id, 'delivered')}>
                      Delivered
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
