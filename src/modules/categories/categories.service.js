const Category = require('../../models/Category');
const { NotFoundError, BadRequestError } = require('../../utils/errors');

const getAllCategories = async () => {
  return await Category.find({});
};

const getCategoryById = async (id) => {
  const category = await Category.findById(id);
  if (!category) {
    throw new NotFoundError('Category not found');
  }
  return category;
};

const createCategory = async (data) => {
  return await Category.create(data);
};

const updateCategory = async (id, data) => {
  const category = await Category.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!category) {
    throw new NotFoundError('Category not found');
  }
  return category;
};

const deleteCategory = async (id) => {
  const category = await Category.findByIdAndDelete(id);
  if (!category) {
    throw new NotFoundError('Category not found');
  }
  return category;
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
