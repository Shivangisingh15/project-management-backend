/**
 * Database Configuration
 * Simple re-export of database connection
 */

// Import the main database connection
const {
  connectDatabase,
  closeDatabase,
  getPool,
  query,
  healthCheck
} = require('../database/connection');

module.exports = {
  connectDatabase,
  closeDatabase,
  getPool,
  query,
  healthCheck
};