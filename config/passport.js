const passport = require('passport');
const mongoose = require('mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Check if we have Google OAuth credentials
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.log('Google login not set up');
  console.log('Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env file');
} else {
  console.log('Google OAuth credentials found');
  
  // Set up Google login strategy
  const isProduction = process.env.NODE_ENV === 'production';
  
  let callbackUrl;
  
  if (isProduction) {
    callbackUrl = 'https://book-collection-api-0vgp.onrender.com/auth/google/callback';
    console.log('Production callback URL:', callbackUrl);
  } else {
    callbackUrl = 'http://localhost:3000/auth/google/callback';
    console.log('Development callback URL:', callbackUrl);
  }
  
  passport.use(new GoogleStrategy({
    clientID: clientId,
    clientSecret: clientSecret,
    callbackURL: callbackUrl,
    passReqToCallback: false
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('Google login attempt:', profile.displayName);
      
      // Try to require User model
      let User;
      try {
        User = require('../models/User');
      } catch (error) {
        console.log('User model not found, using profile directly');
        // If User model doesn't exist, just use the profile
        return done(null, profile);
      }
      
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

// How to save user data in the session
passport.serializeUser((user, done) => {
  try {
    // Check if user is a Mongoose document (has _id)
    if (user._id) {
      // It's a User model instance
      done(null, user._id);
    } else if (user.id) {
      // It's a Google profile object
      done(null, user.id);
    } else {
      // Fallback
      done(null, user);
    }
  } catch (error) {
    console.log('Serialize error:', error.message);
    done(error, null);
  }
});

// How to get the user back when we have their ID
passport.deserializeUser(async (id, done) => {
  try {
    // Check if id is a valid MongoDB ObjectId (24 character hex string)
    const isObjectId = mongoose.Types.ObjectId.isValid(id) && 
                      String(new mongoose.Types.ObjectId(id)) === id;
    
    if (isObjectId) {
      // Try to load User from database
      try {
        const User = require('../models/User');
        const user = await User.findById(id);
        if (user) {
          return done(null, user);
        }
      } catch (error) {
        console.log('Could not load User model:', error.message);
      }
    }
    
    // If not an ObjectId or User model not found, return the ID as a simple user object
    done(null, { id: id });
    
  } catch (error) {
    console.log('Deserialize error:', error.message);
    done(error, null);
  }
});