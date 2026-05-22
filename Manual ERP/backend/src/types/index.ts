import { z } from 'zod';

export const SignupSchema = z.object({
  companyCode: z.string().min(2).max(12).toUpperCase(),
  username: z.string().min(3).max(30),
  password: z.string().min(6),
  mobileNo: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid mobile number format"),
  email: z.string().email().optional().or(z.literal("")),
});

export const LoginSchema = z.object({
  companyCode: z.string().min(2).max(12).toUpperCase(),
  username: z.string().min(3).max(30),
  password: z.string().min(6),
});

export const CreateCompanySchema = z.object({
  companyCode: z.string().min(2).max(12).toUpperCase(),
  name: z.string().min(2).max(50),
  subscriptionTier: z.enum(["BASIC", "PREMIUM", "ENTERPRISE"]).default("BASIC"),
  features: z.array(z.string()).optional(), // Optional list of custom active features
  adminUsername: z.string().min(3).max(30),
  adminMobile: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid admin mobile number"),
  adminPassword: z.string().min(6),
});

export const UpdateCompanySchema = z.object({
  name: z.string().min(2).max(50).optional(),
  companyCode: z.string().min(2).max(12).toUpperCase().optional(),
  createdAt: z.string().optional(), // Can pass joining date string
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  features: z.array(z.string()).optional(), // List of custom active features
});

export const CreateCompanyAdminSchema = z.object({
  username: z.string().min(3).max(30),
  mobileNo: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid mobile number format"),
  password: z.string().min(6),
  email: z.string().email().optional().or(z.literal("")),
});

export const UpdateCompanyUserSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  mobileNo: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid mobile number format").optional(),
  password: z.string().min(6).optional(),
  email: z.string().email().optional().or(z.literal("")).optional(),
  status: z.enum(["PENDING_APPROVAL", "ACTIVE", "SUSPENDED"]).optional(),
  roleId: z.string().uuid().optional().or(z.null()).optional(),
});

export const ApproveUserSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
});

export const CreateRoleSchema = z.object({
  name: z.string().min(2).max(30),
  permissions: z.record(z.array(z.string())), // e.g. { "CRM": ["read", "write"] }
});

