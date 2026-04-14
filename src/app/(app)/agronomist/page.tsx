'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent } from '@/components/ui/card';
import { identifyAction } from './actions';

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

export default function AgronomistPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="brand-panel p-6 text-center">
        <h1 className="font-headline text-3xl font-bold">AI Crop Disease Assistant</h1>
        <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
          Upload crop photos and get instant AI-based diagnosis, confidence score, and actionable treatment guidance.
        </p>
      </header>
      <div className="mx-auto w-full max-w-4xl">
        <PestIdentifier identifyAction={identifyAction} />
      </div>
    </div>
  );
}
