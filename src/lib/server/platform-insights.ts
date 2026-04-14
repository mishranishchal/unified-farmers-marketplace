import { ai } from '@/ai/genkit';

type InsightInput = {
  context: 'dashboard' | 'analytics' | 'admin';
  payload: Record<string, unknown>;
};

type InsightDigest = {
  headline: string;
  bullets: string[];
  recommendation: string;
  source: 'gemini' | 'fallback';
};

function buildFallbackDigest(input: InsightInput): InsightDigest {
  const payload = input.payload;
  const trustReady = Number(payload.trustReady ?? payload.verifiedProfiles ?? 0);
  const shipmentsOpen = Number(payload.shipmentsOpen ?? payload.shipmentBacklog ?? 0);
  const fieldReports = Number(payload.fieldReports ?? payload.newFieldReports ?? 0);
  const topPrice = String(payload.topPrice ?? 'No fresh mandi signal available');

  return {
    headline:
      input.context === 'admin'
        ? 'Admin control room prioritization'
        : input.context === 'analytics'
          ? 'Analytics snapshot generated from live platform records'
          : 'Live marketplace signal digest',
    bullets: [
      `${trustReady} workspaces are already trust-ready or verified.`,
      `${shipmentsOpen} shipments still need logistics attention.`,
      `${fieldReports} recent farmer intelligence reports are influencing market visibility.`,
      topPrice,
    ],
    recommendation:
      shipmentsOpen > 0
        ? 'Prioritize trust review and dispatch closure before pushing new finance commitments.'
        : 'Use the strongest mandi and buyer signals to convert verified users into completed trade.',
    source: 'fallback',
  };
}

export async function generatePlatformInsightDigest(input: InsightInput): Promise<InsightDigest> {
  if (!process.env.GOOGLE_API_KEY) {
    return buildFallbackDigest(input);
  }

  try {
    const prompt = [
      `You are generating a concise operational insight digest for Farmer's Marketplace.`,
      `Context: ${input.context}`,
      'Return exactly 6 lines in this format:',
      'Headline: ...',
      'Bullet: ...',
      'Bullet: ...',
      'Bullet: ...',
      'Bullet: ...',
      'Recommendation: ...',
      `Data: ${JSON.stringify(input.payload)}`,
    ].join('\n');

    const response = await ai.generate(prompt);
    const lines = response.text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const headline = lines.find((line) => line.toLowerCase().startsWith('headline:'))?.replace(/^headline:\s*/i, '') || 'Gemini operational digest';
    const bullets = lines
      .filter((line) => line.toLowerCase().startsWith('bullet:'))
      .map((line) => line.replace(/^bullet:\s*/i, ''))
      .slice(0, 4);
    const recommendation =
      lines.find((line) => line.toLowerCase().startsWith('recommendation:'))?.replace(/^recommendation:\s*/i, '') ||
      'Review trust, logistics, and market-price signals together before the next trading cycle.';

    if (!bullets.length) {
      return buildFallbackDigest(input);
    }

    return {
      headline,
      bullets,
      recommendation,
      source: 'gemini',
    };
  } catch {
    return buildFallbackDigest(input);
  }
}
