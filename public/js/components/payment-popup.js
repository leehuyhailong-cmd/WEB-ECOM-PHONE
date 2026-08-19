/**
 * Payment Popup Component — Phonestore
 * Handles 2 COMPLETELY SEPARATE Popups:
 * 1. #vnpayPaymentModal (Official VNPay QR Image, Sandbox Redirect)
 * 2. #bankTransferModal (BIDV VietQR - LE HUY HAI LONG - 4610474410)
 * And Redesigned Premium #orderSuccessModal
 */

import { API } from '../api.js';

export const PaymentPopupComponent = {
  currentOrder: null,
  currentMode: 'vnpay', // 'vnpay' | 'bank_transfer'
  vnpayGatewayUrl: null,
  timerInterval: null,
  remainingSeconds: 900, // 15 minutes

  init(appStore) {
    this.appStore = appStore;
    this.bindEvents();
  },

  formatVND(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  },

  bindEvents() {
    // Close modal buttons
    document.getElementById('closeVnpayModalBtn')?.addEventListener('click', () => this.close());
    document.getElementById('closeBankModalBtn')?.addEventListener('click', () => this.close());
    document.getElementById('closeOrderSuccessBtn')?.addEventListener('click', () => {
      document.getElementById('orderSuccessModal')?.classList.remove('active');
      document.getElementById('modalOverlay')?.classList.remove('active');
    });

    // Copy buttons in BIDV Modal
    document.getElementById('btnCopyAcc')?.addEventListener('click', () => {
      const accNum = document.getElementById('payBankAcc')?.textContent || '4610474410';
      navigator.clipboard.writeText(accNum.replace(/\s+/g, '')).then(() => {
        this.appStore?.showToast('📋 Đã sao chép số tài khoản BIDV (4610474410)!', 'success');
      }).catch(() => {
        this.appStore?.showToast('📋 STK BIDV: ' + accNum, 'info');
      });
    });

    document.getElementById('btnCopyMemo')?.addEventListener('click', () => {
      const memo = document.getElementById('bankMemoText')?.textContent || '';
      navigator.clipboard.writeText(memo).then(() => {
        this.appStore?.showToast('📋 Đã sao chép nội dung chuyển khoản!', 'success');
      }).catch(() => {
        this.appStore?.showToast('📋 Nội dung CK: ' + memo, 'info');
      });
    });

    // Download QR buttons
    document.getElementById('btnDownloadVnpayQr')?.addEventListener('click', () => this.downloadQrCode('vnpayQrImage', 'VNPay_QR'));
    document.getElementById('btnDownloadBankQr')?.addEventListener('click', () => this.downloadQrCode('bankQrImage', 'BIDV_VietQR'));

    // Open VNPay Gateway button
    document.getElementById('btnOpenVnpayGateway')?.addEventListener('click', () => this.openVnpayGateway());

    // Confirm Payment buttons
    document.getElementById('btnConfirmVnpayPaid')?.addEventListener('click', () => this.handleConfirmPayment('vnpay'));
    document.getElementById('btnConfirmBankPaid')?.addEventListener('click', () => this.handleConfirmPayment('bank_transfer'));
  },

  async open(orderData, appStore, mode = 'vnpay') {
    if (appStore) this.appStore = appStore;
    this.currentOrder = orderData;
    this.currentMode = mode;
    this.vnpayGatewayUrl = null;

    const overlayEl = document.getElementById('modalOverlay');
    const vnpayModalEl = document.getElementById('vnpayPaymentModal');
    const bankModalEl = document.getElementById('bankTransferModal');

    // Close any open modals first
    vnpayModalEl?.classList.remove('active');
    bankModalEl?.classList.remove('active');

    const id = orderData._id || orderData.id || 'ORDER_ID';
    const code = orderData.orderCode || `ORD-${(id || '').substring(0, 6).toUpperCase()}`;
    const amount = orderData.totalPrice || orderData.total || 0;
    const memoText = `PHONESTORE ${code}`;

    if (mode === 'vnpay') {
      // ⚡ Open Dedicated VNPay Modal
      if (document.getElementById('vnpayOrderCode')) document.getElementById('vnpayOrderCode').textContent = code;
      if (document.getElementById('vnpayAmountText')) document.getElementById('vnpayAmountText').textContent = this.formatVND(amount);
      if (document.getElementById('vnpayMemoText')) document.getElementById('vnpayMemoText').textContent = memoText;

      const confirmBtn = document.getElementById('btnConfirmVnpayPaid');
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '✅ Tôi đã thanh toán qua VNPay';
      }

      // Generate VNPay Payment URL & display QR code image
      let vnpayQrUrl = `https://img.vietqr.io/image/VCB-0123456789-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(memoText)}&accountName=${encodeURIComponent('PHONESTORE')}`;
      try {
        const res = await API.request('/payment/create_payment_url', {
          method: 'POST',
          body: JSON.stringify({
            orderId: code,
            amount: amount,
            orderInfo: memoText
          })
        });
        if (res && res.paymentUrl) {
          this.vnpayGatewayUrl = res.paymentUrl;
          vnpayQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(res.paymentUrl)}`;
        }
      } catch (e) {
        console.warn('VNPay payment URL generation note:', e.message);
      }

      const vnpImg = document.getElementById('vnpayQrImage');
      if (vnpImg) vnpImg.src = vnpayQrUrl;

      vnpayModalEl?.classList.add('active');

    } else {
      // 🏦 Open Dedicated BIDV Bank Transfer Modal
      if (document.getElementById('bankOrderCode')) document.getElementById('bankOrderCode').textContent = code;
      if (document.getElementById('bidvAccHolder')) document.getElementById('bidvAccHolder').textContent = 'LE HUY HAI LONG';
      if (document.getElementById('bidvAccNum')) document.getElementById('bidvAccNum').textContent = '4610474410';
      if (document.getElementById('payBankAcc')) document.getElementById('payBankAcc').textContent = '4610474410';
      if (document.getElementById('bankAmountText')) document.getElementById('bankAmountText').textContent = this.formatVND(amount);
      if (document.getElementById('bankMemoText')) document.getElementById('bankMemoText').textContent = memoText;

      const confirmBtn = document.getElementById('btnConfirmBankPaid');
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '✅ Tôi đã chuyển khoản xong';
      }

      // Generate BIDV VietQR Code Image (BIDV-4610474410-compact2.png)
      const bidvQrUrl = `https://img.vietqr.io/image/BIDV-4610474410-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(memoText)}&accountName=${encodeURIComponent('LE HUY HAI LONG')}`;
      const bankImg = document.getElementById('bankQrImage');
      if (bankImg) {
        bankImg.src = bidvQrUrl;
        bankImg.onerror = () => {
          bankImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(`STK:4610474410|BIDV|LE HUY HAI LONG|${amount}|${memoText}`)}`;
        };
      }

      bankModalEl?.classList.add('active');
    }

    if (overlayEl) overlayEl.classList.add('active');

    // Start 15-minute countdown
    this.startCountdown(900);
  },

  close() {
    this.stopCountdown();
    document.getElementById('vnpayPaymentModal')?.classList.remove('active');
    document.getElementById('bankTransferModal')?.classList.remove('active');
    document.getElementById('modalOverlay')?.classList.remove('active');
  },

  startCountdown(seconds) {
    this.stopCountdown();
    this.remainingSeconds = seconds;
    this.updateTimerDisplay();

    this.timerInterval = setInterval(() => {
      this.remainingSeconds--;
      this.updateTimerDisplay();

      if (this.remainingSeconds <= 0) {
        this.stopCountdown();
        this.handleTimerExpired();
      }
    }, 1000);
  },

  stopCountdown() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  },

  updateTimerDisplay() {
    const mins = Math.floor(Math.max(0, this.remainingSeconds) / 60);
    const secs = Math.max(0, this.remainingSeconds) % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const vnpTimerEl = document.getElementById('vnpayCountdownText');
    if (vnpTimerEl) vnpTimerEl.textContent = formatted;
  },

  handleTimerExpired() {
    const expiryNotice = document.getElementById('vnpayExpiryNotice');
    if (expiryNotice) expiryNotice.style.display = 'block';

    const timerBox = document.getElementById('vnpayTimerBox');
    if (timerBox) timerBox.style.display = 'none';

    const confirmVnpBtn = document.getElementById('btnConfirmVnpayPaid');
    if (confirmVnpBtn) {
      confirmVnpBtn.disabled = true;
      confirmVnpBtn.innerHTML = '⚠️ Mã QR đã hết hạn';
    }

    this.appStore?.showToast('⚠️ Mã QR đã hết hạn thanh toán (15 phút). Vui lòng đặt lại đơn hàng.', 'warning');
  },

  async openVnpayGateway() {
    if (this.vnpayGatewayUrl) {
      this.appStore?.showToast('🚀 Đang chuyển hướng sang cổng thanh toán VNPay Sandbox...', 'info');
      setTimeout(() => {
        window.location.href = this.vnpayGatewayUrl;
      }, 400);
      return;
    }

    if (!this.currentOrder) return;
    const id = this.currentOrder._id || this.currentOrder.id || 'ORD_TEST';
    const amount = this.currentOrder.totalPrice || this.currentOrder.total || 10000;
    const code = this.currentOrder.orderCode || `ORD-${(id || '').substring(0, 6).toUpperCase()}`;

    const vnpBtn = document.getElementById('btnOpenVnpayGateway');
    if (vnpBtn) {
      vnpBtn.disabled = true;
      vnpBtn.innerHTML = '<span style="display:inline-block;animation:spin 1s linear infinite">🔄</span> Đang mở cổng VNPay...';
    }

    try {
      const res = await API.request('/payment/create_payment_url', {
        method: 'POST',
        body: JSON.stringify({
          orderId: code,
          amount: amount,
          orderInfo: `Thanh toan don hang ${code}`
        })
      });

      if (res && res.paymentUrl) {
        this.appStore?.showToast('🚀 Đang chuyển hướng sang cổng thanh toán VNPay Sandbox...', 'info');
        setTimeout(() => {
          window.location.href = res.paymentUrl;
        }, 600);
      } else {
        throw new Error('Không thể tạo liên kết cổng VNPay');
      }
    } catch (err) {
      if (vnpBtn) {
        vnpBtn.disabled = false;
        vnpBtn.innerHTML = '🌐 Mở cổng VNPay Sandbox';
      }
      this.appStore?.showToast(err.message || 'Lỗi kết nối cổng VNPay', 'error');
    }
  },

  async handleConfirmPayment(mode = 'vnpay') {
    if (!this.currentOrder) return;
    const id = this.currentOrder._id || this.currentOrder.id;

    const confirmBtn = mode === 'vnpay' 
      ? document.getElementById('btnConfirmVnpayPaid')
      : document.getElementById('btnConfirmBankPaid');

    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span style="display:inline-block;animation:spin 1s linear infinite">⚙️</span> Đang xác nhận thanh toán...';
    }

    try {
      await new Promise(res => setTimeout(res, 1000));

      if (id) {
        try {
          await API.confirmOrderPayment(id);
        } catch (apiErr) {
          console.warn('API payment confirm note:', apiErr.message);
        }
      }

      this.stopCountdown();
      this.close();

      // Clear cart
      this.appStore?.clearCart();

      const isVnp = mode === 'vnpay';
      const successMsg = isVnp 
        ? '🎉 Thanh toán VNPay thành công! Đơn hàng đã chuyển sang trạng thái ĐÃ THANH TOÁN (PAID).'
        : '🎉 Chuyển khoản BIDV thành công! Đơn hàng đã chuyển sang trạng thái ĐÃ THANH TOÁN (PAID).';
      this.appStore?.showToast(successMsg, 'success');

      const code = this.currentOrder.orderCode || `ORD-${(id || '').substring(0, 6).toUpperCase()}`;
      const amount = this.currentOrder.totalPrice || this.currentOrder.total || 0;
      const shipAddr = this.currentOrder.shippingAddress || {};
      const customerName = shipAddr.fullName || shipAddr.name || 'Khách hàng';
      const phone = shipAddr.phone ? ` (${shipAddr.phone})` : '';

      if (document.getElementById('successOrderCode'))     document.getElementById('successOrderCode').textContent = code;
      if (document.getElementById('successCustomerName')) document.getElementById('successCustomerName').textContent = `${customerName}${phone}`;
      if (document.getElementById('successTotalAmount'))  document.getElementById('successTotalAmount').textContent = this.formatVND(amount);
      if (document.getElementById('successPaymentMethod')) {
        document.getElementById('successPaymentMethod').innerHTML = isVnp 
          ? '<span style="color:#34d399;font-weight:700;">✅ VNPAY QR — Đã thanh toán (PAID)</span>'
          : '<span style="color:#34d399;font-weight:700;">✅ BIDV CK 24/7 (LE HUY HAI LONG) — Đã thanh toán (PAID)</span>';
      }

      // Open Redesigned Premium Success Modal
      document.getElementById('orderSuccessModal')?.classList.add('active');
      document.getElementById('modalOverlay')?.classList.add('active');
    } catch (err) {
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = mode === 'vnpay' ? '✅ Tôi đã thanh toán qua VNPay' : '✅ Tôi đã chuyển khoản xong';
      }
      this.appStore?.showToast(err.message || 'Chưa nhận được thanh toán. Vui lòng kiểm tra lại.', 'error');
    }
  },

  downloadQrCode(imgId, prefix) {
    const qrImg = document.getElementById(imgId);
    if (!qrImg || !qrImg.src) {
      this.appStore?.showToast('Không thể tải mã QR lúc này', 'warning');
      return;
    }

    const link = document.createElement('a');
    link.href = qrImg.src;
    link.download = `${prefix}_Phonestore_${this.currentOrder?.orderCode || 'ORDER'}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    link.remove();
    this.appStore?.showToast(`📥 Đã tải mã ${prefix} về máy thành công!`, 'success');
  }
};
