'use strict';

const { AppError, NotFoundError, ValidationError, UnauthorizedError } = require('../utils/errors');
const { logger } = require('../utils/logger');

// ── Mongoose-specific error transformers ──────────────────────────────────────

/** Invalid ObjectId in URL params (e.g. /products/not-an-id) */
function _handleCastError(err) {
  return new AppError(`Giá trị không hợp lệ cho trường "${err.path}": ${err.value}`, 400);
}

/** Unique index violation (e.g. duplicate email) */
function _handleDuplicateKeyError(err) {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  return new AppError(`"${value}" đã được sử dụng cho trường ${field}`, 409);
}

/** Mongoose schema validation failed */
function _handleMongooseValidationError(err) {
  const errors = Object.values(err.errors).map(e => ({
    field:   e.path,
    message: e.message,
  }));
  return new ValidationError('Dữ liệu không hợp lệ', errors);
}

/** JWT expired */
function _handleJWTExpiredError() {
  return new UnauthorizedError('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
}

/** JWT malformed / wrong secret */
function _handleJWTError() {
  return new UnauthorizedError('Token không hợp lệ, vui lòng đăng nhập lại');
}

// ── Global error handler ──────────────────────────────────────────────────────

/**
 * Express 4-argument error handler — must be the LAST middleware in app.js.
 * Transforms any error thrown or passed via next(err) into a structured JSON response.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let error = err;

  // Transform known non-AppError types into AppError instances
  if (err.name === 'CastError')               error = _handleCastError(err);
  if (err.code === 11000)                      error = _handleDuplicateKeyError(err);
  if (err.name === 'ValidationError')         error = _handleMongooseValidationError(err);
  if (err.name === 'TokenExpiredError')       error = _handleJWTExpiredError();
  if (err.name === 'JsonWebTokenError')       error = _handleJWTError();

  // Log unexpected (non-operational) errors with full stack
  if (!error.isOperational) {
    logger.error({
      msg:    'Non-operational error',
      error:  error.message,
      stack:  error.stack,
      url:    req.originalUrl,
      method: req.method,
    });
  }

  const statusCode = error.statusCode || 500;
  const isDev      = process.env.NODE_ENV === 'development';

  return res.status(statusCode).json({
    status:  'error',
    message: error.isOperational
      ? error.message
      : (isDev ? error.message : 'Đã xảy ra lỗi hệ thống, vui lòng thử lại'),
    ...(error.errors   && { errors: error.errors }),
    ...(isDev && !error.isOperational && { stack: error.stack }),
  });
}

/**
 * 404 handler — place before errorHandler in app.js.
 * Converts unmatched routes into structured NotFoundError.
 */
function notFoundHandler(req, res, next) {
  next(new NotFoundError(`Không tìm thấy route: ${req.method} ${req.originalUrl}`));
}

module.exports = { errorHandler, notFoundHandler };
