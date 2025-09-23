/**
 * Server Entry Point
 * Starts the Express server and connects to database
 */

require('dotenv').config();
require('express-async-errors');

const app = require('./app');
const { connectDatabase, closeDatabase } = require('./config/database');

const PORT = process.env.PORT || 5000;

// Start server function
async function startServer() {
  try {
    console.log('🚀 Starting server...');
    console.log(`📍 Environment: ${process.env.NODE_ENV}`);
    console.log(`🌐 Port: ${PORT}`);

    // Connect to database first
    await connectDatabase();

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log('');
      console.log('🎉 SERVER READY!');
      console.log(`🌍 Server: http://localhost:${PORT}`);
      console.log(`📚 API Docs: http://localhost:${PORT}/api/v1/docs`);
      console.log(`🏥 Health: http://localhost:${PORT}/health`);
      console.log('');
      console.log('📋 Available endpoints:');
      console.log('   POST /api/v1/auth/send-otp');
      console.log('   POST /api/v1/auth/verify-otp');
      console.log('   POST /api/v1/auth/refresh-token');
      console.log('   POST /api/v1/auth/logout');
      console.log('   GET  /api/v1/user/profile');
      console.log('');
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('✅ HTTP server closed');
        
        try {
          await closeDatabase();
          console.log('✅ Database connection closed');
          console.log('👋 Server shutdown complete');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error('❌ Unhandled Promise Rejection:', err);
      gracefulShutdown('unhandledRejection');
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error('❌ Uncaught Exception:', err);
      gracefulShutdown('uncaughtException');
    });

    return server;

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('🔍 Check your database connection and environment variables');
    process.exit(1);
  }
}

// Start the server
startServer();