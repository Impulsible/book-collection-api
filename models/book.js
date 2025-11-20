const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    author: {
        type: String,
        required: [true, 'Author is required'],
        trim: true,
        maxlength: [100, 'Author name cannot exceed 100 characters']
    },
    isbn: {
        type: String,
        required: [true, 'ISBN is required'],
        unique: true,
        match: [/^(?:\d{10}|\d{13})$/, 'Please enter a valid 10 or 13 digit ISBN']
    },
    publicationYear: {
        type: Number,
        required: [true, 'Publication year is required'],
        min: [1000, 'Publication year must be after 1000'],
        max: [new Date().getFullYear(), 'Publication year cannot be in the future']
    },
    genre: {
        type: String,
        required: [true, 'Genre is required'],
        enum: [
            'Fiction', 'Non-Fiction', 'Science Fiction', 'Fantasy', 
            'Mystery', 'Thriller', 'Romance', 'Biography', 
            'History', 'Science', 'Technology', 'Self-Help', 'Other'
        ]
    },
    publisher: {
        type: String,
        required: [true, 'Publisher is required'],
        trim: true,
        maxlength: [100, 'Publisher name cannot exceed 100 characters']
    },
    pageCount: {
        type: Number,
        required: [true, 'Page count is required'],
        min: [1, 'Page count must be at least 1']
    },
    description: {
        type: String,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    language: {
        type: String,
        default: 'English',
        maxlength: [50, 'Language cannot exceed 50 characters']
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    location: {
        shelf: String,
        row: Number
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Book', bookSchema);