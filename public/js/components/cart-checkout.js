/**
 * Cart Drawer & Checkout Modal Component
 */

import { API } from '../api.js';

export const CartCheckoutComponent = {
  init(appStore) {
    this.appStore = appStore;
    this.bindEvents();
  },

  formatVND(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  },

  bindEvents() {
    // Open cart drawer button
    document.getElementById('cartBtn')?.addEventListener('click', () => this.openCart());

    // Close drawer buttons
    document.getElementById('closeCartBtn')?.addEventListener('click', () => this.closeCart());
    document.getElementById('drawerOverlay')?.addEventListener('click', () => this.closeCart());

    // Checkout button
    document.getElementById('checkoutBtn')?.addEventListener('click', () => {
      this.closeCart();
      this.openCheckoutModal();
    });

    // Close checkout modal
    document.getElementById('closeCheckoutModalBtn')?.addEventListener('click', () => this.closeCheckoutModal());
    document.getElementById('checkoutForm')?.addEventListener('submit', (e) => this.handleCheckoutSubmit(e));
  },

  openCart() {
    document.getElementById('cartDrawer')?.classList.add('active');
    document.getElementById('drawerOverlay')?.classList.add('active');
    this.renderCart();
  },

  closeCart() {
    document.getElementById('cartDrawer')?.classList.remove('active');
    document.getElementById('drawerOverlay')?.classList.remove('active');
  },

  openCheckoutModal() {
    const cartItems = this.appStore.state.cart;
    if (!cartItems || cartItems.length === 0) {
      this.appStore.showToast('Giỏ hàng của bạn đang trống!', 'warning');
      return;
    }
    document.getElementById('checkoutModal')?.classList.add('active');
    document.getElementById('modalOverlay')?.classList.add('active');
    
    // Render order items summary in checkout form
    const totalAmount = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
    const checkoutTotalEl = document.getElementById('checkoutTotalAmount');
    if (checkoutTotalEl) checkoutTotalEl.textContent = this.formatVND(totalAmount);
  },

  closeCheckoutModal() {
    document.getElementById('checkoutModal')?.classList.remove('active');
    document.getElementById('modalOverlay')?.classList.remove('active');
  },

  renderCart() {
    const cartItems = this.appStore.state.cart;
    const bodyEl = document.getElementById('cartBody');
    const totalEl = document.getElementById('cartTotalAmount');
    const badgeEl = document.getElementById('cartBadge');

    const totalQty = cartItems.reduce((acc, item) => acc + item.quantity, 0);
    const totalPrice = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

    if (badgeEl) badgeEl.textContent = totalQty;
    if (totalEl) totalEl.textContent = this.formatVND(totalPrice);

    if (!bodyEl) return;

    if (cartItems.length === 0) {
      bodyEl.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🛒</div>
          <h4 style="margin-bottom: 0.5rem;">Giỏ hàng trống</h4>
          <p style="color: var(--text-muted); font-size: 0.9rem;">Hãy chọn thêm sản phẩm vào giỏ hàng nhé!</p>
        </div>
      `;
      return;
    }

    bodyEl.innerHTML = cartItems.map(item => {
      const p = item.product;
      const img = p.images?.[0]?.url || 'https://via.placeholder.com/80';
      return `
        <div class="cart-item">
          <img src="${img}" class="cart-img" alt="${p.name}" />
          <div class="cart-info">
            <div class="cart-title">${p.name}</div>
            <div class="cart-price">${this.formatVND(p.price)}</div>
            <div class="qty-ctrl">
              <button class="qty-btn btn-dec" data-id="${p._id}">-</button>
              <span style="font-weight: 700; min-width: 20px; text-align: center;">${item.quantity}</span>
              <button class="qty-btn btn-inc" data-id="${p._id}">+</button>
            </div>
          </div>
          <button class="btn-remove" data-id="${p._id}" style="color: var(--danger); font-size: 1.2rem; padding: 0.25rem;">✕</button>
        </div>
      `;
    }).join('');

    // Attach cart controls
    bodyEl.querySelectorAll('.btn-inc').forEach(btn => {
      btn.addEventListener('click', (e) => this.appStore.updateCartQty(e.target.dataset.id, 1));
    });
    bodyEl.querySelectorAll('.btn-dec').forEach(btn => {
      btn.addEventListener('click', (e) => this.appStore.updateCartQty(e.target.dataset.id, -1));
    });
    bodyEl.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', (e) => this.appStore.removeFromCart(e.target.dataset.id));
    });
  },

  async handleCheckoutSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const customerName = form.customerName.value.trim();
    const customerPhone = form.customerPhone.value.trim();
    const shippingAddress = form.shippingAddress.value.trim();
    const paymentMethod = form.paymentMethod.value;

    const cartItems = this.appStore.state.cart;
    const totalAmount = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

    const orderPayload = {
      items: cartItems.map(i => ({ productId: i.product._id, quantity: i.quantity, price: i.product.price })),
      shippingInfo: { name: customerName, phone: customerPhone, address: shippingAddress },
      paymentMethod,
      totalAmount
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang tạo đơn hàng...';

    try {
      const result = await API.checkoutOrder(orderPayload);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Xác nhận đặt hàng';

      if (result) {
        this.closeCheckoutModal();
        this.appStore.clearCart();

        if (paymentMethod === 'vnpay' && result.paymentUrl) {
          this.appStore.showToast('Đang chuyển hướng sang cổng thanh toán VNPay...', 'info');
          setTimeout(() => window.location.href = result.paymentUrl, 1500);
        } else {
          this.appStore.showToast(`🎉 Đặt hàng thành công! Mã đơn hàng: ${result.order?.orderCode || ''}`, 'success');
        }
      }
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Xác nhận đặt hàng';
      this.appStore.showToast(err.message, 'error');
    }
  }
};
