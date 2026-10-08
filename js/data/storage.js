/**
 * MediCore Pharmacy Management System
 * Storage & State Management Layer (LocalStorage backed)
 */

class DataStorage {
  constructor() {
    this.STORAGE_KEY = 'medicore_pharmacy_db_v1';
    this.listeners = {};
    this.init();
  }

  // Initialize or hydrate from LocalStorage
  init() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        this.resetToDefaults();
      } else {
        this.data = JSON.parse(stored);
        // Ensure all required collections exist
        if (!this.data.medicines || !this.data.customers || !this.data.suppliers || !this.data.sales) {
          this.resetToDefaults();
        }
      }
    } catch (e) {
      console.error('Failed to parse localStorage data, resetting to seed defaults:', e);
      this.resetToDefaults();
    }
  }

  // Save current state into LocalStorage
  save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
      this.emit('change', this.data);
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  }

  // Event Subscription
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  emit(event, payload) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`Error in event listener for ${event}:`, err);
        }
      });
    }
  }

  // Reset to initial Seed Data
  resetToDefaults() {
    this.data = JSON.parse(JSON.stringify(SEED_DATA));
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    this.emit('change', this.data);
    this.emit('reset', this.data);
  }

  // Export JSON backup
  exportBackup() {
    return JSON.stringify(this.data, null, 2);
  }

  // Import JSON backup
  importBackup(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.medicines || !Array.isArray(parsed.medicines)) {
        throw new Error('Invalid backup file format: missing medicines array.');
      }
      this.data = parsed;
      this.save();
      this.emit('imported', this.data);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // =================== SETTINGS ===================
  getSettings() {
    return this.data.settings || SEED_DATA.settings;
  }

  saveSettings(newSettings) {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.save();
    this.addActivity('settings', 'Settings Updated', 'Pharmacy configuration and tax rates were updated.');
    this.emit('settingsUpdated', this.data.settings);
  }

  // =================== MEDICINES ===================
  getMedicines() {
    return this.data.medicines || [];
  }

  getMedicineById(id) {
    return this.getMedicines().find(m => m.id === id);
  }

  saveMedicine(medicine) {
    if (!medicine.id) {
      medicine.id = 'MED-' + Math.floor(1000 + Math.random() * 9000);
      this.data.medicines.unshift(medicine);
      this.addActivity('medicine', 'Medicine Added', `Added ${medicine.name} (Batch: ${medicine.batchNumber})`);
    } else {
      const index = this.data.medicines.findIndex(m => m.id === medicine.id);
      if (index !== -1) {
        this.data.medicines[index] = { ...this.data.medicines[index], ...medicine };
        this.addActivity('medicine', 'Medicine Updated', `Updated details for ${medicine.name}`);
      } else {
        this.data.medicines.unshift(medicine);
      }
    }
    this.save();
    this.emit('medicinesUpdated', this.data.medicines);
    return medicine;
  }

  deleteMedicine(id) {
    const med = this.getMedicineById(id);
    if (!med) return false;
    this.data.medicines = this.data.medicines.filter(m => m.id !== id);
    this.addActivity('medicine', 'Medicine Deleted', `Removed ${med.name} (${med.batchNumber}) from inventory`);
    this.save();
    this.emit('medicinesUpdated', this.data.medicines);
    return true;
  }

  // =================== INVENTORY ADJUSTMENT & RESTOCK ===================
  adjustStock(medicineId, deltaQuantity, reason) {
    const med = this.getMedicineById(medicineId);
    if (!med) return false;

    const oldStock = med.stock;
    const newStock = Math.max(0, med.stock + deltaQuantity);
    med.stock = newStock;

    const actionType = deltaQuantity >= 0 ? 'Increased' : 'Decreased';
    this.addActivity(
      'stock',
      'Stock Adjusted',
      `${med.name}: ${actionType} by ${Math.abs(deltaQuantity)} units (from ${oldStock} to ${newStock}). Reason: ${reason}`
    );

    this.save();
    this.emit('stockUpdated', { medicine: med, oldStock, newStock });
    return true;
  }

  restockMedicine(medicineId, quantity, supplierId, purchasePrice) {
    const med = this.getMedicineById(medicineId);
    if (!med) return false;

    const oldStock = med.stock;
    med.stock += Number(quantity);
    if (purchasePrice) med.purchasePrice = Number(purchasePrice);
    if (supplierId) {
      med.supplierId = supplierId;
      const supplier = this.getSupplierById(supplierId);
      if (supplier) med.supplierName = supplier.name;
    }

    this.addActivity(
      'stock',
      'Stock Restocked',
      `Restocked +${quantity} units of ${med.name} (Now: ${med.stock} units)`
    );

    this.save();
    this.emit('stockUpdated', { medicine: med, oldStock, newStock: med.stock });
    return true;
  }

  // =================== POINT OF SALE & SALES ===================
  getSales() {
    return this.data.sales || [];
  }

  getSaleById(id) {
    return this.getSales().find(s => s.id === id);
  }

  createSale(saleData) {
    // Generate Invoice ID
    const todayYear = new Date().getFullYear();
    const invoiceNumber = 1000 + (this.data.sales ? this.data.sales.length + 1 : 1);
    const invoiceId = `INV-${todayYear}-${invoiceNumber}`;

    const newSale = {
      id: invoiceId,
      date: new Date().toISOString(),
      customerId: saleData.customerId || 'WALK-IN',
      customerName: saleData.customerName || 'Walk-in Customer',
      customerPhone: saleData.customerPhone || 'N/A',
      doctorName: saleData.doctorName || '',
      paymentMethod: saleData.paymentMethod || 'Cash',
      subtotal: Number(saleData.subtotal || 0),
      gstAmount: Number(saleData.gstAmount || 0),
      discountAmount: Number(saleData.discountAmount || 0),
      totalAmount: Number(saleData.totalAmount || 0),
      cashTendered: Number(saleData.cashTendered || saleData.totalAmount || 0),
      changeReturned: Number(saleData.changeReturned || 0),
      items: saleData.items || [],
      cashier: saleData.cashier || 'Pharmacist'
    };

    // Deduct stock for each medicine sold
    newSale.items.forEach(item => {
      const med = this.getMedicineById(item.medicineId);
      if (med) {
        med.stock = Math.max(0, med.stock - Number(item.qty));
      }
    });

    // Update customer stats if registered customer
    if (newSale.customerId && newSale.customerId !== 'WALK-IN') {
      const customer = this.getCustomerById(newSale.customerId);
      if (customer) {
        customer.totalOrders = (customer.totalOrders || 0) + 1;
        customer.totalSpent = (customer.totalSpent || 0) + Number(newSale.totalAmount);
        const saleDateStr = newSale.date ? newSale.date.split('T')[0] : new Date().toISOString().split('T')[0];
        customer.lastVisit = saleDateStr;
        customer.lastPurchase = saleDateStr;
      }
    }

    // Add to sales record
    this.data.sales.unshift(newSale);

    // Record audit activity
    this.addActivity(
      'sale',
      'Sale Completed',
      `${invoiceId} generated for ${newSale.customerName}: ₹${newSale.totalAmount.toFixed(2)} (${newSale.paymentMethod})`
    );

    this.save();
    this.emit('saleCompleted', newSale);
    this.emit('customersUpdated', this.data.customers);
    return newSale;
  }

  // =================== CUSTOMERS ===================
  getCustomers() {
    return this.data.customers || [];
  }

  getCustomerById(id) {
    return this.getCustomers().find(c => c.id === id);
  }

  saveCustomer(customer) {
    if (!customer.id) {
      customer.id = 'CUST-' + String(this.data.customers.length + 1).padStart(3, '0');
      customer.totalOrders = customer.totalOrders || 0;
      customer.totalSpent = customer.totalSpent || 0;
      customer.lastVisit = customer.lastVisit || new Date().toISOString().split('T')[0];
      customer.lastPurchase = customer.lastPurchase || 'No Purchases';
      this.data.customers.unshift(customer);
      this.addActivity('customer', 'New Customer Added', `Registered customer: ${customer.name}`);
    } else {
      const index = this.data.customers.findIndex(c => c.id === customer.id);
      if (index !== -1) {
        this.data.customers[index] = { ...this.data.customers[index], ...customer };
        this.addActivity('customer', 'Customer Updated', `Updated profile for ${customer.name}`);
      } else {
        this.data.customers.unshift(customer);
      }
    }
    this.save();
    this.emit('customersUpdated', this.data.customers);
    return customer;
  }

  deleteCustomer(id) {
    const cust = this.getCustomerById(id);
    if (!cust) return false;
    this.data.customers = this.data.customers.filter(c => c.id !== id);
    this.addActivity('customer', 'Customer Removed', `Deleted customer record: ${cust.name}`);
    this.save();
    this.emit('customersUpdated', this.data.customers);
    return true;
  }

  // =================== SUPPLIERS ===================
  getSuppliers() {
    return this.data.suppliers || [];
  }

  getSupplierById(id) {
    return this.getSuppliers().find(s => s.id === id);
  }

  saveSupplier(supplier) {
    if (!supplier.id) {
      supplier.id = 'SUP-' + String(this.data.suppliers.length + 1).padStart(2, '0');
      supplier.pendingOrders = supplier.pendingOrders || 0;
      supplier.balanceDue = supplier.balanceDue || 0;
      this.data.suppliers.unshift(supplier);
      this.addActivity('supplier', 'Supplier Added', `Registered vendor: ${supplier.name}`);
    } else {
      const index = this.data.suppliers.findIndex(s => s.id === supplier.id);
      if (index !== -1) {
        this.data.suppliers[index] = { ...this.data.suppliers[index], ...supplier };
        this.addActivity('supplier', 'Supplier Updated', `Updated vendor profile: ${supplier.name}`);
      } else {
        this.data.suppliers.unshift(supplier);
      }
    }
    this.save();
    this.emit('suppliersUpdated', this.data.suppliers);
    return supplier;
  }

  deleteSupplier(id) {
    const sup = this.getSupplierById(id);
    if (!sup) return false;
    this.data.suppliers = this.data.suppliers.filter(s => s.id !== id);
    this.addActivity('supplier', 'Supplier Removed', `Deleted vendor: ${sup.name}`);
    this.save();
    this.emit('suppliersUpdated', this.data.suppliers);
    return true;
  }

  // Create Purchase Order
  createPurchaseOrder(supplierId, items, orderTotal) {
    const supplier = this.getSupplierById(supplierId);
    if (!supplier) return false;
    supplier.pendingOrders = (supplier.pendingOrders || 0) + 1;
    supplier.balanceDue = (supplier.balanceDue || 0) + Number(orderTotal || 0);

    this.addActivity(
      'supplier',
      'Purchase Order Placed',
      `PO placed with ${supplier.name} for ₹${Number(orderTotal).toFixed(2)} (${items.length} items)`
    );

    this.save();
    this.emit('suppliersUpdated', this.data.suppliers);
    return true;
  }

  // =================== PRESCRIPTIONS ===================
  getPrescriptions() {
    return this.data.prescriptions || [];
  }

  getPrescriptionById(id) {
    return this.getPrescriptions().find(p => p.id === id);
  }

  savePrescription(prescription) {
    if (!prescription.id) {
      const year = new Date().getFullYear();
      const num = String(this.data.prescriptions.length + 1).padStart(3, '0');
      prescription.id = `RX-${year}-${num}`;
      prescription.status = prescription.status || 'Pending';
      prescription.date = prescription.date || new Date().toISOString().split('T')[0];
      this.data.prescriptions.unshift(prescription);
      this.addActivity('prescription', 'Rx Received', `New prescription ${prescription.id} for ${prescription.patientName}`);
    } else {
      const index = this.data.prescriptions.findIndex(p => p.id === prescription.id);
      if (index !== -1) {
        this.data.prescriptions[index] = { ...this.data.prescriptions[index], ...prescription };
      } else {
        this.data.prescriptions.unshift(prescription);
      }
    }
    this.save();
    this.emit('prescriptionsUpdated', this.data.prescriptions);
    return prescription;
  }

  updatePrescriptionStatus(id, newStatus) {
    const rx = this.getPrescriptionById(id);
    if (!rx) return false;
    const oldStatus = rx.status;
    rx.status = newStatus;
    this.addActivity('prescription', `Prescription ${newStatus}`, `${rx.id} (${rx.patientName}) updated to ${newStatus}`);
    this.save();
    this.emit('prescriptionsUpdated', this.data.prescriptions);
    return true;
  }

  // =================== AUDIT ACTIVITIES ===================
  getActivities() {
    return this.data.activities || [];
  }

  addActivity(type, title, description) {
    const newAct = {
      id: 'ACT-' + Date.now(),
      timestamp: new Date().toISOString(),
      type,
      title,
      description,
      icon: this.getActivityIcon(type)
    };
    if (!this.data.activities) this.data.activities = [];
    this.data.activities.unshift(newAct);
    // Keep last 50 activities
    if (this.data.activities.length > 50) {
      this.data.activities.pop();
    }
  }

  getActivityIcon(type) {
    switch (type) {
      case 'sale': return 'fa-receipt';
      case 'prescription': return 'fa-file-prescription';
      case 'stock': return 'fa-boxes-stacked';
      case 'medicine': return 'fa-pills';
      case 'customer': return 'fa-user-check';
      case 'supplier': return 'fa-truck-field';
      case 'alert': return 'fa-triangle-exclamation';
      case 'settings': return 'fa-sliders';
      default: return 'fa-bell';
    }
  }

  // =================== SMART ALERTS & METRICS COMPUTATION ===================
  getAlerts() {
    const medicines = this.getMedicines();
    const settings = this.getSettings();
    const now = new Date();

    const alerts = [];

    // 1. Out of stock alerts (Critical)
    medicines.filter(m => m.stock === 0).forEach(m => {
      alerts.push({
        id: `ALERT-OOS-${m.id}`,
        type: 'out-of-stock',
        severity: 'critical',
        title: `Out of Stock: ${m.name}`,
        message: `${m.name} (${m.batchNumber}) has 0 stock remaining. Dispensing is blocked.`,
        medicineId: m.id,
        date: new Date().toISOString(),
        action: 'restock'
      });
    });

    // 2. Low stock alerts (Warning)
    medicines.filter(m => m.stock > 0 && m.stock <= (m.minStock || settings.lowStockThreshold)).forEach(m => {
      alerts.push({
        id: `ALERT-LOW-${m.id}`,
        type: 'low-stock',
        severity: 'warning',
        title: `Low Stock: ${m.name}`,
        message: `Only ${m.stock} units remaining (Minimum threshold: ${m.minStock || settings.lowStockThreshold}).`,
        medicineId: m.id,
        date: new Date().toISOString(),
        action: 'restock'
      });
    });

    // 3, 4 & 5. Expiry Tracking: Expired, Expiring within 7 days, Expiring within 30 days
    medicines.forEach(m => {
      if (!m.expiryDate) return;
      const expiry = new Date(m.expiryDate);
      const diffTime = expiry - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        // Expired (Critical)
        alerts.push({
          id: `ALERT-EXP-${m.id}`,
          type: 'expired',
          severity: 'critical',
          title: `Expired Drug: ${m.name}`,
          message: `Batch ${m.batchNumber} expired on ${m.expiryDate}. Quarantine and dispose immediately.`,
          medicineId: m.id,
          date: new Date().toISOString(),
          action: 'dispose'
        });
      } else if (diffDays <= 7) {
        // Expiring within 7 days (Critical)
        alerts.push({
          id: `ALERT-EXP7-${m.id}`,
          type: 'expiring-7d',
          severity: 'critical',
          title: `Critical Expiry (7 Days): ${m.name}`,
          message: `Batch ${m.batchNumber} expires in ${diffDays} day(s) on ${m.expiryDate}. Immediate clearance required.`,
          medicineId: m.id,
          date: new Date().toISOString(),
          action: 'view'
        });
      } else if (diffDays <= 30) {
        // Expiring within 30 days (Warning)
        alerts.push({
          id: `ALERT-EXP30-${m.id}`,
          type: 'expiring-30d',
          severity: 'warning',
          title: `Expiring within 30 Days: ${m.name}`,
          message: `Batch ${m.batchNumber} expires in ${diffDays} days on ${m.expiryDate}. Prioritize FIFO dispensing.`,
          medicineId: m.id,
          date: new Date().toISOString(),
          action: 'view'
        });
      }
    });

    // 6. Pending Prescriptions (Warning)
    const prescriptions = this.getPrescriptions ? this.getPrescriptions() : [];
    prescriptions.filter(rx => rx.status === 'Pending').forEach(rx => {
      alerts.push({
        id: `ALERT-RX-${rx.id}`,
        type: 'pending-prescription',
        severity: 'warning',
        title: `Pending Clinical Verification: ${rx.id}`,
        message: `Doctor ${rx.doctorName} prescribed for ${rx.patientName} (${rx.items ? rx.items.length : 0} items) awaiting pharmacist review.`,
        prescriptionId: rx.id,
        date: rx.date || new Date().toISOString(),
        action: 'prescription'
      });
    });

    // 7. Pending Supplier Orders (Information)
    const suppliers = this.getSuppliers ? this.getSuppliers() : [];
    suppliers.filter(s => s.pendingOrders > 0).forEach(s => {
      alerts.push({
        id: `ALERT-SUP-${s.id}`,
        type: 'supplier-order',
        severity: 'info',
        title: `Pending Wholesaler Shipment: ${s.name}`,
        message: `${s.pendingOrders} purchase order(s) awaiting delivery. Outstanding balance: ₹${Number(s.balanceDue || 0).toFixed(2)}`,
        supplierId: s.id,
        date: new Date().toISOString(),
        action: 'supplier'
      });
    });

    // System Success / Compliance Status (Success)
    const compliantCount = medicines.filter(m => m.stock > (m.minStock || settings.lowStockThreshold)).length;
    if (compliantCount > 0) {
      alerts.push({
        id: 'ALERT-SYSTEM-STATUS',
        type: 'compliance',
        severity: 'success',
        title: 'Inventory Audit Synchronization Active',
        message: `${compliantCount} pharmaceutical items currently operating with optimal warehouse stock balances.`,
        date: new Date().toISOString(),
        action: 'none'
      });
    }

    return alerts;
  }
}

// Global Storage instance
const storage = new DataStorage();
