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

// Check if we're in production mode (Render automatically sets NODE_ENV=production)
const isProduction = nodeEnv === 'production';

// Figure out which URL to use
let serverBaseUrl;

// On Render, RENDER_EXTERNAL_URL is automatically provided
if (process.env.RENDER_EXTERNAL_URL) {
    serverBaseUrl = process.env.RENDER_EXTERNAL_URL;
    console.log('Running on Render');
    console.log('Render URL:', serverBaseUrl);
} else {
    serverBaseUrl = `http://localhost:${port}`;
    console.log('Running locally');
    console.log('Local URL:', serverBaseUrl);
}

console.log('Starting Book Collection API');
console.log('Environment:', nodeEnv);
console.log('Is production:', isProduction);
console.log('Port:', port);

// Check if we have MongoDB connection string
if (!mongodbUri) {
    console.error('Error: MONGODB_URI is required');
    process.exit(1);
}

// Check if we have session secret
if (!sessionSecret) {
    console.error('Error: SESSION_SECRET is required');
    process.exit(1);
}

// Set up CORS - IMPORTANT for Render
const allowedOrigins = [
    'http://localhost:3000',
    'https://localhost:3000',
    'https://book-collection-api-0vgp.onrender.com',
    serverBaseUrl
].filter(origin => origin);

console.log('CORS allowed origins:', allowedOrigins);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Check if origin is allowed
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Set up sessions - CRITICAL FOR RENDER
app.use(session({
    name: 'bookCollectionSession',
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: mongodbUri,
        collectionName: 'sessions',
        ttl: 24 * 60 * 60 // 24 hours
    }),
    cookie: {
        secure: isProduction, // TRUE for Render (HTTPS), FALSE for localhost
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: isProduction ? 'none' : 'lax', // 'none' for Render, 'lax' for localhost
        domain: isProduction ? '.onrender.com' : 'localhost' // Important for cookies to work
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
            auth: '/auth'
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

app.get('/auth', (req, res) => {
    res.json({
        available_endpoints: {
            login: '/auth/google',
            status: '/auth/status',
            logout: '/auth/logout'
        },
        session_id: req.sessionID,
        authenticated: req.isAuthenticated() ? true : false
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
        session_id: req.sessionID
    });
});

// Google OAuth routes
const hasGoogleAuth = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

if (hasGoogleAuth) {
    console.log('Google OAuth is configured for', isProduction ? 'production' : 'development');
    
    // SIMPLE Google login - minimal configuration
    app.get('/auth/google',
        passport.authenticate('google', { 
            scope: ['email', 'profile']
        })
    );

    // SIMPLE Google callback
    app.get('/auth/google/callback',
        passport.authenticate('google', { 
            failureRedirect: '/auth/error'
        }),
        (req, res) => {
            // Successful login - just return user info
            res.json({
                success: true,
                message: 'Login successful',
                user: {
                    id: req.user.id,
                    name: req.user.displayName,
                    email: req.user.email
                }
            });
        }
    );
    
    // Login error page
    app.get('/auth/error', (req, res) => {
        res.status(401).json({
            error: 'Login failed',
            message: 'Please try again'
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

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl
    });
});

app.use((error, req, res, next) => {
    console.error('Server error:', error);
    
    res.status(500).json({
        error: 'Internal server error',
        message: error.message
    });
});

// ====================
// START SERVER
// ====================

const startServer = async () => {
    await connectToDatabase();
    
    app.listen(port, '0.0.0.0', () => {
        console.log('Server started successfully');
        console.log('Environment:', nodeEnv);
        console.log('Port:', port);
        console.log('Server URL:', serverBaseUrl);
        console.log('');
        console.log('Test these endpoints:');
        console.log('1. Home:', serverBaseUrl);
        console.log('2. Health:', serverBaseUrl + '/health');
        console.log('3. Auth status:', serverBaseUrl + '/auth/status');
        console.log('4. Google login:', serverBaseUrl + '/auth/google');
    });
};

if (require.main === module) {
    startServer();
}

module.exports = app;