/**
 * Main Application Entry Point & State Store
 */

import { CatalogComponent } from './components/catalog.js';
import { ProductDetailComponent } from './components/product-detail.js';
import { CartCheckoutComponent } from './components/cart-checkout.js';
import { AuthUserComponent } from './components/auth-user.js';
import { ChatbotComponent } from './components/chatbot.js';
import { AdminDashboardComponent } from './components/admin-dashboard.js';

class AppStore {
  constructor() {
    this.state = {
      cart: JSON.parse(localStorage.getItem('phonestore_cart') || '[]'),
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
    }
  }

  openProductModal(slugOrId) {
    ProductDetailComponent.open(slugOrId, this);
  }

  openCartDrawer() {
    CartCheckoutComponent.openCart();
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
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

  // Initialise components
  await CatalogComponent.init(app);
  CartCheckoutComponent.init(app);
  AuthUserComponent.init(app);
  ChatbotComponent.init(app);
  AdminDashboardComponent.init(app);

  // Close modals when clicking overlay
  document.getElementById('modalOverlay')?.addEventListener('click', () => {
    ProductDetailComponent.close();
    CartCheckoutComponent.closeCheckoutModal();
    AuthUserComponent.closeAuthModal();
    AuthUserComponent.closeProfileModal();
    AdminDashboardComponent.close();
  });

  // Render initial cart state badge
  CartCheckoutComponent.renderCart();
});
