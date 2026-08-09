/**
 * Auth Page — Login & Register Logic
 */
import { API } from './api.js';

// ── Tab Switcher ────────────────────────────────────────────────────────────
window.switchTab = function(tab) {
  const loginPanel = document.getElementById('loginPanel');
  const registerPanel = document.getElementById('registerPanel');
  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const title = document.getElementById('authTitle');
  const subtitle = document.getElementById('authSubtitle');
  clearAlert();

  if (tab === 'login') {
    loginPanel.classList.add('active');
    registerPanel.classList.remove('active');
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    title.textContent = 'Chào mừng trở lại! 👋';
    subtitle.textContent = 'Đăng nhập để tiếp tục mua sắm và theo dõi đơn hàng của bạn';
  } else {
    registerPanel.classList.add('active');
    loginPanel.classList.remove('active');
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    title.textContent = 'Tạo tài khoản mới 🎉';
    subtitle.textContent = 'Đăng ký miễn phí và nhận ngay voucher giảm giá 100.000đ cho đơn đầu tiên';
  }
};

function showAlert(msg, type = 'error') {
  const el = document.getElementById('authAlert');
  el.textContent = msg;
  el.className = `auth-alert show ${type}`;
}

function clearAlert() {
  const el = document.getElementById('authAlert');
  el.className = 'auth-alert';
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? 'Đang xử lý...' : (btnId === 'loginBtn' ? 'Đăng Nhập' : 'Tạo Tài Khoản');
}

// ── Login ───────────────────────────────────────────────────────────────────
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    showAlert('Vui lòng nhập đầy đủ email và mật khẩu');
    return;
  }

  setLoading('loginBtn', true);
  try {
    const res = await API.login(email, password);
    if (res && res.user) {
      localStorage.setItem('phonestore_user', JSON.stringify(res.user));
      if (res.token) localStorage.setItem('phonestore_token', res.token);

      showAlert(`Đăng nhập thành công! Chào ${res.user.name} 🎉`, 'success');

      setTimeout(() => {
        // Redirect: admin → admin.html, customer → index.html
        if (res.user.role === 'admin') {
          window.location.href = '/admin.html';
        } else {
          const returnUrl = new URLSearchParams(window.location.search).get('return') || '/';
          window.location.href = returnUrl;
        }
      }, 1000);
    } else {
      showAlert('Email hoặc mật khẩu không đúng. Vui lòng thử lại.');
    }
  } catch {
    showAlert('Có lỗi xảy ra. Vui lòng thử lại sau.');
  } finally {
    setLoading('loginBtn', false);
  }
});

// ── Register ────────────────────────────────────────────────────────────────
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();

  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const passwordConfirm = document.getElementById('regPasswordConfirm').value;

  if (!name || !email || !password) {
    showAlert('Vui lòng điền đầy đủ thông tin');
    return;
  }
  if (password.length < 6) {
    showAlert('Mật khẩu phải có ít nhất 6 ký tự');
    return;
  }
  if (password !== passwordConfirm) {
    showAlert('Mật khẩu xác nhận không khớp');
    return;
  }

  setLoading('registerBtn', true);
  try {
    const res = await API.register(name, email, password);
    if (res && res.user) {
      localStorage.setItem('phonestore_user', JSON.stringify(res.user));
      if (res.token) localStorage.setItem('phonestore_token', res.token);

      showAlert('Đăng ký thành công! Đang chuyển hướng...', 'success');
      setTimeout(() => { window.location.href = '/'; }, 1200);
    } else {
      showAlert('Không thể tạo tài khoản. Vui lòng thử lại.');
    }
  } catch {
    showAlert('Có lỗi xảy ra. Vui lòng thử lại sau.');
  } finally {
    setLoading('registerBtn', false);
  }
});

// ── Check if already logged in ──────────────────────────────────────────────
(function checkAuth() {
  const user = JSON.parse(localStorage.getItem('phonestore_user') || 'null');
  if (user) {
    // Already logged in — redirect away
    if (user.role === 'admin') {
      window.location.href = '/admin.html';
    } else {
      window.location.href = '/';
    }
  }
})();
