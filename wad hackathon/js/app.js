/**
 * MediCore Main Application Controller
 * Single Page App router, global search, theme management, and module orchestration
 */

const App = {
  currentView: 'dashboard',

  init() {
    this.initTheme();
    this.initNavigation();
    this.initGlobalSearch();
    this.initHeaderActions();
    this.initKeyboardShortcuts();

    // Initialize Auth Module first
    if (typeof AuthModule !== 'undefined') {
      AuthModule.init();
    }

    // Initialize all modules
    DashboardModule.init();
    MedicinesModule.init();
    POSModule.init();
    InventoryModule.init();
    PrescriptionsModule.init();
    CustomersModule.init();
    SuppliersModule.init();
    AnalyticsModule.init();
    AlertsModule.init();
    SettingsModule.init();

    // Route guard: if not authenticated, do not navigate to protected dashboard
    if (typeof AuthModule !== 'undefined' && !AuthModule.isAuthenticated()) {
      return;
    }

    // Initial route based on URL hash
    const hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById(`view-${hash}`)) {
      this.navigateTo(hash);
    } else {
      this.navigateTo('dashboard');
    }

    // Update alert badge count
    AlertsModule.renderPillCounts();
  },

  // =================== NAVIGATION ===================
  initNavigation() {
    // Sidebar navigation links
    document.querySelectorAll('.nav-item').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.dataset.view;
        if (view) {
          this.navigateTo(view);
          // Close mobile sidebar if open
          document.body.classList.remove('sidebar-mobile-open');
        }
      });
    });

    // Mobile sidebar toggle button
    const btnToggleSidebar = document.getElementById('btn-sidebar-toggle');
    if (btnToggleSidebar) {
      btnToggleSidebar.addEventListener('click', () => {
        document.body.classList.toggle('sidebar-mobile-open');
      });
    }

    // Sidebar overlay backdrop click
    const overlay = document.getElementById('sidebar-backdrop');
    if (overlay) {
      overlay.addEventListener('click', () => {
        document.body.classList.remove('sidebar-mobile-open');
      });
    }

    // Listen to popstate / hash change (Browser Back / Forward)
    window.addEventListener('hashchange', () => {
      const h = window.location.hash.replace('#', '') || 'dashboard';
      if (document.getElementById(`view-${h}`)) {
        this.navigateTo(h);
      }
    });
  },

  navigateTo(viewName) {
    // Route Protection: Prevent unauthorized access to dispensary views
    if (typeof AuthModule !== 'undefined' && !AuthModule.isAuthenticated()) {
      AuthModule.logout();
      return;
    }

    const targetView = document.getElementById(`view-${viewName}`);
    if (!targetView) return;

    this.currentView = viewName;
    if (window.location.hash !== `#${viewName}`) {
      window.location.hash = viewName;
    }

    // Hide all views
    document.querySelectorAll('.view-container').forEach(view => {
      view.classList.remove('active');
    });

    // Show target view
    targetView.classList.add('active');

    // Update active state in sidebar
    document.querySelectorAll('.nav-item').forEach(link => {
      if (link.dataset.view === viewName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Re-render specific view components if required
    switch (viewName) {
      case 'dashboard':
        DashboardModule.render();
        break;
      case 'medicines':
        MedicinesModule.render();
        break;
      case 'pos':
        POSModule.render();
        break;
      case 'inventory':
        InventoryModule.render();
        break;
      case 'prescriptions':
        PrescriptionsModule.render();
        break;
      case 'customers':
        CustomersModule.render();
        break;
      case 'suppliers':
        SuppliersModule.render();
        break;
      case 'analytics':
        AnalyticsModule.render();
        break;
      case 'alerts':
        AlertsModule.render();
        break;
      case 'settings':
        SettingsModule.populateForm();
        break;
    }

    // Scroll to top of main content
    const mainContent = document.getElementById('main-content-scroll');
    if (mainContent) {
      mainContent.scrollTop = 0;
    }
  },

  // =================== THEME MANAGEMENT ===================
  initTheme() {
    const settings = storage.getSettings ? storage.getSettings() : (storage.data ? storage.data.settings : {});
    const storedTheme = localStorage.getItem('medicore_theme') || (settings && settings.theme) || 'light';
    this.setTheme(storedTheme, false);

    const btnThemeToggle = document.getElementById('btn-header-theme-toggle');
    if (btnThemeToggle) {
      btnThemeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.contains('dark-theme');
        const nextTheme = isDark ? 'light' : 'dark';
        this.setTheme(nextTheme, true);
      });
    }
  },

  setTheme(themeName, showToast = false) {
    const isDark = themeName === 'dark';
    if (isDark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }

    // Update Header Button Icon, Tooltip, and Accessibility Labels
    const btnThemeToggle = document.getElementById('btn-header-theme-toggle');
    if (btnThemeToggle) {
      btnThemeToggle.setAttribute('title', isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme');
      btnThemeToggle.setAttribute('aria-label', isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme');
      const icon = btnThemeToggle.querySelector('i');
      if (icon) {
        icon.className = isDark ? 'fa-solid fa-sun text-warning' : 'fa-solid fa-moon';
      }
    }

    // Sync with settings form switch if open
    const themeInput = document.getElementById('set-theme-toggle');
    if (themeInput) {
      themeInput.checked = isDark;
    }

    // Persist in localStorage directly and in storage.data.settings
    localStorage.setItem('medicore_theme', themeName);
    if (typeof storage !== 'undefined' && storage.data && storage.data.settings) {
      storage.data.settings.theme = themeName;
      localStorage.setItem(storage.STORAGE_KEY, JSON.stringify(storage.data));
    }

    // Re-render charts for color and contrast adjustment
    if (this.currentView === 'dashboard') {
      if (typeof DashboardModule !== 'undefined') {
        DashboardModule.renderCharts();
        if (typeof DashboardModule.renderPharmacyHealthScore === 'function') {
          DashboardModule.renderPharmacyHealthScore();
        }
      }
    } else if (this.currentView === 'analytics') {
      if (typeof AnalyticsModule !== 'undefined') {
        AnalyticsModule.renderCharts();
      }
    }

    // User feedback toast notification
    if (showToast && typeof toast !== 'undefined') {
      toast.info(
        isDark ? 'Obsidian dark mode activated.' : 'Crisp light mode activated.',
        isDark ? 'Dark Mode' : 'Light Mode'
      );
    }
  },

  // =================== GLOBAL SEARCH ===================
  initGlobalSearch() {
    const searchInput = document.getElementById('header-global-search');
    const dropdown = document.getElementById('header-search-results-dropdown');
    if (!searchInput || !dropdown) return;

    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) {
        dropdown.classList.remove('active');
        dropdown.innerHTML = '';
        return;
      }

      const medicines = storage.getMedicines().filter(m =>
        m.name.toLowerCase().includes(q) ||
        (m.genericName && m.genericName.toLowerCase().includes(q)) ||
        (m.batchNumber && m.batchNumber.toLowerCase().includes(q))
      ).slice(0, 4);

      const customers = storage.getCustomers().filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q)
      ).slice(0, 3);

      const prescriptions = storage.getPrescriptions().filter(p =>
        p.id.toLowerCase().includes(q) ||
        p.patientName.toLowerCase().includes(q)
      ).slice(0, 3);

      if (medicines.length === 0 && customers.length === 0 && prescriptions.length === 0) {
        dropdown.innerHTML = `
          <div class="search-drop-empty">
            <p>No results found for "${q}".</p>
          </div>
        `;
        dropdown.classList.add('active');
        return;
      }

      let html = '';

      if (medicines.length > 0) {
        html += `<div class="search-section-header"><i class="fa-solid fa-pills mr-1"></i> Medicines</div>`;
        html += medicines.map(m => `
          <div class="search-result-item" onclick="App.handleGlobalResult('medicine', '${m.id}')">
            <div>
              <div class="font-medium text-primary">${m.name}</div>
              <div class="text-2xs text-muted">${m.category} • Batch: ${m.batchNumber}</div>
            </div>
            <div class="text-right">
              <div class="font-semibold text-sm">₹${m.price.toFixed(2)}</div>
              <div class="text-2xs ${m.stock <= 15 ? 'text-danger' : 'text-success'}">${m.stock} in stock</div>
            </div>
          </div>
        `).join('');
      }

      if (customers.length > 0) {
        html += `<div class="search-section-header"><i class="fa-solid fa-users mr-1"></i> Patients / Customers</div>`;
        html += customers.map(c => `
          <div class="search-result-item" onclick="App.handleGlobalResult('customer', '${c.id}')">
            <div>
              <div class="font-medium">${c.name}</div>
              <div class="text-2xs text-muted">${c.phone}</div>
            </div>
            <div class="text-right text-xs font-semibold text-primary">
              ₹${(c.totalSpent || 0).toFixed(0)} spent
            </div>
          </div>
        `).join('');
      }

      if (prescriptions.length > 0) {
        html += `<div class="search-section-header"><i class="fa-solid fa-file-prescription mr-1"></i> Prescriptions</div>`;
        html += prescriptions.map(p => `
          <div class="search-result-item" onclick="App.handleGlobalResult('prescription', '${p.id}')">
            <div>
              <div class="font-medium">${p.id} - ${p.patientName}</div>
              <div class="text-2xs text-muted">${p.doctorName}</div>
            </div>
            <div class="text-right">
              <span class="badge ${p.status === 'Approved' ? 'badge-info' : 'badge-light'} text-2xs">${p.status}</span>
            </div>
          </div>
        `).join('');
      }

      dropdown.innerHTML = html;
      dropdown.classList.add('active');
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('active');
      }
    });
  },

  handleGlobalResult(type, id) {
    const dropdown = document.getElementById('header-search-results-dropdown');
    if (dropdown) dropdown.classList.remove('active');

    const searchInput = document.getElementById('header-global-search');
    if (searchInput) searchInput.value = '';

    if (type === 'medicine') {
      MedicinesModule.openDetailsModal(id);
    } else if (type === 'customer') {
      CustomersModule.openProfileModal(id);
    } else if (type === 'prescription') {
      PrescriptionsModule.openDetailsModal(id);
    }
  },

  // =================== HEADER ACTIONS ===================
  initHeaderActions() {
    // Quick POS Sale button in header
    const btnQuickSale = document.getElementById('btn-header-quick-sale');
    if (btnQuickSale) {
      btnQuickSale.addEventListener('click', () => {
        this.navigateTo('pos');
      });
    }
  },

  // =================== KEYBOARD SHORTCUTS ===================
  initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Do not process global shortcuts if user is not authenticated
      if (typeof AuthModule !== 'undefined' && !AuthModule.isAuthenticated()) {
        return;
      }

      // Focus global search with Ctrl+K or '/'
      if ((e.ctrlKey && e.key.toLowerCase() === 'k') || (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA')) {
        e.preventDefault();
        const searchInput = document.getElementById('header-global-search');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }

      // Jump to POS with F2
      if (e.key === 'F2') {
        e.preventDefault();
        this.navigateTo('pos');
      }
    });
  }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
