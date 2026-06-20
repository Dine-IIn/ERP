import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import prisma from '../services/db';
import tls from 'tls';
import net from 'net';
import crypto from 'crypto';

dotenv.config();

// ==========================================
// AES-256-CBC ENCRYPTION FOR SMTP PASSWORDS
// ==========================================
const SMTP_ENCRYPTION_KEY = process.env.SMTP_ENCRYPTION_KEY || 'erp-smtp-secret-key-32bytes!!!!'; // Must be exactly 32 chars
const SMTP_IV_LENGTH = 16;

/**
 * Encrypt an SMTP password for secure storage using AES-256-CBC.
 * Returns a string in format: iv_hex:encrypted_hex
 */
export function encryptSmtp(plainText: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(SMTP_IV_LENGTH);
  const key = Buffer.from(SMTP_ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32), 'utf-8');
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(plainText, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt an AES-256-CBC encrypted SMTP password.
 * Expects input in format: iv_hex:encrypted_hex
 * Falls back to returning the raw value if decryption fails (for unencrypted legacy values).
 */
export function decryptSmtp(encryptedText: string): string {
  if (!encryptedText) return '';
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return encryptedText; // Legacy unencrypted value
    const iv = Buffer.from(parts[0], 'hex');
    if (iv.length !== SMTP_IV_LENGTH) return encryptedText; // Not encrypted format
    const key = Buffer.from(SMTP_ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32), 'utf-8');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(parts[1], 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
  } catch {
    return encryptedText; // Fallback for legacy unencrypted passwords
  }
}

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
interface SmtpAttachment {
  filename: string;
  content: Buffer;
}

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
  attachments?: SmtpAttachment[];
}

export function sendSmtpEmail(opts: SmtpOptions): Promise<void> {
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
          const boundary = `----=_Part_${Math.random().toString(36).substring(2)}_${Date.now()}`;
          let headers = '';
          if (opts.attachments && opts.attachments.length > 0) {
            const emailParts = [
              `From: ${opts.from}`,
              `To: ${opts.to}`,
              `Subject: ${opts.subject}`,
              'MIME-Version: 1.0',
              `Content-Type: multipart/mixed; boundary="${boundary}"`,
              '',
              `--${boundary}`,
              'Content-Type: text/plain; charset=utf-8',
              'Content-Transfer-Encoding: 7bit',
              '',
              opts.text,
              ''
            ];

            for (const att of opts.attachments) {
              const base64Content = att.content.toString('base64');
              const wrappedContent = base64Content.replace(/(.{76})/g, '$1\r\n');
              emailParts.push(
                `--${boundary}`,
                `Content-Type: application/octet-stream; name="${att.filename}"`,
                'Content-Transfer-Encoding: base64',
                `Content-Disposition: attachment; filename="${att.filename}"`,
                '',
                wrappedContent,
                ''
              );
            }
            emailParts.push(`--${boundary}--`, '.');
            headers = emailParts.join('\r\n');
          } else {
            headers = [
              `From: ${opts.from}`,
              `To: ${opts.to}`,
              `Subject: ${opts.subject}`,
              'MIME-Version: 1.0',
              'Content-Type: text/plain; charset=utf-8',
              '',
              opts.text,
              '.'
            ].join('\r\n');
          }
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
    // 1. Check Company SMTP FIRST if companyCode is provided (Priority: Company > Env)
    let host: string | undefined;
    let port = 465;
    let secure = true;
    let user: string | undefined;
    let pass: string | undefined;
    let sender = "noreply@erp.anbindustries.com";

    if (companyCode) {
      const company = await prisma.company.findUnique({
        where: { companyCode: companyCode.toUpperCase() }
      });
      if (company && company.smtpHost) {
        host = company.smtpHost;
        port = company.smtpPort || 465;
        secure = company.smtpSecure || port === 465;
        user = company.smtpUser || undefined;
        pass = company.smtpPassword ? decryptSmtp(company.smtpPassword) : undefined;
        sender = company.smtpSender || user || `noreply@${company.companyCode.toLowerCase()}.com`;
        console.log(`📧 [SMTP] Using Company SMTP for ${companyCode}`);
      }
    }

    // 2. Fallback to Global Env vars if Company SMTP not configured
    if (!host && process.env.SMTP_HOST) {
      host = process.env.SMTP_HOST;
      port = Number(process.env.SMTP_PORT) || 465;
      secure = process.env.SMTP_SECURE === 'true' || port === 465;
      user = process.env.SMTP_USER;
      pass = process.env.SMTP_PASS;
      sender = process.env.SMTP_SENDER || user || "noreply@erp.anbindustries.com";
      console.log(`📧 [SMTP] Using env var fallback for OTP email`);
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

export async function sendEmailNotification(
  to: string,
  subject: string,
  text: string,
  companyCode?: string,
  attachments?: { filename: string; content: Buffer }[]
): Promise<void> {
  // 1. Check Company SMTP FIRST if companyCode is provided (Priority: Company > Env)
  let host: string | undefined;
  let port = 465;
  let secure = true;
  let user: string | undefined;
  let pass: string | undefined;
  let sender = "noreply@erp.anbindustries.com";

  if (companyCode) {
    const company = await prisma.company.findUnique({
      where: { companyCode: companyCode.toUpperCase() }
    });
    if (company && company.smtpHost) {
      host = company.smtpHost;
      port = company.smtpPort || 465;
      secure = company.smtpSecure || port === 465;
      user = company.smtpUser || undefined;
      pass = company.smtpPassword ? decryptSmtp(company.smtpPassword) : undefined;
      sender = company.smtpSender || user || `noreply@${company.companyCode.toLowerCase()}.com`;
      console.log(`📧 [SMTP] Using Company SMTP for ${companyCode}`);
    }
  }

  // 2. Fallback to Global Env vars if Company SMTP not configured
  if (!host && process.env.SMTP_HOST) {
    host = process.env.SMTP_HOST;
    port = Number(process.env.SMTP_PORT) || 465;
    secure = process.env.SMTP_SECURE === 'true' || port === 465;
    user = process.env.SMTP_USER;
    pass = process.env.SMTP_PASS;
    sender = process.env.SMTP_SENDER || user || "noreply@erp.anbindustries.com";
    console.log(`📧 [SMTP] Using env var fallback for email to ${to}`);
  }

  if (!host) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`⚠️  [SMTP WARNING] SMTP server not configured. Email to ${to} simulated:\nSubject: ${subject}\nText: ${text}`);
      return;
    }
    throw new Error("SMTP server is not configured in environment variables or Tenant Company profile.");
  }

  await sendSmtpEmail({
    host,
    port,
    secure,
    user,
    pass,
    from: sender,
    to,
    subject,
    text,
    attachments
  });
}

export function numberToIndianWords(amount: number): string {
  if (amount === 0) return "Indian Rupees Zero Only";

  const isNegative = amount < 0;
  const absoluteAmount = Math.abs(amount);

  const rupees = Math.floor(absoluteAmount);
  const paise = Math.round((absoluteAmount - rupees) * 100);

  const convertToWords = (n: number): string => {
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + convertToWords(n % 100) : "");
    if (n < 100000) return convertToWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + convertToWords(n % 1000) : "");
    if (n < 10000000) return convertToWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + convertToWords(n % 100000) : "");
    return convertToWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 !== 0 ? " " + convertToWords(n % 10000000) : "");
  };

  let result = "Indian Rupees ";
  if (isNegative) {
    result += "Negative ";
  }

  if (rupees > 0) {
    result += convertToWords(rupees);
  } else {
    result += "Zero";
  }

  if (paise > 0) {
    result += " And " + convertToWords(paise) + " Paisa";
  }

  result += " Only";
  return result.replace(/\s+/g, ' ').trim();
}

export async function resolveAndCompileMessage(
  companyId: string,
  documentType: string,
  documentId: string,
  targetChannel: 'WHATSAPP' | 'EMAIL',
  fallbackDefaultText: string
): Promise<string> {
  // 1. Fetch company details
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, whatsappDefaultCountryCode: true }
  });

  const placeholders: Record<string, string> = {
    companyName: company?.name || 'ERP Workspace'
  };

  // 2. Fetch template from DB
  const templateRecord = await prisma.whatsappTemplate.findFirst({
    where: { companyId, documentType }
  });

  let templateText = '';
  if (templateRecord) {
    if (targetChannel === 'WHATSAPP') {
      templateText = templateRecord.template;
    } else {
      templateText = templateRecord.useSameForEmail || !templateRecord.emailTemplate
        ? templateRecord.template
        : templateRecord.emailTemplate;
    }
  }

  if (!templateText) {
    templateText = fallbackDefaultText;
  }

  // 3. Resolve Placeholders based on document type
  if (documentType === 'SALES_INVOICE') {
    const doc = await prisma.salesInvoice.findFirst({
      where: { id: documentId, companyId },
      include: { customer: true }
    });
    if (doc) {
      placeholders.customerName = doc.customer.name;
      placeholders.customerCode = doc.customer.id;
      placeholders.invoiceNumber = doc.invoiceNo;
      placeholders.invoiceDate = doc.date.toLocaleDateString();
      placeholders.invoiceAmount = `${doc.customer.currencySymbol || '$'}${doc.total.toFixed(2)}`;
      placeholders.dueDate = doc.dueDate ? new Date(doc.dueDate).toLocaleDateString() : '';
    }
  } else if (documentType === 'PROFORMA_INVOICE') {
    const doc = await prisma.proformaInvoice.findFirst({
      where: { id: documentId, companyId },
      include: { customer: true }
    });
    if (doc) {
      placeholders.customerName = doc.customer.name;
      placeholders.customerCode = doc.customer.id;
      placeholders.invoiceNumber = doc.invoiceNo;
      placeholders.invoiceDate = doc.date.toLocaleDateString();
      placeholders.invoiceAmount = `${doc.customer.currencySymbol || '$'}${doc.total.toFixed(2)}`;
      placeholders.dueDate = doc.dueDate ? new Date(doc.dueDate).toLocaleDateString() : '';
    }
  } else if (documentType === 'DELIVERY_CHALLAN') {
    const doc = await prisma.deliveryChallan.findFirst({
      where: { id: documentId, companyId },
      include: { customer: true }
    });
    if (doc) {
      placeholders.customerName = doc.customer.name;
      placeholders.customerCode = doc.customer.id;
      placeholders.challanNumber = doc.challanNo;
      placeholders.invoiceDate = doc.date.toLocaleDateString();
      placeholders.invoiceAmount = '';
      placeholders.dueDate = '';
    }
  } else if (documentType === 'PURCHASE_ORDER') {
    const doc = await prisma.purchaseOrder.findFirst({
      where: { id: documentId, companyId },
      include: { vendor: true }
    });
    if (doc) {
      placeholders.customerName = doc.vendor.name;
      placeholders.customerCode = doc.vendor.id;
      placeholders.poNumber = doc.poNo;
      placeholders.invoiceDate = doc.date.toLocaleDateString();
      placeholders.invoiceAmount = `${doc.vendor.currencySymbol || '$'}${doc.total.toFixed(2)}`;
      placeholders.dueDate = '';
    }
  } else if (documentType === 'QUOTATION') {
    const doc = await prisma.quotation.findFirst({
      where: { id: documentId, companyId },
      include: { customer: true }
    });
    if (doc) {
      placeholders.customerName = doc.customer.name;
      placeholders.customerCode = doc.customer.id;
      placeholders.quotationNumber = doc.quoteNo;
      placeholders.invoiceDate = doc.date.toLocaleDateString();
      placeholders.invoiceAmount = `${doc.customer.currencySymbol || '$'}${doc.total.toFixed(2)}`;
      placeholders.dueDate = '';
    }
  } else if (documentType === 'PAYMENT_RECEIPT') {
    const doc = await prisma.companyReceipt.findFirst({
      where: { id: documentId, companyId }
    });
    if (doc) {
      placeholders.customerName = doc.payerName;
      placeholders.customerCode = '';
      placeholders.receiptNumber = doc.referenceNo || doc.id;
      placeholders.invoiceDate = doc.date.toLocaleDateString();
      placeholders.invoiceAmount = `$${doc.amount.toFixed(2)}`;
      placeholders.dueDate = '';
    }
  } else if (documentType === 'DEBIT_NOTE') {
    const doc = await prisma.purchaseReturn.findFirst({
      where: { id: documentId, companyId },
      include: { purchaseOrder: { include: { vendor: true } }, items: true }
    });
    if (doc) {
      const vendor = doc.purchaseOrder?.vendor;
      placeholders.customerName = vendor?.name || 'Supplier';
      placeholders.customerCode = vendor?.id || '';
      placeholders.invoiceNumber = doc.returnNo;
      placeholders.invoiceDate = doc.returnDate.toLocaleDateString();
      const debitVal = doc.items.reduce((sum, it) => sum + (it.quantity * it.price), 0);
      placeholders.invoiceAmount = `${vendor?.currencySymbol || '$'}${debitVal.toFixed(2)}`;
      placeholders.dueDate = '';
    }
  }

  // 4. Compile Template
  let result = templateText;
  for (const key in placeholders) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), placeholders[key] || '');
  }
  result = result.replace(/\{\{\w+\}\}/g, '');
  return result;
}
