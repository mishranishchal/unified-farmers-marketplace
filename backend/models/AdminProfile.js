const mongoose = require('mongoose');

const adminProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    department: { type: String, trim: true, default: 'operations' },
    permissions: [{ type: String, trim: true }],
    scopes: [{ type: String, trim: true }],
    assignedRegions: [{ type: String, trim: true }],
    canApproveKyc: { type: Boolean, default: true },
    canModerateContent: { type: Boolean, default: true },
    canManagePricing: { type: Boolean, default: true },
    dashboardPreferences: {
      defaultView: { type: String, trim: true, default: 'analytics' },
      pinnedWidgets: [{ type: String, trim: true }],
    },
    lastReviewedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdminProfile', adminProfileSchema);
