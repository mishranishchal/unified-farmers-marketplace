
'use server';

import { identifyPestDisease, type IdentifyPestDiseaseInput } from '@/ai/flows/identify-pest-disease';
import { summarizePrediction } from '@/lib/server/ai';
import { getSessionUser } from '@/lib/server/auth';
import { platformStore } from '@/lib/server/store';

export async function identifyAction(input: IdentifyPestDiseaseInput) {
  const result = await identifyPestDisease(input);
  const user = await getSessionUser();
  if (user) {
    await platformStore.logPrediction({
      type: 'disease',
      userEmail: user.email,
      inputSummary: input.additionalDetails || 'Leaf/plant image diagnosis',
      outputSummary: summarizePrediction('disease', result),
    });
  }
  return result;
}
