'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BellRing,
  CandlestickChart,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { predictAction } from './actions';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { CommodityPrice } from '@/lib/types';
import { useLanguage } from '@/context/language-context';

const PricePredictor = dynamic(() => import('@/components/price-predictor'), {
  loading: () => (
    <Card>
      <CardHeader>
        <CardTitle>AI Price Forecast</CardTitle>
        <CardDescription>Loading forecast module...</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[320px] animate-pulse rounded-xl bg-slate-100" />
      </CardContent>
    </Card>
  ),
});

type PricesClientProps = {
  initialRows: CommodityPrice[];
  locationOptions: string[];
  commodityOptions: string[];
};

export default function PricesClient({ initialRows, locationOptions, commodityOptions }: PricesClientProps) {
  const { toast } = useToast();
  const { tx } = useLanguage();
  const [rows] = useState<CommodityPrice[]>(initialRows);
  const [selected, setSelected] = useState<CommodityPrice | null>(null);
  const [targetPrice, setTargetPrice] = useState('');

  const stats = useMemo(() => {
    const up = rows.filter((row) => row.trend === 'up').length;
    const down = rows.filter((row) => row.trend === 'down').length;
    const avg = rows.length ? rows.reduce((sum, row) => sum + row.changePct, 0) / rows.length : 0;
    return { up, down, avg };
  }, [rows]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-slate-950 p-6 text-white">
        <Badge className="mb-2 bg-white/20 text-white">{tx('Market Prices', 'बाजार भाव')}</Badge>
        <h1 className="text-3xl font-bold">{tx('Live Commodity Prices', 'लाइव कमोडिटी प्राइस')}</h1>
        <p className="mt-1 text-sm text-white/70">{tx('Track mandi signals, heuristic price discovery, and AI forecasts.', 'मंडी संकेत, हीयूरिस्टिक प्राइस डिस्कवरी और एआई फोरकास्ट ट्रैक करें।')}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Bullish Symbols</p>
            <p className="flex items-center gap-2 text-2xl font-bold">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              {stats.up}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Bearish Symbols</p>
            <p className="flex items-center gap-2 text-2xl font-bold">
              <TrendingDown className="h-5 w-5 text-rose-500" />
              {stats.down}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Market Momentum</p>
            <p className="text-2xl font-bold">{stats.avg.toFixed(2)}%</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CandlestickChart className="h-4 w-4" />
              Price Table
            </CardTitle>
            <CardDescription>Click any row to create a price alert.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {rows.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(item)}
                className="w-full rounded-lg border px-3 py-3 text-left transition hover:bg-slate-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{item.commodity}</p>
                    <p className="text-xs text-muted-foreground">{item.market}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {item.price.toLocaleString()} <span className="text-xs text-muted-foreground">{item.unit}</span>
                    </p>
                    <p className="flex items-center justify-end gap-1 text-xs">
                      {item.trend === 'up' && <ArrowUpRight className="h-3 w-3 text-emerald-600" />}
                      {item.trend === 'down' && <ArrowDownRight className="h-3 w-3 text-rose-600" />}
                      <span className={item.trend === 'down' ? 'text-rose-600' : 'text-emerald-600'}>{item.changePct}%</span>
                    </p>
                    {item.heuristicSuggestedPrice != null && (
                      <p className="mt-1 text-[11px] text-amber-700">
                        {tx('Suggested', 'सुझाव')}: INR {item.heuristicSuggestedPrice.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground md:grid-cols-4">
                  <div>MSP: INR {(item.baseMsp ?? 0).toLocaleString()}</div>
                  <div>Dlocal: {(item.localDemandIndex ?? 0).toFixed(2)}</div>
                  <div>Slocal: {(item.localSupplySaturationIndex ?? 0).toFixed(2)}</div>
                  <div>a/b: {(item.alpha ?? 0).toFixed(2)} / {(item.beta ?? 0).toFixed(2)}</div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <PricePredictor predictAction={predictAction} locationOptions={locationOptions} commodityOptions={commodityOptions} />
      </section>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tx('Create Price Alert', 'प्राइस अलर्ट बनाएं')}</DialogTitle>
            <DialogDescription>
              {selected?.commodity} at {selected?.market}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{tx('You will be notified when this commodity crosses your target range.', 'जब यह कमोडिटी आपके टारगेट रेंज को पार करेगी तब आपको सूचना मिलेगी।')}</p>
            <Input type="number" value={targetPrice} onChange={(event) => setTargetPrice(event.target.value)} placeholder="Enter target price" />
            {selected?.heuristicSuggestedPrice != null && (
              <div className="rounded-lg border bg-secondary/40 p-3 text-sm">
                <p>{tx('Heuristic suggestion', 'हीयूरिस्टिक सुझाव')}: INR {selected.heuristicSuggestedPrice.toLocaleString()}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!selected || !targetPrice) return;
                const response = await fetch('/api/price-alerts', {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    commodity: selected.commodity,
                    market: selected.market,
                    currentPrice: selected.price,
                    targetPrice: Number(targetPrice),
                  }),
                });
                const payload = await response.json();
                if (!response.ok || !payload.success) {
                  toast({ variant: 'destructive', title: 'Failed', description: payload.error || 'Unable to save alert.' });
                  return;
                }
                toast({ title: 'Alert saved', description: `${selected.commodity} alert created.` });
                setTargetPrice('');
                setSelected(null);
              }}
            >
              <BellRing className="mr-2 h-4 w-4" />
              Save Alert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
