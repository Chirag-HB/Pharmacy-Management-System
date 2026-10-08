/**
 * MediCore Prescriptions (Rx) Management Module
 * Clinical prescription review, digital Rx preview, approval workflows, and POS auto-dispensing
 */

const PrescriptionsModule = {
  currentFilter: 'all',
  searchQuery: '',
  newRxItems: [],
  selectedFile: null,

  init() {
    this.render();
    this.attachEvents();

    storage.on('prescriptionsUpdated', () => {
      this.render();
    });
  },

  attachEvents() {
    // Search input
    const searchInput = document.getElementById('rx-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderTable();
      });
    }

    // Filter tabs
    const filterTabs = document.getElementById('rx-filter-tabs');
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

    // New Prescription button
    const btnNew = document.getElementById('btn-new-prescription');
    if (btnNew) {
      btnNew.addEventListener('click', () => {
        this.openUploadModal();
      });
    }

    // Prescription form submission
    const formRx = document.getElementById('form-prescription-upload');
    if (formRx) {
      formRx.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleNewRxSubmit();
      });
    }

    // Add item to prescription draft
    const btnDraftAdd = document.getElementById('btn-rx-add-draft-item');
    if (btnDraftAdd) {
      btnDraftAdd.addEventListener('click', () => {
        this.addDraftMedicineItem();
      });
    }

    // Simulated file dropzone handling
    const dropzone = document.getElementById('rx-file-dropzone');
    const fileInput = document.getElementById('rx-input-file');
    const btnClearFile = document.getElementById('btn-rx-clear-file');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', (e) => {
        if (e.target.closest('#btn-rx-clear-file')) return;
        fileInput.click();
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.handleFileSelected(e.target.files[0]);
        }
      });

      // Drag and drop events
      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          dropzone.style.borderColor = 'var(--color-primary)';
          dropzone.style.backgroundColor = 'rgba(14, 116, 144, 0.08)';
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          dropzone.style.borderColor = 'var(--border-color)';
          dropzone.style.backgroundColor = 'var(--bg-surface-alt)';
        });
      });

      dropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.handleFileSelected(e.dataTransfer.files[0]);
        }
      });
    }

    if (btnClearFile) {
      btnClearFile.addEventListener('click', (e) => {
        e.stopPropagation();
        this.clearSelectedFile();
      });
    }

    // Rejection Form submit
    const rejectForm = document.getElementById('form-prescription-reject');
    if (rejectForm) {
      rejectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleRejectSubmit();
      });
    }
  },

  handleFileSelected(file) {
    this.selectedFile = {
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      type: file.type || 'Document'
    };

    const contentBox = document.getElementById('rx-dropzone-content');
    const previewBox = document.getElementById('rx-dropzone-preview');
    const filenameEl = document.getElementById('rx-preview-filename');
    const filesizeEl = document.getElementById('rx-preview-filesize');

    if (contentBox && previewBox && filenameEl) {
      contentBox.style.display = 'none';
      previewBox.style.display = 'flex';
      filenameEl.textContent = this.selectedFile.name;
      if (filesizeEl) filesizeEl.textContent = `${this.selectedFile.size} • Attached for verification`;
    }

    toast.info(`Prescription file attached: ${file.name}`);
  },

  clearSelectedFile() {
    this.selectedFile = null;
    const fileInput = document.getElementById('rx-input-file');
    if (fileInput) fileInput.value = '';

    const contentBox = document.getElementById('rx-dropzone-content');
    const previewBox = document.getElementById('rx-dropzone-preview');

    if (contentBox && previewBox) {
      contentBox.style.display = 'block';
      previewBox.style.display = 'none';
    }
  },

  render() {
    this.renderMetrics();
    this.renderTable();
  },

  renderMetrics() {
    const rxList = storage.getPrescriptions();

    const pendingCount = rxList.filter(r => r.status === 'Pending').length;
    const verifiedCount = rxList.filter(r => r.status === 'Verified' || r.status === 'Approved').length;
    const dispensedCount = rxList.filter(r => r.status === 'Dispensed').length;

    const elTotal = document.getElementById('rx-metric-total');
    if (elTotal) elTotal.textContent = rxList.length;

    const elPending = document.getElementById('rx-metric-pending');
    if (elPending) elPending.textContent = pendingCount;

    const elApproved = document.getElementById('rx-metric-approved');
    if (elApproved) elApproved.textContent = verifiedCount;

    const elDispensed = document.getElementById('rx-metric-dispensed');
    if (elDispensed) elDispensed.textContent = dispensedCount;
  },

  getFilteredPrescriptions() {
    let list = storage.getPrescriptions();

    if (this.searchQuery) {
      const q = this.searchQuery;
      list = list.filter(r =>
        (r.id && r.id.toLowerCase().includes(q)) ||
        (r.patientName && r.patientName.toLowerCase().includes(q)) ||
        (r.doctorName && r.doctorName.toLowerCase().includes(q)) ||
        (r.hospital && r.hospital.toLowerCase().includes(q))
      );
    }

    if (this.currentFilter !== 'all') {
      const filter = this.currentFilter.toLowerCase();
      list = list.filter(r => {
        const status = (r.status || '').toLowerCase();
        if (filter === 'verified') {
          return status === 'verified' || status === 'approved';
        }
        return status === filter;
      });
    }

    return list;
  },

  renderTable() {
    const tbody = document.getElementById('prescriptions-table-tbody');
    if (!tbody) return;

    const list = this.getFilteredPrescriptions();

    if (list.length === 0) {
      let emptyTitle = 'No prescriptions found';
      let emptyDesc = 'No clinical prescriptions match your current search query or status filter.';
      let emptyIcon = 'fa-file-prescription';

      if (this.currentFilter.toLowerCase() === 'pending') {
        emptyTitle = 'No pending prescriptions';
        emptyDesc = 'All customer prescriptions have been verified or dispensed! Your clinical review queue is all caught up.';
        emptyIcon = 'fa-clipboard-check text-success';
      }

      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state-card">
              <div class="empty-state-icon-wrapper">
                <i class="fa-solid ${emptyIcon}"></i>
              </div>
              <h3 class="empty-state-title">${emptyTitle}</h3>
              <p class="empty-state-desc">${emptyDesc}</p>
              <div class="empty-state-actions">
                <button type="button" class="btn btn-outline btn-sm" onclick="PrescriptionsModule.resetFilters()">
                  <i class="fa-solid fa-rotate-left"></i> View All Prescriptions
                </button>
                <button type="button" class="btn btn-primary btn-sm" onclick="PrescriptionsModule.openUploadModal()">
                  <i class="fa-solid fa-plus"></i> Upload New Prescription
                </button>
              </div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(rx => {
      // Standardize status: Pending, Verified, Rejected, Dispensed
      let displayStatus = rx.status === 'Approved' ? 'Verified' : rx.status;

      let badgeClass = 'badge-light';
      let icon = 'fa-clock';
      if (displayStatus === 'Pending') {
        badgeClass = 'badge-warning';
        icon = 'fa-clock';
      } else if (displayStatus === 'Verified') {
        badgeClass = 'badge-info';
        icon = 'fa-clipboard-check';
      } else if (displayStatus === 'Dispensed') {
        badgeClass = 'badge-success';
        icon = 'fa-circle-check';
      } else if (displayStatus === 'Rejected') {
        badgeClass = 'badge-danger';
        icon = 'fa-circle-xmark';
      }

      const itemsSummary = (rx.items || []).map(i => `${i.medicineName} (${i.quantity})`).join(', ') || 'No medications listed';

      return `
        <tr>
          <td>
            <span class="font-mono font-semibold text-primary">${rx.id}</span>
          </td>
          <td>
            <div class="font-medium">${rx.patientName}</div>
            <div class="text-2xs text-muted">${rx.patientPhone || 'N/A'}</div>
          </td>
          <td>
            <div class="font-medium">${rx.doctorName}</div>
            <div class="text-2xs text-muted">${rx.hospital || 'Medical Practitioner'}</div>
          </td>
          <td>
            <div class="text-xs">${rx.date || '—'}</div>
          </td>
          <td>
            <div class="text-xs text-truncate max-w-200" title="${itemsSummary}">
              ${itemsSummary}
            </div>
          </td>
          <td>
            <span class="badge ${badgeClass}"><i class="fa-solid ${icon}"></i> ${displayStatus}</span>
          </td>
          <td class="text-center table-actions">
            <div class="flex items-center justify-center gap-1 flex-wrap">
              <button type="button" class="btn btn-outline btn-sm" onclick="PrescriptionsModule.openDetailsModal('${rx.id}')" title="Review Prescription Details">
                <i class="fa-solid fa-eye"></i> Details
              </button>

              ${displayStatus === 'Pending' ? `
                <button type="button" class="btn btn-success btn-sm" onclick="PrescriptionsModule.verifyRx('${rx.id}')" title="Verify Prescription">
                  <i class="fa-solid fa-check"></i> Verify
                </button>
                <button type="button" class="btn btn-danger btn-sm" onclick="PrescriptionsModule.openRejectModal('${rx.id}')" title="Reject Prescription">
                  <i class="fa-solid fa-xmark"></i> Reject
                </button>
              ` : ''}

              ${displayStatus === 'Verified' ? `
                <button type="button" class="btn btn-primary btn-sm" onclick="PrescriptionsModule.markAsDispensed('${rx.id}')" title="Mark as Dispensed">
                  <i class="fa-solid fa-cart-arrow-down"></i> Dispense
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  resetFilters() {
    this.currentFilter = 'all';
    this.searchQuery = '';
    const searchInput = document.getElementById('rx-search-input');
    if (searchInput) searchInput.value = '';

    const filterTabs = document.getElementById('rx-filter-tabs');
    if (filterTabs) {
      filterTabs.querySelectorAll('.filter-tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.filter === 'all');
      });
    }

    this.renderTable();
    toast.info('Prescription filters reset.');
  },

  openDetailsModal(rxId) {
    const rx = storage.getPrescriptionById(rxId);
    if (!rx) return;

    const modalBody = document.getElementById('rx-details-modal-body');
    if (!modalBody) return;

    let displayStatus = rx.status === 'Approved' ? 'Verified' : rx.status;

    let badgeClass = 'badge-light';
    let icon = 'fa-clock';
    if (displayStatus === 'Pending') {
      badgeClass = 'badge-warning';
      icon = 'fa-clock';
    } else if (displayStatus === 'Verified') {
      badgeClass = 'badge-info';
      icon = 'fa-clipboard-check';
    } else if (displayStatus === 'Dispensed') {
      badgeClass = 'badge-success';
      icon = 'fa-circle-check';
    } else if (displayStatus === 'Rejected') {
      badgeClass = 'badge-danger';
      icon = 'fa-circle-xmark';
    }

    modalBody.innerHTML = `
      <div class="rx-viewer-card">
        <!-- Rx Header -->
        <div class="rx-header-banner" style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
          <div>
            <span class="badge ${badgeClass} text-sm mb-1"><i class="fa-solid ${icon}"></i> ${displayStatus}</span>
            <h3 class="rx-number text-xl font-bold text-primary mt-1">${rx.id}</h3>
            <p class="text-xs text-muted"><strong>Prescription Date:</strong> ${rx.date || '—'}</p>
          </div>
          <div class="rx-doctor-signoff text-right">
            <div class="font-bold text-primary">${rx.doctorName}</div>
            <div class="text-xs text-muted">${rx.hospital || 'Medical Practitioner'}</div>
            <div class="text-2xs text-success mt-1"><i class="fa-solid fa-certificate"></i> Verified Medical Registry • KMC-77492</div>
          </div>
        </div>

        <!-- Patient Information Strip -->
        <div class="card mt-3 mb-3" style="background-color: var(--bg-surface-alt);">
          <div class="card-body" style="padding: 0.85rem 1rem;">
            <div class="grid grid-cols-3 gap-2" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem;">
              <div>
                <span class="text-xs text-muted block">Patient Information:</span>
                <span class="font-bold text-sm text-main">${rx.patientName}</span>
              </div>
              <div>
                <span class="text-xs text-muted block">Contact Phone:</span>
                <span class="text-sm font-medium text-main">${rx.patientPhone || 'Not provided'}</span>
              </div>
              <div>
                <span class="text-xs text-muted block">Clinical Diagnosis:</span>
                <span class="text-sm font-medium text-secondary">${rx.diagnosis || 'Clinical Consultation'}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Medicine list: Medicine, Dosage, Quantity, Instructions -->
        <div class="flex justify-between items-center mt-4 mb-2">
          <h4 class="font-bold text-sm text-main"><i class="fa-solid fa-pills text-primary"></i> Prescribed Medicines & Instructions</h4>
          <span class="text-xs text-muted">${(rx.items || []).length} Prescribed Item(s)</span>
        </div>

        <div class="table-container mb-3" style="margin-bottom: 1rem;">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Medicine List</th>
                <th>Dosage</th>
                <th class="text-center">Quantity</th>
                <th>Instructions</th>
              </tr>
            </thead>
            <tbody>
              ${(rx.items || []).map((item, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>
                    <div class="font-bold text-primary">${item.medicineName}</div>
                    <div class="text-2xs text-muted">ID: ${item.medicineId || '—'}</div>
                  </td>
                  <td>
                    <span class="font-medium text-sm">${item.dosage || 'As directed by physician'}</span>
                  </td>
                  <td class="text-center">
                    <span class="badge badge-primary font-bold">${item.quantity} Units</span>
                  </td>
                  <td>
                    <span class="text-xs text-secondary">${item.instructions || item.dosage || 'Complete full clinical course with food'}</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${rx.notes ? `
          <div class="card mb-3" style="border-left: 4px solid var(--color-primary); background: var(--bg-surface-alt);">
            <div class="card-body" style="padding: 0.75rem 1rem;">
              <strong class="text-xs text-primary block mb-1"><i class="fa-solid fa-user-doctor"></i> Doctor Instructions & Physician Notes:</strong>
              <p class="text-xs text-main m-0">${rx.notes}</p>
            </div>
          </div>
        ` : ''}

        <!-- Digital Attached Slip Visual Indicator -->
        <div class="card mb-3" style="border-style: dashed; border-color: var(--border-strong);">
          <div class="card-body flex items-center justify-between" style="padding: 0.75rem 1rem;">
            <div class="flex items-center gap-3">
              <i class="fa-solid ${rx.fileUrl && rx.fileUrl.endsWith('.pdf') ? 'fa-file-pdf text-danger' : 'fa-file-medical text-primary'} fa-2x"></i>
              <div>
                <div class="font-semibold text-xs">${rx.fileName || rx.fileUrl || 'Prescription_Digital_Slip_Scan.pdf'}</div>
                <div class="text-2xs text-muted">Signed Digital Rx Document • Tamper Evident Electronic Health Record</div>
              </div>
            </div>
            <span class="badge badge-light text-xs"><i class="fa-solid fa-shield-halved text-success"></i> Document Verified</span>
          </div>
        </div>

        <!-- Pharmacist Workflow Action Buttons -->
        <div class="modal-actions-bar mt-4 flex justify-between items-center flex-wrap gap-2">
          <button type="button" class="btn btn-outline" onclick="modal.close('modal-prescription-details')">Close</button>
          
          <div class="flex items-center gap-2">
            ${displayStatus === 'Pending' ? `
              <button type="button" class="btn btn-danger" onclick="modal.close('modal-prescription-details'); PrescriptionsModule.openRejectModal('${rx.id}')">
                <i class="fa-solid fa-ban"></i> Reject
              </button>
              <button type="button" class="btn btn-success" onclick="PrescriptionsModule.verifyRx('${rx.id}')">
                <i class="fa-solid fa-check"></i> Verify Prescription
              </button>
            ` : ''}

            ${displayStatus === 'Verified' ? `
              <button type="button" class="btn btn-primary" onclick="PrescriptionsModule.markAsDispensed('${rx.id}')">
                <i class="fa-solid fa-cart-shopping"></i> Mark as Dispensed
              </button>
            ` : ''}

            ${displayStatus === 'Dispensed' ? `
              <span class="badge badge-success py-2 px-3 text-xs"><i class="fa-solid fa-check-double"></i> Dispensed to Customer</span>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    modal.open('modal-prescription-details');
  },

  openUploadModal() {
    const form = document.getElementById('form-prescription-upload');
    if (form) form.reset();

    this.newRxItems = [];
    this.clearSelectedFile();
    this.renderDraftItemsList();
    this.populateMedicineSelect();

    modal.open('modal-prescription-upload');
  },

  populateMedicineSelect() {
    const select = document.getElementById('rx-input-med-select');
    if (!select) return;

    const medicines = storage.getMedicines();
    select.innerHTML = `
      <option value="">-- Choose Medicine --</option>
      ${medicines.map(m => `
        <option value="${m.id}" data-name="${m.name}" data-stock="${m.stock}">
          ${m.name} (${m.stock} in stock)
        </option>
      `).join('')}
    `;
  },

  addDraftMedicineItem() {
    const select = document.getElementById('rx-input-med-select');
    const qtyInput = document.getElementById('rx-input-med-qty');
    const dosageInput = document.getElementById('rx-input-med-dosage');

    const medId = select.value;
    const qty = parseInt(qtyInput.value, 10) || 1;
    const dosage = dosageInput.value.trim() || '1 tablet daily after food';

    if (!medId) {
      toast.warning('Please select a medicine from the dropdown.');
      return;
    }

    const med = storage.getMedicineById(medId);
    if (!med) return;

    this.newRxItems.push({
      medicineId: med.id,
      medicineName: med.name,
      dosage,
      quantity: qty,
      instructions: dosage
    });

    // Reset inputs
    select.value = '';
    qtyInput.value = '10';
    dosageInput.value = '';

    this.renderDraftItemsList();
  },

  removeDraftItem(idx) {
    this.newRxItems.splice(idx, 1);
    this.renderDraftItemsList();
  },

  renderDraftItemsList() {
    const container = document.getElementById('rx-draft-items-container');
    if (!container) return;

    if (this.newRxItems.length === 0) {
      container.innerHTML = `<div class="text-xs text-muted py-2">No medicines added to this prescription yet.</div>`;
      return;
    }

    container.innerHTML = this.newRxItems.map((item, idx) => `
      <div class="rx-draft-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-sm); margin-bottom: 0.4rem;">
        <div>
          <span class="font-semibold text-sm text-primary">${item.medicineName}</span>
          <span class="text-xs text-muted block">${item.dosage} • Qty: <strong>${item.quantity}</strong></span>
        </div>
        <button type="button" class="btn btn-icon btn-sm text-danger" onclick="PrescriptionsModule.removeDraftItem(${idx})" title="Remove item">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `).join('');
  },

  handleNewRxSubmit() {
    const patientName = document.getElementById('rx-input-patient-name').value.trim();
    const patientPhone = document.getElementById('rx-input-patient-phone').value.trim();
    const doctorName = document.getElementById('rx-input-doctor-name').value.trim();
    const hospital = document.getElementById('rx-input-hospital').value.trim();
    const diagnosis = document.getElementById('rx-input-diagnosis').value.trim();
    const notes = document.getElementById('rx-input-notes').value.trim();

    if (!patientName || !doctorName) {
      toast.error('Patient Name and Doctor Name are required.');
      return;
    }

    if (this.newRxItems.length === 0) {
      toast.warning('Please add at least one medication to the prescription.');
      return;
    }

    const newRx = {
      patientName,
      patientPhone: patientPhone || '+91 98000 00000',
      doctorName,
      hospital: hospital || 'City Healthcare Clinic',
      diagnosis: diagnosis || 'Clinical Consultation',
      notes,
      items: this.newRxItems,
      fileName: this.selectedFile ? this.selectedFile.name : 'Uploaded_Prescription_Scan.pdf',
      status: 'Pending',
      date: new Date().toISOString().split('T')[0]
    };

    storage.savePrescription(newRx);
    modal.close('modal-prescription-upload');
    toast.success('Prescription uploaded and added to pending queue.', 'Rx Registered');
  },

  verifyRx(id) {
    const rx = storage.getPrescriptionById(id);
    if (!rx) return;

    const success = storage.updatePrescriptionStatus(id, 'Verified');
    if (success) {
      // Record audit activity
      storage.addActivity(
        'prescription',
        'Prescription Verified',
        `Prescription ${rx.id} for ${rx.patientName} was clinical-approved by the pharmacist.`
      );
      modal.close('modal-prescription-details');
      toast.success(`Prescription ${rx.id} verified successfully! Ready for dispensing.`, 'Prescription Verified');
    }
  },

  openRejectModal(id) {
    const rx = storage.getPrescriptionById(id);
    if (!rx) return;

    document.getElementById('rx-reject-id').value = rx.id;
    document.getElementById('rx-reject-summary').textContent = `${rx.id} — Patient: ${rx.patientName} (Doctor: ${rx.doctorName})`;
    document.getElementById('rx-reject-reason-notes').value = '';

    modal.open('modal-prescription-reject');
  },

  handleRejectSubmit() {
    const id = document.getElementById('rx-reject-id').value;
    const reasonSelect = document.getElementById('rx-reject-reason-select').value;
    const reasonNotes = document.getElementById('rx-reject-reason-notes').value.trim();

    const fullReason = reasonNotes ? `${reasonSelect} (${reasonNotes})` : reasonSelect;

    const rx = storage.getPrescriptionById(id);
    if (rx) {
      rx.notes = (rx.notes ? rx.notes + ' | ' : '') + `Pharmacist Rejection: ${fullReason}`;
    }

    const success = storage.updatePrescriptionStatus(id, 'Rejected');
    if (success) {
      storage.addActivity(
        'prescription',
        'Prescription Rejected',
        `Prescription ${id} was rejected. Reason: ${fullReason}`
      );
      modal.close('modal-prescription-reject');
      modal.close('modal-prescription-details');
      toast.warning(`Prescription ${id} was rejected: ${reasonSelect}`, 'Prescription Rejected');
    }
  },

  markAsDispensed(rxId) {
    const rx = storage.getPrescriptionById(rxId);
    if (!rx) return;

    modal.close('modal-prescription-details');
    App.navigateTo('pos');

    setTimeout(() => {
      // Find or set customer in POS
      const custSelect = document.getElementById('pos-customer-select');
      if (custSelect) {
        const customers = storage.getCustomers();
        const matched = customers.find(c =>
          c.name.toLowerCase() === rx.patientName.toLowerCase() ||
          (rx.patientPhone && c.phone === rx.patientPhone)
        );
        if (matched) {
          custSelect.value = matched.id;
          POSModule.selectedCustomer = matched;
          const phoneInput = document.getElementById('pos-customer-phone');
          if (phoneInput) phoneInput.value = matched.phone;
        } else {
          const phoneInput = document.getElementById('pos-customer-phone');
          if (phoneInput && rx.patientPhone) {
            phoneInput.value = rx.patientPhone;
          }
        }
      }

      // Fill Doctor reference
      const docRefInput = document.getElementById('pos-doctor-ref');
      if (docRefInput) {
        docRefInput.value = rx.doctorName;
      }

      // Add each prescribed medicine to POS cart
      let addedCount = 0;
      (rx.items || []).forEach(item => {
        const med = storage.getMedicineById(item.medicineId);
        if (med && med.stock > 0) {
          POSModule.cart.push({
            medicineId: med.id,
            name: med.name,
            genericName: med.genericName,
            batch: med.batchNumber,
            expiry: med.expiryDate,
            price: Number(med.price),
            gst: Number(med.gst || 12),
            qty: Math.min(item.quantity || 1, med.stock),
            maxStock: med.stock
          });
          addedCount++;
        }
      });

      POSModule.renderCart();
      POSModule.renderMedicineCatalog();

      // Update Rx status to dispensed
      storage.updatePrescriptionStatus(rxId, 'Dispensed');
      storage.addActivity(
        'prescription',
        'Prescription Dispensed',
        `Prescription ${rx.id} for ${rx.patientName} was dispensed to POS cart (${addedCount} items).`
      );

      toast.success(`Loaded ${addedCount} prescribed items into POS cart! Marked as Dispensed.`, 'Prescription Dispensed');
    }, 200);
  }
};
