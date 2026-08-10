const express = require('express');
const router = express.Router();
const controller = require('./categories.controller');
const validate = require('../../middlewares/validate');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { createCategorySchema, updateCategorySchema } = require('./categories.validator');

// Assuming admin role is needed for modification, adjust roles as needed
router
  .route('/')
  .get(controller.getAllCategories)
  .post(authenticate, authorize('admin'), validate(createCategorySchema), controller.createCategory);

router
  .route('/:id')
  .get(controller.getCategoryById)
  .put(authenticate, authorize('admin'), validate(updateCategorySchema), controller.updateCategory)
  .delete(authenticate, authorize('admin'), controller.deleteCategory);

module.exports = router;
