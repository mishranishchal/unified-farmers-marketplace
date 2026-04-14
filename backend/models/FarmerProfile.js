const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    season: { type: String, trim: true, default: '' },
    acreage: { type: Number, min: 0, default: 0 },
    expectedYield: { type: Number, min: 0, default: 0 },
    unit: { type: String, trim: true, default: 'quintal' },
  },
  { _id: false }
);

const farmerProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    farmName: { type: String, required: true, trim: true },
    organizationName: { type: String, trim: true, default: '' },
    bio: { type: String, default: '' },
    location: {
      village: { type: String, trim: true, default: '' },
      district: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
      pincode: { type: String, trim: true, default: '' },
    },
    landHolding: {
      acreage: { type: Number, min: 0, default: 0 },
      unit: { type: String, trim: true, default: 'acre' },
      ownershipType: { type: String, trim: true, default: 'owned' },
    },
    primaryCrops: [cropSchema],
    certifications: [{ type: String, trim: true }],
    irrigationType: {
      type: String,
      enum: ['rainfed', 'canal', 'drip', 'sprinkler', 'mixed', 'other'],
      default: 'mixed',
    },
    soilProfile: {
      soilType: { type: String, trim: true, default: '' },
      soilHealthScore: { type: Number, min: 0, max: 100, default: 0 },
      ph: { type: Number, min: 0, max: 14 },
      organicCarbon: { type: Number, min: 0 },
    },
    bankProfile: {
      bankName: { type: String, trim: true, default: '' },
      accountHolder: { type: String, trim: true, default: '' },
      ifsc: { type: String, trim: true, default: '' },
      accountLast4: { type: String, trim: true, default: '' },
    },
    kycStatus: {
      type: String,
      enum: ['not_started', 'pending', 'approved', 'rejected'],
      default: 'not_started',
    },
    logisticsSupport: { type: Boolean, default: false },
    preferredMarkets: [{ type: String, trim: true }],
    averageOrderValue: { type: Number, min: 0, default: 0 },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    lastHarvestAt: { type: Date },
  },
  { timestamps: true }
);

farmerProfileSchema.index({ 'location.state': 1, 'location.district': 1 });
farmerProfileSchema.index({ kycStatus: 1, updatedAt: -1 });

module.exports = mongoose.model('FarmerProfile', farmerProfileSchema);
