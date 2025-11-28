const Book = require('../models/Book');

// GET all books
const getAllBooks = async (req, res) => {
    try {
        console.log('📚 Get All Books - Public route accessed');
        const books = await Book.find().sort({ title: 1 });
        
        res.json({
            success: true,
            data: books,
            count: books.length
        });
    } catch (error) {
        console.error('❌ Error retrieving books:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving books',
            error: error.message
        });
    }
};

// GET single book by ID
const getBookById = async (req, res) => {
    try {
        console.log('📚 Get Book By ID - Public route accessed, ID:', req.params.id);
        const book = await Book.findById(req.params.id);
        
        if (!book) {
            console.log('❌ Book not found:', req.params.id);
            return res.status(404).json({
                success: false,
                message: 'Book not found'
            });
        }

        console.log('✅ Book found:', book.title);
        res.json({
            success: true,
            data: book
        });
    } catch (error) {
        console.error('❌ Error retrieving book:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving book',
            error: error.message
        });
    }
};

// POST create new book
const createBook = async (req, res) => {
    try {
        console.log('📖 Create Book Controller:');
        console.log('  - Authenticated User:', req.user ? {
            id: req.user.id,
            displayName: req.user.displayName,
            email: req.user.emails?.[0]?.value
        } : 'No user');
        console.log('  - Request Body:', req.body);
        
        // Additional authentication check (should already be handled by middleware)
        if (!req.user) {
            console.log('❌ No user in request - authentication issue');
            return res.status(401).json({
                success: false,
                message: 'Authentication required - no user session',
                loginUrl: '/auth/google'
            });
        }

        const book = new Book(req.body);
        const savedBook = await book.save();

        console.log('✅ Book created successfully by:', req.user.displayName);
        res.status(201).json({
            success: true,
            message: 'Book created successfully',
            data: savedBook,
            createdBy: {
                userId: req.user.id,
                displayName: req.user.displayName,
                email: req.user.emails?.[0]?.value
            }
        });
    } catch (error) {
        console.error('❌ Error creating book:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'ISBN already exists',
                error: 'Duplicate ISBN detected'
            });
        }
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            console.log('❌ Validation errors:', errors);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors
            });
        }
        
        res.status(400).json({
            success: false,
            message: 'Error creating book',
            error: error.message
        });
    }
};

// PUT update book by ID
const updateBook = async (req, res) => {
    try {
        console.log('📖 Update Book Controller:');
        console.log('  - Authenticated User:', req.user ? req.user.displayName : 'No user');
        console.log('  - Book ID:', req.params.id);
        console.log('  - Update Data:', req.body);

        // Additional authentication check
        if (!req.user) {
            console.log('❌ No user in request - authentication issue');
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
                loginUrl: '/auth/google'
            });
        }

        const book = await Book.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!book) {
            console.log('❌ Book not found for update:', req.params.id);
            return res.status(404).json({
                success: false,
                message: 'Book not found'
            });
        }

        console.log('✅ Book updated successfully by:', req.user.displayName);
        res.json({
            success: true,
            message: 'Book updated successfully',
            data: book,
            updatedBy: {
                userId: req.user.id,
                displayName: req.user.displayName,
                email: req.user.emails?.[0]?.value
            }
        });
    } catch (error) {
        console.error('❌ Error updating book:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'ISBN already exists',
                error: 'Duplicate ISBN detected'
            });
        }
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            console.log('❌ Validation errors:', errors);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors
            });
        }
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid book ID format'
            });
        }
        
        res.status(400).json({
            success: false,
            message: 'Error updating book',
            error: error.message
        });
    }
};

// DELETE book by ID
const deleteBook = async (req, res) => {
    try {
        console.log('📖 Delete Book Controller:');
        console.log('  - Authenticated User:', req.user ? req.user.displayName : 'No user');
        console.log('  - Book ID to delete:', req.params.id);

        // Additional authentication check
        if (!req.user) {
            console.log('❌ No user in request - authentication issue');
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
                loginUrl: '/auth/google'
            });
        }

        const book = await Book.findByIdAndDelete(req.params.id);

        if (!book) {
            console.log('❌ Book not found for deletion:', req.params.id);
            return res.status(404).json({
                success: false,
                message: 'Book not found'
            });
        }

        console.log('✅ Book deleted successfully by:', req.user.displayName);
        res.json({
            success: true,
            message: 'Book deleted successfully',
            data: book,
            deletedBy: {
                userId: req.user.id,
                displayName: req.user.displayName,
                email: req.user.emails?.[0]?.value
            }
        });
    } catch (error) {
        console.error('❌ Error deleting book:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid book ID format'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error deleting book',
            error: error.message
        });
    }
};

module.exports = {
    getAllBooks,
    getBookById,
    createBook,
    updateBook,
    deleteBook
};