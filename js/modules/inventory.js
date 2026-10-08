/**
 * MediCore Inventory & Stock Management Module
 * Warehouse auditing, expiry detection, stock adjustments, and supplier restock workflows
 */

const InventoryModule = {
  currentFilter: 'all',
  searchQuery: '',

  init() {
    this.render();
    this.attachEvents();

    storage.on('stockUpdated', () => {
      this.render();
    });
    storage.on('medicinesUpdated', () => {
      this.render();
    });
    storage.on('saleCompleted', () => {
      this.render();
    });
  },

  attachEvents() {
    // Inventory search
    const searchInput = document.getElementById('inv-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderTable();
      });
    }

    // Filter pills
    const filterTabs = document.getElementById('inv-filter-tabs');
    if (filterTabs) {
      filterTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.filter-tab-btn');
        if (tab) {
          filterTabs.querySelectorAll('.filter-tab-btn').forEach(b => b.classList.remove('active'));
          tab.classList.add('active');
          this.currentFilter = tab.dataset.filter;
          this.renderTable();
        }
      });
    }

    // Adjustment Modal Add/Remove mode toggle buttons
    const btnAddMode = document.getElementById('btn-adjust-type-add');
    const btnSubMode = document.getElementById('btn-adjust-type-sub');
    const modeInput = document.getElementById('adjust-operation-mode');
    const qtyLabel = document.getElementById('adjust-qty-label');
    const qtyHint = document.getElementById('adjust-qty-hint');

    if (btnAddMode && btnSubMode && modeInput) {
      btnAddMode.addEventListener('click', () => {
        modeInput.value = 'add';
        btnAddMode.classList.add('active');
        btnSubMode.classList.remove('active');
        if (qtyLabel) qtyLabel.textContent = 'Quantity to Add (Units) *';
        if (qtyHint) qtyHint.textContent = 'Quantity will be added to physical balance.';
      });

      btnSubMode.addEventListener('click', () => {
        modeInput.value = 'remove';
        btnSubMode.classList.add('active');
        btnAddMode.classList.remove('active');
        if (qtyLabel) qtyLabel.textContent = 'Quantity to Remove / Deduct (Units) *';
        if (qtyHint) qtyHint.textContent = 'Quantity will be subtracted from physical balance.';
      });
    }

    // Adjustment Modal Form submit
    const adjustForm = document.getElementById('form-stock-adjustment');
    if (adjustForm) {
      adjustForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAdjustmentSubmit();
      });
    }

    // Restock Modal Form submit
    const restockForm = document.getElementById('form-stock-restock');
    if (restockForm) {
      restockForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleRestockSubmit();
      });
    }

    // Export Inventory CSV
    const btnExport = document.getElementById('btn-export-inventory-csv');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        this.exportCSV();
      });
    }
  },

  render() {
    this.renderMetrics();
    this.renderTable();
  },

  renderMetrics() {
    const medicines = storage.getMedicines();
    const settings = storage.getSettings();
    const now = new Date();
    const alertDays = Number(settings.expiryAlertDays || 60);

    let totalItems = 0;
    let totalStockValue = 0;
    let lowStockCount = 0;
    let oosCount = 0;
    let expiringCount = 0;

    medicines.forEach(m => {
      const stock = m.stock || 0;
      const price = m.price || 0;
      totalItems += stock;
      totalStockValue += (stock * price);

      if (stock === 0) {
        oosCount++;
      } else if (stock <= (m.minStock || settings.lowStockThreshold)) {
        lowStockCount++;
      }

      if (m.expiryDate) {
        const diffDays = Math.ceil((new Date(m.expiryDate) - now) / (1000 * 60 * 60 * 24));
        if (diffDays <= alertDays) {
          expiringCount++;
        }
      }
    });

    const elValue = document.getElementById('inv-metric-valuation');
    if (elValue) elValue.textContent = `₹${totalStockValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const elUnits = document.getElementById('inv-metric-units');
    if (elUnits) elUnits.textContent = totalItems.toLocaleString('en-IN');

    const elSkus = document.getElementById('inv-metric-skus');
    if (elSkus) elSkus.textContent = `${medicines.length} Products`;

    const elLow = document.getElementById('inv-metric-reorder');
    if (elLow) elLow.textContent = lowStockCount;

    const elOos = document.getElementById('inv-metric-critical');
    if (elOos) elOos.textContent = oosCount;

    const elExpiring = document.getElementById('inv-metric-expiring');
    if (elExpiring) elExpiring.textContent = expiringCount;
  },

  getFilteredList() {
    let list = storage.getMedicines();
    const settings = storage.getSettings();
    const now = new Date();
    const alertDays = Number(settings.expiryAlertDays || 60);

    // Search query
    if (this.searchQuery) {
      const q = this.searchQuery;
      list = list.filter(m =>
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.genericName && m.genericName.toLowerCase().includes(q)) ||
        (m.batchNumber && m.batchNumber.toLowerCase().includes(q)) ||
        (m.category && m.category.toLowerCase().includes(q))
      );
    }

    // Filter tab: all, low-stock, out-of-stock, expiring, expired
    if (this.currentFilter !== 'all') {
      list = list.filter(m => {
        const isOos = m.stock === 0;
        const isLow = m.stock > 0 && m.stock <= (m.minStock || settings.lowStockThreshold);
        let isExpired = false;
        let isNearExp = false;

        if (m.expiryDate) {
          const diffDays = Math.ceil((new Date(m.expiryDate) - now) / (1000 * 60 * 60 * 24));
          isExpired = diffDays <= 0;
          isNearExp = diffDays > 0 && diffDays <= alertDays;
        }

        switch (this.currentFilter) {
          case 'low-stock': return isLow;
          case 'out-of-stock': return isOos;
          case 'expiring': return isNearExp;
          case 'expired': return isExpired;
          default: return true;
        }
      });
    }

    return list;
  },

  renderTable() {
    const tbody = document.getElementById('inventory-table-tbody');
    if (!tbody) return;

    const list = this.getFilteredList();
    const settings = storage.getSettings();
    const now = new Date();
    const alertDays = Number(settings.expiryAlertDays || 60);

    if (list.length === 0) {
      let emptyTitle = 'No inventory records found';
      let emptyDesc = 'No medicines match the current search query or active filter.';
      let emptyIcon = 'fa-boxes-stacked';

      if (this.currentFilter === 'out-of-stock') {
        emptyTitle = 'No out-of-stock items';
        emptyDesc = 'Inventory is in healthy condition. All catalog medicines currently have stock available.';
        emptyIcon = 'fa-circle-check text-success';
      } else if (this.currentFilter === 'low-stock') {
        emptyTitle = 'No low-stock items';
        emptyDesc = 'No medicines currently meet or fall below the minimum reorder threshold.';
        emptyIcon = 'fa-shield-halved text-success';
      } else if (this.currentFilter === 'expired') {
        emptyTitle = 'No expired medicines';
        emptyDesc = 'Compliance check passed. There are zero expired medicine batches in current inventory.';
        emptyIcon = 'fa-certificate text-success';
      } else if (this.currentFilter === 'expiring') {
        emptyTitle = 'No near-expiry batches';
        emptyDesc = 'Zero medicine batches are due to expire within the standard alert threshold.';
        emptyIcon = 'fa-calendar-check text-info';
      }

      tbody.innerHTML = `
        <tr>
          <td colspan="9">
            <div class="empty-state-card">
              <div class="empty-state-icon-wrapper">
                <i class="fa-solid ${emptyIcon}"></i>
              </div>
              <h3 class="empty-state-title">${emptyTitle}</h3>
              <p class="empty-state-desc">${emptyDesc}</p>
              <div class="empty-state-actions">
                <button type="button" class="btn btn-outline btn-sm" onclick="InventoryModule.resetFilters()">
                  <i class="fa-solid fa-rotate-left"></i> View All Inventory
                </button>
              </div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(m => {
      // Expiry calculation
      let isExpired = false;
      let isNearExp = false;
      let diffDays = null;
      if (m.expiryDate) {
        diffDays = Math.ceil((new Date(m.expiryDate) - now) / (1000 * 60 * 60 * 24));
        isExpired = diffDays <= 0;
        isNearExp = diffDays > 0 && diffDays <= alertDays;
      }

      // Visual severity status badge:
      // OUT OF STOCK (critical red)
      // EXPIRED (critical red)
      // LOW STOCK (warning amber)
      // EXPIRING SOON (warning orange)
      // IN STOCK (success green)
      let statusBadge = '<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> IN STOCK</span>';
      if (m.stock === 0) {
        statusBadge = '<span class="badge badge-danger"><i class="fa-solid fa-circle-xmark"></i> OUT OF STOCK</span>';
      } else if (isExpired) {
        statusBadge = '<span class="badge badge-danger"><i class="fa-solid fa-radiation"></i> EXPIRED</span>';
      } else if (m.stock <= (m.minStock || settings.lowStockThreshold)) {
        statusBadge = '<span class="badge badge-warning"><i class="fa-solid fa-triangle-exclamation"></i> LOW STOCK</span>';
      } else if (isNearExp) {
        statusBadge = '<span class="badge badge-warning" style="background-color: rgba(249, 115, 22, 0.15); color: #f97316;"><i class="fa-solid fa-clock"></i> EXPIRING SOON</span>';
      }

      // Expiry display with visual severity
      let expiryDisplay = '<span class="text-muted">—</span>';
      if (m.expiryDate) {
        if (isExpired) {
          expiryDisplay = `<div class="text-danger font-semibold"><i class="fa-solid fa-triangle-exclamation"></i> ${m.expiryDate}</div><div class="text-2xs text-danger">Expired ${Math.abs(diffDays)}d ago</div>`;
        } else if (isNearExp) {
          expiryDisplay = `<div class="text-warning font-semibold"><i class="fa-solid fa-clock"></i> ${m.expiryDate}</div><div class="text-2xs text-warning">${diffDays} days left</div>`;
        } else {
          expiryDisplay = `<div>${m.expiryDate}</div><div class="text-2xs text-muted">${diffDays} days left</div>`;
        }
      }

      // Automatically calculate stockValue = stock * price
      const price = m.price || 0;
      const stock = m.stock || 0;
      const stockValue = stock * price;

      return `
        <tr>
          <td>
            <div class="font-medium text-primary">${m.name}</div>
            <div class="text-2xs text-muted">${m.genericName || m.category}</div>
          </td>
          <td>
            <span class="font-mono text-xs font-semibold">${m.batchNumber || '—'}</span>
          </td>
          <td>
            <div class="font-semibold ${stock === 0 ? 'text-danger' : (stock <= (m.minStock || settings.lowStockThreshold) ? 'text-warning' : '')}">
              ${stock}
            </div>
          </td>
          <td>
            <span class="text-muted font-medium">${m.minStock || settings.lowStockThreshold}</span>
          </td>
          <td class="text-right">
            <div class="font-semibold">₹${price.toFixed(2)}</div>
          </td>
          <td class="text-right">
            <div class="font-bold text-primary">₹${Number(stockValue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="text-2xs text-muted">${stock} × ₹${price.toFixed(2)}</div>
          </td>
          <td>
            ${expiryDisplay}
          </td>
          <td>
            ${statusBadge}
          </td>
          <td class="text-center table-actions">
            <div class="flex items-center justify-center gap-1">
              <button class="btn btn-outline btn-sm" onclick="InventoryModule.openAdjustmentModal('${m.id}')" title="Stock Adjustment">
                <i class="fa-solid fa-scale-balanced"></i> Adjust
              </button>
              <button class="btn btn-primary btn-sm" onclick="InventoryModule.openRestockModal('${m.id}')" title="Restock Stock">
                <i class="fa-solid fa-truck-ramp-box"></i> Restock
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  resetFilters() {
    this.currentFilter = 'all';
    this.searchQuery = '';
    const searchInput = document.getElementById('inv-search-input');
    if (searchInput) searchInput.value = '';

    const filterTabs = document.getElementById('inv-filter-tabs');
    if (filterTabs) {
      filterTabs.querySelectorAll('.filter-tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.filter === 'all');
      });
    }

    this.renderTable();
    toast.info('Inventory filters reset.');
  },

  openAdjustmentModal(medicineId, defaultMode = 'add', prefillQty = '', prefillReason = '') {
    const med = storage.getMedicineById(medicineId);
    if (!med) return;

    document.getElementById('adjust-med-id').value = med.id;
    document.getElementById('adjust-med-name').textContent = `${med.name} (Batch: ${med.batchNumber})`;
    document.getElementById('adjust-current-stock').textContent = `${med.stock} Units`;

    const deltaInput = document.getElementById('adjust-delta-qty');
    deltaInput.value = prefillQty;

    const modeInput = document.getElementById('adjust-operation-mode');
    const btnAddMode = document.getElementById('btn-adjust-type-add');
    const btnSubMode = document.getElementById('btn-adjust-type-sub');
    const qtyLabel = document.getElementById('adjust-qty-label');
    const qtyHint = document.getElementById('adjust-qty-hint');

    if (defaultMode === 'remove') {
      if (modeInput) modeInput.value = 'remove';
      if (btnSubMode) btnSubMode.classList.add('active');
      if (btnAddMode) btnAddMode.classList.remove('active');
      if (qtyLabel) qtyLabel.textContent = 'Quantity to Remove / Deduct (Units) *';
      if (qtyHint) qtyHint.textContent = 'Quantity will be subtracted from physical balance.';
    } else {
      if (modeInput) modeInput.value = 'add';
      if (btnAddMode) btnAddMode.classList.add('active');
      if (btnSubMode) btnSubMode.classList.remove('active');
      if (qtyLabel) qtyLabel.textContent = 'Quantity to Add (Units) *';
      if (qtyHint) qtyHint.textContent = 'Quantity will be added to physical balance.';
    }

    const reasonInput = document.getElementById('adjust-reason');
    if (prefillReason) {
      reasonInput.value = prefillReason;
    } else {
      reasonInput.value = 'Physical Audit Discrepancy';
    }

    modal.open('modal-stock-adjustment');
  },

  handleAdjustmentSubmit() {
    const medId = document.getElementById('adjust-med-id').value;
    const rawQty = parseInt(document.getElementById('adjust-delta-qty').value, 10);
    const mode = document.getElementById('adjust-operation-mode').value;
    const reason = document.getElementById('adjust-reason').value;

    if (isNaN(rawQty) || rawQty <= 0) {
      toast.warning('Please enter a valid positive quantity.', 'Invalid Value');
      return;
    }

    const delta = mode === 'remove' ? -rawQty : rawQty;
    const med = storage.getMedicineById(medId);
    if (!med) return;

    if (mode === 'remove' && rawQty > med.stock) {
      toast.error(`Cannot remove ${rawQty} units. Current stock is only ${med.stock} units.`, 'Stock Shortage');
      return;
    }

    const success = storage.adjustStock(medId, delta, reason);
    if (success) {
      modal.close('modal-stock-adjustment');
      toast.success(
        `Stock ${mode === 'remove' ? 'deducted' : 'increased'} by ${rawQty} units. New balance: ${med.stock} units.`,
        'Inventory Adjusted'
      );
    }
  },

  openRestockModal(medicineId) {
    const med = storage.getMedicineById(medicineId);
    if (!med) return;

    document.getElementById('restock-med-id').value = med.id;
    document.getElementById('restock-med-name').textContent = `${med.name} (Current Stock: ${med.stock})`;
    document.getElementById('restock-qty').value = 50;
    document.getElementById('restock-cost').value = med.purchasePrice || 0;

    // Populate suppliers dropdown
    const suppliers = storage.getSuppliers();
    const supSelect = document.getElementById('restock-supplier-select');
    if (supSelect) {
      supSelect.innerHTML = suppliers.map(s => `
        <option value="${s.id}" ${s.id === med.supplierId ? 'selected' : ''}>${s.name}</option>
      `).join('');
    }

    modal.open('modal-stock-restock');
  },

  handleRestockSubmit() {
    const medId = document.getElementById('restock-med-id').value;
    const qty = parseInt(document.getElementById('restock-qty').value, 10);
    const cost = parseFloat(document.getElementById('restock-cost').value) || 0;
    const supplierId = document.getElementById('restock-supplier-select').value;

    if (isNaN(qty) || qty <= 0) {
      toast.warning('Please enter a valid restock quantity greater than 0.');
      return;
    }

    const success = storage.restockMedicine(medId, qty, supplierId, cost);
    if (success) {
      modal.close('modal-stock-restock');
      toast.success(`Restocked +${qty} units successfully.`, 'Inventory Replenished');
    }
  },

  exportCSV() {
    const medicines = storage.getMedicines();
    if (medicines.length === 0) return;

    const headers = ['Medicine Name', 'Batch', 'Stock Units', 'Minimum Stock', 'Unit Price (INR)', 'Stock Value (INR)', 'Expiry Date', 'Status'];
    const now = new Date();
    const settings = storage.getSettings();

    const rows = medicines.map(m => {
      const stock = m.stock || 0;
      const price = m.price || 0;
      const stockVal = (stock * price).toFixed(2);
      let status = 'In Stock';
      if (stock === 0) status = 'Out of Stock';
      else if (stock <= (m.minStock || settings.lowStockThreshold)) status = 'Low Stock';
      if (m.expiryDate) {
        const diff = Math.ceil((new Date(m.expiryDate) - now) / (1000 * 60 * 60 * 24));
        if (diff <= 0) status = 'Expired';
        else if (diff <= Number(settings.expiryAlertDays || 60)) status = 'Expiring Soon';
      }

      return [
        `"${m.name}"`,
        `"${m.batchNumber || ''}"`,
        stock,
        m.minStock || settings.lowStockThreshold,
        price.toFixed(2),
        stockVal,
        `"${m.expiryDate || ''}"`,
        `"${status}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `MediCore_Inventory_Audit_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Inventory audit exported as CSV.');
  }
};
