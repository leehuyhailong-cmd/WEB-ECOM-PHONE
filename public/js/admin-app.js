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
    const stats = await API.getAdminStats();
    document.getElementById('statsGrid').innerHTML = `
      <div class="stat-card">
        <div class="stat-label">Doanh thu</div>
        <div class="stat-value" style="color:var(--primary)">${formatVND(stats.revenue)}</div>
        <div class="stat-change up">↑ +12.5% so với tháng trước</div>
        <span class="stat-icon">💰</span>
      </div>
      <div class="stat-card">
        <div class="stat-label">Đơn hàng</div>
        <div class="stat-value" style="color:var(--accent)">${stats.totalOrders}</div>
        <div class="stat-change up">↑ +8 đơn hôm nay</div>
        <span class="stat-icon">📦</span>
      </div>
      <div class="stat-card">
        <div class="stat-label">Sản phẩm</div>
        <div class="stat-value" style="color:var(--success)">${stats.totalProducts}</div>
        <div class="stat-change">Đang kinh doanh</div>
        <span class="stat-icon">🏷️</span>
      </div>
      <div class="stat-card">
        <div class="stat-label">Người dùng</div>
        <div class="stat-value" style="color:var(--warning)">${stats.activeUsers.toLocaleString()}</div>
        <div class="stat-change up">↑ +45 người dùng mới</div>
        <span class="stat-icon">👥</span>
      </div>
    `;

    // Recent orders table
    document.getElementById('recentOrdersBody').innerHTML = stats.recentOrders.map(o => `
      <tr>
        <td style="font-weight:700;color:var(--primary)">${o.id}</td>
        <td>${o.customer}</td>
        <td style="font-weight:700">${formatVND(o.total)}</td>
        <td>${this.statusBadge(o.status)}</td>
        <td style="color:var(--text-muted)">${o.date}</td>
      </tr>
    `).join('');
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
    document.getElementById('pImage').value = p.images?.[0]?.url || '';
    document.getElementById('pStock').value = p.stock ?? '';
    document.getElementById('pSold').value = p.soldCount ?? '';
    document.getElementById('pDesc').value = p.description || '';
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

  saveProduct() {
    const id = document.getElementById('editProductId').value;
    const name = document.getElementById('pName').value.trim();
    if (!name) { this.showToast('Vui lòng nhập tên sản phẩm!', 'error'); return; }

    const productData = {
      _id: id || 'local_' + Date.now(),
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      brand: document.getElementById('pBrand').value,
      category: document.getElementById('pCategory').value,
      price: Number(document.getElementById('pPrice').value) || 0,
      comparePrice: Number(document.getElementById('pComparePrice').value) || 0,
      stock: Number(document.getElementById('pStock').value) || 0,
      soldCount: Number(document.getElementById('pSold').value) || 0,
      avgRating: 5.0,
      reviewCount: 0,
      isFeatured: false,
      images: [{ url: document.getElementById('pImage').value || '', isPrimary: true }],
      description: document.getElementById('pDesc').value || ''
    };

    if (id && localProducts) {
      // Edit
      const idx = localProducts.findIndex(p => p._id === id);
      if (idx > -1) localProducts[idx] = { ...localProducts[idx], ...productData };
      this.showToast('✅ Đã cập nhật sản phẩm thành công!', 'success');
    } else {
      // Add
      if (!localProducts) localProducts = [];
      localProducts.unshift(productData);
      this.showToast('✅ Đã thêm sản phẩm mới thành công!', 'success');
    }

    this.renderProductsTable(localProducts);
    document.getElementById('productCountBadge').textContent = localProducts.length;
    this.closeProductModal();
  },

  deleteProduct(id) {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này không?')) return;
    localProducts = localProducts.filter(p => p._id !== id);
    this.renderProductsTable(localProducts);
    document.getElementById('productCountBadge').textContent = localProducts.length;
    this.showToast('🗑 Đã xóa sản phẩm.', 'info');
  },

  // ── Orders ────────────────────────────────────────────────────────────────
  loadOrders() {
    this.renderOrdersTable(MOCK_ORDERS);
  },

  filterOrders() {
    const status = document.getElementById('orderStatusFilter').value;
    const filtered = status ? MOCK_ORDERS.filter(o => o.status === status) : MOCK_ORDERS;
    this.renderOrdersTable(filtered);
  },

  renderOrdersTable(orders) {
    document.getElementById('ordersTableBody').innerHTML = orders.map(o => `
      <tr>
        <td style="font-weight:700;color:var(--primary)">${o.id}</td>
        <td>${o.customer}</td>
        <td style="font-weight:700">${formatVND(o.total)}</td>
        <td>${this.statusBadge(o.status)}</td>
        <td style="color:var(--text-muted)">${o.date}</td>
        <td><button class="btn-action btn-action-edit">Xem chi tiết</button></td>
      </tr>
    `).join('');
  },

  // ── Users ─────────────────────────────────────────────────────────────────
  loadUsers() {
    document.getElementById('usersTableBody').innerHTML = MOCK_USERS.map(u => `
      <tr>
        <td style="font-weight:600">${u.name}</td>
        <td style="color:var(--text-muted)">${u.email}</td>
        <td>${u.role === 'admin'
          ? '<span class="badge badge-accent">Admin</span>'
          : '<span class="badge badge-primary">Khách hàng</span>'}</td>
        <td>${u.orders} đơn</td>
        <td style="color:var(--text-muted)">${u.joined}</td>
      </tr>
    `).join('');
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
