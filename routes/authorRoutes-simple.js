const express = require('express');
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Author:
 *       type: object
 *       required:
 *         - name
 *         - birthYear
 *         - nationality
 *       properties:
 *         name:
 *           type: string
 *           example: J.K. Rowling
 *         bio:
 *           type: string
 *           example: British author best known for the Harry Potter series
 *         birthYear:
 *           type: integer
 *           example: 1965
 *         nationality:
 *           type: string
 *           example: British
 *         website:
 *           type: string
 *           example: https://www.jkrowling.com
 *         isActive:
 *           type: boolean
 *           example: true
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
 *                   example: 5
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Get all authors - working!',
        data: []
    });
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
 *         example: "651a1b2c3d4e5f6789012345"
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Author not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', (req, res) => {
    res.json({ 
        success: true, 
        message: `Get author by ID: ${req.params.id}`,
        data: null
    });
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
 *                 user:
 *                   type: string
 *                   example: Henry Osuagwu
 *       401:
 *         description: Unauthorized - Please log in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Validation error - missing or invalid data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ 
            success: false,
            message: 'Please log in to create authors'
        });
    }
    res.json({ 
        success: true, 
        message: 'Author created successfully by authenticated user!',
        data: req.body,
        user: req.user.displayName
    });
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
 *         example: "651a1b2c3d4e5f6789012345"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Author updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Author'
 *                 user:
 *                   type: string
 *                   example: Henry Osuagwu
 *       401:
 *         description: Unauthorized - Please log in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Validation error or invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Author not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ 
            success: false,
            message: 'Please log in to update authors'
        });
    }
    res.json({ 
        success: true, 
        message: `Author ${req.params.id} updated successfully!`,
        data: req.body,
        user: req.user.displayName
    });
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
 *         example: "651a1b2c3d4e5f6789012345"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Author deleted successfully
 *                 user:
 *                   type: string
 *                   example: Henry Osuagwu
 *       401:
 *         description: Unauthorized - Please log in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Author not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ 
            success: false,
            message: 'Please log in to delete authors'
        });
    }
    res.json({ 
        success: true, 
        message: `Author ${req.params.id} deleted successfully!`,
        user: req.user.displayName
    });
});

module.exports = router;