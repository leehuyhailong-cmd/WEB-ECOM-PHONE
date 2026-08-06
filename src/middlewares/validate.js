'use strict';

const { z, ZodError } = require('zod');
const { ValidationError } = require('../utils/errors');

/**
 * Zod validation middleware factory.
 * Pass a Zod schema that validates { body, query, params }.
 * On success, attaches parsed (coerced) values back to req.
 * On failure, throws a structured ValidationError.
 *
 * Usage:
 *   const createProductSchema = z.object({
 *     body: z.object({ name: z.string().min(1), price: z.number().int().positive() }),
 *   });
 *   router.post('/products', authenticate, validate(createProductSchema), asyncHandler(ctrl.create));
 *
 * @param {import('zod').AnyZodObject} schema
 */
function validate(schema) {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync({
        body:   req.body,
        query:  req.query,
        params: req.params,
      });

      // Attach parsed (coerced) values so controllers get clean data
      if (parsed.body)   req.body   = parsed.body;
      if (parsed.query)  req.query  = parsed.query;
      if (parsed.params) req.params = parsed.params;

      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map(e => ({
          field:   e.path.slice(1).join('.'), // Remove leading 'body'/'query'/'params'
          message: e.message,
        }));
        return next(new ValidationError('Dữ liệu không hợp lệ', errors));
      }
      next(err);
    }
  };
}

module.exports = validate;
