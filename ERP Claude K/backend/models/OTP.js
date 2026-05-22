const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OTP = sequelize.define('OTP', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  identifier: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Email or mobile number'
  },
  otp_code: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('signup', 'login', 'reset_password', 'verify_email', 'verify_mobile', '2fa'),
    allowNull: false
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  is_used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  max_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 5
  },
  ip_address: {
    type: DataTypes.STRING(50)
  },
  user_agent: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'otps',
  indexes: [
    { fields: ['identifier'] },
    { fields: ['otp_code'] },
    { fields: ['expires_at'] },
    { fields: ['is_used'] }
  ]
});

// Auto-delete expired OTPs
OTP.prototype.isExpired = function() {
  return new Date() > this.expires_at;
};

OTP.prototype.canAttempt = function() {
  return this.attempts < this.max_attempts;
};

module.exports = OTP;
