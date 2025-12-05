// Load required packages
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');

// Load environment variables
require('dotenv').config();

// Create Express app
const app = express();

// Get configuration from environment
const mongodbUri = process.env.MONGODB_URI;
const sessionSecret = process.env.SESSION_SECRET;
const port = process.env.PORT || 3000;
const nodeEnv = process.env.NODE_ENV || 'development';

// Check if we're in production mode
const isProduction = nodeEnv === 'production';

// Figure out which URL to use
let serverBaseUrl;

if (process.env.RENDER_EXTERNAL_URL) {
    serverBaseUrl = process.env.RENDER_EXTERNAL_URL;
    console.log('Running on Render, URL:', serverBaseUrl);
} else {
    serverBaseUrl = `http://localhost:${port}`;
    console.log('Running locally, URL:', serverBaseUrl);
}

console.log('Starting Book Collection API');
console.log('Environment:', nodeEnv);
console.log('Port:', port);
console.log('Is production:', isProduction);

// Check if we have MongoDB connection string
if (!mongodbUri) {
    console.error('Error: MONGODB_URI is required');
    process.exit(1);
}

// ====================
// CORS CONFIGURATION
// ====================

const allowedOrigins = [
    'http://localhost:3000',
    'https://localhost:3000',
    'http://localhost:5173', // Vite dev server
    'https://book-collection-api-0vgp.onrender.com',
    serverBaseUrl
].filter(origin => origin);

console.log('Allowed origins:', allowedOrigins);

// Smart CORS configuration that works for both environments
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, postman)
        if (!origin) return callback(null, true);
        
        // Allow all localhost origins in development
        if (!isProduction && origin.includes('localhost')) {
            return callback(null, true);
        }
        
        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, // REQUIRED for cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Set-Cookie', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie']
}));

// ====================
// MIDDLEWARE SETUP
// ====================

// Cookie parser must come before session
app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// ====================
// SESSION CONFIGURATION
// ====================

// Dynamic session config for both environments
const sessionConfig = {
    name: 'bookCollectionSession',
    secret: sessionSecret,
    resave: true,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: mongodbUri,
        collectionName: 'sessions',
        ttl: 24 * 60 * 60 // 24 hours
    }),
    cookie: {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        // Dynamic settings based on environment
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax'
    }
};

// Add domain only in production (Render)
if (isProduction) {
    sessionConfig.cookie.domain = '.onrender.com';
}

app.use(session(sessionConfig));

// ====================
// PASSPORT SETUP
// ====================

app.use(passport.initialize());
app.use(passport.session());

// Load passport config
require('./config/passport');

// ====================
// SWAGGER CONFIGURATION
// ====================

const swaggerServers = [
    {
        url: 'https://book-collection-api-0vgp.onrender.com',
        description: 'Production Server (Render)'
    },
    {
        url: 'http://localhost:3000',
        description: 'Local Development Server'
    }
];

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Book Collection API',
            version: '1.0.0',
            description: 'API for managing books and authors'
        },
        servers: swaggerServers,
        components: {
            schemas: {
                Author: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
                        name: { type: 'string', example: 'George R.R. Martin' },
                        biography: { type: 'string', example: 'Author of A Song of Ice and Fire' },
                        birthDate: { type: 'string', format: 'date', example: '1948-09-20' },
                        nationality: { type: 'string', example: 'American' },
                        website: { type: 'string', example: 'https://georgerrmartin.com' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                Book: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '507f1f77bcf86cd799439012' },
                        title: { type: 'string', example: 'A Game of Thrones' },
                        author: { type: 'string', example: '507f1f77bcf86cd799439011' },
                        isbn: { type: 'string', example: '9780553103540' },
                        publicationYear: { type: 'integer', example: 1996 },
                        genre: { type: 'string', example: 'Fantasy' },
                        publisher: { type: 'string', example: 'Bantam Books' },
                        pageCount: { type: 'integer', example: 694 },
                        description: { type: 'string' },
                        language: { type: 'string', example: 'English' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                }
            },
            securitySchemes: {
                sessionAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'bookCollectionSession',
                    description: 'Session cookie for authenticated requests'
                }
            }
        },
        tags: [
            { name: 'Books', description: 'Book management operations' },
            { name: 'Authors', description: 'Author management operations' },
            { name: 'Authentication', description: 'User authentication operations' }
        ]
    },
    apis: ['./routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ====================
// TEST & DEBUG ROUTES
// ====================

// Test if basic API is working
app.get('/', (req, res) => {
    res.json({
        message: 'Book Collection API',
        version: '1.0.0',
        environment: nodeEnv,
        server: serverBaseUrl,
        authenticated: req.isAuthenticated(),
        endpoints: {
            books: '/api/books',
            authors: '/api/authors',
            docs: '/api-docs',
            health: '/health',
            auth: '/auth',
            test: '/test',
            cookie_test: '/cookie-test'
        }
    });
});

// Health check
app.get('/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: dbStatus,
        environment: nodeEnv,
        server: serverBaseUrl,
        session_id: req.sessionID,
        authenticated: req.isAuthenticated()
    });
});

// Simple test route
app.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'API is working',
        environment: nodeEnv,
        cookies_received: req.headers.cookie || 'No cookies',
        session_id: req.sessionID
    });
});

// Cookie test route for both environments
app.get('/cookie-test', (req, res) => {
    // Set a test cookie
    const cookieOptions = {
        httpOnly: false, // Allow JS access for testing
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000
    };
    
    if (isProduction) {
        cookieOptions.domain = '.onrender.com';
    }
    
    res.cookie('testCookie', `test-value-${Date.now()}`, cookieOptions);
    
    res.json({
        success: true,
        message: 'Test cookie set',
        environment: nodeEnv,
        is_production: isProduction,
        cookie_options: cookieOptions,
        cookies_received: req.headers.cookie || 'No cookies received',
        session_id: req.sessionID,
        authenticated: req.isAuthenticated()
    });
});

// ====================
// AUTH ROUTES
// ====================

// List all auth endpoints
app.get('/auth', (req, res) => {
    res.json({
        endpoints: {
            login: '/auth/google',
            status: '/auth/status',
            logout: '/auth/logout',
            debug: '/auth/debug'
        },
        authenticated: req.isAuthenticated(),
        user: req.user || null,
        session_id: req.sessionID,
        environment: nodeEnv
    });
});

// Auth status
app.get('/auth/status', (req, res) => {
    res.json({
        authenticated: req.isAuthenticated(),
        user: req.isAuthenticated() ? {
            id: req.user.id,
            name: req.user.displayName,
            email: req.user.email
        } : null,
        session_id: req.sessionID,
        environment: nodeEnv
    });
});

// Auth debug
app.get('/auth/debug', (req, res) => {
    res.json({
        session_id: req.sessionID,
        session_exists: !!req.session,
        authenticated: req.isAuthenticated(),
        user: req.user,
        cookies: req.headers.cookie || 'No cookies',
        headers: {
            origin: req.headers.origin,
            referer: req.headers.referer,
            'user-agent': req.headers['user-agent']
        },
        environment: nodeEnv,
        is_production: isProduction
    });
});

// Google OAuth routes
const hasGoogleAuth = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

if (hasGoogleAuth) {
    console.log('Google OAuth is configured');
    
    // Google login
    app.get('/auth/google',
        passport.authenticate('google', { 
            scope: ['email', 'profile'],
            prompt: 'select_account'
        })
    );

    // Google callback - SIMPLE AND RELIABLE
    app.get('/auth/google/callback',
        (req, res, next) => {
            console.log('Google callback - Environment:', nodeEnv);
            next();
        },
        passport.authenticate('google', { 
            failureRedirect: '/auth/failure',
            failureMessage: true
        }),
        (req, res) => {
            console.log('Login successful for:', req.user.displayName);
            
            // Manually set session cookie to ensure it's set
            const cookieOptions = {
                secure: isProduction,
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000,
                sameSite: isProduction ? 'none' : 'lax'
            };
            
            if (isProduction) {
                cookieOptions.domain = '.onrender.com';
            }
            
            // Set the session cookie
            res.cookie('bookCollectionSession', req.sessionID, cookieOptions);
            
            res.json({
                success: true,
                message: 'Login successful!',
                user: {
                    id: req.user.id,
                    name: req.user.displayName,
                    email: req.user.email
                },
                session_id: req.sessionID,
                cookie_set: true,
                environment: nodeEnv,
                next_steps: [
                    'Visit /auth/status to verify login',
                    'Use the session_id for API requests'
                ]
            });
        }
    );
    
    // Login failure
    app.get('/auth/failure', (req, res) => {
        res.status(401).json({
            error: 'Login failed',
            details: req.query.error_description || 'Unknown error',
            environment: nodeEnv
        });
    });
    
} else {
    console.log('Google OAuth is NOT configured');
    
    app.get('/auth/google', (req, res) => {
        res.json({
            error: 'Google OAuth not configured',
            environment: nodeEnv
        });
    });
}

// Logout
app.get('/auth/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        
        // Clear cookies
        const clearOptions = {
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax'
        };
        
        if (isProduction) {
            clearOptions.domain = '.onrender.com';
        }
        
        res.clearCookie('bookCollectionSession', clearOptions);
        res.clearCookie('testCookie', clearOptions);
        
        res.json({
            success: true,
            message: 'Logged out successfully',
            environment: nodeEnv
        });
    });
});

// ====================
// DATABASE CONNECTION
// ====================

const connectToDatabase = async () => {
    try {
        await mongoose.connect(mongodbUri);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error.message);
        process.exit(1);
    }
};

// ====================
// API ROUTES
// ====================

const bookRoutes = require('./routes/bookRoutes');
const authorRoutes = require('./routes/authorRoutes');

app.use('/api/books', bookRoutes);
app.use('/api/authors', authorRoutes);

// ====================
// ERROR HANDLING
// ====================

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    console.log('  Cookies:', req.headers.cookie || 'None');
    console.log('  Origin:', req.headers.origin || 'None');
    next();
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        environment: nodeEnv,
        available_routes: [
            'GET /',
            'GET /health',
            'GET /test',
            'GET /cookie-test',
            'GET /api-docs',
            'GET /auth',
            'GET /auth/status',
            'GET /auth/google',
            'GET /auth/logout',
            'GET /api/books',
            'GET /api/authors'
        ]
    });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    
    res.status(500).json({
        error: 'Internal server error',
        message: error.message,
        environment: nodeEnv
    });
});

// ====================
// START SERVER
// ====================

const startServer = async () => {
    await connectToDatabase();
    
    app.listen(port, '0.0.0.0', () => {
        console.log('\n✅ Server started successfully!');
        console.log(`📍 Environment: ${nodeEnv}`);
        console.log(`📍 Port: ${port}`);
        console.log(`📍 Server URL: ${serverBaseUrl}`);
        console.log('\n📋 Test endpoints:');
        console.log(`  Home: ${serverBaseUrl}`);
        console.log(`  Health: ${serverBaseUrl}/health`);
        console.log(`  Test: ${serverBaseUrl}/test`);
        console.log(`  Cookie test: ${serverBaseUrl}/cookie-test`);
        console.log(`  Auth status: ${serverBaseUrl}/auth/status`);
        console.log(`  Google login: ${serverBaseUrl}/auth/google`);
        console.log(`  API docs: ${serverBaseUrl}/api-docs`);
        
        if (isProduction) {
            console.log('\n🌐 Production (Render) mode enabled');
            console.log('   - Cookies: secure=true, sameSite=none');
            console.log('   - Domain: .onrender.com');
        } else {
            console.log('\n💻 Development (localhost) mode');
            console.log('   - Cookies: secure=false, sameSite=lax');
            console.log('   - Domain: localhost');
        }
    });
};

if (require.main === module) {
    startServer();
}

module.exports = app;