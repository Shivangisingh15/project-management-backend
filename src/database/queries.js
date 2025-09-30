/**
 * Database Queries
 * All SQL queries organized by feature
 */

// =============================================================================
// AUTHENTICATION QUERIES
// =============================================================================

const authQueries = {
  // Create new user
  createUser: `
    INSERT INTO users (email, email_verified, role_id, created_at) 
    VALUES ($1, $2, $3, CURRENT_TIMESTAMP) 
    RETURNING id, email, email_verified, role_id, created_at
  `,

  // Get user by email
  getUserByEmail: `
    SELECT u.*, r.name as role_name, r.permissions as role_permissions
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.email = $1 AND u.is_active = true
  `,

  // Get user by ID
  getUserById: `
    SELECT u.*, r.name as role_name, r.permissions as role_permissions
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.id = $1 AND u.is_active = true
  `,

  // Update last login
  updateLastLogin: `
    UPDATE users 
    SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
    WHERE id = $1
  `,

  // Create OTP
  createOTP: `
    INSERT INTO otp_verifications (email, otp_code, otp_type, expires_at, created_at) 
    VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) 
    RETURNING id, email, otp_type, expires_at
  `,

  // Get valid OTP
  getValidOTP: `
    SELECT * FROM otp_verifications 
    WHERE email = $1 
      AND otp_code = $2 
      AND otp_type = $3 
      AND expires_at > CURRENT_TIMESTAMP 
      AND is_verified = false 
      AND attempts < max_attempts
    ORDER BY created_at DESC 
    LIMIT 1
  `,

  // Mark OTP as verified
  verifyOTP: `
    UPDATE otp_verifications 
    SET is_verified = true 
    WHERE id = $1 
    RETURNING id, email, otp_type
  `,

  // Clean expired OTPs
  cleanExpiredOTPs: `
    DELETE FROM otp_verifications
    WHERE expires_at < CURRENT_TIMESTAMP OR is_verified = true
  `,

  // Increment OTP attempts
  incrementOTPAttempts: `
    UPDATE otp_verifications
    SET attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP
    WHERE email = $1 AND otp_code = $2 AND otp_type = $3 AND is_verified = false
  `,

  // Create user session
  createSession: `
    INSERT INTO user_sessions (user_id, refresh_token, device_info, ip_address, expires_at, created_at) 
    VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) 
    RETURNING id, user_id, expires_at
  `,

  // Get session by refresh token
  getSessionByToken: `
    SELECT s.*, u.email, u.id as user_id
    FROM user_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.refresh_token = $1 AND s.is_active = true AND s.expires_at > CURRENT_TIMESTAMP
  `,

  // Update session last used
  updateSessionLastUsed: `
    UPDATE user_sessions
    SET last_used = CURRENT_TIMESTAMP
    WHERE id = $1
  `,

  // Deactivate session (logout)
  deactivateSession: `
    UPDATE user_sessions
    SET is_active = false
    WHERE refresh_token = $1
  `
};

// =============================================================================
// USER MANAGEMENT QUERIES
// =============================================================================

const userQueries = {
  // Update user profile
  updateProfile: `
    UPDATE users 
    SET profile_picture_url = COALESCE($2, profile_picture_url),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 
    RETURNING id, email, email_verified, profile_picture_url, last_login, created_at, updated_at
  `,

  // Get user sessions
  getUserSessions: `
    SELECT id, device_info, ip_address, created_at, last_used, expires_at, is_active
    FROM user_sessions 
    WHERE user_id = $1 AND is_active = true 
    ORDER BY last_used DESC
  `
};

// =============================================================================
// SYSTEM QUERIES
// =============================================================================

const systemQueries = {
  // Database health check
  healthCheck: `
    SELECT 
      'healthy' as status,
      NOW() as timestamp,
      version() as db_version
  `,

  // Get database stats
  getDatabaseStats: `
    SELECT 
      (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
      (SELECT COUNT(*) FROM user_sessions WHERE is_active = true) as active_sessions
  `
};

// =============================================================================
// ADMIN MANAGEMENT QUERIES
// =============================================================================

const adminQueries = {
  // Create user by admin
  createUserByAdmin: `
    INSERT INTO users (
      email,
      profile_picture_url,
      role_id,
      email_verified,
      is_active,
      created_by,
      created_at
    )
    VALUES ($1, $2, $3, true, true, $4, CURRENT_TIMESTAMP)
    RETURNING
      id,
      email,
      profile_picture_url,
      employee_id,
      role_id,
      email_verified,
      is_active,
      created_by,
      created_at
  `,

  // Get all users with pagination and filters
  getAllUsers: `
    SELECT
      u.id,
      u.email,
      u.profile_picture_url,
      u.employee_id,
      u.role_id,
      r.name as role_name,
      u.email_verified,
      u.is_active,
      u.last_login,
      u.created_at,
      u.updated_at,
      creator.email as created_by_email,
      CASE WHEN u.created_by IS NOT NULL THEN true ELSE false END as is_admin_created
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    LEFT JOIN users creator ON u.created_by = creator.id
    WHERE u.deleted_at IS NULL
      AND ($1::INTEGER IS NULL OR u.role_id = $1)
      AND ($2::BOOLEAN IS NULL OR u.is_active = $2)
      AND ($3::TEXT IS NULL OR u.email ILIKE '%' || $3 || '%' OR u.employee_id ILIKE '%' || $3 || '%')
    ORDER BY u.created_at DESC
    LIMIT $4 OFFSET $5
  `,

  // Count users for pagination
  countUsers: `
    SELECT COUNT(*) as total
    FROM users u
    WHERE u.deleted_at IS NULL
      AND ($1::INTEGER IS NULL OR u.role_id = $1)
      AND ($2::BOOLEAN IS NULL OR u.is_active = $2)
      AND ($3::TEXT IS NULL OR u.email ILIKE '%' || $3 || '%' OR u.employee_id ILIKE '%' || $3 || '%')
  `,

  // Get user by ID (admin view with all details)
  getUserByIdAdmin: `
    SELECT
      u.id,
      u.email,
      u.profile_picture_url,
      u.employee_id,
      u.role_id,
      r.name as role_name,
      r.description as role_description,
      u.email_verified,
      u.is_active,
      u.last_login,
      u.created_at,
      u.updated_at,
      u.created_by,
      creator.email as created_by_email,
      u.deleted_at,
      deleter.email as deleted_by_email
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    LEFT JOIN users creator ON u.created_by = creator.id
    LEFT JOIN users deleter ON u.deleted_by = deleter.id
    WHERE u.id = $1
  `,

  // Update user status (activate/deactivate)
  updateUserStatus: `
    UPDATE users
    SET
      is_active = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND deleted_at IS NULL
    RETURNING
      id,
      email,
      employee_id,
      is_active,
      updated_at
  `,

  // Update user profile by admin
  updateUserByAdmin: `
    UPDATE users
    SET
      email = COALESCE($2, email),
      profile_picture_url = COALESCE($3, profile_picture_url),
      role_id = COALESCE($4, role_id),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND deleted_at IS NULL
    RETURNING
      id,
      email,
      profile_picture_url,
      employee_id,
      role_id,
      updated_at
  `,

  // Soft delete user
  softDeleteUser: `
    UPDATE users
    SET
      deleted_at = CURRENT_TIMESTAMP,
      deleted_by = $2,
      is_active = false,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND deleted_at IS NULL
    RETURNING
      id,
      email,
      employee_id,
      deleted_at
  `,

  // Restore deleted user
  restoreUser: `
    UPDATE users
    SET
      deleted_at = NULL,
      deleted_by = NULL,
      is_active = true,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND deleted_at IS NOT NULL
    RETURNING
      id,
      email,
      employee_id,
      is_active,
      updated_at
  `,

  // Get user statistics
  getUserStatistics: `
    SELECT
      COUNT(*) as total_users,
      COUNT(CASE WHEN is_active = true AND deleted_at IS NULL THEN 1 END) as active_users,
      COUNT(CASE WHEN is_active = false AND deleted_at IS NULL THEN 1 END) as inactive_users,
      COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as deleted_users,
      COUNT(CASE WHEN created_by IS NOT NULL THEN 1 END) as admin_created_users,
      COUNT(CASE WHEN created_by IS NULL THEN 1 END) as self_registered_users,
      COUNT(CASE WHEN role_id = 1 THEN 1 END) as admin_users,
      COUNT(CASE WHEN role_id = 2 THEN 1 END) as manager_users,
      COUNT(CASE WHEN role_id = 3 THEN 1 END) as regular_users
    FROM users
  `,

  // Check if email exists (for validation)
  checkEmailExists: `
    SELECT id, email, deleted_at IS NOT NULL as is_deleted
    FROM users
    WHERE email = $1
  `,

  // Check if employee_id exists (for validation)
  checkEmployeeIdExists: `
    SELECT id, employee_id, deleted_at IS NOT NULL as is_deleted
    FROM users
    WHERE employee_id = $1
  `
};

// =============================================================================
// AUDIT LOG QUERIES
// =============================================================================

const auditQueries = {
  // Create audit log
  createAuditLog: `
    INSERT INTO audit_logs (
      user_id,
      action,
      resource_type,
      resource_id,
      old_values,
      new_values,
      ip_address,
      user_agent,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
    RETURNING id, action, resource_type, created_at
  `,

  // Get audit logs for a user
  getUserAuditLogs: `
    SELECT
      al.id,
      al.action,
      al.resource_type,
      al.old_values,
      al.new_values,
      al.ip_address,
      al.created_at,
      u.email as performed_by
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE al.resource_id = $1
    ORDER BY al.created_at DESC
    LIMIT $2 OFFSET $3
  `,

  // Get all audit logs (admin only)
  getAllAuditLogs: `
    SELECT
      al.id,
      al.action,
      al.resource_type,
      al.resource_id,
      al.old_values,
      al.new_values,
      al.ip_address,
      al.created_at,
      u.email as performed_by,
      target_user.email as target_user_email
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    LEFT JOIN users target_user ON al.resource_id::UUID = target_user.id
    WHERE ($1::TEXT IS NULL OR al.action ILIKE '%' || $1 || '%')
      AND ($2::UUID IS NULL OR al.resource_id = $2::TEXT)
      AND ($3::UUID IS NULL OR al.user_id = $3)
    ORDER BY al.created_at DESC
    LIMIT $4 OFFSET $5
  `
};

module.exports = {
  authQueries,
  userQueries,
  systemQueries,
  adminQueries,
  auditQueries,
  
};