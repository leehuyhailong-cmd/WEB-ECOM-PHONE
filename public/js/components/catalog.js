/**
 * Catalog Component
 * Handles product grid, filters, sorting, and pagination
 */

import { API } from '../api.js';

export const CatalogComponent = {
  state: {
    category: 'all',
    brand: [],
    search: '',
    minPrice: '',
    maxPrice: '',
    sort: 'price_desc',
    products: [],
    total: 0
  },

  formatVND(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  },

  async init(appStore) {
    this.appStore = appStore;
    this.bindEvents();
    await this.fetchAndRender();
  },

  bindEvents() {
    // Search bar input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      let timer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          this.state.search = e.target.value.trim();
          this.fetchAndRender();
        }, 300);
      });
    }

    // Category navigation buttons
    document.querySelectorAll('.cat-item button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.cat-item button').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.state.category = e.currentTarget.dataset.cat || 'all';
        this.fetchAndRender();
      });
    });

    // Sort selector
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.state.sort = e.target.value;
        this.fetchAndRender();
      });
    }

    // Brand filter checkboxes
    document.querySelectorAll('.brand-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        const checked = Array.from(document.querySelectorAll('.brand-checkbox:checked')).map(c => c.value);
        this.state.brand = checked;
        this.fetchAndRender();
      });
    });

    // Price filter submit
    const applyPriceBtn = document.getElementById('applyPriceBtn');
    if (applyPriceBtn) {
      applyPriceBtn.addEventListener('click', () => {
        this.state.minPrice = document.getElementById('minPriceInput').value;
        this.state.maxPrice = document.getElementById('maxPriceInput').value;
        this.fetchAndRender();
      });
    }
  },

  async fetchAndRender() {
    const gridEl = document.getElementById('productsGrid');
    const resultCountEl = document.getElementById('resultCount');
    if (!gridEl) return;

    // Show loading skeleton
    gridEl.innerHTML = Array(4).fill(0).map(() => `
      <div class="product-card" style="opacity: 0.6; pointer-events: none;">
        <div style="height: 160px; background: var(--bg-input); border-radius: var(--radius-sm); margin-bottom: 1rem;"></div>
        <div style="height: 14px; background: var(--bg-input); width: 40%; margin-bottom: 0.5rem;"></div>
        <div style="height: 20px; background: var(--bg-input); width: 85%; margin-bottom: 0.5rem;"></div>
        <div style="height: 24px; background: var(--bg-input); width: 60%; margin-top: auto;"></div>
      </div>
    `).join('');

    const queryParams = {
      sort: this.state.sort
    };
    // Only send category if a specific one is selected (not 'all')
    if (this.state.category && this.state.category !== 'all') {
      queryParams.category = this.state.category;
    }
    if (this.state.brand.length) queryParams.brand = this.state.brand.join(',');
    if (this.state.search) queryParams.search = this.state.search;
    if (this.state.minPrice) queryParams.minPrice = this.state.minPrice;
    if (this.state.maxPrice) queryParams.maxPrice = this.state.maxPrice;

    const response = await API.getProducts(queryParams);
    this.state.products = response.data || [];
    this.state.total = response.total || this.state.products.length;

    if (resultCountEl) {
      resultCountEl.textContent = `Hiển thị ${this.state.products.length} sản phẩm`;
    }

    if (this.state.products.length === 0) {
      gridEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;" class="glass-panel">
          <i class="lucide-search" style="font-size: 3rem; color: var(--text-subtle); margin-bottom: 1rem;"></i>
          <h3>Không tìm thấy sản phẩm phù hợp</h3>
          <p style="color: var(--text-muted); margin-top: 0.5rem;">Vui lòng thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt bộ lọc.</p>
        </div>
      `;
      return;
    }

    gridEl.innerHTML = this.state.products.map(p => this.renderProductCard(p)).join('');

    this.bindCardEvents(gridEl);
    this.fetchAndRenderRecommended();
  },

  async fetchAndRenderRecommended() {
    const grid = document.getElementById('recommendedGrid');
    if (!grid) return;

    try {
      const currentUser = JSON.parse(localStorage.getItem('phonestore_user') || 'null');
      const userId = currentUser ? (currentUser._id || currentUser.id) : null;
      const prods = await API.getRecommendedProducts(userId);
      if (prods && prods.length > 0) {
        grid.innerHTML = prods.map(p => this.renderProductCard(p)).join('');
        this.bindCardEvents(grid, prods);
      }
    } catch (err) {
      console.warn('Recommended section error:', err);
    }
  },

  bindCardEvents(containerEl, customList = null) {
    const products = customList || this.state.products;

    containerEl.querySelectorAll('.btn-add-cart').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const productId = e.currentTarget.dataset.id;
        const product = products.find(p => (p._id || p.id) === productId);
        if (product) {
          this.appStore.addToCart(product);
        }
      });
    });

    containerEl.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-add-cart')) return;
        const slug = card.dataset.slug;
        if (this.appStore.openProductModal) {
          this.appStore.openProductModal(slug);
        }
      });
    });
  },

  getValidImageUrl(p) {
    const fallbackSvg = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiB2aWV3Qm94PSIwIDAgMzAwIDMwMCI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiMzMzQxNTUiIC8+PHRleHQgeD0iMTUwIiB5PSIxNTAiIGZpbGw9IiM5NGEzYjgiIGZvbnQtZmFtaWx5PSJBcmlhbCxzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+";
    if (!p) return fallbackSvg;
    if (typeof p.images === 'string' && p.images.trim()) return p.images.trim();
    if (Array.isArray(p.images) && p.images.length > 0) {
      const primaryObj = p.images.find(i => i && typeof i === 'object' && i.isPrimary && i.url);
      if (primaryObj && primaryObj.url) return primaryObj.url;
      const first = p.images[0];
      if (typeof first === 'string' && first.trim()) return first.trim();
      if (first && typeof first === 'object' && first.url) return first.url;
    }
    if (typeof p.image === 'string' && p.image.trim()) return p.image.trim();
    if (typeof p.imageUrl === 'string' && p.imageUrl.trim()) return p.imageUrl.trim();
    return fallbackSvg;
  },

  renderProductCard(product) {
    const primaryImg = this.getValidImageUrl(product);
    const discount = product.comparePrice > product.price 
      ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
      : 0;

    return `
      <div class="product-card" data-slug="${product.slug}" data-id="${product._id}">
        <div class="card-badge-wrap">
          ${discount > 0 ? `<span class="badge badge-danger">-${discount}%</span>` : ''}
          ${product.isFeatured ? `<span class="badge badge-accent">HOT</span>` : ''}
        </div>
        
        <div class="product-img-wrap">
          <img src="${primaryImg}" alt="${product.name}" loading="lazy" onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiB2aWV3Qm94PSIwIDAgMzAwIDMwMCI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiMzMzQxNTUiIC8+PHRleHQgeD0iMTUwIiB5PSIxNTAiIGZpbGw9IiM5NGEzYjgiIGZvbnQtZmFtaWx5PSJBcmlhbCxzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+'" />
        </div>

        <div class="product-brand">${product.brand}</div>
        <h3 class="product-title" title="${product.name}">${product.name}</h3>

        <div class="rating-stars">
          ★ <span>${product.avgRating || 5.0}</span>
          <span class="rating-count">(${product.reviewCount || 10})</span>
        </div>

        <div class="product-price-wrap">
          <span class="price-current">${this.formatVND(product.price)}</span>
          ${product.comparePrice > product.price ? `<span class="price-compare">${this.formatVND(product.comparePrice)}</span>` : ''}
        </div>

        <div class="card-actions">
          <button class="btn btn-primary btn-add-cart" style="flex: 1;" data-id="${product._id}">
            🛒 Thêm giỏ hàng
          </button>
        </div>
      </div>
    `;
  }
};
