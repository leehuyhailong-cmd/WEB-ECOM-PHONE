/**
 * Main Application Entry Point & State Store
 * Robust Cart Management with Safe Normalization & LocalStorage Synchronization
 */

import { API } from './api.js';
import { CatalogComponent } from './components/catalog.js';
import { ProductDetailComponent } from './components/product-detail.js';
import { CartCheckoutComponent } from './components/cart-checkout.js';
import { PaymentPopupComponent } from './components/payment-popup.js';
import { ChatbotComponent } from './components/chatbot.js';

class AppStore {
  constructor() {
    let rawCart = [];
    try {
      rawCart = JSON.parse(localStorage.getItem('phonestore_cart') || '[]');
    } catch (e) {
      rawCart = [];
    }

    // Normalize cart items safely (handles _id vs id, missing product object, etc.)
    const normalizedCart = (Array.isArray(rawCart) ? rawCart : []).map(item => {
      if (!item) return null;
      const product = item.product || item;
      const productId = product._id || product.id || item.productId || ('p_' + Math.random());
      product._id = productId;
      return {
        product,
        productId,
        quantity: Math.max(1, item.quantity || 1),
        price: item.price || product.price || 0
      };
    }).filter(Boolean);

    this.state = {
      cart: normalizedCart,
      currentUser: JSON.parse(localStorage.getItem('phonestore_user') || 'null')
    };
  }

  getCart() {
    return this.state.cart || [];
  }

  getCartCount() {
    return (this.state.cart || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
  }

  getCartTotal() {
    return (this.state.cart || []).reduce((sum, item) => {
      const price = item.price || item.product?.price || 0;
      return sum + (price * (item.quantity || 1));
    }, 0);
  }

  saveCart() {
    localStorage.setItem('phonestore_cart', JSON.stringify(this.state.cart));
    const cartBadge = document.getElementById('cartBadge');
    if (cartBadge) cartBadge.textContent = this.getCartCount();
    CartCheckoutComponent.renderCart();
  }

  addToCart(product, quantity = 1) {
    if (!product) return;
    const productId = product._id || product.id || ('p_' + Date.now());
    product._id = productId;

    const existingIndex = this.state.cart.findIndex(item => {
      const pId = item.product?._id || item.product?.id || item.productId;
      return pId === productId;
    });

    if (existingIndex > -1) {
      this.state.cart[existingIndex].quantity += quantity;
    } else {
      this.state.cart.push({
        product: product,
        productId: productId,
        quantity: quantity,
        price: product.price || 0
      });
    }
    this.saveCart();
    this.showToast(`🎉 Đã thêm "${product.name || 'Sản phẩm'}" vào giỏ hàng`, 'success');
  }

  updateCartQuantity(productId, delta) {
    this.updateCartQty(productId, delta);
  }

  updateCartQty(productId, delta) {
    const item = this.state.cart.find(i => {
      const pId = i.product?._id || i.product?.id || i.productId;
      return pId === productId;
    });
    if (item) {
      item.quantity += delta;
      if (item.quantity <= 0) {
        this.removeFromCart(productId);
      } else {
        this.saveCart();
      }
    }
  }

  removeFromCart(productId) {
    this.state.cart = this.state.cart.filter(i => {
      const pId = i.product?._id || i.product?.id || i.productId;
      return pId !== productId;
    });
    this.saveCart();
    this.showToast('🗑️ Đã xóa sản phẩm khỏi giỏ hàng', 'info');
  }

  clearCart() {
    this.state.cart = [];
    this.saveCart();
  }

  setCurrentUser(user) {
    this.state.currentUser = user;
    if (user) {
      localStorage.setItem('phonestore_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('phonestore_user');
      localStorage.removeItem('phonestore_token');
    }
    this.updateNavbarUserState();
  }

  openProductModal(slugOrId) {
    ProductDetailComponent.open(slugOrId, this);
  }

  openCartDrawer() {
    CartCheckoutComponent.openCartDrawer();
  }

  updateNavbarUserState() {
    const user = this.state.currentUser;
    const greeting = document.getElementById('userGreeting');
    const authLinks = document.getElementById('authLinks');
    const adminBtn = document.getElementById('adminBtn');

    if (user) {
      if (greeting) {
        const initial = (user.name || user.email || '?')[0].toUpperCase();
        greeting.style.display = 'flex';
        greeting.innerHTML = `
          <div class="user-menu-wrapper" id="userMenuWrapper">
            <button class="user-menu-trigger" id="userMenuTrigger" title="Tài khoản của tôi">
              <span class="user-avatar">${initial}</span>
              <span class="user-menu-name">${user.name || user.email}</span>
              <span class="user-menu-caret">▾</span>
            </button>
            <div class="user-dropdown" id="userDropdown">
              <div class="user-dropdown-header">
                <div class="user-dropdown-avatar">${initial}</div>
                <div>
                  <div class="user-dropdown-name">${user.name || 'Người dùng'}</div>
                  <div class="user-dropdown-email">${user.email || ''}</div>
                </div>
              </div>
              <div class="user-dropdown-divider"></div>
              <a href="/profile.html" class="user-dropdown-item">
                <span>👤</span> Tài khoản của tôi
              </a>
              <a href="/orders.html" class="user-dropdown-item">
                <span>📦</span> Đơn hàng của tôi
              </a>
              ${user.role === 'admin' ? `
              <a href="/admin.html" class="user-dropdown-item" style="color:var(--primary);font-weight:600;">
                <span>🛡️</span> Trang Admin Dashboard
              </a>
              ` : ''}
              <div class="user-dropdown-divider"></div>
              <button class="user-dropdown-item user-dropdown-logout" id="btnLogoutHeader">
                <span>🚪</span> Đăng xuất
              </button>
            </div>
          </div>
        `;

        // Toggle dropdown
        const trigger = document.getElementById('userMenuTrigger');
        const dropdown = document.getElementById('userDropdown');
        trigger?.addEventListener('click', (e) => {
          e.stopPropagation();
          dropdown?.classList.toggle('open');
        });
        document.addEventListener('click', () => dropdown?.classList.remove('open'), { capture: false });
        document.getElementById('btnLogoutHeader')?.addEventListener('click', () => this.logout());
      }
      if (authLinks) authLinks.style.display = 'none';
      if (adminBtn) adminBtn.style.display = user.role === 'admin' ? 'inline-flex' : 'none';
    } else {
      if (greeting) greeting.style.display = 'none';
      if (authLinks) authLinks.style.display = 'flex';
      if (adminBtn) adminBtn.style.display = 'none';
    }
  }

  logout() {
    this.setCurrentUser(null);
    this.showToast('Đã đăng xuất thành công', 'info');
    setTimeout(() => {
      window.location.href = '/';
    }, 600);
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error')   icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const app = new AppStore();

  // Try fetching current user profile if token is stored
  const token = localStorage.getItem('phonestore_token');
  if (token && !app.state.currentUser) {
    const user = await API.getMe();
    if (user) {
      app.setCurrentUser(user);
    } else {
      localStorage.removeItem('phonestore_token');
      localStorage.removeItem('phonestore_user');
      app.state.currentUser = null;
    }
  }

  // Initialise components
  await CatalogComponent.init(app);
  CartCheckoutComponent.init(app);
  ChatbotComponent.init(app);

  // ── Nav button handlers ──────────────────────────────────────────────────
  document.getElementById('adminBtn')?.addEventListener('click', () => {
    window.location.href = '/admin.html';
  });

  window.ProductDetailComponent = ProductDetailComponent;
  document.getElementById('closeProductDetailBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    ProductDetailComponent.close();
  });

  // Close modals when clicking overlay
  document.getElementById('modalOverlay')?.addEventListener('click', () => {
    ProductDetailComponent.close();
    CartCheckoutComponent.closeCheckoutModal();
    PaymentPopupComponent.close();
  });

  // Render initial state
  app.saveCart();
  app.updateNavbarUserState();

  // ── Handle VNPay Return Callback Parameters ──────────────────────────────
  const urlParams = new URLSearchParams(window.location.search);
  const paymentState = urlParams.get('payment');
  const returnedOrderId = urlParams.get('orderId');

  if (paymentState === 'success') {
    app.clearCart();
    app.showToast('🎉 Thanh toán qua VNPay thành công! Đơn hàng đã được xác nhận.', 'success');

    if (document.getElementById('successOrderCode'))     document.getElementById('successOrderCode').textContent = returnedOrderId || 'ORD-VNPAY';
    if (document.getElementById('successCustomerName')) document.getElementById('successCustomerName').textContent = 'Khách hàng VNPay';
    if (document.getElementById('successTotalAmount'))  document.getElementById('successTotalAmount').textContent = 'Đã thanh toán (PAID)';
    if (document.getElementById('successPaymentMethod')) {
      document.getElementById('successPaymentMethod').innerHTML = '<span style="color:#34d399;font-weight:700;">✅ VNPAY Sandbox — Đã thanh toán (PAID)</span>';
    }

    document.getElementById('orderSuccessModal')?.classList.add('active');
    document.getElementById('modalOverlay')?.classList.add('active');

    // Clean URL query string
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (paymentState === 'failed') {
    app.showToast('⚠️ Giao dịch VNPay không thành công hoặc đã bị hủy.', 'error');
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // Initialize Hero Slider Carousel
  initHeroSlider();
});

export { AppStore };

function initHeroSlider() {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dot');
  const prevBtn = document.getElementById('heroPrevBtn');
  const nextBtn = document.getElementById('heroNextBtn');

  if (!slides.length) return;

  let currentIndex = 0;
  let timer = null;

  function showSlide(index) {
    if (index >= slides.length) index = 0;
    if (index < 0) index = slides.length - 1;
    currentIndex = index;

    slides.forEach((slide, i) => {
      if (i === currentIndex) {
        slide.classList.add('active');
      } else {
        slide.classList.remove('active');
      }
    });

    dots.forEach((dot, i) => {
      if (i === currentIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  function startAutoPlay() {
    stopAutoPlay();
    timer = setInterval(() => {
      showSlide(currentIndex + 1);
    }, 4500);
  }

  function stopAutoPlay() {
    if (timer) clearInterval(timer);
  }

  nextBtn?.addEventListener('click', () => {
    showSlide(currentIndex + 1);
    startAutoPlay();
  });

  prevBtn?.addEventListener('click', () => {
    showSlide(currentIndex - 1);
    startAutoPlay();
  });

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      showSlide(index);
      startAutoPlay();
    });
  });

  startAutoPlay();
}
