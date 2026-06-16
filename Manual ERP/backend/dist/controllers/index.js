"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ioInstance = exports.HIERARCHICAL_FEATURES = void 0;
exports.setIoInstance = setIoInstance;
exports.requestSignupOTP = requestSignupOTP;
exports.signup = signup;
exports.login = login;
exports.logout = logout;
exports.createCompany = createCompany;
exports.updateCompany = updateCompany;
exports.listCompanyUsers = listCompanyUsers;
exports.createCompanyAdmin = createCompanyAdmin;
exports.updateCompanyUser = updateCompanyUser;
exports.deleteCompanyUser = deleteCompanyUser;
exports.listCompanies = listCompanies;
exports.listPendingSignups = listPendingSignups;
exports.approveSignup = approveSignup;
exports.createRole = createRole;
exports.getCompanyRolesAndUsers = getCompanyRolesAndUsers;
exports.listNotifications = listNotifications;
exports.markAsRead = markAsRead;
exports.registerPushToken = registerPushToken;
exports.updateSelfProfile = updateSelfProfile;
exports.requestForgotPasswordOTP = requestForgotPasswordOTP;
exports.resetPassword = resetPassword;
const db_1 = __importDefault(require("../services/db"));
const config_1 = require("../config");
const types_1 = require("../types");
const utils_1 = require("../utils");
exports.HIERARCHICAL_FEATURES = [
    { key: "GENERAL", name: "GENERAL CONFIGURATION", description: "General Chat & Expenses" },
    { key: "GENERAL_CHAT", name: "General Chat", description: "General Chat" },
    { key: "GENERAL_EXPENSE_CHAT", name: "Expense Chat", description: "Expense Chat" },
    { key: "NOTIFICATIONS", name: "NOTIFICATIONS & ALERTS", description: "Enable system alerts and logs" },
    { key: "NOTIFICATIONS_PUSH", name: "Push Notifications", description: "Receive real-time push events on devices" },
    { key: "NOTIFICATIONS_AUDIT", name: "System Audit Logs", description: "View secure administrative history trails" },
    { key: "ADMINISTRATION", name: "COMPANY ADMINISTRATION", description: "Manage profile, roles, users, departments, and backups" },
    { key: "ADMIN_PROFILE", name: "Company Profile Management", description: "Update tenant brandings, logos, and contacts" },
    { key: "ADMIN_ROLES", name: "Roles & Permissions Management", description: "Create and customize permissions for corporate roles" },
    { key: "ADMIN_AUDIT", name: "System Audit Logs", description: "Track secure historical action logs" },
    { key: "ADMIN_BACKUP", name: "Snapshots Backup & Restores", description: "Schedule and execute local tenant backups" },
    { key: "ADMIN_USERS", name: "Employee Users & Approvals", description: "Approve signups and manage employee profiles" },
    { key: "ADMIN_DEPARTMENTS", name: "Corporate Departments Settings", description: "Map structures and delegate managers" },
    { key: "MASTER_DATA", name: "MASTER DATA HUB", description: "Manage Employees, Customers, Vendors, Products, and Taxes profiles" },
    { key: "MASTER_EMPLOYEE", name: "Employee Master", description: "Manage hierarchies, timing shifts, and secure documents" },
    { key: "MASTER_CUSTOMER", name: "Customer Master", description: "Administer sales accounts, billing destinations, and credit ratings" },
    { key: "MASTER_VENDOR", name: "Vendor / Supplier Master", description: "Handle supply registers, GST details, bank parameters, and payments" },
    { key: "MASTER_PRODUCT", name: "Product / Item Master", description: "Configure inventory catalog, variants, pricing, and HSN codes" },
    { key: "MASTER_TAX", name: "Tax Master", description: "Configure corporate sales tax rates, GSTIN brackets, and VAT schemes" },
    { key: "SALES_DATA", name: "SALES MANAGEMENT", description: "Consolidated Sales, Invoicing, Quotation, Maintenance and Dispatching Hub" },
    { key: "SALES_ORDER", name: "Sales Orders Hub", description: "Manage customer orders, quantities, expected delivery dates and discounts" },
    { key: "SALES_PROFORMA", name: "Proforma Invoices", description: "Generate, edit, download and email proforma invoices" },
    { key: "SALES_INVOICE", name: "Sales Invoices", description: "Manage sales invoices, track collections, and email customers" },
    { key: "SALES_CHALLAN", name: "Delivery Challans", description: "Generate transit challans and declarations" },
    { key: "SALES_DISPATCH", name: "Dispatch Management", description: "Coordinate shipments, carrier tracking and vehicles details" },
    { key: "SALES_QUOTATION", name: "Sales Quotations", description: "Generate, edit, and dispatch legal price quotations" },
    { key: "SALES_POST_SERVICE", name: "Post-Sales Service & Maintenance", description: "Coordinate warranty claims, maintenance logs, and service sheets" },
    { key: "SALES_PDF_EDITOR", name: "PDF Print Studio", description: "Configure custom print layouts, logos, headers, colors, and terms for documents" },
    { key: "CRM_DATA", name: "CRM PORTAL", description: "Customer Relationship Management portal" },
    { key: "CRM_LEAD", name: "CRM Leads Hub", description: "Capture, log, track, and assign sales leads" },
    { key: "CRM_OPPORTUNITY", name: "CRM Opportunities Pipeline", description: "Administer potential deal pipelines and conversion projections" },
    { key: "CRM_FOLLOWUP", name: "CRM Follow-ups Scheduler", description: "Log and schedule phone calls, emails, and meetings with clients" },
    { key: "CRM_DASHBOARD", name: "CRM Analytics Dashboard", description: "Visualize lead pipelines, conversion rates, and revenue projections" },
    { key: "PURCHASE_DATA", name: "PURCHASE MANAGEMENT", description: "Consolidated Vendor Sourcing & Purchase Operations Hub" },
    { key: "PURCHASE_ORDER", name: "Purchase Orders Hub", description: "Generate purchase orders and dispatch requests to vendors" },
    { key: "PURCHASE_VENDOR_QUOTE", name: "Vendor Quotations", description: "Capture, evaluate, and choose price quotes submitted by suppliers" },
    { key: "PURCHASE_GRN", name: "Goods Receipt Notes (GRN)", description: "Record gate entries, check material volumes, and register inward packages" },
    { key: "PURCHASE_RETURN", name: "Purchase Returns (Debit Notes)", description: "Generate debit notes and dispatch returns of defected goods" },
    { key: "PURCHASE_PAYMENT", name: "Vendor Payments Hub", description: "Manage bank transfer payments, transaction receipts, and outstanding dues" },
    { key: "INVENTORY_DATA", name: "INVENTORY MANAGEMENT", description: "Consolidated Realtime Warehousing & Inventory Control" },
    { key: "INVENTORY_PRODUCT", name: "Warehouse Stock Levels", description: "Conduct manual stock audits, warehouse taggings, and storage logs" },
    { key: "INVENTORY_STOCK_OVERVIEW", name: "Stock Ledger Overview", description: "View transaction ledgers tracking inward POs and outward SOs" },
    { key: "INVENTORY_LOW_ALERT", name: "Low Stock Alerts Console", description: "Monitor automatically flagged items dropping below minimum reorder thresholds" },
    { key: "INVENTORY_FORECASTING", name: "AI Demand Forecasting", description: "Predict product demand, track replenishment times, and optimize levels" },
    // HRMS MODULE
    { key: "HRMS_DATA", name: "HRMS MODULE", description: "Human Resource Management System" },
    { key: "HRMS_EMPLOYEES", name: "Employees Directory", description: "Manage company employees directory, shifts, departments and structures" },
    { key: "HRMS_ATTENDANCE", name: "Attendance & Punch logs", description: "Punch checks-in/out and worked hour records" },
    { key: "HRMS_LEAVES", name: "Leave Management Review", description: "Review, request, and decide leaves allocations" },
    { key: "HRMS_SHIFTS", name: "Corporate Timing Shifts", description: "Set shift times, durations, and grace limits" },
    { key: "HRMS_PAYROLL", name: "Basic Payroll disbursement", description: "Compile salary sheets and disbursements slip" },
    // FINANCE & ACCOUNTING MODULE
    { key: "FINANCE_DATA", name: "FINANCE & ACCOUNTING", description: "Corporate Expenses, Payments, Receipts, and double-entry Cashbook Ledger" },
    { key: "FINANCE_EXPENSES", name: "Central Expense Book", description: "Record and categorize corporate expense vouchers" },
    { key: "FINANCE_PAYMENTS", name: "Vendor Payments ledger", description: "Finalize outward vendor cash transactions" },
    { key: "FINANCE_RECEIPTS", name: "Revenue Receipts ledger", description: "Log customer incoming incomes and receipts" },
    { key: "FINANCE_CASHBOOK", name: "Double-Entry Cashbook vouchers", description: "Monitor running dual balances cashbook" },
    { key: "FINANCE_GST", name: "GST Tax Configurations", description: "Review and file corporate sales & purchases taxes" },
    { key: "FINANCE_BANK", name: "Company Bank Accounts directory", description: "Manage bank deposits, accounts, and reconciliations" },
    // REPORTS & ANALYTICS MODULE
    { key: "REPORTS_DATA", name: "REPORTS & ANALYTICS", description: "Multi-dimensional reports: Sales, Purchases, Stocks, HR levels and Savings statements" },
    { key: "REPORTS_SALES", name: "Sales Analytical summary", description: "Review monthly sales volumes and invoice counts" },
    { key: "REPORTS_PURCHASE", name: "Purchase Sourcing summary", description: "Examine PO ratios and complete expenses" },
    { key: "REPORTS_INVENTORY", name: "Warehouse asset valuations", description: "Audit stock evaluations and catalog sizes" },
    { key: "REPORTS_HR", name: "HR Metrics totals", description: "Review work durations and disbursed salaries" },
    { key: "REPORTS_FINANCE", name: "Financial Cashflows curves", description: "Examine inflows vs outflows and running curves" },
    // MANUFACTURING MODULE
    { key: "MANUFACTURING", name: "MANUFACTURING OPERATIONS", description: "Factory Operations & Manufacturing Module" },
    { key: "MANUFACTURING_BOM", name: "BOM & Bill of Materials", description: "Configure product formulas, components lists, and pricing" },
    { key: "MANUFACTURING_PLAN", name: "Production Planning & MRP", description: "Schedule factory production runs and compute material deficits" },
    { key: "MANUFACTURING_WORK_ORDER", name: "Work Orders & Job Cards", description: "Dispatch assembly instructions and track operator logs" },
    { key: "MANUFACTURING_PRODUCTION", name: "Production & Material Consumption", description: "Log output quantities and raw material issues" },
    { key: "MANUFACTURING_QC", name: "Quality Control & Reworks", description: "Inspect manufactured batches and reject defects" },
    { key: "MANUFACTURING_SHOP_FLOOR", name: "Shop Floor Work Centers", description: "Manage assembly stations, capacities, and factory rosters" },
    { key: "MANUFACTURING_REPORTS", name: "Production Reports", description: "Examine monthly production outputs and analytics" },
    { key: "MANUFACTURING_COSTING", name: "Production Cost Analysis", description: "Track overhead allocation and item cost deviations" }
];
// Global reference to the WebSockets emitter
exports.ioInstance = null;
function setIoInstance(io) {
    exports.ioInstance = io;
}
// Socket Realtime Alert Helper
function triggerRealtimeAlert(userId, notification) {
    if (exports.ioInstance) {
        exports.ioInstance.to(userId).emit('notification', notification);
        console.log(`📡 [WebSocket] Sent real-time alert to user ${userId}: "${notification.title}"`);
    }
}
// ==========================================
// 1. PUBLIC AUTH CONTROLLERS
// ==========================================
async function requestSignupOTP(req, res) {
    try {
        const { target, mobileNo, email, companyCode } = req.body;
        const finalTarget = target || mobileNo || email;
        if (!finalTarget) {
            return res.status(400).json({ error: "Mobile number or Email address is required to send OTP" });
        }
        const isEmail = finalTarget.includes('@');
        if (isEmail) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(finalTarget)) {
                return res.status(400).json({ error: "Invalid email format" });
            }
        }
        else {
            if (!/^\+?[1-9]\d{9,14}$/.test(finalTarget)) {
                return res.status(400).json({ error: "Invalid mobile number format" });
            }
        }
        const code = await (0, utils_1.sendSimulatedOTP)(finalTarget, companyCode);
        return res.json({
            message: `Real-time verification OTP sent successfully via ${isEmail ? 'Email' : 'SMS'}!`,
            otpCode: process.env.NODE_ENV !== 'production' ? code : undefined
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
async function signup(req, res) {
    try {
        const parsed = types_1.SignupSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues[0].message });
        }
        const { companyCode, username, password, mobileNo, email, otpCode, otpTarget } = req.body;
        // Verify OTP
        if (!otpCode) {
            return res.status(400).json({ error: "OTP code is required for verification" });
        }
        const targetToVerify = otpTarget || mobileNo;
        if (!targetToVerify) {
            return res.status(400).json({ error: "Verification target is required" });
        }
        const isEmailTarget = targetToVerify.includes('@');
        if (isEmailTarget) {
            if (!email || email.toLowerCase().trim() !== targetToVerify.toLowerCase().trim()) {
                return res.status(400).json({ error: "Verified email does not match the registration email" });
            }
        }
        else {
            if (mobileNo.trim() !== targetToVerify.trim()) {
                return res.status(400).json({ error: "Verified mobile number does not match the registration mobile number" });
            }
        }
        const isOtpValid = await (0, utils_1.verifySimulatedOTP)(targetToVerify, otpCode);
        if (!isOtpValid) {
            return res.status(400).json({ error: "Invalid or expired OTP code" });
        }
        // Check if company exists
        const company = await db_1.default.company.findUnique({
            where: { companyCode: companyCode.toUpperCase() }
        });
        if (!company) {
            return res.status(404).json({ error: `Company with code '${companyCode}' does not exist.` });
        }
        // Check if username already exists in this company
        const existingUser = await db_1.default.user.findFirst({
            where: {
                companyId: company.id,
                username
            }
        });
        if (existingUser) {
            return res.status(409).json({ error: `Username '${username}' is already taken in this company.` });
        }
        // Check if mobile number is already registered
        const existingMobile = await db_1.default.user.findUnique({
            where: { mobileNo }
        });
        if (existingMobile) {
            return res.status(409).json({ error: "Mobile number is already registered to another user." });
        }
        // Hash password & create user
        const passwordHash = await (0, utils_1.hashPassword)(password);
        const user = await db_1.default.user.create({
            data: {
                companyId: company.id,
                username,
                passwordHash,
                mobileNo,
                email: email || null,
                status: "PENDING_APPROVAL" // Needs Admin Approval!
            }
        });
        // Notify Company Admin about the new signup
        const companyAdmins = await db_1.default.user.findMany({
            where: {
                companyId: company.id,
                role: { name: "Admin" }
            }
        });
        for (const admin of companyAdmins) {
            const dbNotification = await db_1.default.notification.create({
                data: {
                    userId: admin.id,
                    title: "New Signup Awaiting Approval",
                    message: `User '${username}' has signed up and is waiting for your approval.`,
                    category: "system",
                    channels: "in_app"
                }
            });
            triggerRealtimeAlert(admin.id, dbNotification);
        }
        return res.status(201).json({
            message: "Signup successful! Please wait for your company admin's approval.",
            user: { id: user.id, username: user.username, status: user.status }
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
async function login(req, res) {
    try {
        const parsed = types_1.LoginSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues[0].message });
        }
        const { companyCode, username, password } = req.body;
        // Check if user is trying to log in as Super Admin
        if (companyCode.toUpperCase() === "SUPERADMIN" && username.toLowerCase() === "superadmin") {
            // For local demo, we have a default static SuperAdmin account
            const superAdminPass = "superadmin123";
            if (password !== superAdminPass) {
                return res.status(401).json({ error: "Invalid credentials" });
            }
            const token = (0, utils_1.generateToken)({
                userId: "superadmin-static-id",
                username: "superadmin",
                companyId: "superadmin-company",
                companyCode: "SUPERADMIN",
                role: "SuperAdmin",
                isSuperAdmin: true
            });
            return res.json({
                message: "Logged in as Super Admin successfully",
                token,
                user: { username: "superadmin", role: "SuperAdmin", isSuperAdmin: true }
            });
        }
        // Check Company
        const company = await db_1.default.company.findUnique({
            where: { companyCode: companyCode.toUpperCase() }
        });
        if (!company) {
            return res.status(404).json({ error: "Company code does not exist" });
        }
        if (company.status !== "ACTIVE") {
            return res.status(403).json({ error: "Company account has been suspended" });
        }
        // Find User
        const user = await db_1.default.user.findFirst({
            where: {
                companyId: company.id,
                username
            },
            include: { role: true }
        });
        if (!user) {
            return res.status(401).json({ error: "Invalid username or password" });
        }
        // Validate Password
        const isPassValid = await (0, utils_1.comparePassword)(password, user.passwordHash);
        if (!isPassValid) {
            return res.status(401).json({ error: "Invalid username or password" });
        }
        // Validate User Status
        if (user.status === "PENDING_APPROVAL") {
            return res.status(403).json({ error: "Your account is pending administrator approval." });
        }
        if (user.status === "SUSPENDED") {
            return res.status(403).json({ error: "Your user account has been suspended by the administrator." });
        }
        // --- CONCURRENT SESSION CONTROLS ---
        const { deviceType, deviceModel, force } = req.body;
        const finalDeviceType = (deviceType === 'MOBILE' || deviceType === 'DESKTOP') ? deviceType : 'DESKTOP';
        // Clean up stale, inactive desktop sessions first (desktop sessions inactive for > 15 minutes)
        if (finalDeviceType === 'DESKTOP') {
            const INACTIVITY_TIMEOUT = 15 * 60 * 1000;
            const staleCutoff = new Date(Date.now() - INACTIVITY_TIMEOUT);
            await db_1.default.userSession.deleteMany({
                where: {
                    userId: user.id,
                    deviceType: 'DESKTOP',
                    lastActiveAt: { lt: staleCutoff }
                }
            });
        }
        // Check if there is an active session for the same device type
        const activeSessions = await db_1.default.userSession.findMany({
            where: {
                userId: user.id,
                deviceType: finalDeviceType
            }
        });
        if (activeSessions.length > 0 && force !== true) {
            const otherDeviceModel = activeSessions[0].deviceModel || "Unknown Device";
            return res.status(409).json({
                error: `Active session already exists on another ${finalDeviceType.toLowerCase()} device (${otherDeviceModel}).`,
                sessionConflict: true,
                deviceType: finalDeviceType,
                deviceModel: otherDeviceModel
            });
        }
        // If force is true or no active sessions exist, terminate previous sessions of this device type
        if (activeSessions.length > 0) {
            await db_1.default.userSession.deleteMany({
                where: {
                    userId: user.id,
                    deviceType: finalDeviceType
                }
            });
        }
        const token = (0, utils_1.generateToken)({
            userId: user.id,
            username: user.username,
            companyId: company.id,
            companyCode: company.companyCode,
            role: user.role?.name || null,
            isSuperAdmin: false
        });
        // Create a new session in database
        const sessionDuration = finalDeviceType === 'MOBILE'
            ? 30 * 24 * 60 * 60 * 1000 // 30 days for mobile devices
            : 24 * 60 * 60 * 1000; // 24 hours for desktop laptops
        await db_1.default.userSession.create({
            data: {
                userId: user.id,
                deviceType: finalDeviceType,
                deviceModel: deviceModel || (finalDeviceType === 'DESKTOP' ? 'Desktop Browser' : 'Mobile App'),
                token,
                expiresAt: new Date(Date.now() + sessionDuration)
            }
        });
        return res.json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                username: user.username,
                companyCode: company.companyCode,
                companyName: company.name,
                role: user.role?.name || null,
                isSuperAdmin: false,
                hasBackupAccess: user.hasBackupAccess,
                backupAccess: company.backupAccess,
                email: user.email,
                mobileNo: user.mobileNo,
                currencyId: company.currencyId || 'USD'
            }
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
async function logout(req, res) {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
            await db_1.default.userSession.deleteMany({
                where: { token }
            });
        }
        return res.json({ message: "Logged out successfully" });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
// ==========================================
// 2. SUPER ADMIN CONTROLLERS
// ==========================================
async function createCompany(req, res) {
    try {
        const parsed = types_1.CreateCompanySchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues[0].message });
        }
        const { companyCode, name, subscriptionTier, features, adminUsername, adminMobile, adminPassword } = req.body;
        // Check if company code already exists
        const existingCompany = await db_1.default.company.findUnique({
            where: { companyCode: companyCode.toUpperCase() }
        });
        if (existingCompany) {
            return res.status(409).json({ error: `Company Code '${companyCode}' already exists.` });
        }
        // Validate license in Central Services
        try {
            const centralUrl = config_1.config.centralUrl;
            console.log(`📡 [License Enforcement] Validating license for code: ${companyCode} via Central Services at ${centralUrl}`);
            const fetchResponse = await fetch(`${centralUrl}/admin/licenses`, {
                headers: {
                    'X-Central-Admin-Secret': config_1.config.centralAdminSecret
                }
            });
            if (!fetchResponse.ok) {
                throw new Error(`Central Services returned status ${fetchResponse.status}`);
            }
            const licenses = await fetchResponse.json();
            const lic = licenses.find((l) => (l.companyCode || '').toUpperCase() === companyCode.toUpperCase());
            if (!lic) {
                return res.status(400).json({ error: `No active license key registered for company code '${companyCode}'. Please issue a license in Central Services first.` });
            }
            if (lic.status !== 'ACTIVE') {
                return res.status(400).json({ error: `The license key for '${companyCode}' is expired or inactive.` });
            }
            console.log(`🟢 [License Enforcement] Valid license verified for code: ${companyCode}`);
        }
        catch (error) {
            console.error(`🔴 [License Enforcement Error] Central Services validation failed:`, error);
            return res.status(502).json({ error: `License verification failed: Central Services communication error (${error.message})` });
        }
        // Check if admin mobile already registered
        const existingMobile = await db_1.default.user.findUnique({
            where: { mobileNo: adminMobile }
        });
        if (existingMobile) {
            return res.status(409).json({ error: "Admin mobile number already in use." });
        }
        // Create Company
        const company = await db_1.default.company.create({
            data: {
                companyCode: companyCode.toUpperCase(),
                name,
                subscriptionTier,
                status: "ACTIVE"
            }
        });
        // Generate active subscription features
        const defaultFeatures = exports.HIERARCHICAL_FEATURES.map(f => f.key);
        let activeFeatureKeys = ["NOTIFICATIONS", "NOTIFICATIONS_PUSH", "NOTIFICATIONS_AUDIT"];
        if (features && Array.isArray(features)) {
            activeFeatureKeys = features.map((f) => f.toUpperCase());
        }
        else {
            if (subscriptionTier === "BASIC") {
                activeFeatureKeys.push("CRM", "CRM_LEADS", "CRM_CUSTOMER");
            }
            else if (subscriptionTier === "PREMIUM") {
                activeFeatureKeys.push("CRM", "CRM_LEADS", "CRM_CUSTOMER", "HR", "HR_ROSTER", "HR_ATTENDANCE");
            }
            else {
                activeFeatureKeys = [...defaultFeatures];
            }
        }
        if (!activeFeatureKeys.includes("NOTIFICATIONS")) {
            activeFeatureKeys.push("NOTIFICATIONS");
        }
        // Ensure all hierarchical features exist in the DB, then map them
        for (const item of exports.HIERARCHICAL_FEATURES) {
            await db_1.default.feature.upsert({
                where: { key: item.key },
                update: { name: item.name, description: item.description },
                create: { key: item.key, name: item.name, description: item.description }
            });
        }
        const dbFeatures = await db_1.default.feature.findMany({
            where: { key: { in: activeFeatureKeys } }
        });
        for (const f of dbFeatures) {
            await db_1.default.companyFeature.create({
                data: {
                    companyId: company.id,
                    featureId: f.id
                }
            });
        }
        // Create default "Admin" role for the company
        const adminRole = await db_1.default.role.create({
            data: {
                companyId: company.id,
                name: "Admin",
                permissions: JSON.stringify({
                    CRM: ["read", "write", "delete"],
                    HR: ["read", "write", "delete"],
                    FINANCE: ["read", "write", "delete"],
                    NOTIFICATIONS: ["read", "write", "delete"],
                    MANUFACTURING: ["read", "write", "delete"]
                })
            }
        });
        // Create the Company Admin User (Bypasses approvals!)
        const adminHash = await (0, utils_1.hashPassword)(adminPassword);
        const adminUser = await db_1.default.user.create({
            data: {
                companyId: company.id,
                username: adminUsername,
                passwordHash: adminHash,
                mobileNo: adminMobile,
                status: "ACTIVE", // Auto active!
                roleId: adminRole.id
            }
        });
        return res.status(201).json({
            message: `Company '${name}' created successfully with code '${companyCode}'.`,
            company,
            adminUser: { id: adminUser.id, username: adminUser.username, status: adminUser.status }
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
async function updateCompany(req, res) {
    try {
        const { id } = req.params;
        const parsed = types_1.UpdateCompanySchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues[0].message });
        }
        const { name, companyCode, createdAt, status, features, fileSizeLimit, backupAccess, backupRetentionDays } = req.body;
        const company = await db_1.default.company.findUnique({
            where: { id }
        });
        if (!company) {
            return res.status(404).json({ error: "Company not found" });
        }
        if (companyCode && companyCode.toUpperCase() !== company.companyCode) {
            const existing = await db_1.default.company.findUnique({
                where: { companyCode: companyCode.toUpperCase() }
            });
            if (existing) {
                return res.status(409).json({ error: `Company Code '${companyCode}' already exists.` });
            }
        }
        const updatedData = {
            ...(name && { name }),
            ...(companyCode && { companyCode: companyCode.toUpperCase() }),
            ...(status && { status }),
            ...(fileSizeLimit !== undefined && { fileSizeLimit: Number(fileSizeLimit) }),
            ...(backupAccess !== undefined && { backupAccess: Boolean(backupAccess) }),
            ...(backupRetentionDays !== undefined && { backupRetentionDays: Number(backupRetentionDays) })
        };
        if (createdAt) {
            const date = new Date(createdAt);
            if (!isNaN(date.getTime())) {
                updatedData.createdAt = date;
            }
            else {
                return res.status(400).json({ error: "Invalid joining date format" });
            }
        }
        const updatedCompany = await db_1.default.company.update({
            where: { id },
            data: updatedData
        });
        if (features && Array.isArray(features)) {
            await db_1.default.companyFeature.deleteMany({
                where: { companyId: id }
            });
            const activeFeatureKeys = [...features];
            if (!activeFeatureKeys.includes("NOTIFICATIONS")) {
                activeFeatureKeys.push("NOTIFICATIONS");
            }
            for (const item of exports.HIERARCHICAL_FEATURES) {
                await db_1.default.feature.upsert({
                    where: { key: item.key },
                    update: { name: item.name, description: item.description },
                    create: { key: item.key, name: item.name, description: item.description }
                });
            }
            const dbFeatures = await db_1.default.feature.findMany({
                where: { key: { in: activeFeatureKeys } }
            });
            for (const f of dbFeatures) {
                await db_1.default.companyFeature.create({
                    data: {
                        companyId: id,
                        featureId: f.id
                    }
                });
            }
        }
        return res.json({
            message: `Company '${updatedCompany.name}' updated successfully.`,
            company: updatedCompany
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
async function listCompanyUsers(req, res) {
    try {
        const { id } = req.params;
        const company = await db_1.default.company.findUnique({
            where: { id }
        });
        if (!company) {
            return res.status(404).json({ error: "Company not found" });
        }
        const users = await db_1.default.user.findMany({
            where: { companyId: id },
            select: {
                id: true,
                username: true,
                mobileNo: true,
                email: true,
                status: true,
                roleId: true,
                createdAt: true,
                role: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        const sanitized = users.map(u => ({
            id: u.id,
            username: u.username,
            mobileNo: u.mobileNo,
            email: u.email,
            status: u.status,
            role: u.role?.name || null,
            roleId: u.roleId,
            createdAt: u.createdAt
        }));
        return res.json({ users: sanitized });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
async function createCompanyAdmin(req, res) {
    try {
        const { id } = req.params;
        const parsed = types_1.CreateCompanyAdminSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues[0].message });
        }
        const { username, mobileNo, password, email } = req.body;
        const company = await db_1.default.company.findUnique({
            where: { id }
        });
        if (!company) {
            return res.status(404).json({ error: "Company not found" });
        }
        const existingUser = await db_1.default.user.findFirst({
            where: { companyId: id, username }
        });
        if (existingUser) {
            return res.status(409).json({ error: `Username '${username}' is already taken in this company.` });
        }
        const existingMobile = await db_1.default.user.findUnique({
            where: { mobileNo }
        });
        if (existingMobile) {
            return res.status(409).json({ error: "Mobile number is already registered to another user." });
        }
        let adminRole = await db_1.default.role.findFirst({
            where: { companyId: id, name: "Admin" }
        });
        if (!adminRole) {
            adminRole = await db_1.default.role.create({
                data: {
                    companyId: id,
                    name: "Admin",
                    permissions: JSON.stringify({
                        CRM: ["read", "write", "delete"],
                        HR: ["read", "write", "delete"],
                        FINANCE: ["read", "write", "delete"],
                        NOTIFICATIONS: ["read", "write", "delete"]
                    })
                }
            });
        }
        const passwordHash = await (0, utils_1.hashPassword)(password);
        const adminUser = await db_1.default.user.create({
            data: {
                companyId: id,
                username,
                passwordHash,
                mobileNo,
                email: email || null,
                status: "ACTIVE",
                roleId: adminRole.id
            }
        });
        return res.status(201).json({
            message: `Admin user '${username}' created successfully for company '${company.name}'.`,
            user: { id: adminUser.id, username: adminUser.username, status: adminUser.status }
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
async function updateCompanyUser(req, res) {
    try {
        const { id, userId } = req.params;
        const parsed = types_1.UpdateCompanyUserSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues[0].message });
        }
        const { username, mobileNo, password, email, status, roleId } = req.body;
        const user = await db_1.default.user.findFirst({
            where: { id: userId, companyId: id }
        });
        if (!user) {
            return res.status(404).json({ error: "User not found in this company." });
        }
        if (username && username !== user.username) {
            const existingUser = await db_1.default.user.findFirst({
                where: { companyId: id, username }
            });
            if (existingUser) {
                return res.status(409).json({ error: `Username '${username}' is already taken in this company.` });
            }
        }
        if (mobileNo && mobileNo !== user.mobileNo) {
            const existingMobile = await db_1.default.user.findUnique({
                where: { mobileNo }
            });
            if (existingMobile) {
                return res.status(409).json({ error: "Mobile number is already registered to another user." });
            }
        }
        if (roleId) {
            const role = await db_1.default.role.findFirst({
                where: { id: roleId, companyId: id }
            });
            if (!role) {
                return res.status(404).json({ error: "Assigned role not found in this company." });
            }
        }
        const updatedData = {
            ...(username && { username }),
            ...(mobileNo && { mobileNo }),
            ...(email !== undefined && { email: email || null }),
            ...(status && { status }),
            ...(roleId !== undefined && { roleId })
        };
        if (password) {
            updatedData.passwordHash = await (0, utils_1.hashPassword)(password);
        }
        const updatedUser = await db_1.default.user.update({
            where: { id: userId },
            data: updatedData
        });
        return res.json({
            message: `User '${updatedUser.username}' updated successfully.`,
            user: { id: updatedUser.id, username: updatedUser.username, status: updatedUser.status }
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
async function deleteCompanyUser(req, res) {
    try {
        const { id, userId } = req.params;
        const user = await db_1.default.user.findFirst({
            where: { id: userId, companyId: id }
        });
        if (!user) {
            return res.status(404).json({ error: "User not found in this company." });
        }
        await db_1.default.user.delete({
            where: { id: userId }
        });
        return res.json({ message: `User '${user.username}' deleted successfully.` });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
async function listCompanies(req, res) {
    try {
        const companies = await db_1.default.company.findMany({
            include: {
                features: { include: { feature: true } },
                _count: { select: { users: true } }
            }
        });
        return res.json({ companies });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
// ==========================================
// 3. COMPANY ADMIN CONTROLLERS
// ==========================================
async function listPendingSignups(req, res) {
    try {
        const companyId = req.user?.companyId;
        const pendingUsers = await db_1.default.user.findMany({
            where: {
                companyId,
                status: "PENDING_APPROVAL"
            },
            select: {
                id: true,
                username: true,
                mobileNo: true,
                email: true,
                createdAt: true
            }
        });
        return res.json({ pendingUsers });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
async function approveSignup(req, res) {
    try {
        const parsed = types_1.ApproveUserSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues[0].message });
        }
        const { userId, roleId } = req.body;
        const companyId = req.user?.companyId;
        // Verify user belongs to admin's company
        const userToApprove = await db_1.default.user.findFirst({
            where: { id: userId, companyId }
        });
        if (!userToApprove) {
            return res.status(404).json({ error: "Pending user not found within your company" });
        }
        // Verify role belongs to company
        const role = await db_1.default.role.findFirst({
            where: { id: roleId, companyId }
        });
        if (!role) {
            return res.status(404).json({ error: "Assigned role not found within your company" });
        }
        // Approve user and set role
        const approvedUser = await db_1.default.user.update({
            where: { id: userId },
            data: {
                status: "ACTIVE",
                roleId: role.id
            }
        });
        // Send notification log to approved user
        const dbNotification = await db_1.default.notification.create({
            data: {
                userId,
                title: "Account Approved",
                message: `Welcome to the system! Your account has been approved by the Admin and you are assigned the '${role.name}' role.`,
                category: "system",
                channels: "in_app"
            }
        });
        triggerRealtimeAlert(userId, dbNotification);
        return res.json({
            message: `User '${userToApprove.username}' approved successfully as '${role.name}'.`,
            user: { id: approvedUser.id, username: approvedUser.username, status: approvedUser.status }
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
async function createRole(req, res) {
    try {
        const parsed = types_1.CreateRoleSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues[0].message });
        }
        const { name, permissions } = req.body;
        const companyId = req.user?.companyId;
        // Check if role name already exists in the company
        const existingRole = await db_1.default.role.findFirst({
            where: { companyId, name }
        });
        if (existingRole) {
            return res.status(409).json({ error: `Role with name '${name}' already exists in your company.` });
        }
        const role = await db_1.default.role.create({
            data: {
                companyId,
                name,
                permissions: JSON.stringify(permissions)
            }
        });
        return res.status(201).json({
            message: `Role '${name}' created successfully.`,
            role: { id: role.id, name: role.name, permissions }
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
async function getCompanyRolesAndUsers(req, res) {
    try {
        const companyId = req.user?.companyId;
        const roles = await db_1.default.role.findMany({
            where: { companyId }
        });
        const parsedRoles = roles.map(r => ({
            ...r,
            permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions
        }));
        const users = await db_1.default.user.findMany({
            where: { companyId },
            include: { role: true },
            orderBy: { createdAt: 'desc' }
        });
        const sanitizedUsers = users.map(u => ({
            id: u.id,
            username: u.username,
            mobileNo: u.mobileNo,
            email: u.email,
            status: u.status,
            role: u.role?.name || null,
            createdAt: u.createdAt,
            hasBackupAccess: u.hasBackupAccess
        }));
        // Fetch active subscription features
        const activeFeatures = await db_1.default.companyFeature.findMany({
            where: { companyId },
            include: { feature: true }
        });
        return res.json({
            roles: parsedRoles,
            users: sanitizedUsers,
            features: activeFeatures.map(af => af.feature.key)
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
// ==========================================
// 4. NOTIFICATION CONTROLLERS
// ==========================================
async function listNotifications(req, res) {
    try {
        const userId = req.user?.userId;
        const notifications = await db_1.default.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        return res.json({ notifications });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
async function markAsRead(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const notification = await db_1.default.notification.findFirst({
            where: { id, userId }
        });
        if (!notification) {
            return res.status(404).json({ error: "Notification not found" });
        }
        await db_1.default.notification.update({
            where: { id },
            data: { isRead: true }
        });
        return res.json({ message: "Notification marked as read successfully" });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
async function registerPushToken(req, res) {
    try {
        const { deviceToken, platform } = req.body;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized: User ID missing" });
        }
        if (!deviceToken || !platform) {
            return res.status(400).json({ error: "deviceToken and platform are required" });
        }
        await db_1.default.pushToken.upsert({
            where: { deviceToken },
            update: { userId, platform },
            create: { userId, deviceToken, platform }
        });
        return res.json({ message: "Push token registered successfully" });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
// Export all General Administration Controllers
__exportStar(require("./admin"), exports);
__exportStar(require("./central_admin"), exports);
// ==========================================
// 5. USER PROFILE & PASSWORD RESET CONTROLLERS
// ==========================================
async function updateSelfProfile(req, res) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized: User ID missing" });
        }
        const { email, mobileNo, password } = req.body;
        // Check if user exists
        const user = await db_1.default.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        const updatedData = {};
        // Validate and check uniqueness of mobile number if provided
        if (mobileNo && mobileNo !== user.mobileNo) {
            if (!/^\+?[1-9]\d{9,14}$/.test(mobileNo)) {
                return res.status(400).json({ error: "Invalid mobile number format" });
            }
            const existingMobile = await db_1.default.user.findFirst({
                where: {
                    mobileNo,
                    id: { not: userId }
                }
            });
            if (existingMobile) {
                return res.status(409).json({ error: "Mobile number is already registered to another user." });
            }
            updatedData.mobileNo = mobileNo;
        }
        // Validate email format if provided
        if (email !== undefined) {
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return res.status(400).json({ error: "Invalid email format" });
            }
            updatedData.email = email || null;
        }
        // Hash password if provided
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ error: "Password must be at least 6 characters long" });
            }
            updatedData.passwordHash = await (0, utils_1.hashPassword)(password);
        }
        // Perform database update
        const updatedUser = await db_1.default.user.update({
            where: { id: userId },
            data: updatedData
        });
        return res.json({
            message: "Profile updated successfully",
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                email: updatedUser.email,
                mobileNo: updatedUser.mobileNo,
                status: updatedUser.status
            }
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
async function requestForgotPasswordOTP(req, res) {
    try {
        const { companyCode, username, emailOrPhone } = req.body;
        if (!companyCode || !username || !emailOrPhone) {
            return res.status(400).json({ error: "Company Code, Username, and Email/Phone are required" });
        }
        // Find Company
        const company = await db_1.default.company.findUnique({
            where: { companyCode: companyCode.toUpperCase() }
        });
        if (!company) {
            return res.status(404).json({ error: "Company code does not exist" });
        }
        // Find User
        const user = await db_1.default.user.findFirst({
            where: {
                companyId: company.id,
                username
            }
        });
        if (!user) {
            return res.status(404).json({ error: "Username not found in the selected company" });
        }
        // Check if user is suspended
        if (user.status === "SUSPENDED") {
            return res.status(403).json({ error: "Your user account has been suspended" });
        }
        // Verify email or phone matches registered user details
        const matchedEmail = user.email && user.email.toLowerCase().trim() === emailOrPhone.toLowerCase().trim();
        const matchedPhone = user.mobileNo.trim() === emailOrPhone.trim();
        if (!matchedEmail && !matchedPhone) {
            return res.status(400).json({ error: "The provided email or mobile number does not match our records." });
        }
        // Send real OTP to emailOrPhone
        const code = await (0, utils_1.sendSimulatedOTP)(emailOrPhone, companyCode);
        return res.json({
            message: `Real-time verification OTP code sent to your registered ${matchedEmail ? 'email' : 'mobile number'} successfully!`,
            otpCode: process.env.NODE_ENV !== 'production' ? code : undefined
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
async function resetPassword(req, res) {
    try {
        const { companyCode, username, emailOrPhone, newPassword, otpCode } = req.body;
        if (!companyCode || !username || !emailOrPhone || !newPassword || !otpCode) {
            return res.status(400).json({ error: "All fields, including the OTP code, are required to reset your password" });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: "New password must be at least 6 characters long" });
        }
        // Find Company
        const company = await db_1.default.company.findUnique({
            where: { companyCode: companyCode.toUpperCase() }
        });
        if (!company) {
            return res.status(404).json({ error: "Company code does not exist" });
        }
        // Find User
        const user = await db_1.default.user.findFirst({
            where: {
                companyId: company.id,
                username
            }
        });
        if (!user) {
            return res.status(404).json({ error: "Username not found in the selected company" });
        }
        // Enforce suspension check
        if (user.status === "SUSPENDED") {
            return res.status(403).json({
                error: "Your user account has been suspended. Please contact your company administrator or system superadmin."
            });
        }
        // Verify email or phone matches registered user details
        const matchedEmail = user.email && user.email.toLowerCase().trim() === emailOrPhone.toLowerCase().trim();
        const matchedPhone = user.mobileNo.trim() === emailOrPhone.trim();
        if (!matchedEmail && !matchedPhone) {
            return res.status(400).json({ error: "The provided email or mobile number does not match our records." });
        }
        // Verify OTP
        const isOtpValid = await (0, utils_1.verifySimulatedOTP)(emailOrPhone, otpCode);
        if (!isOtpValid) {
            return res.status(400).json({ error: "Invalid or expired OTP verification code" });
        }
        // Hash new password and save
        const passwordHash = await (0, utils_1.hashPassword)(newPassword);
        await db_1.default.user.update({
            where: { id: user.id },
            data: { passwordHash }
        });
        return res.json({
            message: "Password has been reset successfully. You can now log in with your new password."
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
__exportStar(require("./manufacturing"), exports);
//# sourceMappingURL=index.js.map