/**
 * MediCore Settings & Configuration Module
 * Store profile, tax rates, inventory thresholds, dark mode switch, and backup/restore
 */

const SettingsModule = {
  init() {
    this.populateForm();
    this.attachEvents();

    storage.on('settingsUpdated', () => {
      this.populateForm();
    });
  },

  populateForm() {
    const s = storage.getSettings();

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val !== undefined ? val : '';
    };

    setVal('set-pharmacy-name', s.pharmacyName);
    setVal('set-tagline', s.tagline);
    setVal('set-address', s.address);
    setVal('set-phone', s.phone);
    setVal('set-email', s.email);
    setVal('set-dl-number', s.dlNumber);
    setVal('set-gstin', s.gstin);
    setVal('set-default-gst', s.defaultGst || 12);
    setVal('set-low-threshold', s.lowStockThreshold || 20);
    setVal('set-expiry-days', s.expiryAlertDays || 60);

    const themeToggle = document.getElementById('set-theme-toggle');
    if (themeToggle) {
      themeToggle.checked = s.theme === 'dark';
    }

    const soundToggle = document.getElementById('set-sound-toggle');
    if (soundToggle) {
      soundToggle.checked = Boolean(s.enableSoundAlerts);
    }

    // Update pharmacy brand name in sidebar / topbar
    const brandNameEl = document.getElementById('app-brand-store-name');
    if (brandNameEl) brandNameEl.textContent = s.pharmacyName;
  },

  attachEvents() {
    // Form submit
    const formSettings = document.getElementById('form-settings-general');
    if (formSettings) {
      formSettings.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveGeneralSettings();
      });
    }

    // Theme toggle switch in settings
    const themeToggle = document.getElementById('set-theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('change', (e) => {
        const isDark = e.target.checked;
        App.setTheme(isDark ? 'dark' : 'light');
      });
    }

    // Reset Demo Data button
    const btnReset = document.getElementById('btn-reset-demo-data');
    if (btnReset) {
      btnReset.addEventListener('click', async () => {
        const confirmed = await modal.confirm({
          title: 'Reset Demo Database',
          message: 'Are you sure you want to restore the initial Indian pharmacy dataset?<br><br><span class="text-xs text-muted">All custom medicines, orders, customers, and inventory adjustments will be overwritten with clean baseline demo data.</span>',
          confirmText: 'Reset to Defaults',
          cancelText: 'Keep Current Data',
          danger: true,
          icon: 'fa-database'
        });

        if (confirmed) {
          storage.resetToDefaults();
          toast.success('Database reset to initial demo dataset successfully.', 'Data Reset');
          setTimeout(() => {
            window.location.reload();
          }, 600);
        }
      });
    }

    // Export Backup JSON
    const btnExport = document.getElementById('btn-export-backup-json');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        const backupJson = storage.exportBackup();
        const blob = new Blob([backupJson], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `MediCore_Backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        toast.success('Full database backup exported as JSON.', 'Backup Downloaded');
      });
    }

    // Import Backup File
    const fileInput = document.getElementById('input-import-backup-file');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          const res = storage.importBackup(event.target.result);
          if (res.success) {
            toast.success('Database restored successfully from backup file!', 'Restore Complete');
            setTimeout(() => {
              window.location.reload();
            }, 700);
          } else {
            toast.error('Failed to parse backup JSON file: ' + res.error, 'Import Failed');
          }
        };
        reader.readAsText(file);
      });
    }
  },

  saveGeneralSettings() {
    const pharmacyName = document.getElementById('set-pharmacy-name').value.trim();
    const tagline = document.getElementById('set-tagline').value.trim();
    const address = document.getElementById('set-address').value.trim();
    const phone = document.getElementById('set-phone').value.trim();
    const email = document.getElementById('set-email').value.trim();
    const dlNumber = document.getElementById('set-dl-number').value.trim();
    const gstin = document.getElementById('set-gstin').value.trim();
    const defaultGst = parseFloat(document.getElementById('set-default-gst').value) || 12;
    const lowStockThreshold = parseInt(document.getElementById('set-low-threshold').value, 10) || 20;
    const expiryAlertDays = parseInt(document.getElementById('set-expiry-days').value, 10) || 60;
    const enableSoundAlerts = document.getElementById('set-sound-toggle')?.checked || true;

    if (!pharmacyName) {
      toast.error('Pharmacy name is required.');
      return;
    }

    storage.saveSettings({
      pharmacyName,
      tagline,
      address,
      phone,
      email,
      dlNumber,
      gstin,
      defaultGst,
      lowStockThreshold,
      expiryAlertDays,
      enableSoundAlerts
    });

    toast.success('Settings and tax configuration saved successfully.', 'Settings Updated');
  }
};
