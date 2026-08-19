// src/utils/auditLogger.js
const db = require('../config/db');

/**
 * Log security and IAM events into audit_logs table
 */
const logAuditEvent = async ({ req, actorUserId, actorUsername, action, resourceType, resourceId, payload }) => {
  try {
    const actor_id = actorUserId || req?.user?.user_id || req?.user?.id || null;
    const actor_name = actorUsername || req?.user?.username || 'SYSTEM';
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null) : null;
    const payloadJson = payload ? JSON.stringify(payload) : null;

    await db.query(
      `INSERT INTO audit_logs (actor_user_id, actor_username_snapshot, action, resource_type, resource_id, ip_address, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [actor_id, actor_name, action, resourceType, String(resourceId), ip, payloadJson]
    );
  } catch (err) {
    console.error('[AuditLogger] Failed to record audit log:', err.message);
  }
};

module.exports = { logAuditEvent };
