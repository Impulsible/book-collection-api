// middleware/auth.js

// Check if user is logged in before allowing access
const isAuthenticated = (req, res, next) => {
    // Check if the user is logged in
    if (req.isAuthenticated && req.isAuthenticated()) {
        // User is logged in - let them continue
        return next();
    }
    
    // User is not logged in - send error
    res.status(401).json({ 
        success: false,
        message: 'Please log in first to access this',
        loginUrl: '/auth/google'
    });
};

module.exports = isAuthenticated;