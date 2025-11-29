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

// GET all authors
router.get('/', getAllAuthors);

// GET single author by ID
router.get('/:id', validateObjectId, getAuthorById);

// ===== PROTECTED ROUTES =====

// POST create new author - PROTECTED
router.post('/', isAuthenticated, validateAuthor, createAuthor);

// PUT update author by ID - PROTECTED
router.put('/:id', isAuthenticated, validateObjectId, validateAuthor, updateAuthor);

// DELETE author by ID - PROTECTED
router.delete('/:id', isAuthenticated, validateObjectId, deleteAuthor);

console.log('✅ All author routes configured successfully');

module.exports = router;