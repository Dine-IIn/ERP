const jwt = require('jsonwebtoken');
const User = require('../models/User');
const SuperAdmin = require('../models/SuperAdmin');
const Company = require('../models/Company');

// Generate JWT Token
const generateToken = (payload, expiresIn = process.env.JWT_EXPIRE) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

// Generate Refresh Token
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE
  });
};

// Verify Token Middleware
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if super admin
    if (decoded.userType === 'super_admin') {
      const superAdmin = await SuperAdmin.findByPk(decoded.id);
      if (!superAdmin || !superAdmin.is_active) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or inactive super admin account'
        });
      }
      req.user = superAdmin;
      req.userType = 'super_admin';
    } else {
      // Regular user
      const user = await User.findByPk(decoded.id, {
        include: [
          { model: Company, as: 'company' },
          { model: require('../models/Role'), as: 'role' }
        ]
      });
      
      if (!user || !user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or inactive user account'
        });
      }

      if (!user.company.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Company account is inactive'
        });
      }

      req.user = user;
      req.userType = 'user';
      req.company = user.company;
    }
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Super Admin Only Middleware
const superAdminOnly = (req, res, next) => {
  if (req.userType !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super admin only.'
    });
  }
  next();
};

// Company Admin Only Middleware
const adminOnly = (req, res, next) => {
  if (!req.user.is_admin && req.userType !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Permission Check Middleware
const checkPermission = (module, action) => {
  return (req, res, next) => {
    if (req.userType === 'super_admin') {
      return next();
    }

    if (req.user.is_admin) {
      return next();
    }

    const permissions = req.user.role?.permissions || req.user.permissions || {};
    
    if (permissions[module] && permissions[module][action]) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Permission denied. Required: ${module}.${action}`
    });
  };
};

// Feature Check Middleware
const checkFeature = (feature) => {
  return (req, res, next) => {
    if (req.userType === 'super_admin') {
      return next();
    }

    if (req.company.enabled_features[feature]) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Feature '${feature}' is not enabled for your subscription`
    });
  };
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  superAdminOnly,
  adminOnly,
  checkPermission,
  checkFeature
};
