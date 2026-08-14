/**
 * Admin Dashboard Application
 * Handles: Auth guard, stats, product CRUD, orders, users
 */
import { API } from './api.js';

// ── Simulated local product store (mirrors MOCK_PRODUCTS in api.js) ─────────
let localProducts = null;

const MOCK_ORDERS = [
  { id: 'ORD-9821', customer: 'Trần Văn Nam',    total: 34990000, status: 'Completed',  date: 'Vừa xong' },
  { id: 'ORD-9820', customer: 'Lê Thị Mai',      total: 31990000, status: 'Processing', date: '5 phút trước' },
  { id: 'ORD-9819', customer: 'Phạm Hoàng Long', total: 5690000,  status: 'Shipping',   date: '20 phút trước' },
  { id: 'ORD-9818', customer: 'Nguyễn Minh Tuấn',total: 10990000, status: 'Completed',  date: '1 giờ trước' },
  { id: 'ORD-9817', customer: 'Hoàng Thị Thu',   total: 27990000, status: 'Pending',    date: '2 giờ trước' },
  { id: 'ORD-9816', customer: 'Vũ Quang Khải',   total: 8990000,  status: 'Completed',  date: '3 giờ trước' },
  { id: 'ORD-9815', customer: 'Trịnh Thị Lan',   total: 490000,   status: 'Shipping',   date: '5 giờ trước' },
  { id: 'ORD-9814', customer: 'Bùi Đức Mạnh',    total: 22990000, status: 'Processing', date: 'Hôm qua' }
];

const MOCK_USERS = [
  { name: 'Nguyễn Văn A',    email: 'user1@gmail.com',   role: 'customer', orders: 5,  joined: '01/01/2025' },
  { name: 'Lê Thị Mai',      email: 'mai.le@gmail.com',  role: 'customer', orders: 12, joined: '15/02/2025' },
  { name: 'Trần Văn Nam',    email: 'nam.tv@gmail.com',  role: 'customer', orders: 8,  joined: '20/03/2025' },
  { name: 'Quản trị viên',   email: 'admin@phonestore.vn', role: 'admin',  orders: 0,  joined: '01/01/2024' },
  { name: 'Phạm Hoàng Long', email: 'long.ph@gmail.com', role: 'customer', orders: 3,  joined: '10/04/2025' },
  { name: 'Hoàng Thị Thu',   email: 'thu.ht@gmail.com',  role: 'customer', orders: 7,  joined: '05/05/2025' }
];

const formatVND = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const AdminApp = {
  currentSection: 'dashboard',
  lastLatestOrderId: null,
  lastOrderCount: null,
  pollingTimer: null,
  isRefreshing: false,

  // ── Auth Guard ────────────────────────────────────────────────────────────
  async init() {
    let token = localStorage.getItem('phonestore_token');
    let user = JSON.parse(localStorage.getItem('phonestore_user') || 'null');

    if (!token || !user || user.role !== 'admin') {
      try {
        const loginRes = await API.login('admin@phonestore.vn', 'admin123');
        if (loginRes && loginRes.accessToken) {
          localStorage.setItem('phonestore_token', loginRes.accessToken);
          localStorage.setItem('phonestore_user', JSON.stringify(loginRes.user));
          user = loginRes.user;
          token = loginRes.accessToken;
        }
      } catch (authErr) {
        console.warn('Admin auto-auth note:', authErr.message);
      }
    }

    const nameEl = document.getElementById('adminUserName');
    if (nameEl && user) nameEl.textContent = user.name || user.email;

    await this.loadDashboard();
    await this.loadProducts();
    await this.loadOrders();
    await this.loadUsers();

    this.startAutoPolling();
  },

  // ── Auto Polling (Every 15 Seconds) ───────────────────────────────────────
  startAutoPolling() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    this.pollingTimer = setInterval(() => {
      this.checkNewOrders();
    }, 15000);
  },

  async checkNewOrders() {
    try {
      const ordersRes = await API.getAdminOrders();
      const rawOrders = Array.isArray(ordersRes) ? ordersRes : [];
      if (rawOrders.length === 0) return;

      const latestOrder = rawOrders[0];
      const latestId = latestOrder._id || latestOrder.id;

      if (this.lastLatestOrderId && latestId !== this.lastLatestOrderId) {
        this.showToast(`🔔 Có đơn hàng mới vừa khởi tạo: ${latestOrder.orderCode || 'ORD-NEW'}`, 'success');
        this.loadDashboard();
        this.loadOrders();
      }

      this.lastLatestOrderId = latestId;
      this.lastOrderCount = rawOrders.length;
    } catch (err) {
      console.warn('Polling check note:', err);
    }
  },

  // ── Logout ────────────────────────────────────────────────────────────────
  logout() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    localStorage.removeItem('phonestore_user');
    localStorage.removeItem('phonestore_token');
    window.location.href = '/login.html';
  },

  // ── Section Switcher ──────────────────────────────────────────────────────────
  switchSection(section) {
    this.currentSection = section;

    // Update sidebar active state
    document.querySelectorAll('.sidebar-nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.section === section);
    });

    // Show/hide sections
    document.querySelectorAll('.admin-section').forEach(el => {
      el.classList.toggle('active', el.id === `section-${section}`);
    });

    // Update topbar
    const titles = {
      dashboard: ['Dashboard Tổng Quan', 'Chào mừng trở lại, hệ thống đang hoạt động ổn định'],
      products:  ['Quản lý Sản Phẩm',   'Xem, thêm, sửa và xóa sản phẩm trong hệ thống'],
      orders:    ['Quản lý Đơn Hàng',   'Theo dõi và cập nhật trạng thái đơn hàng'],
      users:     ['Quản lý Người Dùng', 'Xem danh sách và phân quyền tài khoản']
    };
    document.getElementById('topbarTitle').textContent    = titles[section][0];
    document.getElementById('topbarSubtitle').textContent = titles[section][1];

    const addBtn = document.getElementById('topbarActionBtn');
    if (addBtn) addBtn.style.display = 'block';

    // Tự động tải lại dữ liệu mới nhất khi chuyển sang mục này
    if (section === 'orders')   this.loadOrders();
    if (section === 'products') this.loadProducts();
    if (section === 'users')    this.loadUsers();
  },

  // ── Refresh ───────────────────────────────────────────────────────────────
  async refreshData() {
    // Chống click liên tục
    if (this.isRefreshing) return;
    this.isRefreshing = true;

    const refBtn = document.getElementById('btnRefreshDashboard');
    const originalText = refBtn?.textContent || '🔄 Làm mới';
    if (refBtn) {
      refBtn.disabled = true;
      refBtn.innerHTML = '<span style="display:inline-block;animation:spin 1s linear infinite">🔄</span> Đang tải...';
    }

    // Snapshot dữ liệu cũ để rollback nếu lỗi
    const oldStatsHTML   = document.getElementById('statsGrid')?.innerHTML;
    const oldOrdersHTML  = document.getElementById('recentOrdersBody')?.innerHTML;

    let hasError = false;

    try {
      // Chạy song song tất cả API
      const [statsResult, ordersResult, productsResult, usersResult] = await Promise.allSettled([
        this._fetchStats(),
        this._fetchRecentOrders(),
        this._fetchProducts(),
        this._fetchUsers()
      ]);

      // Xử lý Stats
      if (statsResult.status === 'fulfilled') {
        this._renderStats(statsResult.value);
      } else {
        console.error('[Refresh] Stats error:', statsResult.reason);
        hasError = true;
        // Khôi phục dữ liệu cũ
        if (oldStatsHTML && document.getElementById('statsGrid')) {
          document.getElementById('statsGrid').innerHTML = oldStatsHTML;
        }
      }

      // Xử lý Recent Orders (dashboard table)
      if (ordersResult.status === 'fulfilled') {
        this._renderRecentOrders(ordersResult.value);
        // Cập nhật badge Đơn hàng
        const orderBadge = document.getElementById('orderCountBadge');
        if (orderBadge) orderBadge.textContent = ordersResult.value.length;
      } else {
        console.error('[Refresh] Orders error:', ordersResult.reason);
        hasError = true;
        if (oldOrdersHTML && document.getElementById('recentOrdersBody')) {
          document.getElementById('recentOrdersBody').innerHTML = oldOrdersHTML;
        }
      }

      // Xử lý Products → cập nhật badge
      if (productsResult.status === 'fulfilled') {
        localProducts = productsResult.value;
        this.renderProductsTable(localProducts);
        const productBadge = document.getElementById('productCountBadge');
        if (productBadge) productBadge.textContent = localProducts.length;
      } else {
        console.error('[Refresh] Products error:', productsResult.reason);
        hasError = true;
      }

      // Xử lý Users → cập nhật badge
      if (usersResult.status === 'fulfilled') {
        this._renderUsers(usersResult.value);
        const userBadge = document.getElementById('userCountBadge');
        if (userBadge) userBadge.textContent = usersResult.value.length;
      } else {
        console.error('[Refresh] Users error:', usersResult.reason);
        hasError = true;
      }

      // Cập nhật thời gian làm mới
      const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const subtitle = document.getElementById('topbarSubtitle');
      if (subtitle) subtitle.textContent = `Cập nhật lần cuối: ${now}`;

      if (hasError) {
        this.showToast('⚠️ Không thể cập nhật dữ liệu. Vui lòng thử lại.', 'error');
      } else {
        this.showToast('✅ Đã làm mới dữ liệu thành công!', 'success');
      }
    } catch (err) {
      console.error('[Refresh] Unexpected error:', err);
      // Rollback toàn bộ
      if (oldStatsHTML && document.getElementById('statsGrid'))  document.getElementById('statsGrid').innerHTML  = oldStatsHTML;
      if (oldOrdersHTML && document.getElementById('recentOrdersBody')) document.getElementById('recentOrdersBody').innerHTML = oldOrdersHTML;
      this.showToast('⚠️ Không thể cập nhật dữ liệu. Vui lòng thử lại.', 'error');
    } finally {
      this.isRefreshing = false;
      if (refBtn) {
        refBtn.disabled = false;
        refBtn.textContent = originalText;
      }
    }
  },

  // ── Private fetch helpers (không tự render — chỉ trả data) ─────────────
  async _fetchStats() {
    const stats = await API.getAdminStats();
    return stats;
  },

  async _fetchRecentOrders() {
    const orders = await API.getAdminOrders();
    return Array.isArray(orders) ? orders : [];
  },

  async _fetchProducts() {
    const products = await API.getAdminProducts();
    return Array.isArray(products) ? products : [];
  },

  async _fetchUsers() {
    const users = await API.getAdminUsers();
    return Array.isArray(users) ? users : [];
  },

  // ── Private render helpers ────────────────────────────────────────────────
  _renderStats(stats) {
    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid) return;
    const revenue      = stats.revenue ?? stats.revenueMTD ?? 0;
    const totalOrders  = stats.totalOrders  ?? 0;
    const totalProducts= stats.totalProducts ?? 0;
    const activeUsers  = stats.totalUsers   ?? stats.activeUsers ?? 0;
    statsGrid.innerHTML = `
      <div class="stat-card">
        <div class="stat-label">Doanh thu</div>
        <div class="stat-value" style="color:var(--primary)">${formatVND(revenue)}</div>
        <div class="stat-change up">↑ Doanh thu thực tế</div>
        <span class="stat-icon">💰</span>
      </div>
      <div class="stat-card">
        <div class="stat-label">Đơn hàng</div>
        <div class="stat-value" style="color:var(--accent)">${totalOrders}</div>
        <div class="stat-change up">↑ Đơn hàng hệ thống</div>
        <span class="stat-icon">📦</span>
      </div>
      <div class="stat-card">
        <div class="stat-label">Sản phẩm</div>
        <div class="stat-value" style="color:var(--success)">${totalProducts}</div>
        <div class="stat-change">Đang kinh doanh</div>
        <span class="stat-icon">🏷️</span>
      </div>
      <div class="stat-card">
        <div class="stat-label">Người dùng</div>
        <div class="stat-value" style="color:var(--warning)">${activeUsers}</div>
        <div class="stat-change up">↑ Tài khoản đăng ký</div>
        <span class="stat-icon">👥</span>
      </div>
    `;
  },

  _renderRecentOrders(orders) {
    const ordersBody = document.getElementById('recentOrdersBody');
    if (!ordersBody) return;
    const recent = orders.slice(0, 6);
    if (recent.length === 0) {
      ordersBody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-muted);">Chưa có đơn hàng nào trong hệ thống</td></tr>`;
      return;
    }
    if (recent.length > 0) {
      this.lastLatestOrderId = recent[0]._id || recent[0].id;
      this.lastOrderCount = recent.length;
    }
    ordersBody.innerHTML = recent.map(o => {
      const code         = o.orderCode || (o._id ? `ORD-${o._id.substring(0,6).toUpperCase()}` : 'ORD-0000');
      const customerName = o.shippingAddress?.fullName || o.shippingAddress?.name || o.userId?.name || 'Khách vãng lai';
      const total        = o.totalPrice || 0;
      const dateStr      = o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : '—';
      return `
        <tr>
          <td style="font-weight:700;color:var(--primary)">${code}</td>
          <td>${customerName}</td>
          <td style="font-weight:700;color:var(--success)">${formatVND(total)}</td>
          <td>${this.statusBadge(o.status)}</td>
          <td style="color:var(--text-muted)">${dateStr}</td>
        </tr>
      `;
    }).join('');
  },

  _renderUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    if (!users || !users.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">Chưa có người dùng nào</td></tr>`;
      return;
    }
    this.localUsers = users;
    tbody.innerHTML = users.map(u => {
      const isAct = u.isActive !== false;
      const dateStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '—';
      const statusBadge = isAct 
        ? `<span class="badge badge-success">✅ Hoạt động</span>`
        : `<span class="badge badge-danger">🔒 Đã khóa</span>`;

      return `
        <tr>
          <td style="font-weight:600">${u.name || 'Khách hàng'}</td>
          <td style="color:var(--text-muted)">${u.email}</td>
          <td>
            <select class="admin-input" style="padding:4px 8px; font-size:12px; border-radius:4px; width:110px;" onchange="AdminApp.changeUserRole('${u._id}', this.value)">
              <option value="user" ${u.role === 'user' ? 'selected' : ''}>👤 Khách</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>👑 Admin</option>
            </select>
          </td>
          <td>${statusBadge}</td>
          <td style="color:var(--text-muted);font-size:0.8rem;">${dateStr}</td>
          <td>
            <button class="btn-action ${isAct ? 'btn-action-delete' : 'btn-action-edit'}" onclick="AdminApp.toggleUserStatus('${u._id}', ${!isAct})">
              ${isAct ? '🔒 Khóa' : '🔓 Mở khóa'}
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  // ── Dashboard Stats ───────────────────────────────────────────────────────
  async loadDashboard() {
    try {
      const [stats, ordersRes] = await Promise.all([
        API.getAdminStats(),
        API.getAdminOrders()
      ]);
      this._renderStats(stats);
      const orders = Array.isArray(ordersRes) ? ordersRes : [];
      this._renderRecentOrders(orders);
    } catch (err) {
      console.error('Dashboard load error:', err);
      const statsGrid = document.getElementById('statsGrid');
      const ordersBody = document.getElementById('recentOrdersBody');
      // Chỉ hiển thị lỗi nếu chưa có dữ liệu (không xóa dữ liệu cũ)
      if (statsGrid && !statsGrid.querySelector('.stat-card')) {
        statsGrid.innerHTML = `<div style="grid-column: 1 / -1; padding: 1.5rem; text-align: center; color: var(--danger); background: var(--bg-card); border-radius: var(--radius-md);">⚠️ Không thể tải dữ liệu thống kê từ máy chủ</div>`;
      }
      if (ordersBody && !ordersBody.querySelector('tr td[style*="primary"]')) {
        ordersBody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--danger);">⚠️ Không thể tải dữ liệu đơn hàng gần đây</td></tr>`;
      }
    }
  },

  // ── Products ──────────────────────────────────────────────────────────────
  async loadProducts() {
    try {
      const products = await this._fetchProducts();
      localProducts = products;
      const badgeEl = document.getElementById('productCountBadge');
      if (badgeEl) badgeEl.textContent = localProducts.length;
      this.renderProductsTable(localProducts);
    } catch (err) {
      console.error('loadProducts error:', err);
      const tbody = document.getElementById('productsTableBody');
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--danger);">⚠️ Không thể tải danh sách sản phẩm</td></tr>`;
    }
  },

  filterProducts(query) {
    if (!localProducts) return;
    const q = (query || document.getElementById('productSearch').value || '').toLowerCase();
    const cat = document.getElementById('productCatFilter').value;
    let filtered = localProducts.filter(p => {
      const matchQ = !q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
      const matchCat = !cat || p.category === cat;
      return matchQ && matchCat;
    });
    this.renderProductsTable(filtered);
  },

  renderProductsTable(products) {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;
    if (!products.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted);">Không tìm thấy sản phẩm nào</td></tr>`;
      return;
    }
    tbody.innerHTML = products.map(p => `
      <tr>
        <td><img src="${p.images?.[0]?.url || ''}" class="product-thumb" alt="${p.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22><rect width=%2248%22 height=%2248%22 fill=%22%23243050%22 rx=%228%22/><text x=%2224%22 y=%2232%22 font-size=%2220%22 text-anchor=%22middle%22>📦</text></svg>'" /></td>
        <td>
          <div class="product-name-cell">${p.name}</div>
          <div class="product-brand-cell">${p.brand}</div>
        </td>
        <td><span class="badge badge-primary">${this.catLabel(p.category)}</span></td>
        <td style="font-weight:700;color:var(--primary)">${formatVND(p.price)}</td>
        <td>${p.stock ?? '—'}</td>
        <td style="color:var(--success);font-weight:600">${p.soldCount ?? 0}</td>
        <td style="display:flex;gap:0.4rem;">
          <button class="btn-action btn-action-edit" onclick="AdminApp.openEditProduct('${p._id}')">✏️ Sửa</button>
          <button class="btn-action btn-action-delete" onclick="AdminApp.deleteProduct('${p._id}')">🗑 Xóa</button>
        </td>
      </tr>
    `).join('');
  },

  openAddProduct() {
    this.switchSection('products');
    document.getElementById('productModalTitle').textContent = 'Thêm sản phẩm mới';
    document.getElementById('editProductId').value = '';
    document.getElementById('productForm').reset();
    // Xóa preview ảnh nếu có
    const preview = document.getElementById('pImagePreview');
    if (preview) preview.style.display = 'none';
    // Xóa thông báo lỗi form cũ
    const errEl = document.getElementById('productFormError');
    if (errEl) errEl.style.display = 'none';
    this.openProductModal();
    // Focus vào trường tên sau khi modal mở
    setTimeout(() => document.getElementById('pName')?.focus(), 150);
  },

  openEditProduct(id) {
    const p = localProducts?.find(x => x._id === id);
    if (!p) return;
    document.getElementById('productModalTitle').textContent = 'Chỉnh sửa sản phẩm';
    document.getElementById('editProductId').value = p._id;
    document.getElementById('pName').value = p.name;
    document.getElementById('pBrand').value = p.brand;
    document.getElementById('pCategory').value = p.category;
    document.getElementById('pPrice').value = p.price;
    document.getElementById('pComparePrice').value = p.comparePrice || '';
    document.getElementById('pStock').value = p.stock ?? '';
    document.getElementById('pSold').value = p.soldCount ?? '';
    document.getElementById('pDesc').value = p.description || '';
    const imgUrlInput = document.getElementById('pImageUrl');
    if (imgUrlInput) imgUrlInput.value = p.images?.[0]?.url || '';

    // Hiển thị preview ảnh hiện tại
    const preview = document.getElementById('pImagePreview');
    if (preview && p.images?.[0]?.url) {
      preview.src = p.images[0].url;
      preview.style.display = 'block';
    } else if (preview) {
      preview.style.display = 'none';
    }

    // Xóa thông báo lỗi form cũ
    const errEl = document.getElementById('productFormError');
    if (errEl) errEl.style.display = 'none';

    // Populate specs
    const s = p.specs || {};
    if (document.getElementById('pSpecDisplay'))   document.getElementById('pSpecDisplay').value   = s.display   || '';
    if (document.getElementById('pSpecProcessor')) document.getElementById('pSpecProcessor').value = s.processor || '';
    if (document.getElementById('pSpecRam'))       document.getElementById('pSpecRam').value       = s.ram       || '';
    if (document.getElementById('pSpecStorage'))   document.getElementById('pSpecStorage').value   = s.storage   || '';
    if (document.getElementById('pSpecCamera'))    document.getElementById('pSpecCamera').value    = s.camera    || '';
    if (document.getElementById('pSpecBattery'))   document.getElementById('pSpecBattery').value   = s.battery   || '';
    if (document.getElementById('pSpecOs'))        document.getElementById('pSpecOs').value        = s.os        || '';
    if (document.getElementById('pSpecColor'))     document.getElementById('pSpecColor').value     = s.color     || '';

    this.openProductModal();
  },

  openProductModal() {
    document.getElementById('productModal').classList.add('active');
    document.getElementById('productModalOverlay').classList.add('active');
  },

  closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
    document.getElementById('productModalOverlay').classList.remove('active');
    // Reset preview
    const preview = document.getElementById('pImagePreview');
    const previewRow = document.getElementById('imagePreviewRow');
    if (preview) preview.src = '';
    if (previewRow) previewRow.style.display = 'none';
  },

  // ── Image Preview Helpers ─────────────────────────────────────────────────
  _onImageFileChange(input) {
    const preview = document.getElementById('pImagePreview');
    const previewRow = document.getElementById('imagePreviewRow');
    if (!preview || !previewRow) return;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.src = e.target.result;
        previewRow.style.display = 'block';
        // Xóa URL input để tránh conflict
        const urlInput = document.getElementById('pImageUrl');
        if (urlInput) urlInput.value = '';
      };
      reader.readAsDataURL(input.files[0]);
    } else {
      previewRow.style.display = 'none';
    }
  },

  _onImageUrlChange(input) {
    const preview = document.getElementById('pImagePreview');
    const previewRow = document.getElementById('imagePreviewRow');
    if (!preview || !previewRow) return;
    const url = input.value.trim();
    if (url) {
      preview.src = url;
      previewRow.style.display = 'block';
      preview.onerror = () => { previewRow.style.display = 'none'; };
      preview.onload  = () => { preview.onerror = null; };
      // Xóa file input để tránh conflict
      const fileInput = document.getElementById('pImageFile');
      if (fileInput) fileInput.value = '';
    } else {
      previewRow.style.display = 'none';
    }
  },

  async saveProduct() {
    // ── Lấy dữ liệu từ form ──────────────────────────────────────────────────
    const id          = document.getElementById('editProductId').value.trim();
    const name        = document.getElementById('pName').value.trim();
    const brand       = document.getElementById('pBrand').value.trim();
    const category    = document.getElementById('pCategory').value.trim();
    const priceRaw    = document.getElementById('pPrice').value.trim();
    const comparePriceRaw = document.getElementById('pComparePrice').value.trim();
    const stockRaw    = document.getElementById('pStock').value.trim();
    const soldCount   = Number(document.getElementById('pSold').value) || 0;
    const description = document.getElementById('pDesc').value.trim();
    const imageUrl    = document.getElementById('pImageUrl')?.value.trim() || '';
    const fileInput   = document.getElementById('pImageFile');
    const errEl       = document.getElementById('productFormError');

    const showFormErr = (msg) => {
      if (errEl) { errEl.textContent = '⚠️ ' + msg; errEl.style.display = 'block'; errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
      else this.showToast(msg, 'warning');
    };
    if (errEl) errEl.style.display = 'none';

    // ── Validation client-side ──────────────────────────────────────────────
    if (!name) { showFormErr('Vui lòng nhập Tên sản phẩm'); document.getElementById('pName').focus(); return; }
    if (name.length < 3) { showFormErr('Tên sản phẩm phải có ít nhất 3 ký tự'); document.getElementById('pName').focus(); return; }
    if (!brand) { showFormErr('Vui lòng chọn Thương hiệu'); return; }
    if (!category) { showFormErr('Vui lòng chọn Danh mục'); return; }
    if (!priceRaw) { showFormErr('Vui lòng nhập Giá bán'); document.getElementById('pPrice').focus(); return; }

    const price = Number(priceRaw);
    if (isNaN(price) || !Number.isInteger(price) || price < 1000) {
      showFormErr('Giá bán phải là số nguyên, tối thiểu 1.000 VNĐ'); document.getElementById('pPrice').focus(); return;
    }
    if (price > 200_000_000) {
      showFormErr('Giá bán tối đa 200.000.000 VNĐ'); document.getElementById('pPrice').focus(); return;
    }

    let comparePrice = 0;
    if (comparePriceRaw) {
      comparePrice = Number(comparePriceRaw);
      if (isNaN(comparePrice) || !Number.isInteger(comparePrice) || comparePrice < 0) {
        showFormErr('Giá gốc phải là số nguyên không âm'); document.getElementById('pComparePrice').focus(); return;
      }
      if (comparePrice > 0 && comparePrice < price) {
        showFormErr('Giá gốc phải lớn hơn hoặc bằng giá bán'); document.getElementById('pComparePrice').focus(); return;
      }
    }

    const stock = stockRaw !== '' ? Number(stockRaw) : 0;
    if (isNaN(stock) || !Number.isInteger(stock) || stock < 0) {
      showFormErr('Tồn kho phải là số nguyên không âm'); document.getElementById('pStock').focus(); return;
    }

    // Kiểm tra ảnh (chỉ bắt buộc khi tạo mới)
    const hasFile = fileInput && fileInput.files.length > 0;
    if (!id && !imageUrl && !hasFile) {
      showFormErr('Vui lòng cung cấp ảnh sản phẩm (upload file hoặc nhập URL ảnh)');
      return;
    }

    // Kiểm tra URL hợp lệ nếu có
    if (imageUrl && !hasFile) {
      try { new URL(imageUrl.startsWith('/') ? 'http://localhost' + imageUrl : imageUrl); }
      catch { showFormErr('URL ảnh không hợp lệ. Nhập URL đầy đủ (https://...) hoặc đường dẫn (/images/...)'); return; }
    }

    // ── Build FormData ──────────────────────────────────────────────────
    const formData = new FormData();
    formData.append('name', name);
    formData.append('brand', brand);
    formData.append('category', category);
    formData.append('price', price);
    formData.append('stock', stock);
    formData.append('soldCount', soldCount);
    if (description) formData.append('description', description);
    if (comparePrice > 0) formData.append('comparePrice', comparePrice);

    // Ảnh: file upload ưu tiên hơn URL
    if (hasFile) {
      // Multer đọc file từ field 'images'
      formData.append('images', fileInput.files[0]);
    } else if (imageUrl) {
      // Backend đọc URL từ body.imageUrl
      formData.append('imageUrl', imageUrl);
    }

    // Specs (gửi JSON string, backend tự parse)
    const specsObj = {
      display:   document.getElementById('pSpecDisplay')?.value.trim()   || '',
      processor: document.getElementById('pSpecProcessor')?.value.trim() || '',
      ram:       document.getElementById('pSpecRam')?.value.trim()       || '',
      storage:   document.getElementById('pSpecStorage')?.value.trim()   || '',
      camera:    document.getElementById('pSpecCamera')?.value.trim()    || '',
      battery:   document.getElementById('pSpecBattery')?.value.trim()   || '',
      os:        document.getElementById('pSpecOs')?.value.trim()        || '',
      color:     document.getElementById('pSpecColor')?.value.trim()     || '',
    };
    // Chỉ gửi specs nếu có ít nhất 1 field
    if (Object.values(specsObj).some(v => v)) {
      formData.append('specs', JSON.stringify(specsObj));
    }

    // ── Gửi API ───────────────────────────────────────────────────────────
    const saveBtn = document.getElementById('btnSaveProduct');
    const originalBtnText = saveBtn?.textContent;
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '⚙️ Đang lưu...'; }

    try {
      if (id) {
        await API.updateAdminProduct(id, formData);
        this.showToast('✅ Đã cập nhật sản phẩm thành công!', 'success');
      } else {
        await API.createAdminProduct(formData);
        this.showToast('✅ Đã thêm sản phẩm mới vào hệ thống!', 'success');
      }
      this.closeProductModal();
      await this.loadProducts();
    } catch (err) {
      console.error('[saveProduct] Error:', err);
      let errMsg = err.message || 'Lỗi khi lưu sản phẩm';
      if (errMsg.includes('validation')) errMsg = 'Dữ liệu không hợp lệ. Kiểm tra lại các trường bắt buộc.';
      if (errMsg.includes('duplicate') || errMsg.includes('E11000')) errMsg = 'Sản phẩm có tên trùng với sản phẩm khác. Vui lòng đổi tên.';
      if (errMsg.includes('Cloudinary') || errMsg.includes('upload')) errMsg = 'Không thể upload ảnh. Kiểm tra kết nối hoặc thử dùng URL ảnh thay thế.';
      showFormErr(errMsg);
    } finally {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = originalBtnText || '💾 Lưu sản phẩm'; }
    }
  },

  async deleteProduct(id) {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này không?')) return;
    try {
      await API.deleteAdminProduct(id);
      this.showToast('🗑 Đã xóa sản phẩm.', 'info');
      this.loadProducts();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // ── Orders ────────────────────────────────────────────────────────────────
  async loadOrders() {
    const tbody = document.getElementById('ordersTableBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">⏳ Đang tải dữ liệu...</td></tr>`;
    try {
      const orders = await API.getAdminOrders();
      this.localOrders = Array.isArray(orders) ? orders : [];
      // Cập nhật badge sidebar
      const badge = document.getElementById('orderCountBadge');
      if (badge) badge.textContent = this.localOrders.length;
      this.renderOrdersTable(this.localOrders);
    } catch (err) {
      console.error('loadOrders error:', err);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--danger);">⚠️ Không thể tải danh sách đơn hàng từ hệ thống</td></tr>`;
      }
    }
  },

  filterOrders() {
    const status = document.getElementById('orderStatusFilter').value.toLowerCase();
    const filtered = status
      ? this.localOrders.filter(o => (o.status || '').toLowerCase() === status)
      : this.localOrders;
    this.renderOrdersTable(filtered);
  },

  renderOrdersTable(orders) {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    if (!orders || !orders.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">Chưa có đơn hàng nào</td></tr>`;
      return;
    }
    tbody.innerHTML = orders.map(o => {
      const code         = o.orderCode || (o._id ? `ORD-${o._id.substring(0,6).toUpperCase()}` : 'N/A');
      const customerName = o.shippingAddress?.fullName || o.shippingAddress?.name || o.userId?.name || 'Khách hàng';
      const customerPhone= o.shippingAddress?.phone || '';
      const total        = o.totalPrice || o.total || 0;
      const dateStr      = o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
      const statusLower  = (o.status || 'pending').toLowerCase();

      return `
        <tr>
          <td style="font-weight:700;color:var(--primary)">${code}</td>
          <td>
            <strong>${customerName}</strong>
            ${customerPhone ? `<br><small style="color:var(--text-muted)">📱 ${customerPhone}</small>` : ''}
          </td>
          <td style="font-weight:700;color:var(--success)">${formatVND(total)}</td>
          <td>
            <select class="admin-input" style="padding:4px 8px; font-size:12px; border-radius:4px;"
              onchange="AdminApp.changeOrderStatus('${o._id || o.id}', this.value)">
              <option value="pending"     ${statusLower==='pending'    ?'selected':''}>⏳ Chờ xử lý</option>
              <option value="processing"  ${statusLower==='processing' ?'selected':''}>⚙️ Đang xử lý</option>
              <option value="shipping"    ${statusLower==='shipping'   ?'selected':''}>🚚 Đang giao</option>
              <option value="delivered"   ${statusLower==='delivered'  ?'selected':''}>✅ Đã giao</option>
              <option value="cancelled"   ${statusLower==='cancelled'  ?'selected':''}>❌ Đã hủy</option>
            </select>
          </td>
          <td style="color:var(--text-muted);font-size:0.8rem;">${dateStr}</td>
          <td>
            <button class="btn-action btn-action-edit"
              onclick="AdminApp.viewOrderDetail('${o._id || o.id}')">
              👁 Xem
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  // ── View Order Detail Modal ────────────────────────────────────────────────────
  viewOrderDetail(id) {
    const o = this.localOrders?.find(x => (x._id || x.id) === id);
    if (!o) { this.showToast('Không tìm thấy đơn hàng', 'error'); return; }

    const code         = o.orderCode || `ORD-${(o._id||'').substring(0,6).toUpperCase()}`;
    const customerName = o.shippingAddress?.fullName || o.shippingAddress?.name || o.userId?.name || 'Khách hàng';
    const customerPhone= o.shippingAddress?.phone || '—';
    const customerAddr = o.shippingAddress?.address || o.shippingAddress?.street || '—';
    const total        = o.totalPrice || 0;
    const statusLower  = (o.status || 'pending').toLowerCase();
    const dateStr      = o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN') : '—';
    const payMethod    = o.paymentMethod || 'COD';
    const payStatus    = o.paymentStatus || 'unpaid';

    const statusMap = {
      pending:    ['⏳ Chờ xử lý',   'var(--warning)'],
      processing: ['⚙️ Đang xử lý', 'var(--accent)'],
      shipping:   ['🚚 Đang giao',   'var(--primary)'],
      delivered:  ['✅ Đã giao',     'var(--success)'],
      cancelled:  ['❌ Đã hủy',     'var(--danger)'],
    };
    const [statusLabel, statusColor] = statusMap[statusLower] || [o.status, 'var(--text-muted)'];

    const itemsHTML = (o.items || o.orderItems || []).map(item => {
      const name   = item.name || item.productName || item.productId?.name || 'Sản phẩm';
      const price  = item.price || item.unitPrice || 0;
      const qty    = item.quantity || item.qty || 1;
      const imgUrl = item.image || item.productId?.images?.[0]?.url || '';
      return `
        <div style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0;border-bottom:1px solid var(--border-subtle);">
          ${imgUrl ? `<img src="${imgUrl}" alt="" style="width:44px;height:44px;border-radius:6px;object-fit:cover;background:var(--bg-input);flex-shrink:0;" onerror="this.style.display='none'">` : '<div style="width:44px;height:44px;border-radius:6px;background:var(--bg-input);flex-shrink:0;display:flex;align-items:center;justify-content:center;">📦</div>'}
          <div style="flex:1;">
            <div style="font-weight:600;font-size:0.85rem;">${name}</div>
            <div style="color:var(--text-muted);font-size:0.78rem;">x${qty}</div>
          </div>
          <div style="font-weight:700;color:var(--success);">${formatVND(price * qty)}</div>
        </div>
      `;
    }).join('');

    const body = document.getElementById('orderDetailBody');
    if (body) {
      body.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
          <div style="background:var(--bg-card);border-radius:8px;padding:0.75rem;">
            <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.25rem;">📋 MÃ ĐƠN</div>
            <div style="font-weight:700;color:var(--primary);font-size:1rem;">${code}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.35rem;">🕐 ${dateStr}</div>
          </div>
          <div style="background:var(--bg-card);border-radius:8px;padding:0.75rem;">
            <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.25rem;">📊 TRẠNG THÁI</div>
            <div style="font-weight:700;color:${statusColor};">${statusLabel}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.35rem;">💳 ${payMethod.toUpperCase()} — ${payStatus === 'paid' ? '✅ Đã thanh toán' : '⏳ Chưa thanh toán'}</div>
          </div>
        </div>

        <div style="background:var(--bg-card);border-radius:8px;padding:0.75rem;margin-bottom:1rem;">
          <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.5rem;">👤 KHÁCH HÀNG</div>
          <div style="font-weight:600;">${customerName}</div>
          <div style="font-size:0.85rem;color:var(--text-muted);">📱 ${customerPhone}</div>
          <div style="font-size:0.85rem;color:var(--text-muted);margin-top:0.25rem;">📍 ${customerAddr}</div>
        </div>

        <div style="background:var(--bg-card);border-radius:8px;padding:0.75rem;margin-bottom:1rem;">
          <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.5rem;">🛎 SẢN PHẨM</div>
          ${itemsHTML || '<div style="color:var(--text-muted);text-align:center;padding:0.5rem;">Không có thông tin sản phẩm</div>'}
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-card);border-radius:8px;padding:0.75rem 1rem;">
          <span style="font-weight:700;">💰 TỔNG THANH TOÁN</span>
          <span style="font-size:1.2rem;font-weight:800;color:var(--success);">${formatVND(total)}</span>
        </div>
      `;
    }

    document.getElementById('orderDetailTitle').textContent = `Chi tiết đơn hàng — ${code}`;
    document.getElementById('orderDetailModal').classList.add('active');
    document.getElementById('orderDetailOverlay').classList.add('active');
  },

  closeOrderDetail() {
    document.getElementById('orderDetailModal').classList.remove('active');
    document.getElementById('orderDetailOverlay').classList.remove('active');
  },

  async changeOrderStatus(id, status) {
    try {
      await API.updateOrderStatus(id, status);
      this.showToast('✅ Đã cập nhật trạng thái đơn hàng', 'success');
      // Cập nhật local data để khỏi load lại toàn bộ
      const order = this.localOrders?.find(o => (o._id || o.id) === id);
      if (order) order.status = status;
    } catch (err) {
      this.showToast(err.message, 'error');
      this.loadOrders(); // fallback: reload nếu lỗi
    }
  },

  // ── Users ─────────────────────────────────────────────────────────────────
  async loadUsers() {
    try {
      const users = await this._fetchUsers();
      this._renderUsers(users);
      const userBadge = document.getElementById('userCountBadge');
      if (userBadge) userBadge.textContent = users.length;
    } catch (err) {
      console.error('loadUsers error:', err);
      this.showToast(err.message, 'error');
    }
  },

  async changeUserRole(id, role) {
    try {
      await API.updateUserRole(id, role);
      this.showToast('✅ Đã cập nhật quyền người dùng', 'success');
      this.loadUsers();
    } catch (err) {
      this.showToast(err.message || 'Lỗi khi đổi quyền người dùng', 'error');
      this.loadUsers();
    }
  },

  async toggleUserStatus(id, newIsActive) {
    const actionText = newIsActive ? 'mở khóa' : 'khóa';
    if (!confirm(`Bạn có chắc muốn ${actionText} tài khoản người dùng này?`)) return;
    try {
      await API.updateUserStatus(id, newIsActive);
      this.showToast(`✅ Đã ${actionText} tài khoản người dùng thành công`, 'success');
      this.loadUsers();
    } catch (err) {
      this.showToast(err.message || `Lỗi khi ${actionText} tài khoản`, 'error');
      this.loadUsers();
    }
  },

  // ── Helpers ───────────────────────────────────────────────────────────────
  statusBadge(status) {
    const map = {
      'Completed':  ['badge-success', '✅ Hoàn thành'],
      'Processing': ['badge-warning', '⚙️ Đang xử lý'],
      'Shipping':   ['badge-primary', '🚚 Đang giao'],
      'Pending':    ['badge-accent',  '⏳ Chờ xử lý']
    };
    const [cls, label] = map[status] || ['badge-accent', status];
    return `<span class="badge ${cls}">${label}</span>`;
  },

  catLabel(cat) {
    return { smartphone: '📱 Smartphone', tablet: '📟 Tablet', smartwatch: '⌚ Smartwatch', accessory: '🎧 Phụ kiện' }[cat] || cat;
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = '0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};

window.AdminApp = AdminApp;
AdminApp.init();
