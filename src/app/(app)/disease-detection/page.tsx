'use client';

import dynamic from 'next/dynamic';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { identifyAction } from '@/app/(app)/agronomist/actions';

const PestIdentifier = dynamic(() => import('@/components/pest-identifier'), {
  loading: () => (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-80 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </CardContent>
    </Card>
  ),
});

export default function DiseaseDetectionPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="brand-panel p-6">
        <Badge className="mb-3 bg-primary text-primary-foreground">Operational AI Module</Badge>
        <h1 className="text-3xl font-bold font-headline">Crop Disease Detection Lab</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Upload field photos, add symptom notes, and generate a diagnosis report with confidence scoring and treatment guidance.
          Results are logged into the platform prediction history instead of staying as static placeholder content.
        </p>
      </header>

      <PestIdentifier identifyAction={identifyAction} />
    </div>
  );
}
