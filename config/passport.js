const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback",
    passReqToCallback: true
}, function(request, accessToken, refreshToken, profile, done) {
    // For this assignment, we'll just use the profile info
    // In a real app, you'd save the user to your database here
    console.log('Google authentication successful for:', profile.displayName);
    console.log('User email:', profile.emails[0].value);
    return done(null, profile);
}));

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

module.exports = passport;