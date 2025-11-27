// middleware/auth.js
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ 
        success: false,
        message: 'Unauthorized: Please log in to access this resource',
        loginUrl: '/auth/google',
        authenticated: false
    });
}

module.exports = isAuthenticated;