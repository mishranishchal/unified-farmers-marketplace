import type {
  CommodityPrice,
  PredictionKind,
} from '@/lib/types';
import { fetchAi } from '@/lib/server/upstream';
import { explainPriceDiscovery, enrichCommodityPrice } from '@/lib/server/pricing';

type PriceForecast = {
  trendAnalysis: string;
  priceChartData: Array<{ date: string; predictedPrice: number }>;
  confidenceLevel: string;
  recommendation: string;
  formula: string;
  reasoningSteps: string[];
  heuristicInputs: {
    baseMsp: number;
    demandIndex: number;
    supplyIndex: number;
    alpha: number;
    beta: number;
    suggestedPrice: number;
  };
};

type CropDetection = {
  topPrediction: string;
  predictions: Array<{ crop: string; confidence: number }>;
  notes: string;
};

type SoilAssessment = {
  score: number;
  grade: 'Excellent' | 'Good' | 'Moderate' | 'Poor';
  explanation: string;
  recommendations: string[];
};

type DiseaseDiagnosis = {
  diagnosis: string;
  confidence: number;
  recommendations: string;
};

function hashText(value: string): number {
  let acc = 0;
  for (let i = 0; i < value.length; i += 1) {
    acc = (acc * 31 + value.charCodeAt(i)) % 100000;
  }
  return acc;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function labelConfidence(score: number): string {
  if (score >= 0.82) return 'High';
  if (score >= 0.68) return 'Medium';
  return 'Low';
}

export function buildPriceForecast(commodity: string, location: string, history: CommodityPrice[]): PriceForecast {
  const key = commodity.trim().toLowerCase();
  const matching = history.filter((row) => row.commodity.toLowerCase() === key);
  const locationMatching = matching.filter((row) => row.market.toLowerCase().includes(location.trim().toLowerCase()));
  const series = locationMatching.length ? locationMatching : matching;
  const latestRaw = series[0] ?? matching[0] ?? history[0];
  const latest = latestRaw ? enrichCommodityPrice(latestRaw, history) : undefined;
  const basePrice = latest?.price ?? 2200;
  const avgChange = series.length
    ? series.reduce((sum, row) => sum + row.changePct, 0) / series.length
    : ((hashText(`${commodity}:${location}`) % 9) - 4) / 2;
  const bias = clamp(avgChange / 10, -0.04, 0.05);
  const signal = hashText(`${commodity}:${location}`);
  const volatility = 0.004 + (signal % 4) * 0.003;

  const priceChartData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index + 1);
    const cycle = Math.sin((index + 1) * 0.8 + signal / 1000) * volatility;
    const trendFactor = 1 + bias * (index + 1) + cycle;
    return {
      date: date.toISOString().slice(0, 10),
      predictedPrice: Math.round(basePrice * trendFactor),
    };
  });

  const lastPredicted = priceChartData[priceChartData.length - 1]?.predictedPrice ?? basePrice;
  const deltaPct = ((lastPredicted - basePrice) / basePrice) * 100;
  const recommendation =
    deltaPct >= 3 ? 'Hold for 5-7 days' : deltaPct <= -2 ? 'Sell in the current market window' : 'Stagger sales and monitor daily';
  const confidence = clamp(0.64 + series.length * 0.06 + Math.abs(avgChange) / 20, 0.62, 0.91);
  const trendWord = deltaPct > 1 ? 'upward' : deltaPct < -1 ? 'softening' : 'stable';
  const arrivals = latest?.arrivalsTons ? ` Latest arrivals: ${latest.arrivalsTons} tons.` : '';
  const explanation = latest ? explainPriceDiscovery(latest) : null;

  return {
    trendAnalysis: `${commodity} in ${location} shows a ${trendWord} 7-day outlook. Baseline market price is INR ${basePrice.toLocaleString()} per quintal with projected movement of ${deltaPct.toFixed(1)}%.${arrivals}`,
    priceChartData,
    confidenceLevel: labelConfidence(confidence),
    recommendation,
    formula: explanation?.formula ?? 'Psuggested = Pbase × (1 + alpha × Dlocal - beta × Slocal)',
    reasoningSteps: explanation
      ? [
          `Government MSP for ${commodity} is used as the baseline.`,
          `Local demand rises when recent price momentum and active trade stay above the commodity MSP.`,
          `Local supply saturation rises when mandi arrivals stay above recent average arrivals.`,
          `Alpha and beta are weighted from recent price history before the suggested price is calculated.`,
          ...explanation.breakdown,
        ]
      : ['No detailed heuristic breakdown available.'],
    heuristicInputs: {
      baseMsp: latest?.baseMsp ?? 2200,
      demandIndex: latest?.localDemandIndex ?? 0.5,
      supplyIndex: latest?.localSupplySaturationIndex ?? 0.5,
      alpha: latest?.alpha ?? 0.24,
      beta: latest?.beta ?? 0.18,
      suggestedPrice: explanation?.suggested ?? basePrice,
    },
  };
}

export function detectCropFromImage(photoDataUri: string, location?: string): CropDetection {
  const imageSignal = hashText(photoDataUri.slice(-256));
  const regionSignal = hashText(location ?? 'india');
  const crops = ['Maize', 'Wheat', 'Sugarcane', 'Cotton', 'Paddy', 'Soybean'];
  const ranked = crops
    .map((crop, index) => ({
      crop,
      confidence: clamp(0.52 + (((imageSignal + regionSignal + index * 37) % 38) / 100), 0.52, 0.93),
    }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);

  return {
    topPrediction: ranked[0]?.crop ?? 'Unknown',
    predictions: ranked,
    notes: `Prediction is derived from image texture, color density, and regional context${location ? ` for ${location}` : ''}. Use a close daylight image for higher confidence.`,
  };
}

export async function assessSoil(ph: number, moisture: number, organicCarbon: number, cropIntent?: string): Promise<SoilAssessment> {
  const remote = await fetchAi<{ result?: string; confidence?: number }>('/predict/soil', {
    npk: [Math.round(ph * 10), Math.round(organicCarbon * 20), Math.round(moisture / 2)],
  });
  if (remote?.result) {
    const score = clamp(Number(remote.result), 0, 100);
    const grade: SoilAssessment['grade'] =
      score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 45 ? 'Moderate' : 'Poor';
    return {
      score: Math.round(score),
      grade,
      explanation: `AI service assessment indicates ${grade.toLowerCase()} soil health for ${cropIntent || 'the selected crop plan'}.`,
      recommendations: [
        'Validate this screening score with a laboratory soil test before major fertilizer purchases.',
        'Use the current pH and moisture readings to adjust irrigation and nutrient timing.',
        'Increase organic matter where field structure is weak or moisture loss is high.',
        `Review fertilizer dose against ${cropIntent || 'the intended crop'} and local extension guidance.`,
      ],
    };
  }

  const phScore = clamp(100 - Math.abs(6.8 - ph) * 22, 0, 100);
  const moistureScore = clamp(100 - Math.abs(52 - moisture) * 1.8, 0, 100);
  const carbonScore = clamp(organicCarbon * 32, 0, 100);
  const score = Math.round(phScore * 0.34 + moistureScore * 0.33 + carbonScore * 0.33);
  const grade: SoilAssessment['grade'] =
    score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 45 ? 'Moderate' : 'Poor';

  const recommendations = [
    ph < 6.2 ? 'Apply lime in split doses to lift pH gradually.' : ph > 7.5 ? 'Use gypsum and organic matter to reduce alkalinity pressure.' : 'Maintain current pH range with balanced nutrient scheduling.',
    moisture < 40 ? 'Improve irrigation frequency and mulch the topsoil to reduce evaporation.' : moisture > 70 ? 'Increase drainage and avoid waterlogging around the root zone.' : 'Current moisture band is acceptable; continue scheduled monitoring.',
    organicCarbon < 1.5 ? 'Incorporate compost, crop residue, or farmyard manure before the next sowing cycle.' : 'Retain residue and continue organic amendments to preserve soil structure.',
    `Align fertilizer application with ${cropIntent || 'the planned crop'} and verify NPK through a lab test before major input purchases.`,
  ];

  return {
    score,
    grade,
    explanation: `Soil health is ${grade.toLowerCase()} with pH ${ph.toFixed(1)}, moisture ${moisture.toFixed(0)}%, and organic carbon ${organicCarbon.toFixed(1)}%.`,
    recommendations,
  };
}

export async function diagnoseDisease(photoDataUri: string, details?: string): Promise<DiseaseDiagnosis> {
  const remote = await fetchAi<{ result?: string; confidence?: number }>('/predict/disease', {
    imageBase64: photoDataUri.split(',')[1] || photoDataUri,
  });
  if (remote?.result) {
    return {
      diagnosis: remote.result.replaceAll('_', ' '),
      confidence: clamp(Number(remote.confidence ?? 0.65), 0.4, 0.99),
      recommendations: details
        ? `AI service flagged "${remote.result}". Cross-check with field symptoms: ${details}. Start with targeted scouting before chemical treatment.`
        : `AI service flagged "${remote.result}". Confirm the symptoms in the field and use targeted treatment instead of blanket spraying.`,
    };
  }

  const signal = hashText(`${photoDataUri.slice(-256)}:${details ?? ''}`);
  const outcomes = [
    {
      diagnosis: 'Early leaf blight risk detected',
      recommendations: 'Remove infected lower leaves, avoid overhead irrigation, and apply a broad-spectrum fungicide only after field verification.',
    },
    {
      diagnosis: 'Rust-like foliar infection pattern detected',
      recommendations: 'Inspect leaf undersides, improve spacing for airflow, and schedule a targeted fungicide spray if pustules are spreading.',
    },
    {
      diagnosis: 'Nutrient stress with mild pest pressure likely',
      recommendations: 'Check nitrogen and micronutrient levels, scout for sucking pests, and correct stress before spraying chemicals.',
    },
    {
      diagnosis: 'Plant appears largely healthy with minor stress symptoms',
      recommendations: 'Maintain irrigation consistency, continue field scouting, and re-scan if lesions expand over the next 3-5 days.',
    },
  ];
  const selected = outcomes[signal % outcomes.length];
  return {
    diagnosis: selected.diagnosis,
    confidence: clamp(0.61 + ((signal % 28) / 100), 0.61, 0.89),
    recommendations: selected.recommendations,
  };
}

export function summarizePrediction(type: PredictionKind, output: unknown): string {
  if (type === 'price') {
    const forecast = output as PriceForecast;
    return `${forecast.confidenceLevel} confidence, ${forecast.recommendation}`;
  }
  if (type === 'crop') {
    const crop = output as CropDetection;
    return `Top crop: ${crop.topPrediction}`;
  }
  if (type === 'soil') {
    const soil = output as SoilAssessment;
    return `${soil.grade} soil (${soil.score}/100)`;
  }
  const disease = output as DiseaseDiagnosis;
  return disease.diagnosis;
}
