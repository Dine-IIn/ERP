const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Role = sequelize.define('Role', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  company_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'companies',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  
  // Permissions structure
  permissions: {
    type: DataTypes.JSONB,
    defaultValue: {
      // Company & Administration
      company: { view: false, create: false, edit: false, delete: false },
      branches: { view: false, create: false, edit: false, delete: false },
      users: { view: false, create: false, edit: false, delete: false },
      roles: { view: false, create: false, edit: false, delete: false },
      departments: { view: false, create: false, edit: false, delete: false },
      
      // CRM
      leads: { view: false, create: false, edit: false, delete: false, assign: false },
      customers: { view: false, create: false, edit: false, delete: false },
      opportunities: { view: false, create: false, edit: false, delete: false },
      
      // Sales & Orders
      quotations: { view: false, create: false, edit: false, delete: false, approve: false },
      sales_orders: { view: false, create: false, edit: false, delete: false, approve: false },
      invoices: { view: false, create: false, edit: false, delete: false, approve: false },
      
      // Purchase
      vendors: { view: false, create: false, edit: false, delete: false },
      purchase_orders: { view: false, create: false, edit: false, delete: false, approve: false },
      purchase_invoices: { view: false, create: false, edit: false, delete: false },
      
      // Inventory
      products: { view: false, create: false, edit: false, delete: false },
      inventory: { view: false, create: false, edit: false, adjust: false },
      warehouses: { view: false, create: false, edit: false, delete: false },
      stock_transfers: { view: false, create: false, approve: false },
      
      // Manufacturing
      bom: { view: false, create: false, edit: false, delete: false },
      production_orders: { view: false, create: false, edit: false, delete: false },
      work_orders: { view: false, create: false, edit: false, complete: false },
      
      // Finance & Accounting
      accounts: { view: false, create: false, edit: false, delete: false },
      journal_entries: { view: false, create: false, edit: false, delete: false, post: false },
      payments: { view: false, create: false, approve: false },
      expenses: { view: false, create: false, edit: false, delete: false, approve: false },
      financial_reports: { view: false, export: false },
      
      // HRM
      employees: { view: false, create: false, edit: false, delete: false },
      attendance: { view: false, mark: false, edit: false },
      leaves: { view: false, apply: false, approve: false },
      payroll: { view: false, process: false, approve: false },
      
      // Projects
      projects: { view: false, create: false, edit: false, delete: false },
      tasks: { view: false, create: false, edit: false, delete: false, assign: false },
      time_tracking: { view: false, log: false, approve: false },
      
      // Supply Chain
      shipments: { view: false, create: false, edit: false, track: false },
      logistics: { view: false, manage: false },
      
      // Quality Management
      quality_checks: { view: false, create: false, approve: false },
      compliance: { view: false, manage: false },
      
      // Maintenance
      maintenance: { view: false, create: false, schedule: false, complete: false },
      
      // POS & Retail
      pos: { access: false, refund: false },
      
      // E-Commerce
      ecommerce: { view: false, manage: false },
      
      // Analytics & Reports
      analytics: { view: false, export: false },
      custom_reports: { view: false, create: false },
      
      // Chat & Communication
      chat: { access: false, group_chat: false },
      expense_chat: { view_own: false, view_group: false, view_all: false },
      
      // System
      audit_logs: { view: false },
      settings: { view: false, edit: false },
      backups: { create: false, restore: false },
      api_access: { enabled: false }
    }
  },
  
  is_system_role: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'roles',
  indexes: [
    { fields: ['company_id'] },
    { fields: ['slug'] },
    { 
      unique: true, 
      fields: ['company_id', 'slug'],
      name: 'unique_company_role_slug'
    }
  ]
});

module.exports = Role;
