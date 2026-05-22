"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepartmentSchema = exports.DashboardLayoutSchema = exports.ApprovalRequestSchema = exports.ApprovalWorkflowSchema = exports.CurrencySchema = exports.TaxSettingSchema = exports.CompanyProfileSchema = exports.CreateRoleSchema = exports.ApproveUserSchema = exports.UpdateCompanyUserSchema = exports.CreateCompanyAdminSchema = exports.UpdateCompanySchema = exports.CreateCompanySchema = exports.LoginSchema = exports.SignupSchema = void 0;
const zod_1 = require("zod");
exports.SignupSchema = zod_1.z.object({
    companyCode: zod_1.z.string().min(2).max(12).toUpperCase(),
    username: zod_1.z.string().min(3).max(30),
    password: zod_1.z.string().min(6),
    mobileNo: zod_1.z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid mobile number format"),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal("")),
});
exports.LoginSchema = zod_1.z.object({
    companyCode: zod_1.z.string().min(2).max(12).toUpperCase(),
    username: zod_1.z.string().min(3).max(30),
    password: zod_1.z.string().min(6),
});
exports.CreateCompanySchema = zod_1.z.object({
    companyCode: zod_1.z.string().min(2).max(12).toUpperCase(),
    name: zod_1.z.string().min(2).max(50),
    subscriptionTier: zod_1.z.enum(["BASIC", "PREMIUM", "ENTERPRISE"]).default("BASIC"),
    features: zod_1.z.array(zod_1.z.string()).optional(), // Optional list of custom active features
    adminUsername: zod_1.z.string().min(3).max(30),
    adminMobile: zod_1.z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid admin mobile number"),
    adminPassword: zod_1.z.string().min(6),
    fileSizeLimit: zod_1.z.number().int().positive().optional().default(50),
    backupAccess: zod_1.z.boolean().optional().default(false),
    backupRetentionDays: zod_1.z.number().int().positive().optional().default(60),
});
exports.UpdateCompanySchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(50).optional(),
    companyCode: zod_1.z.string().min(2).max(12).toUpperCase().optional(),
    createdAt: zod_1.z.string().optional(), // Can pass joining date string
    status: zod_1.z.enum(["ACTIVE", "SUSPENDED"]).optional(),
    features: zod_1.z.array(zod_1.z.string()).optional(), // List of custom active features
    fileSizeLimit: zod_1.z.number().int().positive().optional(),
    backupAccess: zod_1.z.boolean().optional(),
    backupRetentionDays: zod_1.z.number().int().positive().optional(),
});
exports.CreateCompanyAdminSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(30),
    mobileNo: zod_1.z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid mobile number format"),
    password: zod_1.z.string().min(6),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal("")),
});
exports.UpdateCompanyUserSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(30).optional(),
    mobileNo: zod_1.z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid mobile number format").optional(),
    password: zod_1.z.string().min(6).optional(),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal("")).optional(),
    status: zod_1.z.enum(["PENDING_APPROVAL", "ACTIVE", "SUSPENDED"]).optional(),
    roleId: zod_1.z.string().uuid().optional().or(zod_1.z.null()).optional(),
    hasBackupAccess: zod_1.z.boolean().optional(),
});
exports.ApproveUserSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    roleId: zod_1.z.string().uuid(),
});
exports.CreateRoleSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(30),
    permissions: zod_1.z.record(zod_1.z.array(zod_1.z.string())), // e.g. { "CRM": ["read", "write"] }
});
// --- NEW GENERAL ADMINISTRATION ZOD SCHEMAS ---
exports.CompanyProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(50).optional(),
    legalCompanyName: zod_1.z.string().optional().or(zod_1.z.literal("")),
    companyLogo: zod_1.z.string().optional().or(zod_1.z.literal("")),
    companyBanner: zod_1.z.string().optional().or(zod_1.z.literal("")),
    companyEmail: zod_1.z.string().email().optional().or(zod_1.z.literal("")),
    companyPhone: zod_1.z.string().optional().or(zod_1.z.literal("")),
    alternatePhone: zod_1.z.string().optional().or(zod_1.z.literal("")),
    website: zod_1.z.string().url().optional().or(zod_1.z.literal("")),
    industryType: zod_1.z.string().optional().or(zod_1.z.literal("")),
    businessType: zod_1.z.string().optional().or(zod_1.z.literal("")),
    companyDescription: zod_1.z.string().optional().or(zod_1.z.literal("")),
    // Tax Info
    gstin: zod_1.z.string().optional().or(zod_1.z.literal("")),
    pan: zod_1.z.string().optional().or(zod_1.z.literal("")),
    tan: zod_1.z.string().optional().or(zod_1.z.literal("")),
    vatNumber: zod_1.z.string().optional().or(zod_1.z.literal("")),
    cinNumber: zod_1.z.string().optional().or(zod_1.z.literal("")),
    msmeNumber: zod_1.z.string().optional().or(zod_1.z.literal("")),
    // Address
    country: zod_1.z.string().optional().or(zod_1.z.literal("")),
    state: zod_1.z.string().optional().or(zod_1.z.literal("")),
    city: zod_1.z.string().optional().or(zod_1.z.literal("")),
    pincode: zod_1.z.string().optional().or(zod_1.z.literal("")),
    addressLine1: zod_1.z.string().optional().or(zod_1.z.literal("")),
    addressLine2: zod_1.z.string().optional().or(zod_1.z.literal("")),
    landmark: zod_1.z.string().optional().or(zod_1.z.literal("")),
    // Business Details
    fiscalYearStart: zod_1.z.string().optional().or(zod_1.z.literal("")),
    fiscalYearEnd: zod_1.z.string().optional().or(zod_1.z.literal("")),
    currencyId: zod_1.z.string().optional().or(zod_1.z.literal("")),
    timezone: zod_1.z.string().optional().or(zod_1.z.literal("")),
    dateFormat: zod_1.z.string().optional().or(zod_1.z.literal("")),
    language: zod_1.z.string().optional().or(zod_1.z.literal("")),
    decimalPrecision: zod_1.z.number().int().min(0).max(4).optional().default(2),
    // Branding
    primaryColor: zod_1.z.string().optional().or(zod_1.z.literal("")),
    secondaryColor: zod_1.z.string().optional().or(zod_1.z.literal("")),
    dashboardTheme: zod_1.z.string().optional().default("dark"),
    favicon: zod_1.z.string().optional().or(zod_1.z.literal("")),
    invoiceTemplate: zod_1.z.string().optional().default("STANDARD"),
    // SMTP Settings
    smtpHost: zod_1.z.string().optional().or(zod_1.z.literal("")),
    smtpPort: zod_1.z.number().int().optional().or(zod_1.z.null()),
    smtpUser: zod_1.z.string().optional().or(zod_1.z.literal("")),
    smtpPassword: zod_1.z.string().optional().or(zod_1.z.literal("")),
    smtpSecure: zod_1.z.boolean().optional().default(false),
    smtpSender: zod_1.z.string().optional().or(zod_1.z.literal("")),
});
exports.TaxSettingSchema = zod_1.z.object({
    taxName: zod_1.z.string().min(2).max(50),
    taxCode: zod_1.z.string().min(2).max(12),
    taxPercentage: zod_1.z.number().min(0).max(100),
    taxType: zod_1.z.enum(["GST", "CGST", "SGST", "IGST", "VAT", "TDS"]),
    effectiveDate: zod_1.z.string(), // ISO date string
    taxStatus: zod_1.z.enum(["ACTIVE", "INACTIVE"]).optional().default("ACTIVE"),
    hsnSacCode: zod_1.z.string().optional().or(zod_1.z.literal("")),
    category: zod_1.z.string().optional().or(zod_1.z.literal("")),
    isReverseCharge: zod_1.z.boolean().optional().default(false),
    description: zod_1.z.string().optional().or(zod_1.z.literal("")),
});
exports.CurrencySchema = zod_1.z.object({
    currencyCode: zod_1.z.string().min(2).max(5),
    currencyName: zod_1.z.string().min(2).max(50),
    symbol: zod_1.z.string().min(1).max(5),
    decimalPlaces: zod_1.z.number().int().min(0).max(4).optional().default(2),
    exchangeRate: zod_1.z.number().positive(),
    activeStatus: zod_1.z.enum(["ACTIVE", "INACTIVE"]).optional().default("ACTIVE"),
    isBase: zod_1.z.boolean().optional().default(false),
});
exports.ApprovalWorkflowSchema = zod_1.z.object({
    workflowName: zod_1.z.string().min(2).max(100),
    module: zod_1.z.enum(["purchase", "expenses", "sales", "HR", "finance"]),
    conditions: zod_1.z.string().optional().or(zod_1.z.literal("")),
    minAmount: zod_1.z.number().nonnegative().optional(),
    maxAmount: zod_1.z.number().nonnegative().optional(),
    autoApprove: zod_1.z.boolean().optional().default(false),
    escalationTime: zod_1.z.number().int().positive().optional(),
    isActive: zod_1.z.boolean().optional().default(true),
    steps: zod_1.z.array(zod_1.z.object({
        approverRole: zod_1.z.string().optional(),
        approverRoleId: zod_1.z.string().optional(),
        approverUserId: zod_1.z.string().optional(),
        stepOrder: zod_1.z.number().int().default(1),
    })).min(1, "At least one approval step is required"),
});
exports.ApprovalRequestSchema = zod_1.z.object({
    workflowId: zod_1.z.string().uuid(),
    entityId: zod_1.z.string(),
    amount: zod_1.z.number().nonnegative().optional(),
});
exports.DashboardLayoutSchema = zod_1.z.object({
    layoutSettings: zod_1.z.string(),
});
exports.DepartmentSchema = zod_1.z.object({
    departmentCode: zod_1.z.string().min(2).max(12).toUpperCase(),
    departmentName: zod_1.z.string().min(2).max(100),
    managerId: zod_1.z.string().uuid().optional().or(zod_1.z.null()).or(zod_1.z.literal("")),
    parentDepartmentId: zod_1.z.string().uuid().optional().or(zod_1.z.null()).or(zod_1.z.literal("")),
});
//# sourceMappingURL=index.js.map