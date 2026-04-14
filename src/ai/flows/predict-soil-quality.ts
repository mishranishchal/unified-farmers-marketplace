'use server';

import { z } from 'zod';
import { assessSoil } from '@/lib/server/ai';

const PredictSoilQualityInputSchema = z.object({
  ph: z.number().describe('Soil pH value'),
  moisture: z.number().describe('Soil moisture percentage'),
  organicCarbon: z.number().describe('Organic carbon percentage'),
  cropIntent: z.string().optional().describe('Crop intended for this field'),
});

const PredictSoilQualityOutputSchema = z.object({
  score: z.number().describe('Soil quality score from 0 to 100'),
  grade: z.enum(['Excellent', 'Good', 'Moderate', 'Poor']).describe('Soil health grade'),
  explanation: z.string().describe('Short explanation of the soil quality status'),
  recommendations: z.array(z.string()).describe('Actionable recommendations to improve soil quality'),
});

export type PredictSoilQualityInput = z.infer<typeof PredictSoilQualityInputSchema>;
export type PredictSoilQualityOutput = z.infer<typeof PredictSoilQualityOutputSchema>;

export async function predictSoilQuality(input: PredictSoilQualityInput): Promise<PredictSoilQualityOutput> {
  const payload = PredictSoilQualityInputSchema.parse(input);
  return PredictSoilQualityOutputSchema.parse(
    await assessSoil(payload.ph, payload.moisture, payload.organicCarbon, payload.cropIntent)
  );
}
