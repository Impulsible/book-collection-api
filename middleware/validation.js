// middleware/validation.js
const mongoose = require('mongoose');

const validateBook = (req, res, next) => {
    console.log('📖 Validating book data:', req.body);
    
    const { title, author, isbn, publicationYear, genre, publisher, pageCount } = req.body;
    const errors = [];

    // Required fields validation
    if (!title) errors.push('Title is required');
    if (!author) errors.push('Author is required');
    if (!isbn) errors.push('ISBN is required');
    if (!publicationYear) errors.push('Publication year is required');
    if (!genre) errors.push('Genre is required');

    // Data type validation
    if (publicationYear && !Number.isInteger(publicationYear)) {
        errors.push('Publication year must be a number');
    }
    
    if (publicationYear && (publicationYear < 1000 || publicationYear > new Date().getFullYear() + 5)) {
        errors.push('Publication year must be reasonable (1000 - current year + 5)');
    }

    if (pageCount && !Number.isInteger(pageCount)) {
        errors.push('Page count must be a number');
    }
    
    if (pageCount && pageCount <= 0) {
        errors.push('Page count must be positive');
    }

    // ISBN format validation (basic)
    if (isbn && typeof isbn !== 'string') {
        errors.push('ISBN must be a string');
    }

    if (isbn && isbn.length < 10) {
        errors.push('ISBN appears to be invalid (too short)');
    }

    if (errors.length > 0) {
        console.log('❌ Book validation errors:', errors);
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors,
            requiredFields: ['title', 'author', 'isbn', 'publicationYear', 'genre'],
            optionalFields: ['publisher', 'pageCount', 'description', 'coverImage']
        });
    }

    console.log('✅ Book validation passed');
    next();
};

const validateAuthor = (req, res, next) => {
    console.log('📝 Validating author data:', req.body);
    
    const { name, bio, birthDate, nationality } = req.body;
    const errors = [];

    // Required fields
    if (!name) errors.push('Author name is required');
    if (!nationality) errors.push('Nationality is required');

    // Data type validation
    if (name && typeof name !== 'string') {
        errors.push('Name must be a string');
    }

    if (bio && typeof bio !== 'string') {
        errors.push('Bio must be a string');
    }

    if (birthDate) {
        const date = new Date(birthDate);
        if (isNaN(date.getTime())) {
            errors.push('Birth date must be a valid date');
        }
    }

    if (errors.length > 0) {
        console.log('❌ Author validation errors:', errors);
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors
        });
    }

    console.log('✅ Author validation passed');
    next();
};

const validateObjectId = (req, res, next) => {
    console.log('🔍 Validating ObjectId:', req.params.id);
    
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid ID format",
            providedId: req.params.id
        });
    }
    next();
};

// Optional: More specific validation for different scenarios
const validateBookUpdate = (req, res, next) => {
    console.log('📖 Validating book update data:', req.body);
    
    const { publicationYear, pageCount } = req.body;
    const errors = [];

    // Only validate fields that are actually being updated
    if (publicationYear && !Number.isInteger(publicationYear)) {
        errors.push('Publication year must be a number');
    }
    
    if (pageCount && !Number.isInteger(pageCount)) {
        errors.push('Page count must be a number');
    }

    if (errors.length > 0) {
        console.log('❌ Book update validation errors:', errors);
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors
        });
    }

    console.log('✅ Book update validation passed');
    next();
};

module.exports = {
    validateBook,
    validateAuthor,
    validateObjectId,
    validateBookUpdate
};