"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.comparePassword = comparePassword;
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
exports.sendSmtpEmail = sendSmtpEmail;
exports.sendSimulatedOTP = sendSimulatedOTP;
exports.verifySimulatedOTP = verifySimulatedOTP;
exports.sendEmailNotification = sendEmailNotification;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("../services/db"));
const tls_1 = __importDefault(require("tls"));
const net_1 = __importDefault(require("net"));
dotenv_1.default.config();
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-erp-key-12345-enterprise-ready";
// Password Hashing Helpers
async function hashPassword(password) {
    const salt = await bcryptjs_1.default.genSalt(10);
    return bcryptjs_1.default.hash(password, salt);
}
async function comparePassword(password, hash) {
    return bcryptjs_1.default.compare(password, hash);
}
function generateToken(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}
function verifyToken(token) {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
}
// Extract raw email address from complex RFC 2822 header format (e.g. '"ERP" <user@example.com>' -> 'user@example.com')
function extractRawEmail(emailStr) {
    const match = emailStr.match(/<([^>]+)>/);
    return match ? match[1].trim() : emailStr.trim();
}
function sendSmtpEmail(opts) {
    return new Promise((resolve, reject) => {
        const socket = opts.secure
            ? tls_1.default.connect(opts.port, opts.host, { rejectUnauthorized: false })
            : net_1.default.connect(opts.port, opts.host);
        let step = 0;
        const send = (data) => {
            socket.write(data + '\r\n');
        };
        const handleResponse = (line) => {
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
                    }
                    else {
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
async function sendTwilioSMS(opts) {
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
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || `Twilio SMS failed with status ${response.status}`);
    }
}
// ==========================================
// REALTIME MULTI-CHANNEL OTP ENGINE
// ==========================================
async function sendSimulatedOTP(target, companyCode) {
    // Generate random 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    // Set expiration for 5 minutes
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);
    // Store in Database
    await db_1.default.oTPVerification.create({
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
            const company = await db_1.default.company.findUnique({
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
        }
        catch (err) {
            if (process.env.NODE_ENV !== 'production') {
                console.warn(`⚠️  [SMTP DISPATCH FAILED] Real SMTP send failed: ${err.message}. Simulated OTP: ${otpCode}`);
            }
            else {
                throw err;
            }
        }
    }
    else {
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
        }
        catch (err) {
            if (process.env.NODE_ENV !== 'production') {
                console.warn(`⚠️  [TWILIO DISPATCH FAILED] Real Twilio SMS send failed: ${err.message}. Simulated OTP: ${otpCode}`);
            }
            else {
                throw err;
            }
        }
    }
    return otpCode;
}
async function verifySimulatedOTP(target, otpCode) {
    const record = await db_1.default.oTPVerification.findFirst({
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
    await db_1.default.oTPVerification.update({
        where: { id: record.id },
        data: { verified: true }
    });
    return true;
}
async function sendEmailNotification(to, subject, text, companyCode) {
    let host = process.env.SMTP_HOST;
    let port = Number(process.env.SMTP_PORT) || 465;
    let secure = process.env.SMTP_SECURE === 'true' || port === 465;
    let user = process.env.SMTP_USER;
    let pass = process.env.SMTP_PASS;
    let sender = process.env.SMTP_SENDER || user || "noreply@erp.anbindustries.com";
    if (!host && companyCode) {
        const company = await db_1.default.company.findUnique({
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
        text
    });
}
//# sourceMappingURL=index.js.map