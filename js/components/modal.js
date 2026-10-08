/**
 * MediCore Modal Dialog Manager
 * Accessible, responsive modal management with keyboard escape, backdrop dismiss, and custom confirmation dialog
 */

class ModalManager {
  constructor() {
    this.activeModal = null;
    this.init();
  }

  init() {
    // Global Escape Key Listener
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModal) {
        this.close(this.activeModal.id);
      }
    });

    // Delegated click listener for data-modal-close buttons and overlay backdrop
    document.addEventListener('click', (e) => {
      const closeTrigger = e.target.closest('[data-modal-close]');
      if (closeTrigger) {
        const modalEl = closeTrigger.closest('.modal-overlay');
        if (modalEl) {
          this.close(modalEl.id);
        }
      } else if (e.target.classList.contains('modal-overlay')) {
        // Clicked directly on overlay background
        this.close(e.target.id);
      }
    });
  }

  open(modalId) {
    const modalEl = document.getElementById(modalId);
    if (!modalEl) {
      console.warn(`Modal with ID '${modalId}' not found.`);
      return;
    }

    // Close any currently active modal first
    if (this.activeModal && this.activeModal.id !== modalId) {
      this.close(this.activeModal.id);
    }

    modalEl.classList.add('active');
    modalEl.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    this.activeModal = modalEl;

    // Focus on first input if present
    setTimeout(() => {
      const firstInput = modalEl.querySelector('input:not([type="hidden"]), select, textarea, button.btn-primary');
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  }

  close(modalId) {
    const modalEl = document.getElementById(modalId);
    if (!modalEl) return;

    modalEl.classList.remove('active');
    modalEl.setAttribute('aria-hidden', 'true');
    this.activeModal = null;

    // Check if any other modal is still active
    const remaining = document.querySelector('.modal-overlay.active');
    if (!remaining) {
      document.body.classList.remove('modal-open');
    } else {
      this.activeModal = remaining;
    }
  }

  closeAll() {
    document.querySelectorAll('.modal-overlay.active').forEach(modalEl => {
      modalEl.classList.remove('active');
      modalEl.setAttribute('aria-hidden', 'true');
    });
    document.body.classList.remove('modal-open');
    this.activeModal = null;
  }

  /**
   * Premium SaaS Confirmation Dialog
   * Replaces native browser confirm() with an accessible, high-contrast modal
   */
  confirm({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    danger = true,
    icon = 'fa-triangle-exclamation'
  } = {}) {
    return new Promise((resolve) => {
      let confirmModal = document.getElementById('modal-confirm-dialog');
      if (!confirmModal) {
        confirmModal = document.createElement('div');
        confirmModal.id = 'modal-confirm-dialog';
        confirmModal.className = 'modal-overlay';
        confirmModal.setAttribute('aria-hidden', 'true');
        confirmModal.innerHTML = `
          <div class="modal-container modal-sm">
            <div class="modal-header">
              <div class="flex items-center gap-2">
                <div class="confirm-modal-icon-box ${danger ? 'confirm-icon-danger' : 'confirm-icon-primary'}">
                  <i class="fa-solid ${icon}"></i>
                </div>
                <h3 class="modal-title" id="confirm-dialog-title">${title}</h3>
              </div>
              <button type="button" class="modal-close-btn" data-modal-close aria-label="Close dialog">&times;</button>
            </div>
            <div class="modal-body" style="padding: 1.25rem 1.5rem;">
              <div id="confirm-dialog-message" class="text-secondary" style="font-size: 0.875rem; line-height: 1.55;">
                ${message}
              </div>
            </div>
            <div class="modal-footer" style="padding: 0.85rem 1.5rem;">
              <button type="button" class="btn btn-secondary" id="confirm-dialog-cancel-btn">${cancelText}</button>
              <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirm-dialog-ok-btn">${confirmText}</button>
            </div>
          </div>
        `;
        document.body.appendChild(confirmModal);
      } else {
        const titleEl = document.getElementById('confirm-dialog-title');
        const msgEl = document.getElementById('confirm-dialog-message');
        const iconBox = confirmModal.querySelector('.confirm-modal-icon-box');
        const okBtn = document.getElementById('confirm-dialog-ok-btn');
        const cancelBtn = document.getElementById('confirm-dialog-cancel-btn');

        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.innerHTML = message;
        if (iconBox) {
          iconBox.className = `confirm-modal-icon-box ${danger ? 'confirm-icon-danger' : 'confirm-icon-primary'}`;
          iconBox.innerHTML = `<i class="fa-solid ${icon}"></i>`;
        }
        if (okBtn) {
          okBtn.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
          okBtn.textContent = confirmText;
        }
        if (cancelBtn) {
          cancelBtn.textContent = cancelText;
        }
      }

      const okBtn = document.getElementById('confirm-dialog-ok-btn');
      const cancelBtn = document.getElementById('confirm-dialog-cancel-btn');

      const cleanup = () => {
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        confirmModal.removeEventListener('keydown', onKey);
      };

      const onOk = () => {
        cleanup();
        this.close('modal-confirm-dialog');
        resolve(true);
      };

      const onCancel = () => {
        cleanup();
        this.close('modal-confirm-dialog');
        resolve(false);
      };

      const onKey = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onOk();
        }
      };

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      confirmModal.addEventListener('keydown', onKey);

      this.open('modal-confirm-dialog');
    });
  }
}

// Global modal instance
const modal = new ModalManager();
