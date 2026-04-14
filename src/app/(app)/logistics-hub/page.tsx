import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { CheckCircle2, Clock3, MapPin, Route, Truck, ShieldCheck } from 'lucide-react';
import { buildDispatchQueue, buildWeatherOutlook } from '@/lib/server/platform-data';
import { platformStore } from '@/lib/server/store';
import { requireSessionUser } from '@/lib/server/auth';

export default async function LogisticsHubPage() {
  const user = await requireSessionUser();
  const [listings, buyers, shipments] = await Promise.all([
    platformStore.listListings(),
    platformStore.listBuyers(),
    platformStore.listShipments(user.role === 'admin' ? undefined : user.email),
  ]);
  const dispatchItems = buildDispatchQueue({ listings, buyers });
  const weather = buildWeatherOutlook();
  const delayedRoutes = weather.filter((item) => item.rainfallMm >= 15).length;

  return (
    <div className="flex flex-col gap-8">
      <header className="brand-panel p-6">
        <Badge className="mb-3 bg-primary text-primary-foreground">Operations Workspace</Badge>
        <h1 className="text-3xl font-bold font-headline">Smart Logistics Hub</h1>
        <p className="mt-2 text-muted-foreground">
          Dispatch planning now reads from marketplace lots and buyer destinations instead of a fixed transport simulation.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="brand-glass">
          <CardContent className="p-4">
            <Truck className="h-5 w-5 text-primary" />
            <p className="mt-2 font-semibold">Vehicle Allocation</p>
            <p className="text-xs text-muted-foreground">{dispatchItems.filter((item) => item.status === 'Ready').length} lots are ready for allocation.</p>
          </CardContent>
        </Card>
        <Card className="brand-glass">
          <CardContent className="p-4">
            <Route className="h-5 w-5 text-primary" />
            <p className="mt-2 font-semibold">Route Suggestion</p>
            <p className="text-xs text-muted-foreground">{shipments.length} tracked shipments are currently visible.</p>
          </CardContent>
        </Card>
        <Card className="brand-glass">
          <CardContent className="p-4">
            <Clock3 className="h-5 w-5 text-primary" />
            <p className="mt-2 font-semibold">Delay Alerts</p>
            <p className="text-xs text-muted-foreground">{delayedRoutes} district routes may need rain-related intervention.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="brand-panel">
        <CardHeader>
          <CardTitle>Dispatch Queue</CardTitle>
          <CardDescription>Live queue synthesized from active lots, verified buyers, and district-level weather outlook.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {dispatchItems.map((row) => (
            <div key={row.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="font-medium">{row.id}</span>
                <Badge variant="secondary">{row.status}</Badge>
              </div>
              <div className="text-sm">
                <p className="font-medium">{row.commodity}</p>
                <p className="text-muted-foreground">{row.quantity} MT for {row.buyerName}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {row.source} to {row.destination}
              </div>
              <div className="text-sm font-medium">ETA: {row.etaHours}h</div>
              <Button asChild variant="outline" size="sm"><Link href="#tracked-shipments">Track</Link></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="brand-panel" id="tracked-shipments">
        <CardHeader>
          <CardTitle>Tracked Shipments</CardTitle>
          <CardDescription>Shipment records now carry route code, checkpoint history, and verified receipt state.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {shipments.map((shipment) => (
            <div key={shipment.id} className="rounded-lg border p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium">{shipment.id}</p>
                  <p className="text-xs text-muted-foreground">
                    {shipment.orderId} · {shipment.courier} · {shipment.routeCode ?? 'Route pending'} · {shipment.vehicleId ?? 'Vehicle pending'}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">{shipment.lastCheckpoint}</div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{shipment.status}</Badge>
                  {shipment.deliveryVerified && (
                    <Badge className="bg-emerald-600 text-white">
                      <ShieldCheck className="mr-1 h-3 w-3" />
                      Verified delivery
                    </Badge>
                  )}
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/profile">Open shipment record</Link>
                </Button>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {(shipment.checkpoints ?? []).slice(0, 4).map((checkpoint) => (
                  <div key={`${shipment.id}-${checkpoint.updatedAt}`} className="rounded-lg bg-muted/50 p-3 text-sm">
                    <p className="font-medium">{checkpoint.status.replace(/_/g, ' ')}</p>
                    <p className="text-muted-foreground">{checkpoint.note}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{checkpoint.location} · {new Date(checkpoint.updatedAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>ETA {shipment.etaHours}h</span>
                {shipment.acknowledgedAt && <span>Received on {new Date(shipment.acknowledgedAt).toLocaleString()}</span>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
