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
const isAuthenticated = require('../middleware/auth');

console.log('🔄 Book routes loaded - using centralized auth middleware');

// ===== DEBUG ROUTES =====
router.get('/test', (req, res) => {
    console.log('✅ /api/books/test route hit');
    res.json({ 
        success: true, 
        message: 'Books API test route is working!',
        timestamp: new Date().toISOString()
    });
});

router.get('/public-test', (req, res) => {
    res.json({
        success: true,
        message: 'Public books route - no authentication required',
        authenticated: req.isAuthenticated(),
        user: req.user || null
    });
});

// ===== PUBLIC ROUTES =====

/**
 * @swagger
 * /api/books:
 *   get:
 *     summary: Get all books
 *     tags: [Books]
 *     responses:
 *       200:
 *         description: Successfully retrieved all books
 */
router.get('/', getAllBooks);

/**
 * @swagger
 * /api/books/{id}:
 *   get:
 *     summary: Get a specific book by ID
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved the book
 *       400:
 *         description: Invalid ID format
 *       404:
 *         description: Book not found
 */
router.get('/:id', validateObjectId, getBookById);

// ===== PROTECTED ROUTES =====

/**
 * @swagger
 * /api/books:
 *   post:
 *     summary: Create a new book (Protected)
 *     tags: [Books]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Book created successfully
 *       401:
 *         description: Authentication required
 */
router.post('/', isAuthenticated, validateBook, createBook);

/**
 * @swagger
 * /api/books/{id}:
 *   put:
 *     summary: Update a book by ID (Protected)
 *     tags: [Books]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Book updated successfully
 *       401:
 *         description: Authentication required
 */
router.put('/:id', isAuthenticated, validateObjectId, validateBook, updateBook);

/**
 * @swagger
 * /api/books/{id}:
 *   delete:
 *     summary: Delete a book by ID (Protected)
 *     tags: [Books]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Book deleted successfully
 *       401:
 *         description: Authentication required
 */
router.delete('/:id', isAuthenticated, validateObjectId, deleteBook);

console.log('✅ All book routes configured successfully');

module.exports = router;