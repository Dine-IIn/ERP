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
