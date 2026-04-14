const MarketPrice = require('../models/MarketPrice');

const DEFAULT_ALPHA = Number(process.env.PRICE_ALPHA || 0.15);
const DEFAULT_BETA = Number(process.env.PRICE_BETA || 0.1);

const computeSuggestedPrice = ({ basePrice, demandIndex, supplyIndex, alpha = DEFAULT_ALPHA, beta = DEFAULT_BETA }) => {
  const suggested = basePrice * (1 + alpha * demandIndex - beta * supplyIndex);
  return Number(Math.max(suggested, 0).toFixed(2));
};

const getTrend = (changePct) => {
  if (changePct > 0.5) return 'up';
  if (changePct < -0.5) return 'down';
  return 'stable';
};

const getOrUpdateMarketPrice = async ({
  commodity,
  market = 'National Average',
  state = '',
  district = '',
  unit = 'quintal',
  msp,
  localDemandIndex,
  localSupplyIndex,
  latestObservedPrice,
  source = 'system',
}) => {
  const normalizedCommodity = commodity.toLowerCase();
  const normalizedMarket = market.trim() || 'National Average';
  const suggestedPrice = computeSuggestedPrice({
    basePrice: msp,
    demandIndex: localDemandIndex,
    supplyIndex: localSupplyIndex,
  });

  const existing = await MarketPrice.findOne({
    commodity: normalizedCommodity,
    market: normalizedMarket,
  }).lean();

  const nextObservedPrice = Number.isFinite(Number(latestObservedPrice))
    ? Number(latestObservedPrice)
    : suggestedPrice;
  const previousObservedPrice = existing?.latestObservedPrice || nextObservedPrice;
  const changePct = previousObservedPrice
    ? Number((((nextObservedPrice - previousObservedPrice) / previousObservedPrice) * 100).toFixed(2))
    : 0;

  const doc = await MarketPrice.findOneAndUpdate(
    { commodity: normalizedCommodity, market: normalizedMarket },
    {
      commodity: normalizedCommodity,
      market: normalizedMarket,
      state,
      district,
      unit,
      msp,
      latestObservedPrice: nextObservedPrice,
      localDemandIndex,
      localSupplyIndex,
      suggestedPrice,
      changePct,
      trend: getTrend(changePct),
      source,
      capturedAt: new Date(),
      updatedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return doc;
};

module.exports = {
  computeSuggestedPrice,
  getOrUpdateMarketPrice,
};
