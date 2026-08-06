'use strict';

const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

const MAX_RETRIES     = 5;
const RETRY_DELAY_MS  = 5000;

/**
 * Singleton MongoDB connection with exponential-style retry.
 * Seam: swap this file to switch databases without touching any service.
 */
async function connectDB(retries = MAX_RETRIES) {
  const uri = process.env.MONGO_URI;

  const options = {
    maxPoolSize:              10,
    minPoolSize:              2,
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS:          45_000,
    connectTimeoutMS:         10_000,
    family:                   4,      // Force IPv4 — avoids DNS IPv6 issues
  };

  try {
    await mongoose.connect(uri, options);
    logger.info({ msg: '✅ MongoDB connected', db: mongoose.connection.name });
    _attachListeners();
  } catch (err) {
    if (retries > 0) {
      logger.warn({
        msg: `MongoDB connection failed — retrying in ${RETRY_DELAY_MS / 1000}s`,
        retriesLeft: retries - 1,
        error: err.message,
      });
      await _delay(RETRY_DELAY_MS);
      return connectDB(retries - 1);
    }
    throw new Error(`MongoDB failed after ${MAX_RETRIES} attempts: ${err.message}`);
  }
}

function _attachListeners() {
  mongoose.connection.on('disconnected', () =>
    logger.warn({ msg: 'MongoDB disconnected' }),
  );
  mongoose.connection.on('reconnected', () =>
    logger.info({ msg: 'MongoDB reconnected' }),
  );
  mongoose.connection.on('error', (err) =>
    logger.error({ msg: 'MongoDB error', error: err.message }),
  );
}

const _delay = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = connectDB;
