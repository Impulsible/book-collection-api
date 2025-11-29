const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// ===== FIXED: Serialization =====
passport.serializeUser((user, done) => {
  console.log('🔐 Serializing user:', user.id);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    console.log('🔐 Deserializing user:', id);
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    console.error('❌ Deserialization error:', error);
    done(error, null);
  }
});

// ===== FIXED: Google Strategy =====
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.NODE_ENV === 'production' 
      ? `${process.env.RENDER_URL}/auth/google/callback`
      : "http://localhost:3000/auth/google/callback"
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('🔐 OAuth profile received:', profile.displayName);
      
      // Check if user already exists with this Google ID
      let user = await User.findOne({ googleId: profile.id });
      
      if (user) {
        console.log('✅ Existing user found:', user.displayName);
        return done(null, user);
      }
      
      // Check if user exists with the same email
      user = await User.findOne({ email: profile.emails[0].value });
      
      if (user) {
        // Link Google account to existing user
        user.googleId = profile.id;
        await user.save();
        console.log('✅ Linked Google account to existing user:', user.displayName);
        return done(null, user);
      }
      
      // Create new user
      user = new User({
        googleId: profile.id,
        username: profile.emails[0].value.split('@')[0],
        email: profile.emails[0].value,
        displayName: profile.displayName,
        profileImage: profile.photos[0].value
      });
      
      await user.save();
      console.log('✅ New user created:', user.displayName);
      done(null, user);
    } catch (error) {
      console.error('❌ OAuth strategy error:', error);
      done(error, null);
    }
  }));

  console.log('✅ Google OAuth strategy configured');
} else {
  console.log('🔒 Google OAuth strategy disabled - missing credentials');
}