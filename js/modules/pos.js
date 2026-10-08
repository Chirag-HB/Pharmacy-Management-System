/**
 * MediCore Point of Sale (POS) Module
 * Fast billing counter, real-time inventory deductions, GST calculations, and tax invoice generation
 */

const POSModule = {
  cart: [],
  selectedCustomer: null,
  paymentMethod: 'Cash',
  discountAmount: 0,
  searchTerm: '',
  selectedCategory: 'All',

  init() {
    this.render();
    this.attachEvents();

    storage.on('stockUpdated', () => {
      this.renderMedicineCatalog();
    });
    storage.on('customersUpdated', () => {
      this.populateCustomerSelector();
    });
  },

  attachEvents() {
    // Search input in catalog
    const searchInput = document.getElementById('pos-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value.trim().toLowerCase();
        this.renderMedicineCatalog();
      });
    }

    // Category filter pills in catalog
    const catContainer = document.getElementById('pos-category-chips');
    if (catContainer) {
      catContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('.cat-chip');
        if (chip) {
          catContainer.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          this.selectedCategory = chip.dataset.category;
          this.renderMedicineCatalog();
        }
      });
    }

    // Customer selector change
    const custSelect = document.getElementById('pos-customer-select');
    if (custSelect) {
      custSelect.addEventListener('change', (e) => {
        const custId = e.target.value;
        if (custId === 'WALK-IN') {
          this.selectedCustomer = null;
          document.getElementById('pos-customer-phone').value = '';
        } else {
          const cust = storage.getCustomerById(custId);
          this.selectedCustomer = cust;
          if (cust) {
            document.getElementById('pos-customer-phone').value = cust.phone;
          }
        }
      });
    }

    // Payment method selector
    document.querySelectorAll('input[name="pos-payment-mode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.paymentMethod = e.target.value;
        this.updatePaymentFields();
      });
    });

    // Discount input
    const discountInput = document.getElementById('pos-discount-input');
    if (discountInput) {
      discountInput.addEventListener('input', (e) => {
        this.discountAmount = Math.max(0, parseFloat(e.target.value) || 0);
        this.calculateTotals();
      });
    }

    // Cash tendered input
    const cashInput = document.getElementById('pos-cash-tendered');
    if (cashInput) {
      cashInput.addEventListener('input', () => {
        this.updateCashChange();
      });
    }

    // Clear cart button
    const btnClear = document.getElementById('btn-pos-clear-cart');
    if (btnClear) {
      btnClear.addEventListener('click', async () => {
        if (this.cart.length === 0) return;
        const confirmed = await modal.confirm({
          title: 'Clear Cart',
          message: `Are you sure you want to remove all <strong>${this.cart.length} item(s)</strong> from the current cart? This order draft will be discarded.`,
          confirmText: 'Clear Cart',
          cancelText: 'Keep Cart',
          danger: true,
          icon: 'fa-trash-can'
        });
        if (confirmed) {
          this.cart = [];
          this.renderCart();
          toast.info('Cart cleared.');
        }
      });
    }

    // Complete Sale button
    const btnComplete = document.getElementById('btn-pos-complete-sale');
    if (btnComplete) {
      btnComplete.addEventListener('click', () => {
        this.completeSale();
      });
    }

    // Quick add customer from POS
    const btnQuickCust = document.getElementById('btn-pos-quick-add-cust');
    if (btnQuickCust) {
      btnQuickCust.addEventListener('click', () => {
        CustomersModule.openAddModal();
      });
    }
  },

  render() {
    this.populateCustomerSelector();
    this.renderCategoryChips();
    this.renderMedicineCatalog();
    this.renderCart();
  },

  populateCustomerSelector() {
    const custSelect = document.getElementById('pos-customer-select');
    if (!custSelect) return;

    const customers = storage.getCustomers();
    const currentVal = custSelect.value || 'WALK-IN';

    custSelect.innerHTML = `
      <option value="WALK-IN">Walk-in Customer (General)</option>
      ${customers.map(c => `
        <option value="${c.id}" ${c.id === currentVal ? 'selected' : ''}>
          ${c.name} (${c.phone})
        </option>
      `).join('')}
    `;
  },

  renderCategoryChips() {
    const catContainer = document.getElementById('pos-category-chips');
    if (!catContainer) return;

    const medicines = storage.getMedicines();
    const categories = ['All', ...new Set(medicines.map(m => m.category).filter(Boolean))].slice(0, 8);

    catContainer.innerHTML = categories.map(cat => `
      <button type="button" class="cat-chip ${cat === this.selectedCategory ? 'active' : ''}" data-category="${cat}">
        ${cat}
      </button>
    `).join('');
  },

  renderMedicineCatalog() {
    const catalogContainer = document.getElementById('pos-catalog-grid');
    if (!catalogContainer) return;

    let medicines = storage.getMedicines();

    // Category filter
    if (this.selectedCategory !== 'All') {
      medicines = medicines.filter(m => m.category === this.selectedCategory);
    }

    // Search query
    if (this.searchTerm) {
      const q = this.searchTerm;
      medicines = medicines.filter(m =>
        m.name.toLowerCase().includes(q) ||
        (m.genericName && m.genericName.toLowerCase().includes(q)) ||
        (m.batchNumber && m.batchNumber.toLowerCase().includes(q))
      );
    }

    if (medicines.length === 0) {
      catalogContainer.innerHTML = `
        <div class="empty-state-card" style="grid-column: 1 / -1; margin: 1rem 0; width: 100%;">
          <div class="empty-state-icon-wrapper">
            <i class="fa-solid fa-magnifying-glass"></i>
          </div>
          <h3 class="empty-state-title">No medicines found</h3>
          <p class="empty-state-desc">No medications match your query "${this.searchTerm || this.selectedCategory}". Check the medicine name or clear filters.</p>
          <div class="empty-state-actions">
            <button type="button" class="btn btn-outline btn-sm" onclick="POSModule.resetCatalogFilters()">
              <i class="fa-solid fa-rotate-left"></i> Show All Products
            </button>
          </div>
        </div>
      `;
      return;
    }

    catalogContainer.innerHTML = medicines.map(m => {
      const isOOS = m.stock <= 0;
      const inCart = this.cart.find(item => item.medicineId === m.id);
      const remainingStock = m.stock - (inCart ? inCart.qty : 0);

      return `
        <div class="pos-med-card ${isOOS || remainingStock <= 0 ? 'card-oos' : ''}" onclick="POSModule.addItem('${m.id}')">
          <div class="pos-med-card-header">
            <span class="badge ${m.requiresPrescription ? 'badge-purple' : 'badge-light'} text-2xs">
              ${m.requiresPrescription ? 'Rx' : 'OTC'}
            </span>
            <span class="pos-med-batch">${m.batchNumber}</span>
          </div>
          <div class="pos-med-name">${m.name}</div>
          <div class="pos-med-generic">${m.genericName || m.category}</div>
          <div class="pos-med-footer">
            <div class="pos-med-price">₹${m.price.toFixed(2)}</div>
            <div class="pos-med-stock ${remainingStock <= (m.minStock || 15) ? 'text-warning' : 'text-success'}">
              ${remainingStock <= 0 ? '<span class="text-danger font-semibold">No Stock</span>' : `${remainingStock} left`}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  resetCatalogFilters() {
    this.searchTerm = '';
    this.selectedCategory = 'All';
    const searchInput = document.getElementById('pos-search-input');
    if (searchInput) searchInput.value = '';
    const catContainer = document.getElementById('pos-category-chips');
    if (catContainer) {
      catContainer.querySelectorAll('.cat-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.category === 'All');
      });
    }
    this.renderMedicineCatalog();
    toast.info('Catalog filters reset.');
  },

  addItem(medicineId) {
    const med = storage.getMedicineById(medicineId);
    if (!med) return;

    if (med.stock <= 0) {
      toast.warning(`${med.name} is currently out of stock. Cannot dispense.`, 'Stock Unavailable');
      return;
    }

    const existingIndex = this.cart.findIndex(item => item.medicineId === medicineId);

    if (existingIndex !== -1) {
      if (this.cart[existingIndex].qty >= med.stock) {
        toast.warning(`Maximum available stock (${med.stock}) already in cart.`, 'Stock Limit Reached');
        return;
      }
      this.cart[existingIndex].qty += 1;
    } else {
      this.cart.push({
        medicineId: med.id,
        name: med.name,
        genericName: med.genericName,
        batch: med.batchNumber,
        expiry: med.expiryDate,
        price: Number(med.price),
        gst: Number(med.gst || 12),
        qty: 1,
        maxStock: med.stock
      });
    }

    this.renderCart();
    this.renderMedicineCatalog();
  },

  updateQuantity(index, delta) {
    if (!this.cart[index]) return;
    const item = this.cart[index];
    const newQty = item.qty + delta;

    if (newQty <= 0) {
      this.removeItem(index);
      return;
    }

    if (newQty > item.maxStock) {
      toast.warning(`Cannot exceed available inventory (${item.maxStock} units).`, 'Stock Limit');
      return;
    }

    item.qty = newQty;
    this.renderCart();
    this.renderMedicineCatalog();
  },

  setQuantity(index, value) {
    if (!this.cart[index]) return;
    const item = this.cart[index];
    let newQty = parseInt(value, 10);

    if (isNaN(newQty) || newQty <= 0) {
      this.removeItem(index);
      return;
    }

    if (newQty > item.maxStock) {
      toast.warning(`Adjusted to maximum available stock of ${item.maxStock}.`, 'Stock Limit');
      newQty = item.maxStock;
    }

    item.qty = newQty;
    this.renderCart();
    this.renderMedicineCatalog();
  },

  removeItem(index) {
    if (!this.cart[index]) return;
    const item = this.cart[index];
    this.cart.splice(index, 1);
    this.renderCart();
    this.renderMedicineCatalog();
    toast.info(`Removed ${item.name} from cart.`);
  },

  renderCart() {
    const cartTbody = document.getElementById('pos-cart-tbody');
    const cartCountEl = document.getElementById('pos-cart-count');
    if (!cartTbody) return;

    if (cartCountEl) {
      const totalUnits = this.cart.reduce((sum, i) => sum + i.qty, 0);
      cartCountEl.textContent = `${totalUnits} items`;
    }

    if (this.cart.length === 0) {
      cartTbody.innerHTML = `
        <tr>
          <td colspan="5" class="pos-cart-empty-row">
            <i class="fa-solid fa-cart-shopping fa-2x mb-2 text-muted"></i>
            <p>Cart is empty. Select medicines from the catalog to build an order.</p>
          </td>
        </tr>
      `;
      this.calculateTotals();
      return;
    }

    cartTbody.innerHTML = this.cart.map((item, index) => {
      const lineTotal = (item.price * item.qty).toFixed(2);
      return `
        <tr>
          <td>
            <div class="font-medium text-primary text-sm">${item.name}</div>
            <div class="text-2xs text-muted">Batch: ${item.batch} • ₹${item.price.toFixed(2)}</div>
          </td>
          <td>
            <div class="cart-qty-control">
              <button type="button" class="btn-qty" onclick="POSModule.updateQuantity(${index}, -1)">-</button>
              <input type="number" class="input-qty" value="${item.qty}" min="1" max="${item.maxStock}" onchange="POSModule.setQuantity(${index}, this.value)">
              <button type="button" class="btn-qty" onclick="POSModule.updateQuantity(${index}, 1)">+</button>
            </div>
          </td>
          <td class="text-right font-medium">₹${item.price.toFixed(2)}</td>
          <td class="text-right font-semibold">₹${lineTotal}</td>
          <td class="text-center">
            <button class="btn btn-icon btn-sm text-danger" title="Remove" onclick="POSModule.removeItem(${index})">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    this.calculateTotals();
  },

  calculateTotals() {
    let subtotal = 0;
    let totalGst = 0;

    this.cart.forEach(item => {
      const itemSubtotal = item.price * item.qty;
      subtotal += itemSubtotal;

      // GST calculated on item rate
      const gstRate = item.gst || 12;
      const gstAmt = (itemSubtotal * gstRate) / 100;
      totalGst += gstAmt;
    });

    const discount = Math.min(this.discountAmount, subtotal + totalGst);
    const grandTotal = Math.max(0, subtotal + totalGst - discount);

    // Update UI elements
    const elSubtotal = document.getElementById('pos-subtotal');
    if (elSubtotal) elSubtotal.textContent = `₹${subtotal.toFixed(2)}`;

    const elGst = document.getElementById('pos-tax-amount');
    if (elGst) elGst.textContent = `₹${totalGst.toFixed(2)}`;

    const elDiscount = document.getElementById('pos-discount-display');
    if (elDiscount) elDiscount.textContent = `-₹${discount.toFixed(2)}`;

    const elGrandTotal = document.getElementById('pos-grand-total');
    if (elGrandTotal) elGrandTotal.textContent = `₹${grandTotal.toFixed(2)}`;

    // Update cash tender suggestion
    const cashInput = document.getElementById('pos-cash-tendered');
    if (cashInput && !cashInput.value) {
      cashInput.placeholder = `₹${Math.ceil(grandTotal)}`;
    }

    this.updateCashChange();
  },

  updatePaymentFields() {
    const cashContainer = document.getElementById('pos-cash-details-group');
    if (cashContainer) {
      cashContainer.style.display = this.paymentMethod === 'Cash' ? 'block' : 'none';
    }
  },

  updateCashChange() {
    const cashInput = document.getElementById('pos-cash-tendered');
    const changeDisplay = document.getElementById('pos-cash-change');
    const grandTotalEl = document.getElementById('pos-grand-total');

    if (!changeDisplay || !grandTotalEl) return;

    const grandTotal = parseFloat(grandTotalEl.textContent.replace('₹', '')) || 0;
    const tendered = parseFloat(cashInput ? cashInput.value : 0) || 0;

    if (tendered >= grandTotal && grandTotal > 0) {
      const change = (tendered - grandTotal).toFixed(2);
      changeDisplay.textContent = `₹${change}`;
      changeDisplay.className = 'text-success font-semibold';
    } else {
      changeDisplay.textContent = `₹0.00`;
      changeDisplay.className = 'text-muted font-normal';
    }
  },

  completeSale() {
    if (this.cart.length === 0) {
      toast.warning('Cart is empty. Add medicines before checkout.', 'Empty Cart');
      return;
    }

    // Verify stock availability
    for (const item of this.cart) {
      const med = storage.getMedicineById(item.medicineId);
      if (!med || med.stock < item.qty) {
        toast.error(`Insufficient stock for ${item.name}. Available: ${med ? med.stock : 0}`, 'Stock Error');
        return;
      }
    }

    const custSelect = document.getElementById('pos-customer-select');
    const custId = custSelect ? custSelect.value : 'WALK-IN';
    const custPhone = document.getElementById('pos-customer-phone')?.value.trim() || 'N/A';
    const doctorName = document.getElementById('pos-doctor-ref')?.value.trim() || '';

    let customerName = 'Walk-in Customer';
    if (custId !== 'WALK-IN') {
      const cust = storage.getCustomerById(custId);
      if (cust) customerName = cust.name;
    }

    // Financial calculations
    let subtotal = 0;
    let totalGst = 0;
    const saleItems = this.cart.map(item => {
      const lineSubtotal = item.price * item.qty;
      subtotal += lineSubtotal;
      const gstAmt = (lineSubtotal * (item.gst || 12)) / 100;
      totalGst += gstAmt;

      return {
        medicineId: item.medicineId,
        name: item.name,
        batch: item.batch,
        expiry: item.expiry,
        price: item.price,
        gst: item.gst || 12,
        qty: item.qty,
        total: Number((lineSubtotal + gstAmt).toFixed(2))
      };
    });

    const discount = Math.min(this.discountAmount, subtotal + totalGst);
    const grandTotal = Number((subtotal + totalGst - discount).toFixed(2));

    const cashInput = document.getElementById('pos-cash-tendered');
    let cashTendered = grandTotal;
    let changeReturned = 0;

    if (this.paymentMethod === 'Cash' && cashInput && parseFloat(cashInput.value)) {
      cashTendered = parseFloat(cashInput.value);
      changeReturned = Math.max(0, cashTendered - grandTotal);
    }

    // Process sale transaction through storage
    const saleRecord = storage.createSale({
      customerId: custId,
      customerName,
      customerPhone: custPhone,
      doctorName,
      paymentMethod: this.paymentMethod,
      subtotal,
      gstAmount: totalGst,
      discountAmount: discount,
      totalAmount: grandTotal,
      cashTendered,
      changeReturned,
      items: saleItems,
      cashier: 'Chief Pharmacist'
    });

    // Reset POS cart state
    this.cart = [];
    this.discountAmount = 0;
    const discInputEl = document.getElementById('pos-discount-input');
    if (discInputEl) discInputEl.value = '';
    if (cashInput) cashInput.value = '';
    const docRefEl = document.getElementById('pos-doctor-ref');
    if (docRefEl) docRefEl.value = '';

    this.renderCart();
    this.renderMedicineCatalog();

    toast.success(`Invoice ${saleRecord.id} generated successfully!`, 'Transaction Complete');

    // Show printable invoice modal immediately
    this.showInvoiceModal(saleRecord.id);
  },

  showInvoiceModal(saleId) {
    const sale = storage.getSaleById(saleId);
    if (!sale) {
      toast.error('Sale record not found.');
      return;
    }

    const settings = storage.getSettings();
    const invoiceBody = document.getElementById('invoice-modal-content');
    if (!invoiceBody) return;

    const dateObj = new Date(sale.date);
    const dateFormatted = dateObj.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const timeFormatted = dateObj.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Calculate CGST and SGST split (half of total GST)
    const cgst = (sale.gstAmount / 2).toFixed(2);
    const sgst = (sale.gstAmount / 2).toFixed(2);

    invoiceBody.innerHTML = `
      <div class="tax-invoice-sheet" id="printable-tax-invoice">
        <!-- Invoice Header -->
        <div class="invoice-header">
          <div class="invoice-brand">
            <div class="invoice-logo">
              <i class="fa-solid fa-hand-holding-medical"></i>
            </div>
            <div>
              <h2 class="invoice-company-name">${settings.pharmacyName}</h2>
              <p class="invoice-company-sub">${settings.tagline}</p>
              <p class="invoice-company-address">${settings.address}</p>
              <p class="invoice-company-contact">Phone: ${settings.phone} • Email: ${settings.email}</p>
            </div>
          </div>
          <div class="invoice-licence-block">
            <div class="invoice-badge">RETAIL TAX INVOICE</div>
            <div class="licence-row"><strong>DL No:</strong> ${settings.dlNumber}</div>
            <div class="licence-row"><strong>GSTIN:</strong> ${settings.gstin}</div>
          </div>
        </div>

        <div class="invoice-divider"></div>

        <!-- Meta Details -->
        <div class="invoice-meta-grid">
          <div class="meta-col">
            <div class="meta-row"><span class="meta-lbl">Invoice No:</span> <strong class="text-primary font-mono">${sale.id}</strong></div>
            <div class="meta-row"><span class="meta-lbl">Date & Time:</span> ${dateFormatted} at ${timeFormatted}</div>
            <div class="meta-row"><span class="meta-lbl">Cashier:</span> ${sale.cashier || 'Pharmacist'}</div>
          </div>
          <div class="meta-col">
            <div class="meta-row"><span class="meta-lbl">Patient/Buyer:</span> <strong>${sale.customerName}</strong></div>
            <div class="meta-row"><span class="meta-lbl">Contact:</span> ${sale.customerPhone || 'N/A'}</div>
            ${sale.doctorName ? `<div class="meta-row"><span class="meta-lbl">Prescribed by:</span> ${sale.doctorName}</div>` : ''}
          </div>
        </div>

        <!-- Itemized Table -->
        <table class="invoice-table">
          <thead>
            <tr>
              <th style="width: 35px;">#</th>
              <th>Description / Drug</th>
              <th>Batch</th>
              <th>Exp</th>
              <th class="text-center">Qty</th>
              <th class="text-right">MRP (₹)</th>
              <th class="text-right">GST %</th>
              <th class="text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items.map((item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>
                  <strong>${item.name}</strong>
                </td>
                <td class="font-mono text-xs">${item.batch || '—'}</td>
                <td class="text-xs">${item.expiry || '—'}</td>
                <td class="text-center font-semibold">${item.qty}</td>
                <td class="text-right">${item.price.toFixed(2)}</td>
                <td class="text-right">${item.gst || 12}%</td>
                <td class="text-right font-semibold">${item.total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Calculations Breakdown -->
        <div class="invoice-summary-section">
          <div class="invoice-terms">
            <h4>Terms & Conditions:</h4>
            <ol>
              <li>Schedule H/H1 drugs dispensed strictly against verified registered medical practitioner's prescription.</li>
              <li>Refrigerated items and unsealed blister strips cannot be exchanged or refunded.</li>
              <li>Returns accepted within 48 hours with original printed tax invoice.</li>
            </ol>
            <div class="invoice-qr-mock">
              <i class="fa-solid fa-qrcode fa-3x"></i>
              <span class="text-2xs block text-muted">UPI QR Payment Verified</span>
            </div>
          </div>

          <div class="invoice-totals-box">
            <div class="total-line">
              <span>Items Subtotal</span>
              <span>₹${sale.subtotal.toFixed(2)}</span>
            </div>
            <div class="total-line">
              <span>CGST</span>
              <span>₹${cgst}</span>
            </div>
            <div class="total-line">
              <span>SGST</span>
              <span>₹${sgst}</span>
            </div>
            ${sale.discountAmount > 0 ? `
              <div class="total-line text-success">
                <span>Special Discount</span>
                <span>-₹${sale.discountAmount.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="total-line grand-total-line">
              <span>Net Amount Payable</span>
              <span>₹${sale.totalAmount.toFixed(2)}</span>
            </div>
            <div class="payment-settled-info">
              <span>Payment Mode: <strong>${sale.paymentMethod}</strong></span>
              ${sale.paymentMethod === 'Cash' ? `
                <span>Tendered: ₹${sale.cashTendered.toFixed(2)} | Change: ₹${sale.changeReturned.toFixed(2)}</span>
              ` : '<span class="badge badge-success text-xs">PAID FULLY</span>'}
            </div>
          </div>
        </div>

        <div class="invoice-footer">
          <p>Thank you for choosing ${settings.pharmacyName}! Wish you a speedy recovery.</p>
          <div class="signature-line">
            <span>Authorized Pharmacist Signature</span>
          </div>
        </div>
      </div>

      <div class="modal-actions-bar mt-4 no-print">
        <button type="button" class="btn btn-outline" onclick="modal.close('modal-invoice')">Close</button>
        <button type="button" class="btn btn-secondary" onclick="POSModule.printInvoice()">
          <i class="fa-solid fa-print"></i> Print Invoice
        </button>
        <button type="button" class="btn btn-warning" onclick="modal.close('modal-invoice'); App.navigateTo('inventory');">
          <i class="fa-solid fa-boxes-stacked"></i> View Inventory
        </button>
        <button type="button" class="btn btn-primary" onclick="modal.close('modal-invoice'); App.navigateTo('pos');">
          <i class="fa-solid fa-plus"></i> New Billing
        </button>
      </div>
    `;

    modal.open('modal-invoice');
  },

  printInvoice() {
    window.print();
  },

  quickAddToCart(medicineId) {
    App.navigateTo('pos');
    setTimeout(() => {
      this.addItem(medicineId);
    }, 150);
  }
};
