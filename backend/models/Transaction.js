const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    category: {
      type: String,
      enum: [
        'wallet_topup',
        'order_payment',
        'refund',
        'farmer_payout',
        'loan_disbursal',
        'loan_repayment',
        'adjustment',
      ],
      default: 'wallet_topup',
    },
    amount: { type: Number, required: true, min: 0 },
    reference: { type: String, required: true },
    method: {
      type: String,
      enum: ['wallet', 'upi', 'card', 'netbanking', 'bank_transfer', 'cash', 'system'],
      default: 'system',
    },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ reference: 1 }, { unique: true });

module.exports = mongoose.model('Transaction', transactionSchema);
