import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Briefcase, Calculator, Shield, Tractor, TrendingUp, Users, Wallet } from 'lucide-react';
import { platformStore } from '@/lib/server/store';
import { buildWeatherOutlook } from '@/lib/server/platform-data';
import { explainPriceDiscovery } from '@/lib/server/pricing';

export default async function AiAdvisoryPage() {
  const [listings, buyers, prices, posts, buyerInteractions, loans] = await Promise.all([
    platformStore.listListings(),
    platformStore.listBuyers(),
    platformStore.listPrices(),
    platformStore.listPosts(),
    platformStore.listBuyerInteractions(),
    platformStore.listLoanApplications(),
  ]);

  const weather = buildWeatherOutlook();
  const strongestCommodity = [...prices].sort((a, b) => b.changePct - a.changePct)[0];
  const strongestCommodityExplain = strongestCommodity ? explainPriceDiscovery(strongestCommodity) : null;
  const rainWatchDistricts = weather.filter((item) => item.rainfallMm >= 15).map((item) => item.district);
  const activeBuyerDemand = buyers.slice(0, 3).flatMap((buyer) => buyer.demand).filter((value, index, items) => items.indexOf(value) === index);

  const farmerItems = [
    `${strongestCommodity?.commodity ?? 'Maize'} is showing the strongest near-term mandi momentum in ${strongestCommodity?.market ?? 'Pune APMC'}.`,
    rainWatchDistricts.length
      ? `Rain watch districts: ${rainWatchDistricts.join(', ')}. Delay foliar sprays and protect harvested lots.`
      : 'No high-rainfall district is on watch in the current offline advisory snapshot.',
    `${listings.filter((listing) => (listing.buyerInterestCount ?? 0) >= 8).length} active lots already show strong buyer interest and are ready for negotiation.`,
  ];

  const buyerItems = [
    `${buyers.filter((buyer) => buyer.verified).length} verified buyers are available for direct sourcing across ${buyers.length} buyer profiles.`,
    `Highest active demand clusters: ${activeBuyerDemand.slice(0, 4).join(', ')}.`,
    `${buyerInteractions.filter((interaction) => interaction.status !== 'completed').length} sourcing conversations still need follow-up or scheduling.`,
  ];

  const adminItems = [
    `${posts.length} community posts are available for moderation, routing, and knowledge tagging.`,
    `${loans.filter((loan) => loan.status === 'Pending').length} finance applications remain in the review queue.`,
    `${buyers.filter((buyer) => !buyer.verified).length} buyer profiles still require verification review.`,
  ];

  return (
    <div className="flex flex-col gap-8">
      <header className="brand-panel p-6">
        <Badge className="mb-3 bg-primary text-primary-foreground">Role-Specific AI Content</Badge>
        <h1 className="text-3xl font-bold font-headline">AI Advisory Studio</h1>
        <p className="mt-2 text-muted-foreground">
          Role-based advisory blocks are now generated from live platform records instead of static placeholder copy.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="brand-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tractor className="h-5 w-5 text-primary" />
              Farmer Intelligence Stack
            </CardTitle>
            <CardDescription>Field-first guidance using current mandi, weather, and lot activity data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {farmerItems.map((item) => (
              <div key={item} className="rounded-lg border bg-card/70 p-3 text-sm">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="brand-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Buyer Intelligence Stack
            </CardTitle>
            <CardDescription>Procurement guidance built from buyer directory and negotiation activity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {buyerItems.map((item) => (
              <div key={item} className="rounded-lg border bg-card/70 p-3 text-sm">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="brand-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Admin Intelligence Stack
            </CardTitle>
            <CardDescription>Governance, moderation, and finance signals for control-room use.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {adminItems.map((item) => (
              <div key={item} className="rounded-lg border bg-card/70 p-3 text-sm">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="brand-glass">
          <CardContent className="p-4">
            <Bot className="h-5 w-5 text-primary" />
            <p className="mt-2 font-semibold">Prompt Library</p>
            <p className="text-xs text-muted-foreground">Guidance derived from live module counts and trading signals.</p>
          </CardContent>
        </Card>
        <Card className="brand-glass">
          <CardContent className="p-4">
            <Calculator className="h-5 w-5 text-primary" />
            <p className="mt-2 font-semibold">Transparent Heuristic</p>
            <p className="text-xs text-muted-foreground">Advisory explains the MSP, demand index, supply index, and resulting suggested price.</p>
          </CardContent>
        </Card>
        <Card className="brand-glass">
          <CardContent className="p-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <p className="mt-2 font-semibold">Demand Signals</p>
            <p className="text-xs text-muted-foreground">{strongestCommodity?.commodity ?? 'Maize'} is currently leading momentum.</p>
          </CardContent>
        </Card>
        <Card className="brand-glass">
          <CardContent className="p-4">
            <Wallet className="h-5 w-5 text-primary" />
            <p className="mt-2 font-semibold">Risk Signals</p>
            <p className="text-xs text-muted-foreground">{loans.filter((loan) => loan.status === 'Pending').length} pending credit reviews require attention.</p>
          </CardContent>
        </Card>
        <Card className="brand-glass">
          <CardContent className="p-4">
            <Users className="h-5 w-5 text-primary" />
            <p className="mt-2 font-semibold">Community AI</p>
            <p className="text-xs text-muted-foreground">{posts.length} posts are available for knowledge routing and moderation.</p>
          </CardContent>
        </Card>
      </div>

      {strongestCommodityExplain && (
        <Card className="brand-panel">
          <CardHeader>
            <CardTitle>How the advisory reached its pricing conclusion</CardTitle>
            <CardDescription>The crop advisory is now transparent about the heuristic price discovery inputs.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-card/70 p-4">
              <p className="font-semibold">{strongestCommodity?.commodity} in {strongestCommodity?.market}</p>
              <p className="mt-2 text-sm text-muted-foreground">{strongestCommodityExplain.formula}</p>
              <div className="mt-3 space-y-2 text-sm">
                {strongestCommodityExplain.breakdown.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </div>
            <div className="rounded-lg border bg-card/70 p-4">
              <p className="font-semibold">Interpretation trail</p>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <p>Current price momentum determines whether local demand is pulling above the MSP baseline.</p>
                <p>Arrivals and recent market congestion determine supply saturation pressure.</p>
                <p>Buyer interest, pending negotiations, and rain-watch districts then shape the final advisory.</p>
                <p>Suggested price from the heuristic model: INR {strongestCommodityExplain.suggested.toLocaleString()} per quintal.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
