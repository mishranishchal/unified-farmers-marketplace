const mongoose = require('mongoose');

const buyerInteractionSchema = new mongoose.Schema(
  {
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    channel: { type: String, enum: ['message', 'call', 'meeting', 'email'], default: 'message' },
    subject: { type: String, trim: true, default: '' },
    message: { type: String, trim: true, default: '' },
    quantityRequested: { type: Number, min: 0, default: 0 },
    proposedPrice: { type: Number, min: 0, default: 0 },
    meetingAt: { type: Date },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: {
      type: String,
      enum: ['pending', 'scheduled', 'quoted', 'completed', 'cancelled'],
      default: 'pending',
    },
    notes: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

buyerInteractionSchema.index({ buyer: 1, createdAt: -1 });
buyerInteractionSchema.index({ farmer: 1, createdAt: -1 });

module.exports = mongoose.model('BuyerInteraction', buyerInteractionSchema);
