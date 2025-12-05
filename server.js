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
                        _id: {
                            type: 'string',
                            description: 'Author ID',
                            example: '507f1f77bcf86cd799439011'
                        },
                        name: {
                            type: 'string',
                            description: 'Author name',
                            example: 'George R.R. Martin'
                        },
                        biography: {
                            type: 'string',
                            description: 'Author biography',
                            example: 'Author of the epic fantasy series A Song of Ice and Fire'
                        },
                        birthDate: {
                            type: 'string',
                            format: 'date',
                            description: 'Author birth date',
                            example: '1948-09-20'
                        },
                        nationality: {
                            type: 'string',
                            description: 'Author nationality',
                            example: 'American'
                        },
                        website: {
                            type: 'string',
                            description: 'Author website',
                            example: 'https://georgerrmartin.com'
                        },
                        books: {
                            type: 'array',
                            items: {
                                $ref: '#/components/schemas/Book'
                            },
                            description: 'Books by this author'
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Creation timestamp'
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Last update timestamp'
                        }
                    }
                },
                Book: {
                    type: 'object',
                    properties: {
                        _id: {
                            type: 'string',
                            description: 'Book ID',
                            example: '507f1f77bcf86cd799439012'
                        },
                        title: {
                            type: 'string',
                            description: 'Book title',
                            example: 'A Game of Thrones'
                        },
                        author: {
                            $ref: '#/components/schemas/Author'
                        },
                        isbn: {
                            type: 'string',
                            description: 'ISBN number',
                            example: '9780553103540'
                        },
                        publicationYear: {
                            type: 'integer',
                            description: 'Year of publication',
                            example: 1996
                        },
                        genre: {
                            type: 'string',
                            description: 'Book genre',
                            example: 'Fantasy'
                        },
                        publisher: {
                            type: 'string',
                            description: 'Publisher name',
                            example: 'Bantam Books'
                        },
                        pageCount: {
                            type: 'integer',
                            description: 'Number of pages',
                            example: 694
                        },
                        description: {
                            type: 'string',
                            description: 'Book description',
                            example: 'The first book in the epic fantasy series A Song of Ice and Fire'
                        },
                        language: {
                            type: 'string',
                            description: 'Book language',
                            example: 'English'
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Creation timestamp'
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Last update timestamp'
                        }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false
                        },
                        message: {
                            type: 'string',
                            example: 'Error message'
                        },
                        error: {
                            type: 'string',
                            example: 'Detailed error description'
                        }
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
            {
                name: 'Books',
                description: 'Book management operations'
            },
            {
                name: 'Authors',
                description: 'Author management operations'
            },
            {
                name: 'Authentication',
                description: 'User authentication operations'
            }
        ]
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

app.get('/auth', (req, res) => {
    res.json({
        available_endpoints: {
            login: '/auth/google',
            status: '/auth/status',
            logout: '/auth/logout'
        },
        session_id: req.sessionID,
        authenticated: req.isAuthenticated() ? true : false,
        server: serverBaseUrl,
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
        server: serverBaseUrl
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

    // Google callback - WORKING FOR BOTH ENVIRONMENTS
    app.get('/auth/google/callback',
        (req, res, next) => {
            console.log('Google OAuth callback received');
            console.log('Environment:', nodeEnv);
            console.log('Server:', serverBaseUrl);
            console.log('Has code:', req.query.code ? 'Yes' : 'No');
            console.log('Has error:', req.query.error || 'No');
            next();
        },
        passport.authenticate('google', { 
            failureRedirect: '/auth/failure'
        }),
        (req, res) => {
            console.log('Google authentication successful!');
            console.log('User:', req.user.displayName);
            
            // Send success response
            res.json({
                success: true,
                message: 'Login successful!',
                user: {
                    id: req.user.id,
                    name: req.user.displayName,
                    email: req.user.email
                },
                session_id: req.sessionID,
                server: serverBaseUrl,
                environment: nodeEnv,
                endpoints: {
                    status: '/auth/status',
                    logout: '/auth/logout'
                }
            });
        }
    );
    
    // Login failure with helpful info
    app.get('/auth/failure', (req, res) => {
        console.log('Login failure - Details:', req.query);
        
        // Determine which callback URL should be used
        const expectedCallback = isProduction 
            ? 'https://book-collection-api-0vgp.onrender.com/auth/google/callback'
            : 'http://localhost:3000/auth/google/callback';
        
        res.status(401).json({
            error: 'Login failed',
            details: req.query.error_description || 'Please try again',
            google_error: req.query.error || 'unknown',
            environment: nodeEnv,
            server: serverBaseUrl,
            expected_callback_url: expectedCallback,
            solution: 'Make sure Google Console has this callback URL: ' + expectedCallback
        });
    });
    
} else {
    console.log('Google OAuth is NOT configured');
    
    app.get('/auth/google', (req, res) => {
        res.json({
            error: 'Google OAuth not configured',
            note: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables'
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
        console.log('Server started successfully!');
        console.log('Environment:', nodeEnv);
        console.log('Port:', port);
        console.log('Server URL:', serverBaseUrl);
        console.log('');
        console.log('Test endpoints:');
        console.log('  Home:', serverBaseUrl);
        console.log('  Health:', serverBaseUrl + '/health');
        console.log('  Auth status:', serverBaseUrl + '/auth/status');
        console.log('  Google login:', serverBaseUrl + '/auth/google');
        console.log('');
        console.log('For localhost: http://localhost:' + port);
        console.log('For Render: https://book-collection-api-0vgp.onrender.com');
    });
};

if (require.main === module) {
    startServer();
}

module.exports = app;