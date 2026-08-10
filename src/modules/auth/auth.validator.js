'use strict';

const { z } = require('zod');

/**
 * Auth Validators — Zod schemas for the auth module.
 * Used by the validate() middleware — validates req.body before hitting the service.
 *
 * Deep module principle: controllers never write validation rules.
 * All constraints live here as the single source of truth.
 */

// ── Register ──────────────────────────────────────────────────────────────────
const registerSchema = z.object({
  body: z
    .object({
      name: z
        .string({ required_error: 'Họ tên là bắt buộc' })
        .trim()
        .min(2,  'Họ tên phải có ít nhất 2 ký tự')
        .max(100, 'Họ tên không được quá 100 ký tự'),

      email: z
        .string({ required_error: 'Email là bắt buộc' })
        .email('Email không hợp lệ')
        .toLowerCase()
        .trim(),

      password: z
        .string({ required_error: 'Mật khẩu là bắt buộc' })
        .min(8,   'Mật khẩu phải có ít nhất 8 ký tự')
        .max(100, 'Mật khẩu không được quá 100 ký tự')
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
          'Mật khẩu phải có ít nhất 1 chữ hoa, 1 chữ thường, và 1 số',
        ),

      passwordConfirm: z
        .string({ required_error: 'Xác nhận mật khẩu là bắt buộc' }),

      phone: z
        .string()
        .regex(/^[0-9]{8,10}$/, 'Số điện thoại không hợp lệ')
        .optional(),
    })
    .refine(data => data.password === data.passwordConfirm, {
      message: 'Mật khẩu xác nhận không khớp',
      path:    ['passwordConfirm'],
    }),
});

// ── Login ─────────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email là bắt buộc' })
      .email('Email không hợp lệ')
      .toLowerCase()
      .trim(),

    password: z
      .string({ required_error: 'Mật khẩu là bắt buộc' })
      .min(1, 'Mật khẩu là bắt buộc'),
  }),
});

// ── Change Password ───────────────────────────────────────────────────────────
const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z
        .string({ required_error: 'Mật khẩu hiện tại là bắt buộc' })
        .min(1),

      newPassword: z
        .string({ required_error: 'Mật khẩu mới là bắt buộc' })
        .min(8,   'Mật khẩu mới phải có ít nhất 8 ký tự')
        .max(100)
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
          'Mật khẩu mới phải có ít nhất 1 chữ hoa, 1 chữ thường, và 1 số',
        ),

      newPasswordConfirm: z.string({ required_error: 'Xác nhận mật khẩu mới là bắt buộc' }),
    })
    .refine(d => d.newPassword === d.newPasswordConfirm, {
      message: 'Mật khẩu xác nhận không khớp',
      path:    ['newPasswordConfirm'],
    }),
});

module.exports = { registerSchema, loginSchema, changePasswordSchema };
