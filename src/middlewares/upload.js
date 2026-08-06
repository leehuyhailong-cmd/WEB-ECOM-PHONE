'use strict';

const multer    = require('multer');
const { cloudinary, configureCloudinary } = require('../config/cloudinary');
const { AppError } = require('../utils/errors');

const ALLOWED_MIMETYPES   = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_FILE_SIZE_BYTES  = 5 * 1024 * 1024; // 5 MB

/**
 * File filter — rejects non-image MIME types before they hit disk/memory.
 */
function _fileFilter(req, file, cb) {
  if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(`Loại file không hợp lệ: ${file.mimetype}. Chỉ chấp nhận JPEG, PNG, WebP, AVIF`, 400), false);
  }
}

/**
 * Base multer instance — stores files in memory as Buffer.
 * Actual upload to Cloudinary happens in the service layer via uploadToCloudinary().
 * This is the recommended pattern for Cloudinary SDK v2.
 */
const upload = multer({
  storage:    multer.memoryStorage(),
  fileFilter: _fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files:    10,
  },
});

/**
 * Upload a Buffer to Cloudinary and return the secure URL + public_id.
 * Call this in your service layer after multer has processed the request.
 *
 * @param {Buffer} buffer     - File buffer from req.file.buffer
 * @param {string} folder     - Cloudinary folder (e.g. 'phonestore/products')
 * @param {string} [publicId] - Optional custom public_id
 * @returns {Promise<{ url: string, publicId: string }>}
 */
async function uploadToCloudinary(buffer, folder, publicId) {
  configureCloudinary();

  return new Promise((resolve, reject) => {
    const options = {
      folder,
      resource_type: 'image',
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      ...(publicId && { public_id: publicId }),
    };

    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(new AppError(`Tải ảnh thất bại: ${err.message}`, 500));
      resolve({ url: result.secure_url, publicId: result.public_id });
    });

    stream.end(buffer);
  });
}

/**
 * Delete an image from Cloudinary by its public_id.
 * Call this in your service when a product image is replaced or deleted.
 *
 * @param {string} publicId
 */
async function deleteFromCloudinary(publicId) {
  if (!publicId) return;
  configureCloudinary();
  await cloudinary.uploader.destroy(publicId);
}

// Pre-configured multer middleware for common routes
const productUpload = upload.array('images', 5); // Up to 5 product images
const avatarUpload  = upload.single('avatar');    // Single avatar

module.exports = {
  upload,
  productUpload,
  avatarUpload,
  uploadToCloudinary,
  deleteFromCloudinary,
};
