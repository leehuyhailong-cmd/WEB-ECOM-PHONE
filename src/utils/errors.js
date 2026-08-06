'use strict';

/**
 * Custom error hierarchy for Phonestore.
 *
 * Design:
 *  - AppError.isOperational = true  → expected error, safe to send to client
 *  - AppError.isOperational = false → programmer bug, crash + alert (never expose)
 *
 * Usage:
 *   throw new NotFoundError('Sản phẩm không tồn tại');
 *   throw new ConflictError('Sản phẩm đã hết hàng');
 */

class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} [statusCode=500]
   * @param {boolean} [isOperational=true]
   */
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.name         = this.constructor.name;
    this.statusCode   = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** 400 — Request body / query failed business-rule or schema validation */
class ValidationError extends AppError {
  constructor(message = 'Dữ liệu không hợp lệ', errors = []) {
    super(message, 400);
    this.errors = errors; // [{ field: string, message: string }]
  }
}

/** 401 — Missing or invalid authentication */
class UnauthorizedError extends AppError {
  constructor(message = 'Bạn cần đăng nhập để thực hiện thao tác này') {
    super(message, 401);
  }
}

/** 403 — Authenticated but insufficient permission */
class ForbiddenError extends AppError {
  constructor(message = 'Bạn không có quyền thực hiện thao tác này') {
    super(message, 403);
  }
}

/** 404 — Resource does not exist */
class NotFoundError extends AppError {
  constructor(message = 'Không tìm thấy tài nguyên') {
    super(message, 404);
  }
}

/** 409 — State conflict: duplicate key, out-of-stock, concurrent edit */
class ConflictError extends AppError {
  constructor(message = 'Xung đột dữ liệu') {
    super(message, 409);
  }
}

/** 422 — Understood but semantically unprocessable */
class UnprocessableError extends AppError {
  constructor(message = 'Không thể xử lý yêu cầu') {
    super(message, 422);
  }
}

/** 429 — Rate limit exceeded */
class TooManyRequestsError extends AppError {
  constructor(message = 'Quá nhiều yêu cầu, vui lòng thử lại sau') {
    super(message, 429);
  }
}

/** 400 — Bad request: missing data, empty cart, invalid input */
class BadRequestError extends AppError {
  constructor(message = 'Yêu cầu không hợp lệ') {
    super(message, 400);
  }
}

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableError,
  TooManyRequestsError,
  BadRequestError,
};
