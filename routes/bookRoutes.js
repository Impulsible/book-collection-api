const express = require('express');
const router = express.Router();
const {
    getAllBooks,
    getBookById,
    createBook,
    updateBook,
    deleteBook
} = require('../controllers/bookController');
const { validateBook, validateObjectId } = require('../middleware/validation');

// GET all books
router.get('/', getAllBooks);

// GET single book by ID
router.get('/:id', validateObjectId, getBookById);

// POST create new book
router.post('/', validateBook, createBook);

// PUT update book by ID
router.put('/:id', validateObjectId, validateBook, updateBook);

// DELETE book by ID
router.delete('/:id', validateObjectId, deleteBook);

module.exports = router;