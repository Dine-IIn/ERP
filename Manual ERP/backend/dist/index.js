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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const auth_1 = require("./middlewares/auth");
const controllers_1 = require("./controllers");
const chat_1 = require("./controllers/chat");
const mdm_1 = __importDefault(require("./controllers/mdm"));
const finance_1 = __importStar(require("./controllers/finance"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
// Enable CORS and JSON parsing middleware
app.use((0, cors_1.default)({
    origin: "*", // Enable connection from any dev client port
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express_1.default.json());
// Serve static assets for uploads and backups
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
app.use('/backups', express_1.default.static(path_1.default.join(process.cwd(), 'backups')));
// Setup HTTP and WebSockets
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
// Share Socket.io instance with controllers
(0, controllers_1.setIoInstance)(io);
(0, finance_1.setFinanceIo)(io);
// WebSocket Connection Handler for Realtime Dashboard Popups
io.on('connection', (socket) => {
    console.log(`🔌 [WebSocket] Client connected: ${socket.id}`);
    // When a user authenticates on the client, they join their personal private room
    socket.on('join', (userId) => {
        socket.join(userId);
        console.log(`👤 [WebSocket] User ${userId} joined their private notification room.`);
    });
    // When a user enters a chat room, they join its Socket.io channel
    socket.on('join_group', (groupId) => {
        socket.join(`group_${groupId}`);
        console.log(`💬 [WebSocket] Client ${socket.id} joined Chat Group room: group_${groupId}`);
    });
    socket.on('leave_group', (groupId) => {
        socket.leave(`group_${groupId}`);
        console.log(`💬 [WebSocket] Client ${socket.id} left Chat Group room: group_${groupId}`);
    });
    socket.on('disconnect', () => {
        console.log(`🔌 [WebSocket] Client disconnected: ${socket.id}`);
    });
});
// ==========================================
// API ROUTING MODULES
// ==========================================
// Public Health Probe Route
app.get('/health', (req, res) => {
    res.json({ status: "healthy", service: "Enterprise Multi-Tenant ERP", timestamp: new Date() });
});
// 1. Core Authentication Routes
app.post('/api/auth/otp-request', controllers_1.requestSignupOTP);
app.post('/api/auth/signup', controllers_1.signup);
app.post('/api/auth/login', controllers_1.login);
// 2. Super Admin Routes (Create Companies & Manage Global Tiers)
app.post('/api/super/company', auth_1.authenticateToken, auth_1.requireSuperAdmin, controllers_1.createCompany);
app.get('/api/super/companies', auth_1.authenticateToken, auth_1.requireSuperAdmin, controllers_1.listCompanies);
app.patch('/api/super/company/:id', auth_1.authenticateToken, auth_1.requireSuperAdmin, controllers_1.updateCompany);
app.get('/api/super/company/:id/users', auth_1.authenticateToken, auth_1.requireSuperAdmin, controllers_1.listCompanyUsers);
app.post('/api/super/company/:id/admins', auth_1.authenticateToken, auth_1.requireSuperAdmin, controllers_1.createCompanyAdmin);
app.patch('/api/super/company/:id/users/:userId', auth_1.authenticateToken, auth_1.requireSuperAdmin, controllers_1.updateCompanyUser);
app.delete('/api/super/company/:id/users/:userId', auth_1.authenticateToken, auth_1.requireSuperAdmin, controllers_1.deleteCompanyUser);
// 3. Company Admin Routes (Approvals & RBAC Configurations)
app.get('/api/admin/pending-signups', auth_1.authenticateToken, controllers_1.listPendingSignups);
app.post('/api/admin/approve', auth_1.authenticateToken, controllers_1.approveSignup);
app.post('/api/admin/role', auth_1.authenticateToken, controllers_1.createRole);
app.get('/api/admin/dashboard', auth_1.authenticateToken, controllers_1.getCompanyRolesAndUsers);
// 4. Integrated Multi-Channel Notifications Routes
app.get('/api/notifications', auth_1.authenticateToken, controllers_1.listNotifications);
app.patch('/api/notifications/:id/read', auth_1.authenticateToken, controllers_1.markAsRead);
app.post('/api/notifications/register-token', auth_1.authenticateToken, controllers_1.registerPushToken);
// 5. Enterprise Real-time Chat & Expense Spaces Routes
app.get('/api/chat/groups', auth_1.authenticateToken, chat_1.listChatGroups);
app.get('/api/chat/stats', auth_1.authenticateToken, chat_1.getCompanyChatStats);
app.post('/api/chat/group', auth_1.authenticateToken, chat_1.createChatGroup);
app.get('/api/chat/group/:groupId/messages', auth_1.authenticateToken, chat_1.getChatGroupMessages);
app.post('/api/chat/group/:groupId/message', auth_1.authenticateToken, chat_1.sendChatGroupMessage);
app.post('/api/chat/group/:groupId/members', auth_1.authenticateToken, chat_1.manageChatGroupMembers);
app.patch('/api/chat/group/:groupId/settings', auth_1.authenticateToken, chat_1.updateChatGroupSettings);
// 6. General Administration Module Routes
// Company Profile Management
app.get('/api/admin/company/profile', auth_1.authenticateToken, controllers_1.getCompanyProfile);
app.patch('/api/admin/company/profile', auth_1.authenticateToken, controllers_1.updateCompanyProfile);
// GST / Tax Settings
app.get('/api/admin/tax/settings', auth_1.authenticateToken, controllers_1.listTaxSettings);
app.post('/api/admin/tax/setting', auth_1.authenticateToken, controllers_1.createTaxSetting);
app.patch('/api/admin/tax/setting/:id', auth_1.authenticateToken, controllers_1.updateTaxSetting);
app.delete('/api/admin/tax/setting/:id', auth_1.authenticateToken, controllers_1.deleteTaxSetting);
app.post('/api/admin/tax/calculate', auth_1.authenticateToken, controllers_1.calculateTax);
// Currency Management
app.get('/api/admin/currencies', auth_1.authenticateToken, controllers_1.listCurrencies);
app.post('/api/admin/currency', auth_1.authenticateToken, controllers_1.createCurrency);
app.patch('/api/admin/currency/:id', auth_1.authenticateToken, controllers_1.updateCurrency);
app.delete('/api/admin/currency/:id', auth_1.authenticateToken, controllers_1.deleteCurrency);
// Audit Log System
app.get('/api/admin/audit-logs', auth_1.authenticateToken, controllers_1.getAuditLogs);
// Approval Workflow Engine
app.get('/api/admin/workflows', auth_1.authenticateToken, controllers_1.listWorkflows);
app.post('/api/admin/workflow', auth_1.authenticateToken, controllers_1.createWorkflow);
app.patch('/api/admin/workflow/:id', auth_1.authenticateToken, controllers_1.updateWorkflow);
app.delete('/api/admin/workflow/:id', auth_1.authenticateToken, controllers_1.deleteWorkflow);
app.get('/api/admin/approvals', auth_1.authenticateToken, controllers_1.listApprovalRequests);
app.post('/api/admin/approval/request', auth_1.authenticateToken, controllers_1.createApprovalRequest);
app.post('/api/admin/approval/action', auth_1.authenticateToken, controllers_1.submitApprovalAction);
// Notification Center (Extended)
app.patch('/api/notifications/:id/archive', auth_1.authenticateToken, controllers_1.archiveNotification);
// Document Management System
app.get('/api/admin/documents', auth_1.authenticateToken, controllers_1.listDocuments);
app.post('/api/admin/document/upload', auth_1.authenticateToken, controllers_1.uploadDocument);
app.post('/api/admin/document/:id/version', auth_1.authenticateToken, controllers_1.addDocumentVersion);
// Backup & Restore
app.get('/api/admin/backups', auth_1.authenticateToken, controllers_1.getBackupLogs);
app.post('/api/admin/backup/trigger', auth_1.authenticateToken, controllers_1.triggerBackup);
app.post('/api/admin/backup/restore', auth_1.authenticateToken, controllers_1.restoreBackup);
app.patch('/api/admin/users/:userId/backup-access', auth_1.authenticateToken, controllers_1.toggleUserBackupAccess);
// Email Integration Connection Diagnostics
app.post('/api/admin/email/test', auth_1.authenticateToken, controllers_1.testEmailConnection);
// Department Management CRUD
app.get('/api/admin/departments', auth_1.authenticateToken, controllers_1.listDepartments);
app.post('/api/admin/departments', auth_1.authenticateToken, controllers_1.createDepartment);
app.patch('/api/admin/departments/:id', auth_1.authenticateToken, controllers_1.updateDepartment);
app.delete('/api/admin/departments/:id', auth_1.authenticateToken, controllers_1.deleteDepartment);
// Feature Toggles (Subscription Control)
app.get('/api/admin/features', auth_1.authenticateToken, controllers_1.getCompanyFeatures);
app.post('/api/super/feature/toggle', auth_1.authenticateToken, auth_1.requireSuperAdmin, controllers_1.toggleCompanyFeature);
// Dashboard Layout Customization
app.get('/api/admin/dashboard/layout', auth_1.authenticateToken, controllers_1.getDashboardLayout);
app.post('/api/admin/dashboard/layout', auth_1.authenticateToken, controllers_1.saveDashboardLayout);
// Master Data Management Module Routes
app.use('/api/mdm', auth_1.authenticateToken, mdm_1.default);
// Finance & Accounting Module Routes
app.use('/api/finance', auth_1.authenticateToken, finance_1.default);
// Start the Integrated Express + HTTP + WebSockets Server
server.listen(port, () => {
    console.log(`\n🚀 ========================================================`);
    console.log(`   ERP backend monolith running on http://localhost:${port}`);
    console.log(`   Realtime WebSockets ready for notifications.`);
    console.log(`   SQLite database connection: ACTIVE.`);
    console.log(`========================================================\n`);
});
//# sourceMappingURL=index.js.map