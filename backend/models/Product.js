const mongoose = require('mongoose');

const productLocationSchema = new mongoose.Schema(
  {
    village: { type: String, trim: true, default: '' },
    district: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    market: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const qualityMetricsSchema = new mongoose.Schema(
  {
    moisturePercent: { type: Number, min: 0, max: 100 },
    purityPercent: { type: Number, min: 0, max: 100 },
    foreignMatterPercent: { type: Number, min: 0, max: 100 },
  },
  { _id: false }
);

const productAnalyticsSchema = new mongoose.Schema(
  {
    views: { type: Number, default: 0, min: 0 },
    enquiries: { type: Number, default: 0, min: 0 },
    saves: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    commodity: { type: String, trim: true, lowercase: true, default: '' },
    slug: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    suggestedPrice: { type: Number, min: 0 },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, default: 'kg', trim: true },
    currency: { type: String, default: 'INR', trim: true },
    images: [{ type: String }],
    grade: { type: String, default: '' },
    diseaseReport: { type: String, default: '' },
    soilScore: { type: Number, min: 0, max: 100 },
    harvestDate: { type: Date },
    expiryDate: { type: Date },
    featured: { type: Boolean, default: false },
    location: { type: productLocationSchema, default: () => ({}) },
    qualityMetrics: { type: qualityMetricsSchema, default: () => ({}) },
    analytics: { type: productAnalyticsSchema, default: () => ({}) },
    status: {
      type: String,
      enum: ['available', 'reserved', 'sold', 'pending'],
      default: 'available',
    },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

productSchema.index({ farmer: 1, status: 1, createdAt: -1 });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ commodity: 1, 'location.market': 1 });

module.exports = mongoose.model('Product', productSchema);
