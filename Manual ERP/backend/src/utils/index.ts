import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import prisma from '../services/db';

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

// Simulated OTP (SMS Mock) Engine
export async function sendSimulatedOTP(mobileNo: string): Promise<string> {
  // Generate a random 6-digit number
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Set expiration for 5 minutes from now
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 5);

  // Store in Database
  await prisma.oTPVerification.create({
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

export async function verifySimulatedOTP(mobileNo: string, otpCode: string): Promise<boolean> {
  const record = await prisma.oTPVerification.findFirst({
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
  await prisma.oTPVerification.update({
    where: { id: record.id },
    data: { verified: true }
  });

  return true;
}
