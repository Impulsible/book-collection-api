const express = require('express');
const router = express.Router();
const {
    getAllAuthors,
    getAuthorById,
    createAuthor,
    updateAuthor,
    deleteAuthor
} = require('../controllers/authorController');
const { validateAuthor, validateObjectId } = require('../middleware/validation');
const isAuthenticated = require('../middleware/auth');

console.log('🔄 Author routes loaded - using centralized auth middleware');

// ===== PUBLIC ROUTES =====

/**
 * @swagger
 * /api/authors:
 *   get:
 *     summary: Get all authors
 *     tags: [Authors]
 *     responses:
 *       200:
 *         description: Successfully retrieved all authors
 */
router.get('/', getAllAuthors);

/**
 * @swagger
 * /api/authors/{id}:
 *   get:
 *     summary: Get a specific author by ID
 *     tags: [Authors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved the author
 *       400:
 *         description: Invalid ID format
 *       404:
 *         description: Author not found
 */
router.get('/:id', validateObjectId, getAuthorById);

// ===== PROTECTED ROUTES =====

/**
 * @swagger
 * /api/authors:
 *   post:
 *     summary: Create a new author (Protected)
 *     tags: [Authors]
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
 *         description: Author created successfully
 *       401:
 *         description: Authentication required
 */
router.post('/', isAuthenticated, validateAuthor, createAuthor);

/**
 * @swagger
 * /api/authors/{id}:
 *   put:
 *     summary: Update an author by ID (Protected)
 *     tags: [Authors]
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
 *         description: Author updated successfully
 *       401:
 *         description: Authentication required
 */
router.put('/:id', isAuthenticated, validateObjectId, validateAuthor, updateAuthor);

/**
 * @swagger
 * /api/authors/{id}:
 *   delete:
 *     summary: Delete an author by ID (Protected)
 *     tags: [Authors]
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
 *         description: Author deleted successfully
 *       401:
 *         description: Authentication required
 */
router.delete('/:id', isAuthenticated, validateObjectId, deleteAuthor);

console.log('✅ All author routes configured successfully');

module.exports = router;