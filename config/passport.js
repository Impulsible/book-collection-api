const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;

// Validate required environment variables
const validateOAuthConfig = () => {
  const required = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
  const missing = required.filter(key => !process.env[key] || process.env[key].trim() === '');
  
  if (missing.length > 0) {
    console.warn(`⚠️  OAuth disabled - Missing environment variables: ${missing.join(', ')}`);
    return false;
  }
  
  // Check if values are placeholders
  const hasPlaceholders = required.some(key => 
    process.env[key].includes('your_actual_google_client_id') || 
    process.env[key].includes('your_actual_google_client_secret')
  );
  
  if (hasPlaceholders) {
    console.warn('⚠️  OAuth disabled - Environment variables contain placeholder values');
    return false;
  }
  
  return true;
};

// Initialize OAuth only if properly configured
if (validateOAuthConfig()) {
  try {
    const callbackURL = process.env.NODE_ENV === 'production' 
      ? "https://book-collection-api-0vgp.onrender.com/auth/google/callback"
      : "http://localhost:3000/auth/google/callback";

    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID.trim(),
      clientSecret: process.env.GOOGLE_CLIENT_SECRET.trim(),
      callbackURL: callbackURL,
      passReqToCallback: true
    }, function(request, accessToken, refreshToken, profile, done) {
      console.log('✅ Google authentication successful for:', profile.displayName);
      return done(null, profile);
    }));

    console.log('✅ OAuth Strategy configured successfully');
  } catch (error) {
    console.error('❌ OAuth configuration error:', error.message);
  }
} else {
  console.log('🔒 OAuth authentication disabled');
}

// Always set up serialization (required for Passport)
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

module.exports = passport;