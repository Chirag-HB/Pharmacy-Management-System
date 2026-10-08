/**
 * MediCore Suppliers & Procurement Module
 * Wholesaler directory, procurement purchase orders, payment terms, and vendor balances
 */

const SuppliersModule = {
  searchQuery: '',
  poDraftItems: [],

  init() {
    this.render();
    this.attachEvents();

    storage.on('suppliersUpdated', () => {
      this.render();
    });
  },

  attachEvents() {
    // Search input
    const searchInput = document.getElementById('sup-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderTable();
      });
    }

    // Add supplier button
    const btnAdd = document.getElementById('btn-add-supplier');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        this.openAddModal();
      });
    }

    // New PO button
    const btnNewPo = document.getElementById('btn-create-po');
    if (btnNewPo) {
      btnNewPo.addEventListener('click', () => {
        this.openPOModal();
      });
    }

    // Supplier Form submit
    const formSup = document.getElementById('form-supplier-edit');
    if (formSup) {
      formSup.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit();
      });
    }

    // PO Form submit
    const formPO = document.getElementById('form-purchase-order');
    if (formPO) {
      formPO.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handlePOSubmit();
      });
    }

    // Add item to PO draft
    const btnAddPoItem = document.getElementById('btn-po-add-draft-item');
    if (btnAddPoItem) {
      btnAddPoItem.addEventListener('click', () => {
        this.addDraftPOItem();
      });
    }
  },

  render() {
    this.renderMetrics();
    this.renderTable();
  },

  renderMetrics() {
    const suppliers = storage.getSuppliers();

    const totalSuppliers = suppliers.length;
    const totalPendingOrders = suppliers.reduce((sum, s) => sum + (s.pendingOrders || 0), 0);
    const totalBalanceDue = suppliers.reduce((sum, s) => sum + (s.balanceDue || 0), 0);

    const elTotal = document.getElementById('sup-metric-total');
    if (elTotal) elTotal.textContent = totalSuppliers;

    const elPending = document.getElementById('sup-metric-pending-orders');
    if (elPending) elPending.textContent = totalPendingOrders;

    const elBalance = document.getElementById('sup-metric-balance-due');
    if (elBalance) elBalance.textContent = `₹${totalBalanceDue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  },

  getFilteredSuppliers() {
    let list = storage.getSuppliers();

    if (this.searchQuery) {
      const q = this.searchQuery;
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.gstin && s.gstin.toLowerCase().includes(q))
      );
    }

    return list;
  },

  renderTable() {
    const tbody = document.getElementById('suppliers-table-tbody');
    if (!tbody) return;

    const list = this.getFilteredSuppliers();

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state-card">
              <div class="empty-state-icon-wrapper">
                <i class="fa-solid fa-truck-field"></i>
              </div>
              <h3 class="empty-state-title">No wholesalers found</h3>
              <p class="empty-state-desc">No registered distributor or manufacturer matches your search criteria.</p>
              <div class="empty-state-actions">
                <button type="button" class="btn btn-outline btn-sm" onclick="SuppliersModule.resetSearch()">
                  <i class="fa-solid fa-rotate-left"></i> View All Wholesalers
                </button>
                <button type="button" class="btn btn-primary btn-sm" onclick="SuppliersModule.openAddModal()">
                  <i class="fa-solid fa-plus"></i> Add New Wholesaler
                </button>
              </div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(s => {
      const cats = (s.categoriesSupplied || []).join(', ') || 'General Pharmaceuticals';

      return `
        <tr>
          <td>
            <div class="font-semibold text-primary">${s.name}</div>
            <div class="text-2xs text-muted">Contact: ${s.contactPerson || 'Sales Team'}</div>
          </td>
          <td>
            <div class="font-medium">${s.phone}</div>
            <div class="text-2xs text-muted">${s.email || '—'}</div>
          </td>
          <td>
            <span class="font-mono text-xs">${s.gstin || 'Not Provided'}</span>
            <div class="text-2xs text-muted">Terms: ${s.paymentTerms || 'Net 30'}</div>
          </td>
          <td>
            <div class="text-xs text-truncate max-w-160" title="${cats}">
              ${cats}
            </div>
          </td>
          <td class="text-center font-semibold">
            ${s.pendingOrders > 0 ? `<span class="badge badge-warning">${s.pendingOrders} Orders</span>` : '<span class="badge badge-light">0 Active</span>'}
          </td>
          <td class="text-right font-semibold ${s.balanceDue > 0 ? 'text-danger' : 'text-success'}">
            ₹${Number(s.balanceDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </td>
          <td class="text-center table-actions">
            <button class="btn btn-outline btn-sm" title="Create PO" onclick="SuppliersModule.openPOModal('${s.id}')">
              <i class="fa-solid fa-cart-flatbed"></i> Order
            </button>
            <button class="btn btn-icon btn-sm" title="Edit Vendor" onclick="SuppliersModule.openEditModal('${s.id}')">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn btn-icon btn-sm text-danger" title="Delete" onclick="SuppliersModule.confirmDelete('${s.id}')">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal() {
    const form = document.getElementById('form-supplier-edit');
    if (form) form.reset();

    document.getElementById('modal-supplier-title').textContent = 'Add Pharmaceutical Wholesaler';
    document.getElementById('sup-input-id').value = '';

    modal.open('modal-supplier-form');
  },

  openEditModal(id) {
    const s = storage.getSupplierById(id);
    if (!s) return;

    document.getElementById('modal-supplier-title').textContent = `Edit Wholesaler: ${s.name}`;
    document.getElementById('sup-input-id').value = s.id;
    document.getElementById('sup-input-name').value = s.name || '';
    document.getElementById('sup-input-contact').value = s.contactPerson || '';
    document.getElementById('sup-input-phone').value = s.phone || '';
    document.getElementById('sup-input-email').value = s.email || '';
    document.getElementById('sup-input-address').value = s.address || '';
    document.getElementById('sup-input-gstin').value = s.gstin || '';
    document.getElementById('sup-input-terms').value = s.paymentTerms || 'Net 30 Days';
    document.getElementById('sup-input-lead').value = s.leadTimeDays || 2;

    modal.open('modal-supplier-form');
  },

  handleFormSubmit() {
    const id = document.getElementById('sup-input-id').value;
    const name = document.getElementById('sup-input-name').value.trim();
    const contactPerson = document.getElementById('sup-input-contact').value.trim();
    const phone = document.getElementById('sup-input-phone').value.trim();
    const email = document.getElementById('sup-input-email').value.trim();
    const address = document.getElementById('sup-input-address').value.trim();
    const gstin = document.getElementById('sup-input-gstin').value.trim();
    const paymentTerms = document.getElementById('sup-input-terms').value;
    const leadTimeDays = parseInt(document.getElementById('sup-input-lead').value, 10) || 2;

    if (!name || !phone) {
      toast.error('Supplier company name and phone are required.');
      return;
    }

    const supplierData = {
      name,
      contactPerson,
      phone,
      email,
      address,
      gstin,
      paymentTerms,
      leadTimeDays
    };

    if (id) {
      supplierData.id = id;
    }

    storage.saveSupplier(supplierData);
    modal.close('modal-supplier-form');
    toast.success(`Supplier ${name} saved successfully.`, 'Procurement Updated');
  },

  openPOModal(prefillSupplierId = null) {
    const form = document.getElementById('form-purchase-order');
    if (form) form.reset();

    this.poDraftItems = [];
    this.renderPODraftItems();

    // Populate supplier select
    const suppliers = storage.getSuppliers();
    const select = document.getElementById('po-supplier-select');
    if (select) {
      select.innerHTML = suppliers.map(s => `
        <option value="${s.id}" ${s.id === prefillSupplierId ? 'selected' : ''}>${s.name}</option>
      `).join('');
    }

    // Populate medicines list
    this.populatePOMedicineSelect();

    modal.open('modal-purchase-order');
  },

  populatePOMedicineSelect() {
    const select = document.getElementById('po-med-select');
    if (!select) return;

    const medicines = storage.getMedicines();
    select.innerHTML = `
      <option value="">-- Choose Medicine --</option>
      ${medicines.map(m => `
        <option value="${m.id}" data-cost="${m.purchasePrice || 50}">${m.name} (Stock: ${m.stock})</option>
      `).join('')}
    `;
  },

  addDraftPOItem() {
    const select = document.getElementById('po-med-select');
    const qtyInput = document.getElementById('po-med-qty');
    const costInput = document.getElementById('po-med-unit-cost');

    const medId = select.value;
    const qty = parseInt(qtyInput.value, 10) || 50;
    const cost = parseFloat(costInput.value) || 0;

    if (!medId) {
      toast.warning('Please select a medicine for the purchase order.');
      return;
    }

    const med = storage.getMedicineById(medId);
    if (!med) return;

    this.poDraftItems.push({
      medicineId: med.id,
      medicineName: med.name,
      quantity: qty,
      unitCost: cost > 0 ? cost : (med.purchasePrice || 50),
      total: (cost > 0 ? cost : (med.purchasePrice || 50)) * qty
    });

    select.value = '';
    qtyInput.value = '50';
    costInput.value = '';

    this.renderPODraftItems();
  },

  removeDraftPOItem(index) {
    this.poDraftItems.splice(index, 1);
    this.renderPODraftItems();
  },

  renderPODraftItems() {
    const container = document.getElementById('po-draft-items-list');
    const totalEl = document.getElementById('po-estimated-total');
    if (!container) return;

    const grandTotal = this.poDraftItems.reduce((sum, item) => sum + item.total, 0);
    if (totalEl) totalEl.textContent = `₹${grandTotal.toFixed(2)}`;

    if (this.poDraftItems.length === 0) {
      container.innerHTML = `<div class="text-xs text-muted py-2">No medicines added to purchase order yet.</div>`;
      return;
    }

    container.innerHTML = this.poDraftItems.map((item, idx) => `
      <div class="po-draft-row">
        <div>
          <span class="font-medium text-sm text-primary">${item.medicineName}</span>
          <span class="text-xs text-muted block">${item.quantity} units @ ₹${item.unitCost.toFixed(2)}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-semibold text-sm">₹${item.total.toFixed(2)}</span>
          <button type="button" class="btn btn-icon btn-sm text-danger" onclick="SuppliersModule.removeDraftPOItem(${idx})">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
    `).join('');
  },

  handlePOSubmit() {
    const supplierId = document.getElementById('po-supplier-select').value;
    if (!supplierId) {
      toast.error('Please choose a supplier.');
      return;
    }

    if (this.poDraftItems.length === 0) {
      toast.warning('Please add at least one medicine item to the purchase order.');
      return;
    }

    const totalOrderCost = this.poDraftItems.reduce((sum, item) => sum + item.total, 0);

    const success = storage.createPurchaseOrder(supplierId, this.poDraftItems, totalOrderCost);
    if (success) {
      modal.close('modal-purchase-order');
      toast.success(`Purchase order of ₹${totalOrderCost.toFixed(2)} dispatched to supplier.`, 'PO Created');
    }
  },

  resetSearch() {
    this.searchQuery = '';
    const searchInput = document.getElementById('sup-search-input');
    if (searchInput) searchInput.value = '';
    this.renderTable();
    toast.info('Wholesaler search cleared.');
  },

  async confirmDelete(id) {
    const s = storage.getSupplierById(id);
    if (!s) return;

    const confirmed = await modal.confirm({
      title: 'Delete Wholesaler',
      message: `Are you sure you want to delete vendor record for <strong>${s.name}</strong>?<br><br><span class="text-xs text-muted">This supplier will be removed from your procurement directory.</span>`,
      confirmText: 'Delete Vendor',
      cancelText: 'Keep Record',
      danger: true,
      icon: 'fa-truck-arrow-right'
    });

    if (confirmed) {
      storage.deleteSupplier(id);
      toast.success(`Supplier ${s.name} removed successfully.`, 'Vendor Deleted');
    }
  }
};
