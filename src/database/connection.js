/**
 * Database Connection
 * PostgreSQL connection setup for Neon.tech
 */

const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false,
    require: true,
    sslmode: 'require'
  },
  
  // Connection pool settings
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// Create connection pool
let pool = null;

/**
 * Initialize database connection
 */
const connectDatabase = async () => {
  try {
    if (pool) {
      console.log('⚠️  Database pool already exists');
      return pool;
    }

    pool = new Pool(dbConfig);

    // Test connection
    const client = await pool.connect();
    const result = await client.query('SELECT NOW(), version()');
    client.release();

    console.log('✅ Database connected successfully');
    console.log(`🗄️  Database: ${dbConfig.database}`);
    console.log(`🏠 Host: ${dbConfig.host}`);
    console.log(`⏰ Server time: ${result.rows[0].now}`);
    console.log(`🐘 PostgreSQL version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('❌ Unexpected database error:', err);
    });

    return pool;

  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    console.error('🔍 Check your database credentials in .env file');
    throw error;
  }
};

/**
 * Get database pool instance
 */
const getPool = () => {
  if (!pool) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return pool;
};

/**
 * Execute a query with error handling
 */
const query = async (text, params = [], operation = 'Database query') => {
  const start = Date.now();
  
  try {
    const pool = getPool();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    console.log(`✅ ${operation} completed in ${duration}ms - Rows: ${result.rowCount || 0}`);
    return result;
    
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`❌ ${operation} failed in ${duration}ms:`, error.message);
    throw error;
  }
};

/**
 * Close database connection
 */
const closeDatabase = async () => {
  if (pool) {
    try {
      await pool.end();
      pool = null;
      console.log('✅ Database connection closed');
    } catch (error) {
      console.error('❌ Error closing database connection:', error);
      throw error;
    }
  }
};

/**
 * Health check for database
 */
const healthCheck = async () => {
  try {
    const result = await query('SELECT 1 as healthy, NOW() as timestamp', [], 'Health check');
    return {
      healthy: true,
      timestamp: result.rows[0].timestamp,
      connectionCount: pool?.totalCount || 0,
      idleCount: pool?.idleCount || 0,
      waitingCount: pool?.waitingCount || 0
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  }
};

module.exports = {
  connectDatabase,
  closeDatabase,
  getPool,
  query,
  healthCheck
};