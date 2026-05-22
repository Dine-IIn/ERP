const OTP = require('../models/OTP');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

// Initialize Twilio client
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// Initialize Email transporter
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

// Generate OTP Code
const generateOTPCode = (length = 6) => {
  return Math.floor(Math.random() * Math.pow(10, length))
    .toString()
    .padStart(length, '0');
};

// Create OTP
const createOTP = async (identifier, type, ipAddress = null, userAgent = null) => {
  const otpCode = generateOTPCode(parseInt(process.env.OTP_LENGTH) || 6);
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + (parseInt(process.env.OTP_EXPIRE_MINUTES) || 5));

  // Delete any existing unused OTPs for this identifier and type
  await OTP.destroy({
    where: {
      identifier,
      type,
      is_used: false
    }
  });

  const otp = await OTP.create({
    identifier,
    otp_code: otpCode,
    type,
    expires_at: expiresAt,
    ip_address: ipAddress,
    user_agent: userAgent
  });

  return otp;
};

// Send OTP via Email
const sendOTPEmail = async (email, otpCode, type) => {
  const subjects = {
    signup: 'Complete Your Registration - OTP Verification',
    login: 'Login Verification Code',
    reset_password: 'Password Reset OTP',
    verify_email: 'Email Verification Code',
    '2fa': 'Two-Factor Authentication Code'
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
        .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
        .warning { color: #e74c3c; font-size: 14px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 OTP Verification</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Your One-Time Password (OTP) for ${type.replace('_', ' ')} is:</p>
          <div class="otp-box">
            <div class="otp-code">${otpCode}</div>
          </div>
          <p>This OTP is valid for <strong>${process.env.OTP_EXPIRE_MINUTES || 5} minutes</strong>.</p>
          <p class="warning">⚠️ Never share this OTP with anyone. Our team will never ask for your OTP.</p>
          <p>If you didn't request this OTP, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>© 2024 Enterprise ERP System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await emailTransporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: subjects[type] || 'OTP Verification',
      html: htmlContent
    });
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
};

// Send OTP via SMS
const sendOTPSMS = async (mobile, otpCode, type) => {
  if (!twilioClient) {
    console.error('Twilio not configured');
    return false;
  }

  const message = `Your OTP for ${type.replace('_', ' ')} is: ${otpCode}. Valid for ${process.env.OTP_EXPIRE_MINUTES || 5} minutes. Do not share with anyone.`;

  try {
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: mobile
    });
    return true;
  } catch (error) {
    console.error('SMS send error:', error);
    return false;
  }
};

// Send OTP (Auto-detect email or mobile)
const sendOTP = async (identifier, type, method = 'auto', ipAddress = null, userAgent = null) => {
  const otp = await createOTP(identifier, type, ipAddress, userAgent);
  
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
  const isMobile = /^\+?[1-9]\d{1,14}$/.test(identifier);

  let sent = false;

  if (method === 'email' || (method === 'auto' && isEmail)) {
    sent = await sendOTPEmail(identifier, otp.otp_code, type);
  } else if (method === 'sms' || (method === 'auto' && isMobile)) {
    sent = await sendOTPSMS(identifier, otp.otp_code, type);
  }

  return {
    success: sent,
    otpId: otp.id,
    expiresAt: otp.expires_at
  };
};

// Verify OTP
const verifyOTP = async (identifier, otpCode, type) => {
  const otp = await OTP.findOne({
    where: {
      identifier,
      otp_code: otpCode,
      type,
      is_used: false
    },
    order: [['created_at', 'DESC']]
  });

  if (!otp) {
    return {
      success: false,
      message: 'Invalid OTP'
    };
  }

  if (otp.isExpired()) {
    return {
      success: false,
      message: 'OTP has expired'
    };
  }

  if (!otp.canAttempt()) {
    return {
      success: false,
      message: 'Maximum verification attempts exceeded'
    };
  }

  // Increment attempts
  otp.attempts += 1;
  await otp.save();

  // Mark as used
  otp.is_used = true;
  await otp.save();

  return {
    success: true,
    message: 'OTP verified successfully'
  };
};

// Clean up expired OTPs (run as cron job)
const cleanupExpiredOTPs = async () => {
  const deleted = await OTP.destroy({
    where: {
      expires_at: {
        [require('sequelize').Op.lt]: new Date()
      }
    }
  });
  console.log(`Cleaned up ${deleted} expired OTPs`);
  return deleted;
};

module.exports = {
  generateOTPCode,
  createOTP,
  sendOTP,
  sendOTPEmail,
  sendOTPSMS,
  verifyOTP,
  cleanupExpiredOTPs
};
