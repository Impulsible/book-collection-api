const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// How to save user data in the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// How to get the user back when we have their ID
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    console.log('Error loading user:', error.message);
    done(error, null);
  }
});

// Check if we have Google OAuth credentials
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.log('Google login not set up');
  console.log('Add these to your .env file:');
  console.log('GOOGLE_CLIENT_ID=your-id-here');
  console.log('GOOGLE_CLIENT_SECRET=your-secret-here');
} else {
  console.log('Google OAuth credentials found');
  
  // Set up Google login strategy
  // FIX: Use the correct callback URL for each environment
  const isProduction = process.env.NODE_ENV === 'production';
  
  let callbackUrl;
  
  if (isProduction) {
    // On Render, use the Render URL directly
    callbackUrl = 'https://book-collection-api-0vgp.onrender.com/auth/google/callback';
    console.log('Production callback URL:', callbackUrl);
  } else {
    // Locally, use localhost
    callbackUrl = 'http://localhost:3000/auth/google/callback';
    console.log('Development callback URL:', callbackUrl);
  }
  
  console.log('Setting up Google Strategy with callback:', callbackUrl);
  
  passport.use(new GoogleStrategy({
    clientID: clientId,
    clientSecret: clientSecret,
    callbackURL: callbackUrl,
    passReqToCallback: false
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('Google login attempt:', profile.displayName);
      
      // Look for existing user with this Google ID
      let user = await User.findOne({ googleId: profile.id });
      
      if (user) {
        console.log('Welcome back', user.displayName);
        return done(null, user);
      }
      
      // Check if they have an account with the same email
      const email = profile.emails[0].value;
      user = await User.findOne({ email: email });
      
      if (user) {
        // Link their Google account to existing account
        user.googleId = profile.id;
        await user.save();
        console.log('Linked Google to existing account:', user.displayName);
        return done(null, user);
      }
      
      // Create a brand new user
      user = new User({
        googleId: profile.id,
        displayName: profile.displayName,
        email: email,
        username: email.split('@')[0],
        profileImage: profile.photos?.[0]?.value || ''
      });
      
      await user.save();
      console.log('Created new account:', user.displayName);
      
      done(null, user);
      
    } catch (error) {
      console.log('Login error:', error.message);
      done(error, null);
    }
  }));
  
  console.log('Google login is ready to use');
}