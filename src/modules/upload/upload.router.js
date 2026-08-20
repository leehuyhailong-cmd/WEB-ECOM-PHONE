'use strict';

const express = require('express');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { upload, uploadToCloudinary } = require('../../middlewares/upload');
const { ApiResponse } = require('../../utils/apiResponse');
const { AppError } = require('../../utils/errors');
const asyncHandler = require('../../utils/asyncHandler');

const router = express.Router();

/**
 * POST /api/upload
 * Standalone endpoint to upload an image file to Cloudinary.
 * Protected: Admin only.
 */
router.post(
  '/',
  authenticate,
  authorize('admin'),
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) {
      throw new AppError('Vui lòng chọn file ảnh để tải lên', 400);
    }

    const folder = req.body.folder || 'phonestore/products';
    const result = await uploadToCloudinary(file.buffer, folder);

    return ApiResponse.success(
      res,
      { url: result.url, publicId: result.publicId },
      'Tải ảnh lên Cloudinary thành công',
    );
  }),
);

module.exports = router;
