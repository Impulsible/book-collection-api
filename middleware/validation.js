// middleware/validation.js
const mongoose = require('mongoose');

// Check if book data is valid before saving
const validateBook = (req, res, next) => {
    const { title, author, isbn, publicationYear, genre } = req.body;
    const errors = [];

    // Make sure we have all the required fields
    if (!title) errors.push('Book title is required');
    if (!author) errors.push('Author name is required');
    if (!isbn) errors.push('ISBN is required');
    if (!publicationYear) errors.push('Publication year is required');
    if (!genre) errors.push('Genre is required');

    // Check publication year is a reasonable number
    if (publicationYear) {
        const currentYear = new Date().getFullYear();
        if (publicationYear < 1000 || publicationYear > currentYear + 5) {
            errors.push(`Publication year should be between 1000 and ${currentYear + 5}`);
        }
    }

    // Check page count if provided
    if (req.body.pageCount && req.body.pageCount <= 0) {
        errors.push('Page count must be at least 1');
    }

    // If we found any errors, stop here
    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Book data is not valid',
            errors: errors
        });
    }

    // Everything looks good, continue
    next();
};

// Check if author data is valid
const validateAuthor = (req, res, next) => {
    const { name, nationality } = req.body;
    const errors = [];

    // Required fields
    if (!name) errors.push('Author name is required');
    if (!nationality) errors.push('Nationality is required');

    // Check bio length if provided
    if (req.body.bio && req.body.bio.length > 2000) {
        errors.push('Bio is too long (max 2000 characters)');
    }

    // Check birth date if provided
    if (req.body.birthDate) {
        const birthDate = new Date(req.body.birthDate);
        if (isNaN(birthDate.getTime())) {
            errors.push('Birth date must be a valid date');
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Author data is not valid',
            errors: errors
        });
    }

    next();
};

// Check if a MongoDB ID looks valid
const validateObjectId = (req, res, next) => {
    const id = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid ID format'
        });
    }
    
    next();
};

// Export all validation functions
module.exports = {
    validateBook,
    validateAuthor,
    validateObjectId
};