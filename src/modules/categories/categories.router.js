const express = require('express');
const router = express.Router();
const controller = require('./categories.controller');
const { validate } = require('../../middlewares/validate');
const { auth } = require('../../middlewares/auth.middleware');
const { createCategorySchema, updateCategorySchema } = require('./categories.validator');

// Assuming admin role is needed for modification, adjust roles as needed
router
  .route('/')
  .get(controller.getAllCategories)
  .post(auth(), validate(createCategorySchema), controller.createCategory);

router
  .route('/:id')
  .get(controller.getCategoryById)
  .put(auth(), validate(updateCategorySchema), controller.updateCategory)
  .delete(auth(), controller.deleteCategory);

module.exports = router;
