const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    sparse: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  displayName: {
    type: String,
    required: true
  },
  profileImage: {
    type: String
  }
}, {
  timestamps: true
});

// ===== FIXED: Remove password field if it exists =====
// Since we're using OAuth, we don't need passwords

module.exports = mongoose.model('User', userSchema);