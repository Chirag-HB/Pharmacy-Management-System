/**
 * MediCore Alerts & Notifications Center
 * Multi-severity triage for stock shortages, drug expiry dates, pending prescriptions,
 * and supplier orders with persistent read/unread status and header dropdown integration
 */

const AlertsModule = {
  currentFilter: 'all',
  readAlertIdsKey: 'medicore_read_alert_ids',
  dismissedAlertIdsKey: 'medicore_dismissed_alert_ids',

  init() {
    this.render();
    this.attachEvents();

    storage.on('stockUpdated', () => this.render());
    storage.on('medicinesUpdated', () => this.render());
    storage.on('suppliersUpdated', () => this.render());
    storage.on('prescriptionsUpdated', () => this.render());
    storage.on('saleCompleted', () => this.render());
  },

  getReadAlertIds() {
    try {
      const stored = localStorage.getItem(this.readAlertIdsKey);
      return new Set(stored ? JSON.parse(stored) : []);
    } catch (e) {
      return new Set();
    }
  },

  saveReadAlertIds(set) {
    try {
      localStorage.setItem(this.readAlertIdsKey, JSON.stringify(Array.from(set)));
    } catch (e) {
      console.error(e);
    }
  },

  getDismissedAlertIds() {
    try {
      const stored = localStorage.getItem(this.dismissedAlertIdsKey);
      return new Set(stored ? JSON.parse(stored) : []);
    } catch (e) {
      return new Set();
    }
  },

  saveDismissedAlertIds(set) {
    try {
      localStorage.setItem(this.dismissedAlertIdsKey, JSON.stringify(Array.from(set)));
    } catch (e) {
      console.error(e);
    }
  },

  setFilter(filterName) {
    this.currentFilter = filterName;
    const filterTabs = document.getElementById('alerts-filter-tabs');
    if (filterTabs) {
      filterTabs.querySelectorAll('.filter-tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.filter === filterName);
      });
    }
    this.renderList();
  },

  attachEvents() {
    // Filter tabs on Alerts Page
    const filterTabs = document.getElementById('alerts-filter-tabs');
    if (filterTabs) {
      filterTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.filter-tab-btn');
        if (tab) {
          filterTabs.querySelectorAll('.filter-tab-btn').forEach(b => b.classList.remove('active'));
          tab.classList.add('active');
          this.currentFilter = tab.dataset.filter;
          this.renderList();
        }
      });
    }

    // Dismiss all on Alerts Page
    const btnDismissAll = document.getElementById('btn-dismiss-all-alerts');
    if (btnDismissAll) {
      btnDismissAll.addEventListener('click', () => {
        this.clearAllNotifications();
      });
    }

    // Header Notification Bell toggle dropdown
    const btnBell = document.getElementById('btn-header-notifications');
    const dropdown = document.getElementById('header-notifications-dropdown');

    if (btnBell && dropdown) {
      btnBell.addEventListener('click', (e) => {
        e.stopPropagation();
        const isCurrentlyOpen = dropdown.classList.contains('active') || dropdown.style.display === 'block';
        if (isCurrentlyOpen) {
          dropdown.style.display = 'none';
          dropdown.classList.remove('active');
        } else {
          dropdown.style.display = 'block';
          dropdown.classList.add('active');
          this.renderDropdown();
        }
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('#header-notifications-dropdown') && !e.target.closest('#btn-header-notifications')) {
          dropdown.style.display = 'none';
          dropdown.classList.remove('active');
        }
      });
    }

    // Dropdown Mark All Read button
    const btnMarkAllRead = document.getElementById('btn-notif-mark-all-read');
    if (btnMarkAllRead) {
      btnMarkAllRead.addEventListener('click', (e) => {
        e.stopPropagation();
        this.markAllAsRead();
      });
    }

    // Dropdown Clear All button
    const btnClearAll = document.getElementById('btn-notif-clear-all');
    if (btnClearAll) {
      btnClearAll.addEventListener('click', (e) => {
        e.stopPropagation();
        this.clearAllNotifications();
      });
    }

    // Dropdown View All Alerts Center link
    const btnViewAll = document.getElementById('btn-notif-view-all-alerts');
    if (btnViewAll) {
      btnViewAll.addEventListener('click', () => {
        if (dropdown) {
          dropdown.style.display = 'none';
          dropdown.classList.remove('active');
        }
        App.navigateTo('alerts');
      });
    }
  },

  getAllActiveAlerts() {
    const rawAlerts = storage.getAlerts();
    const dismissed = this.getDismissedAlertIds();
    return rawAlerts.filter(a => !dismissed.has(a.id));
  },

  render() {
    this.renderHeaderBadge();
    this.renderPillCounts();
    this.renderList();
    this.renderDropdown();
  },

  renderHeaderBadge() {
    const alerts = this.getAllActiveAlerts();
    const readSet = this.getReadAlertIds();
    const unreadCount = alerts.filter(a => !readSet.has(a.id)).length;

    const headerBadge = document.getElementById('header-alert-badge');
    if (headerBadge) {
      headerBadge.textContent = unreadCount;
      headerBadge.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
    }

    const sidebarBadge = document.getElementById('sidebar-alert-badge');
    if (sidebarBadge) {
      sidebarBadge.textContent = unreadCount;
      sidebarBadge.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
    }

    const dropdownBadge = document.getElementById('notif-dropdown-badge');
    if (dropdownBadge) {
      dropdownBadge.textContent = `${unreadCount} Unread`;
      dropdownBadge.className = unreadCount > 0 ? 'badge badge-primary text-2xs' : 'badge badge-light text-2xs';
    }
  },

  renderPillCounts() {
    const alerts = this.getAllActiveAlerts();

    const total = alerts.length;
    const critical = alerts.filter(a => a.severity === 'critical').length;
    const warning = alerts.filter(a => a.severity === 'warning').length;
    const info = alerts.filter(a => a.severity === 'info').length;
    const success = alerts.filter(a => a.severity === 'success').length;

    const lowStock = alerts.filter(a => a.type === 'low-stock').length;
    const expiry = alerts.filter(a => a.type === 'expired' || a.type === 'expiring-7d' || a.type === 'expiring-30d').length;
    const pendingRx = alerts.filter(a => a.type === 'pending-prescription').length;
    const sup = alerts.filter(a => a.type === 'supplier-order').length;

    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setEl('alerts-count-all', total);
    setEl('alerts-count-critical', critical);
    setEl('alerts-count-warning', warning);
    setEl('alerts-count-info', info);
    setEl('alerts-count-success', success);
    setEl('alerts-count-low', lowStock);
    setEl('alerts-count-exp', expiry);
    setEl('alerts-count-rx', pendingRx);
    setEl('alerts-count-sup', sup);
  },

  getFilteredAlerts() {
    const alerts = this.getAllActiveAlerts();

    switch (this.currentFilter) {
      case 'critical': return alerts.filter(a => a.severity === 'critical');
      case 'warning': return alerts.filter(a => a.severity === 'warning');
      case 'info': return alerts.filter(a => a.severity === 'info');
      case 'success': return alerts.filter(a => a.severity === 'success');
      case 'low-stock': return alerts.filter(a => a.type === 'low-stock');
      case 'expiry': return alerts.filter(a => a.type === 'expired' || a.type === 'expiring-7d' || a.type === 'expiring-30d');
      case 'prescriptions': return alerts.filter(a => a.type === 'pending-prescription');
      case 'suppliers': return alerts.filter(a => a.type === 'supplier-order');
      default: return alerts;
    }
  },

  renderList() {
    const container = document.getElementById('alerts-list-container');
    if (!container) return;

    const alerts = this.getFilteredAlerts();
    const readSet = this.getReadAlertIds();

    if (alerts.length === 0) {
      container.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-state-icon-wrapper">
            <i class="fa-solid fa-shield-halved text-success"></i>
          </div>
          <h3 class="empty-state-title">All Systems Clear</h3>
          <p class="empty-state-desc">No active alerts detected under the "${this.currentFilter}" filter. Pharmacy operations are running smoothly.</p>
          <div class="empty-state-actions">
            <button type="button" class="btn btn-outline btn-sm" onclick="AlertsModule.setFilter('all')">
              <i class="fa-solid fa-rotate-left"></i> View All Alerts
            </button>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = alerts.map(alert => {
      const isRead = readSet.has(alert.id);

      let icon = 'fa-triangle-exclamation';
      let borderClass = 'alert-border-warning';
      let badgeClass = 'badge-warning';

      if (alert.severity === 'critical') {
        icon = 'fa-circle-exclamation';
        borderClass = 'alert-border-danger';
        badgeClass = 'badge-danger';
      } else if (alert.severity === 'info') {
        icon = 'fa-circle-info';
        borderClass = 'alert-border-info';
        badgeClass = 'badge-info';
      } else if (alert.severity === 'success') {
        icon = 'fa-circle-check';
        borderClass = 'alert-border-success';
        badgeClass = 'badge-success';
      }

      let actionButtonHtml = '';
      if (alert.action === 'restock' && alert.medicineId) {
        actionButtonHtml = `
          <button class="btn btn-sm btn-primary" onclick="InventoryModule.openRestockModal('${alert.medicineId}')">
            <i class="fa-solid fa-truck-ramp-box"></i> Restock
          </button>
        `;
      } else if (alert.action === 'dispose' && alert.medicineId) {
        actionButtonHtml = `
          <button class="btn btn-sm btn-danger" onclick="InventoryModule.openAdjustmentModal('${alert.medicineId}', 'remove', 1, 'Quarantine Expired Drug')">
            <i class="fa-solid fa-trash-can"></i> Dispose Drug
          </button>
        `;
      } else if (alert.action === 'prescription' && alert.prescriptionId) {
        actionButtonHtml = `
          <button class="btn btn-sm btn-primary" onclick="App.navigateTo('prescriptions'); PrescriptionsModule.openDetailsModal('${alert.prescriptionId}')">
            <i class="fa-solid fa-file-prescription"></i> Review Rx
          </button>
        `;
      } else if (alert.action === 'supplier') {
        actionButtonHtml = `
          <button class="btn btn-sm btn-outline" onclick="App.navigateTo('suppliers')">
            <i class="fa-solid fa-truck"></i> Suppliers
          </button>
        `;
      } else if (alert.medicineId) {
        actionButtonHtml = `
          <button class="btn btn-sm btn-outline" onclick="MedicinesModule.openDetailsModal('${alert.medicineId}')">
            <i class="fa-solid fa-eye"></i> View Medicine
          </button>
        `;
      }

      return `
        <div class="alert-center-card ${borderClass}" style="opacity: ${isRead ? '0.75' : '1'}; background: ${isRead ? 'var(--bg-surface)' : 'var(--bg-surface-raised)'}; border-left: 4px solid ${alert.severity === 'critical' ? 'var(--color-danger)' : (alert.severity === 'warning' ? 'var(--color-warning)' : (alert.severity === 'success' ? 'var(--color-success)' : 'var(--color-primary)'))}; padding: 1rem 1.25rem; border-radius: var(--radius-md); margin-bottom: 0.85rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; box-shadow: var(--shadow-xs);">
          <div style="display: flex; align-items: flex-start; gap: 1rem; flex: 1;">
            <div class="${badgeClass}" style="width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0;">
              <i class="fa-solid ${icon}"></i>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span class="font-bold text-sm text-main">${alert.title}</span>
                <span class="badge ${badgeClass} text-2xs uppercase font-bold">${alert.severity}</span>
                ${isRead ? '<span class="text-2xs text-muted"><i class="fa-solid fa-check"></i> Read</span>' : '<span class="badge badge-primary text-2xs">New</span>'}
              </div>
              <p class="text-xs text-muted mt-1 m-0">${alert.message}</p>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;">
            ${actionButtonHtml}
            ${!isRead ? `
              <button class="btn btn-icon btn-sm" title="Mark as Read" onclick="AlertsModule.markAsRead('${alert.id}')">
                <i class="fa-solid fa-check"></i>
              </button>
            ` : ''}
            <button class="btn btn-icon btn-sm text-muted" title="Dismiss Alert" onclick="AlertsModule.dismissAlert('${alert.id}')">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  renderDropdown() {
    const listEl = document.getElementById('header-notifications-list');
    if (!listEl) return;

    const alerts = this.getAllActiveAlerts();
    const readSet = this.getReadAlertIds();

    if (alerts.length === 0) {
      listEl.innerHTML = `
        <div style="padding: 2rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.8125rem;">
          <i class="fa-solid fa-bell-slash fa-2x mb-2" style="display: block; opacity: 0.5;"></i>
          No new alerts or pending tasks
        </div>
      `;
      return;
    }

    listEl.innerHTML = alerts.slice(0, 8).map(alert => {
      const isRead = readSet.has(alert.id);
      let dotColor = 'var(--color-primary)';
      if (alert.severity === 'critical') dotColor = 'var(--color-danger)';
      else if (alert.severity === 'warning') dotColor = 'var(--color-warning)';
      else if (alert.severity === 'success') dotColor = 'var(--color-success)';

      return `
        <div class="notif-item" style="padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-color); display: flex; align-items: flex-start; gap: 0.75rem; background: ${isRead ? 'transparent' : 'rgba(14, 116, 144, 0.05)'}; cursor: pointer; transition: background 0.15s ease;" onclick="AlertsModule.handleDropdownItemClick('${alert.id}')">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: ${dotColor}; margin-top: 5px; flex-shrink: 0;"></span>
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <span class="font-bold text-xs text-main text-truncate" style="max-width: 220px;">${alert.title}</span>
              <span class="text-2xs text-muted">${alert.severity}</span>
            </div>
            <p class="text-2xs text-muted m-0" style="margin-top: 0.2rem; line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
              ${alert.message}
            </p>
          </div>
          ${!isRead ? `
            <button type="button" class="btn btn-icon btn-sm text-2xs" title="Mark as read" style="width: 20px; height: 20px; padding: 0;" onclick="event.stopPropagation(); AlertsModule.markAsRead('${alert.id}')">
              <i class="fa-solid fa-check"></i>
            </button>
          ` : ''}
        </div>
      `;
    }).join('');
  },

  handleDropdownItemClick(alertId) {
    this.markAsRead(alertId);
    const alert = storage.getAlerts().find(a => a.id === alertId);
    if (!alert) return;

    const dropdown = document.getElementById('header-notifications-dropdown');
    if (dropdown) dropdown.style.display = 'none';

    if (alert.type === 'out-of-stock' || alert.type === 'low-stock') {
      App.navigateTo('inventory');
    } else if (alert.type === 'expired' || alert.type.startsWith('expiring')) {
      App.navigateTo('inventory');
    } else if (alert.type === 'pending-prescription') {
      App.navigateTo('prescriptions');
    } else if (alert.type === 'supplier-order') {
      App.navigateTo('suppliers');
    } else {
      App.navigateTo('alerts');
    }
  },

  markAsRead(alertId) {
    const readSet = this.getReadAlertIds();
    readSet.add(alertId);
    this.saveReadAlertIds(readSet);
    this.render();
  },

  markAllAsRead() {
    const alerts = this.getAllActiveAlerts();
    const readSet = this.getReadAlertIds();
    alerts.forEach(a => readSet.add(a.id));
    this.saveReadAlertIds(readSet);
    this.render();
    toast.success('All notifications marked as read.');
  },

  clearAllNotifications() {
    const alerts = storage.getAlerts();
    const dismissedSet = this.getDismissedAlertIds();
    alerts.forEach(a => dismissedSet.add(a.id));
    this.saveDismissedAlertIds(dismissedSet);
    this.render();
    toast.info('All active notifications cleared.');
  },

  dismissAlert(alertId) {
    const dismissedSet = this.getDismissedAlertIds();
    dismissedSet.add(alertId);
    this.saveDismissedAlertIds(dismissedSet);
    this.render();
    toast.info('Notification dismissed.');
  }
};
