const mongoose = require('mongoose');

const otpChallengeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: { type: String, required: true, trim: true, lowercase: true },
    role: { type: String, enum: ['farmer', 'buyer', 'admin'], required: true },
    purpose: { type: String, enum: ['signup', 'login', 'password_reset'], required: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    resendAvailableAt: { type: Date, required: true },
    attempts: { type: Number, min: 0, default: 0 },
    maxAttempts: { type: Number, min: 1, default: 5 },
    sendCount: { type: Number, min: 0, default: 1 },
    deliveryChannel: { type: String, enum: ['email', 'sms'], default: 'email' },
    consumedAt: { type: Date },
    requestedFromIp: { type: String, trim: true, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

otpChallengeSchema.index({ email: 1, purpose: 1, createdAt: -1 });

module.exports = mongoose.model('OtpChallenge', otpChallengeSchema);
