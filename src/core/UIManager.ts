import { AudioManager } from './AudioManager';

/**
 * UI管理器
 * 管理HTML层面的弹窗、提示、页面切换
 * PixiJS负责游戏画布，HTML/CSS负责UI层
 */
class UIManagerClass {
  private modals: Map<string, HTMLElement> = new Map();
  private pages: Map<string, HTMLElement> = new Map();

  /**
   * 注册页面
   */
  registerPage(id: string, element: HTMLElement): void {
    this.pages.set(id, element);
  }

  /**
   * 显示页面（隐藏其他页面，带淡入过渡）
   */
  showPage(id: string): void {
    this.pages.forEach((page, key) => {
      if (key === id) {
        page.classList.remove('hidden');
        // 触发重排后播放进入动画
        void page.offsetWidth;
        page.classList.add('page-enter');
        setTimeout(() => page.classList.remove('page-enter'), 350);
      } else {
        page.classList.add('hidden');
      }
    });
  }

  /**
   * 创建并显示弹窗
   * @param id 弹窗唯一标识
   * @param title 标题
   * @param body HTML内容
   * @param buttons 按钮配置
   */
  showModal(
    id: string,
    title: string,
    body: string,
    buttons: Array<{ text: string; type?: 'primary' | 'danger' | 'success' | 'default'; onClick: () => void }>
  ): void {
    // 如果已存在同名弹窗，先关闭
    this.closeModal(id);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = `modal-${id}`;

    const modal = document.createElement('div');
    modal.className = 'modal';

    const titleEl = document.createElement('div');
    titleEl.className = 'modal-title';
    titleEl.textContent = title;

    const bodyEl = document.createElement('div');
    bodyEl.className = 'modal-body';
    bodyEl.innerHTML = body;

    const footerEl = document.createElement('div');
    footerEl.className = 'modal-footer';

    buttons.forEach((btn) => {
      const button = document.createElement('button');
      button.className = `btn btn-${btn.type || 'default'}`;
      button.textContent = btn.text;
      button.addEventListener('click', () => {
        AudioManager.playSFX('click');
        btn.onClick();
      });
      footerEl.appendChild(button);
    });

    modal.appendChild(titleEl);
    modal.appendChild(bodyEl);
    modal.appendChild(footerEl);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    this.modals.set(id, overlay);
  }

  /**
   * 关闭弹窗
   */
  closeModal(id: string): void {
    const modal = this.modals.get(id);
    if (modal) {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 300);
      this.modals.delete(id);
    }
  }

  /**
   * 关闭所有弹窗
   */
  closeAllModals(): void {
    this.modals.forEach((_, id) => this.closeModal(id));
  }

  /**
   * 显示浮动提示文字（飘字效果）
   */
  showToast(message: string, duration: number = 2000): void {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%) translateY(-20px);
      background: rgba(18, 18, 42, 0.95);
      border: 1px solid rgba(0, 255, 255, 0.5);
      color: #fff;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 2000;
      opacity: 0;
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
      box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-20px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
}

/** 全局UI管理器单例 */
export const UIManager = new UIManagerClass();
