/**
 * User Routes
 * User profile and session management endpoints
 */

const express = require('express');
const router = express.Router();

// Controllers
const userController = require('../controllers/userController');
const healthController = require('../controllers/healthController');

// Middleware
const { verifyToken, requireEmailVerified } = require('../middleware/auth');

// Validation middleware
const validateProfileUpdate = (req, res, next) => {
  const { profilePictureUrl } = req.body;

  // If profilePictureUrl is provided, validate URL format
  if (profilePictureUrl && typeof profilePictureUrl !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Profile picture URL must be a string'
    });
  }

  if (profilePictureUrl && !/^https?:\/\/.+/.test(profilePictureUrl)) {
    return res.status(400).json({
      success: false,
      message: 'Profile picture URL must be a valid HTTP/HTTPS URL'
    });
  }

  next();
};

const validateSessionId = (req, res, next) => {
  const { sessionId } = req.params;

  if (!sessionId) {
    return res.status(400).json({
      success: false,
      message: 'Session ID is required'
    });
  }

  // Basic UUID validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(sessionId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid session ID format'
    });
  }

  next();
};

// Routes

/**
 * @route   GET /api/v1/user/profile
 * @desc    Get user profile information
 * @access  Private (JWT required)
 */
router.get('/profile',
  verifyToken,
  userController.getProfile
);

/**
 * @route   PUT /api/v1/user/profile
 * @desc    Update user profile information
 * @access  Private (JWT required)
 * @body    { profilePictureUrl? }
 */
router.put('/profile',
  verifyToken,
  validateProfileUpdate,
  userController.updateProfile
);

/**
 * @route   GET /api/v1/user/sessions
 * @desc    Get user's active sessions
 * @access  Private (JWT required)
 */
router.get('/sessions',
  verifyToken,
  userController.getUserSessions
);

/**
 * @route   DELETE /api/v1/user/sessions/:sessionId
 * @desc    Delete a specific user session
 * @access  Private (JWT required)
 * @param   {string} sessionId - Session ID to delete
 */
router.delete('/sessions/:sessionId',
  verifyToken,
  validateSessionId,
  userController.deleteSession
);

/**
 * @route   POST /api/v1/user/logout-all
 * @desc    Logout from all devices (delete all sessions)
 * @access  Private (JWT required)
 */
router.post('/logout-all',
  verifyToken,
  userController.logoutAllDevices
);

/**
 * @route   GET /api/v1/user/stats
 * @desc    Get user statistics
 * @access  Private (JWT required)
 */
router.get('/stats',
  verifyToken,
  userController.getUserStats
);

// Health check routes (can be accessed without authentication)

/**
 * @route   GET /api/v1/user/health
 * @desc    Basic health check
 * @access  Public
 */
router.get('/health', healthController.checkHealth);

/**
 * @route   GET /api/v1/user/health/detailed
 * @desc    Detailed health check with database and email service
 * @access  Public
 */
router.get('/health/detailed', healthController.detailedHealthCheck);

/**
 * @route   GET /api/v1/user/health/database
 * @desc    Database health check
 * @access  Public
 */
router.get('/health/database', healthController.checkDatabase);

/**
 * @route   GET /api/v1/user/health/email
 * @desc    Email service health check
 * @access  Public
 */
router.get('/health/email', healthController.checkEmail);

// Catch-all for any other user routes
router.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `User endpoint ${req.originalUrl} not found`,
    availableEndpoints: [
      'GET /api/v1/user/profile',
      'PUT /api/v1/user/profile',
      'GET /api/v1/user/sessions',
      'DELETE /api/v1/user/sessions/:sessionId',
      'POST /api/v1/user/logout-all',
      'GET /api/v1/user/stats',
      'GET /api/v1/user/health',
      'GET /api/v1/user/health/detailed',
      'GET /api/v1/user/health/database',
      'GET /api/v1/user/health/email'
    ]
  });
});

module.exports = router;