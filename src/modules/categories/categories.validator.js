const { z } = require('zod');

const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters'),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

const updateCategorySchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Category ID is required'),
  }),
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters').optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
};
