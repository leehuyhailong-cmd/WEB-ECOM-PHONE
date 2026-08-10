const categoryService = require('./categories.service');
const { asyncHandler } = require('../../utils/asyncHandler');
const { SuccessResponse } = require('../../utils/apiResponse');

const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.getAllCategories();
  res.status(200).json(new SuccessResponse('Categories retrieved successfully', categories));
});

const getCategoryById = asyncHandler(async (req, res) => {
  const category = await categoryService.getCategoryById(req.params.id);
  res.status(200).json(new SuccessResponse('Category retrieved successfully', category));
});

const createCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.body);
  res.status(201).json(new SuccessResponse('Category created successfully', category));
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  res.status(200).json(new SuccessResponse('Category updated successfully', category));
});

const deleteCategory = asyncHandler(async (req, res) => {
  await categoryService.deleteCategory(req.params.id);
  res.status(200).json(new SuccessResponse('Category deleted successfully', null));
});

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
