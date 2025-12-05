const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

console.log('Initializing Passport...');

// Check if we have Google credentials
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
    console.log('WARNING: Google OAuth credentials not found');
} else {
    console.log('Google OAuth credentials found');
    
    // Get callback URL based on environment
    const getCallbackURL = () => {
        const isProduction = process.env.NODE_ENV === 'production';
        return isProduction 
            ? 'https://book-collection-api-0vgp.onrender.com/auth/google/callback'
            : 'http://localhost:3000/auth/google/callback';
    };
    
    const callbackURL = getCallbackURL();
    console.log('Callback URL:', callbackURL);
    
    // Google Strategy
    passport.use(new GoogleStrategy({
        clientID: clientId,
        clientSecret: clientSecret,
        callbackURL: callbackURL,
        passReqToCallback: false
    },
    function(accessToken, refreshToken, profile, done) {
        console.log('Google authentication successful for:', profile.displayName);
        
        // Return user profile
        const user = {
            id: profile.id,
            displayName: profile.displayName,
            email: profile.emails[0].value,
            photo: profile.photos?.[0]?.value || '',
            provider: 'google'
        };
        
        return done(null, user);
    }));
    
    // Serialize user to session
    passport.serializeUser(function(user, done) {
        console.log('Serializing user:', user.id);
        done(null, user.id);
    });
    
    // Deserialize user from session
    passport.deserializeUser(function(id, done) {
        console.log('Deserializing user ID:', id);
        // In a real app, you would fetch user from database
        // For now, return a simple user object
        done(null, { id: id });
    });
    
    console.log('Passport configured successfully');
}

module.exports = passport;