const Author = require('../models/Author');

// Get all authors from the database
const getAllAuthors = async (req, res) => {
    try {
        const authors = await Author.find().sort({ name: 1 });
        
        res.json({
            success: true,
            authors: authors,
            total: authors.length
        });
        
    } catch (error) {
        console.log('Error getting authors:', error.message);
        res.status(500).json({
            success: false,
            message: 'Could not get authors list',
            error: error.message
        });
    }
};

// Get one specific author by their ID
const getAuthorById = async (req, res) => {
    try {
        const author = await Author.findById(req.params.id);
        
        if (!author) {
            return res.status(404).json({
                success: false,
                message: 'Could not find an author with that ID'
            });
        }

        res.json({
            success: true,
            author: author
        });
        
    } catch (error) {
        console.log('Error getting author:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error looking up author',
            error: error.message
        });
    }
};

// Create a new author
const createAuthor = async (req, res) => {
    try {
        const newAuthor = new Author(req.body);
        const savedAuthor = await newAuthor.save();

        res.status(201).json({
            success: true,
            message: 'Author added successfully',
            author: savedAuthor
        });
        
    } catch (error) {
        console.log('Error creating author:', error.message);
        
        // Check if it's a validation error
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Author data is not valid',
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Could not create author',
            error: error.message
        });
    }
};

// Update an existing author
const updateAuthor = async (req, res) => {
    try {
        const author = await Author.findByIdAndUpdate(
            req.params.id,
            req.body,
            { 
                new: true, // Return the updated document
                runValidators: true // Make sure the update follows our rules
            }
        );

        if (!author) {
            return res.status(404).json({
                success: false,
                message: 'Author not found - cannot update'
            });
        }

        res.json({
            success: true,
            message: 'Author updated',
            author: author
        });
        
    } catch (error) {
        console.log('Error updating author:', error.message);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Update data is not valid',
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Could not update author',
            error: error.message
        });
    }
};

// Delete an author
const deleteAuthor = async (req, res) => {
    try {
        const author = await Author.findByIdAndDelete(req.params.id);

        if (!author) {
            return res.status(404).json({
                success: false,
                message: 'Author not found - cannot delete'
            });
        }

        res.json({
            success: true,
            message: 'Author removed',
            author: author
        });
        
    } catch (error) {
        console.log('Error deleting author:', error.message);
        res.status(500).json({
            success: false,
            message: 'Could not delete author',
            error: error.message
        });
    }
};

// Export all our functions
module.exports = {
    getAllAuthors,
    getAuthorById,
    createAuthor,
    updateAuthor,
    deleteAuthor
};