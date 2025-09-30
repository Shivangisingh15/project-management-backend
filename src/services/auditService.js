/**
 * Audit Service
 * Centralized audit logging for admin actions
 */

const { query } = require('../config/database');
const { auditQueries } = require('../database/queries');

/**
 * Log admin action to audit trail
 * @param {Object} options - Audit log options
 * @param {string} options.adminId - ID of admin performing action
 * @param {string} options.action - Action performed (USER_CREATED, USER_UPDATED, etc.)
 * @param {string} options.resourceType - Type of resource (user, role, etc.)
 * @param {string} options.resourceId - ID of affected resource
 * @param {Object} options.oldValues - Previous values (optional)
 * @param {Object} options.newValues - New values (optional)
 * @param {string} options.ipAddress - IP address of admin
 * @param {string} options.userAgent - User agent string
 */
const logAdminAction = async ({
  adminId,
  action,
  resourceType,
  resourceId,
  oldValues = null,
  newValues = null,
  ipAddress = null,
  userAgent = null
}) => {
  try {
    const auditResult = await query(
      auditQueries.createAuditLog,
      [
        adminId,
        action,
        resourceType,
        resourceId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress,
        userAgent
      ],
      'Create audit log'
    );

    console.log(`📝 Audit logged: ${action} on ${resourceType} ${resourceId} by admin ${adminId}`);
    
    return auditResult.rows[0];

  } catch (error) {
    console.error('❌ Audit logging error:', error);
    // Don't throw error - audit logging shouldn't break the main operation
    // In production, you might want to send this to a separate logging service
  }
};

/**
 * Get audit logs for a specific user
 * @param {string} userId - User ID to get audit logs for
 * @param {number} limit - Number of logs to retrieve
 * @param {number} offset - Offset for pagination
 */
const getUserAuditLogs = async (userId, limit = 50, offset = 0) => {
  try {
    const result = await query(
      auditQueries.getUserAuditLogs,
      [userId, limit, offset],
      'Get user audit logs'
    );

    return result.rows.map(log => ({
      id: log.id,
      action: log.action,
      resourceType: log.resource_type,
      oldValues: log.old_values ? JSON.parse(log.old_values) : null,
      newValues: log.new_values ? JSON.parse(log.new_values) : null,
      ipAddress: log.ip_address,
      performedBy: log.performed_by,
      createdAt: log.created_at
    }));

  } catch (error) {
    console.error('❌ Get user audit logs error:', error);
    throw error;
  }
};

/**
 * Get all audit logs with filters (admin only)
 * @param {Object} filters - Filter options
 * @param {string} filters.action - Filter by action type
 * @param {string} filters.resourceId - Filter by resource ID
 * @param {string} filters.userId - Filter by admin user ID
 * @param {number} filters.limit - Number of logs to retrieve
 * @param {number} filters.offset - Offset for pagination
 */
const getAllAuditLogs = async ({
  action = null,
  resourceId = null,
  userId = null,
  limit = 50,
  offset = 0
}) => {
  try {
    const result = await query(
      auditQueries.getAllAuditLogs,
      [action, resourceId, userId, limit, offset],
      'Get all audit logs'
    );

    return result.rows.map(log => ({
      id: log.id,
      action: log.action,
      resourceType: log.resource_type,
      resourceId: log.resource_id,
      oldValues: log.old_values ? JSON.parse(log.old_values) : null,
      newValues: log.new_values ? JSON.parse(log.new_values) : null,
      ipAddress: log.ip_address,
      performedBy: log.performed_by,
      targetUserEmail: log.target_user_email,
      createdAt: log.created_at
    }));

  } catch (error) {
    console.error('❌ Get all audit logs error:', error);
    throw error;
  }
};

/**
 * Common audit actions for consistency
 */
const AUDIT_ACTIONS = {
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_ACTIVATED: 'USER_ACTIVATED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  USER_DELETED: 'USER_DELETED',
  USER_RESTORED: 'USER_RESTORED',
  USER_STATUS_CHANGED: 'USER_STATUS_CHANGED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_PROFILE_UPDATED: 'USER_PROFILE_UPDATED'
};

/**
 * Resource types for consistency
 */
const RESOURCE_TYPES = {
  USER: 'user',
  ROLE: 'role',
  SYSTEM: 'system'
};

module.exports = {
  logAdminAction,
  getUserAuditLogs,
  getAllAuditLogs,
  AUDIT_ACTIONS,
  RESOURCE_TYPES
};