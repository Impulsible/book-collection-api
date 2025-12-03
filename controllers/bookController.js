const Book = require('../models/book');

// Get all books from our database
const getAllBooks = async (req, res) => {
    try {
        // Find all books and sort them by title
        const books = await Book.find().sort({ title: 1 });
        
        res.json({
            success: true,
            books: books,
            count: books.length
        });
        
    } catch (error) {
        console.log('Error getting books:', error.message);
        res.status(500).json({
            success: false,
            message: 'Could not get books list',
            error: error.message
        });
    }
};

// Get one specific book by its ID
const getBookById = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        
        if (!book) {
            return res.status(404).json({
                success: false,
                message: 'Could not find a book with that ID'
            });
        }

        res.json({
            success: true,
            book: book
        });
        
    } catch (error) {
        console.log('Error getting book:', error.message);
        
        // Check if it's an invalid ID format
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'That book ID format is not valid'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error looking up book',
            error: error.message
        });
    }
};

// Create a new book (requires login)
const createBook = async (req, res) => {
    try {
        // Make sure user is logged in
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Please log in to add books'
            });
        }

        const newBook = new Book(req.body);
        const savedBook = await newBook.save();

        res.status(201).json({
            success: true,
            message: 'Book added to collection',
            book: savedBook,
            addedBy: {
                name: req.user.displayName,
                userId: req.user.id
            }
        });
        
    } catch (error) {
        console.log('Error creating book:', error.message);
        
        // Check for duplicate ISBN
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'A book with this ISBN already exists',
                error: 'Duplicate ISBN'
            });
        }
        
        // Check for validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Book data is not valid',
                errors: errors
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Could not create book',
            error: error.message
        });
    }
};

// Update an existing book (requires login)
const updateBook = async (req, res) => {
    try {
        // Make sure user is logged in
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Please log in to update books'
            });
        }

        const book = await Book.findByIdAndUpdate(
            req.params.id,
            req.body,
            { 
                new: true, // Return the updated book
                runValidators: true // Check that the update is valid
            }
        );

        if (!book) {
            return res.status(404).json({
                success: false,
                message: 'Book not found - cannot update'
            });
        }

        res.json({
            success: true,
            message: 'Book updated',
            book: book,
            updatedBy: {
                name: req.user.displayName,
                userId: req.user.id
            }
        });
        
    } catch (error) {
        console.log('Error updating book:', error.message);
        
        // Check for duplicate ISBN
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'A book with this ISBN already exists',
                error: 'Duplicate ISBN'
            });
        }
        
        // Check for validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Update data is not valid',
                errors: errors
            });
        }
        
        // Check for invalid ID format
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid book ID format'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Could not update book',
            error: error.message
        });
    }
};

// Delete a book (requires login)
const deleteBook = async (req, res) => {
    try {
        // Make sure user is logged in
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Please log in to remove books'
            });
        }

        const book = await Book.findByIdAndDelete(req.params.id);

        if (!book) {
            return res.status(404).json({
                success: false,
                message: 'Book not found - cannot delete'
            });
        }

        res.json({
            success: true,
            message: 'Book removed from collection',
            book: book,
            removedBy: {
                name: req.user.displayName,
                userId: req.user.id
            }
        });
        
    } catch (error) {
        console.log('Error deleting book:', error.message);
        
        // Check for invalid ID format
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid book ID format'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Could not delete book',
            error: error.message
        });
    }
};

// Export all our book functions
module.exports = {
    getAllBooks,
    getBookById,
    createBook,
    updateBook,
    deleteBook
};