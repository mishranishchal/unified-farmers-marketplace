const mongoose = require('mongoose');

const commodityDemandSchema = new mongoose.Schema(
  {
    commodity: { type: String, required: true, trim: true },
    monthlyVolume: { type: Number, min: 0, default: 0 },
    preferredUnit: { type: String, trim: true, default: 'quintal' },
    targetPrice: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

const buyerProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    companyName: { type: String, required: true, trim: true },
    buyerType: {
      type: String,
      enum: ['wholesaler', 'retailer', 'processor', 'exporter', 'institutional', 'trader'],
      default: 'wholesaler',
    },
    contactPerson: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    demand: [commodityDemandSchema],
    procurementRegions: [{ type: String, trim: true }],
    warehouseLocations: [{ type: String, trim: true }],
    monthlyCapacityTonnes: { type: Number, min: 0, default: 0 },
    paymentTermsDays: { type: Number, min: 0, default: 0 },
    creditLimit: { type: Number, min: 0, default: 0 },
    gstNumber: { type: String, trim: true, default: '' },
    licenseNumber: { type: String, trim: true, default: '' },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'suspended'],
      default: 'pending',
    },
    preferredCategories: [{ type: String, trim: true }],
    tags: [{ type: String, trim: true }],
    rating: { type: Number, min: 0, max: 5, default: 0 },
  },
  { timestamps: true }
);

buyerProfileSchema.index({ buyerType: 1, verificationStatus: 1 });

module.exports = mongoose.model('BuyerProfile', buyerProfileSchema);
