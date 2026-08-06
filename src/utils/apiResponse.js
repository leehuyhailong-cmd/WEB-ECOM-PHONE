'use strict';

/**
 * Standardised API response envelope.
 * All endpoints MUST use these static methods — never call res.json() directly.
 *
 * Response contract:
 *   { status: 'success'|'error', message: string, data?: any, pagination?: object }
 */
class ApiResponse {
  /**
   * 200 / 201 success.
   * @param {import('express').Response} res
   * @param {*} data
   * @param {string} [message]
   * @param {number} [statusCode]
   */
  static success(res, data = null, message = 'Thành công', statusCode = 200) {
    return res.status(statusCode).json({ status: 'success', message, data });
  }

  /** 201 Created — shorthand for success with 201 */
  static created(res, data, message = 'Tạo mới thành công') {
    return ApiResponse.success(res, data, message, 201);
  }

  /** 204 No Content — use for DELETE */
  static noContent(res) {
    return res.status(204).send();
  }

  /**
   * Paginated list — includes pagination metadata.
   * @param {import('express').Response} res
   * @param {Array}  data
   * @param {{ page: number, limit: number, total: number }} meta
   * @param {string} [message]
   */
  static paginated(res, data, { page, limit, total }, message = 'Thành công') {
    const totalPages = Math.ceil(total / limit);
    return res.status(200).json({
      status: 'success',
      message,
      data,
      pagination: {
        page:       Number(page),
        limit:      Number(limit),
        total:      Number(total),
        totalPages,
        hasNext:    page < totalPages,
        hasPrev:    page > 1,
      },
    });
  }
}

/**
 * Parse pagination params from req.query.
 * Caps limit at 100 to prevent abuse. Minimum page is 1.
 *
 * @param {object} query - req.query
 * @param {number} [defaultLimit=12]
 * @returns {{ page: number, limit: number, skip: number }}
 */
function parsePagination(query, defaultLimit = 12) {
  const page  = Math.max(1,   parseInt(query.page,  10) || 1);
  const limit = Math.min(100, parseInt(query.limit, 10) || defaultLimit);
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
}

module.exports = { ApiResponse, parsePagination };
