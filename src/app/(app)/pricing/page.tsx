'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';

const freeFeatures = [
  'Unlimited AI crop advisory and disease assistance',
  'Unlimited price forecasting and mandi trend analysis',
  'Full buyer network access and negotiation workspace',
  'Soil quality prediction and crop detection modules',
  'Admin command dashboard, analytics, and reporting',
];

export default function PricingPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="brand-panel p-6 text-center">
        <Badge className="mb-3 bg-primary text-primary-foreground">Free Access Policy</Badge>
        <h1 className="text-4xl font-bold font-headline">All Features Are Free</h1>
        <p className="text-muted-foreground mt-2">
          This project has no paid plans, no upgrades, and no credit restrictions. Every module is unlocked for farmers, buyers, and admins.
        </p>
      </header>

      <Card className="brand-panel max-w-4xl mx-auto w-full">
        <CardHeader>
          <CardTitle>Included at Zero Cost</CardTitle>
          <CardDescription>Farmer&apos;s Marketplace - Direct Market Access Web Application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {freeFeatures.map((item) => (
            <div key={item} className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
              <p>{item}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
