'use strict';

const jwt = require('jsonwebtoken');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

/**
 * authenticate — verifies the Bearer access token from Authorization header.
 * On success, attaches decoded payload to req.user.
 *
 * Deep module: route handlers never touch JWT internals.
 * Just add `authenticate` to any route that needs a logged-in user.
 *
 * DECISION LOG (brainstorming skill — decision record):
 *   Choice: `req.user.role` is read from the JWT payload, NOT from a live DB lookup.
 *   Alternatives considered:
 *     A) Read role from JWT (chosen) — zero DB round-trip per request; O(1) cost.
 *     B) Read role from DB on every request — always fresh but adds ~5ms latency + 1 query.
 *   Trade-off: If an admin's role is changed in the DB, their existing access token
 *   retains the old role for up to 15 minutes (the access token TTL). This lag is
 *   acceptable at graduation scale and is mitigated by the short token lifetime.
 *   Revisit if admin revocation must be instant (solution: token denylist in Redis).
 *
 * Usage:
 *   router.get('/profile', authenticate, asyncHandler(userController.getProfile));
 */
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedError('Không tìm thấy token xác thực');
    }

    const token   = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    req.user = {
      id:    payload.sub,
      email: payload.email,
      role:  payload.role,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Phiên đăng nhập đã hết hạn'));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(new UnauthorizedError('Token không hợp lệ'));
    }
    next(err);
  }
}

/**
 * authorize — RBAC guard. Must be used after authenticate.
 * Pass one or more allowed roles.
 *
 * Usage:
 *   router.delete('/products/:id', authenticate, authorize('admin'), asyncHandler(ctrl.delete));
 *   router.get('/admin/stats',     authenticate, authorize('admin', 'superadmin'), asyncHandler(ctrl.stats));
 *
 * @param {...string} roles
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Bạn cần đăng nhập trước'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Tính năng này yêu cầu quyền: ${roles.join(' hoặc ')}`));
    }
    next();
  };
}

/**
 * optionalAuthenticate — attaches req.user if a valid token is present,
 * but does NOT reject the request if no token is provided.
 * Use for endpoints that personalise content for logged-in users (e.g. recommendations).
 */
async function optionalAuthenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const token   = header.split(' ')[1];
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      req.user = { id: payload.sub, email: payload.email, role: payload.role };
    }
  } catch (_) {
    // Ignore invalid/expired token — treat as guest
    req.user = null;
  }
  next();
}

module.exports = { authenticate, authorize, optionalAuthenticate };
