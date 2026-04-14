const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    channel: { type: String, enum: ['email', 'sms', 'push', 'in_app'], default: 'email' },
    type: { type: String, trim: true, default: 'system' },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: ['queued', 'sent', 'failed', 'read'], default: 'queued' },
    sentAt: { type: Date },
    readAt: { type: Date },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ email: 1, createdAt: -1 });
notificationSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
