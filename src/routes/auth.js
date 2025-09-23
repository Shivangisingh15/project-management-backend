/**
 * Authentication Routes
 * OTP-based authentication endpoints
 */

const express = require('express');
const router = express.Router();

// Controllers
const authController = require('../controllers/authController');

// Middleware
const { authRateLimit } = require('../middleware/auth');

// Validation middleware (basic)
const validateEmail = (req, res, next) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email is required'
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address'
    });
  }

  next();
};

const validateOTP = (req, res, next) => {
  const { email, otp, type } = req.body;

  if (!email || !otp || !type) {
    return res.status(400).json({
      success: false,
      message: 'Email, OTP, and type are required'
    });
  }

  if (!/^[0-9]{6}$/.test(otp)) {
    return res.status(400).json({
      success: false,
      message: 'OTP must be a 6-digit number'
    });
  }

  if (!['login', 'registration'].includes(type)) {
    return res.status(400).json({
      success: false,
      message: 'Type must be either "login" or "registration"'
    });
  }

  next();
};

const validateRefreshToken = (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: 'Refresh token is required'
    });
  }

  next();
};

// ============ GET ROUTES (FIXES THE 404 ISSUES) ============

/**
 * @route   GET /api/v1/auth
 * @desc    Get authentication API information
 * @access  Public
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Authentication API',
    version: '1.0.0',
    service: 'auth',
    timestamp: new Date().toISOString(),
    endpoints: {
      'POST /send-otp': {
        description: 'Send OTP to email for login or registration',
        body: { email: 'user@example.com', type: 'login' },
        rateLimit: '1 request per minute'
      },
      'POST /verify-otp': {
        description: 'Verify OTP and authenticate user',
        body: { email: 'user@example.com', otp: '123456', type: 'login' },
        rateLimit: '5 requests per 15 minutes'
      },
      'POST /refresh-token': {
        description: 'Refresh access token using refresh token',
        body: { refreshToken: 'jwt-refresh-token' }
      },
      'POST /logout': {
        description: 'Logout user and invalidate refresh token',
        body: { refreshToken: 'jwt-refresh-token' }
      },
      'GET /status': {
        description: 'Check authentication service status'
      },
      'GET /me': {
        description: 'Get current authenticated user information',
        headers: { Authorization: 'Bearer <access-token>' }
      }
    },
    status: 'active'
  });
});

/**
 * @route   GET /api/v1/auth/status
 * @desc    Check authentication service status
 * @access  Public
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'Authentication service is running',
    service: 'auth',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())} seconds`,
    environment: process.env.NODE_ENV || 'development',
    rateLimit: {
      global: '100 requests per 15 minutes',
      auth: '5 requests per 15 minutes',
      otp: '1 request per minute'
    }
  });
});

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current authenticated user information
 * @access  Private (requires valid JWT token)
 */
router.get('/me', async (req, res) => {
  try {
    // Check for token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        example: 'Authorization: Bearer <your-access-token>'
      });
    }

    // Verify token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    // Get user from database
    const { query } = require('../config/database');
    const result = await query(
      'SELECT id, email, first_name, last_name, is_active, email_verified, created_at, last_login FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      message: 'User information retrieved successfully',
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        isActive: user.is_active,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
        lastLogin: user.last_login
      },
      tokenInfo: {
        issuedAt: new Date(decoded.iat * 1000),
        expiresAt: new Date(decoded.exp * 1000),
        timeToExpiry: `${decoded.exp - Math.floor(Date.now() / 1000)} seconds`
      }
    });

  } catch (error) {
    console.error('❌ Get current user error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user information'
    });
  }
});

// ============ POST ROUTES (YOUR EXISTING ROUTES) ============

/**
 * @route   POST /api/v1/auth/send-otp
 * @desc    Send OTP to email for login or registration
 * @access  Public
 * @body    { email, type }
 */
router.post('/send-otp', 
  authRateLimit,
  validateEmail,
  authController.sendOTP
);

/**
 * @route   POST /api/v1/auth/verify-otp
 * @desc    Verify OTP and authenticate user
 * @access  Public  
 * @body    { email, otp, type }
 */
router.post('/verify-otp',
  authRateLimit,
  validateOTP,
  authController.verifyOTP
);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh access token using refresh token
 * @access  Public
 * @body    { refreshToken }
 */
router.post('/refresh-token',
  validateRefreshToken,
  authController.refreshToken
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user (invalidate refresh token)
 * @access  Public
 * @body    { refreshToken }
 */
router.post('/logout',
  validateRefreshToken,
  authController.logout
);

// ============ METHOD NOT ALLOWED HANDLERS ============

// Handle GET requests to POST-only endpoints with proper method not allowed responses
router.get('/send-otp', (req, res) => {
  res.status(405).json({
    success: false,
    message: 'Method Not Allowed. Use POST instead.',
    allowedMethods: ['POST'],
    endpoint: 'POST /api/v1/auth/send-otp',
    body: { email: 'user@example.com', type: 'login' }
  });
});

router.get('/verify-otp', (req, res) => {
  res.status(405).json({
    success: false,
    message: 'Method Not Allowed. Use POST instead.',
    allowedMethods: ['POST'],
    endpoint: 'POST /api/v1/auth/verify-otp',
    body: { email: 'user@example.com', otp: '123456', type: 'login' }
  });
});

router.get('/refresh-token', (req, res) => {
  res.status(405).json({
    success: false,
    message: 'Method Not Allowed. Use POST instead.',
    allowedMethods: ['POST'],
    endpoint: 'POST /api/v1/auth/refresh-token',
    body: { refreshToken: 'jwt-refresh-token' }
  });
});

router.get('/logout', (req, res) => {
  res.status(405).json({
    success: false,
    message: 'Method Not Allowed. Use POST instead.',
    allowedMethods: ['POST'],
    endpoint: 'POST /api/v1/auth/logout',
    body: { refreshToken: 'jwt-refresh-token' }
  });
});

// ============ CATCH-ALL HANDLER (UPDATED) ============

// Catch-all for any other auth routes
router.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Auth endpoint ${req.method} ${req.originalUrl} not found`,
    availableEndpoints: {
      GET: [
        'GET /api/v1/auth - API information',
        'GET /api/v1/auth/status - Service status',
        'GET /api/v1/auth/me - Current user info (requires token)'
      ],
      POST: [
        'POST /api/v1/auth/send-otp - Send OTP',
        'POST /api/v1/auth/verify-otp - Verify OTP',
        'POST /api/v1/auth/refresh-token - Refresh token',
        'POST /api/v1/auth/logout - Logout'
      ]
    },
    tip: 'Check the HTTP method and endpoint spelling'
  });
});

module.exports = router;