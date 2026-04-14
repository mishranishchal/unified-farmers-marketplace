const mongoose = require('mongoose');

const marketPriceSchema = new mongoose.Schema(
  {
    commodity: { type: String, required: true, trim: true, lowercase: true },
    market: { type: String, required: true, trim: true, default: 'National Average' },
    state: { type: String, trim: true, default: '' },
    district: { type: String, trim: true, default: '' },
    unit: { type: String, trim: true, default: 'quintal' },
    currency: { type: String, trim: true, default: 'INR' },
    msp: { type: Number, required: true, min: 0 },
    latestObservedPrice: { type: Number, min: 0 },
    localDemandIndex: { type: Number, required: true, min: 0 },
    localSupplyIndex: { type: Number, required: true, min: 0 },
    suggestedPrice: { type: Number, required: true, min: 0 },
    changePct: { type: Number, default: 0 },
    trend: { type: String, enum: ['up', 'down', 'stable'], default: 'stable' },
    source: { type: String, trim: true, default: 'system' },
    capturedAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

marketPriceSchema.index({ commodity: 1, market: 1 }, { unique: true });
marketPriceSchema.index({ commodity: 1, updatedAt: -1 });

module.exports = mongoose.model('MarketPrice', marketPriceSchema);
