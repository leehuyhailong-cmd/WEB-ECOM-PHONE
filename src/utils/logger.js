'use strict';

const pino = require('pino');

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Structured logger (Pino).
 * - Development: pretty-printed, colorised, human-readable
 * - Production:  raw JSON for log aggregators (Datadog, CloudWatch, etc.)
 *
 * IMPORTANT: sensitive fields are redacted via the `redact` config.
 * Never log passwords, tokens, or cookies.
 */
const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),

  // Pretty transport in dev only
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize:      true,
        translateTime: 'HH:MM:ss',
        ignore:        'pid,hostname,env',
        singleLine:    false,
      },
    },
  }),

  // Redact sensitive fields — they become '[REDACTED]' in all log output
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.passwordConfirm',
      '*.refreshToken',
      '*.accessToken',
      '*.token',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },

  serializers: {
    err: pino.stdSerializers.err,
  },

  base: {
    env: process.env.NODE_ENV || 'development',
  },
});

/**
 * Express request logging middleware.
 * Logs on response finish — includes method, url, status, duration, IP.
 * Log level escalates: 5xx → error, 4xx → warn, rest → info.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration  = Date.now() - start;
    const status    = res.statusCode;
    const level     = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

    logger[level]({
      method:    req.method,
      url:       req.originalUrl,
      status,
      duration:  `${duration}ms`,
      ip:        req.ip,
      userAgent: req.headers['user-agent'],
    });
  });

  next();
}

module.exports = { logger, requestLogger };
