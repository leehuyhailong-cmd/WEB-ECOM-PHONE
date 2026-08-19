/**
 * Main Application Entry Point & State Store
 * Auth/Admin now use dedicated pages: /auth.html and /admin.html
 */

import { API } from './api.js';
import { CatalogComponent } from './components/catalog.js';
import { ProductDetailComponent } from './components/product-detail.js';
import { CartCheckoutComponent } from './components/cart-checkout.js';
import { PaymentPopupComponent } from './components/payment-popup.js';
import { ChatbotComponent } from './components/chatbot.js';

class AppStore {
  constructor() {
    // Tự động xoá các sản phẩm lỗi (từ database cũ không có _id)
    let cart = JSON.parse(localStorage.getItem('phonestore_cart') || '[]');
    cart = cart.filter(item => item && item.product && item.product._id);
    
    this.state = {
      cart,
      currentUser: JSON.parse(localStorage.getItem('phonestore_user') || 'null')
    };
  }

  saveCart() {
    localStorage.setItem('phonestore_cart', JSON.stringify(this.state.cart));
    CartCheckoutComponent.renderCart();
  }

  addToCart(product, quantity = 1) {
    const existingIndex = this.state.cart.findIndex(item => item.product._id === product._id);
    if (existingIndex > -1) {
      this.state.cart[existingIndex].quantity += quantity;
    } else {
      this.state.cart.push({ product, quantity });
    }
    this.saveCart();
    this.showToast(`Đã thêm "${product.name}" vào giỏ hàng`, 'success');
  }

  updateCartQty(productId, delta) {
    const item = this.state.cart.find(i => i.product._id === productId);
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
    this.state.cart = this.state.cart.filter(i => i.product._id !== productId);
    this.saveCart();
    this.showToast('Đã xóa sản phẩm khỏi giỏ hàng', 'info');
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
    CartCheckoutComponent.openCart();
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
  window.appStore = app;

  // ── Verify token với server (tránh hiển thị sai khi token hết hạn) ──────
  const token = localStorage.getItem('phonestore_token');
  if (token) {
    const serverUser = await API.getMe();
    if (serverUser) {
      // Cập nhật user data mới nhất từ server
      localStorage.setItem('phonestore_user', JSON.stringify(serverUser));
      app.state.currentUser = serverUser;
    } else {
      // Token không hợp lệ → xóa
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

  // ⚡ Admin button → go to admin page
  document.getElementById('adminBtn')?.addEventListener('click', () => {
    window.location.href = '/admin.html';
  });

  // Close modals when clicking overlay
  document.getElementById('modalOverlay')?.addEventListener('click', () => {
    ProductDetailComponent.close();
    CartCheckoutComponent.closeCheckoutModal();
    PaymentPopupComponent.close();
  });

  // Render initial state
  CartCheckoutComponent.renderCart();
  app.updateNavbarUserState();

  // Initialize Hero Slider Carousel
  initHeroSlider();
});

export { AppStore };

function initHeroSlider() {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dot');
  const prevBtn = document.getElementById('heroPrevBtn');
  const nextBtn = document.getElementById('heroNextBtn');
  const sliderContainer = document.getElementById('heroSlider');

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

  dots.forEach(dot => {
    dot.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      showSlide(idx);
      startAutoPlay();
    });
  });

  sliderContainer?.addEventListener('mouseenter', stopAutoPlay);
  sliderContainer?.addEventListener('mouseleave', startAutoPlay);

  startAutoPlay();
}
