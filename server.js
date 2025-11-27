const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Environment validation
console.log('🔧 Environment Check:');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('   PORT:', process.env.PORT || 'not set');
console.log('   MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Not set');
console.log('   SESSION_SECRET:', process.env.SESSION_SECRET ? '✅ Set' : '❌ Not set');
console.log('   GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Not set');
console.log('   GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Not set');

// Check critical environment variables
const criticalEnvVars = ['MONGODB_URI', 'SESSION_SECRET'];
const missingCritical = criticalEnvVars.filter(key => !process.env[key]);

if (missingCritical.length > 0) {
  console.error('💥 CRITICAL: Missing required environment variables:', missingCritical);
  console.error('   The application cannot start without these variables.');
  process.exit(1);
}

// Check OAuth configuration
const isOAuthConfigured = process.env.GOOGLE_CLIENT_ID && 
                          process.env.GOOGLE_CLIENT_SECRET &&
                          !process.env.GOOGLE_CLIENT_ID.includes('your_actual') &&
                          !process.env.GOOGLE_CLIENT_SECRET.includes('your_actual');

if (isOAuthConfigured) {
  console.log('✅ OAuth is properly configured');
} else {
  console.log('🔒 OAuth is disabled - missing or invalid configuration');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

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
      reason: 'Google OAuth credentials not configured in production',
      instructions: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables',
      note: 'This is normal for deployment without OAuth configuration'
    });
  });

  app.get('/auth/google/callback', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'OAuth callback not available',
      reason: 'Google OAuth not configured'
    });
  });
  
  console.log('🔒 OAuth authentication routes disabled (fallback mode)');
}

// These routes always work
app.get('/auth/failure', (req, res) => {
  res.status(401).json({ 
    success: false,
    message: 'Authentication failed',
    configured: isOAuthConfigured
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
      message: 'Successfully logged out' 
    });
  });
});

app.get('/auth/check', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ 
      success: true,
      authenticated: true,
      user: req.user,
      oauthConfigured: isOAuthConfigured
    });
  } else {
    res.json({ 
      success: true,
      authenticated: false,
      user: null,
      oauthConfigured: isOAuthConfigured,
      note: !isOAuthConfigured ? 'OAuth not configured in this environment' : 'Please log in'
    });
  }
});

// Basic routes
app.get('/', (req, res) => {
  const response = {
    message: '📚 Book Collection API',
    version: '1.0.0',
    description: 'A complete CRUD API for managing books and authors',
    environment: process.env.NODE_ENV || 'development',
    oauthConfigured: isOAuthConfigured,
    authenticated: req.isAuthenticated() || false,
    user: req.isAuthenticated() ? req.user.displayName : null,
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
  } else {
    response.authentication = {
      status: 'OAuth not configured',
      note: 'Protected routes will work without authentication in this mode'
    };
    response.publicEndpoints = [
      'GET /api/books',
      'GET /api/books/:id',
      'GET /api/authors', 
      'GET /api/authors/:id',
      'POST /api/books',
      'PUT /api/books/:id',
      'DELETE /api/books/:id',
      'POST /api/authors',
      'PUT /api/authors/:id',
      'DELETE /api/authors/:id'
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
        environment: process.env.NODE_ENV || 'development'
    });
});

// MongoDB Connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    }
};

// Swagger configuration
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
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://book-collection-api-0vgp.onrender.com',
        description: 'Production server',
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
              authorizationUrl: '/auth/google',
              tokenUrl: '/auth/google/callback',
              scopes: {}
            }
          }
        }
      }
    }
  },
  apis: ['./routes/*.js'], // path to your API routes
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }'
}));

// Import routes
const bookRoutes = require('./routes/bookRoutes');
const authorRoutesSimple = require('./routes/authorRoutes-simple'); // Use simple author routes

// Routes
app.use('/api/books', bookRoutes);
app.use('/api/authors', authorRoutesSimple); // Enable author routes

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
        oauthConfigured: isOAuthConfigured
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Error:', error);
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : {},
        oauthConfigured: isOAuthConfigured
    });
});

// Start server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
        console.log(`📍 Local: http://localhost:${PORT}`);
        console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
        console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🗄️  Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}`);
        
        if (isOAuthConfigured) {
            console.log(`🔐 Authentication: http://localhost:${PORT}/auth/google`);
            console.log(`✅ OAuth authentication is enabled and ready!`);
        } else {
            console.log(`🔒 OAuth authentication is disabled`);
            console.log(`📝 All routes are accessible without authentication`);
        }
    });
});

module.exports = app;