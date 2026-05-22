"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.comparePassword = comparePassword;
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
exports.sendSimulatedOTP = sendSimulatedOTP;
exports.verifySimulatedOTP = verifySimulatedOTP;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("../services/db"));
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
// Simulated OTP (SMS Mock) Engine
async function sendSimulatedOTP(mobileNo) {
    // Generate a random 6-digit number
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    // Set expiration for 5 minutes from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);
    // Store in Database
    await db_1.default.oTPVerification.create({
        data: {
            mobileNo,
            otpCode,
            expiresAt,
            verified: false
        }
    });
    // Log to console so the developer can see it and enter it on the frontend!
    console.log(`\n======================================================`);
    console.log(`📡 [SMS OTP SIMULATOR]`);
    console.log(`To: ${mobileNo}`);
    console.log(`Your ERP OTP verification code is: ${otpCode}`);
    console.log(`Expires in: 5 minutes`);
    console.log(`======================================================\n`);
    return otpCode;
}
async function verifySimulatedOTP(mobileNo, otpCode) {
    const record = await db_1.default.oTPVerification.findFirst({
        where: {
            mobileNo,
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
//# sourceMappingURL=index.js.map