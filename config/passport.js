const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Check if we have Google credentials
const hasGoogleCredentials = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

if (hasGoogleCredentials) {
    // Determine callback URL based on environment
    const getCallbackURL = () => {
        if (process.env.NODE_ENV === 'production') {
            return 'https://book-collection-api-0vgp.onrender.com/auth/google/callback';
        } else {
            return 'http://localhost:3000/auth/google/callback';
        }
    };

    // Set up Google OAuth strategy
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: getCallbackURL()
    },
    function(accessToken, refreshToken, profile, done) {
        // For now, just return the profile
        // You can add database logic here later
        return done(null, profile);
    }));

    // Serialize user to session
    passport.serializeUser(function(user, done) {
        done(null, user);
    });

    // Deserialize user from session
    passport.deserializeUser(function(user, done) {
        done(null, user);
    });
} else {
    console.log('Google OAuth not configured - skipping passport setup');
}