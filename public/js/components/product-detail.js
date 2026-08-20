/**
 * Product Detail Modal Component
 */

import { API } from '../api.js';

export const ProductDetailComponent = {
  async open(slugOrId, appStore) {
    this.appStore = appStore;
    const modalEl = document.getElementById('productDetailModal');
    const overlayEl = document.getElementById('modalOverlay');
    const bodyEl = document.getElementById('modalBody');

    if (!modalEl || !overlayEl || !bodyEl) return;

    bodyEl.innerHTML = `<div style="text-align: center; padding: 3rem; color: var(--text-muted);">Đang tải thông tin sản phẩm...</div>`;
    modalEl.classList.add('active');
    overlayEl.classList.add('active');

    this.setupCloseListeners();

    let product = await API.getProductBySlugOrId(slugOrId);
    if (product && product.product) {
      product = product.product;
    }
    if (!product || !product.name) {
      bodyEl.innerHTML = `<div style="text-align: center; padding: 3rem; color: var(--danger);">Không tìm thấy thông tin sản phẩm.</div>`;
      return;
    }

    this.currentProduct = product;
    this.render(product, bodyEl);
  },

  setupCloseListeners() {
    if (!this._escBound) {
      this._escBound = (e) => {
        if (e.key === 'Escape') this.close();
      };
      window.addEventListener('keydown', this._escBound);
    }
    const modalEl = document.getElementById('productDetailModal');
    const closeBtn = modalEl?.querySelector('.btn-icon') || document.getElementById('closeProductDetailBtn');
    if (closeBtn && !closeBtn._clickBound) {
      closeBtn._clickBound = true;
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.close();
      });
    }
  },

  close() {
    document.getElementById('productDetailModal')?.classList.remove('active');
    document.getElementById('modalOverlay')?.classList.remove('active');
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

  render(p, container) {
    const fallbackSvg = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiB2aWV3Qm94PSIwIDAgMzAwIDMwMCI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiMzMzQxNTUiIC8+PHRleHQgeD0iMTUwIiB5PSIxNTAiIGZpbGw9IiM5NGEzYjgiIGZvbnQtZmFtaWx5PSJBcmlhbCxzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+";
    const primaryImg = this.getValidImageUrl(p);
    const formatVND = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);

    const brandName = p.brand || 'Phonestore';
    const productName = p.name || 'Sản phẩm';
    const priceVal = typeof p.price === 'number' ? p.price : 0;
    const comparePriceVal = typeof p.comparePrice === 'number' ? p.comparePrice : 0;
    const stockVal = typeof p.stock === 'number' ? p.stock : 0;
    const avgRatingVal = p.avgRating || 5.0;
    const reviewCountVal = p.reviewCount || 12;

    const SPEC_LABELS = {
      display: 'Màn hình',
      processor: 'Vi xử lý (CPU)',
      ram: 'Bộ nhớ RAM',
      storage: 'Bộ nhớ trong (ROM)',
      camera: 'Camera',
      battery: 'Pin & Sạc',
      os: 'Hệ điều hành',
      color: 'Màu sắc',
      weight: 'Trọng lượng',
      connectivity: 'Kết nối'
    };

    const specsHtml = (p.specs && Object.keys(p.specs).length > 0) ? Object.entries(p.specs).map(([key, val]) => {
      const label = SPEC_LABELS[key.toLowerCase()] || (key.charAt(0).toUpperCase() + key.slice(1));
      return `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
          <td style="font-weight: 600; color: var(--text-muted); padding: 0.5rem 0; width: 40%; font-size: 0.85rem;">${label}</td>
          <td style="padding: 0.5rem 0; color: var(--text-main); font-weight: 500; font-size: 0.9rem;">${val}</td>
        </tr>
      `;
    }).join('') : '<tr><td style="color:var(--text-subtle);">Chưa có thông số kỹ thuật</td></tr>';

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; align-items: start;">
        <div>
          <div style="background: rgba(15,23,42,0.6); padding: 1.5rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); text-align: center;">
            <img src="${primaryImg}" id="mainDetailImg" style="max-height: 320px; margin: 0 auto; object-fit: contain;" alt="${productName}" onerror="this.onerror=null; this.src='${fallbackSvg}'" />
          </div>
        </div>

        <div>
          <span class="badge badge-primary">${brandName}</span>
          <h2 style="font-family: var(--font-heading); font-size: 1.75rem; margin: 0.5rem 0 1rem;">${productName}</h2>
          
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; color: var(--warning);">
            ★ <strong style="color: var(--text-main);">${avgRatingVal}</strong>
            <span style="color: var(--text-subtle);">(${reviewCountVal} đánh giá)</span>
            <span style="margin: 0 0.5rem; color: var(--border-subtle);">|</span>
            <span style="color: var(--success); font-size: 0.9rem; font-weight: 600;">✓ Còn hàng (${stockVal} sản phẩm)</span>
          </div>

          <div style="font-size: 1.85rem; font-weight: 800; color: var(--primary); margin-bottom: 1.25rem;">
            ${formatVND(priceVal)}
            ${comparePriceVal > priceVal ? `<span style="font-size: 1.1rem; color: var(--text-subtle); text-decoration: line-through; margin-left: 0.5rem;">${formatVND(comparePriceVal)}</span>` : ''}
          </div>

          <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 1.5rem;">${p.description || 'Sản phẩm chính hãng đầy đủ tem bảo hành 12 tháng.'}</p>

          <div style="display: flex; gap: 1rem; margin-bottom: 2rem;">
            <button class="btn btn-primary" id="modalAddToCartBtn" style="flex: 1; padding: 0.85rem;">
              🛒 Thêm vào giỏ hàng
            </button>
            <button class="btn btn-secondary" id="modalBuyNowBtn" style="padding: 0.85rem;">
              ⚡ Mua ngay
            </button>
          </div>

          <div style="border-top: 1px solid var(--border-subtle); padding-top: 1rem;">
            <h4 style="font-family: var(--font-heading); font-size: 1.1rem; margin-bottom: 0.75rem;">Thông số kỹ thuật</h4>
            <table style="width: 100%; font-size: 0.9rem; border-collapse: collapse;">
              ${specsHtml}
            </table>
          </div>
        </div>
      </div>

      <div style="border-top: 1px solid var(--border-subtle); margin-top: 2rem; padding-top: 1.5rem;" id="relatedProductsSection">
        <h4 style="font-family: var(--font-heading); font-size: 1.15rem; margin-bottom: 1rem; color: var(--primary);">💡 Sản Phẩm Gợi Ý Liên Quan</h4>
        <div id="relatedProductsContainer" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem;">
          <div style="color: var(--text-muted); font-size: 0.85rem;">Đang tìm sản phẩm gợi ý...</div>
        </div>
      </div>
    `;

    document.getElementById('modalAddToCartBtn')?.addEventListener('click', () => {
      this.appStore.addToCart(p);
      this.close();
    });

    document.getElementById('modalBuyNowBtn')?.addEventListener('click', () => {
      this.appStore.addToCart(p);
      this.close();
      this.appStore.openCartDrawer();
    });

    this.loadRelatedProducts(p._id);
  },

  async loadRelatedProducts(productId) {
    const container = document.getElementById('relatedProductsContainer');
    if (!container) return;

    try {
      const related = await API.getRelatedProducts(productId);
      if (!related || related.length === 0) {
        document.getElementById('relatedProductsSection')?.remove();
        return;
      }

      const fallbackSvg = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiB2aWV3Qm94PSIwIDAgMzAwIDMwMCI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiMzMzQxNTUiIC8+PHRleHQgeD0iMTUwIiB5PSIxNTAiIGZpbGw9IiM5NGEzYjgiIGZvbnQtZmFtaWx5PSJBcmlhbCxzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+";
      const formatVND = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

      container.innerHTML = related.slice(0, 4).map(item => {
        const img = this.getValidImageUrl(item);
        return `
          <div class="glass-panel related-card" data-slug="${item.slug}" style="padding: 0.75rem; text-align: center; cursor: pointer; border-radius: var(--radius-sm); transition: transform 0.2s ease;">
            <img src="${img}" style="height: 90px; width: 100%; object-fit: contain; margin-bottom: 0.5rem;" alt="${item.name}" onerror="this.onerror=null; this.src='${fallbackSvg}'" />
            <div style="font-size: 0.8rem; font-weight: 700; height: 2.2rem; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; margin-bottom: 0.35rem;">${item.name}</div>
            <div style="font-size: 0.85rem; font-weight: 800; color: var(--primary);">${formatVND(item.price)}</div>
          </div>
        `;
      }).join('');

      container.querySelectorAll('.related-card').forEach(card => {
        card.addEventListener('click', () => {
          const slug = card.dataset.slug;
          this.open(slug, this.appStore);
        });
      });
    } catch (e) {
      document.getElementById('relatedProductsSection')?.remove();
    }
  }
};
