const mongoose = require('mongoose');

const predictionLogSchema = new mongoose.Schema(
  {
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subjectUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    kind: {
      type: String,
      enum: ['market_price', 'crop_type', 'soil_quality', 'disease', 'grading'],
      required: true,
    },
    modelName: { type: String, trim: true, default: 'agriassist-ai' },
    modelVersion: { type: String, trim: true, default: 'v1' },
    status: { type: String, enum: ['completed', 'failed'], default: 'completed' },
    inputSummary: { type: String, default: '' },
    outputSummary: { type: String, default: '' },
    rawInput: { type: mongoose.Schema.Types.Mixed, default: {} },
    rawOutput: { type: mongoose.Schema.Types.Mixed, default: {} },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    latencyMs: { type: Number, min: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

predictionLogSchema.index({ requestedBy: 1, createdAt: -1 });
predictionLogSchema.index({ kind: 1, createdAt: -1 });

module.exports = mongoose.model('PredictionLog', predictionLogSchema);
