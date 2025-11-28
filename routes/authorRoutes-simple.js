const express = require('express');
const router = express.Router();
const Author = require('../models/Author');
const requireAuth = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     Author:
 *       type: object
 *       required:
 *         - name
 *         - birthDate
 *         - nationality
 *       properties:
 *         name:
 *           type: string
 *           example: J.K. Rowling
 *         birthDate:
 *           type: string
 *           format: date
 *           example: "1965-07-31"
 *         nationality:
 *           type: string
 *           example: British
 *         biography:
 *           type: string
 *           example: Joanne Rowling, better known by her pen name J.K. Rowling, is a British author and philanthropist.
 *         website:
 *           type: string
 *           example: "https://www.jkrowling.com"
 */

/**
 * @swagger
 * /api/authors:
 *   get:
 *     summary: Get all authors
 *     tags: [Authors]
 *     responses:
 *       200:
 *         description: Successfully retrieved all authors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Author'
 *                 count:
 *                   type: integer
 *                   example: 10
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req, res) => {
    try {
        const authors = await Author.find().sort({ name: 1 });
        res.json({
            success: true,
            data: authors,
            count: authors.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching authors',
            error: error.message
        });
    }
});

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
 *         description: MongoDB ObjectId of the author
 *     responses:
 *       200:
 *         description: Successfully retrieved the author
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Author'
 *       400:
 *         description: Invalid ID format
 *       404:
 *         description: Author not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', async (req, res) => {
    try {
        const author = await Author.findById(req.params.id);
        if (!author) {
            return res.status(404).json({
                success: false,
                message: 'Author not found'
            });
        }
        res.json({
            success: true,
            data: author
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid author ID format'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error fetching author',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/authors:
 *   post:
 *     summary: Create a new author
 *     tags: [Authors]
 *     security:
 *       - oauth2: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Author'
 *     responses:
 *       201:
 *         description: Author created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Author created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Author'
 *       401:
 *         description: Authentication required
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/', requireAuth, async (req, res) => {
    try {
        const author = new Author(req.body);
        await author.save();
        res.status(201).json({
            success: true,
            message: 'Author created successfully',
            data: author
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error creating author',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/authors/{id}:
 *   put:
 *     summary: Update an author by ID
 *     tags: [Authors]
 *     security:
 *       - oauth2: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the author to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Author'
 *     responses:
 *       200:
 *         description: Author updated successfully
 *       401:
 *         description: Authentication required
 *       400:
 *         description: Validation error
 *       404:
 *         description: Author not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const author = await Author.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!author) {
            return res.status(404).json({
                success: false,
                message: 'Author not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Author updated successfully',
            data: author
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors
            });
        }
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid author ID format'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error updating author',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/authors/{id}:
 *   delete:
 *     summary: Delete an author by ID
 *     tags: [Authors]
 *     security:
 *       - oauth2: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the author to delete
 *     responses:
 *       200:
 *         description: Author deleted successfully
 *       401:
 *         description: Authentication required
 *       400:
 *         description: Invalid ID format
 *       404:
 *         description: Author not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const author = await Author.findByIdAndDelete(req.params.id);
        
        if (!author) {
            return res.status(404).json({
                success: false,
                message: 'Author not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Author deleted successfully',
            data: author
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid author ID format'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error deleting author',
            error: error.message
        });
    }
});

module.exports = router;