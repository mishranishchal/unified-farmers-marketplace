'use server';
import { z } from 'zod';
import { buildPriceForecast } from '@/lib/server/ai';
import { platformStore } from '@/lib/server/store';

const PredictPriceTrendsInputSchema = z.object({
  commodity: z.string().describe('The commodity to predict price trends for (e.g., maize, beans, coffee).'),
  location: z.string().describe('The location for which to predict price trends (e.g., Pune, Nairobi).'),
});

export type PredictPriceTrendsInput = z.infer<typeof PredictPriceTrendsInputSchema>;

const PriceTrendSchema = z.object({
  date: z.string().describe('Date of the price prediction (YYYY-MM-DD format).'),
  predictedPrice: z.number().describe('The predicted price for the commodity on the given date.'),
});

const PredictPriceTrendsOutputSchema = z.object({
  trendAnalysis: z.string().describe('An analysis of the predicted price trends, highlighting key patterns and insights.'),
  priceChartData: z.array(PriceTrendSchema).describe('An array of predicted price data points for generating a price chart.'),
  confidenceLevel: z.string().describe('The confidence level of the prediction (e.g., High, Medium, Low).'),
  recommendation: z.string().describe('Recommendation of whether to sell or hold.'),
  formula: z.string(),
  reasoningSteps: z.array(z.string()),
  heuristicInputs: z.object({
    baseMsp: z.number(),
    demandIndex: z.number(),
    supplyIndex: z.number(),
    alpha: z.number(),
    beta: z.number(),
    suggestedPrice: z.number(),
  }),
});

export type PredictPriceTrendsOutput = z.infer<typeof PredictPriceTrendsOutputSchema>;

export async function predictPriceTrends(input: PredictPriceTrendsInput): Promise<PredictPriceTrendsOutput> {
  const payload = PredictPriceTrendsInputSchema.parse(input);
  const history = await platformStore.listPrices();
  return PredictPriceTrendsOutputSchema.parse(buildPriceForecast(payload.commodity, payload.location, history));
}
