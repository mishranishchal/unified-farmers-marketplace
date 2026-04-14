'use server';
import { z } from 'zod';
import { diagnoseDisease } from '@/lib/server/ai';

const IdentifyPestDiseaseInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a plant, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  additionalDetails: z.string().optional().describe('Any additional details about the plant or symptoms.'),
});
export type IdentifyPestDiseaseInput = z.infer<typeof IdentifyPestDiseaseInputSchema>;

const IdentifyPestDiseaseOutputSchema = z.object({
  diagnosis: z.string().describe('The diagnosis of potential pests or diseases.'),
  confidence: z.number().describe('The confidence level of the diagnosis (0-1).'),
  recommendations: z.string().describe('Recommendations for treatment or further action.'),
});
export type IdentifyPestDiseaseOutput = z.infer<typeof IdentifyPestDiseaseOutputSchema>;

export async function identifyPestDisease(input: IdentifyPestDiseaseInput): Promise<IdentifyPestDiseaseOutput> {
  const payload = IdentifyPestDiseaseInputSchema.parse(input);
  return IdentifyPestDiseaseOutputSchema.parse(await diagnoseDisease(payload.photoDataUri, payload.additionalDetails));
}
