const mongoose = require('mongoose');

const authorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Author name is required'],
        trim: true,
        maxlength: [100, 'Author name cannot exceed 100 characters']
    },
    bio: {
        type: String,
        maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    birthYear: {
        type: Number,
        required: [true, 'Birth year is required'],
        min: [1000, 'Birth year must be after 1000'],
        max: [new Date().getFullYear(), 'Birth year cannot be in the future']
    },
    nationality: {
        type: String,
        required: [true, 'Nationality is required'],
        trim: true,
        maxlength: [50, 'Nationality cannot exceed 50 characters']
    },
    website: {
        type: String,
        match: [/^https?:\/\/.+\..+/, 'Please enter a valid website URL']
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Author', authorSchema);