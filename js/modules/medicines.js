/**
 * MediCore Medicines Management Module
 * Comprehensive catalog CRUD, batch & expiry monitoring, filtering, and stock status
 */

const MedicinesModule = {
  currentFilterCategory: 'All',
  currentFilterStatus: 'All',
  currentSearchTerm: '',
  currentSort: 'name-asc',

  init() {
    this.render();
    this.populateCategoryFilters();
    this.attachEvents();

    storage.on('medicinesUpdated', () => {
      this.render();
    });
    storage.on('stockUpdated', () => {
      this.render();
    });
  },

  attachEvents() {
    // Search input
    const searchInput = document.getElementById('med-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.currentSearchTerm = e.target.value.trim().toLowerCase();
        this.renderTable();
      });
    }

    // Category filter select
    const catSelect = document.getElementById('med-category-filter');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        this.currentFilterCategory = e.target.value;
        this.renderTable();
      });
    }

    // Status filter select
    const statusSelect = document.getElementById('med-status-filter');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        this.currentFilterStatus = e.target.value;
        this.renderTable();
      });
    }

    // Sort select
    const sortSelect = document.getElementById('med-sort-by');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.currentSort = e.target.value;
        this.renderTable();
      });
    }

    // Add Medicine button
    const btnAdd = document.getElementById('btn-add-medicine');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        this.openAddModal();
      });
    }

    // Export CSV button
    const btnExport = document.getElementById('btn-export-medicines-csv');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        this.exportToCSV();
      });
    }

    // Medicine form submit
    const medForm = document.getElementById('form-medicine-edit');
    if (medForm) {
      medForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit();
      });
    }
  },

  populateCategoryFilters() {
    const medicines = storage.getMedicines();
    const categories = ['All', ...new Set(medicines.map(m => m.category).filter(Boolean))].sort();

    const catSelect = document.getElementById('med-category-filter');
    if (catSelect) {
      catSelect.innerHTML = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    }

    const modalCatSelect = document.getElementById('med-input-category');
    if (modalCatSelect) {
      modalCatSelect.innerHTML = categories.filter(c => c !== 'All').map(cat => `<option value="${cat}">${cat}</option>`).join('');
    }

    // Also populate supplier dropdown in add/edit modal
    this.populateSupplierDropdown();
  },

  populateSupplierDropdown() {
    const suppliers = storage.getSuppliers();
    const supSelect = document.getElementById('med-input-supplier');
    if (supSelect) {
      supSelect.innerHTML = suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }
  },

  getFilteredMedicines() {
    let list = storage.getMedicines();
    const settings = storage.getSettings();
    const now = new Date();
    const expiryDaysThreshold = Number(settings.expiryAlertDays || 60);

    // 1. Text Search
    if (this.currentSearchTerm) {
      const q = this.currentSearchTerm;
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        (m.genericName && m.genericName.toLowerCase().includes(q)) ||
        (m.batchNumber && m.batchNumber.toLowerCase().includes(q)) ||
        (m.category && m.category.toLowerCase().includes(q))
      );
    }

    // 2. Category Filter
    if (this.currentFilterCategory !== 'All') {
      list = list.filter(m => m.category === this.currentFilterCategory);
    }

    // 3. Status Filter
    if (this.currentFilterStatus !== 'All') {
      list = list.filter(m => {
        const isOOS = m.stock === 0;
        const isLow = m.stock > 0 && m.stock <= (m.minStock || settings.lowStockThreshold);
        
        let isExpired = false;
        let isNearExpiry = false;
        if (m.expiryDate) {
          const diffDays = Math.ceil((new Date(m.expiryDate) - now) / (1000 * 60 * 60 * 24));
          isExpired = diffDays <= 0;
          isNearExpiry = diffDays > 0 && diffDays <= expiryDaysThreshold;
        }

        switch (this.currentFilterStatus) {
          case 'in-stock': return m.stock > (m.minStock || settings.lowStockThreshold);
          case 'low-stock': return isLow;
          case 'out-of-stock': return isOOS;
          case 'expiring': return isNearExpiry;
          case 'expired': return isExpired;
          default: return true;
        }
      });
    }

    // 4. Sorting
    list.sort((a, b) => {
      switch (this.currentSort) {
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'price-low': return a.price - b.price;
        case 'price-high': return b.price - a.price;
        case 'stock-low': return a.stock - b.stock;
        case 'stock-high': return b.stock - a.stock;
        case 'expiry-asc': return new Date(a.expiryDate || '2099-01-01') - new Date(b.expiryDate || '2099-01-01');
        default: return 0;
      }
    });

    return list;
  },

  render() {
    this.renderMetricsSummary();
    this.renderTable();
  },

  renderMetricsSummary() {
    const medicines = storage.getMedicines();
    const settings = storage.getSettings();
    const now = new Date();

    let totalStockUnits = 0;
    let lowCount = 0;
    let oosCount = 0;
    let expiredCount = 0;

    medicines.forEach(m => {
      totalStockUnits += (m.stock || 0);
      if (m.stock === 0) oosCount++;
      else if (m.stock <= (m.minStock || settings.lowStockThreshold)) lowCount++;

      if (m.expiryDate) {
        const diffDays = Math.ceil((new Date(m.expiryDate) - now) / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) expiredCount++;
      }
    });

    const elTotal = document.getElementById('med-metric-total');
    if (elTotal) elTotal.textContent = medicines.length;

    const elUnits = document.getElementById('med-metric-units');
    if (elUnits) elUnits.textContent = totalStockUnits.toLocaleString('en-IN');

    const elLow = document.getElementById('med-metric-low');
    if (elLow) elLow.textContent = lowCount;

    const elOos = document.getElementById('med-metric-oos');
    if (elOos) elOos.textContent = oosCount;
  },

  resetFilters() {
    this.currentFilterCategory = 'All';
    this.currentFilterStatus = 'All';
    this.currentSearchTerm = '';
    this.currentSort = 'name-asc';

    const searchInput = document.getElementById('med-search-input');
    if (searchInput) searchInput.value = '';

    const catSelect = document.getElementById('med-category-filter');
    if (catSelect) catSelect.value = 'All';

    const statusSelect = document.getElementById('med-status-filter');
    if (statusSelect) statusSelect.value = 'All';

    const sortSelect = document.getElementById('med-sort-by');
    if (sortSelect) sortSelect.value = 'name-asc';

    this.renderTable();
    toast.info('Medicine filters reset to defaults.');
  },

  renderTable() {
    const tbody = document.getElementById('medicines-table-tbody');
    if (!tbody) return;

    const medicines = this.getFilteredMedicines();
    const settings = storage.getSettings();
    const now = new Date();

    if (medicines.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state-card">
              <div class="empty-state-icon-wrapper">
                <i class="fa-solid fa-prescription-bottle-medical"></i>
              </div>
              <h3 class="empty-state-title">No medicines found</h3>
              <p class="empty-state-desc">We couldn't find any medications matching your search query or active filter combination.</p>
              <div class="empty-state-actions">
                <button type="button" class="btn btn-outline btn-sm" onclick="MedicinesModule.resetFilters()">
                  <i class="fa-solid fa-rotate-left"></i> Reset Filters
                </button>
                <button type="button" class="btn btn-primary btn-sm" onclick="MedicinesModule.openAddModal()">
                  <i class="fa-solid fa-plus"></i> Add New Medicine
                </button>
              </div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = medicines.map(m => {
      // Expiry status
      let expiryBadge = `<span class="badge badge-success">${m.expiryDate}</span>`;
      let isExpired = false;
      let isNearExpiry = false;

      if (m.expiryDate) {
        const diffDays = Math.ceil((new Date(m.expiryDate) - now) / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) {
          expiryBadge = `<span class="badge badge-danger"><i class="fa-solid fa-triangle-exclamation"></i> Expired</span>`;
          isExpired = true;
        } else if (diffDays <= Number(settings.expiryAlertDays || 60)) {
          expiryBadge = `<span class="badge badge-warning" title="${diffDays} days remaining">${m.expiryDate} (${diffDays}d)</span>`;
          isNearExpiry = true;
        } else {
          expiryBadge = `<span class="badge badge-light text-muted">${m.expiryDate}</span>`;
        }
      }

      // Stock status badge
      let stockDisplay = '';
      if (m.stock === 0) {
        stockDisplay = `<span class="badge badge-danger">Out of Stock (0)</span>`;
      } else if (m.stock <= (m.minStock || settings.lowStockThreshold)) {
        stockDisplay = `<span class="badge badge-warning font-semibold">${m.stock} units (Low)</span>`;
      } else {
        stockDisplay = `<span class="font-semibold text-success">${m.stock} units</span>`;
      }

      return `
        <tr class="${isExpired ? 'row-expired' : ''}">
          <td>
            <div class="font-semibold text-primary med-name-link" onclick="MedicinesModule.openDetailsModal('${m.id}')">
              ${m.name}
              ${m.requiresPrescription ? '<span class="badge badge-purple text-2xs ml-1" title="Prescription Required">Rx</span>' : ''}
            </div>
            <div class="text-xs text-muted">${m.genericName || '—'}</div>
          </td>
          <td>
            <span class="badge badge-light">${m.category}</span>
          </td>
          <td>
            <span class="font-mono text-xs font-semibold">${m.batchNumber || 'N/A'}</span>
            <div class="text-2xs text-muted">${m.rackLocation || 'Shelf'}</div>
          </td>
          <td>
            ${expiryBadge}
          </td>
          <td class="text-right">
            <span class="font-semibold">₹${Number(m.price).toFixed(2)}</span>
            <div class="text-2xs text-muted">GST: ${m.gst || 12}%</div>
          </td>
          <td>
            ${stockDisplay}
            <div class="text-2xs text-muted">Min: ${m.minStock || 15}</div>
          </td>
          <td>
            <div class="text-xs font-medium text-truncate max-w-120" title="${m.supplierName || ''}">
              ${m.supplierName || 'Direct'}
            </div>
          </td>
          <td class="text-center table-actions">
            <button class="btn btn-icon btn-sm" title="View Monograph" onclick="MedicinesModule.openDetailsModal('${m.id}')">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button class="btn btn-icon btn-sm" title="Edit Medicine" onclick="MedicinesModule.openEditModal('${m.id}')">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn btn-icon btn-sm" title="Restock" onclick="InventoryModule.openRestockModal('${m.id}')">
              <i class="fa-solid fa-truck-ramp-box"></i>
            </button>
            <button class="btn btn-icon btn-sm text-danger" title="Delete Medicine" onclick="MedicinesModule.confirmDelete('${m.id}')">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal() {
    const form = document.getElementById('form-medicine-edit');
    if (form) form.reset();

    const titleEl = document.getElementById('modal-medicine-title');
    if (titleEl) titleEl.textContent = 'Add New Medicine';

    document.getElementById('med-input-id').value = '';
    
    // Default dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('med-input-mfg').value = today;

    // Set expiry 2 years ahead by default
    const expDate = new Date();
    expDate.setFullYear(expDate.getFullYear() + 2);
    document.getElementById('med-input-expiry').value = expDate.toISOString().split('T')[0];

    // Populate suppliers
    this.populateSupplierDropdown();

    modal.open('modal-medicine-form');
  },

  openEditModal(id) {
    const med = storage.getMedicineById(id);
    if (!med) return;

    this.populateSupplierDropdown();

    const titleEl = document.getElementById('modal-medicine-title');
    if (titleEl) titleEl.textContent = `Edit Medicine: ${med.name}`;

    document.getElementById('med-input-id').value = med.id;
    document.getElementById('med-input-name').value = med.name || '';
    document.getElementById('med-input-generic').value = med.genericName || '';
    document.getElementById('med-input-category').value = med.category || 'General';
    document.getElementById('med-input-batch').value = med.batchNumber || '';
    document.getElementById('med-input-mfg').value = med.mfgDate || '';
    document.getElementById('med-input-expiry').value = med.expiryDate || '';
    document.getElementById('med-input-purchase-price').value = med.purchasePrice || '';
    document.getElementById('med-input-price').value = med.price || '';
    document.getElementById('med-input-gst').value = med.gst || 12;
    document.getElementById('med-input-stock').value = med.stock !== undefined ? med.stock : 0;
    document.getElementById('med-input-minstock').value = med.minStock || 15;
    document.getElementById('med-input-rack').value = med.rackLocation || '';
    document.getElementById('med-input-supplier').value = med.supplierId || '';
    document.getElementById('med-input-rx').checked = Boolean(med.requiresPrescription);
    document.getElementById('med-input-desc').value = med.description || '';

    modal.open('modal-medicine-form');
  },

  handleFormSubmit() {
    const id = document.getElementById('med-input-id').value;
    const name = document.getElementById('med-input-name').value.trim();
    const genericName = document.getElementById('med-input-generic').value.trim();
    const category = document.getElementById('med-input-category').value;
    const batchNumber = document.getElementById('med-input-batch').value.trim();
    const mfgDate = document.getElementById('med-input-mfg').value;
    const expiryDate = document.getElementById('med-input-expiry').value;
    const purchasePrice = parseFloat(document.getElementById('med-input-purchase-price').value) || 0;
    const price = parseFloat(document.getElementById('med-input-price').value) || 0;
    const gst = parseFloat(document.getElementById('med-input-gst').value) || 12;
    const stock = parseInt(document.getElementById('med-input-stock').value, 10) || 0;
    const minStock = parseInt(document.getElementById('med-input-minstock').value, 10) || 15;
    const rackLocation = document.getElementById('med-input-rack').value.trim();
    const supplierId = document.getElementById('med-input-supplier').value;
    const requiresPrescription = document.getElementById('med-input-rx').checked;
    const description = document.getElementById('med-input-desc').value.trim();

    if (!name || !batchNumber || !expiryDate || price <= 0) {
      toast.error('Please enter valid medicine name, batch number, expiry date and price.', 'Validation Error');
      return;
    }

    const supplier = storage.getSupplierById(supplierId);
    const supplierName = supplier ? supplier.name : 'Direct Wholesaler';

    const medicineData = {
      name,
      genericName,
      category,
      batchNumber,
      mfgDate,
      expiryDate,
      purchasePrice,
      price,
      gst,
      stock,
      minStock,
      rackLocation,
      requiresPrescription,
      supplierId,
      supplierName,
      description
    };

    if (id) {
      medicineData.id = id;
    }

    storage.saveMedicine(medicineData);
    modal.close('modal-medicine-form');
    toast.success(`Medicine ${name} successfully saved.`, 'Catalog Updated');
  },

  openDetailsModal(id) {
    const med = storage.getMedicineById(id);
    if (!med) return;

    const modalBody = document.getElementById('med-details-modal-body');
    if (!modalBody) return;

    const profitPerUnit = (med.price - (med.purchasePrice || 0)).toFixed(2);
    const marginPct = med.price > 0 ? (((med.price - (med.purchasePrice || 0)) / med.price) * 100).toFixed(1) : 0;

    modalBody.innerHTML = `
      <div class="med-detail-card">
        <div class="med-detail-header">
          <div>
            <h3>${med.name}</h3>
            <p class="text-muted text-sm">${med.genericName || 'No generic details'}</p>
          </div>
          <div class="text-right">
            <span class="badge ${med.requiresPrescription ? 'badge-purple' : 'badge-light'}">
              ${med.requiresPrescription ? 'Prescription Required (Schedule H/X)' : 'Over The Counter (OTC)'}
            </span>
          </div>
        </div>

        <div class="med-detail-grid">
          <div class="detail-box">
            <span class="detail-label">Category</span>
            <span class="detail-val font-semibold">${med.category}</span>
          </div>
          <div class="detail-box">
            <span class="detail-label">Batch Number</span>
            <span class="detail-val font-mono font-semibold">${med.batchNumber}</span>
          </div>
          <div class="detail-box">
            <span class="detail-label">Expiry Date</span>
            <span class="detail-val font-semibold">${med.expiryDate}</span>
          </div>
          <div class="detail-box">
            <span class="detail-label">Current Stock</span>
            <span class="detail-val font-bold ${med.stock <= med.minStock ? 'text-danger' : 'text-success'}">
              ${med.stock} Units (Min: ${med.minStock})
            </span>
          </div>
          <div class="detail-box">
            <span class="detail-label">MRP / Unit Price</span>
            <span class="detail-val font-bold text-primary">₹${med.price.toFixed(2)}</span>
          </div>
          <div class="detail-box">
            <span class="detail-label">Purchase Cost</span>
            <span class="detail-val">₹${(med.purchasePrice || 0).toFixed(2)}</span>
          </div>
          <div class="detail-box">
            <span class="detail-label">GST Tax Rate</span>
            <span class="detail-val">${med.gst || 12}%</span>
          </div>
          <div class="detail-box">
            <span class="detail-label">Profit Margin</span>
            <span class="detail-val font-semibold text-success">₹${profitPerUnit} (${marginPct}%)</span>
          </div>
          <div class="detail-box">
            <span class="detail-label">Rack Location</span>
            <span class="detail-val">${med.rackLocation || 'Unassigned'}</span>
          </div>
          <div class="detail-box">
            <span class="detail-label">Primary Vendor</span>
            <span class="detail-val">${med.supplierName || 'Direct Wholesaler'}</span>
          </div>
        </div>

        ${med.description ? `
          <div class="med-detail-desc mt-3">
            <span class="detail-label">Clinical Indication & Notes</span>
            <p class="text-sm mt-1 text-secondary">${med.description}</p>
          </div>
        ` : ''}

        <div class="modal-actions-bar mt-4">
          <button type="button" class="btn btn-outline" onclick="modal.close('modal-medicine-details')">Close</button>
          <button type="button" class="btn btn-warning" onclick="modal.close('modal-medicine-details'); InventoryModule.openRestockModal('${med.id}')">
            <i class="fa-solid fa-truck-ramp-box"></i> Restock Stock
          </button>
          <button type="button" class="btn btn-secondary" onclick="modal.close('modal-medicine-details'); MedicinesModule.openEditModal('${med.id}')">
            <i class="fa-solid fa-pen-to-square"></i> Edit Details
          </button>
          <button type="button" class="btn btn-primary" onclick="modal.close('modal-medicine-details'); POSModule.quickAddToCart('${med.id}')">
            <i class="fa-solid fa-cart-plus"></i> Add to POS Cart
          </button>
        </div>
      </div>
    `;

    modal.open('modal-medicine-details');
  },

  async confirmDelete(id) {
    const med = storage.getMedicineById(id);
    if (!med) return;

    const confirmed = await modal.confirm({
      title: 'Delete Medicine',
      message: `Are you sure you want to permanently delete <strong>${med.name}</strong> (Batch: <code>${med.batchNumber}</code>) from inventory?<br><br><span class="text-xs text-muted">This will remove the item from all catalogs, search indexes, and inventory audits.</span>`,
      confirmText: 'Delete Medicine',
      cancelText: 'Keep Medicine',
      danger: true,
      icon: 'fa-trash-can'
    });

    if (confirmed) {
      storage.deleteMedicine(id);
      toast.success(`${med.name} removed from inventory.`, 'Item Deleted');
    }
  },

  exportToCSV() {
    const medicines = storage.getMedicines();
    if (medicines.length === 0) {
      toast.warning('No medicines available to export.');
      return;
    }

    const headers = ['ID', 'Name', 'Generic Name', 'Category', 'Batch', 'Expiry Date', 'Cost Price', 'MRP Price', 'GST %', 'Stock', 'Min Stock', 'Rack', 'Supplier'];
    const rows = medicines.map(m => [
      `"${m.id}"`,
      `"${m.name}"`,
      `"${m.genericName || ''}"`,
      `"${m.category}"`,
      `"${m.batchNumber}"`,
      `"${m.expiryDate}"`,
      m.purchasePrice || 0,
      m.price,
      m.gst || 12,
      m.stock,
      m.minStock,
      `"${m.rackLocation || ''}"`,
      `"${m.supplierName || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MediCore_Medicines_Catalog_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Medicines catalog exported as CSV.', 'Export Complete');
  }
};
