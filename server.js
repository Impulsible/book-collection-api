const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

// Import routes
const bookRoutes = require('./routes/bookRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

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
      }
    }
  },
  apis: ['./routes/*.js'], // path to your API routes
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Middleware
app.use(cors());
app.use(express.json());

// Import routes after app initialization
const authorRoutes = require('./routes/authorRoutes');

// Routes
app.use('/api/books', bookRoutes);
app.use('/api/authors', authorRoutes);

// Swagger UI route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }'
}));

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

// Basic routes
app.get('/', (req, res) => {
    res.json({ 
        message: '📚 Book Collection API',
        version: '1.0.0',
        description: 'A complete CRUD API for managing books and authors',
        endpoints: {
            'Books': '/api/books',
            'Authors': '/api/authors',
            'Health check': '/health',
            'API Documentation': '/api-docs'
        },
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        uptime: process.uptime(),
        swagger: '/api-docs'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'Route not found',
        availableEndpoints: {
            'Books': '/api/books',
            'Authors': '/api/authors', 
            'Health': '/health',
            'Documentation': '/api-docs'
        }
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Error:', error);
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: error.message
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
    });
});

module.exports = app;