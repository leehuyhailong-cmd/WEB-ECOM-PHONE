'use strict';

const authService  = require('./auth.service');
const { ApiResponse } = require('../../utils/apiResponse');

/**
 * AuthController — HTTP layer only.
 *
 * Rules enforced here:
 *   1. No business logic — every method delegates to authService
 *   2. No direct Model calls
 *   3. All methods are plain async functions (wrapped by asyncHandler in the router)
 *   4. All responses go through ApiResponse — never res.json() directly
 */

// ── POST /api/auth/register ───────────────────────────────────────────────────
async function register(req, res) {
  const result = await authService.register(req.body, res);
  return ApiResponse.created(res, result, 'Đăng ký thành công');
}

// ── POST /api/auth/login ──────────────────────────────────────────────────────
async function login(req, res) {
  const result = await authService.login(req.body, res);
  return ApiResponse.success(res, result, 'Đăng nhập thành công');
}

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
async function refresh(req, res) {
  const cookieToken = req.cookies?.refreshToken;
  const result = await authService.refresh(cookieToken, res);
  return ApiResponse.success(res, result, 'Token đã được làm mới');
}

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
async function logout(req, res) {
  // req.user is populated by authenticate middleware
  await authService.logout(req.user.id, res);
  return ApiResponse.success(res, null, 'Đăng xuất thành công');
}

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
async function me(req, res) {
  const user = await authService.getMe(req.user.id);
  return ApiResponse.success(res, { user }, 'Lấy thông tin người dùng thành công');
}

// ── POST /api/auth/change-password ────────────────────────────────────────────
async function changePassword(req, res) {
  const result = await authService.changePassword(req.user.id, req.body, res);
  return ApiResponse.success(res, result, 'Đổi mật khẩu thành công');
}

// ── GET /api/auth/google/callback ─────────────────────────────────────────────
/**
 * Called by Passport after successful Google OAuth2 authentication.
 * req.user is set by passport.authenticate('google') with the profile data.
 *
 * Strategy: issue JWT tokens and redirect to frontend with access token
 * in the URL fragment (frontend reads it from hash, stores in memory).
 * Refresh token is already set as HttpOnly cookie by the service.
 */
async function googleCallback(req, res) {
  const profile = {
    googleId: req.user.googleId || req.user._id,
    email:    req.user.email,
    name:     req.user.name,
    avatar:   req.user.googleAvatar || req.user.avatar || null,
  };

  const { accessToken } = await authService.handleGoogleAuth(profile, res);

  // Redirect to frontend with access token in URL fragment
  // Frontend JS reads window.location.hash and stores token in memory
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return res.redirect(`${frontendUrl}/oauth-callback.html#token=${accessToken}`);
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  me,
  changePassword,
  googleCallback,
};
