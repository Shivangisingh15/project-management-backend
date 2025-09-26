/**
 * Express Application Setup
 * OTP-based authentication system
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const healthController = require('./controllers/healthController');

// Create Express app
const app = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5175'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};

app.use(cors(corsOptions));
app.use(compression());

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', globalLimiter);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============ ROOT ROUTE (FIXES THE 404) ============
app.get('/', (req, res) => {
  const API_VERSION = process.env.API_VERSION || 'v1';
  
  res.json({
    success: true,
    message: 'Welcome to Your Professional API',
    version: '1.0.0',
    service: 'OTP Authentication Backend',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: `${Math.floor(process.uptime())} seconds`,
    documentation: {
      swagger: `/api/${API_VERSION}/docs`,
      health: '/health'
    },
    endpoints: {
      authentication: {
        base: `/api/${API_VERSION}/auth`,
        description: 'OTP-based authentication system',
        routes: [
          'GET  /auth - API information and documentation',
          'GET  /auth/status - Service health status',
          'GET  /auth/me - Current user info (requires token)',
          'POST /auth/send-otp - Send OTP for login/registration',
          'POST /auth/verify-otp - Verify OTP and get tokens',
          'POST /auth/refresh-token - Refresh access token',
          'POST /auth/logout - Logout user'
        ]
      },
      user: {
        base: `/api/${API_VERSION}/user`,
        description: 'User profile management',
        routes: [
          'GET /user - User API information',
          'GET /user/profile - Get user profile (requires token)',
          'PUT /user/profile - Update profile (requires token)'
        ]
      },
      system: {
        health: '/health - System health check and database status',
        docs: `/api/${API_VERSION}/docs - Complete API documentation`,
        root: '/ - This information page'
      }
    },
    quickStart: {
      step1: 'POST /api/v1/auth/send-otp with { "email": "your@email.com", "type": "login" }',
      step2: 'Check your email for OTP',
      step3: 'POST /api/v1/auth/verify-otp with { "email": "your@email.com", "otp": "123456", "type": "login" }',
      step4: 'Use the returned access token in Authorization header: "Bearer <token>"'
    },
    techStack: {
      runtime: 'Node.js',
      framework: 'Express.js',
      database: 'PostgreSQL (Neon.tech)',
      authentication: 'JWT + OTP',
      deployment: 'Vercel'
    },
    status: 'running'
  });
});

// Health check endpoint
app.get('/health', healthController.checkHealth);

// API routes
const API_VERSION = process.env.API_VERSION || 'v1';
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/user`, userRoutes);

// API documentation (enhanced)
app.get(`/api/${API_VERSION}/docs`, (req, res) => {
  res.json({
    title: 'OTP Authentication API Documentation',
    version: '1.0.0',
    description: 'Professional OTP-based authentication system with user management',
    baseUrl: `${req.protocol}://${req.get('host')}/api/${API_VERSION}`,
    timestamp: new Date().toISOString(),
    authentication: {
      type: 'JWT Bearer Token',
      description: 'Include token in Authorization header: "Bearer <your-token>"',
      tokenExpiry: '15 minutes (access token), 7 days (refresh token)'
    },
    rateLimit: {
      global: '100 requests per 15 minutes',
      auth: '5 requests per 15 minutes',
      otp: '1 request per minute'
    },
    endpoints: {
      authentication: {
        'GET /auth': {
          description: 'Get authentication API information',
          access: 'Public',
          response: 'API documentation and available endpoints'
        },
        'GET /auth/status': {
          description: 'Check authentication service status',
          access: 'Public',
          response: 'Service health and uptime information'
        },
        'GET /auth/me': {
          description: 'Get current authenticated user information',
          access: 'Private (requires token)',
          headers: { Authorization: 'Bearer <access-token>' },
          response: 'User profile and token information'
        },
        'POST /auth/send-otp': {
          description: 'Send OTP to email (registration/login)',
          access: 'Public',
          body: { 
            email: 'user@example.com', 
            type: 'login or registration' 
          },
          response: 'Success message, OTP sent to email'
        },
        'POST /auth/verify-otp': {
          description: 'Verify OTP and get authentication tokens',
          access: 'Public',
          body: { 
            email: 'user@example.com', 
            otp: '123456', 
            type: 'login or registration' 
          },
          response: 'Access token, refresh token, and user information'
        },
        'POST /auth/refresh-token': {
          description: 'Refresh expired access token',
          access: 'Public',
          body: { refreshToken: 'jwt-refresh-token' },
          response: 'New access token'
        },
        'POST /auth/logout': {
          description: 'Logout user and invalidate tokens',
          access: 'Public',
          body: { refreshToken: 'jwt-refresh-token' },
          response: 'Success message'
        }
      },
      user: {
        'GET /user': {
          description: 'Get user API information',
          access: 'Private (requires token)',
          headers: { Authorization: 'Bearer <access-token>' },
          response: 'User API documentation'
        },
        'GET /user/profile': {
          description: 'Get complete user profile',
          access: 'Private (requires token)',
          headers: { Authorization: 'Bearer <access-token>' },
          response: 'Complete user profile information'
        },
        'PUT /user/profile': {
          description: 'Update user profile information',
          access: 'Private (requires token)',
          headers: { Authorization: 'Bearer <access-token>' },
          body: { 
            firstName: 'John',
            lastName: 'Doe',
            profilePictureUrl: 'https://example.com/pic.jpg'
          },
          response: 'Updated profile information'
        }
      }
    },
    errorCodes: {
      400: 'Bad Request - Invalid input data',
      401: 'Unauthorized - Invalid or missing token',
      403: 'Forbidden - Access denied',
      404: 'Not Found - Endpoint does not exist',
      405: 'Method Not Allowed - Wrong HTTP method',
      429: 'Too Many Requests - Rate limit exceeded',
      500: 'Internal Server Error - Server error'
    },
    exampleUsage: {
      registration: {
        step1: 'POST /auth/send-otp',
        step2: 'POST /auth/verify-otp',
        step3: 'Use received access token for authenticated requests'
      },
      login: {
        step1: 'POST /auth/send-otp',
        step2: 'POST /auth/verify-otp',
        step3: 'Use received access token for authenticated requests'
      }
    }
  });
});

// Enhanced 404 handler
app.all('*', (req, res) => {
  const API_VERSION = process.env.API_VERSION || 'v1';
  
  // Check if it's an API route
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: `API endpoint ${req.method} ${req.originalUrl} not found`,
      suggestion: `Check available endpoints at /api/${API_VERSION}/docs`,
      availableEndpoints: {
        authentication: `/api/${API_VERSION}/auth`,
        user: `/api/${API_VERSION}/user`,
        documentation: `/api/${API_VERSION}/docs`,
        health: '/health'
      },
      tip: 'Make sure you are using the correct HTTP method (GET, POST, PUT, DELETE)'
    });
  }

  // For non-API routes (like frontend routes, static files, etc.)
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    type: 'Non-API route',
    availableRoutes: {
      root: '/ - API information and quick start guide',
      health: '/health - System health check',
      docs: `/api/${API_VERSION}/docs - Complete API documentation`,
      auth: `/api/${API_VERSION}/auth/* - Authentication endpoints`,
      user: `/api/${API_VERSION}/user/* - User management endpoints`
    },
    tip: 'This is a REST API backend. Visit / for available endpoints and documentation.'
  });
});

// Enhanced global error handler
app.use((error, req, res, next) => {
  const timestamp = new Date().toISOString();
  console.error(`❌ [${timestamp}] Global error:`, error);

  // Validation error
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details?.map(d => d.message) || [error.message],
      timestamp
    });
  }

  // JWT error
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      code: error.name,
      timestamp
    });
  }

  // CORS error
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation',
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5175'],
      timestamp
    });
  }

  // Database errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return res.status(503).json({
      success: false,
      message: 'Database connection failed',
      code: error.code,
      timestamp
    });
  }

  // Default error
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    timestamp,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: error.stack,
      details: error 
    })
  });
});

module.exports = app;