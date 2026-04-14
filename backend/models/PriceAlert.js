const mongoose = require('mongoose');

const priceAlertSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    commodity: { type: String, required: true, trim: true, lowercase: true },
    market: { type: String, required: true, trim: true },
    unit: { type: String, trim: true, default: 'quintal' },
    alertType: { type: String, enum: ['threshold', 'trend'], default: 'threshold' },
    direction: { type: String, enum: ['above', 'below'], default: 'above' },
    currentPrice: { type: Number, min: 0, default: 0 },
    targetPrice: { type: Number, min: 0, required: true },
    isActive: { type: Boolean, default: true },
    lastCheckedAt: { type: Date },
    triggeredAt: { type: Date },
    deliveryChannels: [{ type: String, enum: ['email', 'sms', 'in_app'] }],
  },
  { timestamps: true }
);

priceAlertSchema.index({ user: 1, isActive: 1, createdAt: -1 });
priceAlertSchema.index({ commodity: 1, market: 1 });

module.exports = mongoose.model('PriceAlert', priceAlertSchema);
