const MarketPrice = require('../models/MarketPrice');
const sendResponse = require('../utils/apiResponse');
const { getOrUpdateMarketPrice } = require('../services/priceService');

const suggestPrice = async (req, res, next) => {
  try {
    const { commodity, market, state, district, unit, msp, localDemandIndex, localSupplyIndex, latestObservedPrice } =
      req.body;

    const marketPrice = await getOrUpdateMarketPrice({
      commodity,
      market,
      state,
      district,
      unit,
      msp: Number(msp),
      localDemandIndex: Number(localDemandIndex),
      localSupplyIndex: Number(localSupplyIndex),
      latestObservedPrice,
    });

    return sendResponse(res, 200, { marketPrice }, 'Price suggested');
  } catch (error) {
    return next(error);
  }
};

const listPrices = async (req, res, next) => {
  try {
    const prices = await MarketPrice.find().sort({ updatedAt: -1 });
    return sendResponse(res, 200, { prices }, 'Market prices fetched');
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  suggestPrice,
  listPrices,
};
