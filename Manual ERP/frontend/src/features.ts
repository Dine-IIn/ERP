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
    desc: 'Manage Employees, Customers, Vendors and Products profiles',
    children: [
      { key: 'MASTER_EMPLOYEE', name: 'Employee Master', desc: 'Manage hierarchies, timing shifts, and secure documents' },
      { key: 'MASTER_CUSTOMER', name: 'Customer Master', desc: 'Administer sales accounts, billing destinations, and credit ratings' },
      { key: 'MASTER_VENDOR', name: 'Vendor / Supplier Master', desc: 'Handle supply registers, GST details, bank parameters, and payments' },
      { key: 'MASTER_PRODUCT', name: 'Product / Item Master', desc: 'Configure inventory catalog, variants, pricing, and HSN codes' }
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
