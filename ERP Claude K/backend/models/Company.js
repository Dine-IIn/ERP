const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Company = sequelize.define('Company', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  company_code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 20],
      isAlphanumeric: true
    }
  },
  company_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  legal_name: {
    type: DataTypes.STRING(255)
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(20)
  },
  website: {
    type: DataTypes.STRING(255)
  },
  logo_url: {
    type: DataTypes.STRING(500)
  },
  
  // Address
  address_line1: {
    type: DataTypes.STRING(255)
  },
  address_line2: {
    type: DataTypes.STRING(255)
  },
  city: {
    type: DataTypes.STRING(100)
  },
  state: {
    type: DataTypes.STRING(100)
  },
  country: {
    type: DataTypes.STRING(100)
  },
  postal_code: {
    type: DataTypes.STRING(20)
  },
  
  // Tax & Legal
  gst_number: {
    type: DataTypes.STRING(50)
  },
  tax_number: {
    type: DataTypes.STRING(50)
  },
  pan_number: {
    type: DataTypes.STRING(50)
  },
  
  // Subscription
  subscription_plan: {
    type: DataTypes.ENUM('trial', 'basic', 'standard', 'premium', 'enterprise'),
    defaultValue: 'trial'
  },
  subscription_start: {
    type: DataTypes.DATE
  },
  subscription_end: {
    type: DataTypes.DATE
  },
  max_users: {
    type: DataTypes.INTEGER,
    defaultValue: 5
  },
  max_storage_gb: {
    type: DataTypes.INTEGER,
    defaultValue: 10
  },
  
  // Features (JSON field for enabled features)
  enabled_features: {
    type: DataTypes.JSONB,
    defaultValue: {
      crm: true,
      sales: true,
      purchase: false,
      inventory: false,
      manufacturing: false,
      finance: false,
      hrm: false,
      projects: false,
      scm: false,
      qms: false,
      maintenance: false,
      pos: false,
      ecommerce: false,
      analytics: true,
      chat: true
    }
  },
  
  // Settings
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      date_format: 'DD/MM/YYYY',
      language: 'en',
      fiscal_year_start: '04-01'
    }
  },
  
  // Status
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // Metadata
  onboarding_completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'companies',
  indexes: [
    { fields: ['company_code'], unique: true },
    { fields: ['email'] },
    { fields: ['subscription_plan'] },
    { fields: ['is_active'] }
  ]
});

module.exports = Company;
