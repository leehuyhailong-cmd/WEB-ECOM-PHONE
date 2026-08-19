'use strict';

const { z } = require('zod');

const PAYMENT_METHODS = ['cod', 'vnpay', 'momo', 'bank_transfer'];
const ORDER_STATUSES  = ['pending','confirmed','processing','shipping','delivered','cancelled','refunded'];

// ── Shipping address sub-schema ───────────────────────────────────────────────
const shippingAddressSchema = z.object({
  fullName: z.string().min(2, 'Họ tên người nhận là bắt buộc').max(100),
  phone:    z.string().regex(/^[0-9+\s-]{9,15}$/, 'Số điện thoại không hợp lệ'),
  street:   z.string().min(1, 'Địa chỉ là bắt buộc').max(200),
  ward:     z.string().min(1, 'Phường/Xã là bắt buộc').max(100),
  district: z.string().min(1, 'Quận/Huyện là bắt buộc').max(100),
  province: z.string().min(1, 'Tỉnh/Thành phố là bắt buộc').max(100),
});

// ── Create order ──────────────────────────────────────────────────────────────
const createOrderSchema = z.object({
  body: z.object({
    shippingAddress: shippingAddressSchema,
    paymentMethod: z.enum(PAYMENT_METHODS, {
      errorMap: () => ({ message: `Phương thức thanh toán phải là: ${PAYMENT_METHODS.join(', ')}` }),
    }).default('cod'),
    items: z.array(z.object({
      productId: z.string(),
      quantity: z.number().int().min(1),
    })).optional(),
    note: z.string().trim().max(500).optional().default(''),
    userId: z.string().optional(),
  }),
});

// ── Update order status (admin) ───────────────────────────────────────────────
const updateStatusSchema = z.object({
  body: z.object({
    status:       z.enum(ORDER_STATUSES, { errorMap: () => ({ message: 'Trạng thái không hợp lệ' }) }),
    cancelReason: z.string().max(500).optional(),
  }),
  params: z.object({ id: z.string().min(1) }),
});

// ── Cancel order (user) ───────────────────────────────────────────────────────
const cancelOrderSchema = z.object({
  body: z.object({
    reason: z.string().trim().max(500).optional().default('Khách hàng huỷ đơn'),
  }),
  params: z.object({ id: z.string().min(1) }),
});

module.exports = { createOrderSchema, updateStatusSchema, cancelOrderSchema };
