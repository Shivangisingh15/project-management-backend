/**
 * Vercel Serverless Function Entry Point
 * Exports the Express app for serverless deployment
 */

require('dotenv').config();
require('express-async-errors');

const app = require('../src/app');
const { connectDatabase } = require('../src/config/database');

// Initialize database connection
let dbConnected = false;

const initDatabase = async () => {
  if (!dbConnected) {
    try {
      await connectDatabase();
      dbConnected = true;
      console.log('📦 Database connected for serverless function');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }
};

// Serverless function handler
module.exports = async (req, res) => {
  try {
    // Ensure database is connected
    await initDatabase();

    // Handle the request with Express app
    return app(req, res);
  } catch (error) {
    console.error('❌ Serverless function error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// For local development, also export the app
module.exports.app = app;