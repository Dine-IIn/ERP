export const MASTER_FEATURES_HIERARCHY = [
  {
    key: 'GENERAL',
    name: 'GENERAL CONFIGURATION',
    desc: 'General Chat & Expenses',
    children: [
      { key: 'GENERAL_CHAT', name: 'General Chat', desc: 'General Chat' },
      { key: 'GENERAL_EXPENSE_CHAT', name: 'Expense Chat', desc: 'Expense Chat' }
    ]
  },
  {
    key: 'NOTIFICATIONS',
    name: 'NOTIFICATIONS & ALERTS',
    desc: 'Enable system alerts and logs',
    children: [
      { key: 'NOTIFICATIONS_PUSH', name: 'Push Notifications', desc: 'Receive real-time push events on devices' },
      { key: 'NOTIFICATIONS_AUDIT', name: 'System Audit Logs', desc: 'View secure administrative history trails' }
    ]
  },
  {
    key: 'ADMINISTRATION',
    name: 'COMPANY ADMINISTRATION',
    desc: 'Manage profile, roles, users, departments, and backups',
    children: [
      { key: 'ADMIN_PROFILE', name: 'Company Profile', desc: 'Update tenant branding logo, details, and color schemes' },
      { key: 'ADMIN_ROLES', name: 'Roles & Permissions', desc: 'Configure granular features access controls for corporate roles' },
      { key: 'ADMIN_AUDIT', name: 'Audit Trail Logs', desc: 'Track administrative action logs and trails' },
      { key: 'ADMIN_BACKUP', name: 'snapshots Backups', desc: 'Schedule, trigger, or download JSON data snapshots' },
      { key: 'ADMIN_USERS', name: 'Employee Users', desc: 'Approve registrations, modify profiles, and assign roles' },
      { key: 'ADMIN_DEPARTMENTS', name: 'Corporate Departments', desc: 'Map divisions, assign specific features, and delegate managers' }
    ]
  },
  {
    key: 'MASTER_DATA',
    name: 'MASTER DATA HUB',
    desc: 'Manage Employees, Customers, Vendors, Products, and Taxes profiles',
    children: [
      { key: 'MASTER_EMPLOYEE', name: 'Employee Master', desc: 'Manage hierarchies, timing shifts, and secure documents' },
      { key: 'MASTER_CUSTOMER', name: 'Customer Master', desc: 'Administer sales accounts, billing destinations, and credit ratings' },
      { key: 'MASTER_VENDOR', name: 'Vendor / Supplier Master', desc: 'Handle supply registers, GST details, bank parameters, and payments' },
      { key: 'MASTER_PRODUCT', name: 'Product / Item Master', desc: 'Configure inventory catalog, variants, pricing, and HSN codes' },
      { key: 'MASTER_TAX', name: 'Tax Master', desc: 'Configure corporate sales tax rates, GSTIN brackets, and VAT schemes' }
    ]
  },
  {
    key: 'SALES_DATA',
    name: 'SALES MANAGEMENT',
    desc: 'Consolidated Sales, Invoicing, Quotation, Maintenance and Dispatching Hub',
    children: [
      { key: 'SALES_ORDER', name: 'Sales Orders', desc: 'Manage customer orders, quantities, expected delivery dates and discounts' },
      { key: 'SALES_PROFORMA', name: 'Proforma Invoices', desc: 'Generate, edit, download and email proforma invoices' },
      { key: 'SALES_INVOICE', name: 'Sales Invoices', desc: 'Manage sales invoices, track collections, and email customers' },
      { key: 'SALES_CHALLAN', name: 'Delivery Challans', desc: 'Generate transit challans and declarations' },
      { key: 'SALES_DISPATCH', name: 'Dispatch Management', desc: 'Coordinate shipments, carrier tracking and vehicles details' },
      { key: 'SALES_QUOTATION', name: 'Sales Quotations', desc: 'Generate, edit, and dispatch legal price quotations' },
      { key: 'SALES_POST_SERVICE', name: 'Post-Sales Maintenance & Service', desc: 'Coordinate warranty claims, maintenance logs, and service sheets' }
    ]
  },
  {
    key: 'CRM_DATA',
    name: 'CRM PORTAL',
    desc: 'Customer Relationship Management leads, opportunities and follow-ups scheduler',
    children: [
      { key: 'CRM_DASHBOARD', name: 'CRM Dashboard', desc: 'Visualize lead pipelines, conversion rates, and revenue projections' },
      { key: 'CRM_LEAD', name: 'Leads Hub', desc: 'Capture, log, track, and assign sales leads' },
      { key: 'CRM_OPPORTUNITY', name: 'Opportunities Pipeline', desc: 'Administer potential deal pipelines and conversion projections' },
      { key: 'CRM_FOLLOWUP', name: 'Follow-ups Scheduler', desc: 'Log and schedule phone calls, emails, and meetings with clients' }
    ]
  },
  {
    key: 'PURCHASE_DATA',
    name: 'PURCHASE MANAGEMENT',
    desc: 'Consolidated Sourcing, Purchase Orders, Goods Receipts, Returns and Payouts',
    children: [
      { key: 'PURCHASE_VENDOR_QUOTE', name: 'Vendor Quotations', desc: 'Capture, evaluate, and choose price quotes submitted by suppliers' },
      { key: 'PURCHASE_ORDER', name: 'Purchase Orders', desc: 'Generate purchase orders and dispatch requests to vendors' },
      { key: 'PURCHASE_GRN', name: 'Goods Receipt Notes (GRN)', desc: 'Record gate entries, check material volumes, and register inward packages' },
      { key: 'PURCHASE_RETURN', name: 'Purchase Returns (Debit Notes)', desc: 'Generate debit notes and dispatch returns of defected goods' },
      { key: 'PURCHASE_PAYMENT', name: 'Vendor Payments', desc: 'Manage bank transfer payments, transaction receipts, and outstanding dues' }
    ]
  },
  {
    key: 'INVENTORY_DATA',
    name: 'INVENTORY WAREHOUSING',
    desc: 'Warehouse Stocks Audits, Stock Ledger Logs, and Low Stock Alerts',
    children: [
      { key: 'INVENTORY_PRODUCT', name: 'Warehouse Stock Levels', desc: 'Conduct manual stock audits, warehouse taggings, and storage logs' },
      { key: 'INVENTORY_STOCK_OVERVIEW', name: 'Stock Ledger Overview', desc: 'View transaction ledgers tracking inward POs and outward SOs' },
      { key: 'INVENTORY_LOW_ALERT', name: 'Low Stock Alerts Console', desc: 'Monitor automatically flagged items dropping below minimum reorder thresholds' }
    ]
  },
  {
    key: 'HRMS_DATA',
    name: 'HRMS MODULE',
    desc: 'Human Resource Management System connected to Employee Master and Roles',
    children: [
      { key: 'HRMS_EMPLOYEES', name: 'Employees Directory', desc: 'Manage hierarchies, department assignments, and timing shifts' },
      { key: 'HRMS_ATTENDANCE', name: 'Attendance Punch', desc: 'Punch checks-in/out and worked hour records' },
      { key: 'HRMS_LEAVES', name: 'Leave Management', desc: 'Review leave request pipelines and manage holiday balances' },
      { key: 'HRMS_SHIFTS', name: 'Corporate Shifts', desc: 'Set timing shift rosters, grace hours, and timetables' },
      { key: 'HRMS_PAYROLL', name: 'Basic Payroll', desc: 'Disburse employee salaries and generate slip payslips' }
    ]
  },
  {
    key: 'FINANCE_DATA',
    name: 'FINANCE & ACCOUNTING',
    desc: 'Central Expenses, Vendor Payments, Revenues Receipts, double-entry Cashbook Voucher balances, GST worksheets, and Bank Accounts',
    children: [
      { key: 'FINANCE_EXPENSES', name: 'Expenses Ledger', desc: 'Log corporate expense vouchers and sync to Cashbook ledger' },
      { key: 'FINANCE_PAYMENTS', name: 'Vendor Payments', desc: 'Track miscellaneous vendor cash and bank payouts history' },
      { key: 'FINANCE_RECEIPTS', name: 'Revenue Receipts', desc: 'Log customer payments, revenues, and receipt slips' },
      { key: 'FINANCE_CASHBOOK', name: 'Cashbook double-entry', desc: 'Monitor dual-entry cashbook running ledger balances' },
      { key: 'FINANCE_GST', name: 'GST Settings & Filing', desc: 'Manage corporate GST numbers and review GST worksheet liabilities' },
      { key: 'FINANCE_BANK', name: 'Bank Accounts Hub', desc: 'Manage deposits and bank statement reconciliation ledgers' }
    ]
  },
  {
    key: 'REPORTS_DATA',
    name: 'REPORTS & ANALYTICS',
    desc: 'Consolidated multidimensional analysis for Sales, Purchases, Stocking, HR, and Cashflows',
    children: [
      { key: 'REPORTS_SALES', name: 'Sales Analysis', desc: 'Aggregate monthly sales volumes, invoicing, and CSV files exports' },
      { key: 'REPORTS_PURCHASE', name: 'Purchase Sourcing', desc: 'Examine material PO valuations and complete expenses' },
      { key: 'REPORTS_INVENTORY', name: 'Inventory Valuations', desc: 'Audit physical stock counts, asset valuations, and catalog sizes' },
      { key: 'REPORTS_HR', name: 'HR Metrics Overview', desc: 'Visualize active presents, worked hours, and payout summaries' },
      { key: 'REPORTS_FINANCE', name: 'Financial statements', desc: 'Review cash outflow ratios and running cash flow curves' }
    ]
  }
];

export const getCategoryKeys = () => MASTER_FEATURES_HIERARCHY.map(c => c.key);

export const getChildKeys = (parentKey: string) => {
  const cat = MASTER_FEATURES_HIERARCHY.find(c => c.key === parentKey);
  return cat ? cat.children.map(c => c.key) : [];
};

export const getParentKey = (childKey: string) => {
  for (const cat of MASTER_FEATURES_HIERARCHY) {
    if (cat.children.some(c => c.key === childKey)) {
      return cat.key;
    }
  }
  return null;
};
