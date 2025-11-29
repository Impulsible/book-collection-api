const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const MongoStore = require('connect-mongo');
const path = require('path');
require('dotenv').config();

const app = express();

// ===== Environment Validation =====
const getEnvVar = (key, defaultValue, isCritical = false) => {
  const value = process.env[key] || defaultValue;
  
  if (!value && isCritical) {
    console.error(`💥 CRITICAL: Missing required environment variable: ${key}`);
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

// Get environment variables
const MONGODB_URI = getEnvVar('MONGODB_URI', null, true);
const SESSION_SECRET = getEnvVar('SESSION_SECRET', 'fallback-session-secret-change-in-production', true);
const NODE_ENV = getEnvVar('NODE_ENV', 'development');
const PORT = getEnvVar('PORT', '3000');
const RENDER_URL = getEnvVar('RENDER_URL', 'http://localhost:3000');

// OAuth configuration
const GOOGLE_CLIENT_ID = getEnvVar('GOOGLE_CLIENT_ID', '');
const GOOGLE_CLIENT_SECRET = getEnvVar('GOOGLE_CLIENT_SECRET', '');
const isOAuthConfigured = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET;

// ===== FIXED: CORS Configuration =====
const allowedOrigins = [
  'http://localhost:3000',
  'https://localhost:3000', 
  'https://book-collection-api-0vgp.onrender.com',
  RENDER_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
}));

app.use(express.json());
app.use(express.static('public'));

// ===== FIXED: Session Configuration =====
const isProduction = NODE_ENV === 'production';

app.use(session({
  name: 'bookCollectionSession',
  secret: SESSION_SECRET,
  resave: true, // ✅ CHANGED: Set to true for better session persistence
  saveUninitialized: true, // ✅ CHANGED: Set to true to save sessions
  store: MongoStore.create({
    mongoUrl: MONGODB_URI,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60,
    autoRemove: 'native'
    // ✅ REMOVED: crypto to simplify session storage
  }),
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax',
    domain: undefined
  }
}));

console.log(`📦 Session configuration: ${isProduction ? 'Production (secure)' : 'Development'}`);

// Initialize passport AFTER session
app.use(passport.initialize());
app.use(passport.session());

// Import passport config
require('./config/passport');

// ===== Session Debugging Middleware =====
app.use((req, res, next) => {
  console.log('🔐 Session Debug:', {
    sessionId: req.sessionID ? req.sessionID.substring(0, 10) + '...' : 'No session',
    authenticated: req.isAuthenticated ? req.isAuthenticated() : false,
    user: req.user ? req.user.displayName : 'None',
    path: req.path
  });
  next();
});

// Make user available to all routes
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

// ===== FIXED: Authentication Middleware =====
const requireAuth = (req, res, next) => {
  console.log('🔐 requireAuth Middleware - Path:', req.path);
  console.log('🔐 isAuthenticated:', req.isAuthenticated ? req.isAuthenticated() : false);
  console.log('🔐 User:', req.user ? req.user.displayName : 'None');
  
  if (req.isAuthenticated && req.isAuthenticated()) {
    console.log('✅ Access granted to:', req.user.displayName);
    return next();
  }
  
  console.log('❌ Access denied - not authenticated');
  res.status(401).json({
    success: false,
    message: "Unauthorized: Please log in to access this resource",
    loginUrl: "/auth/google",
    authenticated: false
  });
};

// ===== FIXED: Export requireAuth for routes =====
app.requireAuth = requireAuth;
console.log('✅ requireAuth middleware exported for routes');

// ===== FIXED: Authentication Routes =====

// Enhanced auth status check with error handling
app.get('/auth/status', (req, res) => {
  try {
    console.log('🔐 Auth Status Check:');
    console.log('  - Session ID:', req.sessionID);
    console.log('  - isAuthenticated:', req.isAuthenticated ? req.isAuthenticated() : false);
    console.log('  - User exists:', !!req.user);
    
    const response = {
      success: true,
      authenticated: req.isAuthenticated ? req.isAuthenticated() : false,
      user: req.user ? {
        id: req.user.id || req.user._id,
        displayName: req.user.displayName,
        email: req.user.email
      } : null,
      sessionId: req.sessionID || 'No session',
      oauthConfigured: true,
      environment: NODE_ENV
    };

    res.json(response);
  } catch (error) {
    console.error('❌ Auth status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking auth status',
      error: error.message
    });
  }
});

// ===== ADDED: Session Debug Route =====
app.get('/auth/debug-session', (req, res) => {
  try {
    console.log('🔍 DEBUG SESSION DETAILS:');
    console.log('  - Session ID:', req.sessionID);
    console.log('  - isAuthenticated:', req.isAuthenticated ? req.isAuthenticated() : false);
    console.log('  - User:', req.user);
    console.log('  - Session exists:', !!req.session);
    console.log('  - Cookies:', req.headers.cookie);
    
    // Safe session inspection
    let sessionData = 'No session';
    if (req.session) {
      sessionData = {
        id: req.sessionID,
        cookie: req.session.cookie,
        passport: req.session.passport
      };
    }
    
    res.json({
      success: true,
      sessionId: req.sessionID,
      isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
      user: req.user || null,
      session: sessionData,
      hasCookies: !!req.headers.cookie,
      sessionExists: !!req.session
    });
  } catch (error) {
    console.error('❌ Debug session error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug error',
      error: error.message
    });
  }
});

// ===== ADDED: OAuth Debug Routes =====
app.get('/auth/debug-oauth', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const callbackURL = isProduction 
    ? `${process.env.RENDER_URL}/auth/google/callback`
    : "http://localhost:3000/auth/google/callback";
  
  console.log('🔧 OAuth Debug Info:');
  console.log('  - Environment:', process.env.NODE_ENV);
  console.log('  - Callback URL:', callbackURL);
  console.log('  - Client ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Missing');
  console.log('  - Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Missing');
  
  res.json({
    success: true,
    environment: process.env.NODE_ENV,
    currentCallbackUrl: callbackURL,
    clientId: process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Missing',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Missing',
    authorizedRedirectUris: [
      'http://localhost:3000/auth/google/callback',
      'http://localhost:3000/auth/google/callback/',
      'https://localhost:3000/auth/google/callback',
      'https://localhost:3000/auth/google/callback/'
    ],
    instructions: 'Copy the "currentCallbackUrl" EXACTLY into Google Console Authorized Redirect URIs'
  });
});

app.get('/auth/test-callback', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const callbackURL = isProduction 
    ? `${process.env.RENDER_URL}/auth/google/callback`
    : "http://localhost:3000/auth/google/callback";
  
  res.json({
    message: 'This is the callback URL your app is using:',
    callbackUrl: callbackURL,
    copyThis: 'Copy the URL below into Google Console:',
    urlToCopy: callbackURL
  });
});

if (isOAuthConfigured) {
  // OAuth routes when properly configured
  app.get('/auth/google',
    passport.authenticate('google', { 
      scope: ['email', 'profile'],
      prompt: 'select_account'
    })
  );

  // ===== FIXED: Google Callback with Better Session Handling =====
  app.get('/auth/google/callback',
    passport.authenticate('google', {
      failureRedirect: '/auth/failure',
      failureMessage: true
    }),
    (req, res) => {
      console.log('✅ Successful OAuth authentication for:', req.user.displayName);
      
      // Force session regeneration for security
      req.session.regenerate((err) => {
        if (err) {
          console.error('❌ Session regeneration error:', err);
          return res.redirect('/auth/failure');
        }
        
        // Log the user in after session regeneration
        req.logIn(req.user, (err) => {
          if (err) {
            console.error('❌ Login after regeneration error:', err);
            return res.redirect('/auth/failure');
          }
          
          console.log('✅ User logged in after session regeneration');
          
          // Save the session
          req.session.save((err) => {
            if (err) {
              console.error('❌ Session save error:', err);
              return res.redirect('/auth/failure');
            }
            
            console.log('✅ Session saved successfully for:', req.user.displayName);
            res.redirect('/auth/success');
          });
        });
      });
    }
  );

  // Success page for browser clients
  app.get('/auth/success', (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.redirect('/auth/failure');
    }
    
    res.json({
      success: true,
      message: 'Authentication successful',
      user: {
        id: req.user.id,
        displayName: req.user.displayName,
        email: req.user.email
      },
      sessionId: req.sessionID,
      authenticated: true,
      endpoints: {
        'API Documentation': '/api-docs',
        'Check Auth Status': '/auth/status',
        'Logout': '/auth/logout'
      }
    });
  });
  
  console.log('✅ OAuth authentication routes enabled');
} else {
  // Mock authentication for development
  app.get('/auth/google', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'OAuth not configured',
      instructions: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables'
    });
  });

  app.get('/auth/google/callback', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'OAuth callback not available'
    });
  });
  
  console.log('🔒 OAuth authentication routes disabled');
}

// ===== Logout Route =====
app.post('/auth/logout', (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.json({
      success: true,
      message: 'No active session to logout from'
    });
  }

  const userName = req.user.displayName;
  
  req.logout((err) => {
    if (err) {
      console.error('❌ Logout error:', err);
      return res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
    
    req.session.destroy((err) => {
      if (err) {
        console.error('❌ Session destruction error:', err);
      }
      
      res.json({
        success: true,
        message: `Successfully logged out ${userName}`,
        authenticated: false
      });
    });
  });
});

// GET logout for browser compatibility
app.get('/auth/logout', (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.json({
      success: true,
      message: 'No active session to logout from'
    });
  }

  const userName = req.user.displayName;
  
  req.logout((err) => {
    if (err) {
      console.error('❌ Logout error:', err);
      return res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
    
    req.session.destroy((err) => {
      if (err) {
        console.error('❌ Session destruction error:', err);
      }
      
      res.json({
        success: true,
        message: `Successfully logged out ${userName}`,
        authenticated: false
      });
    });
  });
});

// ===== FIXED: Auth Failure Route =====
app.get('/auth/failure', (req, res) => {
  res.status(401).json({ 
    success: false,
    message: 'Authentication failed',
    configured: true
  });
});

// Session Testing Routes
app.post('/auth/test-session', (req, res) => {
  req.session.testValue = 'session-is-working-' + Date.now();
  req.session.testUser = 'test-user';
  
  req.session.save((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Session save failed'
      });
    }
    
    res.json({
      success: true,
      message: 'Session test value set',
      sessionId: req.sessionID,
      testValue: req.session.testValue
    });
  });
});

app.get('/auth/test-session', (req, res) => {
  res.json({
    success: true,
    sessionId: req.sessionID,
    testValue: req.session.testValue,
    testUser: req.session.testUser,
    isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
    user: req.user
  });
});

// Basic routes
app.get('/', (req, res) => {
  const response = {
    message: '📚 Book Collection API',
    version: '1.0.0',
    environment: NODE_ENV,
    authenticated: req.isAuthenticated ? req.isAuthenticated() : false,
    user: req.user ? {
      id: req.user.id,
      displayName: req.user.displayName,
      email: req.user.email
    } : null,
    oauthConfigured: true,
    endpoints: {
      'Books': '/api/books',
      'Authors': '/api/authors', 
      'Health check': '/health',
      'API Documentation': '/api-docs',
      'Authentication Status': '/auth/status',
      'Logout': '/auth/logout'
    }
  };

  if (isOAuthConfigured) {
    response.authentication = {
      login: '/auth/google',
      logout: '/auth/logout',
      status: '/auth/status'
    };
  }

  res.json(response);
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    authenticated: req.isAuthenticated ? req.isAuthenticated() : false,
    oauthConfigured: true,
    environment: NODE_ENV
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

// ===== Swagger Configuration =====
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Book Collection API',
      version: '1.0.0',
      description: 'A complete CRUD API for managing books and authors with OAuth authentication'
    },
    servers: [
      {
        url: RENDER_URL,
        description: `${NODE_ENV} server`,
      }
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid'
        }
      }
    }
  },
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
  }
}));

// ===== FIXED: Import routes =====
const bookRoutes = require('./routes/bookRoutes');
const authorRoutesSimple = require('./routes/authorRoutes-simple');

// ===== FIXED: Apply routes WITHOUT global auth =====
// Let individual routes handle their own authentication
app.use('/api/books', bookRoutes);
app.use('/api/authors', authorRoutesSimple);

// Public routes (no authentication required)
app.get('/api/public/books', (req, res) => {
  res.json({
    success: true,
    message: 'Public books endpoint - authentication not required',
    authenticated: req.isAuthenticated ? req.isAuthenticated() : false
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found',
    authenticated: req.isAuthenticated ? req.isAuthenticated() : false
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: NODE_ENV === 'development' ? error.message : {}
  });
});

// Start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Server is running on port ${PORT}`);
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`🌐 Environment: ${NODE_ENV}`);
    console.log(`🔐 Authentication: ${isOAuthConfigured ? 'ENABLED' : 'DISABLED'}`);
    console.log(`📦 Session: MongoDB with development cookies`);
  });
});

module.exports = app;