const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Author model
const Author = mongoose.model('Author', new mongoose.Schema({
    name: { type: String, required: true },
    biography: String,
    birthDate: Date,
    nationality: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}));

/**
 * @swagger
 * /api/authors:
 *   get:
 *     summary: Get all authors
 *     description: Retrieve a list of all authors
 *     tags: [Authors]
 *     responses:
 *       200:
 *         description: Successful response with array of authors
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
 *                   type: number
 *                   example: 0
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
        console.error('Error fetching authors:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch authors'
        });
    }
});

/**
 * @swagger
 * /api/authors/{id}:
 *   get:
 *     summary: Get author by ID
 *     description: Retrieve a specific author by its ID
 *     tags: [Authors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "673a1b2c3d4e5f6789012345"
 *     responses:
 *       200:
 *         description: Author found successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
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
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid author ID format'
            });
        }

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
        console.error('Error fetching author:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch author'
        });
    }
});

/**
 * @swagger
 * /api/authors:
 *   post:
 *     summary: Create a new author
 *     description: Add a new author with data validation
 *     tags: [Authors]
 *     security:
 *       - sessionAuth: []
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
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Author'
 *       400:
 *         description: Validation error - missing or invalid data
 *       401:
 *         description: Unauthorized - please log in
 *       500:
 *         description: Internal server error
 */
router.post('/', async (req, res) => {
    try {
        // Check authentication
        if (!req.isAuthenticated || !req.isAuthenticated()) {
            return res.status(401).json({
                success: false,
                message: 'Please log in first'
            });
        }

        const { name } = req.body;
        
        // Basic validation
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Author name is required'
            });
        }

        const authorData = {
            name,
            biography: req.body.biography,
            birthDate: req.body.birthDate,
            nationality: req.body.nationality
        };

        const author = new Author(authorData);
        await author.save();

        res.status(201).json({
            success: true,
            message: 'Author created successfully',
            data: author
        });
    } catch (error) {
        console.error('Error creating author:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create author'
        });
    }
});

/**
 * @swagger
 * /api/authors/{id}:
 *   put:
 *     summary: Update author by ID
 *     description: Update an existing author with data validation
 *     tags: [Authors]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "673a1b2c3d4e5f6789012345"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Author'
 *     responses:
 *       200:
 *         description: Author updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Author'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - please log in
 *       404:
 *         description: Author not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', async (req, res) => {
    try {
        // Check authentication
        if (!req.isAuthenticated || !req.isAuthenticated()) {
            return res.status(401).json({
                success: false,
                message: 'Please log in first'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid author ID format'
            });
        }

        const author = await Author.findById(req.params.id);
        if (!author) {
            return res.status(404).json({
                success: false,
                message: 'Author not found'
            });
        }

        // Update author fields
        Object.keys(req.body).forEach(key => {
            if (req.body[key] !== undefined) {
                author[key] = req.body[key];
            }
        });
        
        author.updatedAt = Date.now();
        await author.save();

        res.json({
            success: true,
            message: 'Author updated successfully',
            data: author
        });
    } catch (error) {
        console.error('Error updating author:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update author'
        });
    }
});

/**
 * @swagger
 * /api/authors/{id}:
 *   delete:
 *     summary: Delete author by ID
 *     description: Remove an author from the collection
 *     tags: [Authors]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "673a1b2c3d4e5f6789012345"
 *     responses:
 *       200:
 *         description: Author deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid ID format
 *       401:
 *         description: Unauthorized - please log in
 *       404:
 *         description: Author not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', async (req, res) => {
    try {
        // Check authentication
        if (!req.isAuthenticated || !req.isAuthenticated()) {
            return res.status(401).json({
                success: false,
                message: 'Please log in first'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid author ID format'
            });
        }

        const author = await Author.findByIdAndDelete(req.params.id);
        if (!author) {
            return res.status(404).json({
                success: false,
                message: 'Author not found'
            });
        }

        res.json({
            success: true,
            message: 'Author deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting author:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete author'
        });
    }
});

module.exports = router;