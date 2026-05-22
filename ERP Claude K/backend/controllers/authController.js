const User = require('../models/User');
const Company = require('../models/Company');
const Role = require('../models/Role');
const SuperAdmin = require('../models/SuperAdmin');
const { generateToken, generateRefreshToken } = require('../middleware/auth');
const { sendOTP, verifyOTP } = require('../services/otpService');
const { v4: uuidv4 } = require('uuid');

// ==================== USER SIGNUP ====================
exports.requestSignup = async (req, res) => {
  try {
    const { username, email, mobile, password, company_code, verification_method } = req.body;

    // Validation
    if (!username || !email || !mobile || !password || !company_code) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: username, email, mobile, password, company_code'
      });
    }

    // Check if company exists
    const company = await Company.findOne({ where: { company_code } });
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Invalid company code'
      });
    }

    if (!company.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Company account is inactive'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        company_id: company.id,
        [require('sequelize').Op.or]: [
          { username },
          { email },
          { mobile }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists in this company'
        });
      }
      if (existingUser.email === email) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered in this company'
        });
      }
      if (existingUser.mobile === mobile) {
        return res.status(400).json({
          success: false,
          message: 'Mobile number already registered in this company'
        });
      }
    }

    // Store signup data in session/cache (in production, use Redis)
    const signupToken = uuidv4();
    global.signupSessions = global.signupSessions || {};
    global.signupSessions[signupToken] = {
      username,
      email,
      mobile,
      password,
      company_id: company.id,
      timestamp: Date.now()
    };

    // Send OTP
    const identifier = verification_method === 'sms' ? mobile : email;
    const otpResult = await sendOTP(
      identifier,
      'signup',
      verification_method,
      req.ip,
      req.headers['user-agent']
    );

    if (!otpResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.'
      });
    }

    res.status(200).json({
      success: true,
      message: `OTP sent to ${verification_method === 'sms' ? 'mobile' : 'email'}`,
      signup_token: signupToken,
      expires_at: otpResult.expiresAt
    });

  } catch (error) {
    console.error('Signup request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during signup request',
      error: error.message
    });
  }
};

exports.verifySignup = async (req, res) => {
  try {
    const { signup_token, otp_code, verification_method } = req.body;

    if (!signup_token || !otp_code) {
      return res.status(400).json({
        success: false,
        message: 'Signup token and OTP are required'
      });
    }

    // Retrieve signup data
    global.signupSessions = global.signupSessions || {};
    const signupData = global.signupSessions[signup_token];

    if (!signupData) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired signup session'
      });
    }

    // Check session timeout (15 minutes)
    if (Date.now() - signupData.timestamp > 15 * 60 * 1000) {
      delete global.signupSessions[signup_token];
      return res.status(400).json({
        success: false,
        message: 'Signup session expired. Please start over.'
      });
    }

    // Verify OTP
    const identifier = verification_method === 'sms' ? signupData.mobile : signupData.email;
    const otpVerification = await verifyOTP(identifier, otp_code, 'signup');

    if (!otpVerification.success) {
      return res.status(400).json({
        success: false,
        message: otpVerification.message
      });
    }

    // Get default role for the company
    let defaultRole = await Role.findOne({
      where: {
        company_id: signupData.company_id,
        slug: 'employee'
      }
    });

    // Create user
    const user = await User.create({
      company_id: signupData.company_id,
      username: signupData.username,
      email: signupData.email,
      mobile: signupData.mobile,
      password: signupData.password,
      role_id: defaultRole ? defaultRole.id : null,
      email_verified: verification_method === 'email',
      mobile_verified: verification_method === 'sms'
    });

    // Clean up session
    delete global.signupSessions[signup_token];

    // Generate tokens
    const token = generateToken({
      id: user.id,
      company_id: user.company_id,
      username: user.username
    });
    const refreshToken = generateRefreshToken({ id: user.id });

    // Update last login
    user.last_login = new Date();
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: user.toJSON(),
      token,
      refresh_token: refreshToken
    });

  } catch (error) {
    console.error('Signup verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during signup verification',
      error: error.message
    });
  }
};

// ==================== USER LOGIN ====================
exports.login = async (req, res) => {
  try {
    const { username, password, company_code } = req.body;

    if (!username || !password || !company_code) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, and company code are required'
      });
    }

    // Find company
    const company = await Company.findOne({ where: { company_code } });
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Find user
    const user = await User.findOne({
      where: {
        company_id: company.id,
        username
      },
      include: [
        { model: Role, as: 'role' }
      ]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.locked_until && new Date() < user.locked_until) {
      return res.status(403).json({
        success: false,
        message: 'Account is temporarily locked. Please try again later.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Increment login attempts
      user.login_attempts += 1;
      if (user.login_attempts >= 5) {
        user.locked_until = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
      }
      await user.save();

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        attempts_remaining: Math.max(0, 5 - user.login_attempts)
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive. Contact administrator.'
      });
    }

    // Reset login attempts
    user.login_attempts = 0;
    user.locked_until = null;
    user.last_login = new Date();
    await user.save();

    // Generate tokens
    const token = generateToken({
      id: user.id,
      company_id: user.company_id,
      username: user.username
    });
    const refreshToken = generateRefreshToken({ id: user.id });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: user.toJSON(),
      company: company.toJSON(),
      token,
      refresh_token: refreshToken
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
};

// ==================== SUPER ADMIN LOGIN ====================
exports.superAdminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    const superAdmin = await SuperAdmin.findOne({ where: { username } });

    if (!superAdmin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (superAdmin.locked_until && new Date() < superAdmin.locked_until) {
      return res.status(403).json({
        success: false,
        message: 'Account is temporarily locked'
      });
    }

    // Verify password
    const isPasswordValid = await superAdmin.comparePassword(password);
    if (!isPasswordValid) {
      superAdmin.login_attempts += 1;
      if (superAdmin.login_attempts >= 5) {
        superAdmin.locked_until = new Date(Date.now() + 30 * 60 * 1000);
      }
      await superAdmin.save();

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    superAdmin.login_attempts = 0;
    superAdmin.locked_until = null;
    superAdmin.last_login = new Date();
    await superAdmin.save();

    const token = generateToken({
      id: superAdmin.id,
      username: superAdmin.username,
      userType: 'super_admin'
    });
    const refreshToken = generateRefreshToken({ id: superAdmin.id, userType: 'super_admin' });

    res.status(200).json({
      success: true,
      message: 'Super admin login successful',
      admin: superAdmin.toJSON(),
      token,
      refresh_token: refreshToken
    });

  } catch (error) {
    console.error('Super admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// ==================== VALIDATE SESSION ====================
exports.validateSession = async (req, res) => {
  try {
    if (req.userType === 'super_admin') {
      return res.status(200).json({
        success: true,
        userType: 'super_admin',
        admin: req.user.toJSON()
      });
    } else {
      return res.status(200).json({
        success: true,
        userType: 'user',
        user: req.user.toJSON(),
        company: req.company ? req.company.toJSON() : null
      });
    }
  } catch (error) {
    console.error('Session validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during session validation',
      error: error.message
    });
  }
};

// ==================== REFRESH TOKEN ====================
const jwt = require('jsonwebtoken');
exports.refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    if (decoded.userType === 'super_admin') {
      const superAdmin = await SuperAdmin.findByPk(decoded.id);
      if (!superAdmin || !superAdmin.is_active) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or inactive account'
        });
      }

      const newToken = generateToken({
        id: superAdmin.id,
        username: superAdmin.username,
        userType: 'super_admin'
      });
      const newRefreshToken = generateRefreshToken({ id: superAdmin.id, userType: 'super_admin' });

      return res.status(200).json({
        success: true,
        token: newToken,
        refresh_token: newRefreshToken
      });
    } else {
      const user = await User.findByPk(decoded.id, {
        include: [{ model: Company, as: 'company' }]
      });
      if (!user || !user.is_active || !user.company.is_active) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or inactive account'
        });
      }

      const newToken = generateToken({
        id: user.id,
        company_id: user.company_id,
        username: user.username
      });
      const newRefreshToken = generateRefreshToken({ id: user.id });

      return res.status(200).json({
        success: true,
        token: newToken,
        refresh_token: newRefreshToken
      });
    }
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during token refresh',
      error: error.message
    });
  }
};

// ==================== FORGOT PASSWORD ====================
exports.forgotPassword = async (req, res) => {
  try {
    const { email, company_code, verification_method } = req.body;
    if (!email || !company_code) {
      return res.status(400).json({
        success: false,
        message: 'Email and company code are required'
      });
    }

    const company = await Company.findOne({ where: { company_code } });
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    const user = await User.findOne({
      where: {
        company_id: company.id,
        email
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User with this email not registered in this company'
      });
    }

    const method = verification_method || 'email';
    const identifier = method === 'sms' ? user.mobile : user.email;

    const otpResult = await sendOTP(
      identifier,
      'reset_password',
      method,
      req.ip,
      req.headers['user-agent']
    );

    if (!otpResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset OTP'
      });
    }

    res.status(200).json({
      success: true,
      message: `Reset OTP sent to ${method === 'sms' ? 'mobile' : 'email'}`,
      identifier,
      expires_at: otpResult.expiresAt
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during forgot password process',
      error: error.message
    });
  }
};

// ==================== RESET PASSWORD ====================
exports.resetPassword = async (req, res) => {
  try {
    const { email, company_code, otp_code, new_password } = req.body;
    if (!email || !company_code || !otp_code || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: email, company_code, otp_code, new_password'
      });
    }

    const company = await Company.findOne({ where: { company_code } });
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Invalid company code'
      });
    }

    const user = await User.findOne({
      where: {
        company_id: company.id,
        email
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify OTP
    const otpVerification = await verifyOTP(user.email, otp_code, 'reset_password');
    if (!otpVerification.success) {
      const otpVerificationMobile = await verifyOTP(user.mobile, otp_code, 'reset_password');
      if (!otpVerificationMobile.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP code'
        });
      }
    }

    // Update password (hashing happens automatically via User model hooks)
    user.password = new_password;
    user.login_attempts = 0;
    user.locked_until = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset',
      error: error.message
    });
  }
};

// ==================== LOGOUT ====================
exports.logout = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout',
      error: error.message
    });
  }
};

module.exports = exports;
