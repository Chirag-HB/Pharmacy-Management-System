const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// Replace modal-close-btn without type
html = html.replace(/<button class="modal-close-btn" data-modal-close>/g, '<button type="button" class="modal-close-btn" data-modal-close aria-label="Close modal">');

// List of specific known untyped buttons to fix
const replacements = [
  ['<button class="btn-sidebar-hamburger" id="btn-sidebar-toggle" aria-label="Toggle Sidebar Navigation">', '<button type="button" class="btn-sidebar-hamburger" id="btn-sidebar-toggle" aria-label="Toggle Sidebar Navigation">'],
  ['<button class="header-btn-quick-sale" id="btn-header-quick-sale">', '<button type="button" class="header-btn-quick-sale" id="btn-header-quick-sale">'],
  ['<button class="btn-header-action" id="btn-header-theme-toggle" title="Toggle Dark/Light Mode">', '<button type="button" class="btn-header-action" id="btn-header-theme-toggle" title="Toggle Dark/Light Mode" aria-label="Toggle theme">'],
  ['<button class="btn-header-action" id="btn-header-notifications" title="View Alerts & Notifications">', '<button type="button" class="btn-header-action" id="btn-header-notifications" title="View Alerts & Notifications" aria-label="View notifications">'],
  ['<button class="btn btn-primary" id="dash-btn-new-sale">', '<button type="button" class="btn btn-primary" id="dash-btn-new-sale">'],
  ['<button class="btn btn-secondary" id="dash-btn-add-med">', '<button type="button" class="btn btn-secondary" id="dash-btn-add-med">'],
  ['<button class="btn btn-outline" id="dash-btn-new-rx">', '<button type="button" class="btn btn-outline" id="dash-btn-new-rx">'],
  ['<button class="btn btn-outline" id="dash-btn-view-alerts">', '<button type="button" class="btn btn-outline" id="dash-btn-view-alerts">'],
  ['<button class="btn btn-sm btn-outline" onclick="App.navigateTo(\'pos\')">', '<button type="button" class="btn btn-sm btn-outline" onclick="App.navigateTo(\'pos\')">'],
  ['<button class="btn btn-sm btn-outline" onclick="App.navigateTo(\'inventory\')">', '<button type="button" class="btn btn-sm btn-outline" onclick="App.navigateTo(\'inventory\')">'],
  ['<button class="btn btn-sm btn-outline" onclick="App.navigateTo(\'alerts\')">', '<button type="button" class="btn btn-sm btn-outline" onclick="App.navigateTo(\'alerts\')">'],
  ['<button class="btn btn-outline" id="btn-export-medicines-csv">', '<button type="button" class="btn btn-outline" id="btn-export-medicines-csv">'],
  ['<button class="btn btn-primary" id="btn-add-medicine">', '<button type="button" class="btn btn-primary" id="btn-add-medicine">'],
  ['<button class="btn btn-outline" id="btn-pos-clear-cart">', '<button type="button" class="btn btn-outline" id="btn-pos-clear-cart">'],
  ['<button class="btn btn-outline" id="btn-export-inventory-csv">', '<button type="button" class="btn btn-outline" id="btn-export-inventory-csv">'],
  ['<button class="btn btn-primary" id="btn-new-prescription">', '<button type="button" class="btn btn-primary" id="btn-new-prescription">'],
  ['<button class="btn btn-primary" id="btn-add-customer">', '<button type="button" class="btn btn-primary" id="btn-add-customer">'],
  ['<button class="btn btn-outline" id="btn-create-po">', '<button type="button" class="btn btn-outline" id="btn-create-po">'],
  ['<button class="btn btn-primary" id="btn-add-supplier">', '<button type="button" class="btn btn-primary" id="btn-add-supplier">'],
  ['<button class="btn btn-outline" id="btn-export-analytics">', '<button type="button" class="btn btn-outline" id="btn-export-analytics">'],
  ['<button class="btn btn-outline" id="btn-dismiss-all-alerts">', '<button type="button" class="btn btn-outline" id="btn-dismiss-all-alerts">']
];

replacements.forEach(([target, rep]) => {
  if (html.includes(target)) {
    html = html.replace(target, rep);
    console.log('Fixed button:', target.substring(0, 45));
  }
});

fs.writeFileSync('index.html', html, 'utf8');
console.log('Finished updating button types in index.html');
