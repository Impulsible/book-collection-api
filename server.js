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

app.get('/auth/failure', (req, res) => {
    res.status(401).json({ 
        success: false,
        message: 'Failed to authenticate with Google',
        error: true 
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

// Check authentication status
app.get('/auth/check', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ 
            success: true,
            authenticated: true,
            user: {
                id: req.user.id,
                displayName: req.user.displayName,
                email: req.user.emails[0].value
            }
        });
    } else {
        res.json({ 
            success: true,
            authenticated: false,
            user: null
        });
    }
});

// Basic routes
app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ 
            message: '📚 Book Collection API',
            version: '1.0.0',
            description: 'A complete CRUD API for managing books and authors',
            user: req.user.displayName,
            authenticated: true,
            endpoints: {
                'Books': '/api/books',
                'Authors': '/api/authors',
                'Health check': '/health',
                'API Documentation': '/api-docs'
            },
            protectedEndpoints: [
                'POST /api/books',
                'PUT /api/books/:id', 
                'DELETE /api/books/:id',
                'POST /api/authors',
                'PUT /api/authors/:id',
                'DELETE /api/authors/:id'
            ],
            database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
        });
    } else {
        res.json({ 
            message: '📚 Book Collection API',
            version: '1.0.0',
            description: 'A complete CRUD API for managing books and authors',
            authenticated: false,
            endpoints: {
                'Books': '/api/books',
                'Authors': '/api/authors',
                'Health check': '/health',
                'API Documentation': '/api-docs',
                'Login': '/auth/google'
            },
            publicEndpoints: [
                'GET /api/books',
                'GET /api/books/:id',
                'GET /api/authors', 
                'GET /api/authors/:id'
            ],
            database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
        });
    }
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        uptime: process.uptime(),
        swagger: '/api-docs',
        authenticated: req.isAuthenticated() || false
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
        }
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Error:', error);
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
});

// Start server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
        console.log(`📍 Local: http://localhost:${PORT}`);
        console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
        console.log(`🔐 Authentication: http://localhost:${PORT}/auth/google`);
        console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🗄️  Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}`);
        console.log(`✅ All routes enabled - OAuth authentication ready!`);
    });
});

module.exports = app;