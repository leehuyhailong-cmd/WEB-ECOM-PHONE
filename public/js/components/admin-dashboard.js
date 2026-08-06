/**
 * Admin Dashboard Modal Component
 */

import { API } from '../api.js';

export const AdminDashboardComponent = {
  init(appStore) {
    this.appStore = appStore;
    this.bindEvents();
  },

  bindEvents() {
    document.getElementById('adminBtn')?.addEventListener('click', () => this.open());
    document.getElementById('closeAdminModalBtn')?.addEventListener('click', () => this.close());
  },

  async open() {
    const modal = document.getElementById('adminModal');
    const overlay = document.getElementById('modalOverlay');
    const body = document.getElementById('adminModalBody');

    if (!modal || !overlay || !body) return;

    body.innerHTML = `<div style="text-align: center; padding: 3rem;">Đang tải dữ liệu tổng quan quản trị...</div>`;
    modal.classList.add('active');
    overlay.classList.add('active');

    const stats = await API.getAdminStats();
    this.render(stats, body);
  },

  close() {
    document.getElementById('adminModal')?.classList.remove('active');
    document.getElementById('modalOverlay')?.classList.remove('active');
  },

  render(stats, container) {
    const formatVND = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;">
        <div class="glass-panel" style="padding: 1.25rem; background: rgba(6,182,212,0.1); border-color: rgba(6,182,212,0.3);">
          <small style="color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Doanh thu toàn hệ thống</small>
          <div style="font-size: 1.6rem; font-weight: 800; color: var(--primary); margin-top: 0.5rem;">${formatVND(stats.revenue)}</div>
        </div>

        <div class="glass-panel" style="padding: 1.25rem; background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.3);">
          <small style="color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Tổng đơn hàng</small>
          <div style="font-size: 1.6rem; font-weight: 800; color: var(--accent); margin-top: 0.5rem;">${stats.totalOrders} đơn</div>
        </div>

        <div class="glass-panel" style="padding: 1.25rem; background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3);">
          <small style="color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Sản phẩm đang kinh doanh</small>
          <div style="font-size: 1.6rem; font-weight: 800; color: var(--success); margin-top: 0.5rem;">${stats.totalProducts} sp</div>
        </div>
      </div>

      <h4 style="font-family: var(--font-heading); font-size: 1.15rem; margin-bottom: 1rem;">Đơn hàng gần đây</h4>
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem; background: var(--bg-dark); border-radius: var(--radius-md); overflow: hidden;">
          <thead>
            <tr style="background: var(--bg-card-solid); color: var(--text-muted); text-align: left;">
              <th style="padding: 0.75rem 1rem;">Mã đơn</th>
              <th style="padding: 0.75rem 1rem;">Khách hàng</th>
              <th style="padding: 0.75rem 1rem;">Tổng tiền</th>
              <th style="padding: 0.75rem 1rem;">Trạng thái</th>
              <th style="padding: 0.75rem 1rem;">Thời gian</th>
            </tr>
          </thead>
          <tbody>
            ${stats.recentOrders.map(o => `
              <tr style="border-top: 1px solid var(--border-subtle);">
                <td style="padding: 0.75rem 1rem; font-weight: 700;">${o.id}</td>
                <td style="padding: 0.75rem 1rem;">${o.customer}</td>
                <td style="padding: 0.75rem 1rem; color: var(--primary); font-weight: 700;">${formatVND(o.total)}</td>
                <td style="padding: 0.75rem 1rem;"><span class="badge badge-success">${o.status}</span></td>
                <td style="padding: 0.75rem 1rem; color: var(--text-subtle);">${o.date}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
};
