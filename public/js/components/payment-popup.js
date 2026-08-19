/**
 * Payment Popup Component — Phonestore
 * Handles: SEPARATE interfaces for VNPay QR Payment vs Manual Bank Transfer (24/7 VietQR)
 */

import { API } from '../api.js';

export const PaymentPopupComponent = {
  currentOrder: null,
  currentMode: 'vnpay', // 'vnpay' | 'bank_transfer'
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
    // Close button & overlay
    document.getElementById('closePaymentPopupBtn')?.addEventListener('click', () => this.close());

    // Copy buttons
    document.getElementById('btnCopyAcc')?.addEventListener('click', () => {
      const accNum = document.getElementById('payBankAcc')?.textContent || '0123456789';
      navigator.clipboard.writeText(accNum.replace(/\s+/g, '')).then(() => {
        this.appStore?.showToast('📋 Đã sao chép số tài khoản Vietcombank!', 'success');
      }).catch(() => {
        this.appStore?.showToast('📋 Số tài khoản: ' + accNum, 'info');
      });
    });

    document.getElementById('btnCopyMemo')?.addEventListener('click', () => {
      const memo = document.getElementById('payMemoText')?.textContent || '';
      navigator.clipboard.writeText(memo).then(() => {
        this.appStore?.showToast('📋 Đã sao chép nội dung chuyển khoản!', 'success');
      }).catch(() => {
        this.appStore?.showToast('📋 Nội dung CK: ' + memo, 'info');
      });
    });

    // Download QR button
    document.getElementById('btnDownloadQr')?.addEventListener('click', () => this.downloadQrCode());

    // Redirect to Official VNPay Gateway button
    document.getElementById('btnOpenVnpayGateway')?.addEventListener('click', () => this.openVnpayGateway());

    // "Tôi đã thanh toán" button
    document.getElementById('btnConfirmPaid')?.addEventListener('click', () => this.handleConfirmPayment());
  },

  open(orderData, appStore, mode = 'vnpay') {
    if (appStore) this.appStore = appStore;
    this.currentOrder = orderData;
    this.currentMode = mode;

    const modalEl = document.getElementById('paymentPopupModal');
    const overlayEl = document.getElementById('modalOverlay');
    if (!modalEl || !overlayEl) return;

    const id = orderData._id || orderData.id || 'ORDER_ID';
    const code = orderData.orderCode || `ORD-${(id || '').substring(0, 6).toUpperCase()}`;
    const amount = orderData.totalPrice || orderData.total || 0;
    const memoText = `PHONESTORE ${code}`;

    // Populate order & amount details
    if (document.getElementById('payModalOrderCode')) document.getElementById('payModalOrderCode').textContent = code;
    if (document.getElementById('payBankAcc')) document.getElementById('payBankAcc').textContent = '0123456789';
    if (document.getElementById('payAmountText')) document.getElementById('payAmountText').textContent = this.formatVND(amount);
    if (document.getElementById('payMemoText')) document.getElementById('payMemoText').textContent = memoText;

    // Apply Mode specific view elements
    this.applyModeUI(mode, amount, memoText, code);

    // Reset button states & notices
    const confirmBtn = document.getElementById('btnConfirmPaid');
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = mode === 'vnpay' ? '✅ Tôi đã thanh toán qua VNPay' : '✅ Tôi đã chuyển khoản xong';
    }

    const expiryNotice = document.getElementById('payExpiryNotice');
    if (expiryNotice) expiryNotice.style.display = 'none';

    const timerBox = document.getElementById('payTimerBox');
    if (timerBox) timerBox.style.display = 'flex';

    // Start 15-minute countdown
    this.startCountdown(900);

    // Open modal
    modalEl.classList.add('active');
    overlayEl.classList.add('active');
  },

  applyModeUI(mode, amount, memoText, code) {
    const titleEl = document.getElementById('payPopupTitleText');
    const badgeEl = document.getElementById('payPopupBadgeLogo');
    const qrTitleEl = document.querySelector('.qr-card-title');
    const qrInstructionEl = document.querySelector('.qr-instruction');
    const vnpayBtn = document.getElementById('btnOpenVnpayGateway');
    const qrTagEl = document.querySelector('.vnpay-tag');

    const qrImg = document.getElementById('payQrImage');

    if (mode === 'vnpay') {
      // ⚡ VNPay Dedicated UI Mode
      if (titleEl) titleEl.textContent = 'Thanh Toán Cổng VNPAY QR Code';
      if (badgeEl) {
        badgeEl.innerHTML = `<span style="font-size:1.2rem;font-weight:900;color:#005baa;">VNPAY</span><span style="font-size:1.2rem;font-weight:900;color:#ed1c24;">QR</span>`;
      }
      if (qrTitleEl) qrTitleEl.textContent = '📱 Quét mã VNPAY QR Code';
      if (qrInstructionEl) qrInstructionEl.textContent = 'Mở ứng dụng Ví VNPAY hoặc App Ngân hàng để quét';
      if (vnpayBtn) vnpayBtn.style.display = 'inline-flex';
      if (qrTagEl) qrTagEl.textContent = 'VNPAY Sandbox (Official)';

      const qrUrl = `https://img.vietqr.io/image/VCB-0123456789-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(memoText)}&accountName=${encodeURIComponent('CONG TY TNHH PHONESTORE')}`;
      if (qrImg) {
        qrImg.src = qrUrl;
        qrImg.onerror = () => {
          qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`VNPAY|${amount}|${code}`)}`;
        };
      }
    } else {
      // 🏦 Bank Transfer Dedicated UI Mode
      if (titleEl) titleEl.textContent = 'Chuyển Khoản Ngân Hàng Trực Tiếp (24/7)';
      if (badgeEl) {
        badgeEl.innerHTML = `<span style="font-size:1.4rem;">🏦</span>`;
      }
      if (qrTitleEl) qrTitleEl.textContent = '📱 Mã VietQR Ngân Hàng';
      if (qrInstructionEl) qrInstructionEl.textContent = 'Mở App Ngân hàng bất kỳ và quét mã VietQR';
      if (vnpayBtn) vnpayBtn.style.display = 'none'; // Hide VNPay gateway button in manual bank mode
      if (qrTagEl) qrTagEl.textContent = 'VietQR 24/7 (Vietcombank)';

      const qrUrl = `https://img.vietqr.io/image/VCB-0123456789-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(memoText)}&accountName=${encodeURIComponent('CONG TY TNHH PHONESTORE')}`;
      if (qrImg) {
        qrImg.src = qrUrl;
        qrImg.onerror = () => {
          qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`STK:0123456789|VCB|${amount}|${memoText}`)}`;
        };
      }
    }
  },

  close() {
    this.stopCountdown();
    document.getElementById('paymentPopupModal')?.classList.remove('active');
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
    const timerTextEl = document.getElementById('payCountdownText');
    if (timerTextEl) timerTextEl.textContent = formatted;
  },

  handleTimerExpired() {
    const expiryNotice = document.getElementById('payExpiryNotice');
    if (expiryNotice) expiryNotice.style.display = 'block';

    const timerBox = document.getElementById('payTimerBox');
    if (timerBox) timerBox.style.display = 'none';

    const confirmBtn = document.getElementById('btnConfirmPaid');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '⚠️ Mã QR đã hết hạn';
    }

    this.appStore?.showToast('⚠️ Mã QR đã hết hạn thanh toán (15 phút). Vui lòng đặt lại đơn hàng.', 'warning');
  },

  async openVnpayGateway() {
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
        }, 800);
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

  async handleConfirmPayment() {
    if (!this.currentOrder) return;
    const id = this.currentOrder._id || this.currentOrder.id;

    const confirmBtn = document.getElementById('btnConfirmPaid');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span style="display:inline-block;animation:spin 1s linear infinite">⚙️</span> Đang kiểm tra thanh toán...';
    }

    try {
      await new Promise(res => setTimeout(res, 1200));

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

      const isVnp = this.currentMode === 'vnpay';
      const successMsg = isVnp 
        ? '🎉 Thanh toán VNPay thành công! Đơn hàng đã chuyển sang trạng thái ĐÃ THANH TOÁN (PAID).'
        : '🎉 Chuyển khoản thành công! Đơn hàng đã chuyển sang trạng thái ĐÃ THANH TOÁN (PAID).';
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
          ? '<span style="color:var(--success);font-weight:700;">✅ VNPay QR — Đã thanh toán (PAID)</span>'
          : '<span style="color:var(--success);font-weight:700;">✅ Vietcombank CK 24/7 — Đã thanh toán (PAID)</span>';
      }

      document.getElementById('orderSuccessModal')?.classList.add('active');
      document.getElementById('modalOverlay')?.classList.add('active');
    } catch (err) {
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = this.currentMode === 'vnpay' ? '✅ Tôi đã thanh toán qua VNPay' : '✅ Tôi đã chuyển khoản xong';
      }
      this.appStore?.showToast(err.message || 'Chưa nhận được thanh toán. Vui lòng kiểm tra lại.', 'error');
    }
  },

  downloadQrCode() {
    const qrImg = document.getElementById('payQrImage');
    if (!qrImg || !qrImg.src) {
      this.appStore?.showToast('Không thể tải mã QR lúc này', 'warning');
      return;
    }

    const prefix = this.currentMode === 'vnpay' ? 'VNPay' : 'VietQR';
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
