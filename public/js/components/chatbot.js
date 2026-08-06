/**
 * AI Chatbot Assistant Component
 */

import { API } from '../api.js';

export const ChatbotComponent = {
  sessionId: null,

  init(appStore) {
    this.appStore = appStore;
    this.bindEvents();
  },

  bindEvents() {
    // FAB floating button
    document.getElementById('chatbotFab')?.addEventListener('click', () => this.toggleChatDrawer());
    document.getElementById('closeChatBtn')?.addEventListener('click', () => this.closeChatDrawer());

    // Submit chat message
    document.getElementById('chatForm')?.addEventListener('submit', (e) => this.handleSendMessage(e));
  },

  toggleChatDrawer() {
    const drawer = document.getElementById('chatDrawer');
    if (drawer) {
      drawer.classList.toggle('active');
    }
  },

  closeChatDrawer() {
    document.getElementById('chatDrawer')?.classList.remove('active');
  },

  async handleSendMessage(e) {
    e.preventDefault();
    const input = e.target.chatMessageInput;
    const msg = input.value.trim();
    if (!msg) return;

    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;

    // Append user message
    this.appendMessage('user', msg, messagesContainer);
    input.value = '';

    // Typing indicator
    const typingBubble = document.createElement('div');
    typingBubble.className = 'chat-bubble bot';
    typingBubble.innerHTML = '<em>Trợ lý AI đang suy nghĩ...</em>';
    messagesContainer.appendChild(typingBubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    const res = await API.sendChatMessage(msg, this.sessionId);
    typingBubble.remove();

    if (res && res.reply) {
      this.sessionId = res.sessionId;
      this.appendMessage('bot', res.reply, messagesContainer);

      // Render product recommendation cards if returned
      if (res.recommendations && res.recommendations.length > 0) {
        const recWrap = document.createElement('div');
        recWrap.style.cssText = 'margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.5rem;';
        recWrap.innerHTML = `
          <small style="color: var(--text-muted); font-weight: 600;">Gợi ý sản phẩm dành cho bạn:</small>
          ${res.recommendations.map(p => `
            <div style="background: var(--bg-card-solid); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 0.6rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
              <div>
                <strong style="font-size: 0.85rem; display: block;">${p.name}</strong>
                <span style="color: var(--primary); font-weight: 700; font-size: 0.8rem;">${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.price)}</span>
              </div>
              <button class="btn btn-primary btn-sm chat-rec-btn" data-slug="${p.slug}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Xem ngay</button>
            </div>
          `).join('')}
        `;
        messagesContainer.appendChild(recWrap);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        recWrap.querySelectorAll('.chat-rec-btn').forEach(btn => {
          btn.addEventListener('click', (ev) => {
            const slug = ev.currentTarget.dataset.slug;
            this.closeChatDrawer();
            if (this.appStore.openProductModal) {
              this.appStore.openProductModal(slug);
            }
          });
        });
      }
    }
  },

  appendMessage(sender, text, container) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    bubble.textContent = text;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
  }
};
