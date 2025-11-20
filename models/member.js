const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
        type: String,
        match: [/^\d{10,15}$/, 'Please enter a valid phone number']
    },
    membershipType: {
        type: String,
        required: [true, 'Membership type is required'],
        enum: ['Basic', 'Premium', 'Student', 'Senior'],
        default: 'Basic'
    },
    joinDate: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    },
    maxBooks: {
        type: Number,
        default: 5,
        min: [1, 'Maximum books must be at least 1'],
        max: [20, 'Maximum books cannot exceed 20']
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Member', memberSchema);