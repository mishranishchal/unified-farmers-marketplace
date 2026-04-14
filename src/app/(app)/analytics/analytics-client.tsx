'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/context/language-context';
import { BarChart2, Cloud, CloudRain, Download, FileText, LineChart, Sun, Wind } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ResponsiveContainer,
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Bar,
  Line as RechartsLine,
  LineChart as RechartsLineChart,
  BarChart as RechartsBarChart,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

type Snapshot = {
  weather: {
    city: string;
    current: { temp: number; condition: string; wind: string };
    forecast: Array<{ day: string; temp: number; condition: string; wind: string }>;
  };
  yieldData: Array<Record<string, string | number>>;
  spendingData: Array<{ month: string; seeds: number; fertilizers: number; agrochemicals: number }>;
  revenueForecastData: Array<{ month: string; revenue: number }>;
  reports: Array<{ id: string; name: string; description: string }>;
  roleMix: Array<{ role: string; count: number }>;
  shipmentStatus: Array<{ status: string; count: number }>;
  fieldSignals: Array<{ id: string; city: string; reportType: string; commodity: string; summary: string; rewardAmount: number; status: string }>;
  trustMetrics: { verifiedProfiles: number; pendingProfiles: number; unreadNotifications: number };
};

type Insight = {
  headline: string;
  bullets: string[];
  recommendation: string;
  source: 'gemini' | 'fallback';
};

type AnalyticsClientProps = {
  snapshot: Snapshot;
};

const yieldChartConfig = {
  maize: { label: 'Maize', color: 'hsl(var(--primary))' },
  wheat: { label: 'Wheat', color: 'hsl(var(--chart-1))' },
  soybean: { label: 'Soybean', color: 'hsl(var(--chart-2))' },
  paddy: { label: 'Paddy', color: 'hsl(var(--chart-3))' },
  cotton: { label: 'Cotton', color: 'hsl(var(--chart-4))' },
} satisfies ChartConfig;

const spendingChartConfig = {
  seeds: { label: 'Seeds', color: 'hsl(var(--chart-1))' },
  fertilizers: { label: 'Fertilizers', color: 'hsl(var(--chart-2))' },
  agrochemicals: { label: 'Agrochemicals', color: 'hsl(var(--chart-3))' },
} satisfies ChartConfig;

const revenueChartConfig = {
  revenue: { label: 'Revenue', color: 'hsl(var(--primary))' },
} satisfies ChartConfig;

function WeatherIcon({ condition, className }: { condition: string; className?: string }) {
  if (condition.toLowerCase().includes('rain')) return <CloudRain className={className} />;
  if (condition.toLowerCase().includes('cloud')) return <Cloud className={className} />;
  return <Sun className={className} />;
}

export default function AnalyticsClient({ snapshot: initialSnapshot }: AnalyticsClientProps) {
  const { tx } = useLanguage();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [weather, setWeather] = useState(initialSnapshot.weather);
  const [insight, setInsight] = useState<Insight | null>(null);
  const yieldKeys = useMemo(() => Object.keys(snapshot.yieldData[0] ?? {}).filter((key) => key !== 'season'), [snapshot.yieldData]);

  const exportSnapshot = () => {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'analytics-snapshot.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/analytics/overview', { credentials: 'include', cache: 'no-store' });
        const payload = await response.json();
        if (payload.success) {
          setSnapshot(payload.data.snapshot as Snapshot);
          setWeather((payload.data.snapshot as Snapshot).weather);
          setInsight(payload.data.insight as Insight);
        }
      } catch {
        // Keep server snapshot if live refresh fails.
      }
    };
    void load();
    const interval = window.setInterval(load, 60000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold font-headline">{tx('Analytics & Reporting', 'एनालिटिक्स और रिपोर्टिंग')}</h1>
            <p className="text-muted-foreground">
              {tx(
                'Operational analytics generated from trust, marketplace, payment, shipment, field-report, and advisory records.',
                'ट्रस्ट, मार्केटप्लेस, पेमेंट, शिपमेंट, फील्ड-रिपोर्ट और एडवाइजरी रिकॉर्ड से उत्पन्न ऑपरेशनल एनालिटिक्स।'
              )}
            </p>
          </div>
          <Button onClick={exportSnapshot}>
            <Download className="mr-2 h-4 w-4" />
            {tx('Export snapshot', 'स्नैपशॉट एक्सपोर्ट')}
          </Button>
        </div>
      </header>

      {insight && (
        <Card className="bg-white/55">
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white/55">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{tx('Verified profiles', 'सत्यापित प्रोफाइल')}</p>
            <p className="text-2xl font-bold">{snapshot.trustMetrics.verifiedProfiles}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/55">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{tx('Pending trust reviews', 'लंबित ट्रस्ट समीक्षा')}</p>
            <p className="text-2xl font-bold">{snapshot.trustMetrics.pendingProfiles}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/55">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{tx('Unread operations alerts', 'अनरीड ऑपरेशन अलर्ट')}</p>
            <p className="text-2xl font-bold">{snapshot.trustMetrics.unreadNotifications}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sun className="text-primary" /> Weather Outlook</CardTitle>
            <CardDescription>Shared operational weather snapshot for {weather.city}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-secondary p-4">
              <div>
                <p className="text-sm">Now</p>
                <p className="text-4xl font-bold">{weather.current.temp}°C</p>
                <p className="text-muted-foreground">{weather.current.condition}</p>
              </div>
              <div className="flex flex-col items-center">
                <WeatherIcon condition={weather.current.condition} className="h-12 w-12 text-primary" />
                <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                  <Wind className="h-4 w-4" /> {weather.current.wind}
                </div>
              </div>
            </div>
            <div className="flex justify-between gap-2">
              {weather.forecast.map((day) => (
                <div key={day.day} className="flex flex-col items-center gap-1 text-center">
                  <p className="text-sm font-semibold">{day.day}</p>
                  <WeatherIcon condition={day.condition} className="h-8 w-8 text-muted-foreground" />
                  <p className="text-lg font-bold">{day.temp}°</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart2 className="text-primary" /> Yield Pressure by Crop Group</CardTitle>
            <CardDescription>Estimated output signal derived from active lots and mandi pricing activity.</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ChartContainer config={yieldChartConfig} className="h-full w-full">
              <RechartsBarChart data={snapshot.yieldData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="season" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <ChartTooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
                <Legend />
                {yieldKeys.map((key) => (
                  <Bar key={key} dataKey={key} fill={`var(--color-${key})`} radius={[4, 4, 0, 0]} />
                ))}
              </RechartsBarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LineChart className="text-primary" /> Input Spend Analysis (INR)</CardTitle>
            <CardDescription>Estimated spend curve from live inventory and operational activity.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ChartContainer config={spendingChartConfig} className="h-full w-full">
              <RechartsAreaChart data={snapshot.spendingData} accessibilityLayer>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Area type="monotone" dataKey="seeds" fill="var(--color-seeds)" fillOpacity={0.4} stroke="var(--color-seeds)" stackId="1" />
                <Area type="monotone" dataKey="fertilizers" fill="var(--color-fertilizers)" fillOpacity={0.4} stroke="var(--color-fertilizers)" stackId="1" />
                <Area type="monotone" dataKey="agrochemicals" fill="var(--color-agrochemicals)" fillOpacity={0.4} stroke="var(--color-agrochemicals)" stackId="1" />
              </RechartsAreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LineChart className="text-primary" /> Revenue Forecast (INR)</CardTitle>
            <CardDescription>Forecast curve derived from tracked order and settlement volume.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ChartContainer config={revenueChartConfig} className="h-full w-full">
              <RechartsLineChart data={snapshot.revenueForecastData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${(Number(value) / 1000000).toFixed(1)}M`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <RechartsLine type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
              </RechartsLineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{tx('Role distribution', 'रोल वितरण')}</CardTitle>
            <CardDescription>{tx('How current verified workspaces are distributed.', 'वर्तमान सत्यापित वर्कस्पेस कैसे वितरित हैं।')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tx('Role', 'रोल')}</TableHead>
                  <TableHead className="text-right">{tx('Count', 'संख्या')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.roleMix.map((item) => (
                  <TableRow key={item.role}>
                    <TableCell>{item.role}</TableCell>
                    <TableCell className="text-right">{item.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{tx('Shipment status feed', 'शिपमेंट स्थिति फ़ीड')}</CardTitle>
            <CardDescription>{tx('Tracking counts by logistics state.', 'लॉजिस्टिक्स स्थिति के अनुसार ट्रैकिंग संख्या।')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tx('Status', 'स्थिति')}</TableHead>
                  <TableHead className="text-right">{tx('Count', 'संख्या')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.shipmentStatus.map((item) => (
                  <TableRow key={item.status}>
                    <TableCell>{item.status}</TableCell>
                    <TableCell className="text-right">{item.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{tx('Farmer intelligence feed', 'किसान इंटेलिजेंस फ़ीड')}</CardTitle>
          <CardDescription>{tx('These signals come from farmer-submitted mandi, weather, and crop updates.', 'ये सिग्नल किसान द्वारा सबमिट किए गए मंडी, मौसम और फसल अपडेट से आते हैं।')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tx('City', 'शहर')}</TableHead>
                <TableHead>{tx('Type', 'प्रकार')}</TableHead>
                <TableHead>{tx('Summary', 'सार')}</TableHead>
                <TableHead className="text-right">{tx('Reward', 'रिवॉर्ड')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshot.fieldSignals.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>{report.city}</TableCell>
                  <TableCell>{report.reportType}</TableCell>
                  <TableCell className="text-muted-foreground">{report.summary}</TableCell>
                  <TableCell className="text-right">INR {report.rewardAmount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tx('Automated reports', 'ऑटोमेटेड रिपोर्ट')}</CardTitle>
          <CardDescription>{tx('Report descriptors now reflect actual tracked platform records.', 'रिपोर्ट विवरण अब वास्तविक ट्रैक किए गए प्लेटफॉर्म रिकॉर्ड दिखाते हैं।')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshot.reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-semibold">{report.name}</TableCell>
                  <TableCell className="text-muted-foreground">{report.description}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" onClick={exportSnapshot}><Download className="mr-2" /> {tx('Export', 'एक्सपोर्ट')}</Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-semibold">{tx('Activity log digest', 'एक्टिविटी लॉग डाइजेस्ट')}</TableCell>
                <TableCell className="text-muted-foreground">{tx('Uses the same live dataset shown across market, finance, advisory, and trust modules.', 'मार्केट, फाइनेंस, एडवाइजरी और ट्रस्ट मॉड्यूल में दिखाए गए उसी लाइव डेटासेट का उपयोग करता है।')}</TableCell>
                <TableCell className="text-right">
                  <Button onClick={exportSnapshot}><FileText className="mr-2" /> {tx('Generate', 'जेनरेट')}</Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
