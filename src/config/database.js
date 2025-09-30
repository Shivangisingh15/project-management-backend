/**
 * Database Configuration
 * Integrates with your existing database/connection.js
 */

// Import the main database connection (your existing file)
const {
  connectDatabase,
  closeDatabase,
  getPool,
  query,
  healthCheck
} = require('../database/connection');

// Add any additional configuration or helpers here
const testConnection = async () => {
  try {
    console.log('🔌 Testing database connection...');
    const result = await query('SELECT NOW() as current_time, version() as db_version');
    console.log('✅ Database connected successfully');
    console.log(`📅 Database time: ${result.rows[0].current_time}`);
    console.log(`🐘 PostgreSQL version: ${result.rows[0].db_version.split(',')[0]}`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
};

// Get pool statistics for monitoring
const getPoolStats = () => {
  const pool = getPool();
  if (pool) {
    return {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    };
  }
  return null;
};

// Transaction helper function
const transaction = async (callback) => {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Export everything including your existing functions
module.exports = {
  // Your existing functions
  connectDatabase,
  closeDatabase,
  getPool,
  query,
  healthCheck,
  
  // Additional helper functions
  testConnection,
  getPoolStats,
  transaction
};