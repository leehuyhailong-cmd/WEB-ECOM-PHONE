/**
 * Cart & Checkout Component — Phonestore
 * Handles: Cart Drawer rendering, Checkout Modal, Order submission, Immediate VNPay Gateway Redirect, and Bank Transfer Modal triggering.
 */

import { API } from '../api.js';
import { PaymentPopupComponent } from './payment-popup.js';

export const CartCheckoutComponent = {
  init(appStore) {
    this.appStore = appStore;
    PaymentPopupComponent.init(appStore);
    this.bindEvents();
  },

  formatVND(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  },

  bindEvents() {
    // Open cart drawer
    document.getElementById('cartBtn')?.addEventListener('click', () => this.openCartDrawer());
    document.getElementById('closeCartBtn')?.addEventListener('click', () => this.closeCartDrawer());

    // Open checkout modal from cart drawer
    document.getElementById('checkoutBtn')?.addEventListener('click', () => {
      this.closeCartDrawer();
      this.openCheckoutModal();
    });

    // Close checkout modal
    document.getElementById('closeCheckoutModalBtn')?.addEventListener('click', () => this.closeCheckoutModal());

    // Handle checkout form submit
    document.getElementById('checkoutForm')?.addEventListener('submit', (e) => this.handleCheckoutSubmit(e));
  },

  openCartDrawer() {
    this.renderCart();
    document.getElementById('cartDrawer')?.classList.add('active');
    document.getElementById('drawerOverlay')?.classList.add('active');
    document.getElementById('modalOverlay')?.classList.add('active');
  },

  closeCartDrawer() {
    document.getElementById('cartDrawer')?.classList.remove('active');
    document.getElementById('drawerOverlay')?.classList.remove('active');
    document.getElementById('modalOverlay')?.classList.remove('active');
  },

  openCheckoutModal() {
    const items = this.appStore.getCart();
    if (!items || items.length === 0) {
      this.appStore.showToast('Giỏ hàng của bạn đang trống!', 'warning');
      return;
    }

    const user = this.appStore.state?.currentUser;
    const form = document.getElementById('checkoutForm');
    if (form && user) {
      if (form.customerName) form.customerName.value = user.name || user.fullName || '';
      if (form.customerPhone) form.customerPhone.value = user.phone || '';
      if (form.shippingAddress) form.shippingAddress.value = user.address || '';
    }

    const total = this.appStore.getCartTotal();
    if (document.getElementById('checkoutTotalAmount')) {
      document.getElementById('checkoutTotalAmount').textContent = this.formatVND(total);
    }

    document.getElementById('checkoutModal')?.classList.add('active');
    document.getElementById('modalOverlay')?.classList.add('active');
  },

  closeCheckoutModal() {
    document.getElementById('checkoutModal')?.classList.remove('active');
    document.getElementById('modalOverlay')?.classList.remove('active');
  },

  renderCart() {
    const cartItemsEl = document.getElementById('cartBody') || document.getElementById('cartDrawerItems');
    const cartBadge = document.getElementById('cartBadge');
    const totalAmountEl = document.getElementById('cartTotalAmount');
    if (!cartItemsEl) return;

    const items = this.appStore.getCart();
    const count = this.appStore.getCartCount();
    const total = this.appStore.getCartTotal();

    if (cartBadge) cartBadge.textContent = count;
    if (totalAmountEl) totalAmountEl.textContent = this.formatVND(total);

    if (!items || items.length === 0) {
      cartItemsEl.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <div style="font-size: 3rem; margin-bottom: 0.5rem;">🛒</div>
          <p style="font-size: 0.95rem;">Giỏ hàng của bạn đang trống</p>
        </div>
      `;
      return;
    }

    cartItemsEl.innerHTML = items.map(item => {
      const p = item.product || {};
      const img = p.images?.[0]?.url || p.images?.[0] || 'https://via.placeholder.com/80?text=No+Image';
      const name = p.name || 'Sản phẩm';
      const price = item.price || p.price || 0;
      const productId = p._id || p.id || item.productId;

      return `
        <div class="cart-item-card" style="display: flex; gap: 0.75rem; padding: 0.75rem; background: var(--bg-card); border-radius: var(--radius-sm); margin-bottom: 0.75rem; border: 1px solid var(--border-subtle); align-items: center;">
          <img src="${img}" alt="${name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: var(--radius-sm);" />
          <div style="flex: 1; min-width: 0;">
            <h5 style="font-size: 0.85rem; font-weight: 600; margin-bottom: 0.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</h5>
            <div style="font-size: 0.82rem; color: var(--primary); font-weight: 700;">${this.formatVND(price)}</div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.4rem;">
              <button class="btn-qty-minus" data-id="${productId}" style="width: 24px; height: 24px; border-radius: 4px; border: 1px solid var(--border-subtle); background: var(--bg-body); color: var(--text-main); font-size: 0.85rem; cursor: pointer; font-weight:700;">-</button>
              <span style="font-size: 0.85rem; font-weight: 700; min-width: 18px; text-align: center;">${item.quantity}</span>
              <button class="btn-qty-plus" data-id="${productId}" style="width: 24px; height: 24px; border-radius: 4px; border: 1px solid var(--border-subtle); background: var(--bg-body); color: var(--text-main); font-size: 0.85rem; cursor: pointer; font-weight:700;">+</button>
            </div>
          </div>
          <button class="btn-cart-remove" data-id="${productId}" style="background: none; border: none; color: var(--danger); font-size: 1.2rem; cursor: pointer; padding: 0.25rem;">&times;</button>
        </div>
      `;
    }).join('');

    // Attach quantity & remove listeners
    cartItemsEl.querySelectorAll('.btn-qty-minus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.appStore.updateCartQuantity(id, -1);
        this.renderCart();
      });
    });

    cartItemsEl.querySelectorAll('.btn-qty-plus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.appStore.updateCartQuantity(id, 1);
        this.renderCart();
      });
    });

    cartItemsEl.querySelectorAll('.btn-cart-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.appStore.removeFromCart(id);
        this.renderCart();
      });
    });
  },

  async handleCheckoutSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    const customerName = form.customerName.value.trim();
    const customerPhone = form.customerPhone.value.trim();
    const shippingAddress = form.shippingAddress.value.trim();
    const paymentMethod = form.paymentMethod.value;

    if (!customerName || !customerPhone || !shippingAddress) {
      this.appStore.showToast('Vui lòng điền đầy đủ thông tin giao hàng!', 'warning');
      return;
    }

    const items = this.appStore.getCart();
    if (!items || items.length === 0) {
      this.appStore.showToast('Giỏ hàng trống!', 'warning');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang xử lý đơn hàng...';

    const totalAmount = this.appStore.getCartTotal();

    const orderPayload = {
      items: items.map(item => ({
        product: item.productId || item.product?._id,
        quantity: item.quantity,
        price: item.price || item.product?.price
      })),
      shippingAddress: {
        fullName: customerName,
        phone: customerPhone,
        street: shippingAddress,
        ward: 'Phường 1',
        district: 'Quận Hoàn Kiếm',
        province: 'Hà Nội'
      },
      paymentMethod: paymentMethod
    };

    try {
      let orderCode = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
      let createdOrder = null;
      let paymentUrl = null;

      try {
        const result = await API.checkoutOrder(orderPayload);
        if (result && result.order) {
          createdOrder = result.order;
          orderCode = result.order.orderCode || result.order._id?.substring(0, 8).toUpperCase() || orderCode;
          paymentUrl = result.paymentUrl;
        }
      } catch (apiErr) {
        console.warn('API checkout note:', apiErr.message);
      }

      submitBtn.disabled = false;
      submitBtn.textContent = 'Xác nhận đặt hàng';

      this.closeCheckoutModal();

      const fullOrderObj = createdOrder || {
        _id: 'ord_' + Date.now(),
        orderCode: orderCode,
        totalPrice: totalAmount,
        shippingAddress: { fullName: customerName, phone: customerPhone, street: shippingAddress }
      };

      if (paymentMethod === 'vnpay') {
        // ⚡ IMMEDIATE REDIRECT TO VNPAY GATEWAY (NO QR POPUP)
        this.appStore?.showToast('🚀 Đang chuyển hướng sang cổng thanh toán VNPay Sandbox...', 'info');

        try {
          const res = await API.request('/payment/create_payment_url', {
            method: 'POST',
            body: JSON.stringify({
              orderId: orderCode,
              amount: totalAmount,
              orderInfo: `Thanh toan don hang ${orderCode}`
            })
          });

          if (res && res.paymentUrl) {
            setTimeout(() => {
              window.location.href = res.paymentUrl;
            }, 400);
            return;
          }
        } catch (vnpErr) {
          console.warn('VNPay URL error:', vnpErr);
        }

        const fallbackUrl = paymentUrl || `https://sandbox.vnpayment.vn/paymentv2/Transaction/PaymentMethod.html?token=20d3ebb619514fd89108906972d887e1`;
        setTimeout(() => {
          window.location.href = fallbackUrl;
        }, 400);
        return;

      } else if (paymentMethod === 'bank_transfer') {
        // 🏦 OPEN DEDICATED BIDV BANK POPUP (LE HUY HAI LONG - 4610474410)
        PaymentPopupComponent.open(fullOrderObj, this.appStore, 'bank_transfer');

      } else {
        // COD payment flow
        this.appStore.clearCart();
        if (document.getElementById('successOrderCode')) document.getElementById('successOrderCode').textContent = orderCode;
        if (document.getElementById('successCustomerName')) document.getElementById('successCustomerName').textContent = `${customerName} (${customerPhone})`;
        if (document.getElementById('successTotalAmount')) document.getElementById('successTotalAmount').textContent = this.formatVND(totalAmount);
        if (document.getElementById('successPaymentMethod')) document.getElementById('successPaymentMethod').textContent = 'Thanh toán khi nhận hàng (COD)';

        document.getElementById('orderSuccessModal')?.classList.add('active');
        document.getElementById('modalOverlay')?.classList.add('active');
      }

    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Xác nhận đặt hàng';
      this.appStore.showToast(err.message || 'Không thể tạo đơn hàng. Vui lòng thử lại.', 'error');
    }
  }
};
