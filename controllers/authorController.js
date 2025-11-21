const Author = require('../models/Author');

// GET all authors
const getAllAuthors = async (req, res) => {
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
            message: 'Error retrieving authors',
            error: error.message
        });
    }
};

// GET single author by ID
const getAuthorById = async (req, res) => {
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
        res.status(500).json({
            success: false,
            message: 'Error retrieving author',
            error: error.message
        });
    }
};

// POST create new author
const createAuthor = async (req, res) => {
    try {
        const author = new Author(req.body);
        const savedAuthor = await author.save();

        res.status(201).json({
            success: true,
            message: 'Author created successfully',
            data: savedAuthor
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error creating author',
            error: error.message
        });
    }
};

// PUT update author by ID
const updateAuthor = async (req, res) => {
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
        res.status(400).json({
            success: false,
            message: 'Error updating author',
            error: error.message
        });
    }
};

// DELETE author by ID
const deleteAuthor = async (req, res) => {
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
        res.status(500).json({
            success: false,
            message: 'Error deleting author',
            error: error.message
        });
    }
};

module.exports = {
    getAllAuthors,
    getAuthorById,
    createAuthor,
    updateAuthor,
    deleteAuthor
};