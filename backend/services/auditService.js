const logger = require('../config/logger');
const AuditLog = require('../models/AuditLog');

const logAuditEvent = async ({
  actor,
  actorEmail,
  actorRole = 'system',
  action,
  entityType,
  entityId,
  outcome = 'success',
  ipAddress,
  userAgent,
  changeSummary,
  metadata = {},
}) => {
  try {
    await AuditLog.create({
      actor: actor || undefined,
      actorEmail: actorEmail || '',
      actorRole,
      action,
      entityType,
      entityId: entityId ? String(entityId) : '',
      outcome,
      ipAddress: ipAddress || '',
      userAgent: userAgent || '',
      changeSummary: changeSummary || '',
      metadata,
    });
  } catch (error) {
    logger.warn('Audit log write failed', { message: error.message, action, entityType });
  }
};

module.exports = {
  logAuditEvent,
};
