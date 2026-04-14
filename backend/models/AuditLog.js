const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorEmail: { type: String, trim: true, lowercase: true, default: '' },
    actorRole: { type: String, enum: ['farmer', 'buyer', 'admin', 'system'], default: 'system' },
    action: { type: String, required: true, trim: true },
    entityType: { type: String, required: true, trim: true },
    entityId: { type: String, trim: true, default: '' },
    outcome: { type: String, enum: ['success', 'failure'], default: 'success' },
    ipAddress: { type: String, trim: true, default: '' },
    userAgent: { type: String, trim: true, default: '' },
    changeSummary: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    occurredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

auditLogSchema.index({ action: 1, occurredAt: -1 });
auditLogSchema.index({ actor: 1, occurredAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
