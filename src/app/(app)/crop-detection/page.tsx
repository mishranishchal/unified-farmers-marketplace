'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Camera, Loader2, Sparkles, Upload, Wheat } from 'lucide-react';
import { detectCropAction } from './actions';
import { assessPlantImage } from '@/lib/client/image-validation';

type CropPrediction = {
  crop: string;
  confidence: number;
};

type DetectCropResponse = {
  topPrediction: string;
  predictions: CropPrediction[];
  notes: string;
};

export default function CropDetectionPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [location, setLocation] = useState('Pune');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoDataUri, setPhotoDataUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DetectCropResponse | null>(null);
  const [imageWarning, setImageWarning] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-8">
      <header className="brand-panel p-6">
        <Badge className="mb-3 bg-primary text-primary-foreground">AI + Backend Enabled</Badge>
        <h1 className="text-3xl font-bold font-headline">Crop Detection Studio</h1>
        <p className="text-muted-foreground mt-2">
          Upload crop images and run AI-driven crop classification with confidence scores.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="brand-panel">
          <CardHeader>
            <CardTitle>Image Input</CardTitle>
            <CardDescription>Capture or upload a clear crop image.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="rounded-xl border-2 border-dashed p-8 text-center bg-secondary/30 cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              {previewUrl ? (
                <Image src={previewUrl} alt="Crop preview" width={420} height={260} className="mx-auto rounded-lg h-52 object-contain" />
              ) : (
                <>
                  <Wheat className="h-12 w-12 mx-auto text-primary" />
                  <p className="font-medium mt-3">Click to upload crop image</p>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onloadend = () => {
                  setPreviewUrl(URL.createObjectURL(file));
                  setPhotoDataUri(reader.result as string);
                  setResult(null);
                };
                reader.readAsDataURL(file);
                void assessPlantImage(file)
                  .then((assessment) => setImageWarning(assessment.accepted ? null : assessment.reason))
                  .catch(() => setImageWarning('Image validation failed. Upload a clearer plant image.'));
              }}
            />
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Button>
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <Camera className="mr-2 h-4 w-4" />
                Capture
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Geo-tag</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            {imageWarning && <p className="text-xs text-amber-700">{imageWarning}</p>}
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              disabled={!photoDataUri || loading || Boolean(imageWarning)}
              onClick={async () => {
                if (!photoDataUri) return;
                setLoading(true);
                try {
                  const output = await detectCropAction({ photoDataUri, location });
                  setResult(output);
                } finally {
                  setLoading(false);
                }
              }}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Run Crop Detection
            </Button>
          </CardFooter>
        </Card>

        <Card className="brand-panel">
          <CardHeader>
            <CardTitle>Detection Results</CardTitle>
            <CardDescription>Top predictions ranked by confidence.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {!result && <p className="text-muted-foreground">Run detection to view AI predictions.</p>}
            {result && (
              <>
                <div className="rounded-lg border p-4 bg-card/70">
                  <p className="text-sm text-muted-foreground">Top Prediction</p>
                  <p className="text-2xl font-bold">{result.topPrediction}</p>
                </div>
                {result.predictions.map((item) => (
                  <div key={item.crop} className="rounded-lg border p-4 bg-card/70">
                    <div className="flex justify-between">
                      <p className="font-semibold">{item.crop}</p>
                      <Badge>{Math.round(item.confidence * 100)}%</Badge>
                    </div>
                    <Progress value={item.confidence * 100} className="mt-3" />
                  </div>
                ))}
                <p className="text-sm text-muted-foreground">{result.notes}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
