/**
 * Health Controller
 * System health check endpoints
 */

const { healthCheck } = require('../config/database');
const { query } = require('../config/database');
const { systemQueries } = require('../database/queries');
const { testEmailConfig } = require('../services/otpService');

/**
 * Basic health check
 * GET /health
 */
const checkHealth = async (req, res) => {
  try {
    const uptime = process.uptime();
    const timestamp = new Date().toISOString();

    res.status(200).json({
      success: true,
      status: 'healthy',
      timestamp,
      uptime: {
        seconds: Math.floor(uptime),
        formatted: formatUptime(uptime)
      },
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      services: {
        api: 'operational',
        database: 'checking...',
        email: 'checking...'
      }
    });

  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      message: 'Health check failed',
      error: error.message
    });
  }
};

/**
 * Detailed health check with database
 * GET /api/v1/health/detailed
 */
const detailedHealthCheck = async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Check database health
    const dbHealth = await healthCheck();
    
    // Check email service
    const emailHealth = await testEmailConfig();
    
    // Get database stats
    let dbStats = null;
    try {
      const statsResult = await query(
        systemQueries.getDatabaseStats,
        [],
        'Get database stats'
      );
      dbStats = statsResult.rows[0];
    } catch (error) {
      console.error('Failed to get database stats:', error.message);
    }

    const responseTime = Date.now() - startTime;
    const uptime = process.uptime();

    // Determine overall status
    const isHealthy = dbHealth.healthy && emailHealth;
    const status = isHealthy ? 'healthy' : 'degraded';
    const statusCode = isHealthy ? 200 : 503;

    res.status(statusCode).json({
      success: isHealthy,
      status,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      uptime: {
        seconds: Math.floor(uptime),
        formatted: formatUptime(uptime)
      },
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      services: {
        api: {
          status: 'operational',
          responseTime: `${responseTime}ms`
        },
        database: {
          status: dbHealth.healthy ? 'operational' : 'down',
          connectionCount: dbHealth.connectionCount || 0,
          idleCount: dbHealth.idleCount || 0,
          waitingCount: dbHealth.waitingCount || 0,
          lastChecked: dbHealth.timestamp
        },
        email: {
          status: emailHealth ? 'operational' : 'down',
          service: process.env.EMAIL_SERVICE || 'not-configured'
        }
      },
      statistics: dbStats ? {
        activeUsers: parseInt(dbStats.active_users) || 0,
        usersToday: parseInt(dbStats.users_today) || 0,
        activeSessions: parseInt(dbStats.active_sessions) || 0,
        pendingOTPs: parseInt(dbStats.pending_otps) || 0
      } : null
    });

  } catch (error) {
    console.error('❌ Detailed health check error:', error);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      message: 'Detailed health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Database-only health check
 * GET /api/v1/health/database
 */
const checkDatabase = async (req, res) => {
  try {
    const dbHealth = await healthCheck();

    if (dbHealth.healthy) {
      res.status(200).json({
        success: true,
        status: 'healthy',
        message: 'Database connection is healthy',
        data: {
          connectionCount: dbHealth.connectionCount || 0,
          idleCount: dbHealth.idleCount || 0,
          waitingCount: dbHealth.waitingCount || 0,
          timestamp: dbHealth.timestamp
        }
      });
    } else {
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        message: 'Database connection failed',
        error: dbHealth.error
      });
    }

  } catch (error) {
    console.error('❌ Database health check error:', error);
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Database health check failed',
      error: error.message
    });
  }
};

/**
 * Email service health check
 * GET /api/v1/health/email
 */
const checkEmail = async (req, res) => {
  try {
    const emailHealth = await testEmailConfig();

    if (emailHealth) {
      res.status(200).json({
        success: true,
        status: 'healthy',
        message: 'Email service is operational',
        data: {
          service: process.env.EMAIL_SERVICE || 'not-configured',
          configured: !!process.env.EMAIL_USER
        }
      });
    } else {
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        message: 'Email service is not operational',
        data: {
          service: process.env.EMAIL_SERVICE || 'not-configured',
          configured: !!process.env.EMAIL_USER
        }
      });
    }

  } catch (error) {
    console.error('❌ Email health check error:', error);
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Email health check failed',
      error: error.message
    });
  }
};

/**
 * Format uptime in human-readable format
 * @param {number} seconds - Uptime in seconds
 * @returns {string} Formatted uptime
 */
const formatUptime = (seconds) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0) parts.push(`${secs}s`);

  return parts.join(' ') || '0s';
};

module.exports = {
  checkHealth,
  detailedHealthCheck,
  checkDatabase,
  checkEmail
};