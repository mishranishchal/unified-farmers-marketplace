
'use server';

import { predictPriceTrends, type PredictPriceTrendsInput } from '@/ai/flows/predict-price-trends';
import { summarizePrediction } from '@/lib/server/ai';
import { getSessionUser } from '@/lib/server/auth';
import { platformStore } from '@/lib/server/store';

export async function predictAction(input: PredictPriceTrendsInput) {
  const result = await predictPriceTrends(input);
  const user = await getSessionUser();
  if (user) {
    await platformStore.logPrediction({
      type: 'price',
      userEmail: user.email,
      inputSummary: `${input.commodity} in ${input.location}`,
      outputSummary: summarizePrediction('price', result),
    });
  }
  return result;
}
