/**
 * Main Application Entry Point & State Store
 * Auth/Admin now use dedicated pages: /auth.html and /admin.html
 */

import { CatalogComponent } from './components/catalog.js';
import { ProductDetailComponent } from './components/product-detail.js';
import { CartCheckoutComponent } from './components/cart-checkout.js';
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

  // ── Navbar: show user info or login button ─────────────────────────────
  updateNavbarUserState() {
    const user = this.state.currentUser;
    const greeting = document.getElementById('userGreeting');
    const authLinks = document.getElementById('authLinks');
    const adminBtn = document.getElementById('adminBtn');

    if (user) {
      // Show greeting + name
      if (greeting) {
        greeting.style.display = 'flex';
        greeting.innerHTML = `
          <span style="font-size:1rem;">👤</span>
          <span style="color:var(--text-main);font-weight:600;">${user.name || user.email}</span>
          <button onclick="window.appStore.logout()" style="background:rgba(244,63,94,0.15);border:1px solid rgba(244,63,94,0.3);color:var(--danger);border-radius:6px;padding:0.2rem 0.65rem;font-size:0.75rem;font-weight:600;cursor:pointer;">Đăng xuất</button>
        `;
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
    this.showToast('Đang đăng xuất...', 'info');
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 500);
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
  });

  // Render initial state
  CartCheckoutComponent.renderCart();
  app.updateNavbarUserState();
});
