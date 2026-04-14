'use server';

import { predictSoilQuality, type PredictSoilQualityInput } from '@/ai/flows/predict-soil-quality';
import { summarizePrediction } from '@/lib/server/ai';
import { getSessionUser } from '@/lib/server/auth';
import { platformStore } from '@/lib/server/store';

export async function predictSoilAction(input: PredictSoilQualityInput) {
  const result = await predictSoilQuality(input);
  const user = await getSessionUser();
  if (user) {
    await platformStore.logPrediction({
      type: 'soil',
      userEmail: user.email,
      inputSummary: `pH ${input.ph}, moisture ${input.moisture}, OC ${input.organicCarbon}`,
      outputSummary: summarizePrediction('soil', result),
    });
  }
  return result;
}
