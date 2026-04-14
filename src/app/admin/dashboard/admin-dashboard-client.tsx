'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Banknote, ClipboardList, ShoppingCart, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Snapshot = {
  kpis: Array<{ title: string; value: string; change: string }>;
  liveOps: { shipmentsOpen: number; trustVerified: number; fundingQueue: number };
  dispatchQueue: Array<{
    id: string;
    lot: string;
    commodity: string;
    source: string;
    destination: string;
    buyerName: string;
    quantity: number;
    etaHours: number;
    status: string;
  }>;
  trustQueue: Array<{ id: string; userName: string; role: string; submittedAt: string; proofNote: string }>;
  fieldSignals: Array<{ id: string; city: string; reportType: string; commodity: string; summary: string; rewardAmount: number; status: string }>;
  shipmentMoments: Array<{ id: string; orderId: string; status: string; routeCode: string; destination: string; checkpoint: string; etaHours: number; deliveryVerified: boolean }>;
};

type Insight = {
  headline: string;
  bullets: string[];
  recommendation: string;
  source: 'gemini' | 'fallback';
};

type AdminDashboardClientProps = {
  snapshot: Snapshot;
};

const icons = [Users, ShoppingCart, Banknote, AlertTriangle];

export default function AdminDashboardClient({ snapshot: initialSnapshot }: AdminDashboardClientProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [insight, setInsight] = useState<Insight | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/admin/trust', { credentials: 'include', cache: 'no-store' });
        const payload = await response.json();
        if (payload.success) {
          setSnapshot(payload.data.snapshot as Snapshot);
          setInsight(payload.data.insight as Insight);
        }
      } catch {
        // Keep server snapshot if refresh fails.
      }
    };
    void load();
    const interval = window.setInterval(load, 60000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <header className="brand-panel p-6">
        <h1 className="text-3xl font-bold">Farmer&apos;s Marketplace Admin Command</h1>
        <p className="mt-2 text-muted-foreground">Admin telemetry now reflects trust submissions, farmer intelligence, wallet approvals, and shipment timelines.</p>
      </header>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {snapshot.kpis.map((kpi, index) => {
          const Icon = icons[index] ?? Users;
          return (
            <Card key={kpi.title} className="brand-glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className="text-xs text-muted-foreground">{kpi.change}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="brand-glass">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Open shipments</p>
            <p className="text-2xl font-bold">{snapshot.liveOps.shipmentsOpen}</p>
          </CardContent>
        </Card>
        <Card className="brand-glass">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Trust-verified workspaces</p>
            <p className="text-2xl font-bold">{snapshot.liveOps.trustVerified}</p>
          </CardContent>
        </Card>
        <Card className="brand-glass">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Funding queue</p>
            <p className="text-2xl font-bold">{snapshot.liveOps.fundingQueue}</p>
          </CardContent>
        </Card>
      </div>

      {insight && (
        <Card className="brand-panel">
          <CardHeader>
            <CardTitle>{insight.headline}</CardTitle>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="brand-panel">
          <CardHeader>
            <CardTitle>Trust Review Queue</CardTitle>
            <CardDescription>Latest customer submissions waiting for AgriTrust approval.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.trustQueue.map((item) => (
              <div key={item.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.userName}</p>
                    <p className="text-sm text-muted-foreground">{item.role} · {new Date(item.submittedAt).toLocaleString()}</p>
                  </div>
                  <Badge variant="secondary">Pending</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{item.proofNote}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="brand-panel">
          <CardHeader>
            <CardTitle>Farmer Intelligence Feed</CardTitle>
            <CardDescription>Verified field signals now power the analytics and price surfaces.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.fieldSignals.map((item) => (
              <div key={item.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.city} · {item.reportType}</p>
                    <p className="text-sm text-muted-foreground">{item.commodity}</p>
                  </div>
                  <Badge variant={item.status === 'verified' ? 'default' : 'secondary'}>{item.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{item.summary}</p>
                <p className="mt-2 text-xs text-emerald-700">Reward value INR {item.rewardAmount}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="brand-panel">
          <CardHeader>
            <CardTitle>Shipment Timeline</CardTitle>
            <CardDescription>Track route codes, checkpoints, ETAs, and verified delivery receipts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.shipmentMoments.map((item) => (
              <div key={item.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.id} · {item.routeCode}</p>
                    <p className="text-sm text-muted-foreground">{item.orderId} · {item.destination}</p>
                  </div>
                  <Badge variant={item.deliveryVerified ? 'default' : 'secondary'}>{item.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{item.checkpoint}</p>
                <p className="mt-2 text-xs text-muted-foreground">ETA {item.etaHours}h {item.deliveryVerified ? '· acknowledged' : ''}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="brand-panel">
          <CardHeader>
            <CardTitle>Dispatch Tracking</CardTitle>
            <CardDescription>Dispatch queue from active lots, verified buyers, and shipment flow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.dispatchQueue.map((item) => (
              <div key={item.id} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[auto_1fr_auto] md:items-center">
                <div>
                  <p className="font-medium">{item.id}</p>
                  <Badge variant="secondary">{item.status}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{item.commodity} · {item.quantity} MT</p>
                  {item.source} to {item.destination} · {item.buyerName}
                </div>
                <div className="text-sm font-medium">ETA {item.etaHours}h</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
