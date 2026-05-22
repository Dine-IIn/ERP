const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const SuperAdmin = sequelize.define('SuperAdmin', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 50]
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  mobile: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  full_name: {
    type: DataTypes.STRING(100)
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
  two_factor_secret: {
    type: DataTypes.STRING(255)
  },
  two_factor_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'super_admins',
  indexes: [
    { fields: ['email'] },
    { fields: ['username'] },
    { fields: ['mobile'] }
  ],
  hooks: {
    beforeCreate: async (superAdmin) => {
      if (superAdmin.password) {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
        superAdmin.password = await bcrypt.hash(superAdmin.password, salt);
      }
    },
    beforeUpdate: async (superAdmin) => {
      if (superAdmin.changed('password')) {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
        superAdmin.password = await bcrypt.hash(superAdmin.password, salt);
      }
    }
  }
});

SuperAdmin.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

SuperAdmin.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  delete values.two_factor_secret;
  return values;
};

module.exports = SuperAdmin;
