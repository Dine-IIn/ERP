export const MASTER_FEATURES_HIERARCHY = [
  {
    key: 'ADMIN',
    name: 'GENERAL / ADMINISTRATION MODULE',
    desc: 'System administration configuration',
    children: [
      { key: 'ADMIN_PROFILE', name: 'Company profile management', desc: 'Company profile management' },
      { key: 'ADMIN_TAX', name: 'GST/VAT/TAX settings', desc: 'GST/VAT/TAX settings' },
      { key: 'ADMIN_CURRENCY', name: 'Currency settings', desc: 'Currency settings' },
      { key: 'ADMIN_AUDIT', name: 'Audit logs', desc: 'Audit logs' },
      { key: 'ADMIN_APPROVALS', name: 'Approval workflow engine', desc: 'Approval workflow engine' },
      { key: 'ADMIN_NOTIFICATIONS', name: 'Notification center', desc: 'Notification center' },
      { key: 'ADMIN_BACKUP', name: 'Backup & restore', desc: 'Backup & restore' },
      { key: 'ADMIN_DOCUMENTS', name: 'Document management', desc: 'Document management' },
      { key: 'ADMIN_EMAIL', name: 'Email integration system', desc: 'Email integration system' },
      { key: 'ADMIN_TOGGLES', name: 'Feature toggle system', desc: 'Feature toggle system' },
      { key: 'ADMIN_DASHBOARD', name: 'Customizable dashboard', desc: 'Customizable dashboard' },
      { key: 'ADMIN_ORG', name: 'Organization hierarchy', desc: 'Organization hierarchy' },
      { key: 'ADMIN_DEPARTMENTS', name: 'Department management', desc: 'Department management' },
      { key: 'ADMIN_ACTIVITY', name: 'User activity logs', desc: 'User activity logs' }
    ]
  },
  {
    key: 'MDM',
    name: 'MASTER DATA MANAGEMENT',
    desc: 'Master Data Management',
    children: [
      { key: 'MDM_PRODUCT', name: 'Product master', desc: 'Product master' },
      { key: 'MDM_CUSTOMER', name: 'Customer master', desc: 'Customer master' },
      { key: 'MDM_VENDOR', name: 'Vendor master', desc: 'Vendor master' },
      { key: 'MDM_EMPLOYEE', name: 'Employee master', desc: 'Employee master' },
      { key: 'MDM_WAREHOUSE', name: 'Warehouse master', desc: 'Warehouse master' },
      { key: 'MDM_TAX', name: 'Tax master', desc: 'Tax master' },
      { key: 'MDM_UNIT', name: 'Unit master', desc: 'Unit master' },
      { key: 'MDM_CATEGORY', name: 'Category master', desc: 'Category master' },
      { key: 'MDM_BRAND', name: 'Brand master', desc: 'Brand master' },
      { key: 'MDM_COA', name: 'Chart of accounts', desc: 'Chart of accounts' },
      { key: 'MDM_DROPDOWNS', name: 'Reusable dropdown/master APIs', desc: 'Reusable dropdown/master APIs' },
      { key: 'MDM_IMPORT_EXPORT', name: 'Import/export master data', desc: 'Import/export master data' }
    ]
  },
  {
    key: 'FINANCE',
    name: 'FINANCE & ACCOUNTING MODULE',
    desc: 'Finance & Accounting',
    children: [
      { key: 'FINANCE_LEDGER', name: 'General ledger', desc: 'General ledger' },
      { key: 'FINANCE_JOURNAL', name: 'Journal entries', desc: 'Journal entries' },
      { key: 'FINANCE_TRIAL_BALANCE', name: 'Trial balance', desc: 'Trial balance' },
      { key: 'FINANCE_BALANCE_SHEET', name: 'Balance sheet', desc: 'Balance sheet' },
      { key: 'FINANCE_PNL', name: 'Profit & loss', desc: 'Profit & loss' },
      { key: 'FINANCE_CASH_FLOW', name: 'Cash flow statements', desc: 'Cash flow statements' },
      { key: 'FINANCE_AP', name: 'Accounts payable', desc: 'Accounts payable' },
      { key: 'FINANCE_AR', name: 'Accounts receivable', desc: 'Accounts receivable' },
      { key: 'FINANCE_EXPENSE', name: 'Expense tracking', desc: 'Expense tracking' },
      { key: 'FINANCE_GST', name: 'GST management', desc: 'GST management' },
      { key: 'FINANCE_TAX', name: 'Tax management', desc: 'Tax management' },
      { key: 'FINANCE_ASSET', name: 'Asset management', desc: 'Asset management' },
      { key: 'FINANCE_DEPRECIATION', name: 'Depreciation tracking', desc: 'Depreciation tracking' },
      { key: 'FINANCE_BUDGET', name: 'Budget management', desc: 'Budget management' },
      { key: 'FINANCE_BANK_RECON', name: 'Bank reconciliation', desc: 'Bank reconciliation' },
      { key: 'FINANCE_REPORTS', name: 'Financial reports', desc: 'Financial reports' },
      { key: 'FINANCE_VOUCHER', name: 'Voucher system', desc: 'Voucher system' },
      { key: 'FINANCE_FISCAL_YEAR', name: 'Fiscal year management', desc: 'Fiscal year management' }
    ]
  },
  {
    key: 'INVENTORY',
    name: 'INVENTORY & WAREHOUSE MODULE',
    desc: 'Inventory & Warehouse',
    children: [
      { key: 'INVENTORY_TRACKING', name: 'Real-time stock tracking', desc: 'Real-time stock tracking' },
      { key: 'INVENTORY_MULTI_WH', name: 'Multi-warehouse support', desc: 'Multi-warehouse support' },
      { key: 'INVENTORY_BATCH', name: 'Batch management', desc: 'Batch management' },
      { key: 'INVENTORY_SERIAL', name: 'Serial number tracking', desc: 'Serial number tracking' },
      { key: 'INVENTORY_TRANSFERS', name: 'Stock transfers', desc: 'Stock transfers' },
      { key: 'INVENTORY_ADJUSTMENTS', name: 'Stock adjustments', desc: 'Stock adjustments' },
      { key: 'INVENTORY_VALUATION', name: 'Inventory valuation', desc: 'Inventory valuation' },
      { key: 'INVENTORY_ALERTS', name: 'Low stock alerts', desc: 'Low stock alerts' },
      { key: 'INVENTORY_BARCODE', name: 'Barcode support', desc: 'Barcode support' },
      { key: 'INVENTORY_RACK_BIN', name: 'Rack/bin management', desc: 'Rack/bin management' },
      { key: 'INVENTORY_DISPATCH', name: 'Dispatch management', desc: 'Dispatch management' },
      { key: 'INVENTORY_GRN', name: 'GRN (Goods Receipt Notes)', desc: 'GRN (Goods Receipt Notes)' },
      { key: 'INVENTORY_REPORTS', name: 'Inventory reports', desc: 'Inventory reports' },
      { key: 'INVENTORY_LEDGER', name: 'Stock ledger', desc: 'Stock ledger' },
      { key: 'INVENTORY_CYCLE_COUNT', name: 'Cycle counting', desc: 'Cycle counting' }
    ]
  },
  {
    key: 'PURCHASE',
    name: 'PURCHASE & PROCUREMENT MODULE',
    desc: 'Purchase & Procurement',
    children: [
      { key: 'PURCHASE_VENDOR_MGT', name: 'Vendor management', desc: 'Vendor management' },
      { key: 'PURCHASE_REQUISITIONS', name: 'Purchase requisitions', desc: 'Purchase requisitions' },
      { key: 'PURCHASE_ORDERS', name: 'Purchase orders', desc: 'Purchase orders' },
      { key: 'PURCHASE_QUOTATIONS', name: 'Vendor quotations', desc: 'Vendor quotations' },
      { key: 'PURCHASE_COMPARISON', name: 'Vendor comparison', desc: 'Vendor comparison' },
      { key: 'PURCHASE_PAYMENTS', name: 'Supplier payment tracking', desc: 'Supplier payment tracking' },
      { key: 'PURCHASE_APPROVALS', name: 'Approval workflows', desc: 'Approval workflows' },
      { key: 'PURCHASE_REORDER', name: 'Reorder automation', desc: 'Reorder automation' },
      { key: 'PURCHASE_GRN', name: 'GRN integration', desc: 'GRN integration' },
      { key: 'PURCHASE_DASHBOARD', name: 'Procurement dashboard', desc: 'Procurement dashboard' },
      { key: 'PURCHASE_PO_PDF', name: 'PO PDF generation', desc: 'PO PDF generation' },
      { key: 'PURCHASE_EMAIL_PO', name: 'Email PO sending', desc: 'Email PO sending' }
    ]
  },
  {
    key: 'SALES',
    name: 'SALES & ORDER MANAGEMENT MODULE',
    desc: 'Sales & Order Management',
    children: [
      { key: 'SALES_QUOTATIONS', name: 'Quotations', desc: 'Quotations' },
      { key: 'SALES_ORDERS', name: 'Sales orders', desc: 'Sales orders' },
      { key: 'SALES_INVOICING', name: 'Invoice generation', desc: 'Invoice generation' },
      { key: 'SALES_TAX_CALC', name: 'Tax calculations', desc: 'Tax calculations' },
      { key: 'SALES_PRICING', name: 'Customer-wise pricing', desc: 'Customer-wise pricing' },
      { key: 'SALES_DISCOUNT', name: 'Discount system', desc: 'Discount system' },
      { key: 'SALES_RETURNS', name: 'Returns/refunds', desc: 'Returns/refunds' },
      { key: 'SALES_CREDIT_NOTES', name: 'Credit notes', desc: 'Credit notes' },
      { key: 'SALES_DELIVERY', name: 'Delivery scheduling', desc: 'Delivery scheduling' },
      { key: 'SALES_PAYMENTS', name: 'Payment tracking', desc: 'Payment tracking' },
      { key: 'SALES_INVOICE_PDF', name: 'Invoice PDF generation', desc: 'Invoice PDF generation' },
      { key: 'SALES_EMAIL_INVOICES', name: 'Email invoices', desc: 'Email invoices' },
      { key: 'SALES_STATEMENTS', name: 'Customer statements', desc: 'Customer statements' },
      { key: 'SALES_ANALYTICS', name: 'Sales analytics', desc: 'Sales analytics' }
    ]
  },
  {
    key: 'HR',
    name: 'HRM MODULE',
    desc: 'Human Resource Management',
    children: [
      { key: 'HR_PROFILES', name: 'Employee profiles', desc: 'Employee profiles' },
      { key: 'HR_ATTENDANCE', name: 'Attendance management', desc: 'Attendance management' },
      { key: 'HR_LEAVE', name: 'Leave management', desc: 'Leave management' },
      { key: 'HR_PAYROLL', name: 'Payroll management', desc: 'Payroll management' },
      { key: 'HR_SALARY_SLIPS', name: 'Salary slips', desc: 'Salary slips' },
      { key: 'HR_REIMBURSEMENTS', name: 'Reimbursements', desc: 'Reimbursements' },
      { key: 'HR_RECRUITMENT', name: 'Recruitment management', desc: 'Recruitment management' },
      { key: 'HR_SHIFT', name: 'Shift management', desc: 'Shift management' },
      { key: 'HR_PERFORMANCE', name: 'Performance tracking', desc: 'Performance tracking' },
      { key: 'HR_REPORTS', name: 'Payroll reports', desc: 'Payroll reports' },
      { key: 'HR_DOCUMENTS', name: 'Employee document storage', desc: 'Employee document storage' }
    ]
  },
  {
    key: 'MANUFACTURING',
    name: 'MANUFACTURING / PRODUCTION MODULE',
    desc: 'Manufacturing & Production',
    children: [
      { key: 'MANUFACTURING_BOM', name: 'BOM (Bill of Materials)', desc: 'BOM (Bill of Materials)' },
      { key: 'MANUFACTURING_ORDERS', name: 'Production orders', desc: 'Production orders' },
      { key: 'MANUFACTURING_WORK_ORDERS', name: 'Work orders', desc: 'Work orders' },
      { key: 'MANUFACTURING_PLANNING', name: 'Production planning', desc: 'Production planning' },
      { key: 'MANUFACTURING_MATERIAL', name: 'Raw material consumption', desc: 'Raw material consumption' },
      { key: 'MANUFACTURING_TRACKING', name: 'Production tracking', desc: 'Production tracking' },
      { key: 'MANUFACTURING_FG', name: 'Finished goods tracking', desc: 'Finished goods tracking' },
      { key: 'MANUFACTURING_MACHINE', name: 'Machine allocation', desc: 'Machine allocation' },
      { key: 'MANUFACTURING_SHIFT', name: 'Shift planning', desc: 'Shift planning' },
      { key: 'MANUFACTURING_QUALITY', name: 'Quality inspections', desc: 'Quality inspections' },
      { key: 'MANUFACTURING_COSTING', name: 'Production costing', desc: 'Production costing' },
      { key: 'MANUFACTURING_SCRAP', name: 'Scrap tracking', desc: 'Scrap tracking' }
    ]
  },
  {
    key: 'CRM',
    name: 'CRM MODULE',
    desc: 'Customer Relationship Management',
    children: [
      { key: 'CRM_LEADS', name: 'Lead management', desc: 'Lead management' },
      { key: 'CRM_CUSTOMER', name: 'Customer management', desc: 'Customer management' },
      { key: 'CRM_PIPELINE', name: 'Sales pipeline', desc: 'Sales pipeline' },
      { key: 'CRM_FOLLOWUP', name: 'Follow-up reminders', desc: 'Follow-up reminders' },
      { key: 'CRM_OPPORTUNITY', name: 'Opportunity tracking', desc: 'Opportunity tracking' },
      { key: 'CRM_STAGES', name: 'Lead stages', desc: 'Lead stages' },
      { key: 'CRM_NOTES', name: 'Communication notes', desc: 'Communication notes' },
      { key: 'CRM_DASHBOARD', name: 'Sales funnel dashboard', desc: 'Sales funnel dashboard' }
    ]
  },
  {
    key: 'QUALITY',
    name: 'QUALITY MANAGEMENT + MAINTENANCE MODULE',
    desc: 'Quality & Maintenance',
    children: [
      { key: 'QUALITY_INSPECTION', name: 'Quality inspections', desc: 'Quality inspections' },
      { key: 'QUALITY_DEFECTS', name: 'Defect tracking', desc: 'Defect tracking' },
      { key: 'QUALITY_CAPA', name: 'CAPA management', desc: 'CAPA management' },
      { key: 'QUALITY_AUDIT', name: 'Audit scheduling', desc: 'Audit scheduling' },
      { key: 'QUALITY_TESTING', name: 'Product testing', desc: 'Product testing' },
      { key: 'QUALITY_REPORTS', name: 'Inspection reports', desc: 'Inspection reports' },
      { key: 'MAINTENANCE_PREVENTIVE', name: 'Preventive maintenance', desc: 'Preventive maintenance' },
      { key: 'MAINTENANCE_BREAKDOWN', name: 'Breakdown logging', desc: 'Breakdown logging' },
      { key: 'MAINTENANCE_SCHEDULES', name: 'Machine maintenance schedules', desc: 'Machine maintenance schedules' },
      { key: 'MAINTENANCE_SPARES', name: "Spare part tracking", desc: 'Spare part tracking' },
      { key: 'MAINTENANCE_TECHNICIAN', name: 'Technician assignments', desc: 'Technician assignments' },
      { key: 'MAINTENANCE_HISTORY', name: 'Maintenance history', desc: 'Maintenance history' }
    ]
  },
  {
    key: 'EMAIL',
    name: 'GENERAL EMAIL SYSTEM',
    desc: 'Global Email System',
    children: [
      { key: 'EMAIL_SMTP', name: 'SMTP configuration', desc: 'SMTP configuration' },
      { key: 'EMAIL_TEMPLATES', name: 'Email templates', desc: 'Email templates' },
      { key: 'EMAIL_INVOICE', name: 'Invoice emails', desc: 'Invoice emails' },
      { key: 'EMAIL_PO', name: 'PO emails', desc: 'PO emails' },
      { key: 'EMAIL_APPROVAL', name: "Approval emails", desc: 'Approval emails' },
      { key: 'EMAIL_OTP', name: 'OTP emails', desc: 'OTP emails' },
      { key: 'EMAIL_PAYROLL', name: 'Payroll emails', desc: 'Payroll emails' },
      { key: 'EMAIL_REPORT', name: 'Report emails', desc: 'Report emails' },
      { key: 'EMAIL_QUEUE', name: 'Email queue system', desc: 'Email queue system' },
      { key: 'EMAIL_RETRY', name: 'Retry mechanism', desc: 'Retry mechanism' },
      { key: 'EMAIL_ATTACHMENT', name: 'Attachment support', desc: 'Attachment support' },
      { key: 'EMAIL_LOGS', name: 'Email logs/history', desc: 'Email logs/history' },
      { key: 'EMAIL_EDITOR', name: 'Template editor', desc: 'Template editor' },
      { key: 'EMAIL_TOGGLE', name: 'Super admin feature toggle', desc: 'Super admin feature toggle' },
      { key: 'EMAIL_ENABLE', name: 'Company-wise email enable/disable', desc: 'Company-wise email enable/disable' },
      { key: 'EMAIL_QUOTA', name: 'SMTP quota management', desc: 'SMTP quota management' }
    ]
  },
  {
    key: 'DASHBOARD',
    name: 'CUSTOMIZABLE DASHBOARD FEATURES',
    desc: 'Customizable Dashboards',
    children: [
      { key: 'DASHBOARD_DRAG_DROP', name: 'Drag/drop widgets', desc: 'Drag/drop widgets' },
      { key: 'DASHBOARD_RESIZE', name: 'Resize widgets', desc: 'Resize widgets' },
      { key: 'DASHBOARD_HIDE_SHOW', name: 'Hide/show widgets', desc: 'Hide/show widgets' },
      { key: 'DASHBOARD_SAVE', name: 'Save layouts', desc: 'Save layouts' },
      { key: 'DASHBOARD_RESTORE', name: 'Restore layouts', desc: 'Restore layouts' },
      { key: 'DASHBOARD_PIN', name: 'Pin shortcuts', desc: 'Pin shortcuts' },
      { key: 'DASHBOARD_KPI', name: 'KPI cards', desc: 'KPI cards' },
      { key: 'DASHBOARD_ANALYTICS', name: 'Analytics cards', desc: 'Analytics cards' },
      { key: 'DASHBOARD_APPROVALS', name: 'Pending approvals widget', desc: 'Pending approvals widget' },
      { key: 'DASHBOARD_NOTIFICATIONS', name: "Notifications widget", desc: 'Notifications widget' },
      { key: 'DASHBOARD_REVENUE', name: 'Revenue charts', desc: 'Revenue charts' },
      { key: 'DASHBOARD_ALERTS', name: 'Inventory alerts', desc: 'Inventory alerts' },
      { key: 'DASHBOARD_REALTIME', name: 'Realtime dashboard updates', desc: 'Realtime dashboard updates' }
    ]
  },
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
