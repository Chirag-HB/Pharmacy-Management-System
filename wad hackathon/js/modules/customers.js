/**
 * MediCore Customers Management Module
 * Patient records, chronic conditions tracking, purchase history, and spending profiles
 */

const CustomersModule = {
  searchQuery: '',

  init() {
    this.render();
    this.attachEvents();

    storage.on('customersUpdated', () => {
      this.render();
    });
    storage.on('saleCompleted', () => {
      this.render();
    });
  },

  attachEvents() {
    // Search input
    const searchInput = document.getElementById('cust-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderTable();
      });
    }

    // Add customer button
    const btnAdd = document.getElementById('btn-add-customer');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        this.openAddModal();
      });
    }

    // Form submit
    const formCust = document.getElementById('form-customer-edit');
    if (formCust) {
      formCust.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit();
      });
    }
  },

  render() {
    this.renderMetrics();
    this.renderTable();
  },

  renderMetrics() {
    const customers = storage.getCustomers();

    const totalCust = customers.length;
    const totalSpentAll = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
    const avgSpent = totalCust > 0 ? (totalSpentAll / totalCust).toFixed(2) : '0.00';

    const elTotal = document.getElementById('cust-metric-total');
    if (elTotal) elTotal.textContent = totalCust;

    const elSpent = document.getElementById('cust-metric-total-spent');
    if (elSpent) elSpent.textContent = `₹${totalSpentAll.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const elAvg = document.getElementById('cust-metric-avg-spent');
    if (elAvg) elAvg.textContent = `₹${Number(avgSpent).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },

  getFilteredCustomers() {
    let list = storage.getCustomers();

    if (this.searchQuery) {
      const q = this.searchQuery;
      list = list.filter(c =>
        (c.id && c.id.toLowerCase().includes(q)) ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
      );
    }

    return list;
  },

  renderTable() {
    const tbody = document.getElementById('customers-table-tbody');
    if (!tbody) return;

    const list = this.getFilteredCustomers();

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10">
            <div class="empty-state-card">
              <div class="empty-state-icon-wrapper">
                <i class="fa-solid fa-users"></i>
              </div>
              <h3 class="empty-state-title">No customers found</h3>
              <p class="empty-state-desc">No customer or patient profile matched your search query. Add a new customer profile to log purchases.</p>
              <div class="empty-state-actions">
                <button type="button" class="btn btn-outline btn-sm" onclick="CustomersModule.resetSearch()">
                  <i class="fa-solid fa-rotate-left"></i> View All Patients
                </button>
                <button type="button" class="btn btn-primary btn-sm" onclick="CustomersModule.openAddModal()">
                  <i class="fa-solid fa-user-plus"></i> Add New Patient
                </button>
              </div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(c => {
      const lastPurchaseDisplay = c.lastPurchase || c.lastVisit || 'No Purchases';
      const dobDisplay = c.dob || (c.age ? `~${new Date().getFullYear() - c.age} (Age: ${c.age})` : '—');

      return `
        <tr>
          <td>
            <span class="font-mono text-xs font-semibold text-muted">${c.id}</span>
          </td>
          <td>
            <div class="font-semibold text-primary med-name-link" onclick="CustomersModule.openProfileModal('${c.id}')" title="View Patient Profile">
              ${c.name}
            </div>
            <div class="text-2xs text-muted">${c.gender || '—'}${c.bloodGroup ? ' • ' + c.bloodGroup : ''}</div>
          </td>
          <td>
            <div class="font-medium">${c.phone}</div>
          </td>
          <td>
            <div class="text-xs text-muted">${c.email || '—'}</div>
          </td>
          <td>
            <div class="text-xs">${dobDisplay}</div>
          </td>
          <td>
            <div class="text-xs text-truncate max-w-200" title="${c.address || ''}">
              ${c.address || '—'}
            </div>
          </td>
          <td class="text-center font-semibold">
            <span class="badge badge-light">${c.totalOrders || 0}</span>
          </td>
          <td class="text-right font-bold text-primary">
            ₹${Number(c.totalSpent || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
          <td>
            <span class="text-xs ${lastPurchaseDisplay === 'No Purchases' ? 'text-muted' : 'text-main font-medium'}">
              ${lastPurchaseDisplay}
            </span>
          </td>
          <td class="text-center table-actions">
            <div class="flex items-center justify-center gap-1">
              <button class="btn btn-icon btn-sm" title="View Profile" onclick="CustomersModule.openProfileModal('${c.id}')">
                <i class="fa-solid fa-id-card"></i>
              </button>
              <button class="btn btn-icon btn-sm" title="Edit Customer" onclick="CustomersModule.openEditModal('${c.id}')">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="btn btn-icon btn-sm text-danger" title="Delete Customer" onclick="CustomersModule.confirmDelete('${c.id}')">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal() {
    const form = document.getElementById('form-customer-edit');
    if (form) form.reset();

    document.getElementById('modal-customer-title').textContent = 'Add New Customer';
    document.getElementById('cust-input-id').value = '';
    const dobInput = document.getElementById('cust-input-dob');
    if (dobInput) dobInput.value = '';

    modal.open('modal-customer-form');
  },

  openEditModal(id) {
    const cust = storage.getCustomerById(id);
    if (!cust) return;

    document.getElementById('modal-customer-title').textContent = `Edit Customer: ${cust.name}`;
    document.getElementById('cust-input-id').value = cust.id;
    document.getElementById('cust-input-name').value = cust.name || '';
    document.getElementById('cust-input-phone').value = cust.phone || '';
    document.getElementById('cust-input-email').value = cust.email || '';
    document.getElementById('cust-input-address').value = cust.address || '';
    document.getElementById('cust-input-gender').value = cust.gender || 'Male';
    document.getElementById('cust-input-blood').value = cust.bloodGroup || 'B+';
    document.getElementById('cust-input-notes').value = cust.notes || '';

    const dobInput = document.getElementById('cust-input-dob');
    if (dobInput) {
      dobInput.value = cust.dob || '';
    }

    modal.open('modal-customer-form');
  },

  handleFormSubmit() {
    const id = document.getElementById('cust-input-id').value;
    const name = document.getElementById('cust-input-name').value.trim();
    const phone = document.getElementById('cust-input-phone').value.trim();
    const email = document.getElementById('cust-input-email').value.trim();
    const dobInput = document.getElementById('cust-input-dob');
    const dob = dobInput ? dobInput.value : '';
    const address = document.getElementById('cust-input-address').value.trim();
    const gender = document.getElementById('cust-input-gender').value;
    const bloodGroup = document.getElementById('cust-input-blood').value;
    const notes = document.getElementById('cust-input-notes').value.trim();

    if (!name || !phone) {
      toast.error('Customer name and phone number are required.');
      return;
    }

    let age = null;
    if (dob) {
      const birthYear = new Date(dob).getFullYear();
      if (!isNaN(birthYear)) {
        age = new Date().getFullYear() - birthYear;
      }
    }

    const customerData = {
      name,
      phone,
      email,
      dob,
      address,
      gender,
      age,
      bloodGroup,
      notes
    };

    if (id) {
      customerData.id = id;
    }

    storage.saveCustomer(customerData);
    modal.close('modal-customer-form');
    toast.success(`Customer ${name} saved successfully.`, 'Patient Registry');
  },

  openProfileModal(id) {
    const cust = storage.getCustomerById(id);
    if (!cust) return;

    const modalBody = document.getElementById('cust-profile-modal-body');
    if (!modalBody) return;

    // Fetch this customer's purchase history from sales
    const allSales = storage.getSales();
    const customerSales = allSales.filter(s =>
      s.customerId === cust.id ||
      (s.customerPhone && cust.phone && s.customerPhone.replace(/\D/g, '') === cust.phone.replace(/\D/g, ''))
    );

    // Extract recent unique medicines purchased
    const recentMedicinesMap = new Map();
    customerSales.forEach(sale => {
      (sale.items || []).forEach(item => {
        if (!recentMedicinesMap.has(item.medicineId || item.name)) {
          recentMedicinesMap.set(item.medicineId || item.name, {
            name: item.name,
            qty: item.qty,
            date: sale.date,
            price: item.price
          });
        }
      });
    });
    const recentMedicines = Array.from(recentMedicinesMap.values()).slice(0, 8);

    const totalCalculatedSpending = customerSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const displayTotalSpent = customerSales.length > 0 ? totalCalculatedSpending : (cust.totalSpent || 0);
    const displayOrderCount = customerSales.length > 0 ? customerSales.length : (cust.totalOrders || 0);

    modalBody.innerHTML = `
      <div class="cust-profile-card">
        <!-- Customer Information Header -->
        <div class="cust-profile-header" style="display: flex; align-items: center; gap: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
          <div class="cust-avatar-large" style="width: 56px; height: 56px; border-radius: 50%; background: var(--bg-surface-alt); border: 2px solid var(--color-primary); color: var(--color-primary); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
            <i class="fa-solid fa-user"></i>
          </div>
          <div>
            <h3 class="text-xl font-bold text-main m-0">${cust.name}</h3>
            <p class="text-xs text-muted m-0">Patient ID: <strong>${cust.id}</strong> • Registered Member</p>
            <div class="flex items-center gap-2 mt-1">
              <span class="badge badge-light text-2xs">${cust.gender || 'Not specified'}</span>
              ${cust.dob ? `<span class="badge badge-light text-2xs">DOB: ${cust.dob}</span>` : ''}
              ${cust.bloodGroup ? `<span class="badge badge-danger text-2xs">Blood: ${cust.bloodGroup}</span>` : ''}
            </div>
          </div>
        </div>

        <!-- 4 Key Customer Stats -->
        <div class="grid grid-cols-4 gap-3 mt-3 mb-3" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem;">
          <div class="card" style="background: var(--bg-surface-alt);">
            <div class="card-body p-3" style="padding: 0.75rem;">
              <span class="text-2xs text-muted block">Total Spending</span>
              <span class="text-lg font-bold text-primary">₹${Number(displayTotalSpent).toFixed(2)}</span>
            </div>
          </div>
          <div class="card" style="background: var(--bg-surface-alt);">
            <div class="card-body p-3" style="padding: 0.75rem;">
              <span class="text-2xs text-muted block">Number of Orders</span>
              <span class="text-lg font-bold text-main">${displayOrderCount}</span>
            </div>
          </div>
          <div class="card" style="background: var(--bg-surface-alt);">
            <div class="card-body p-3" style="padding: 0.75rem;">
              <span class="text-2xs text-muted block">Last Purchase</span>
              <span class="text-sm font-semibold text-main">${cust.lastPurchase || cust.lastVisit || 'No Purchases'}</span>
            </div>
          </div>
          <div class="card" style="background: var(--bg-surface-alt);">
            <div class="card-body p-3" style="padding: 0.75rem;">
              <span class="text-2xs text-muted block">Average Bill</span>
              <span class="text-sm font-semibold text-secondary">₹${displayOrderCount > 0 ? (displayTotalSpent / displayOrderCount).toFixed(2) : '0.00'}</span>
            </div>
          </div>
        </div>

        <!-- Contact Information -->
        <div class="card mb-3" style="background: var(--bg-surface-alt);">
          <div class="card-body" style="padding: 0.75rem 1rem;">
            <div class="grid grid-cols-3 gap-2" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem;">
              <div>
                <span class="text-2xs text-muted block"><i class="fa-solid fa-phone text-primary mr-1"></i> Phone:</span>
                <span class="text-xs font-semibold text-main">${cust.phone}</span>
              </div>
              <div>
                <span class="text-2xs text-muted block"><i class="fa-solid fa-envelope text-primary mr-1"></i> Email:</span>
                <span class="text-xs font-medium text-main">${cust.email || 'None provided'}</span>
              </div>
              <div>
                <span class="text-2xs text-muted block"><i class="fa-solid fa-location-dot text-primary mr-1"></i> Residential Address:</span>
                <span class="text-xs text-secondary">${cust.address || 'Not recorded'}</span>
              </div>
            </div>
          </div>
        </div>

        ${cust.notes ? `
          <div class="card mb-3" style="border-left: 4px solid var(--color-danger); background: var(--bg-surface-alt);">
            <div class="card-body" style="padding: 0.75rem 1rem;">
              <span class="text-xs font-bold text-danger block mb-1"><i class="fa-solid fa-heart-pulse"></i> Medical Profile, Chronic Conditions & Allergies:</span>
              <p class="text-xs text-main m-0">${cust.notes}</p>
            </div>
          </div>
        ` : ''}

        <!-- Recent Medicines Purchased -->
        <div class="mt-3 mb-3">
          <h4 class="font-bold text-sm text-main mb-2"><i class="fa-solid fa-pills text-primary"></i> Recently Dispensed Medicines</h4>
          ${recentMedicines.length === 0 ? `
            <div class="text-muted text-xs py-2">No medications dispensed for this customer yet.</div>
          ` : `
            <div class="flex flex-wrap gap-2" style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
              ${recentMedicines.map(m => `
                <span class="badge badge-light" style="padding: 0.4rem 0.65rem; font-size: 0.75rem; border: 1px solid var(--border-color);">
                  <i class="fa-solid fa-prescription-bottle-medical text-primary mr-1"></i>
                  <strong>${m.name}</strong> • ${m.qty} Units (@ ₹${Number(m.price || 0).toFixed(2)})
                </span>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Purchase History Table -->
        <h4 class="mt-4 mb-2 font-bold text-sm text-main"><i class="fa-solid fa-receipt text-primary"></i> Billing & Purchase History (${customerSales.length})</h4>
        <div class="table-container mb-3" style="max-height: 220px; overflow-y: auto;">
          ${customerSales.length === 0 ? `
            <div class="text-muted text-xs py-4 text-center">No previous billing records found. Complete a sale in POS to log purchase history.</div>
          ` : `
            <table class="data-table">
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Date</th>
                  <th>Purchased Items</th>
                  <th>Payment</th>
                  <th class="text-right">Total Amount</th>
                  <th class="text-center">Tax Bill</th>
                </tr>
              </thead>
              <tbody>
                ${customerSales.map(sale => `
                  <tr>
                    <td><span class="font-mono font-semibold text-primary">${sale.id}</span></td>
                    <td class="text-xs">${new Date(sale.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td>
                      <div class="text-xs text-truncate max-w-200" title="${(sale.items || []).map(i => `${i.name} (x${i.qty})`).join(', ')}">
                        ${(sale.items || []).map(i => `${i.name} (x${i.qty})`).join(', ') || 'Medications'}
                      </div>
                    </td>
                    <td><span class="badge badge-light">${sale.paymentMethod}</span></td>
                    <td class="text-right font-bold text-primary">₹${Number(sale.totalAmount).toFixed(2)}</td>
                    <td class="text-center">
                      <button class="btn btn-icon btn-sm" onclick="modal.close('modal-customer-profile'); POSModule.showInvoiceModal('${sale.id}')" title="View Printable Bill">
                        <i class="fa-solid fa-receipt"></i>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>

        <div class="modal-actions-bar mt-4 flex justify-between items-center">
          <button class="btn btn-outline" onclick="modal.close('modal-customer-profile')">Close</button>
          <div class="flex items-center gap-2">
            <button class="btn btn-secondary" onclick="modal.close('modal-customer-profile'); CustomersModule.openEditModal('${cust.id}')">
              <i class="fa-solid fa-pen-to-square"></i> Edit Profile
            </button>
            <button class="btn btn-primary" onclick="modal.close('modal-customer-profile'); App.navigateTo('pos');">
              <i class="fa-solid fa-cash-register"></i> New Billing for Patient
            </button>
          </div>
        </div>
      </div>
    `;

    modal.open('modal-customer-profile');
  },

  resetSearch() {
    this.searchQuery = '';
    const searchInput = document.getElementById('cust-search-input');
    if (searchInput) searchInput.value = '';
    this.renderTable();
    toast.info('Patient search cleared.');
  },

  async confirmDelete(id) {
    const cust = storage.getCustomerById(id);
    if (!cust) return;

    const confirmed = await modal.confirm({
      title: 'Delete Customer Profile',
      message: `Are you sure you want to permanently delete patient <strong>${cust.name}</strong> (${cust.id})?<br><br><span class="text-xs text-muted">All associated contact information and record history will be deleted.</span>`,
      confirmText: 'Delete Patient',
      cancelText: 'Keep Record',
      danger: true,
      icon: 'fa-user-slash'
    });

    if (confirmed) {
      storage.deleteCustomer(id);
      toast.success(`Customer ${cust.name} deleted successfully.`, 'Patient Removed');
    }
  }
};
