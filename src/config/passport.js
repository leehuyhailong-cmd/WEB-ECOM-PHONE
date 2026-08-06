'use strict';

const passport                     = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { User }                     = require('../models');
const { logger }                   = require('../utils/logger');

/**
 * Passport configuration — Google OAuth2 + session serialisation.
 *
 * Deep module: callers only call passport.authenticate('google').
 * The find-or-create-user flow is handled by AuthService.handleGoogleAuth(),
 * but the raw Google profile is assembled here and attached to req.user
 * for the controller to consume.
 */

// ── Session serialisation ─────────────────────────────────────────────────────
// Stores only user._id in session. Deserialises to a lightweight user object.
passport.serializeUser((user, done) => {
  done(null, user._id ? user._id.toString() : user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).lean();
    done(null, user || null);
  } catch (err) {
    done(err, null);
  }
});

// ── Google OAuth2 Strategy ────────────────────────────────────────────────────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:  process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          // Assemble a normalised profile for AuthService.handleGoogleAuth()
          const normalised = {
            googleId:    profile.id,
            email:       profile.emails?.[0]?.value,
            name:        profile.displayName,
            googleAvatar:profile.photos?.[0]?.value || null,
          };

          if (!normalised.email) {
            return done(new Error('Google account does not have a public email'), null);
          }

          logger.info({ msg: 'Google OAuth profile received', email: normalised.email });
          // Pass normalised profile to the callback — authController.googleCallback
          // will call authService.handleGoogleAuth() to find-or-create the user
          done(null, normalised);
        } catch (err) {
          done(err, null);
        }
      },
    ),
  );
  logger.info({ msg: '✅ Google OAuth2 strategy registered' });
} else {
  logger.warn({ msg: 'Google OAuth disabled — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable' });
}

module.exports = passport;
