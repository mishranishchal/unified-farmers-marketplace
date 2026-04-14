const mongoose = require('mongoose');

const platformConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'platform' },
    accessPolicy: {
      farmerPlan: { type: String, default: 'free' },
      buyerPlan: { type: String, default: 'free' },
      adminRequiresInvite: { type: Boolean, default: true },
    },
    categories: {
      crops: [{ type: String, trim: true }],
      inputs: [{ type: String, trim: true }],
      services: [{ type: String, trim: true }],
    },
    featureFlags: {
      marketplace: { type: Boolean, default: true },
      aiAdvisory: { type: Boolean, default: true },
      pricePrediction: { type: Boolean, default: true },
      cropPrediction: { type: Boolean, default: true },
      finance: { type: Boolean, default: true },
      community: { type: Boolean, default: true },
      kyc: { type: Boolean, default: true },
      buyerMatching: { type: Boolean, default: true },
    },
    payments: {
      provider: { type: String, default: 'razorpay' },
      currency: { type: String, default: 'INR' },
      gatewayMode: { type: String, enum: ['test', 'live'], default: 'test' },
      platformCommissionRate: { type: Number, min: 0, default: 0.025 },
    },
    ai: {
      primaryProvider: { type: String, default: 'local' },
      fallbackEnabled: { type: Boolean, default: true },
      modelCatalog: [
        {
          key: { type: String, trim: true },
          version: { type: String, trim: true },
          enabled: { type: Boolean, default: true },
        },
      ],
    },
    notifications: {
      emailEnabled: { type: Boolean, default: true },
      smsEnabled: { type: Boolean, default: false },
      pushEnabled: { type: Boolean, default: true },
    },
    compliance: {
      kycRequiredForSellers: { type: Boolean, default: true },
      kycRequiredForBuyers: { type: Boolean, default: false },
      maxOtpAttempts: { type: Number, min: 1, default: 5 },
    },
    supportEmail: { type: String, trim: true, default: 'support@agriassist.local' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlatformConfig', platformConfigSchema);
