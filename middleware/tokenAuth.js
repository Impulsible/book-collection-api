// middleware/tokenAuth.js

// Check for API token authentication (for testing)
const tokenAuth = (req, res, next) => {
  // Look for token in headers or query string
  const token = req.header('X-API-Token') || req.query.apiToken;
  
  // If they provide our test token, let them through
  if (token === 'test-token-123') {
    // Create a fake user for testing
    req.user = {
      id: 'test-user-123',
      displayName: 'API Test User',
      email: 'test@example.com'
    };
    
    // Log it so we know when this is being used
    console.log('API token used for:', req.method, req.path);
    
    return next();
  }
  
  // If no token, check if they're logged in normally
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  // No token and not logged in - block access
  res.status(401).json({
    success: false,
    message: 'Authentication required',
    options: [
      'Log in at /auth/google',
      'Or use test token: X-API-Token: test-token-123'
    ]
  });
};

module.exports = tokenAuth;