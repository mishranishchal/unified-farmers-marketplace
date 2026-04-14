'use client';

import Link from 'next/link';
import { useDeferredValue, useMemo, useState } from 'react';
import { ArrowUpRight, ImagePlus, Plus, Search, ShieldCheck, ShoppingCart, Sparkles, Star, Store, Tags, Truck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import type { FarmerListing, MarketplaceProduct } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { buildMonogramImage } from '@/lib/image-utils';

type MarketplaceClientProps = {
  initialProducts: MarketplaceProduct[];
  initialListings: FarmerListing[];
  locationOptions: string[];
};

export default function MarketplaceClient({ initialProducts, initialListings, locationOptions }: MarketplaceClientProps) {
  const { addToCart } = useCart();
  const { toast } = useToast();
  const { user } = useAuth();
  const { tx } = useLanguage();
  const [query, setQuery] = useState('');
  const [products] = useState<MarketplaceProduct[]>(initialProducts);
  const [listings, setListings] = useState<FarmerListing[]>(initialListings);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    commodity: 'Maize',
    price: '',
    quantity: '',
    grade: 'FAQ',
    desc: '',
    location: 'Pune',
  });
  const deferredQuery = useDeferredValue(query);

  const categoryCount = useMemo(() => new Set(products.map((product) => product.category)).size, [products]);
  const filteredProducts = useMemo(() => {
    if (!deferredQuery.trim()) return products;
    const value = deferredQuery.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(value) ||
        product.category.toLowerCase().includes(value) ||
        product.tags?.some((tag) => tag.toLowerCase().includes(value))
    );
  }, [deferredQuery, products]);
  const filteredListings = useMemo(() => {
    if (!deferredQuery.trim()) return listings;
    const value = deferredQuery.toLowerCase();
    return listings.filter(
      (listing) =>
        listing.name.toLowerCase().includes(value) ||
        listing.location.toLowerCase().includes(value) ||
        listing.commodity?.toLowerCase().includes(value) ||
        listing.grade?.toLowerCase().includes(value)
    );
  }, [deferredQuery, listings]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border bg-[linear-gradient(135deg,#092318_0%,#13402b_40%,#d48b2f_100%)] p-6 text-white">
        <Badge className="mb-2 bg-white/20 text-white">{tx('Marketplace', 'मार्केटप्लेस')}</Badge>
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">{tx('Verified farm commerce, built for real trade.', 'सत्यापित कृषि वाणिज्य, वास्तविक व्यापार के लिए।')}</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/75">
              {tx(
                'Browse trusted inputs, compare live farmer lots, and move into direct buyer negotiation with pricing, stock, and dispatch context visible.',
                'विश्वसनीय इनपुट ब्राउज़ करें, लाइव किसान लॉट तुलना करें और कीमत, स्टॉक तथा डिस्पैच संदर्भ के साथ सीधे खरीदार नेगोशिएशन में जाएं।'
              )}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge className="bg-white/10 text-white"><ShieldCheck className="mr-1 h-3.5 w-3.5" /> {tx('AgriTrust listings', 'एग्रीट्रस्ट लिस्टिंग')}</Badge>
              <Badge className="bg-white/10 text-white"><Truck className="mr-1 h-3.5 w-3.5" /> {tx('Dispatch aware', 'डिस्पैच सक्षम')}</Badge>
              <Badge className="bg-white/10 text-white"><Sparkles className="mr-1 h-3.5 w-3.5" /> {tx('Heuristic pricing context', 'हीयूरिस्टिक प्राइसिंग')}</Badge>
            </div>
          </div>
          <div className="grid gap-3 rounded-[28px] border border-white/10 bg-white/10 p-4 backdrop-blur">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs text-white/60">{tx('Top-rated inputs', 'टॉप रेटेड इनपुट')}</p>
                <p className="mt-1 text-2xl font-bold">{products.filter((product) => product.rating >= 4.5).length}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs text-white/60">{tx('Buyer-ready lots', 'खरीदार-तैयार लॉट')}</p>
                <p className="mt-1 text-2xl font-bold">{listings.filter((listing) => listing.status === 'active').length}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary">
                <Link href="/buyers">
                  {tx('Meet Buyers', 'खरीदार देखें')}
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button onClick={() => setOpen(true)}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                {tx('Publish Lot', 'लॉट प्रकाशित करें')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{tx('Active Input SKUs', 'सक्रिय इनपुट SKU')}</p>
            <p className="text-2xl font-bold">{products.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{tx('Category Spread', 'श्रेणी विस्तार')}</p>
            <p className="text-2xl font-bold">{categoryCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{tx('Live Farmer Lots', 'लाइव किसान लॉट')}</p>
            <p className="text-2xl font-bold">{listings.length}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tx('Search products, commodities, grades, or locations', 'उत्पाद, कमोडिटी, ग्रेड या स्थान खोजें')}
          />
        </div>
        <Badge variant="outline" className="justify-center px-4 py-2 text-xs">
          {filteredProducts.length} {tx('inputs', 'इनपुट')} · {filteredListings.length} {tx('live lots', 'लाइव लॉट')}
        </Badge>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card className="overflow-hidden bg-white/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              {tx('Farm Inputs', 'फार्म इनपुट')}
            </CardTitle>
            <CardDescription>{tx('Products available for quick purchase with seller, stock, and delivery context.', 'त्वरित खरीद के लिए उपलब्ध उत्पाद जिनमें विक्रेता, स्टॉक और डिलीवरी संदर्भ दिखता है।')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {filteredProducts.map((product) => (
              <div key={product.id} className="overflow-hidden rounded-[24px] border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                <div className="relative aspect-[16/10] bg-slate-100">
                  <img
                    src={buildMonogramImage(product.name, product.category)}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute left-3 top-3 flex gap-2">
                    <Badge className="bg-white/90 text-slate-950">{product.category}</Badge>
                    <Badge variant="secondary"><Star className="mr-1 h-3 w-3 fill-current" /> {product.rating.toFixed(1)}</Badge>
                  </div>
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.seller} · {product.location}</p>
                    </div>
                    <Badge variant={product.inStock ? 'default' : 'secondary'}>
                      {product.inStock ? `${product.stockQuantity ?? 0} ${tx('in stock', 'स्टॉक में')}` : tx('Out of stock', 'स्टॉक समाप्त')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{product.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {product.tags?.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>{tx('Seller', 'विक्रेता')}: {product.seller}</div>
                    <div>{tx('Ship from', 'जहां से भेजा जाएगा')}: {product.location}</div>
                    <div>MOQ: {product.moq ?? 1}</div>
                    <div>{tx('Lead time', 'लीड टाइम')}: {product.leadTimeDays ?? 1} {tx('days', 'दिन')}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">
                      {product.currency} {product.price.toLocaleString()} / {product.unit}
                    </p>
                    <Button
                      size="sm"
                      disabled={!product.inStock || (product.stockQuantity ?? 0) <= 0}
                      onClick={() => {
                        if (!product.inStock || (product.stockQuantity ?? 0) <= 0) return;
                        addToCart({
                          name: product.name,
                          price: product.price,
                          image: product.imageHint || '',
                          description: product.description,
                        });
                        toast({ title: tx('Added', 'जोड़ दिया गया'), description: `${product.name} ${tx('added to dispatch basket.', 'डिस्पैच बास्केट में जोड़ दिया गया।')}` });
                      }}
                    >
                      <ShoppingCart className="mr-1 h-3.5 w-3.5" />
                      {product.inStock && (product.stockQuantity ?? 0) > 0 ? tx('Add to cart', 'कार्ट में जोड़ें') : tx('Unavailable', 'उपलब्ध नहीं')}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-white/60">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                {tx('Farmer Listings', 'किसान लिस्टिंग')}
              </CardTitle>
              <CardDescription>{tx('Buyer-facing lots with pricing range, grade, and dispatch readiness.', 'कीमत दायरा, ग्रेड और डिस्पैच तैयारी वाले खरीदार-उन्मुख लॉट।')}</CardDescription>
            </div>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              {tx('New Lot', 'नया लॉट')}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredListings.map((listing) => (
              <div key={listing.id} className="rounded-[24px] border bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{listing.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {listing.farmerName} · {listing.location}
                    </p>
                  </div>
                  <Badge variant={listing.status === 'active' ? 'default' : 'secondary'}>{listing.status}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>{tx('Commodity', 'कमोडिटी')}: {listing.commodity || listing.name}</div>
                  <div>{tx('Grade', 'ग्रेड')}: {listing.grade || 'FAQ'}</div>
                  <div>{tx('Quantity', 'मात्रा')}: {(listing.quantity ?? 0).toLocaleString()} MT</div>
                  <div>{tx('Moisture', 'नमी')}: {listing.moisture ?? 11}%</div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{listing.description}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">
                      INR {listing.price.toLocaleString()} {listing.unit}
                    </p>
                    {(listing.priceFloor || listing.priceCeiling) && (
                      <p className="text-xs text-muted-foreground">
                        {tx('Range', 'दायरा')}: INR {(listing.priceFloor ?? listing.price).toLocaleString()} - INR {(listing.priceCeiling ?? listing.price).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline">{listing.pricingMode || 'fixed'}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{listing.buyerInterestCount ?? 0} {tx('buyer interests tracked', 'खरीदार रुचियां ट्रैक की गईं')}</span>
                  <Link href="/buyers" className="font-medium text-primary">
                    {tx('Open buyer directory', 'खरीदार डायरेक्टरी खोलें')}
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>List New Produce</DialogTitle>
            <DialogDescription>Add a produce listing to the marketplace.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Lot Name</Label>
              <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Commodity</Label>
                <Input value={form.commodity} onChange={(event) => setForm((prev) => ({ ...prev, commodity: event.target.value }))} />
              </div>
              <div>
                <Label>Price (INR)</Label>
                <Input value={form.price} onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantity (MT)</Label>
                <Input value={form.quantity} onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))} />
              </div>
              <div>
                <Label>Grade</Label>
                <Input value={form.grade} onChange={(event) => setForm((prev) => ({ ...prev, grade: event.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Select value={form.location} onValueChange={(value) => setForm((prev) => ({ ...prev, location: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a city" />
                </SelectTrigger>
                <SelectContent>
                  {locationOptions.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.desc} onChange={(event) => setForm((prev) => ({ ...prev, desc: event.target.value }))} />
            </div>
            <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              <ImagePlus className="mr-1 inline h-4 w-4" />
              Image hint is generated automatically from the commodity for now.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const response = await fetch('/api/marketplace/listings', {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: form.name,
                    commodity: form.commodity,
                    farmerName: user?.name || 'Farmer',
                    description: form.desc,
                    imageHint: `${form.commodity.toLowerCase()} farm harvest`,
                    price: Number(form.price || 0),
                    unit: 'INR/quintal',
                    location: form.location,
                    quantity: Number(form.quantity || 0),
                    grade: form.grade,
                    pricingMode: 'negotiable',
                    priceFloor: Math.max(0, Number(form.price || 0) - 75),
                    priceCeiling: Number(form.price || 0) + 120,
                    moisture: 11,
                  }),
                });
                const payload = await response.json();
                if (payload.success) {
                  setListings((prev) => [payload.data as FarmerListing, ...prev]);
                  setForm({ name: '', commodity: 'Maize', price: '', quantity: '', grade: 'FAQ', desc: '', location: 'Pune' });
                  toast({ title: 'Published', description: 'Listing saved successfully.' });
                } else {
                  toast({ title: 'Failed', description: payload.error || 'Unable to save listing.' });
                }
                setOpen(false);
              }}
            >
              <Tags className="mr-1 h-4 w-4" />
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
