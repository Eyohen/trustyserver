// index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const db = require('./models');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const transcriptRoutes = require('./routes/transcript');
const orderRoutes = require('./routes/order');
const adminRoutes = require('./routes/admin');

const app = express();
const port = process.env.API_PORT || 9000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory');
}

// Middleware
app.use(cors());

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for uploaded content
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'TrustyTranscript API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'TrustyTranscript API',
    version: '1.0.0',
    description: 'Professional transcription service API',
    documentation: 'https://docs.trustytranscript.com',
    endpoints: {
      auth: '/api/auth - Authentication endpoints',
      users: '/api/users - User management',
      transcripts: '/api/transcripts - Transcription services',
      orders: '/api/orders - Order and payment management',
      admin: '/api/admin - Admin dashboard'
    },
    status: 'active'
  });
});

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const userAgent = req.get('User-Agent') || 'Unknown';
  const ip = req.ip || req.connection.remoteAddress;
  
  console.log(`${timestamp} - ${req.method} ${req.path} - IP: ${ip} - ${userAgent.substring(0, 50)}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/transcripts', transcriptRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  // Handle Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ 
      message: 'File too large. Maximum size is 2GB.',
      error: 'FILE_TOO_LARGE',
      maxSize: '2GB'
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ 
      message: 'Unexpected file field. Please check your form data.',
      error: 'UNEXPECTED_FILE'
    });
  }

  if (err.code === 'ENOENT') {
    return res.status(404).json({
      message: 'File not found',
      error: 'FILE_NOT_FOUND'
    });
  }

  // Handle Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      message: 'Validation error',
      errors: err.errors.map(e => ({ 
        field: e.path, 
        message: e.message,
        value: e.value 
      }))
    });
  }

  // Handle Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      message: 'Duplicate entry',
      field: err.errors[0]?.path,
      value: err.errors[0]?.value,
      error: 'DUPLICATE_ENTRY'
    });
  }

  // Handle Sequelize foreign key constraint errors
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      message: 'Invalid reference to related record',
      error: 'FOREIGN_KEY_CONSTRAINT'
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Invalid authentication token',
      error: 'INVALID_TOKEN'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Authentication token has expired',
      error: 'TOKEN_EXPIRED'
    });
  }

  // Handle express-validator errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      message: 'Invalid JSON format',
      error: 'INVALID_JSON'
    });
  }

  // Default error response
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Something went wrong!';
  
  res.status(status).json({
    message,
    error: process.env.NODE_ENV === 'development' ? err.stack : 'INTERNAL_SERVER_ERROR',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  });
});

// 404 handler for unmatched routes
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /api - API information',
      'GET /api/health - Health check',
      'POST /api/auth/register - User registration',
      'POST /api/auth/login - User login',
      'GET /api/orders/pricing - Calculate pricing',
      'GET /api/transcripts/stats - Transcript statistics'
    ],
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
  console.log(`📴 ${signal} received, shutting down gracefully...`);
  
  // Close database connections
  db.sequelize.close().then(() => {
    console.log('💾 Database connections closed');
    process.exit(0);
  }).catch((err) => {
    console.error('❌ Error closing database connections:', err);
    process.exit(1);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  // In production, you might want to restart the process
  if (process.env.NODE_ENV === 'production') {
    console.log('🔄 Restarting process due to unhandled rejection...');
    process.exit(1);
  }
});

// Uncaught exception handler
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  console.log('🛑 Process will exit...');
  process.exit(1);
});

// Database connection and server startup
const startServer = async () => {
  try {
    console.log('🚀 Starting TrustyTranscript API...');
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Test database connection
    await db.sequelize.authenticate();
    console.log(`✅ Database connection established successfully`);
    
    // Sync database based on environment
    if (process.env.NODE_ENV === 'development') {
      await db.sequelize.sync({ alter: true });
      console.log('✅ Database synchronized (development mode)');
    } else if (process.env.NODE_ENV === 'production') {
      // In production, only validate schema without changes
      await db.sequelize.sync({ validate: true });
      console.log('✅ Database schema validated (production mode)');
    } else {
      await db.sequelize.sync();
      console.log('✅ Database schema synced');
    }
    
    // Start HTTP server
    const server = app.listen(port, () => {
      console.log('');
      console.log('🎉 TrustyTranscript API Successfully Started!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🚀 Server running on port: ${port}`);
      console.log(`🌍 API URL: http://localhost:${port}/api`);
      console.log(`💚 Health check: http://localhost:${port}/api/health`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Database: Connected`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📚 Available endpoints:');
        console.log('   • POST /api/auth/register - User registration');
        console.log('   • POST /api/auth/login - User login');
        console.log('   • POST /api/auth/admin-login - Admin login');
        console.log('   • GET  /api/orders/pricing - Calculate pricing');
        console.log('   • POST /api/orders/create - Create order');
        console.log('   • POST /api/transcripts - Upload transcript');
        console.log('   • GET  /api/admin/analytics - Admin dashboard');
        console.log('');
      }
    });

    // Handle server errors
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is already in use`);
        console.log(`💡 Try: lsof -ti:${port} | xargs kill -9`);
      } else if (err.code === 'EACCES') {
        console.error(`❌ Permission denied to bind to port ${port}`);
        console.log(`💡 Try running with sudo or use a port > 1024`);
      } else {
        console.error('❌ Server error:', err.message);
      }
      process.exit(1);
    });

    // Handle server close
    server.on('close', () => {
      console.log('🛑 HTTP server closed');
    });

  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    
    if (err.name === 'SequelizeConnectionError' || err.name === 'SequelizeConnectionRefusedError') {
      console.error('');
      console.error('📡 Database Connection Failed!');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('🔧 Troubleshooting:');
      console.error('   1. Make sure PostgreSQL is running');
      console.error('   2. Check your database credentials in .env');
      console.error('   3. Verify database exists: createdb trusty_transcript_dev');
      console.error('   4. Test connection: psql -h localhost -U your_username -d trusty_transcript_dev');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } else if (err.code === 'ENOTFOUND') {
      console.error('❌ Database host not found. Check your DB_HOST in .env');
    } else {
      console.error('💥 Startup error details:', err);
    }
    
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;