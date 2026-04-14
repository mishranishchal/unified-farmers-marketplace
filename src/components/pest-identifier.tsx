'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { Upload, Loader2, Bot, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { type IdentifyPestDiseaseOutput, type IdentifyPestDiseaseInput } from '@/ai/flows/identify-pest-disease';
import { assessPlantImage } from '@/lib/client/image-validation';

const formSchema = z.object({
  additionalDetails: z.string().optional(),
});

type PestIdentifierProps = {
  identifyAction: (input: IdentifyPestDiseaseInput) => Promise<IdentifyPestDiseaseOutput>;
};

export default function PestIdentifier({ identifyAction }: PestIdentifierProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IdentifyPestDiseaseOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [photoDataUri, setPhotoDataUri] = useState<string | null>(null);
  const [imageWarning, setImageWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { additionalDetails: '' },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setImagePreview(URL.createObjectURL(file));
        setPhotoDataUri(dataUri);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
      void assessPlantImage(file)
        .then((assessment) => {
          setImageWarning(assessment.accepted ? null : assessment.reason);
        })
        .catch(() => {
          setImageWarning('Image validation could not be completed. Use a clear crop or leaf image.');
        });
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!photoDataUri) {
      setError('Please upload a photo first.');
      return;
    }
    if (imageWarning) {
      setError(imageWarning);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const diagnosis = await identifyAction({
        photoDataUri,
        additionalDetails: values.additionalDetails,
      });
      setResult(diagnosis);
    } catch (e) {
      setError('Failed to get diagnosis. Please try again.');
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <div
              className="w-full h-64 border-2 border-dashed rounded-lg flex items-center justify-center text-center p-4 cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <Image src={imagePreview} alt="Plant preview" width={256} height={256} className="max-h-full w-auto object-contain rounded-md" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="h-10 w-10" />
                  <p className="font-semibold">Click to upload photo</p>
                  <p className="text-xs">PNG, JPG, or WEBP</p>
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4">
                <FormField
                  control={form.control}
                  name="additionalDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Details (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., Yellow spots on lower leaves, plant is 3 weeks old." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loading || !photoDataUri}>
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Bot className="mr-2 h-4 w-4" />
                  )}
                  Diagnose Plant
                </Button>
                {imageWarning && <p className="text-xs text-amber-700">{imageWarning}</p>}
              </form>
            </Form>
          </div>
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold mb-4 font-headline">Diagnosis Result</h3>
            {loading && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4">AI is analyzing your photo...</p>
              </div>
            )}
            {error && <div className="flex flex-col items-center justify-center h-full text-destructive"><AlertTriangle className="h-12 w-12" /><p className="mt-4">{error}</p></div>}
            {result && (
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold flex items-center gap-2"><CheckCircle className="text-green-500 h-5 w-5" /> Diagnosis</h4>
                  <p className="text-muted-foreground mt-1">{result.diagnosis}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Confidence</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={result.confidence * 100} className="w-full" />
                    <span className="font-mono text-sm font-semibold">{(result.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold">Recommendations</h4>
                  <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{result.recommendations}</p>
                </div>
              </div>
            )}
            {!loading && !error && !result && (
              <div className="flex flex-col items-center justify-center h-full text-center bg-secondary/50 rounded-lg p-4">
                <Bot className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">Your diagnosis report will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
