/**
 * =============================================
 *  TÍCH HỢP VNPAY SANDBOX — THAY THẾ THEO ẢNH vnpay1 & vnpay2
 *  Merchant TMN Code: AFZ79VBT
 *  Secret Key: EGFJFHDABPONTIDGAHQVIALWIEFHHBHR
 *  vnpayHost: https://sandbox.vnpayment.vn
 *  vnp_ReturnUrl: http://localhost:3000/api/payment/vnpay_return
 * =============================================
 */

require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const querystring = require('qs');
const moment = require('moment');
const { VNPay, ignoreLogger, ProductCode, VnpLocale, dateFormat } = require('vnpay');
const { Order } = require('./models');
const router = express.Router();

// ── CẤU HÌNH THAY THẾ TỪ ẢNH vnpay1 & vnpay2 VÀ THÔNG TIN CUNG CẤP ─────────────
const tmnCode = process.env.VNP_TMN_CODE || process.env.VNPAY_TMN_CODE || 'AFZ79VBT';
const secureSecret = process.env.VNP_HASH_SECRET || process.env.VNPAY_HASH_SECRET || 'EGFJFHDABPONTIDGAHQVIALWIEFHHBHR';
const vnpayHost = process.env.VNP_URL ? new URL(process.env.VNP_URL).origin : 'https://sandbox.vnpayment.vn';

// Khởi tạo VNPay instance theo hình vnpay1.PNG & vnpay2.PNG
const vnpay = new VNPay({
  tmnCode: tmnCode,
  secureSecret: secureSecret,
  vnpayHost: vnpayHost,
  testMode: true,
  hashAlgorithm: 'SHA512',
  loggerFn: ignoreLogger,
});

// Helper sort object
function sortObject(obj) {
  const sorted = {};
  Object.keys(obj)
    .sort()
    .forEach((key) => {
      sorted[key] = obj[key];
    });
  return sorted;
}

// ── HÀM TẠO URL THANH TOÁN KHỚP ẢNH vnpay1 & vnpay2 ──────────────────────────
async function buildPaymentUrlHandler(req, res) {
  try {
    const { orderId, amount, orderInfo, vnp_Amount, vnp_TxnRef, vnp_OrderInfo } = req.body;
    const finalOrderId = orderId || vnp_TxnRef || `ORD-${Date.now()}`;
    const finalAmount = amount || vnp_Amount || 50000;
    const finalOrderInfo = orderInfo || vnp_OrderInfo || `Thanh toan don hang ${finalOrderId}`;
    const ipAddr =
      req.headers['x-forwarded-for'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      '127.0.0.1';

    const returnUrl = process.env.VNP_RETURN_URL || 'http://localhost:3000/api/payment/vnpay_return';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Code chuẩn theo hình vnpay1.PNG & vnpay2.PNG
    const vnpayResponse = await vnpay.buildPaymentUrl({
      vnp_Amount: Math.round(Number(finalAmount)),
      vnp_IpAddr: ipAddr,
      vnp_TxnRef: String(finalOrderId),
      vnp_OrderInfo: String(finalOrderInfo),
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: returnUrl,
      vnp_Locale: VnpLocale.VN,
      vnp_CreateDate: dateFormat(new Date()),
      vnp_ExpireDate: dateFormat(tomorrow),
    });

    return res.status(201).json({
      success: true,
      paymentUrl: vnpayResponse,
      vnpayResponse,
      message: 'Tạo URL thanh toán VNPay thành công',
    });
  } catch (error) {
    console.error('Lỗi tạo URL VNPay:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ── 5. CÁC ROUTE (Hỗ trợ cả route mặc định & route trong ảnh vnpay1/vnpay2) ──

// POST /api/create-qr (theo ảnh vnpay1/vnpay2) & POST /api/payment/create_payment_url
router.post('/create-qr', buildPaymentUrlHandler);
router.post('/create_payment_url', buildPaymentUrlHandler);

// GET /api/check-payment-vnpay (theo ảnh vnpay1/vnpay2) & GET /api/payment/vnpay_return
async function handleReturn(req, res) {
  try {
    const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    const vnp_Params = { ...req.query };

    let isVerified = false;
    try {
      const verify = vnpay.verifyIpnCall(vnp_Params);
      if (verify && verify.isVerified) isVerified = true;
    } catch (_) {}

    if (!isVerified) {
      // Manual fallback HMAC verify
      const secureHash = vnp_Params['vnp_SecureHash'];
      const paramsCopy = { ...vnp_Params };
      delete paramsCopy['vnp_SecureHash'];
      delete paramsCopy['vnp_SecureHashType'];
      const sorted = sortObject(paramsCopy);
      const signData = querystring.stringify(sorted, { encode: false });
      const hmac = crypto.createHmac('sha512', secureSecret);
      const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
      if (secureHash === signed) isVerified = true;
    }

    if (!isVerified) {
      return res.redirect(`${clientUrl}/index.html?payment=failed&message=${encodeURIComponent('Chữ ký không hợp lệ')}`);
    }

    const orderId = vnp_Params.vnp_TxnRef;
    const responseCode = vnp_Params.vnp_ResponseCode;

    if (responseCode === '00' || responseCode === '0') {
      try {
        let order = await Order.findById(orderId).catch(() => null);
        if (!order) {
          order = await Order.findOne({ orderCode: orderId });
        }
        if (order) {
          order.paymentStatus = 'paid';
          if (order.status === 'pending') order.status = 'confirmed';
          order.paidAt = new Date();
          order.vnpayTransactionId = vnp_Params.vnp_TransactionNo;
          order.vnpayBankCode = vnp_Params.vnp_BankCode;
          order.vnpayResponseCode = responseCode;
          await order.save();
        }
      } catch (dbErr) {
        console.error('Lỗi cập nhật Order MongoDB:', dbErr);
      }

      return res.redirect(`${clientUrl}/index.html?payment=success&orderId=${orderId}`);
    } else {
      return res.redirect(`${clientUrl}/index.html?payment=failed&orderId=${orderId}&code=${responseCode}`);
    }
  } catch (error) {
    console.error('Lỗi return URL:', error);
    const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${clientUrl}/index.html?payment=failed`);
  }
}

router.get('/check-payment-vnpay', handleReturn);
router.get('/vnpay_return', handleReturn);

// GET /api/payment/vnpay_ipn
router.get('/vnpay_ipn', async (req, res) => {
  try {
    const vnp_Params = { ...req.query };

    let isVerified = false;
    try {
      const verify = vnpay.verifyIpnCall(vnp_Params);
      if (verify && verify.isVerified) isVerified = true;
    } catch (_) {}

    if (!isVerified) {
      return res.status(200).json({ RspCode: '97', Message: 'Chu ky khong hop le' });
    }

    const orderId = vnp_Params.vnp_TxnRef;
    const responseCode = vnp_Params.vnp_ResponseCode;

    if (responseCode === '00' || responseCode === '0') {
      try {
        let order = await Order.findById(orderId).catch(() => null);
        if (!order) {
          order = await Order.findOne({ orderCode: orderId });
        }
        if (order) {
          order.paymentStatus = 'paid';
          if (order.status === 'pending') order.status = 'confirmed';
          order.paidAt = new Date();
          order.vnpayTransactionId = vnp_Params.vnp_TransactionNo;
          order.vnpayBankCode = vnp_Params.vnp_BankCode;
          order.vnpayResponseCode = responseCode;
          await order.save();
        }
      } catch (dbErr) {
        console.error('Lỗi IPN DB update:', dbErr);
      }

      return res.status(200).json({ RspCode: '00', Message: 'Success' });
    } else {
      return res.status(200).json({ RspCode: '01', Message: 'Failed' });
    }
  } catch (error) {
    console.error('Lỗi IPN:', error);
    return res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
  }
});

module.exports = router;
