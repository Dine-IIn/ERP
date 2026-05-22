"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ioInstance = exports.HIERARCHICAL_FEATURES = void 0;
exports.setIoInstance = setIoInstance;
exports.requestSignupOTP = requestSignupOTP;
exports.signup = signup;
exports.login = login;
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
const db_1 = __importDefault(require("../services/db"));
const types_1 = require("../types");
const utils_1 = require("../utils");
exports.HIERARCHICAL_FEATURES = [
    { key: "CRM", name: "Sales & CRM Category", description: "Enable Sales & CRM category" },
    { key: "CRM_LEADS", name: "Leads & Pipelines", description: "Manage opportunities and lead tracking" },
    { key: "CRM_CUSTOMER", name: "Customer Logs", description: "Track customer interactions and histories" },
    { key: "HR", name: "Human Resources Category", description: "Enable Human Resources category" },
    { key: "HR_ROSTER", name: "Employee Roster", description: "Directory of company workforce and permissions" },
    { key: "HR_ATTENDANCE", name: "Attendance Log", description: "Check in/out metrics and timesheets" },
    { key: "FINANCE", name: "Financials Category", description: "Enable Financials category" },
    { key: "FINANCE_LEDGER", name: "General Ledger", description: "Track double-entry assets and liabilities" },
    { key: "FINANCE_INVOICING", name: "Invoicing", description: "Generate invoices and manage client billing" },
    { key: "NOTIFICATIONS", name: "Alerts & Logs Category", description: "Enable system alerts and logs" },
    { key: "NOTIFICATIONS_PUSH", name: "Push Notifications", description: "Receive real-time push events on devices" },
    { key: "NOTIFICATIONS_AUDIT", name: "System Audit Logs", description: "View secure administrative history trails" }
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
        const { mobileNo } = req.body;
        if (!mobileNo) {
            return res.status(400).json({ error: "Mobile number is required to send OTP" });
        }
        await (0, utils_1.sendSimulatedOTP)(mobileNo);
        return res.json({ message: "Simulated OTP sent successfully! Check server logs." });
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
        const { companyCode, username, password, mobileNo, email, otpCode } = req.body;
        // Verify OTP
        if (!otpCode) {
            return res.status(400).json({ error: "OTP code is required for verification" });
        }
        const isOtpValid = await (0, utils_1.verifySimulatedOTP)(mobileNo, otpCode);
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
        if (companyCode.toUpperCase() === "SUPERADMIN" && username === "superadmin") {
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
        const token = (0, utils_1.generateToken)({
            userId: user.id,
            username: user.username,
            companyId: company.id,
            companyCode: company.companyCode,
            role: user.role?.name || null,
            isSuperAdmin: false
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
                isSuperAdmin: false
            }
        });
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
                    NOTIFICATIONS: ["read", "write", "delete"]
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
        const { name, companyCode, createdAt, status, features } = req.body;
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
            ...(status && { status })
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
            include: { role: true },
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
            createdAt: u.createdAt
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
//# sourceMappingURL=index.js.map