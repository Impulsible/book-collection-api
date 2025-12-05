const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

console.log('Initializing Passport for Google OAuth...');

// Check if we have Google credentials
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
    console.log('WARNING: Google OAuth credentials not found');
    console.log('Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to environment variables');
} else {
    console.log('Google OAuth credentials found');
    
    // Get callback URL based on environment
    const getCallbackURL = () => {
        const isProduction = process.env.NODE_ENV === 'production';
        
        if (isProduction) {
            // Production URL for Render
            return 'https://book-collection-api-0vgp.onrender.com/auth/google/callback';
        } else {
            // Development URL for localhost
            return 'http://localhost:3000/auth/google/callback';
        }
    };
    
    const callbackURL = getCallbackURL();
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Using callback URL:', callbackURL);
    
    // Configure Google Strategy
    passport.use(new GoogleStrategy({
        clientID: clientId,
        clientSecret: clientSecret,
        callbackURL: callbackURL,
        passReqToCallback: false
    },
    function(accessToken, refreshToken, profile, done) {
        console.log('Google OAuth successful!');
        console.log('User:', profile.displayName);
        console.log('Email:', profile.emails[0].value);
        
        // Return the profile
        return done(null, profile);
    }));
    
    // Serialize user
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });
    
    // Deserialize user
    passport.deserializeUser(function(id, done) {
        // Return simple user object
        done(null, { id: id });
    });
    
    console.log('Passport configured successfully for', process.env.NODE_ENV);
}

module.exports = passport;