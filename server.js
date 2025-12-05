// Load required packages
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const MongoStore = require('connect-mongo');

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

// Set up CORS
const allowedOrigins = [
    'http://localhost:3000',
    'https://localhost:3000',
    'https://book-collection-api-0vgp.onrender.com',
    serverBaseUrl
].filter(origin => origin);

console.log('Allowed origins:', allowedOrigins);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Set up sessions
app.use(session({
    name: 'bookCollectionSession',
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: mongodbUri,
        collectionName: 'sessions'
    }),
    cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: isProduction ? 'none' : 'lax'
    }
}));

// Set up Passport
app.use(passport.initialize());
app.use(passport.session());

// Load passport config
require('./config/passport');

// Set up Swagger
const swaggerServers = [
    {
        url: 'https://book-collection-api-0vgp.onrender.com',
        description: 'Production Server'
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
        servers: swaggerServers
    },
    apis: ['./routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ====================
// BASIC ROUTES
// ====================

app.get('/', (req, res) => {
    res.json({
        message: 'Book Collection API',
        version: '1.0.0',
        environment: nodeEnv,
        server: serverBaseUrl,
        endpoints: {
            books: '/api/books',
            authors: '/api/authors',
            docs: '/api-docs',
            health: '/health',
            auth: '/auth',
            auth_login: '/auth/google',
            auth_status: '/auth/status',
            auth_check: '/auth/check',
            auth_logout: '/auth/logout'
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
        session_id: req.sessionID
    });
});

// ====================
// AUTH ROUTES
// ====================

// Route to list all auth endpoints
app.get('/auth', (req, res) => {
    res.json({
        available_endpoints: {
            login: '/auth/google',
            status: '/auth/status',
            check: '/auth/check',
            logout: '/auth/logout',
            success: '/auth/success',
            failure: '/auth/failure'
        },
        note: 'Use /auth/status or /auth/check to check login status',
        current_user: req.isAuthenticated() ? {
            id: req.user.id,
            name: req.user.displayName,
            email: req.user.email
        } : null
    });
});

// Auth status endpoint
app.get('/auth/status', (req, res) => {
    const isLoggedIn = req.isAuthenticated();
    
    res.json({
        authenticated: isLoggedIn,
        user: isLoggedIn ? {
            id: req.user.id,
            name: req.user.displayName,
            email: req.user.email
        } : null,
        endpoint: '/auth/status',
        timestamp: new Date().toISOString()
    });
});

// Auth check endpoint (same as status, different name)
app.get('/auth/check', (req, res) => {
    const isLoggedIn = req.isAuthenticated();
    
    res.json({
        authenticated: isLoggedIn,
        user: isLoggedIn ? {
            id: req.user.id,
            name: req.user.displayName,
            email: req.user.email
        } : null,
        endpoint: '/auth/check',
        timestamp: new Date().toISOString()
    });
});

// ADD THIS: Simple /check redirect to /auth/check
app.get('/check', (req, res) => {
    res.redirect('/auth/check');
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

    // Google callback
    app.get('/auth/google/callback',
        passport.authenticate('google', { 
            failureRedirect: '/auth/failure'
        }),
        (req, res) => {
            console.log('User authenticated:', req.user.displayName);
            res.redirect('/auth/success');
        }
    );
    
    // Login success
    app.get('/auth/success', (req, res) => {
        if (!req.isAuthenticated()) {
            return res.redirect('/auth/failure');
        }
        
        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: req.user.id,
                name: req.user.displayName,
                email: req.user.email
            },
            session_id: req.sessionID,
            check_status_urls: [
                '/auth/status',
                '/auth/check',
                '/check'
            ]
        });
    });
    
    // Login failure
    app.get('/auth/failure', (req, res) => {
        res.status(401).json({
            error: 'Login failed',
            details: 'Please try again',
            try_again_url: '/auth/google'
        });
    });
} else {
    console.log('Google OAuth is NOT configured');
    
    app.get('/auth/google', (req, res) => {
        res.json({
            error: 'Google OAuth not configured'
        });
    });
}

// Logout
app.get('/auth/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        
        res.json({
            success: true,
            message: 'Logged out successfully'
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

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
});

// 404 handler with helpful message
app.use((req, res) => {
    console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
    
    // Check if it's a common mistake (like /check instead of /auth/check)
    let suggestion = '';
    if (req.originalUrl === '/check') {
        suggestion = 'Did you mean /auth/check or /auth/status?';
    } else if (req.originalUrl === '/status') {
        suggestion = 'Did you mean /auth/status?';
    }
    
    const availableRoutes = [
        'GET /',
        'GET /health',
        'GET /api-docs',
        'GET /auth',
        'GET /auth/google',
        'GET /auth/status',
        'GET /auth/check',
        'GET /check (redirects to /auth/check)',
        'GET /auth/logout',
        'GET /api/books',
        'GET /api/authors'
    ];
    
    res.status(404).json({
        error: 'Route not found',
        requested: `${req.method} ${req.originalUrl}`,
        suggestion: suggestion,
        available_routes: availableRoutes,
        quick_links: {
            home: '/',
            health_check: '/health',
            auth_status: '/auth/status',
            auth_check: '/auth/check',
            google_login: '/auth/google'
        }
    });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    
    res.status(500).json({
        error: 'Internal server error',
        message: isProduction ? 'Something went wrong' : error.message
    });
});

// ====================
// START SERVER
// ====================

const startServer = async () => {
    await connectToDatabase();
    
    app.listen(port, '0.0.0.0', () => {
        console.log('✅ Server started successfully');
        console.log('📍 Local URL: http://localhost:' + port);
        console.log('🌐 Production URL: https://book-collection-api-0vgp.onrender.com');
        console.log('🖥️  Current URL:', serverBaseUrl);
        console.log('');
        console.log('📋 Available endpoints:');
        console.log('   Home:', serverBaseUrl);
        console.log('   Health:', serverBaseUrl + '/health');
        console.log('   Auth status:', serverBaseUrl + '/auth/status');
        console.log('   Auth check:', serverBaseUrl + '/auth/check');
        console.log('   Simple check (redirect):', serverBaseUrl + '/check');
        console.log('   Google login:', serverBaseUrl + '/auth/google');
        console.log('   API docs:', serverBaseUrl + '/api-docs');
    });
};

if (require.main === module) {
    startServer();
}

module.exports = app;