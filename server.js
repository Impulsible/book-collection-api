const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const app = express();

// Get environment variables
const mongodbUri = process.env.MONGODB_URI;
const sessionSecret = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
const port = process.env.PORT || 3000;
const nodeEnv = process.env.NODE_ENV || 'development';
const renderUrl = process.env.RENDER_URL || `http://localhost:${port}`;
const isProduction = nodeEnv === 'production';

// Check for required environment variable
if (!mongodbUri) {
    console.error('Error: MONGODB_URI is required');
    process.exit(1);
}

// CORS setup
const allowedOrigins = [
    'http://localhost:3000',
    'https://localhost:3000',
    'https://book-collection-api-0vgp.onrender.com',
    renderUrl
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session setup
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
        sameSite: 'lax'
    }
}));

// Passport setup
app.use(passport.initialize());
app.use(passport.session());
require('./config/passport');

// Make user available in templates
app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }
    
    res.status(401).json({
        success: false,
        message: 'Please log in first'
    });
};

app.requireAuth = requireAuth;

// ===== AUTHENTICATION ROUTES =====

// Check auth status
app.get('/auth/status', (req, res) => {
    const loggedIn = req.isAuthenticated && req.isAuthenticated();
    
    res.json({
        success: true,
        authenticated: loggedIn,
        user: loggedIn ? {
            id: req.user.id,
            name: req.user.displayName,
            email: req.user.email
        } : null
    });
});

// Google OAuth
const hasGoogleAuth = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

if (hasGoogleAuth) {
    app.get('/auth/google',
        passport.authenticate('google', { scope: ['email', 'profile'] })
    );

    app.get('/auth/google/callback',
        passport.authenticate('google', { failureRedirect: '/auth/failure' }),
        (req, res) => {
            res.redirect('/auth/success');
        }
    );
    
    app.get('/auth/success', (req, res) => {
        if (!req.isAuthenticated()) {
            return res.redirect('/auth/failure');
        }
        
        res.json({
            success: true,
            message: `Welcome ${req.user.displayName}!`,
            user: {
                name: req.user.displayName,
                email: req.user.email
            }
        });
    });
} else {
    app.get('/auth/google', (req, res) => {
        res.json({
            success: false,
            message: 'Google login not configured'
        });
    });
    
    app.get('/auth/google/callback', (req, res) => {
        res.json({
            success: false,
            message: 'OAuth not available'
        });
    });
    
    app.get('/auth/success', (req, res) => {
        res.json({
            success: false,
            message: 'Login system not configured'
        });
    });
}

// Logout
app.get('/auth/logout', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.json({
            success: true,
            message: 'No active session'
        });
    }
    
    const userName = req.user.displayName;
    
    req.logout((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Logout failed'
            });
        }
        
        req.session.destroy(() => {
            res.json({
                success: true,
                message: `Goodbye ${userName}!`,
                authenticated: false
            });
        });
    });
});

// Login failure
app.get('/auth/failure', (req, res) => {
    res.status(401).json({
        success: false,
        message: 'Login failed'
    });
});

// ===== BASIC ROUTES =====

// Home page
app.get('/', (req, res) => {
    res.json({
        message: 'Book Collection API',
        version: '1.0.0',
        endpoints: {
            books: '/api/books',
            authors: '/api/authors',
            documentation: '/api-docs',
            health: '/health',
            login: '/auth/google',
            status: '/auth/status'
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
        environment: nodeEnv
    });
});

// ===== DATABASE CONNECTION =====

const connectToDatabase = async () => {
    try {
        await mongoose.connect(mongodbUri);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error.message);
        process.exit(1);
    }
};

// ===== SWAGGER DOCUMENTATION =====

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Book Collection API',
            version: '1.0.0',
            description: 'API for managing books and authors with authentication'
        },
        servers: [
            {
                url: renderUrl,
                description: `${nodeEnv} server`
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
    apis: ['./routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/api-docs', 
    swaggerUi.serve, 
    swaggerUi.setup(swaggerSpec, {
        swaggerOptions: {
            persistAuthorization: true
        }
    })
);

// ===== LOAD API ROUTES =====

const bookRoutes = require('./routes/bookRoutes');
const authorRoutes = require('./routes/authorRoutes');

app.use('/api/books', bookRoutes);
app.use('/api/authors', authorRoutes);

// ===== ERROR HANDLERS =====

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// General error handler
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// ===== START SERVER =====

const startServer = async () => {
    await connectToDatabase();
    
    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
        console.log(`API documentation: http://localhost:${port}/api-docs`);
        console.log(`Environment: ${nodeEnv}`);
    });
};

if (require.main === module) {
    startServer();
}

module.exports = app;