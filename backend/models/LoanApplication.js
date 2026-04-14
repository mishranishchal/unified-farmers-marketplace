const mongoose = require('mongoose');

const loanApplicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    approvedAmount: { type: Number, min: 0, default: 0 },
    tenureMonths: { type: Number, min: 1, default: 12 },
    purpose: { type: String, required: true, trim: true },
    cropCycle: { type: String, trim: true, default: '' },
    collateral: { type: String, trim: true, default: '' },
    riskBand: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'disbursed', 'closed'],
      default: 'pending',
    },
    requestedDisbursementDate: { type: Date },
    documents: [{ type: String, trim: true }],
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewNotes: { type: String, default: '' },
    interestRate: { type: Number, min: 0, default: 0 },
    repaymentStartDate: { type: Date },
  },
  { timestamps: true }
);

loanApplicationSchema.index({ user: 1, createdAt: -1 });
loanApplicationSchema.index({ status: 1, updatedAt: -1 });

module.exports = mongoose.model('LoanApplication', loanApplicationSchema);
