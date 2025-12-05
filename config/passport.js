const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

console.log('Initializing Passport...');

// Check if we have Google credentials
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
    console.log('WARNING: Google OAuth credentials not found in environment variables');
    console.log('Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment');
} else {
    console.log('Google OAuth credentials found');
    
    // Determine callback URL based on environment
    const isProduction = process.env.NODE_ENV === 'production';
    
    let callbackURL;
    
    if (isProduction) {
        // Production URL for Render
        callbackURL = 'https://book-collection-api-0vgp.onrender.com/auth/google/callback';
        console.log('Using production callback URL:', callbackURL);
    } else {
        // Development URL for localhost
        callbackURL = 'http://localhost:3000/auth/google/callback';
        console.log('Using development callback URL:', callbackURL);
    }
    
    console.log('Setting up Google Strategy...');
    
    // Simple Google Strategy
    passport.use(new GoogleStrategy({
        clientID: clientId,
        clientSecret: clientSecret,
        callbackURL: callbackURL
    },
    function(accessToken, refreshToken, profile, done) {
        console.log('Google authentication successful');
        console.log('User:', profile.displayName);
        console.log('Email:', profile.emails[0].value);
        
        // Return the Google profile
        return done(null, profile);
    }));
    
    // Serialize user
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });
    
    // Deserialize user
    passport.deserializeUser(function(id, done) {
        // Just return a simple object with the ID
        // In a real app, you would look up the user in your database here
        done(null, { id: id });
    });
    
    console.log('Passport configured successfully');
}

module.exports = passport;