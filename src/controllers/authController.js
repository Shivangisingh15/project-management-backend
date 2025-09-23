/**
 * Authentication Controller - MODIFIED
 * OTP only for existing users in database
 */

const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { authQueries } = require('../database/queries');
const { 
  generateSecureOTP, 
  getOTPExpiration, 
  sendOTPEmail, 
  isValidOTPFormat 
} = require('../services/otpService');

/**
 * Send OTP to existing users only
 * POST /api/v1/auth/send-otp
 */
const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    const emailLower = email.toLowerCase();

    // 🔥 KEY CHANGE: Check if user exists in database
    const existingUser = await query(
      authQueries.getUserByEmail,
      [emailLower],
      'Check if user exists'
    );

    // 🚫 REJECT if user doesn't exist
    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Only existing users can receive OTP.',
        code: 'USER_NOT_FOUND'
      });
    }

    // ✅ User exists - proceed with OTP generation
    const user = existingUser.rows[0];

    // Check if user account is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'User account is deactivated',
        code: 'USER_DEACTIVATED'
      });
    }

    // Clean up expired OTPs
    await query(authQueries.cleanExpiredOTPs, [], 'Clean expired OTPs');

    // Generate OTP for existing user
    const otpCode = generateSecureOTP();
    const expiresAt = getOTPExpiration();

    // Save OTP to database
    const otpResult = await query(
      authQueries.createOTP,
      [emailLower, otpCode, 'login', expiresAt],
      'Create OTP for existing user'
    );

    // Send OTP email
    await sendOTPEmail(emailLower, otpCode, 'login');

    console.log(`📧 OTP sent to existing user: ${emailLower}`);

    res.status(200).json({
      success: true,
      message: `OTP sent to ${emailLower}`,
      data: {
        email: emailLower,
        type: 'login',
        expiresIn: `${process.env.OTP_EXPIRY_MINUTES || 10} minutes`,
        otpId: otpResult.rows[0].id,
        userExists: true
      }
    });

  } catch (error) {
    console.error('❌ Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verify OTP for existing users only
 * POST /api/v1/auth/verify-otp
 */
const verifyOTP = async (req, res) => {
  try {
const { email, otp, type = 'login' } = req.body;
    // Validate input
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    if (!isValidOTPFormat(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP format'
      });
    }

    const emailLower = email.toLowerCase();

    // 🔥 KEY CHANGE: Only verify for existing users
    const existingUser = await query(
      authQueries.getUserByEmail,
      [emailLower],
      'Get existing user for OTP verification'
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = existingUser.rows[0];

    // Find valid OTP
    const otpResult = await query(
      authQueries.getValidOTP,
      [emailLower, otp, 'login'],
      'Get valid OTP'
    );

    if (otpResult.rows.length === 0) {
      // Increment attempts for invalid OTP
      await query(
        authQueries.incrementOTPAttempts,
        [emailLower, otp, 'login'],
        'Increment OTP attempts'
      );

      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    const otpRecord = otpResult.rows[0];

    // Mark OTP as verified
    await query(
      authQueries.verifyOTP,
      [otpRecord.id],
      'Mark OTP as verified'
    );

    // Update last login
    await query(
      authQueries.updateLastLogin,
      [user.id],
      'Update last login'
    );

    console.log(`🔐 User logged in: ${emailLower}`);

    // Generate JWT tokens
    const accessToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role_name || 'user' 
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
    );

    const refreshToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email 
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    // Save refresh token session
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      platform: req.headers['sec-ch-ua-platform'] || 'unknown'
    };

    await query(
      authQueries.createSession,
      [user.id, refreshToken, JSON.stringify(deviceInfo), req.ip, sessionExpiresAt],
      'Create user session'
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.email_verified,
          profilePictureUrl: user.profile_picture_url,
          role: user.role_name || 'user',
          createdAt: user.created_at,
          lastLogin: user.last_login
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m'
        }
      }
    });

  } catch (error) {
    console.error('❌ Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Refresh access token
 * POST /api/v1/auth/refresh-token
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Check if session exists and is valid
    const sessionResult = await query(
      authQueries.getSessionByToken,
      [token],
      'Get session by token'
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session'
      });
    }

    const session = sessionResult.rows[0];

    // Update session last used
    await query(
      authQueries.updateSessionLastUsed,
      [session.id],
      'Update session last used'
    );

    // Get user details
    const userResult = await query(
      authQueries.getUserById,
      [decoded.userId],
      'Get user for refresh'
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Generate new access token
    const newAccessToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role_name || 'user' 
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
    );

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m'
      }
    });

  } catch (error) {
    console.error('❌ Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Logout user (invalidate refresh token)
 * POST /api/v1/auth/logout
 */
const logout = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Deactivate the session
    await query(
      authQueries.deactivateSession,
      [token],
      'Deactivate session'
    );

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to logout',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  sendOTP,
  verifyOTP,
  refreshToken,
  logout
};