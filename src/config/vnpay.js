'use strict';

const { VNPay, ProductCode, VnpLocale } = require('vnpay');
const { logger } = require('../utils/logger');

/**
 * VNPay singleton — lazy initialised on first use.
 * Returns null if credentials are absent so callers degrade gracefully.
 *
 * Deep module: the entire vnpay SDK is hidden behind getVNPay().
 * Swapping to a different gateway only touches this file.
 */
let _instance = null;

function getVNPay() {
  if (_instance) return _instance;

  const { VNPAY_TMN_CODE, VNPAY_HASH_SECRET, VNPAY_URL } = process.env;
  if (!VNPAY_TMN_CODE || !VNPAY_HASH_SECRET) {
    logger.warn({ msg: 'VNPay disabled — set VNPAY_TMN_CODE and VNPAY_HASH_SECRET to enable' });
    return null;
  }

  let vnpayHost = 'https://sandbox.vnpayment.vn';
  try {
    if (VNPAY_URL) vnpayHost = new URL(VNPAY_URL).origin;
  } catch (_) { /* keep default sandbox */ }

  _instance = new VNPay({
    tmnCode:      VNPAY_TMN_CODE,
    secureSecret: VNPAY_HASH_SECRET,
    vnpayHost,
    testMode:     process.env.NODE_ENV !== 'production',
    enableLog:    false,
  });

  logger.info({ msg: '✅ VNPay configured', host: vnpayHost });
  return _instance;
}

module.exports = { getVNPay, ProductCode, VnpLocale };
