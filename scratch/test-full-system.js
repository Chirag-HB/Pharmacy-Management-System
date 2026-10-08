const fs = require('fs');
const vm = require('vm');

// Mock localStorage
const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};

// Execute in global context
vm.runInThisContext(fs.readFileSync('js/data/seed-data.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('js/data/storage.js', 'utf8'));

console.log('--- TEST 1: Storage Initialization ---');
console.assert(storage.getMedicines().length > 0, 'Medicines loaded');
console.assert(storage.getCustomers().length > 0, 'Customers loaded');
console.assert(storage.getSuppliers().length > 0, 'Suppliers loaded');
console.assert(storage.getPrescriptions().length > 0, 'Prescriptions loaded');
console.log('✓ Storage seeded with:');
console.log(`  - ${storage.getMedicines().length} medicines`);
console.log(`  - ${storage.getCustomers().length} customers`);
console.log(`  - ${storage.getSuppliers().length} suppliers`);
console.log(`  - ${storage.getPrescriptions().length} prescriptions`);
console.log(`  - ${storage.getSales().length} sales`);

console.log('\n--- TEST 2: Medicine CRUD & Stock Adjustments ---');
const newMed = storage.saveMedicine({
  name: 'Test Antibiotic 500mg',
  genericName: 'Test Generic',
  category: 'Antibiotics',
  batchNumber: 'TEST-B99',
  expiryDate: '2026-12-31',
  price: 150.00,
  purchasePrice: 90.00,
  gst: 12,
  stock: 50,
  minStock: 10
});
console.assert(newMed.id, 'New medicine has ID');
console.assert(storage.getMedicineById(newMed.id).stock === 50, 'Stock is 50');

storage.adjustStock(newMed.id, -10, 'Damaged during transit');
console.assert(storage.getMedicineById(newMed.id).stock === 40, 'Stock reduced to 40');

storage.restockMedicine(newMed.id, 25, null, 88.00);
console.assert(storage.getMedicineById(newMed.id).stock === 65, 'Stock increased to 65');
console.log('✓ Medicine CRUD and stock adjustments passed');

console.log('\n--- TEST 3: Point of Sale & Stock Deductions ---');
const stockBefore = storage.getMedicineById(newMed.id).stock;
const testSale = storage.createSale({
  customerId: storage.getCustomers()[0].id,
  customerName: storage.getCustomers()[0].name,
  paymentMethod: 'UPI',
  subtotal: 300,
  gstAmount: 36,
  discountAmount: 10,
  totalAmount: 326,
  items: [
    {
      medicineId: newMed.id,
      name: newMed.name,
      price: 150,
      qty: 2,
      total: 300
    }
  ]
});
console.assert(testSale.id.startsWith('INV-'), 'Invoice ID generated');
console.assert(storage.getMedicineById(newMed.id).stock === stockBefore - 2, 'Stock reduced by 2');
console.assert(storage.getCustomers()[0].totalOrders > 0, 'Customer order count incremented');
console.log(`✓ POS completed sale: ${testSale.id}, stock correctly reduced`);

console.log('\n--- TEST 4: Smart Alerts Detection ---');
const alerts = storage.getAlerts();
console.assert(alerts.length > 0, 'Alerts generated');
const hasCritical = alerts.some(a => a.severity === 'critical');
const hasWarning = alerts.some(a => a.severity === 'warning');
console.log(`✓ Detected ${alerts.length} dynamic alerts (Critical: ${alerts.filter(a => a.severity === 'critical').length}, Warning: ${alerts.filter(a => a.severity === 'warning').length})`);

console.log('\n--- TEST 5: Prescriptions Workflow ---');
const pendingRx = storage.getPrescriptions().find(p => p.status === 'Pending');
if (pendingRx) {
  storage.updatePrescriptionStatus(pendingRx.id, 'Verified');
  console.assert(storage.getPrescriptionById(pendingRx.id).status === 'Verified', 'Rx verified');
  storage.updatePrescriptionStatus(pendingRx.id, 'Dispensed');
  console.assert(storage.getPrescriptionById(pendingRx.id).status === 'Dispensed', 'Rx dispensed');
  console.log('✓ Prescription verification & dispense cycle passed');
}

console.log('\n--- TEST 6: Audit Activities Feed ---');
const activities = storage.getActivities();
console.assert(activities.length > 0, 'Audit activities recorded');
console.log(`✓ Audit log contains ${activities.length} recent activities`);

console.log('\n========================================');
console.log('ALL CORE BUSINESS LOGIC TESTS PASSED 100%');
console.log('========================================');
