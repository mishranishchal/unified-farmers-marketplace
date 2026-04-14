'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Droplets, FlaskConical, Sparkles } from 'lucide-react';
import { predictSoilAction } from './actions';

type SoilResult = {
  score: number;
  grade: 'Excellent' | 'Good' | 'Moderate' | 'Poor';
  explanation: string;
  recommendations: string[];
};

export default function SoilQualityPage() {
  const [ph, setPh] = useState(6.6);
  const [moisture, setMoisture] = useState(52);
  const [organic, setOrganic] = useState(2.2);
  const [result, setResult] = useState<SoilResult | null>(null);
  const [loading, setLoading] = useState(false);

  const qualityScore = useMemo(() => {
    const phScore = Math.max(0, 100 - Math.abs(6.8 - ph) * 18);
    const moistureScore = Math.max(0, 100 - Math.abs(55 - moisture) * 2);
    const organicScore = Math.min(100, organic * 30);
    return Math.round((phScore * 0.35) + (moistureScore * 0.35) + (organicScore * 0.3));
  }, [ph, moisture, organic]);

  return (
    <div className="flex flex-col gap-8">
      <header className="brand-panel p-6">
        <Badge className="mb-3 bg-primary text-primary-foreground">Frontend AI Module</Badge>
        <h1 className="text-3xl font-bold font-headline">Soil Quality Prediction Studio</h1>
        <p className="text-muted-foreground mt-2">
          Predict soil quality index from pH, moisture, and organic carbon values with dynamic frontend simulation.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="brand-panel">
          <CardHeader>
            <CardTitle>Soil Sample Parameters</CardTitle>
            <CardDescription>Input or adjust key values to simulate quality prediction in real-time.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Soil pH: {ph.toFixed(1)}</Label>
              <Slider value={[ph]} min={4} max={9} step={0.1} onValueChange={(v) => setPh(v[0])} />
            </div>
            <div className="space-y-2">
              <Label>Moisture: {moisture}%</Label>
              <Slider value={[moisture]} min={10} max={90} step={1} onValueChange={(v) => setMoisture(v[0])} />
            </div>
            <div className="space-y-2">
              <Label>Organic Carbon: {organic.toFixed(1)}%</Label>
              <Slider value={[organic]} min={0.2} max={4.5} step={0.1} onValueChange={(v) => setOrganic(v[0])} />
            </div>
            <Button
              className="w-full"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  const output = await predictSoilAction({
                    ph,
                    moisture,
                    organicCarbon: organic,
                    cropIntent: 'Multi-crop rotation',
                  });
                  setResult(output);
                } finally {
                  setLoading(false);
                }
              }}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {loading ? 'Running AI Prediction...' : 'Generate Soil Prediction'}
            </Button>
          </CardContent>
        </Card>

        <Card className="brand-panel">
          <CardHeader>
            <CardTitle>Predicted Soil Health Index</CardTitle>
            <CardDescription>Computed score and recommended action bucket.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border p-4 bg-card/70">
              <p className="text-sm text-muted-foreground">Composite Score</p>
              <p className="text-4xl font-bold">{result?.score ?? qualityScore}/100</p>
              <Progress value={result?.score ?? qualityScore} className="mt-3" />
              {result && <p className="text-sm mt-2 text-muted-foreground">Grade: {result.grade}</p>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <FlaskConical className="h-5 w-5 mx-auto text-primary" />
                <p className="text-xs text-muted-foreground mt-1">pH Balance</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <Droplets className="h-5 w-5 mx-auto text-primary" />
                <p className="text-xs text-muted-foreground mt-1">Moisture</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <Sparkles className="h-5 w-5 mx-auto text-primary" />
                <p className="text-xs text-muted-foreground mt-1">Organic Matter</p>
              </div>
            </div>
            <div className="rounded-lg bg-secondary/40 p-4 text-sm">
              {result?.explanation && <p className="mb-2">{result.explanation}</p>}
              {result?.recommendations?.length ? (
                <ul className="list-disc pl-4 space-y-1">
                  {result.recommendations.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <>
                  {qualityScore >= 75 && <p>Soil quality is strong. Maintain balanced nutrition and moisture monitoring.</p>}
                  {qualityScore >= 50 && qualityScore < 75 && <p>Soil quality is moderate. Add organic compost and correct nutrient deficits.</p>}
                  {qualityScore < 50 && <p>Soil quality is low. Prioritize remediation with organic matter and pH correction strategy.</p>}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
