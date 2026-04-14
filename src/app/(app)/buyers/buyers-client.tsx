'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Building2, HandCoins, MessagesSquare, PhoneCall, Search, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { BuyerProfile, NegotiationRecord } from '@/lib/types';

type BuyersClientProps = {
  initialBuyers: BuyerProfile[];
};

export default function BuyersClient({ initialBuyers }: BuyersClientProps) {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [buyers] = useState<BuyerProfile[]>(initialBuyers);
  const [selected, setSelected] = useState<BuyerProfile | null>(null);
  const [mode, setMode] = useState<'call' | 'message' | 'negotiation' | null>(null);
  const [lotDetails, setLotDetails] = useState('');
  const [message, setMessage] = useState('');
  const [proposedPrice, setProposedPrice] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [negotiations, setNegotiations] = useState<NegotiationRecord[]>([]);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/negotiations', { credentials: 'include' });
      const payload = await res.json();
      if (payload.success) setNegotiations(payload.data as NegotiationRecord[]);
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (!deferredQuery.trim()) return buyers;
    const lowerQuery = deferredQuery.toLowerCase();
    return buyers.filter(
      (buyer) =>
        buyer.name.toLowerCase().includes(lowerQuery) ||
        buyer.location.toLowerCase().includes(lowerQuery) ||
        buyer.demand.join(' ').toLowerCase().includes(lowerQuery) ||
        buyer.preferredLocations?.join(' ').toLowerCase().includes(lowerQuery)
    );
  }, [buyers, deferredQuery]);

  const submitInteraction = async (interactionMode: 'call' | 'message') => {
    if (!selected) return;
    const response = await fetch('/api/buyer-interactions', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buyerId: selected.id,
        buyerName: selected.name,
        mode: interactionMode,
        lotDetails,
        message,
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast({ variant: 'destructive', title: 'Failed', description: payload.error || 'Unable to submit request.' });
      return;
    }
    toast({
      title: interactionMode === 'call' ? 'Call scheduled' : 'Request sent',
      description: interactionMode === 'call' ? `Call request saved for ${selected.name}.` : `Offer sent to ${selected.name}.`,
    });
    setLotDetails('');
    setMessage('');
    setMode(null);
  };

  const submitNegotiation = async () => {
    if (!selected) return;
    const response = await fetch('/api/negotiations', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetName: selected.name,
        targetEmail: selected.contact,
        targetRole: 'buyer',
        commodity: lotDetails || selected.demand[0] || 'Maize',
        quantity: Number(quantity || 0),
        proposedPrice: Number(proposedPrice || 0),
        terms: message,
        mode: 'offer',
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast({ variant: 'destructive', title: 'Failed', description: payload.error || 'Unable to submit negotiation.' });
      return;
    }
    setNegotiations((current) => [payload.data as NegotiationRecord, ...current]);
    toast({ title: 'Negotiation opened', description: `Offer created for ${selected.name}.` });
    setLotDetails('');
    setMessage('');
    setProposedPrice('');
    setQuantity('10');
    setMode(null);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-gradient-to-r from-violet-900 to-indigo-900 p-6 text-white">
        <Badge className="mb-2 bg-white/20 text-white">Buyers</Badge>
        <h1 className="text-3xl font-bold">Buyer Network</h1>
        <p className="mt-1 text-sm text-white/70">Find buyers, check demand, and start direct conversations.</p>
      </section>

      <section className="grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by buyer, crop, or location" />
        </div>
        <Badge variant="outline" className="justify-center px-4 py-2 text-xs">
          {filtered.length} verified buyer opportunities
        </Badge>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Buyer List</CardTitle>
            <CardDescription>{filtered.length} buyers matched your criteria.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {filtered.map((buyer) => (
              <button key={buyer.id} onClick={() => setSelected(buyer)} className="w-full rounded-lg border p-3 text-left transition hover:bg-slate-50">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{buyer.name}</p>
                    <p className="text-xs text-muted-foreground">{buyer.location}</p>
                  </div>
                  <Badge variant="secondary">{buyer.type}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {buyer.demand.map((crop) => (
                    <Badge key={crop} variant="outline" className="text-[10px]">
                      {crop}
                    </Badge>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>Capacity: {buyer.capacity}</span>
                  <span>Terms: {buyer.paymentTerms || 'Negotiable'}</span>
                  <span>Trades: {buyer.trades ?? 0}</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Buyer Details</CardTitle>
            <CardDescription>Select a buyer to call or message.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selected && <p className="text-sm text-muted-foreground">No buyer selected yet.</p>}
            {selected && (
              <>
                <div className="rounded-lg border p-3">
                  <p className="font-semibold">{selected.name}</p>
                  <p className="text-xs text-muted-foreground">{selected.location}</p>
                  <p className="mt-2 text-sm">Capacity: {selected.capacity}</p>
                  <p className="mt-1 text-sm">Payment terms: {selected.paymentTerms || 'Negotiable on confirmation'}</p>
                  {selected.contact && <p className="mt-1 text-sm">Email: {selected.contact}</p>}
                  {selected.phone && <p className="mt-1 text-sm">Phone: {selected.phone}</p>}
                  <p className="mt-1 flex items-center gap-1 text-xs text-emerald-700">
                    <ShieldCheck className="h-3 w-3" />
                    Verification score: {selected.verified ? `High${selected.rating ? ` · ${selected.rating.toFixed(1)}/5` : ''}` : 'Moderate'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selected.preferredLocations?.map((item) => (
                      <Badge key={item} variant="secondary" className="text-[10px]">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => setMode('call')}>
                    <PhoneCall className="mr-1 h-4 w-4" />
                    Call
                  </Button>
                  <Button variant="outline" onClick={() => setMode('message')}>
                    <MessagesSquare className="mr-1 h-4 w-4" />
                    Message
                  </Button>
                </div>
                <Button variant="secondary" className="w-full" onClick={() => setMode('negotiation')}>
                  <HandCoins className="mr-1 h-4 w-4" />
                  Open Negotiation
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Negotiation Panel</CardTitle>
          <CardDescription>Track open price discussions and submitted offers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {negotiations.map((item) => (
            <div key={item.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{item.targetName}</p>
                <Badge variant="outline">{item.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {item.commodity} · {item.quantity} MT · INR {item.proposedPrice.toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{item.terms}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={mode === 'message'} onOpenChange={() => setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Message</DialogTitle>
            <DialogDescription>Share your offer details with {selected?.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Lot Details</Label>
              <Input value={lotDetails} onChange={(event) => setLotDetails(event.target.value)} placeholder="e.g. 15 MT maize, FAQ grade, 12% moisture" />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea rows={4} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write your offer terms..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>
              Cancel
            </Button>
            <Button onClick={() => submitInteraction('message')}>
              <Building2 className="mr-1 h-4 w-4" />
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === 'call'} onOpenChange={() => setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Call Buyer</DialogTitle>
            <DialogDescription>Schedule a call request with {selected?.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Lot Details</Label>
              <Input value={lotDetails} onChange={(event) => setLotDetails(event.target.value)} placeholder="Optional lot summary for the buyer" />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea rows={4} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Preferred time window, crop details, expectations..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>
              Close
            </Button>
            <Button onClick={() => submitInteraction('call')}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === 'negotiation'} onOpenChange={() => setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open Negotiation</DialogTitle>
            <DialogDescription>Share a quantity, price, and terms proposal with {selected?.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Commodity / Lot</Label>
              <Input value={lotDetails} onChange={(event) => setLotDetails(event.target.value)} placeholder="e.g. Maize Grade A" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantity (MT)</Label>
                <Input value={quantity} onChange={(event) => setQuantity(event.target.value)} />
              </div>
              <div>
                <Label>Proposed Price (INR/quintal)</Label>
                <Input value={proposedPrice} onChange={(event) => setProposedPrice(event.target.value)} />
              </div>
            </div>
            <div>
              <Label>Terms</Label>
              <Textarea rows={4} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Payment terms, moisture cap, dispatch date..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>Cancel</Button>
            <Button onClick={submitNegotiation}>Send Offer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
