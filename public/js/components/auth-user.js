/**
 * Auth & User Account Component
 */

import { API } from '../api.js';

export const AuthUserComponent = {
  init(appStore) {
    this.appStore = appStore;
    this.bindEvents();
  },

  bindEvents() {
    // Open auth modal
    document.getElementById('userAccountBtn')?.addEventListener('click', () => {
      if (this.appStore.state.currentUser) {
        this.openUserProfileModal();
      } else {
        this.openAuthModal();
      }
    });

    document.getElementById('closeAuthModalBtn')?.addEventListener('click', () => this.closeAuthModal());
    document.getElementById('closeProfileModalBtn')?.addEventListener('click', () => this.closeProfileModal());

    // Switch between login & register tabs
    document.getElementById('tabLoginBtn')?.addEventListener('click', () => this.switchTab('login'));
    document.getElementById('tabRegisterBtn')?.addEventListener('click', () => this.switchTab('register'));

    // Submit forms
    document.getElementById('loginForm')?.addEventListener('submit', (e) => this.handleLogin(e));
    document.getElementById('registerForm')?.addEventListener('submit', (e) => this.handleRegister(e));

    // Logout button
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      this.appStore.setCurrentUser(null);
      this.closeProfileModal();
      this.appStore.showToast('Đã đăng xuất thành công', 'info');
    });
  },

  openAuthModal() {
    document.getElementById('authModal')?.classList.add('active');
    document.getElementById('modalOverlay')?.classList.add('active');
  },

  closeAuthModal() {
    document.getElementById('authModal')?.classList.remove('active');
    document.getElementById('modalOverlay')?.classList.remove('active');
  },

  openUserProfileModal() {
    const user = this.appStore.state.currentUser;
    if (!user) return;

    document.getElementById('profileUserName').textContent = user.name || user.email;
    document.getElementById('profileUserEmail').textContent = user.email;
    document.getElementById('profileUserRole').textContent = user.role === 'admin' ? 'Quản trị viên (Admin)' : 'Khách hàng';

    document.getElementById('userProfileModal')?.classList.add('active');
    document.getElementById('modalOverlay')?.classList.add('active');
  },

  closeProfileModal() {
    document.getElementById('userProfileModal')?.classList.remove('active');
    document.getElementById('modalOverlay')?.classList.remove('active');
  },

  switchTab(tab) {
    if (tab === 'login') {
      document.getElementById('tabLoginBtn').classList.add('active');
      document.getElementById('tabRegisterBtn').classList.remove('active');
      document.getElementById('loginForm').style.display = 'block';
      document.getElementById('registerForm').style.display = 'none';
    } else {
      document.getElementById('tabLoginBtn').classList.remove('active');
      document.getElementById('tabRegisterBtn').classList.add('active');
      document.getElementById('loginForm').style.display = 'none';
      document.getElementById('registerForm').style.display = 'block';
    }
  },

  async handleLogin(e) {
    e.preventDefault();
    const email = e.target.loginEmail.value.trim();
    const password = e.target.loginPassword.value;

    const res = await API.login(email, password);
    if (res && res.user) {
      this.appStore.setCurrentUser(res.user);
      this.closeAuthModal();
      this.appStore.showToast(`Chào mừng trở lại, ${res.user.name || res.user.email}!`, 'success');
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const name = e.target.regName.value.trim();
    const email = e.target.regEmail.value.trim();
    const password = e.target.regPassword.value;

    const res = await API.register(name, email, password);
    if (res && res.user) {
      this.appStore.setCurrentUser(res.user);
      this.closeAuthModal();
      this.appStore.showToast('Đăng ký tài khoản thành công!', 'success');
    }
  }
};
