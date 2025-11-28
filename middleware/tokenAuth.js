// Token-based authentication that works reliably
const tokenAuth = (req, res, next) => {
  // Check for token in header
  const token = req.header('X-API-Token') || req.query.apiToken;
  
  // Simple token for testing
  if (token === 'test-token-123') {
    req.user = {
      id: 'test-user-id',
      displayName: 'Test User',
      emails: [{ value: 'test@example.com' }]
    };
    console.log('✅ Token authentication successful');
    return next();
  }
  
  // Fall back to session auth
  if (req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({
    success: false,
    message: 'Unauthorized: Please log in or use token',
    loginUrl: '/auth/google',
    note: 'Use header: X-API-Token: test-token-123'
  });
};

module.exports = tokenAuth;