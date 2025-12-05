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
    'http://localhost:5173',
    'https://book-collection-api-0vgp.onrender.com',
    serverBaseUrl
].filter(origin => origin);

console.log('Allowed origins:', allowedOrigins);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        
        if (!isProduction && origin.includes('localhost')) {
            return callback(null, true);
        }
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Set-Cookie', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie']
}));

// ====================
// MIDDLEWARE SETUP
// ====================

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// ====================
// SESSION CONFIGURATION - FIXED FOR PERSISTENCE
// ====================

const sessionConfig = {
    name: 'bookCollectionSession',
    secret: sessionSecret,
    resave: true, // TRUE: Forces session to be saved back to session store
    saveUninitialized: true, // TRUE: Save new but not modified sessions
    store: MongoStore.create({
        mongoUrl: mongodbUri,
        collectionName: 'sessions',
        ttl: 24 * 60 * 60, // 24 hours
        autoRemove: 'native',
        touchAfter: 24 * 3600
    }),
    cookie: {
        httpOnly: true,
        secure: isProduction,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: isProduction ? 'none' : 'lax'
    }
};

// Add domain only in production
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

app.get('/', (req, res) => {
    res.json({
        message: 'Book Collection API',
        version: '1.0.0',
        environment: nodeEnv,
        server: serverBaseUrl,
        authenticated: req.isAuthenticated(),
        session_id: req.sessionID,
        endpoints: {
            books: '/api/books',
            authors: '/api/authors',
            docs: '/api-docs',
            health: '/health',
            auth: '/auth',
            session_test: '/session-test'
        }
    });
});

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

// Session persistence test
app.get('/session-test', (req, res) => {
    // Initialize session counter if not exists
    if (!req.session.visitCount) {
        req.session.visitCount = 0;
    }
    
    req.session.visitCount++;
    
    res.json({
        success: true,
        message: 'Session test',
        session_id: req.sessionID,
        visit_count: req.session.visitCount,
        session_data: req.session,
        cookies: req.headers.cookie || 'No cookies',
        authenticated: req.isAuthenticated(),
        note: 'Refresh this page to see if visit_count increases (session is persistent)'
    });
});

// ====================
// AUTH ROUTES - UPDATED FOR PERSISTENCE
// ====================

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

app.get('/auth/debug', (req, res) => {
    res.json({
        session_id: req.sessionID,
        session_exists: !!req.session,
        authenticated: req.isAuthenticated(),
        user: req.user,
        cookies: req.headers.cookie || 'No cookies',
        environment: nodeEnv
    });
});

// Google OAuth routes
const hasGoogleAuth = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

if (hasGoogleAuth) {
    console.log('Google OAuth is configured');
    
    // Google login
    app.get('/auth/google',
        (req, res, next) => {
            console.log('Google login - Initial session ID:', req.sessionID);
            // Save session before redirect
            req.session.save((err) => {
                if (err) console.log('Session save error:', err);
                next();
            });
        },
        passport.authenticate('google', { 
            scope: ['email', 'profile'],
            prompt: 'select_account'
        })
    );

    // Google callback - FIXED FOR PERSISTENCE
    app.get('/auth/google/callback',
        passport.authenticate('google', { 
            failureRedirect: '/auth/failure',
            failureMessage: true
        }),
        (req, res) => {
            console.log('Google authentication successful for:', req.user.displayName);
            
            // IMPORTANT: Manually save session with user info
            req.session.user = {
                id: req.user.id,
                displayName: req.user.displayName,
                email: req.user.emails[0].value
            };
            
            req.session.save((err) => {
                if (err) {
                    console.log('Session save error:', err);
                    return res.status(500).json({ error: 'Session save failed' });
                }
                
                console.log('Session saved successfully, ID:', req.sessionID);
                
                // Set cookie explicitly
                const cookieOptions = {
                    secure: isProduction,
                    httpOnly: true,
                    maxAge: 24 * 60 * 60 * 1000,
                    sameSite: isProduction ? 'none' : 'lax'
                };
                
                if (isProduction) {
                    cookieOptions.domain = '.onrender.com';
                }
                
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
                    note: 'Session is now persistent. Visit /auth/status to verify.',
                    environment: nodeEnv
                });
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
    const user = req.user;
    
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        
        // Destroy session
        req.session.destroy((err) => {
            if (err) {
                console.log('Session destroy error:', err);
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
            
            res.json({
                success: true,
                message: `Goodbye ${user ? user.displayName : 'User'}! Logged out successfully.`,
                environment: nodeEnv
            });
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

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    console.log('  Session ID:', req.sessionID);
    console.log('  Authenticated:', req.isAuthenticated());
    next();
});

app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        environment: nodeEnv
    });
});

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
        console.log(`  Session test: ${serverBaseUrl}/session-test`);
        console.log(`  Auth status: ${serverBaseUrl}/auth/status`);
        console.log(`  Google login: ${serverBaseUrl}/auth/google`);
        console.log(`  API docs: ${serverBaseUrl}/api-docs`);
        
        if (isProduction) {
            console.log('\n🌐 Production (Render) mode');
            console.log('   - Session persistence: ENABLED');
            console.log('   - Cookies: secure=true, sameSite=none');
            console.log('   - Domain: .onrender.com');
        } else {
            console.log('\n💻 Development (localhost) mode');
            console.log('   - Session persistence: ENABLED');
            console.log('   - Cookies: secure=false, sameSite=lax');
        }
    });
};

if (require.main === module) {
    startServer();
}

module.exports = app;