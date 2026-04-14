'use server';

import { detectCropType, type DetectCropTypeInput } from '@/ai/flows/detect-crop-type';
import { summarizePrediction } from '@/lib/server/ai';
import { getSessionUser } from '@/lib/server/auth';
import { platformStore } from '@/lib/server/store';

export async function detectCropAction(input: DetectCropTypeInput) {
  const result = await detectCropType(input);
  const user = await getSessionUser();
  if (user) {
    await platformStore.logPrediction({
      type: 'crop',
      userEmail: user.email,
      inputSummary: input.location ? `Crop image from ${input.location}` : 'Crop image upload',
      outputSummary: summarizePrediction('crop', result),
    });
  }
  return result;
}
