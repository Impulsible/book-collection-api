// middleware/auth.js

/**
 * Enhanced authentication middleware with comprehensive debugging
 */
const isAuthenticated = (req, res, next) => {
    console.log('🔐 Auth Middleware Triggered:');
    console.log('  - Path:', req.path);
    console.log('  - Method:', req.method);
    console.log('  - Session ID:', req.sessionID ? req.sessionID.substring(0, 10) + '...' : 'None');
    console.log('  - isAuthenticated():', req.isAuthenticated());
    console.log('  - User:', req.user ? {
        id: req.user.id,
        displayName: req.user.displayName,
        email: req.user.email
    } : 'None');

    if (req.isAuthenticated()) {
        console.log('✅ Authentication SUCCESS - User:', req.user.displayName);
        return next();
    }

    console.log('❌ Authentication FAILED - Blocking access');
    
    res.status(401).json({ 
        success: false,
        message: 'Unauthorized: Please log in to access this resource',
        loginUrl: '/auth/google',
        authenticated: false,
        sessionId: req.sessionID
    });
};

module.exports = isAuthenticated;