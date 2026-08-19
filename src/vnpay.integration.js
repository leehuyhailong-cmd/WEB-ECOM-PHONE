/**
 * =============================================
 *  TÍCH HỢP VNPAY SANDBOX - NODE.JS / EXPRESS
 *  Tương thích hoàn toàn với Logic PHP/Laravel Controller & Route
 *  Cấu hình: VNP_TMN_CODE, VNP_HASH_SECRET, VNP_URL, VNP_RETURN_URL
 *  Route: /vnpay-create, /vnpay-return, /api/payment/create_payment_url, /api/payment/vnpay_return
 * =============================================
 */

require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const querystring = require('qs');
const moment = require('moment');
const { Order } = require('./models');
const router = express.Router();

// ====================== 1. HÀM SẮP XẾP VÀ MÃ HÓA (KSORT & SHA512) ======================
function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    if (obj[key] !== null && obj[key] !== undefined && obj[key] !== '') {
      sorted[key] = String(obj[key]);
    }
  }
  return sorted;
}

function encodeUrlParam(str) {
  return encodeURIComponent(str).replace(/%20/g, '+');
}

function buildSignDataPHPStyle(inputData) {
  const sorted = sortObject(inputData);
  const keys = Object.keys(sorted);
  let hashdata = '';
  let query = '';

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = sorted[key];
    const kEncoded = encodeUrlParam(key);
    const vEncoded = encodeUrlParam(value);

    if (i > 0) {
      hashdata += '&' + kEncoded + '=' + vEncoded;
    } else {
      hashdata += kEncoded + '=' + vEncoded;
    }
    query += kEncoded + '=' + vEncoded + '&';
  }

  return { sorted, hashdata, query };
}

// ====================== 2. TẠO URL THANH TOÁN (Create Payment) ======================
function generateVNPayUrl(orderId, amount, orderInfo, ipAddr) {
  const vnp_TmnCode = process.env.VNP_TMN_CODE || process.env.VNPAY_TMN_CODE || 'AFZ79VBT';
  const vnp_HashSecret = process.env.VNP_HASH_SECRET || process.env.VNPAY_HASH_SECRET || 'EGFJFHDABPONTIDGAHQVIALWIEFHHBHR';
  const vnp_Url = process.env.VNP_URL || process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  const vnp_Returnurl = process.env.VNP_RETURN_URL || process.env.VNPAY_RETURN_URL || 'http://localhost:3000/vnpay-return';

  const vnp_TxnRef = String(orderId || Math.floor(1000 + Math.random() * 9000));
  const vnp_Amount = Math.round(Number(amount || 10000) * 100); // nhân 100 theo quy tắc VNPay
  const createDate = moment().format('YYYYMMDDHHmmss');

  const inputData = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: vnp_TmnCode,
    vnp_Amount: vnp_Amount,
    vnp_CurrCode: 'VND',
    vnp_TxnRef: vnp_TxnRef,
    vnp_OrderInfo: orderInfo || 'Thanh toan don hang test',
    vnp_OrderType: 'billpayment',
    vnp_Locale: 'vn',
    vnp_ReturnUrl: vnp_Returnurl,
    vnp_IpAddr: ipAddr || '127.0.0.1',
    vnp_CreateDate: createDate,
  };

  const { hashdata, query } = buildSignDataPHPStyle(inputData);

  const hmac = crypto.createHmac('sha512', vnp_HashSecret);
  const vnpSecureHash = hmac.update(Buffer.from(hashdata, 'utf-8')).digest('hex');

  return vnp_Url + '?' + query + 'vnp_SecureHash=' + vnpSecureHash;
}

// ====================== 3. KIỂM TRA CHỮ KÝ BẢO MẬT (Verify Signature) ======================
function verifyVNPayReturn(queryParams) {
  const vnp_HashSecret = process.env.VNP_HASH_SECRET || process.env.VNPAY_HASH_SECRET || 'EGFJFHDABPONTIDGAHQVIALWIEFHHBHR';
  const inputData = { ...queryParams };
  const vnp_SecureHash = inputData['vnp_SecureHash'];

  delete inputData['vnp_SecureHash'];
  delete inputData['vnp_SecureHashType'];

  const { hashdata } = buildSignDataPHPStyle(inputData);
  const hmac = crypto.createHmac('sha512', vnp_HashSecret);
  const secureHash = hmac.update(Buffer.from(hashdata, 'utf-8')).digest('hex');

  const isMatched = secureHash.toLowerCase() === (vnp_SecureHash || '').toLowerCase();

  // Try raw non-encoded fallback if matched false
  if (!isMatched) {
    const rawData = querystring.stringify(sortObject(inputData), { encode: false });
    const rawHash = crypto.createHmac('sha512', vnp_HashSecret).update(Buffer.from(rawData, 'utf-8')).digest('hex');
    return rawHash.toLowerCase() === (vnp_SecureHash || '').toLowerCase();
  }

  return isMatched;
}

// ====================== 4. CONTROLLER / ROUTER LOGIC ======================

// Handler tạo URL thanh toán
async function createPaymentHandler(req, res) {
  try {
    const { orderId, amount, orderInfo, vnp_Amount, vnp_TxnRef, vnp_OrderInfo } = req.body;
    const finalOrderId = orderId || vnp_TxnRef || `ORD-${Date.now()}`;
    const finalAmount = amount || (vnp_Amount ? vnp_Amount / 100 : 10000);
    const finalOrderInfo = orderInfo || vnp_OrderInfo || `Thanh toan don hang ${finalOrderId}`;
    const ipAddr =
      req.headers['x-forwarded-for'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      '127.0.0.1';

    const paymentUrl = generateVNPayUrl(finalOrderId, finalAmount, finalOrderInfo, ipAddr);

    if (req.accepts('html') && !req.xhr && !req.headers['content-type']?.includes('json')) {
      return res.redirect(paymentUrl);
    }

    return res.json({
      success: true,
      paymentUrl: paymentUrl,
      message: 'Tạo URL thanh toán VNPay thành công',
    });
  } catch (error) {
    console.error('Lỗi tạo URL VNPay:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Handler nhận kết quả trả về từ VNPay
async function vnpayReturnHandler(req, res) {
  try {
    const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    const vnp_Params = { ...req.query };
    const isValid = verifyVNPayReturn(vnp_Params);
    const orderId = vnp_Params.vnp_TxnRef;
    const responseCode = vnp_Params.vnp_ResponseCode;

    if (!isValid) {
      if (req.xhr || req.headers.accept?.includes('json')) {
        return res.json({ status: 'error', message: 'Chữ ký không hợp lệ!' });
      }
      return res.redirect(`${clientUrl}/index.html?payment=failed&message=${encodeURIComponent('Chữ ký không hợp lệ!')}`);
    }

    if (responseCode === '00' || responseCode === '0') {
      try {
        let order = await Order.findById(orderId).catch(() => null);
        if (!order) order = await Order.findOne({ orderCode: orderId });

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

      if (req.xhr || req.headers.accept?.includes('json')) {
        return res.json({ status: 'success', message: 'Giao dịch thành công!', orderId });
      }
      return res.redirect(`${clientUrl}/index.html?payment=success&orderId=${orderId}`);
    } else {
      if (req.xhr || req.headers.accept?.includes('json')) {
        return res.json({ status: 'error', message: 'Giao dịch thất bại.', code: responseCode });
      }
      return res.redirect(`${clientUrl}/index.html?payment=failed&orderId=${orderId}&code=${responseCode}`);
    }
  } catch (error) {
    console.error('Lỗi vnpayReturn:', error);
    const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${clientUrl}/index.html?payment=failed`);
  }
}

// Handler IPN (Server Call Server)
async function vnpayIpnHandler(req, res) {
  try {
    const vnp_Params = { ...req.query };
    const isValid = verifyVNPayReturn(vnp_Params);
    if (!isValid) {
      return res.status(200).json({ RspCode: '97', Message: 'Chu ky khong hop le' });
    }

    const orderId = vnp_Params.vnp_TxnRef;
    const responseCode = vnp_Params.vnp_ResponseCode;

    if (responseCode === '00' || responseCode === '0') {
      try {
        let order = await Order.findById(orderId).catch(() => null);
        if (!order) order = await Order.findOne({ orderCode: orderId });

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
}

// ====================== 5. ROUTE DECLARATION ======================

// Hỗ trợ tất cả các đường dẫn Route (Laravel & Node.js API style)
router.post('/vnpay-create', createPaymentHandler);
router.post('/create_payment_url', createPaymentHandler);
router.post('/create-qr', createPaymentHandler);

router.get('/vnpay-return', vnpayReturnHandler);
router.get('/vnpay_return', vnpayReturnHandler);
router.get('/check-payment-vnpay', vnpayReturnHandler);

router.get('/vnpay_ipn', vnpayIpnHandler);
router.get('/vnpay-ipn', vnpayIpnHandler);

module.exports = router;
