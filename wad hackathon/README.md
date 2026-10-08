# MediCore — Modern Pharmacy Management System (ERP / SaaS)

![MediCore Banner](https://img.shields.io/badge/MediCore-Healthcare%20ERP-0284c7?style=for-the-badge&logo=mediamarkt&logoColor=white)
![Tech Stack](https://img.shields.io/badge/Stack-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS-10b981?style=for-the-badge)
![Storage](https://img.shields.io/badge/Storage-localStorage%20(Offline%20First)-f59e0b?style=for-the-badge)
![Licence](https://img.shields.io/badge/License-MIT%20Hackathon%20Project-8b5cf6?style=for-the-badge)

**MediCore** is a modern, enterprise-grade, client-side Pharmacy Management Single-Page Web Application (SPA) designed for retail pharmacies, hospital dispensaries, and pharmaceutical wholesale stockists.

Built specifically with **pure HTML5, CSS3, and modular Vanilla JavaScript** with **zero backend dependencies**, MediCore delivers the responsiveness, visual polish, and rich feature depth of a production SaaS platform.

---

## 🌟 Key Features Across 10 Core Modules

### 1. 📊 Operations Dashboard
- **Real-Time KPIs**: Today's revenue, active medicines in stock, low stock alert counter, expiring drugs counter, today's order count, and registered patients.
- **Interactive Visualizations**:
  - 7-Day Revenue & Order trend bar/line chart (Chart.js).
  - Therapeutic Category distribution doughnut chart.
- **Quick Action Triggers**: Instant navigation to POS, Add Medicine, Upload Rx, and View Alerts.
- **Critical Alerts Feed**: Immediate alerts for out-of-stock and expired drugs with 1-click restock or dispose actions.
- **Recent Invoices Table**: Real-time sales transactions with 1-click printable receipt popup.
- **Audit Activity Feed**: Timestamped chronological log of dispensations, stock adjustments, and registrations.

### 2. 💊 Medicines Catalog & Batch Control
- **Comprehensive Drug Monograph**: Brand name, generic formula, batch number, rack/shelf coordinate, manufacturing date, expiry date, purchase cost, MRP, GST rate, stock levels, and Schedule H prescription requirement flag.
- **Live Search & Filter**: Real-time substring search by drug name, chemical generic, or batch code.
- **Multi-parameter Filtering**: Filter by therapeutic category (Antibiotics, Cardiac, Diabetes, Gastro, etc.) and stock status (In stock, Low stock, Out of stock, Expired).
- **Sort Engine**: Sort by Name (A-Z / Z-A), Price, Stock Units, or Expiry Date.
- **Detailed Modal Monograph**: Displays unit profit margins, profit percentage, clinical indications, and supplier details.
- **CSV Data Export**: 1-click export of the entire medicine inventory to CSV.

### 3. 💳 Point of Sale (POS) Billing Terminal
- **Fast-Paced Counter Terminal**: Split-screen design with visual medicine cards on the left and sticky billing cart on the right.
- **Live Inventory Guard**: Prevents adding out-of-stock items or exceeding available physical quantity.
- **Customer Linking**: Select walk-in customer or choose/register recurring patients with auto-filled phone numbers.
- **Financial Calculations**:
  - Real-time line item subtotaling.
  - GST calculation (itemized CGST + SGST breakdown).
  - Discount engine (flat rate discount deductions).
  - Net Grand Total in INR (₹).
- **Payment Processing**: Multi-mode tender support (Cash, UPI QR, Debit/Credit Card) with live cash change return calculation.
- **Printable Retail Tax Invoice**:
  - Compliant with Indian Pharmacy Retail standards (DL numbers, GSTIN, HSN/Batch codes, Expiry dates, Doctor references).
  - Dedicated `@media print` print styles for crisp thermal receipt or A4 laser printing.

### 4. 📦 Inventory Auditing & Warehouse Operations
- **Stock Valuation**: Real-time computation of inventory assets at wholesale purchase price.
- **Physical Audit Adjustments**: Adjust stock with audited discrepancy reasons (*Damaged strip, Physical discrepancy, Customer return, Quarantine*).
- **Wholesaler Restocking**: 1-click restocking workflow updating stock levels, vendor records, and unit purchase prices.
- **Expiry Countdown**: Dynamic color-coded warnings (*Expired*, *Expires in X days*, or *Sufficient Shelf Life*).

### 5. 📑 Prescriptions (Rx) Dispensing Queue
- **Prescription Workflow Pipeline**: `Pending` ➔ `Approved` ➔ `Dispensed` or `Rejected`.
- **Clinical Details**: Prescribing doctor, medical council registration, hospital/clinic, diagnosis, patient details, and medication dosages.
- **Direct Handover to POS**: Clicking **"Dispense to POS"** automatically transitions to the billing terminal, selects the patient, and populates the cart with all prescribed items!
- **Digital Slip Simulation**: Visual digital prescription document preview.

### 6. 👥 Patients & Customer Profiles
- **Patient Directory**: Name, contact phone, email, address, age, gender, and blood group.
- **Medical Health Alert Box**: Prominently flags chronic ailments (e.g., *Type 2 Diabetes, Hypertension*) and drug allergies (e.g., *Penicillin allergy*).
- **Lifetime Financial Profiles**: Tracks customer visits, total lifetime spend, and complete historical invoice links.

### 7. 🚚 Wholesalers & Procurement Management
- **Vendor Directory**: Company name, contact manager, phone, email, GSTIN, credit payment terms, and lead times.
- **Purchase Order (PO) Engine**: Select vendor, draft medication line items, compute estimated purchase order value, and dispatch PO with live balance tracking.

### 8. 📈 Analytics & Financial Intelligence
- **Timeframe Selector**: Toggle between *Last 7 Days*, *Last 30 Days*, and *Year to Date*.
- **Metrics**: Gross Revenue, Invoices Dispensed, Average Order Value (AOV), and Estimated Gross Profit Margin %.
- **Interactive Visualizations**: Daily gross sales trend line, payment mode revenue doughnut, top 5 fast-moving medicines bar chart, and category inventory valuation breakdown.
- **Executive Report Export**: 1-click JSON analytical report generation.

### 9. 🚨 Alerts & Safety Monitoring Center
- **Triage Tabs**: Multi-severity triage (*All, Critical Out of Stock, Low Stock Warnings, Expiry Hazards, Wholesaler Delays*).
- **1-Click Remediation**:
  - "Restock Stock" opens pre-filled replenishment dialog.
  - "Dispose Drug" initiates quarantine write-off.
  - "View Wholesaler" jumps to pending shipments.
- **Live Counter Sync**: Header bell and sidebar badges update reactively whenever stock changes.

### 10. ⚙️ Store Profile & Settings
- **Pharmacy Customization**: Store name, address, DL numbers, and GSTIN.
- **Rules Configuration**: Default GST rate, low-stock threshold, expiry horizon.
- **Theme Preferences**: Instant Dark Mode / Light Mode toggle with local persistence.
- **Database Backup & Reset**:
  - Export full JSON database backup.
  - Restore backup from any JSON file.
  - **Reset to Factory Demo Data** button for quick hackathon resets!

---

## 💻 Technology Stack & Architecture

- **Frontend**: Semantic HTML5, CSS3 (Custom Design System with CSS Tokens), Vanilla JavaScript (ES6+).
- **Persistence**: Browser `localStorage` with reactive publish-subscribe architecture (`DataStorage`).
- **Icons**: Font Awesome 6.5.1 CDN.
- **Typography**: Google Fonts Inter.
- **Charts**: Chart.js 4.4.1 CDN.
- **Zero Dependencies**: Runs straight in the browser without bundlers, Webpack, or Node server required.

---

## 📁 Project Structure

```
wad hackathon/
├── index.html                  # Single Page Application root
├── server.js                   # Lightweight zero-dependency static server
├── README.md                   # Complete documentation & demo walkthrough
├── css/
│   ├── variables.css           # Design tokens, color palette, dark theme tokens
│   ├── layout.css              # Persistent sidebar, header, global search dropdown
│   ├── components.css          # Cards, buttons, tables, badges, modals, toasts
│   ├── views.css               # POS split-terminal, invoice layout, Rx viewer
│   └── print.css               # Print media rules for thermal & A4 invoice printing
├── js/
│   ├── data/
│   │   ├── seed-data.js        # Realistic Indian pharmacy dataset (20+ medicines, Rx, clients)
│   │   └── storage.js          # LocalStorage CRUD manager with event pub/sub
│   ├── components/
│   │   ├── toast.js            # Toast notifications with auto-dismiss
│   │   └── modal.js            # Accessible modal dialog system with Esc & backdrop handlers
│   ├── modules/
│   │   ├── dashboard.js        # Dashboard KPIs & Chart.js instances
│   │   ├── medicines.js        # Medicine CRUD, search, filter, sort & CSV export
│   │   ├── pos.js              # POS catalog, cart state, tender change & invoice modal
│   │   ├── inventory.js        # Stock audit, adjustments & restock workflows
│   │   ├── prescriptions.js    # Rx review queue, approve/reject & POS auto-dispense
│   │   ├── customers.js        # Patient directory, medical history & purchase history
│   │   ├── suppliers.js        # Wholesaler directory & purchase order generator
│   │   ├── analytics.js        # Business intelligence charts & performance metrics
│   │   ├── alerts.js           # Multi-severity alert triage with 1-click actions
│   │   └── settings.js         # Store settings, theme manager & JSON backup/restore
│   └── app.js                  # Main app controller, SPA router, shortcuts & search
```

---

## 🚀 How to Run the Application

### Option A: Direct Browser Launch (Simplest)
1. Navigate to the project directory: `wad hackathon/`
2. Double-click **`index.html`** or right-click and open with **Google Chrome**, **Microsoft Edge**, **Mozilla Firefox**, or **Safari**.
3. That's it! Everything works offline directly in your browser.

### Option B: Local Static Server (Recommended for Presentations)
1. Open PowerShell or Terminal in the project root:
   ```bash
   node server.js
   ```
2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## ⚡ Keyboard Shortcuts for Power Users

- <kbd>Ctrl</kbd> + <kbd>K</kbd> or <kbd>/</kbd> — Focus Global Live Search from anywhere
- <kbd>F2</kbd> — Jump straight to Point of Sale (POS) Billing Counter
- <kbd>Esc</kbd> — Close any active modal dialog
- <kbd>Ctrl</kbd> + <kbd>P</kbd> — Print current Retail Tax Invoice

---

## 🎯 Evaluator / Presentation Demo Walkthrough

1. **Dashboard & KPIs**:
   - Point out the real-time financial metrics, sales trend chart, and live activity audit log.
   - Click the **Dark Mode** toggle in the top-right header to showcase the obsidian navy theme.

2. **Point of Sale (POS) Flow**:
   - Press <kbd>F2</kbd> or click **"Point of Sale"**.
   - Select a customer (e.g. *Rajesh Sharma*) or keep *Walk-in*.
   - Click **Dolo 650** and **Pan-D Capsule** to add to cart.
   - Adjust quantities using the `+` / `-` controls.
   - Enter a discount (e.g. `20`).
   - Select payment mode (e.g. *Cash*) and enter cash tendered to see real-time change calculation.
   - Click **"Complete Sale & Generate Tax Bill"**.
   - Show the authentic Indian Retail Tax Invoice modal (with GSTIN, DL No, CGST/SGST split, and QR code).
   - Click **"Print Invoice"** to demonstrate print-ready formatting.

3. **Prescription to POS Auto-Handover**:
   - Click **"Prescriptions"** in the sidebar.
   - Select pending prescription **RX-2026-095** (*Tanvi Deshmukh*).
   - Click **"View Rx"** to inspect doctor credentials, clinical diagnosis, and medications.
   - Click **"Approve Rx"**, then click **"Dispense to POS Billing"**.
   - Notice how it automatically loads the cart with the prescribed dosages, selects the customer, and sets the doctor reference!

4. **Alerts & Stock Management**:
   - Click **"Alerts"** in the sidebar.
   - Note the real-time count badges matching the header bell icon.
   - Click **"Restock Stock"** on any low stock card to replenish inventory.
   - Check the **Inventory** view to see the updated unit count and wholesale valuation.

5. **Data Reset & Backup**:
   - Go to **"Settings"**.
   - Click **"Export Full Backup (JSON)"** to download the database.
   - Click **"Reset to Factory Demo Data"** to restore pristine demo data anytime.

---

## 🛡️ License
Built for educational and hackathon submission purposes. Released under the MIT License.
