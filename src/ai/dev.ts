import { config } from 'dotenv';
config();

import '@/ai/flows/predict-price-trends.ts';
import '@/ai/flows/identify-pest-disease.ts';
import '@/ai/flows/detect-crop-type.ts';
import '@/ai/flows/predict-soil-quality.ts';
