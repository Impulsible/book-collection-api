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

// On Render, RENDER_EXTERNAL_URL is provided automatically
if (process.env.RENDER_EXTERNAL_URL) {
    // Running on Render
    serverBaseUrl = process.env.RENDER_EXTERNAL_URL;
    console.log('Running on Render');
} else if (process.env.RENDER_URL) {
    // Using RENDER_URL from environment
    serverBaseUrl = process.env.RENDER_URL;
    console.log('Using RENDER_URL from environment');
} else {
    // Default to localhost for development
    serverBaseUrl = `http://localhost:${port}`;
    console.log('Running locally');
}

console.log('Starting Book Collection API');
console.log('Environment:', nodeEnv);
console.log('Port:', port);
console.log('Server URL:', serverBaseUrl);

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
].filter(origin => origin); // Remove any empty values

// Log allowed origins
console.log('Allowed origins:', allowedOrigins);

// Enable CORS
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin
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
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Set up middleware
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

// Set up Passport for authentication
app.use(passport.initialize());
app.use(passport.session());
require('./config/passport');

// Set up Swagger documentation
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

// Add current server URL if not already in the list
const currentServerExists = swaggerServers.some(server => server.url === serverBaseUrl);
if (!currentServerExists && serverBaseUrl) {
    swaggerServers.unshift({
        url: serverBaseUrl,
        description: 'Current Server'
    });
}

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
            securitySchemes: {
                sessionAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'bookCollectionSession'
                }
            }
        }
    },
    apis: ['./routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Serve Swagger UI
app.use('/api-docs', 
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec)
);

// Basic routes
app.get('/', (req, res) => {
    res.json({
        message: 'Book Collection API',
        version: '1.0.0',
        server: serverBaseUrl,
        endpoints: {
            books: '/api/books',
            authors: '/api/authors',
            docs: '/api-docs',
            health: '/health',
            auth: {
                login: '/auth/google',
                status: '/auth/status',
                logout: '/auth/logout'
            }
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
        server: serverBaseUrl
    });
});

// Authentication routes
app.get('/auth/status', (req, res) => {
    const isLoggedIn = req.isAuthenticated();
    
    res.json({
        authenticated: isLoggedIn,
        user: isLoggedIn ? {
            id: req.user.id,
            name: req.user.displayName,
            email: req.user.email
        } : null
    });
});

// Check if Google auth is configured
const hasGoogleAuth = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

if (hasGoogleAuth) {
    // Google login
    app.get('/auth/google',
        passport.authenticate('google', { 
            scope: ['email', 'profile'] 
        })
    );

    // Google callback
    app.get('/auth/google/callback',
        passport.authenticate('google', { 
            failureRedirect: '/auth/failure' 
        }),
        (req, res) => {
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
                name: req.user.displayName,
                email: req.user.email
            }
        });
    });
} else {
    // Fallback if Google auth not configured
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
            message: 'Logged out'
        });
    });
});

// Login failure
app.get('/auth/failure', (req, res) => {
    res.status(401).json({
        error: 'Login failed'
    });
});

// Database connection
const connectToDatabase = async () => {
    try {
        await mongoose.connect(mongodbUri);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error.message);
        process.exit(1);
    }
};

// Load route files
const bookRoutes = require('./routes/bookRoutes');
const authorRoutes = require('./routes/authorRoutes');

app.use('/api/books', bookRoutes);
app.use('/api/authors', authorRoutes);

// Error handlers
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found'
    });
});

app.use((error, req, res, next) => {
    console.error('Server error:', error);
    
    res.status(500).json({
        error: 'Internal server error'
    });
});

// Start server
const startServer = async () => {
    await connectToDatabase();
    
    app.listen(port, '0.0.0.0', () => {
        console.log('Server started');
        console.log('Local URL: http://localhost:' + port);
        console.log('Production URL: https://book-collection-api-0vgp.onrender.com');
        console.log('Current URL:', serverBaseUrl);
        console.log('API docs:', serverBaseUrl + '/api-docs');
    });
};

if (require.main === module) {
    startServer();
}

module.exports = app;