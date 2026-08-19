'use strict';

require('dotenv').config();
const { validateEnv } = require('./src/config/env');

// ── Fail fast: validate all env vars before touching anything else ────────────
validateEnv();

const { logger } = require('./src/utils/logger');
const connectDB  = require('./src/config/db');
const app        = require('./src/app');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

let server;

async function startServer() {
  try {
    // ⚡ Start HTTP server immediately so http://localhost:3000 is always accessible
    server = app.listen(PORT, HOST, () => {
      logger.info({ msg: `🚀 Server running at http://localhost:${PORT}`, port: PORT, env: process.env.NODE_ENV });
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.fatal({ msg: `Port ${PORT} is already in use` });
        process.exit(1);
      }
      throw err;
    });

    // Connect to MongoDB asynchronously in background
    connectDB().catch(err => {
      logger.warn({ msg: 'MongoDB connection warning — operating with fallback/offline mode', err: err.message });
    });

  } catch (err) {
    logger.fatal({ msg: 'Failed to start server', err: err.message });
    process.exit(1);
  }
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function gracefulShutdown(signal) {
  logger.info({ msg: `${signal} received — shutting down gracefully` });

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');
      try {
        const mongoose = require('mongoose');
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
      } catch (_) { /* ignore */ }
      process.exit(0);
    });

    // Force exit if graceful shutdown stalls
    setTimeout(() => {
      logger.error('Forced shutdown after 10s timeout');
      process.exit(1);
    }, 10_000).unref();
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ msg: 'Unhandled Promise Rejection', reason });
});

process.on('uncaughtException', (err) => {
  logger.fatal({ msg: 'Uncaught Exception', err: err.message, stack: err.stack });
});

startServer();
