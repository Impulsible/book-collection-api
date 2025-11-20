// Book validation
const validateBook = (req, res, next) => {
    const { title, author, isbn, publicationYear, genre, publisher, pageCount } = req.body;
    
    const errors = [];

    // Required field validation
    if (!title) errors.push('Title is required');
    if (!author) errors.push('Author is required');
    if (!isbn) errors.push('ISBN is required');
    if (!publicationYear) errors.push('Publication year is required');
    if (!genre) errors.push('Genre is required');
    if (!publisher) errors.push('Publisher is required');
    if (!pageCount) errors.push('Page count is required');

    // Data validation
    if (title && title.length > 200) errors.push('Title cannot exceed 200 characters');
    if (author && author.length > 100) errors.push('Author name cannot exceed 100 characters');
    if (isbn && !/^(?:\d{10}|\d{13})$/.test(isbn)) {
        errors.push('ISBN must be 10 or 13 digits');
    }
    if (publicationYear && (publicationYear < 1000 || publicationYear > new Date().getFullYear())) {
        errors.push(`Publication year must be between 1000 and ${new Date().getFullYear()}`);
    }
    if (pageCount && pageCount < 1) errors.push('Page count must be at least 1');
    if (req.body.description && req.body.description.length > 1000) {
        errors.push('Description cannot exceed 1000 characters');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors
        });
    }

    next();
};

// Member validation
const validateMember = (req, res, next) => {
    const { firstName, lastName, email, membershipType } = req.body;
    
    const errors = [];

    if (!firstName) errors.push('First name is required');
    if (!lastName) errors.push('Last name is required');
    if (!email) errors.push('Email is required');
    if (!membershipType) errors.push('Membership type is required');

    if (firstName && firstName.length > 50) errors.push('First name cannot exceed 50 characters');
    if (lastName && lastName.length > 50) errors.push('Last name cannot exceed 50 characters');
    if (email && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
        errors.push('Please enter a valid email address');
    }
    if (req.body.phone && !/^\d{10,15}$/.test(req.body.phone)) {
        errors.push('Phone number must be 10-15 digits');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors
        });
    }

    next();
};

// ObjectId validation
const validateObjectId = (req, res, next) => {
    const { id } = req.params;
    
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid ID format'
        });
    }
    
    next();
};

module.exports = {
    validateBook,
    validateMember,
    validateObjectId
};