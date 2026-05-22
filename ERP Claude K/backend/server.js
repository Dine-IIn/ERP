require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import configurations
const { sequelize, testConnection } = require('./config/database');
const { initializeSocket } = require('./services/socketService');
const apiRoutes = require('./routes/api');

// Initialize Express
const app = express();
const server = http.createServer(app);

// ==================== MIDDLEWARE ====================
// Security
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Static files
app.use('/uploads', express.static('uploads'));

// ==================== ROUTES ====================
app.use('/api/v1', apiRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Enterprise ERP API Server',
    version: '1.0.0',
    endpoints: {
      health: '/api/v1/health',
      auth: '/api/v1/auth',
      superAdmin: '/api/v1/super-admin',
      chat: '/api/v1/chat',
      expenses: '/api/v1/expenses'
    },
    documentation: '/api/v1/docs'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ==================== INITIALIZE SERVER ====================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }

    // Sync database models
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database models synchronized');
    }

    // Initialize Socket.io
    const io = initializeSocket(server);
    console.log('✅ Socket.io initialized');

    // Start server
    server.listen(PORT, () => {
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log('🚀 Enterprise ERP Server Started Successfully');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`📡 Server running on port: ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API URL: http://localhost:${PORT}/api/v1`);
      console.log(`💬 WebSocket URL: ws://localhost:${PORT}`);
      console.log(`📊 Database: Connected`);
      console.log('═══════════════════════════════════════════════════════');
      console.log('');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        sequelize.close();
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = { app, server };
