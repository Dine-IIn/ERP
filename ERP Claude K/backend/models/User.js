const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
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
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      len: [3, 50]
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  mobile: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  
  // Profile
  first_name: {
    type: DataTypes.STRING(100)
  },
  last_name: {
    type: DataTypes.STRING(100)
  },
  full_name: {
    type: DataTypes.STRING(200)
  },
  profile_picture: {
    type: DataTypes.STRING(500)
  },
  designation: {
    type: DataTypes.STRING(100)
  },
  department: {
    type: DataTypes.STRING(100)
  },
  employee_id: {
    type: DataTypes.STRING(50)
  },
  
  // Role & Permissions
  role_id: {
    type: DataTypes.UUID,
    references: {
      model: 'roles',
      key: 'id'
    }
  },
  is_admin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  permissions: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  
  // Authentication
  email_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  mobile_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  last_login: {
    type: DataTypes.DATE
  },
  login_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  locked_until: {
    type: DataTypes.DATE
  },
  
  // 2FA
  two_factor_secret: {
    type: DataTypes.STRING(255)
  },
  two_factor_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // Additional
  date_of_joining: {
    type: DataTypes.DATE
  },
  date_of_birth: {
    type: DataTypes.DATE
  },
  address: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  emergency_contact: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'users',
  indexes: [
    { fields: ['company_id'] },
    { fields: ['email'] },
    { fields: ['username'] },
    { fields: ['mobile'] },
    { fields: ['role_id'] },
    { fields: ['is_active'] },
    { 
      unique: true, 
      fields: ['company_id', 'username'],
      name: 'unique_company_username'
    },
    { 
      unique: true, 
      fields: ['company_id', 'email'],
      name: 'unique_company_email'
    }
  ],
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
        user.password = await bcrypt.hash(user.password, salt);
      }
      if (user.first_name && user.last_name) {
        user.full_name = `${user.first_name} ${user.last_name}`;
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
        user.password = await bcrypt.hash(user.password, salt);
      }
      if (user.changed('first_name') || user.changed('last_name')) {
        user.full_name = `${user.first_name} ${user.last_name}`;
      }
    }
  }
});

User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  delete values.two_factor_secret;
  return values;
};

module.exports = User;
