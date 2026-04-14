'use server';

import { z } from 'zod';
import { detectCropFromImage } from '@/lib/server/ai';

const DetectCropTypeInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe("A photo of the crop plant as a data URI. Expected format: 'data:image/<format>;base64,<encoded_data>'"),
  location: z.string().optional().describe('Optional location context to improve detection confidence.'),
});

const PredictionSchema = z.object({
  crop: z.string().describe('Predicted crop type'),
  confidence: z.number().describe('Confidence value between 0 and 1'),
});

const DetectCropTypeOutputSchema = z.object({
  topPrediction: z.string().describe('Most likely detected crop'),
  predictions: z.array(PredictionSchema).describe('Top crop predictions with confidence scores'),
  notes: z.string().describe('Short guidance about quality of image and next validation steps'),
});

export type DetectCropTypeInput = z.infer<typeof DetectCropTypeInputSchema>;
export type DetectCropTypeOutput = z.infer<typeof DetectCropTypeOutputSchema>;

export async function detectCropType(input: DetectCropTypeInput): Promise<DetectCropTypeOutput> {
  const payload = DetectCropTypeInputSchema.parse(input);
  return DetectCropTypeOutputSchema.parse(detectCropFromImage(payload.photoDataUri, payload.location));
}
