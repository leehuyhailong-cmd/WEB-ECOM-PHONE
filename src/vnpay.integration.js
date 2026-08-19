/**
 * =============================================
 *  TÍCH HỢP VNPAY SANDBOX - FILE TỔNG HỢP (THỰC TẾ)
 *  Dùng cho dự án Phonestore (Node.js + Express)
 *  Tích hợp SDK `vnpay` (vnpay1.PNG & vnpay2.PNG) + Cryptographic Checksum
 *  Mã TMN Code: AFZ79VBT | Secret: EGFJFHDABPONTIDGAHQVIALWIEFHHBHR
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

// ====================== 1. CẤU HÌNH VNPAY SDK (vnpay1.PNG & vnpay2.PNG) ======================
const tmnCode = process.env.VNP_TMN_CODE || process.env.VNPAY_TMN_CODE || 'AFZ79VBT';
const secretKey = process.env.VNP_HASH_SECRET || process.env.VNPAY_HASH_SECRET || 'EGFJFHDABPONTIDGAHQVIALWIEFHHBHR';
const vnpayHost = process.env.VNP_URL ? new URL(process.env.VNP_URL).origin : 'https://sandbox.vnpayment.vn';

const vnpay = new VNPay({
  tmnCode,
  secureSecret: secretKey,
  vnpayHost,
  testMode: true,
  hashAlgorithm: 'SHA512',
  loggerFn: ignoreLogger
});

// ====================== 2. HÀM HỖ TRỢ ======================
function sortObject(obj) {
  const sorted = {};
  Object.keys(obj)
    .sort()
    .forEach((key) => {
      sorted[key] = obj[key];
    });
  return sorted;
}

// ====================== 3. TẠO URL THANH TOÁN (SDK / CUSTOM FALLBACK) ======================
async function createPaymentUrl(orderId, amount, orderInfo, ipAddr) {
  const returnUrl = process.env.VNP_RETURN_URL || process.env.VNPAY_RETURN_URL || 'http://localhost:3000/api/payment/vnpay_return';

  try {
    // ⚡ Cách 1: Sử dụng SDK `vnpay` chính thức theo hình vnpay1.PNG & vnpay2.PNG
    const paymentUrl = await vnpay.buildPaymentUrl({
      vnp_Amount: Math.round(Number(amount)),
      vnp_IpAddr: ipAddr || '127.0.0.1',
      vnp_TxnRef: String(orderId),
      vnp_OrderInfo: orderInfo || `Thanh toan don hang ${orderId}`,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: returnUrl,
      vnp_Locale: VnpLocale.VN,
      vnp_CreateDate: dateFormat(new Date()),
    });
    return paymentUrl;
  } catch (sdkErr) {
    console.warn('[VNPay SDK Note] Fallback to manual URL builder:', sdkErr.message);

    // ⚡ Cách 2: Tự động tính HMAC SHA512 theo chuẩn vnpay.integration.js
    const createDate = moment().format('YYYYMMDDHHmmss');
    const expireDate = moment().add(15, 'minutes').format('YYYYMMDDHHmmss');
    const vnpUrl = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

    let vnp_Params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Amount: Math.round(Number(amount) * 100), // VNPay tính theo xu
      vnp_CurrCode: 'VND',
      vnp_TxnRef: String(orderId),
      vnp_OrderInfo: orderInfo || `Thanh toan don hang ${orderId}`,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr || '127.0.0.1',
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    vnp_Params = sortObject(vnp_Params);
    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    vnp_Params['vnp_SecureHash'] = signed;

    return vnpUrl + '?' + querystring.stringify(vnp_Params, { encode: false });
  }
}

// ====================== 4. KIỂM TRA CHỮ KÝ (Verify) ======================
function verifySecureHash(vnp_Params) {
  try {
    const verify = vnpay.verifyIpnCall(vnp_Params);
    if (verify && verify.isVerified) return true;
  } catch (_) { /* fallback to manual HMAC verify */ }

  const secureHash = vnp_Params['vnp_SecureHash'];
  const paramsCopy = { ...vnp_Params };
  delete paramsCopy['vnp_SecureHash'];
  delete paramsCopy['vnp_SecureHashType'];

  const sorted = sortObject(paramsCopy);
  const signData = querystring.stringify(sorted, { encode: false });
  const hmac = crypto.createHmac('sha512', secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  return secureHash === signed;
}

// ====================== 5. CÁC ROUTE ======================

/**
 * Tạo URL thanh toán
 * POST /api/payment/create_payment_url
 * Body: { orderId, amount, orderInfo }
 */
router.post('/create_payment_url', async (req, res) => {
  try {
    const { orderId, amount, orderInfo } = req.body;
    const ipAddr =
      req.headers['x-forwarded-for'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      '127.0.0.1';

    if (!orderId || !amount) {
      return res.status(400).json({ success: false, message: 'Thiếu orderId hoặc amount' });
    }

    const paymentUrl = await createPaymentUrl(
      orderId,
      amount,
      orderInfo || `Thanh toan don hang ${orderId}`,
      ipAddr
    );

    return res.json({
      success: true,
      paymentUrl,
      message: 'Tạo URL thanh toán VNPay thành công',
    });
  } catch (error) {
    console.error('Lỗi tạo URL VNPay:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Return URL - Người dùng được chuyển về sau khi thanh toán trên VNPay
 * GET /api/payment/vnpay_return
 */
router.get('/vnpay_return', async (req, res) => {
  try {
    const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    const vnp_Params = { ...req.query };

    const isValid = verifySecureHash(vnp_Params);
    if (!isValid) {
      return res.redirect(`${clientUrl}/index.html?payment=failed&message=${encodeURIComponent('Chữ ký không hợp lệ')}`);
    }

    const orderId = vnp_Params.vnp_TxnRef;
    const responseCode = vnp_Params.vnp_ResponseCode;

    // Cập nhật database Order trong MongoDB
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

      return res.redirect(
        `${clientUrl}/index.html?payment=success&orderId=${orderId}`
      );
    } else {
      return res.redirect(
        `${clientUrl}/index.html?payment=failed&orderId=${orderId}&code=${responseCode}`
      );
    }
  } catch (error) {
    console.error('Lỗi return URL:', error);
    const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${clientUrl}/index.html?payment=failed`);
  }
});

/**
 * IPN - Server-to-Server Callback từ VNPay Sandbox (xác thực số dư & thanh toán)
 * GET /api/payment/vnpay_ipn
 */
router.get('/vnpay_ipn', async (req, res) => {
  try {
    const vnp_Params = { ...req.query };

    const isValid = verifySecureHash(vnp_Params);
    if (!isValid) {
      return res.status(200).json({ RspCode: '97', Message: 'Chu ky khong hop le' });
    }

    const orderId = vnp_Params.vnp_TxnRef;
    const responseCode = vnp_Params.vnp_ResponseCode;

    // Cập nhật database Order trong MongoDB
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
