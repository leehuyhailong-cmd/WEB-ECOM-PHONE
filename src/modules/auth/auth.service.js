'use strict';

const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const { User } = require('../../models');
const {
  UnauthorizedError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
} = require('../../utils/errors');
const { logger } = require('../../utils/logger');

/**
 * AuthService — the single deep module that owns ALL authentication logic.
 *
 * Callers (AuthController) only call public methods and receive clean data.
 * JWT mechanics, bcrypt, cookie config, and token rotation are hidden here.
 *
 * Token strategy (from strategy Section 3.2):
 *   - Access token:  JWT signed with JWT_ACCESS_SECRET, 15m TTL, returned in response body
 *   - Refresh token: JWT signed with JWT_REFRESH_SECRET, 7d TTL, sent as HttpOnly cookie
 *                    A SHA-256 hash of the refresh token is stored in User.refreshToken
 *                    to allow revocation (logout, re-login)
 */

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Signs a JWT access token.
 * @param {{ _id, email, role }} user
 * @returns {string}
 */
function _signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m', issuer: 'phonestore' },
  );
}

/**
 * Signs a JWT refresh token.
 * @param {{ _id }} user
 * @returns {string}
 */
function _signRefreshToken(user) {
  return jwt.sign(
    { sub: user._id.toString() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d', issuer: 'phonestore' },
  );
}

/**
 * SHA-256 hash of a token for secure storage.
 * Faster than bcrypt for token comparison; JWT tokens are already
 * cryptographically random and long, so bcrypt cost factor is unnecessary.
 * @param {string} token
 * @returns {string}
 */
function _hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a token pair (access + refresh) and persist the refresh token hash.
 * @param {object} user - Mongoose User document
 * @returns {Promise<{ accessToken: string, refreshToken: string }>}
 */
async function _issueTokenPair(user) {
  const accessToken  = _signAccessToken(user);
  const refreshToken = _signRefreshToken(user);

  // Persist hashed refresh token — enables logout/revocation
  await User.findByIdAndUpdate(user._id, {
    refreshToken: _hashToken(refreshToken),
  });

  return { accessToken, refreshToken };
}

/**
 * Set the refresh token as an HttpOnly cookie on the response.
 * @param {import('express').Response} res
 * @param {string} token
 */
function _setRefreshCookie(res, token) {
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   SEVEN_DAYS_MS,
    path:     '/api/auth', // Cookie only sent to auth endpoints
  });
}

/**
 * Clear the refresh token cookie.
 * @param {import('express').Response} res
 */
function _clearRefreshCookie(res) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path:     '/api/auth',
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Register a new user with email/password.
 * @param {{ name, email, password, phone? }} data
 * @param {import('express').Response} res
 * @returns {Promise<{ user: object, accessToken: string }>}
 */
async function register(data, res) {
  const { name, email, password, phone } = data;

  // Check duplicate email
  const exists = await User.findOne({ email }).select('_id').lean();
  if (exists) throw new ConflictError('Email này đã được sử dụng');

  // Create user — password hashing happens via setPassword() method
  const user = new User({ name, email, phone });
  await user.setPassword(password);
  await user.save();

  logger.info({ msg: 'New user registered', userId: user._id, email });

  const { accessToken, refreshToken } = await _issueTokenPair(user);
  _setRefreshCookie(res, refreshToken);

  return { user: user.toPublicJSON(), accessToken };
}

/**
 * Login with email/password.
 * Returns access token in response; sets refresh token as HttpOnly cookie.
 * @param {{ email, password }} credentials
 * @param {import('express').Response} res
 * @returns {Promise<{ user: object, accessToken: string }>}
 */
async function login(credentials, res) {
  const { email, password } = credentials;

  // Fetch user with passwordHash (normally excluded by select:false)
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) throw new UnauthorizedError('Email hoặc mật khẩu không đúng');

  if (!user.isActive) throw new ForbiddenError('Tài khoản của bạn đã bị khóa');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new UnauthorizedError('Email hoặc mật khẩu không đúng');

  logger.info({ msg: 'User logged in', userId: user._id, email });

  const { accessToken, refreshToken } = await _issueTokenPair(user);
  _setRefreshCookie(res, refreshToken);

  return { user: user.toPublicJSON(), accessToken };
}

/**
 * Rotate refresh token — issue a new access + refresh token pair.
 * Validates the cookie-bound refresh token against the stored hash.
 * @param {string} cookieToken - raw token from req.cookies.refreshToken
 * @param {import('express').Response} res
 * @returns {Promise<{ accessToken: string }>}
 */
async function refresh(cookieToken, res) {
  if (!cookieToken) throw new UnauthorizedError('Không tìm thấy refresh token');

  // Verify JWT signature and expiry
  let payload;
  try {
    payload = jwt.verify(cookieToken, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    _clearRefreshCookie(res);
    if (err.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
    }
    throw new UnauthorizedError('Refresh token không hợp lệ');
  }

  // Find user and verify stored hash matches (detects token reuse after logout)
  const hashedIncoming = _hashToken(cookieToken);
  const user = await User.findOne({
    _id:          payload.sub,
    refreshToken: hashedIncoming,
  }).select('+refreshToken');

  if (!user) {
    // Token reuse detected — possible theft. Clear cookie.
    _clearRefreshCookie(res);
    throw new UnauthorizedError('Token không hợp lệ hoặc đã được sử dụng');
  }

  if (!user.isActive) {
    _clearRefreshCookie(res);
    throw new ForbiddenError('Tài khoản của bạn đã bị khóa');
  }

  // Rotate: issue new pair, old refresh token hash is overwritten
  const { accessToken, refreshToken: newRefreshToken } = await _issueTokenPair(user);
  _setRefreshCookie(res, newRefreshToken);

  return { accessToken };
}

/**
 * Logout — revoke refresh token and clear cookie.
 * @param {string} userId
 * @param {import('express').Response} res
 */
async function logout(userId, res) {
  // Wipe stored refresh token hash — token is now unredeemable
  await User.findByIdAndUpdate(userId, { refreshToken: null });
  _clearRefreshCookie(res);
  logger.info({ msg: 'User logged out', userId });
}

/**
 * Get the current authenticated user's full profile.
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function getMe(userId) {
  const user = await User.findById(userId).lean();
  if (!user) throw new NotFoundError('Không tìm thấy người dùng');
  // Strip sensitive fields manually (since we can't call toPublicJSON on a .lean() result)
  const { passwordHash, refreshToken, passwordResetToken, passwordResetExpires, ...safeUser } = user;
  return safeUser;
}

/**
 * Change password for an authenticated user.
 * @param {string} userId
 * @param {{ currentPassword, newPassword }} data
 * @param {import('express').Response} res
 */
async function changePassword(userId, data, res) {
  const { currentPassword, newPassword } = data;

  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw new NotFoundError('Không tìm thấy người dùng');

  // Verify current password — even for authenticated users (prevents session hijack)
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw new UnauthorizedError('Mật khẩu hiện tại không đúng');

  await user.setPassword(newPassword);
  // Rotate refresh token on password change — forces re-login on all other devices
  const { accessToken, refreshToken } = await _issueTokenPair(user);
  await user.save();
  _setRefreshCookie(res, refreshToken);

  return { accessToken };
}

/**
 * Handle Google OAuth2 callback.
 * Called by Passport after successful Google authentication.
 * Finds or creates a user, then issues JWT tokens.
 *
 * @param {{ googleId, email, name, avatar }} profile
 * @param {import('express').Response} res
 * @returns {Promise<{ user: object, accessToken: string }>}
 */
async function handleGoogleAuth(profile, res) {
  const { googleId, email, name, avatar } = profile;

  // Find by googleId first, then fall back to email (links existing accounts)
  let user = await User.findOne({
    $or: [{ googleId }, { email }],
  });

  if (!user) {
    // First-time Google login — create account (no password required)
    user = await User.create({
      name,
      email,
      googleId,
      googleAvatar: avatar,
      avatar,
      isActive: true,
    });
    logger.info({ msg: 'New user via Google OAuth', userId: user._id, email });
  } else if (!user.googleId) {
    // Existing email/password account — link Google ID
    user.googleId    = googleId;
    user.googleAvatar = avatar;
    if (!user.avatar) user.avatar = avatar;
    await user.save();
    logger.info({ msg: 'Google account linked to existing user', userId: user._id, email });
  }

  if (!user.isActive) throw new ForbiddenError('Tài khoản của bạn đã bị khóa');

  const { accessToken, refreshToken } = await _issueTokenPair(user);
  _setRefreshCookie(res, refreshToken);

  return { user: user.toPublicJSON(), accessToken };
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  getMe,
  changePassword,
  handleGoogleAuth,
};
