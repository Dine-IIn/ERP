"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateRoleSchema = exports.ApproveUserSchema = exports.UpdateCompanyUserSchema = exports.CreateCompanyAdminSchema = exports.UpdateCompanySchema = exports.CreateCompanySchema = exports.LoginSchema = exports.SignupSchema = void 0;
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
});
exports.UpdateCompanySchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(50).optional(),
    companyCode: zod_1.z.string().min(2).max(12).toUpperCase().optional(),
    createdAt: zod_1.z.string().optional(), // Can pass joining date string
    status: zod_1.z.enum(["ACTIVE", "SUSPENDED"]).optional(),
    features: zod_1.z.array(zod_1.z.string()).optional(), // List of custom active features
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
});
exports.ApproveUserSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    roleId: zod_1.z.string().uuid(),
});
exports.CreateRoleSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(30),
    permissions: zod_1.z.record(zod_1.z.array(zod_1.z.string())), // e.g. { "CRM": ["read", "write"] }
});
//# sourceMappingURL=index.js.map