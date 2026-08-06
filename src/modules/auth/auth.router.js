'use strict';

const express    = require('express');
const passport   = require('passport');

const asyncHandler   = require('../../utils/asyncHandler');
const validate       = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authLimiter }  = require('../../middlewares/rate-limit');
const authController   = require('./auth.controller');
const { registerSchema, loginSchema, changePasswordSchema } = require('./auth.validator');

const router = express.Router();

/**
 * Auth Router
 *
 * Public routes (no authentication required):
 *   POST   /api/auth/register
 *   POST   /api/auth/login
 *   POST   /api/auth/refresh
 *   GET    /api/auth/google
 *   GET    /api/auth/google/callback
 *
 * Protected routes (require valid access token):
 *   POST   /api/auth/logout
 *   GET    /api/auth/me
 *   POST   /api/auth/change-password
 */

// ── POST /register ────────────────────────────────────────────────────────────
router.post(
  '/register',
  authLimiter,                        // 5 attempts / 15 min
  validate(registerSchema),           // Zod validation
  asyncHandler(authController.register),
);

// ── POST /login ───────────────────────────────────────────────────────────────
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(authController.login),
);

// ── POST /refresh ─────────────────────────────────────────────────────────────
// Reads refreshToken from HttpOnly cookie — no body needed
router.post(
  '/refresh',
  asyncHandler(authController.refresh),
);

// ── POST /logout ──────────────────────────────────────────────────────────────
router.post(
  '/logout',
  authenticate,                       // Must be logged in to logout
  asyncHandler(authController.logout),
);

// ── GET /me ───────────────────────────────────────────────────────────────────
router.get(
  '/me',
  authenticate,
  asyncHandler(authController.me),
);

// ── POST /change-password ─────────────────────────────────────────────────────
router.post(
  '/change-password',
  authenticate,
  authLimiter,
  validate(changePasswordSchema),
  asyncHandler(authController.changePassword),
);

// ── Google OAuth2 ─────────────────────────────────────────────────────────────

// Step 1: Redirect user to Google's consent screen
router.get(
  '/google',
  passport.authenticate('google', {
    scope:  ['profile', 'email'],
    prompt: 'select_account',          // Always show account selector
  }),
);

// Step 2: Google redirects back here after user grants permission
router.get(
  '/google/callback',
  // On failure, redirect to login with error query param
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login.html?error=google_auth_failed`,
    session:         false,            // We use JWT — no Passport session needed after this point
  }),
  asyncHandler(authController.googleCallback),
);

module.exports = router;
