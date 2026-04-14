'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowUpRight, BadgeCheck, Bot, Gauge, Globe2, Leaf, Route, Sparkles, Target, TrendingUp, Warehouse } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/context/language-context';

type Snapshot = {
  missionCards: Array<{ title: string; href: string; meta: string }>;
  alerts: string[];
  aiUpdates: string[];
  rolePulse: { trustReady: number; unreadNotifications: number; shipmentBacklog: number };
  trustQueue: { pendingForms: number; verifiedProfiles: number; newFieldReports: number };
  fieldSignals: Array<{
    id: string;
    city: string;
    reportType: string;
    commodity: string;
    summary: string;
    rewardAmount: number;
    status: string;
    reportedPrice?: number;
    weatherCondition?: string;
  }>;
  shipmentMoments: Array<{
    id: string;
    orderId: string;
    status: string;
    routeCode: string;
    destination: string;
    checkpoint: string;
    etaHours: number;
    deliveryVerified: boolean;
  }>;
  coverageDistricts: number;
  tradePipelineValue: number;
  aiInferences: number;
  completedSettlements: number;
};

type Insight = {
  headline: string;
  bullets: string[];
  recommendation: string;
  source: 'gemini' | 'fallback';
};

type DashboardClientContentProps = {
  user: { name: string; role: 'user' | 'buyer' | 'admin' } | null;
  snapshot: Snapshot;
};

const missionCardsMeta = [
  { title: 'Market Prices', href: '/prices', icon: TrendingUp, color: 'bg-cyan-100 text-cyan-700' },
  { title: 'Marketplace', href: '/marketplace', icon: Warehouse, color: 'bg-emerald-100 text-emerald-700' },
  { title: 'AI Agronomist', href: '/agronomist', icon: Bot, color: 'bg-violet-100 text-violet-700' },
  { title: 'Buyers', href: '/buyers', icon: BadgeCheck, color: 'bg-amber-100 text-amber-700' },
];

export default function DashboardClientContent({ user, snapshot: initialSnapshot }: DashboardClientContentProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [insight, setInsight] = useState<Insight | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState('');
  const { tx } = useLanguage();
  const roleLabel = user?.role === 'buyer' ? tx('Buyer', 'खरीदार') : user?.role === 'admin' ? tx('Admin', 'एडमिन') : tx('Farmer', 'किसान');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/dashboard/overview', { credentials: 'include', cache: 'no-store' });
        const payload = await response.json();
        if (payload.success) {
          setSnapshot(payload.data.snapshot as Snapshot);
          setInsight(payload.data.insight as Insight);
        }
      } catch {
        // Keep server snapshot when refresh fails.
      }
    };
    void load();
    const interval = window.setInterval(load, 60000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-gradient-to-r from-slate-950 via-cyan-950 to-emerald-900 p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge className="mb-2 bg-white/20 text-white">{roleLabel}</Badge>
            <h1 className="text-2xl font-bold md:text-3xl">{tx('Welcome,', 'स्वागत है,')} {user?.name?.split(' ')[0] ?? tx('Farmer', 'किसान')}</h1>
            <p className="mt-1 text-sm text-white/80">
              {tx(
                'This workspace now updates from dashboard APIs, trust reviews, field intelligence, shipments, and live trade signals.',
                'यह वर्कस्पेस अब डैशबोर्ड एपीआई, ट्रस्ट रिव्यू, फील्ड इंटेलिजेंस, शिपमेंट और लाइव ट्रेड सिग्नल से अपडेट होता है।'
              )}
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="rounded-lg bg-white/10 p-3">
              <p className="text-white/70">{tx('System status', 'सिस्टम स्थिति')}</p>
              <p className="font-semibold flex items-center gap-1">
                <Gauge className="h-4 w-4" />
                {tx('Active', 'सक्रिय')}
              </p>
            </div>
            <div className="rounded-lg bg-white/10 p-3">
              <p className="text-white/70">{tx('Trust queue', 'ट्रस्ट क्यू')}</p>
              <p className="font-semibold">{snapshot.trustQueue.pendingForms}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {snapshot.missionCards.map((item) => {
          const meta = missionCardsMeta.find((candidate) => candidate.href === item.href) ?? missionCardsMeta[0];
          return (
            <Link key={item.title} href={item.href} prefetch className="rounded-xl border bg-white p-4 transition hover:shadow-md">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${meta.color}`}>
                <meta.icon className="h-5 w-5" />
              </div>
              <p className="mt-3 font-semibold">{item.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white/55">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{tx('Trust-ready profiles', 'ट्रस्ट-रेडी प्रोफाइल')}</p>
            <p className="text-2xl font-bold">{snapshot.rolePulse.trustReady}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/55">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{tx('Unread alerts', 'अनरीड अलर्ट')}</p>
            <p className="text-2xl font-bold">{snapshot.rolePulse.unreadNotifications}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/55">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{tx('Open shipments', 'खुले शिपमेंट')}</p>
            <p className="text-2xl font-bold">{snapshot.rolePulse.shipmentBacklog}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              {tx('Farmer Signal Feed', 'किसान सिग्नल फ़ीड')}
            </CardTitle>
            <CardDescription>
              {tx('Verified field reports now push mandi, weather, and crop observations into the dashboard.', 'सत्यापित फील्ड रिपोर्ट अब मंडी, मौसम और फसल ऑब्जर्वेशन को डैशबोर्ड में पुश करती हैं।')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.fieldSignals.map((signal) => (
              <div key={signal.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{signal.city} · {signal.reportType}</p>
                  <Badge variant={signal.status === 'verified' ? 'default' : 'secondary'}>{signal.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{signal.commodity}</p>
                <p className="mt-2 text-sm text-muted-foreground">{signal.summary}</p>
                <p className="mt-2 text-xs text-emerald-700">
                  {signal.reportedPrice ? `INR ${signal.reportedPrice}/quintal` : signal.weatherCondition || 'Community insight'} · reward INR {signal.rewardAmount}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                {tx('AI operations digest', 'एआई ऑपरेशंस डाइजेस्ट')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {insight ? (
                <>
                  {insight.bullets.map((item) => (
                    <div key={item} className="rounded-lg border p-3">
                      <p className="font-medium">{item}</p>
                    </div>
                  ))}
                  <p className="text-muted-foreground">{insight.recommendation}</p>
                </>
              ) : (
                snapshot.aiUpdates.map((item, index) => (
                  <div key={item} className="rounded-lg border p-3">
                    <p className="font-medium flex items-center gap-2">
                      {index === 0 ? <Leaf className="h-4 w-4 text-emerald-500" /> : <Sparkles className="h-4 w-4 text-cyan-500" />}
                      {item}
                    </p>
                  </div>
                ))
              )}
              <Button asChild className="w-full">
                <Link href="/ai-advisory" prefetch>
                  {tx('Open AI Advisory', 'एआई सलाह खोलें')}
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                {tx('Alerts', 'अलर्ट')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {snapshot.alerts.map((item) => (
                <button
                  key={item}
                  className="w-full rounded-lg border px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => {
                    setSelectedAlert(item);
                    setOpen(true);
                  }}
                >
                  {item}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-4 w-4" />
              {tx('Shipment timeline', 'शिपमेंट टाइमलाइन')}
            </CardTitle>
            <CardDescription>{tx('Tracking now uses route codes and checkpoint histories from actual shipment records.', 'ट्रैकिंग अब वास्तविक शिपमेंट रिकॉर्ड के रूट कोड और चेकपॉइंट हिस्ट्री का उपयोग करती है।')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.shipmentMoments.map((shipment) => (
              <div key={shipment.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{shipment.id} · {shipment.routeCode}</p>
                  <Badge variant={shipment.deliveryVerified ? 'default' : 'secondary'}>{shipment.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{shipment.orderId} · {shipment.destination}</p>
                <p className="mt-2 text-sm text-muted-foreground">{shipment.checkpoint}</p>
                <p className="mt-2 text-xs text-emerald-700">ETA {shipment.etaHours}h {shipment.deliveryVerified ? '· delivery acknowledged' : ''}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{tx('Trust pulse', 'ट्रस्ट पल्स')}</CardTitle>
            <CardDescription>{tx('How quickly verification and reporting are moving.', 'वेरिफिकेशन और रिपोर्टिंग कितनी जल्दी आगे बढ़ रही है।')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground">{tx('Pending forms', 'लंबित फॉर्म')}</p>
              <p className="text-2xl font-bold">{snapshot.trustQueue.pendingForms}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground">{tx('Verified profiles', 'सत्यापित प्रोफाइल')}</p>
              <p className="text-2xl font-bold">{snapshot.trustQueue.verifiedProfiles}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground">{tx('New field reports', 'नई फील्ड रिपोर्ट')}</p>
              <p className="text-2xl font-bold">{snapshot.trustQueue.newFieldReports}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{tx('Coverage', 'कवरेज')}</p>
            <p className="text-2xl font-bold">{snapshot.coverageDistricts} Districts</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Globe2 className="h-3 w-3" />
              Active service coverage
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{tx('Trade pipeline', 'ट्रेड पाइपलाइन')}</p>
            <p className="text-2xl font-bold">INR {(snapshot.tradePipelineValue / 10000000).toFixed(2)} Cr</p>
            <p className="mt-1 text-xs text-emerald-600">{snapshot.completedSettlements} completed finance settlements tracked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{tx('AI inferences', 'एआई अनुमान')}</p>
            <p className="text-2xl font-bold">{snapshot.aiInferences.toLocaleString()}</p>
            <p className="mt-1 text-xs text-muted-foreground">Crop, disease, soil, and pricing models</p>
          </CardContent>
        </Card>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tx('Alert details', 'अलर्ट विवरण')}</DialogTitle>
            <DialogDescription>{selectedAlert}</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{tx('You can ignore this alert or escalate it to admin.', 'आप इस अलर्ट को अनदेखा कर सकते हैं या एडमिन तक बढ़ा सकते हैं।')}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {tx('Close', 'बंद करें')}
            </Button>
            <Button onClick={() => setOpen(false)}>{tx('Escalate', 'एस्केलेट')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
