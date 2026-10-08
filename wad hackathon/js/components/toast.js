/**
 * MediCore Toast Notification System
 * Lightweight, non-intrusive notifications with auto-dismiss
 */

class ToastService {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    // Look for existing container or create one
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    this.container = container;
  }

  show(message, type = 'info', title = '', duration = 4000) {
    if (!this.container) this.init();

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type} animate-slide-in`;

    const iconMap = {
      success: 'fa-circle-check',
      warning: 'fa-triangle-exclamation',
      error: 'fa-circle-xmark',
      info: 'fa-circle-info'
    };

    const iconClass = iconMap[type] || 'fa-bell';
    const defaultTitles = {
      success: 'Success',
      warning: 'Warning',
      error: 'Error',
      info: 'Notice'
    };

    const displayTitle = title || defaultTitles[type] || 'Notice';

    toast.innerHTML = `
      <div class="toast-icon">
        <i class="fa-solid ${iconClass}"></i>
      </div>
      <div class="toast-body">
        <div class="toast-title">${displayTitle}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close-btn" aria-label="Close notification">&times;</button>
    `;

    // Close button click
    const closeBtn = toast.querySelector('.toast-close-btn');
    closeBtn.addEventListener('click', () => {
      this.dismiss(toast);
    });

    this.container.appendChild(toast);

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(toast);
      }, duration);
    }
  }

  dismiss(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.add('animate-slide-out');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 280);
  }

  success(message, title = 'Success') {
    this.show(message, 'success', title);
  }

  warning(message, title = 'Warning') {
    this.show(message, 'warning', title);
  }

  error(message, title = 'Error') {
    this.show(message, 'error', title);
  }

  info(message, title = 'Information') {
    this.show(message, 'info', title);
  }
}

// Global instance
const toast = new ToastService();
