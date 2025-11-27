const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const app = express();

// Permanent environment validation with fallbacks
const getEnvVar = (key, defaultValue, isCritical = false) => {
  const value = process.env[key] || defaultValue;
  
  if (!value && isCritical) {
    console.error(`💥 CRITICAL: Missing required environment variable: ${key}`);
    console.error('   The application cannot start without this variable.');
    process.exit(1);
  }
  
  if (!value) {
    console.warn(`⚠️  Warning: Missing environment variable: ${key} - using fallback`);
  } else {
    console.log(`✅ ${key}: Set`);
  }
  
  return value;
};

console.log('🔧 Environment Check:');

// Get environment variables with fallbacks
const MONGODB_URI = getEnvVar('MONGODB_URI', null, true); // Critical
const SESSION_SECRET = getEnvVar('SESSION_SECRET', 'fallback-session-secret-change-in-production');
const NODE_ENV = getEnvVar('NODE_ENV', 'development');
const PORT = getEnvVar('PORT', '3000');

// OAuth configuration (optional)
const GOOGLE_CLIENT_ID = getEnvVar('GOOGLE_CLIENT_ID', '');
const GOOGLE_CLIENT_SECRET = getEnvVar('GOOGLE_CLIENT_SECRET', '');
const isOAuthConfigured = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && 
                          !GOOGLE_CLIENT_ID.includes('your_actual') && 
                          !GOOGLE_CLIENT_SECRET.includes('your_actual');

if (isOAuthConfigured) {
  console.log('✅ OAuth is properly configured');
} else {
  console.log('🔒 OAuth is disabled - missing or invalid configuration');
}

// CORS configuration - FIXED
app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://localhost:3000', 
        'https://book-collection-api-0vgp.onrender.com',
        'https://book-collection-api-0vgp.onrender.com/'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());
app.use(express.static('public'));

// Session configuration with MemoryStore acknowledgment
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    store: new session.MemoryStore() // Explicitly using MemoryStore
}));

// Add note about MemoryStore for production
if (NODE_ENV === 'production') {
    console.log('📝 Note: Using MemoryStore for sessions - acceptable for this assignment scope');
}

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Import passport config AFTER session and passport initialization
require('./config/passport');

// Make user available to all routes
app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});

// ===== AUTHENTICATION ROUTES =====
if (isOAuthConfigured) {
  // OAuth routes when properly configured
  app.get('/auth/google',
    passport.authenticate('google', { 
      scope: ['email', 'profile'] 
    })
  );

  app.get('/auth/google/callback',
    passport.authenticate('google', {
      successRedirect: '/api-docs',
      failureRedirect: '/auth/failure'
    })
  );
  
  console.log('✅ OAuth authentication routes enabled');
} else {
  // Fallback routes when OAuth is not configured
  app.get('/auth/google', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'OAuth authentication not available',
      reason: 'Google OAuth credentials not configured',
      instructions: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables in Render dashboard',
      renderDashboard: 'https://dashboard.render.com/'
    });
  });

  app.get('/auth/google/callback', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'OAuth callback not available',
      reason: 'Google OAuth not configured in production'
    });
  });
  
  console.log('🔒 OAuth authentication routes disabled (fallback mode)');
}

// These routes always work
app.get('/auth/failure', (req, res) => {
  res.status(401).json({ 
    success: false,
    message: 'Authentication failed',
    configured: isOAuthConfigured,
    note: !isOAuthConfigured ? 'OAuth is not configured in this environment' : 'Please try logging in again'
  });
});

app.get('/auth/logout', (req, res) => {
  req.logout(function(err) {
    if (err) { 
      return res.status(500).json({ 
        success: false,
        message: 'Logout error' 
      }); 
    }
    res.json({ 
      success: true, 
      message: 'Successfully logged out',
      note: 'Session cleared from MemoryStore'
    });
  });
});

app.get('/auth/check', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ 
      success: true,
      authenticated: true,
      user: req.user,
      oauthConfigured: isOAuthConfigured,
      sessionStore: 'MemoryStore'
    });
  } else {
    res.json({ 
      success: true,
      authenticated: false,
      user: null,
      oauthConfigured: isOAuthConfigured,
      sessionStore: 'MemoryStore',
      note: !isOAuthConfigured ? 'OAuth not configured in production environment' : 'Please log in to access protected routes'
    });
  }
});

// Basic routes
app.get('/', (req, res) => {
  const response = {
    message: '📚 Book Collection API',
    version: '1.0.0',
    description: 'A complete CRUD API for managing books and authors',
    environment: NODE_ENV,
    oauthConfigured: isOAuthConfigured,
    authenticated: req.isAuthenticated() || false,
    user: req.isAuthenticated() ? req.user.displayName : null,
    sessionStore: 'MemoryStore',
    endpoints: {
      'Books': '/api/books',
      'Authors': '/api/authors', 
      'Health check': '/health',
      'API Documentation': '/api-docs',
      'Authentication Status': '/auth/check'
    },
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  };

  // Add authentication info based on configuration
  if (isOAuthConfigured) {
    response.authentication = {
      login: '/auth/google',
      logout: '/auth/logout',
      status: '/auth/check'
    };
    response.protectedEndpoints = [
      'POST /api/books',
      'PUT /api/books/:id', 
      'DELETE /api/books/:id',
      'POST /api/authors',
      'PUT /api/authors/:id',
      'DELETE /api/authors/:id'
    ];
    response.notes = [
      'OAuth authentication is enabled and functional',
      'Protected routes require Google login'
    ];
  } else {
    response.authentication = {
      status: 'OAuth not configured in production',
      note: 'All routes are accessible without authentication in this mode'
    };
    response.publicEndpoints = [
      'GET /api/books',
      'GET /api/books/:id',
      'GET /api/authors', 
      'GET /api/authors/:id',
      'POST /api/books',
      'PUT /api/authors/:id',
      'DELETE /api/authors/:id',
      'POST /api/authors',
      'PUT /api/authors/:id',
      'DELETE /api/authors/:id'
    ];
    response.notes = [
      'To enable OAuth: Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Render environment variables',
      'Using MemoryStore for sessions (acceptable for assignment scope)'
    ];
  }

  res.json(response);
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        uptime: process.uptime(),
        swagger: '/api-docs',
        authenticated: req.isAuthenticated() || false,
        oauthConfigured: isOAuthConfigured,
        environment: NODE_ENV,
        sessionStore: 'MemoryStore',
        memoryUsage: process.memoryUsage()
    });
});

// MongoDB Connection
const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    }
};

// Swagger configuration - UPDATED with full HTTPS URLs
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Library Management API',
      version: '1.0.0',
      description: 'A complete CRUD API for managing books and authors with full data validation and error handling',
      contact: {
        name: 'API Support',
        url: 'https://github.com/Impulsible/book-collection-api'
      }
    },
    servers: [
      {
        url: 'https://book-collection-api-0vgp.onrender.com', // Production first
        description: 'Production server',
      },
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Validation failed'
            },
            errors: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['Title is required', 'Author is required']
            }
          }
        }
      },
      securitySchemes: {
        oauth2: {
          type: 'oauth2',
          flows: {
            authorizationCode: {
              authorizationUrl: 'https://book-collection-api-0vgp.onrender.com/auth/google', // Full HTTPS URL
              tokenUrl: 'https://book-collection-api-0vgp.onrender.com/auth/google/callback', // Full HTTPS URL
              scopes: {}
            }
          }
        }
      }
    }
  },
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }'
}));

// Import routes
const bookRoutes = require('./routes/bookRoutes');
const authorRoutesSimple = require('./routes/authorRoutes-simple');

// Routes
app.use('/api/books', bookRoutes);
app.use('/api/authors', authorRoutesSimple);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'Route not found',
        availableEndpoints: {
            'Books': '/api/books',
            'Authors': '/api/authors',
            'Health': '/health',
            'Documentation': '/api-docs',
            'Authentication': {
                'Login': '/auth/google',
                'Logout': '/auth/logout',
                'Check Status': '/auth/check'
            }
        },
        oauthConfigured: isOAuthConfigured,
        environment: NODE_ENV
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Error:', error);
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: NODE_ENV === 'development' ? error.message : {},
        oauthConfigured: isOAuthConfigured,
        environment: NODE_ENV
    });
});

// Start server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
        console.log(`📍 Local: http://localhost:${PORT}`);
        console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
        console.log(`🌐 Environment: ${NODE_ENV}`);
        console.log(`🗄️  Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}`);
        
        if (isOAuthConfigured) {
            console.log(`🔐 Authentication: https://book-collection-api-0vgp.onrender.com/auth/google`);
            console.log(`✅ OAuth authentication is enabled and ready!`);
        } else {
            console.log(`🔒 OAuth authentication is disabled`);
            console.log(`📝 All routes are accessible without authentication`);
            console.log(`💡 To enable OAuth: Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables`);
        }
        
        if (SESSION_SECRET.includes('fallback-session-secret')) {
            console.warn(`⚠️  WARNING: Using fallback session secret - set SESSION_SECRET environment variable for production`);
        }
        
        // Acknowledge MemoryStore usage
        console.log(`📦 Session storage: MemoryStore (acceptable for assignment scope)`);
        console.log(`🌐 CORS configured for: localhost:3000 and book-collection-api-0vgp.onrender.com`);
    });
});

module.exports = app;