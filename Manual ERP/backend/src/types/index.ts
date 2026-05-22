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
  fileSizeLimit: z.number().int().positive().optional().default(50),
  backupAccess: z.boolean().optional().default(false),
  backupRetentionDays: z.number().int().positive().optional().default(60),
});

export const UpdateCompanySchema = z.object({
  name: z.string().min(2).max(50).optional(),
  companyCode: z.string().min(2).max(12).toUpperCase().optional(),
  createdAt: z.string().optional(), // Can pass joining date string
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  features: z.array(z.string()).optional(), // List of custom active features
  fileSizeLimit: z.number().int().positive().optional(),
  backupAccess: z.boolean().optional(),
  backupRetentionDays: z.number().int().positive().optional(),
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
  hasBackupAccess: z.boolean().optional(),
});

export const ApproveUserSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
});

export const CreateRoleSchema = z.object({
  name: z.string().min(2).max(30),
  permissions: z.record(z.array(z.string())), // e.g. { "CRM": ["read", "write"] }
});

// --- NEW GENERAL ADMINISTRATION ZOD SCHEMAS ---

export const CompanyProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  legalCompanyName: z.string().optional().or(z.literal("")),
  companyLogo: z.string().optional().or(z.literal("")),
  companyBanner: z.string().optional().or(z.literal("")),
  companyEmail: z.string().email().optional().or(z.literal("")),
  companyPhone: z.string().optional().or(z.literal("")),
  alternatePhone: z.string().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  industryType: z.string().optional().or(z.literal("")),
  businessType: z.string().optional().or(z.literal("")),
  companyDescription: z.string().optional().or(z.literal("")),

  // Tax Info
  gstin: z.string().optional().or(z.literal("")),
  pan: z.string().optional().or(z.literal("")),
  tan: z.string().optional().or(z.literal("")),
  vatNumber: z.string().optional().or(z.literal("")),
  cinNumber: z.string().optional().or(z.literal("")),
  msmeNumber: z.string().optional().or(z.literal("")),

  // Address
  country: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  pincode: z.string().optional().or(z.literal("")),
  addressLine1: z.string().optional().or(z.literal("")),
  addressLine2: z.string().optional().or(z.literal("")),
  landmark: z.string().optional().or(z.literal("")),

  // Business Details
  fiscalYearStart: z.string().optional().or(z.literal("")),
  fiscalYearEnd: z.string().optional().or(z.literal("")),
  currencyId: z.string().optional().or(z.literal("")),
  timezone: z.string().optional().or(z.literal("")),
  dateFormat: z.string().optional().or(z.literal("")),
  language: z.string().optional().or(z.literal("")),
  decimalPrecision: z.number().int().min(0).max(4).optional().default(2),

  // Branding
  primaryColor: z.string().optional().or(z.literal("")),
  secondaryColor: z.string().optional().or(z.literal("")),
  dashboardTheme: z.string().optional().default("dark"),
  favicon: z.string().optional().or(z.literal("")),
  invoiceTemplate: z.string().optional().default("STANDARD"),

  // SMTP Settings
  smtpHost: z.string().optional().or(z.literal("")),
  smtpPort: z.number().int().optional().or(z.null()),
  smtpUser: z.string().optional().or(z.literal("")),
  smtpPassword: z.string().optional().or(z.literal("")),
  smtpSecure: z.boolean().optional().default(false),
  smtpSender: z.string().optional().or(z.literal("")),
});

export const TaxSettingSchema = z.object({
  taxName: z.string().min(2).max(50),
  taxCode: z.string().min(2).max(12),
  taxPercentage: z.number().min(0).max(100),
  taxType: z.enum(["GST", "CGST", "SGST", "IGST", "VAT", "TDS"]),
  effectiveDate: z.string(), // ISO date string
  taxStatus: z.enum(["ACTIVE", "INACTIVE"]).optional().default("ACTIVE"),
  hsnSacCode: z.string().optional().or(z.literal("")),
  category: z.string().optional().or(z.literal("")),
  isReverseCharge: z.boolean().optional().default(false),
  description: z.string().optional().or(z.literal("")),
});

export const CurrencySchema = z.object({
  currencyCode: z.string().min(2).max(5),
  currencyName: z.string().min(2).max(50),
  symbol: z.string().min(1).max(5),
  decimalPlaces: z.number().int().min(0).max(4).optional().default(2),
  exchangeRate: z.number().positive(),
  activeStatus: z.enum(["ACTIVE", "INACTIVE"]).optional().default("ACTIVE"),
  isBase: z.boolean().optional().default(false),
});

export const ApprovalWorkflowSchema = z.object({
  workflowName: z.string().min(2).max(100),
  module: z.enum(["purchase", "expenses", "sales", "HR", "finance"]),
  conditions: z.string().optional().or(z.literal("")),
  minAmount: z.number().nonnegative().optional(),
  maxAmount: z.number().nonnegative().optional(),
  autoApprove: z.boolean().optional().default(false),
  escalationTime: z.number().int().positive().optional(),
  isActive: z.boolean().optional().default(true),
  steps: z.array(z.object({
    approverRole: z.string().optional(),
    approverRoleId: z.string().optional(),
    approverUserId: z.string().optional(),
    stepOrder: z.number().int().default(1),
  })).min(1, "At least one approval step is required"),
});

export const ApprovalRequestSchema = z.object({
  workflowId: z.string().uuid(),
  entityId: z.string(),
  amount: z.number().nonnegative().optional(),
});

export const DashboardLayoutSchema = z.object({
  layoutSettings: z.string(),
});

export const DepartmentSchema = z.object({
  departmentCode: z.string().min(2).max(12).toUpperCase(),
  departmentName: z.string().min(2).max(100),
  managerId: z.string().uuid().optional().or(z.null()).or(z.literal("")),
  parentDepartmentId: z.string().uuid().optional().or(z.null()).or(z.literal("")),
});



