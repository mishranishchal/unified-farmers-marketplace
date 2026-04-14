import type { CommodityPrice } from '@/lib/types';

const MSP_BY_COMMODITY: Record<string, number> = {
  maize: 2225,
  wheat: 2425,
  soybean: 4892,
  paddy: 2300,
  cotton: 7121,
  mustard: 5950,
  tomato: 1400,
  onion: 1800,
  potato: 1500,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function getCommodityMsp(commodity: string): number {
  return MSP_BY_COMMODITY[commodity.trim().toLowerCase()] ?? 2200;
}

export function enrichCommodityPrice(row: CommodityPrice, history: CommodityPrice[]): CommodityPrice {
  const commodity = row.commodity.trim().toLowerCase();
  const related = history.filter((item) => item.commodity.trim().toLowerCase() === commodity);
  const local = related.filter((item) => item.market.toLowerCase() === row.market.toLowerCase());
  const relevant = local.length ? local : related;
  const avgArrivals = relevant.reduce((sum, item) => sum + (item.arrivalsTons ?? 0), 0) / Math.max(relevant.length, 1);
  const avgChange = relevant.reduce((sum, item) => sum + item.changePct, 0) / Math.max(relevant.length, 1);
  const avgPrice = relevant.reduce((sum, item) => sum + item.price, 0) / Math.max(relevant.length, 1);
  const msp = row.baseMsp ?? getCommodityMsp(row.commodity);
  const localDemandIndex = clamp(0.5 + avgChange / 12 + (avgPrice > msp ? 0.12 : -0.04), 0, 1);
  const localSupplySaturationIndex = clamp(((row.arrivalsTons ?? avgArrivals) || 0) / Math.max(avgArrivals * 1.8, 1), 0, 1);
  const alpha = clamp(0.24 + Math.max(avgChange, 0) / 20, 0.18, 0.48);
  const beta = clamp(0.18 + Math.abs(Math.min(avgChange, 0)) / 20 + localSupplySaturationIndex * 0.08, 0.14, 0.42);
  const heuristicSuggestedPrice = Math.round(msp * (1 + alpha * localDemandIndex - beta * localSupplySaturationIndex));

  return {
    ...row,
    baseMsp: msp,
    localDemandIndex: Number(localDemandIndex.toFixed(2)),
    localSupplySaturationIndex: Number(localSupplySaturationIndex.toFixed(2)),
    alpha: Number(alpha.toFixed(2)),
    beta: Number(beta.toFixed(2)),
    heuristicSuggestedPrice,
    source: row.source ?? 'heuristic',
  };
}

export function explainPriceDiscovery(row: CommodityPrice) {
  const msp = row.baseMsp ?? getCommodityMsp(row.commodity);
  const alpha = row.alpha ?? 0.24;
  const beta = row.beta ?? 0.18;
  const demand = row.localDemandIndex ?? 0.5;
  const supply = row.localSupplySaturationIndex ?? 0.5;
  const suggested = row.heuristicSuggestedPrice ?? Math.round(msp * (1 + alpha * demand - beta * supply));
  return {
    formula: 'Psuggested = Pbase × (1 + alpha × Dlocal - beta × Slocal)',
    breakdown: [
      `Pbase (MSP): INR ${msp.toLocaleString()}`,
      `Dlocal: ${demand.toFixed(2)}`,
      `Slocal: ${supply.toFixed(2)}`,
      `alpha: ${alpha.toFixed(2)}`,
      `beta: ${beta.toFixed(2)}`,
    ],
    suggested,
  };
}
