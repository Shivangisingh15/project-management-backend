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

  // Create user session
  createSession: `
    INSERT INTO user_sessions (user_id, refresh_token, device_info, ip_address, expires_at, created_at) 
    VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) 
    RETURNING id, user_id, expires_at
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

module.exports = {
  authQueries,
  userQueries,
  systemQueries
};