/**
 * User Controller
 * User profile and session management
 */

const { query } = require('../config/database');
const { userQueries, authQueries } = require('../database/queries');

/**
 * Get user profile
 * GET /api/v1/user/profile
 */
const getProfile = async (req, res) => {
  try {
    // User info is already attached by auth middleware
    const user = req.user;

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          profilePictureUrl: user.profilePictureUrl,
          role: user.role,
          permissions: user.permissions,
          lastLogin: user.lastLogin
        }
      }
    });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update user profile
 * PUT /api/v1/user/profile
 */
const updateProfile = async (req, res) => {
  try {
    const { profilePictureUrl } = req.body;
    const userId = req.user.id;

    // Validate profile picture URL if provided
    if (profilePictureUrl && !/^https?:\/\/.+/.test(profilePictureUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid profile picture URL format'
      });
    }

    // Update user profile
    const result = await query(
      userQueries.updateProfile,
      [userId, profilePictureUrl || null],
      'Update user profile'
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updatedUser = result.rows[0];

    console.log(`👤 Profile updated for user: ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          emailVerified: updatedUser.email_verified,
          profilePictureUrl: updatedUser.profile_picture_url,
          lastLogin: updatedUser.last_login,
          createdAt: updatedUser.created_at,
          updatedAt: updatedUser.updated_at
        }
      }
    });

  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user active sessions
 * GET /api/v1/user/sessions
 */
const getUserSessions = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      userQueries.getUserSessions,
      [userId],
      'Get user sessions'
    );

    const sessions = result.rows.map(session => ({
      id: session.id,
      deviceInfo: session.device_info,
      ipAddress: session.ip_address,
      createdAt: session.created_at,
      lastUsed: session.last_used,
      expiresAt: session.expires_at,
      isActive: session.is_active
    }));

    res.status(200).json({
      success: true,
      message: 'Sessions retrieved successfully',
      data: {
        sessions,
        totalCount: sessions.length
      }
    });

  } catch (error) {
    console.error('❌ Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve sessions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a specific session
 * DELETE /api/v1/user/sessions/:sessionId
 */
const deleteSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    // Delete the session
    const result = await query(
      userQueries.deleteUserSession,
      [sessionId, userId],
      'Delete user session'
    );

    res.status(200).json({
      success: true,
      message: 'Session deleted successfully',
      data: {
        deletedSessionId: sessionId
      }
    });

  } catch (error) {
    console.error('❌ Delete session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Logout from all devices (delete all sessions)
 * POST /api/v1/user/logout-all
 */
const logoutAllDevices = async (req, res) => {
  try {
    const userId = req.user.id;

    // Deactivate all user sessions
    await query(
      authQueries.deactivateAllUserSessions,
      [userId],
      'Deactivate all user sessions'
    );

    console.log(`🚪 User ${req.user.email} logged out from all devices`);

    res.status(200).json({
      success: true,
      message: 'Logged out from all devices successfully'
    });

  } catch (error) {
    console.error('❌ Logout all devices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to logout from all devices',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user statistics
 * GET /api/v1/user/stats
 */
const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      userQueries.getUserStats,
      [userId],
      'Get user statistics'
    );

    const stats = result.rows[0];

    res.status(200).json({
      success: true,
      message: 'User statistics retrieved successfully',
      data: {
        stats: {
          sessionsLast7Days: parseInt(stats.sessions_last_7_days) || 0,
          totalSessions: parseInt(stats.total_sessions) || 0,
          lastLogin: req.user.lastLogin
        }
      }
    });

  } catch (error) {
    console.error('❌ Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getUserSessions,
  deleteSession,
  logoutAllDevices,
  getUserStats
};