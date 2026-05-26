import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import prisma from '../services/db';
import tls from 'tls';
import net from 'net';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-erp-key-12345-enterprise-ready";

// Password Hashing Helpers
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// JWT Token Helpers
export interface JwtPayload {
  userId: string;
  username: string;
  companyId: string;
  companyCode: string;
  role: string | null;
  isSuperAdmin: boolean;
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

// Extract raw email address from complex RFC 2822 header format (e.g. '"ERP" <user@example.com>' -> 'user@example.com')
function extractRawEmail(emailStr: string): string {
  const match = emailStr.match(/<([^>]+)>/);
  return match ? match[1].trim() : emailStr.trim();
}

// ==========================================
// PURE NATIVE SMTP EMAIL CLIENT (RFC 5321 COMPLIANT)
// ==========================================
interface SmtpOptions {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
  to: string;
  subject: string;
  text: string;
}

function sendSmtpEmail(opts: SmtpOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = opts.secure 
      ? tls.connect(opts.port, opts.host, { rejectUnauthorized: false })
      : net.connect(opts.port, opts.host);

    let step = 0;
    const send = (data: string) => {
      socket.write(data + '\r\n');
    };

    const handleResponse = (line: string) => {
      const code = parseInt(line.substring(0, 3));
      if (code >= 400) {
        socket.end();
        return reject(new Error(`SMTP Dispatch Error: ${line}`));
      }

      switch (step) {
        case 0: // Connection greeting received, send EHLO
          send(`EHLO localhost`);
          step = 1;
          break;
        case 1: // EHLO response received. If Auth settings are set, AUTH LOGIN. Else send MAIL FROM.
          if (opts.user && opts.pass) {
            send('AUTH LOGIN');
            step = 2;
          } else {
            send(`MAIL FROM:<${extractRawEmail(opts.from)}>`);
            step = 5; // skip AUTH login steps
          }
          break;
        case 2: // AUTH LOGIN response, send Base64 Username
          send(Buffer.from(opts.user || '').toString('base64'));
          step = 3;
          break;
        case 3: // Username sent response, send Base64 Password
          send(Buffer.from(opts.pass || '').toString('base64'));
          step = 4;
          break;
        case 4: // Password sent / AUTH Success response, send MAIL FROM
          send(`MAIL FROM:<${extractRawEmail(opts.from)}>`);
          step = 5;
          break;
        case 5: // MAIL FROM response, send RCPT TO
          send(`RCPT TO:<${extractRawEmail(opts.to)}>`);
          step = 6;
          break;
        case 6: // RCPT TO response, send DATA
          send('DATA');
          step = 7;
          break;
        case 7: // DATA challenge (354) received, send headers + email body ending with "."
          const headers = [
            `From: ${opts.from}`,
            `To: ${opts.to}`,
            `Subject: ${opts.subject}`,
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=utf-8',
            '',
            opts.text,
            '.'
          ].join('\r\n');
          send(headers);
          step = 8;
          break;
        case 8: // Email accepted response (250) received, send QUIT
          send('QUIT');
          step = 9;
          break;
        case 9: // QUIT accepted response (221) received
          socket.end();
          resolve();
          break;
      }
    };

    let buffer = '';
    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\r\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.charAt(3) === ' ' || line.length === 3) {
          handleResponse(line);
        }
      }
    });

    socket.on('error', (err) => {
      reject(err);
    });

    socket.setTimeout(15000, () => {
      socket.end();
      reject(new Error("SMTP Connection Timeout (15 seconds)"));
    });
  });
}

// ==========================================
// PURE NATIVE TWILIO SMS CLIENT
// ==========================================
async function sendTwilioSMS(opts: {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
  body: string;
}): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${opts.accountSid}/Messages.json`;
  const auth = Buffer.from(`${opts.accountSid}:${opts.authToken}`).toString('base64');
  
  const params = new URLSearchParams();
  params.append('To', opts.to);
  params.append('From', opts.from);
  params.append('Body', opts.body);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  const data = await response.json() as any;
  if (!response.ok) {
    throw new Error(data.message || `Twilio SMS failed with status ${response.status}`);
  }
}

// ==========================================
// REALTIME MULTI-CHANNEL OTP ENGINE
// ==========================================
export async function sendSimulatedOTP(target: string, companyCode?: string): Promise<string> {
  // Generate random 6-digit OTP code
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Set expiration for 5 minutes
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 5);

  // Store in Database
  await prisma.oTPVerification.create({
    data: {
      target,
      otpCode,
      expiresAt,
      verified: false
    }
  });

  const isEmail = target.includes('@');

  if (isEmail) {
    // 1. Check Global Env first
    let host = process.env.SMTP_HOST;
    let port = Number(process.env.SMTP_PORT) || 465;
    let secure = process.env.SMTP_SECURE === 'true' || port === 465;
    let user = process.env.SMTP_USER;
    let pass = process.env.SMTP_PASS;
    let sender = process.env.SMTP_SENDER || user || "noreply@erp.anbindustries.com";

    // 2. Check Company SMTP fallback if companyCode is provided
    if (!host && companyCode) {
      const company = await prisma.company.findUnique({
        where: { companyCode: companyCode.toUpperCase() }
      });
      if (company && company.smtpHost) {
        host = company.smtpHost;
        port = company.smtpPort || 465;
        secure = company.smtpSecure || port === 465;
        user = company.smtpUser || undefined;
        pass = company.smtpPassword || undefined;
        sender = company.smtpSender || user || `noreply@${company.companyCode.toLowerCase()}.com`;
      }
    }

    if (!host) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`⚠️  [SMTP WARNING] SMTP server is not configured. Simulated OTP for ${target}: ${otpCode}`);
        return otpCode;
      }
      throw new Error("SMTP server is not configured in environment variables or Tenant Company profile.");
    }

    try {
      // Send real email using our pure async SMTP client!
      await sendSmtpEmail({
        host,
        port,
        secure,
        user,
        pass,
        from: sender,
        to: target,
        subject: "Your ERP OTP Verification Code",
        text: `Your ERP account verification code is: ${otpCode}\r\n\r\nThis code expires in 5 minutes.\r\nIf you did not request this code, please ignore this message.`
      });
      console.log(`📧 [REALTIME EMAIL SENT] OTP code dispatched to ${target}`);
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`⚠️  [SMTP DISPATCH FAILED] Real SMTP send failed: ${err.message}. Simulated OTP: ${otpCode}`);
      } else {
        throw err;
      }
    }
  } else {
    // SMS flow via Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !from || authToken === "your_twilio_auth_token") {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`⚠️  [TWILIO WARNING] Twilio SMS credentials are missing or placeholders. Simulated OTP for ${target}: ${otpCode}`);
        return otpCode;
      }
      throw new Error("Twilio SMS credentials are missing. Please define TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in your server .env file.");
    }

    try {
      // Send real SMS using our pure Twilio REST wrapper!
      await sendTwilioSMS({
        accountSid,
        authToken,
        from,
        to: target,
        body: `Your ERP verification code is: ${otpCode}. Valid for 5 minutes.`
      });
      console.log(`📡 [REALTIME SMS SENT] OTP code dispatched to ${target}`);
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`⚠️  [TWILIO DISPATCH FAILED] Real Twilio SMS send failed: ${err.message}. Simulated OTP: ${otpCode}`);
      } else {
        throw err;
      }
    }
  }

  return otpCode;
}

export async function verifySimulatedOTP(target: string, otpCode: string): Promise<boolean> {
  const record = await prisma.oTPVerification.findFirst({
    where: {
      target,
      otpCode,
      expiresAt: { gt: new Date() },
      verified: false
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  if (!record) {
    return false;
  }

  // Mark as verified
  await prisma.oTPVerification.update({
    where: { id: record.id },
    data: { verified: true }
  });

  return true;
}
