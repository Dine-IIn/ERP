"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = require("./middlewares/auth");
const controllers_1 = require("./controllers");
const chat_1 = require("./controllers/chat");
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
app.post('/api/chat/group', auth_1.authenticateToken, chat_1.createChatGroup);
app.get('/api/chat/group/:groupId/messages', auth_1.authenticateToken, chat_1.getChatGroupMessages);
app.post('/api/chat/group/:groupId/message', auth_1.authenticateToken, chat_1.sendChatGroupMessage);
app.post('/api/chat/group/:groupId/members', auth_1.authenticateToken, chat_1.manageChatGroupMembers);
app.patch('/api/chat/group/:groupId/settings', auth_1.authenticateToken, chat_1.updateChatGroupSettings);
// Start the Integrated Express + HTTP + WebSockets Server
server.listen(port, () => {
    console.log(`\n🚀 ========================================================`);
    console.log(`   ERP backend monolith running on http://localhost:${port}`);
    console.log(`   Realtime WebSockets ready for notifications.`);
    console.log(`   SQLite database connection: ACTIVE.`);
    console.log(`========================================================\n`);
});
//# sourceMappingURL=index.js.map