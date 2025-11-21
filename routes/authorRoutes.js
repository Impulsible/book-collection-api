const express = require('express');
const router = express.Router();
const {
    getAllAuthors,
    getAuthorById,
    createAuthor,
    updateAuthor,
    deleteAuthor
} = require('../controllers/authorController');
const { validateObjectId } = require('../middleware/validation');

// GET all authors
router.get('/', getAllAuthors);

// GET single author by ID
router.get('/:id', validateObjectId, getAuthorById);

// POST create new author
router.post('/', createAuthor);

// PUT update author by ID
router.put('/:id', validateObjectId, updateAuthor);

// DELETE author by ID
router.delete('/:id', validateObjectId, deleteAuthor);

module.exports = router;