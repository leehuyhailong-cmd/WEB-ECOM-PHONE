'use strict';

const cloudinary = require('cloudinary').v2;
const { logger }  = require('../utils/logger');

/**
 * Configure Cloudinary once at startup.
 * Called from app.js if credentials are present.
 * Seam: swap this file to switch image providers.
 */
function configureCloudinary() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    logger.warn({ msg: 'Cloudinary not configured — image uploads will be disabled' });
    return false;
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key:    CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure:     true,
  });

  logger.info({ msg: '✅ Cloudinary configured', cloud: CLOUDINARY_CLOUD_NAME });
  return true;
}

module.exports = { cloudinary, configureCloudinary };
