const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const verificationSchema = new mongoose.Schema(
  {
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    kycStatus: {
      type: String,
      enum: ['not_started', 'pending', 'approved', 'rejected'],
      default: 'not_started',
    },
    kycVerifiedAt: { type: Date },
  },
  { _id: false }
);

const featureAccessSchema = new mongoose.Schema(
  {
    marketplace: { type: Boolean, default: true },
    aiTools: { type: Boolean, default: true },
    finance: { type: Boolean, default: true },
    community: { type: Boolean, default: true },
    buyerMatching: { type: Boolean, default: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Invalid email'],
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: {
      type: String,
      enum: ['farmer', 'buyer', 'admin'],
      default: 'farmer',
      index: true,
    },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    avatarUrl: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
    kycDocumentUrl: { type: String, default: '' },
    status: {
      type: String,
      enum: ['active', 'pending', 'suspended', 'blocked'],
      default: 'active',
      index: true,
    },
    walletBalance: { type: Number, default: 0, min: 0 },
    subscriptionStatus: { type: String, enum: ['free', 'pro'], default: 'free' },
    aiCredits: { type: Number, default: 25, min: 0 },
    profileCompletion: { type: Number, default: 20, min: 0, max: 100 },
    preferredLanguage: { type: String, default: 'en' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    featureAccess: { type: featureAccessSchema, default: () => ({}) },
    verification: { type: verificationSchema, default: () => ({}) },
    source: { type: String, default: 'web' },
    tags: [{ type: String, trim: true }],
    lastLoginAt: { type: Date },
    lastActiveAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

userSchema.index({ role: 1, status: 1, createdAt: -1 });
userSchema.index({ subscriptionStatus: 1, updatedAt: -1 });

userSchema.pre('save', async function userSave(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
