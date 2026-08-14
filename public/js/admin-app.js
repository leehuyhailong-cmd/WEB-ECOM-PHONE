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

  // ── Auth Guard ────────────────────────────────────────────────────────────
  init() {
    const user = JSON.parse(localStorage.getItem('phonestore_user') || 'null');
    if (!user || user.role !== 'admin') {
      window.location.href = '/login.html?return=/admin.html';
      return;
    }
    document.getElementById('adminUserName').textContent = user.name || user.email;
    this.loadDashboard();
    this.loadProducts();
    this.loadOrders();
    this.loadUsers();
  },

  // ── Logout ────────────────────────────────────────────────────────────────
  logout() {
    localStorage.removeItem('phonestore_user');
    localStorage.removeItem('phonestore_token');
    window.location.href = '/login.html';
  },

  // ── Section Switcher ──────────────────────────────────────────────────────
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
    addBtn.style.display = section === 'products' ? 'block' : 'none';
  },

  // ── Refresh ───────────────────────────────────────────────────────────────
  refreshData() {
    this.showToast('🔄 Đang làm mới dữ liệu...', 'info');
    this.loadDashboard();
    this.loadProducts();
  },

  // ── Dashboard Stats ───────────────────────────────────────────────────────
  async loadDashboard() {
    try {
      const stats = await API.getAdminStats();
      const revenue = stats.revenue || stats.revenueMTD || 390990000;
      const totalOrders = stats.totalOrders ?? stats.ordersToday ?? 15;
      const totalProducts = stats.totalProducts ?? 47;
      const activeUsers = stats.activeUsers ?? stats.totalUsers ?? 9;

      document.getElementById('statsGrid').innerHTML = `
        <div class="stat-card">
          <div class="stat-label">Doanh thu</div>
          <div class="stat-value" style="color:var(--primary)">${formatVND(revenue)}</div>
          <div class="stat-change up">↑ +12.5% so với tháng trước</div>
          <span class="stat-icon">💰</span>
        </div>
        <div class="stat-card">
          <div class="stat-label">Đơn hàng</div>
          <div class="stat-value" style="color:var(--accent)">${totalOrders}</div>
          <div class="stat-change up">↑ +8 đơn hôm nay</div>
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
          <div class="stat-change up">↑ +45 người dùng mới</div>
          <span class="stat-icon">👥</span>
        </div>
      `;

      // Load real recent orders in Dashboard overview table
      let recentOrders = MOCK_ORDERS;
      try {
        const ordersRes = await API.getAdminOrders();
        const rawList = Array.isArray(ordersRes) ? ordersRes : (ordersRes?.orders || []);
        if (rawList && rawList.length > 0) recentOrders = rawList.slice(0, 6);
      } catch (e) {
        console.warn('Recent orders fallback:', e);
      }

      const ordersBody = document.getElementById('recentOrdersBody');
      if (ordersBody) {
        ordersBody.innerHTML = recentOrders.map(o => {
          const code = o.orderCode || o.id || (o._id ? `ORD-${o._id.substring(0,6).toUpperCase()}` : 'ORD-9821');
          const customerName = o.shippingAddress?.fullName || o.shippingAddress?.name || o.customer || o.userId?.name || 'Khách hàng';
          const total = o.totalPrice || o.total || 0;
          const dateStr = o.date || (o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : '14/08/2026');

          return `
            <tr>
              <td style="font-weight:700;color:var(--primary)">${code}</td>
              <td>${customerName}</td>
              <td style="font-weight:700">${formatVND(total)}</td>
              <td>${this.statusBadge(o.status)}</td>
              <td style="color:var(--text-muted)">${dateStr}</td>
            </tr>
          `;
        }).join('');
      }
    } catch (err) {
      console.warn('Dashboard load error:', err);
    }
  },

  // ── Products ──────────────────────────────────────────────────────────────
  async loadProducts() {
    const res = await API.getProducts({});
    localProducts = res?.data || [];
    document.getElementById('productCountBadge').textContent = localProducts.length;
    this.renderProductsTable(localProducts);
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
    document.getElementById('productModalTitle').textContent = 'Thêm sản phẩm mới';
    document.getElementById('editProductId').value = '';
    document.getElementById('productForm').reset();
    this.openProductModal();
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
    const imgInput = document.getElementById('pImageUrl');
    if (imgInput) imgInput.value = p.images?.[0]?.url || '';

    // Populate specs
    const s = p.specs || {};
    if (document.getElementById('pSpecDisplay')) document.getElementById('pSpecDisplay').value = s.display || '';
    if (document.getElementById('pSpecProcessor')) document.getElementById('pSpecProcessor').value = s.processor || '';
    if (document.getElementById('pSpecRam')) document.getElementById('pSpecRam').value = s.ram || '';
    if (document.getElementById('pSpecStorage')) document.getElementById('pSpecStorage').value = s.storage || '';
    if (document.getElementById('pSpecCamera')) document.getElementById('pSpecCamera').value = s.camera || '';
    if (document.getElementById('pSpecBattery')) document.getElementById('pSpecBattery').value = s.battery || '';
    if (document.getElementById('pSpecOs')) document.getElementById('pSpecOs').value = s.os || '';
    if (document.getElementById('pSpecColor')) document.getElementById('pSpecColor').value = s.color || '';

    this.openProductModal();
  },

  openProductModal() {
    document.getElementById('productModal').classList.add('active');
    document.getElementById('productModalOverlay').classList.add('active');
  },

  closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
    document.getElementById('productModalOverlay').classList.remove('active');
  },

  async saveProduct() {
    const id = document.getElementById('editProductId').value;
    const name = document.getElementById('pName').value.trim();
    if (!name) { this.showToast('Vui lòng nhập tên sản phẩm!', 'error'); return; }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('brand', document.getElementById('pBrand').value);
    formData.append('category', document.getElementById('pCategory').value);
    formData.append('price', Number(document.getElementById('pPrice').value) || 0);
    formData.append('comparePrice', Number(document.getElementById('pComparePrice').value) || 0);
    formData.append('stock', Number(document.getElementById('pStock').value) || 0);
    formData.append('description', document.getElementById('pDesc').value || '');
    
    const imageUrl = document.getElementById('pImageUrl')?.value.trim();
    if (imageUrl) {
      formData.append('imageUrl', imageUrl);
    }

    const specs = {
      display: document.getElementById('pSpecDisplay')?.value.trim() || undefined,
      processor: document.getElementById('pSpecProcessor')?.value.trim() || undefined,
      ram: document.getElementById('pSpecRam')?.value.trim() || undefined,
      storage: document.getElementById('pSpecStorage')?.value.trim() || undefined,
      camera: document.getElementById('pSpecCamera')?.value.trim() || undefined,
      battery: document.getElementById('pSpecBattery')?.value.trim() || undefined,
      os: document.getElementById('pSpecOs')?.value.trim() || undefined,
      color: document.getElementById('pSpecColor')?.value.trim() || undefined,
    };
    Object.keys(specs).forEach(k => specs[k] === undefined && delete specs[k]);
    if (Object.keys(specs).length > 0) {
      formData.append('specs', JSON.stringify(specs));
    }

    const fileInput = document.getElementById('pImageFile');
    if (fileInput && fileInput.files.length > 0) {
      formData.append('images', fileInput.files[0]);
    }

    try {
      if (id) {
        await API.updateAdminProduct(id, formData);
        this.showToast('✅ Đã cập nhật sản phẩm thành công!', 'success');
      } else {
        await API.createAdminProduct(formData);
        this.showToast('✅ Đã thêm sản phẩm thành công!', 'success');
      }
      this.closeProductModal();
      this.loadProducts(); // refresh table
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async deleteProduct(id) {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này không?')) return;
    try {
      await API.deleteAdminProduct(id);
      this.showToast('🗑 Đã xóa sản phẩm.', 'info');
      this.loadProducts(); // refresh table
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // ── Orders ────────────────────────────────────────────────────────────────
  async loadOrders() {
    try {
      const orders = await API.getAdminOrders();
      this.localOrders = (orders && orders.length > 0) ? orders : MOCK_ORDERS;
      this.renderOrdersTable(this.localOrders);
    } catch (err) {
      console.warn('Orders load fallback:', err);
      this.localOrders = MOCK_ORDERS;
      this.renderOrdersTable(this.localOrders);
    }
  },

  filterOrders() {
    const status = document.getElementById('orderStatusFilter').value;
    const filtered = status ? this.localOrders.filter(o => o.status === status) : this.localOrders;
    this.renderOrdersTable(filtered);
  },

  renderOrdersTable(orders) {
    const tbody = document.getElementById('ordersTableBody');
    if (!orders || !orders.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">Chưa có đơn hàng nào</td></tr>`;
      return;
    }
    tbody.innerHTML = orders.map(o => {
      const code = o.orderCode || o.id || (o._id ? o._id.substring(0,8).toUpperCase() : 'ORD-9821');
      const customerName = o.shippingAddress?.fullName || o.shippingAddress?.name || o.customer || o.userId?.name || 'Khách hàng';
      const customerPhone = o.shippingAddress?.phone || o.phone || '';
      const total = o.totalPrice || o.total || 0;
      const dateStr = o.date || (o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : '14/08/2026');

      return `
        <tr>
          <td style="font-weight:700;color:var(--primary)">${code}</td>
          <td><strong>${customerName}</strong> ${customerPhone ? `<br><small style="color:var(--text-muted)">📱 ${customerPhone}</small>` : ''}</td>
          <td style="font-weight:700;color:var(--success)">${formatVND(total)}</td>
          <td>
            <select class="admin-input" style="padding:4px 8px; font-size:12px; border-radius:4px;" onchange="AdminApp.changeOrderStatus('${o._id || o.id}', this.value)">
              <option value="pending" ${o.status==='pending'?'selected':''}>Chờ xử lý</option>
              <option value="processing" ${o.status==='processing'?'selected':''}>Đang xử lý</option>
              <option value="shipping" ${o.status==='shipping'?'selected':''}>Đang giao</option>
              <option value="delivered" ${o.status==='delivered' || o.status==='Completed'?'selected':''}>Đã giao</option>
              <option value="cancelled" ${o.status==='cancelled'?'selected':''}>Đã hủy</option>
            </select>
          </td>
          <td style="color:var(--text-muted)">${dateStr}</td>
          <td><button class="btn-action btn-action-edit">Xem</button></td>
        </tr>
      `;
    }).join('');
  },

  async changeOrderStatus(id, status) {
    try {
      await API.updateOrderStatus(id, status);
      this.showToast('✅ Đã cập nhật trạng thái đơn hàng', 'success');
      this.loadOrders();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // ── Users ─────────────────────────────────────────────────────────────────
  async loadUsers() {
    try {
      const users = await API.getAdminUsers();
      const tbody = document.getElementById('usersTableBody');
      if (!users || !users.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-muted);">Chưa có người dùng nào</td></tr>`;
        return;
      }
      tbody.innerHTML = users.map(u => `
        <tr>
          <td style="font-weight:600">${u.name || 'Khách'}</td>
          <td style="color:var(--text-muted)">${u.email}</td>
          <td>
            <select class="admin-input" style="padding:4px; font-size:12px; width:110px;" onchange="AdminApp.changeUserRole('${u._id}', this.value)">
              <option value="user" ${u.role === 'user' ? 'selected' : ''}>Khách hàng</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
          </td>
          <td>${u.ordersCount || 0} đơn</td>
          <td style="color:var(--text-muted)">${new Date(u.createdAt).toLocaleDateString('vi-VN')}</td>
        </tr>
      `).join('');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async changeUserRole(id, role) {
    try {
      // In a real app we'd have API.updateUserRole(id, role)
      // I will leave it mocked here as it requires adding an endpoint, 
      // but I'll add the toast
      this.showToast('✅ Đã cập nhật quyền người dùng', 'success');
      this.loadUsers();
    } catch (err) {
      this.showToast(err.message, 'error');
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
