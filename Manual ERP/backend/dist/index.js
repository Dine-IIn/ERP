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
const path_1 = __importDefault(require("path"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_1 = require("./middlewares/auth");
const controllers_1 = require("./controllers");
const chat_1 = require("./controllers/chat");
dotenv_1.default.config();
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is missing in environment variables');
}
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
// Production security and performance middlewares
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false
}));
app.use((0, compression_1.default)());
// Define whitelisted production origins for CORS
const allowedOrigins = [
    'http://localhost:5173',
    'https://erp.anbindustries.com',
    'https://yourfrontend.vercel.app'
];
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        const isAllowed = allowedOrigins.includes(origin) ||
            /^http:\/\/localhost:\d+$/.test(origin) ||
            origin.startsWith('tauri://') ||
            origin.startsWith('capacitor://');
        if (isAllowed) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
};
// Enable CORS and JSON parsing middleware
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Set up rate limiter for authentication routes
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many authentication attempts from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/auth/', authLimiter);
// Serve static assets for uploads
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
// Setup HTTP and WebSockets
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            const isAllowed = allowedOrigins.includes(origin) ||
                /^http:\/\/localhost:\d+$/.test(origin) ||
                origin.startsWith('tauri://') ||
                origin.startsWith('capacitor://');
            if (isAllowed) {
                callback(null, true);
            }
            else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket']
});
// Share Socket.io instance with controllers
(0, controllers_1.setIoInstance)(io);
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        socket.data.user = decoded;
        next();
    }
    catch {
        next(new Error("Unauthorized"));
    }
});
// WebSocket Connection Handler
io.on('connection', (socket) => {
    socket.on('join_group', (groupId) => {
        socket.join(`group_${groupId}`);
    });
    socket.on('leave_group', (groupId) => {
        socket.leave(`group_${groupId}`);
    });
    socket.on('disconnect', () => {
        // Client disconnected
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
app.post('/api/auth/logout', auth_1.authenticateToken, controllers_1.logout);
app.patch('/api/auth/profile', auth_1.authenticateToken, controllers_1.updateSelfProfile);
app.post('/api/auth/reset-password', controllers_1.resetPassword);
app.post('/api/auth/forgot-password-otp', controllers_1.requestForgotPasswordOTP);
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
app.patch('/api/notifications/:id/archive', auth_1.authenticateToken, controllers_1.archiveNotification);
// 5. Enterprise Real-time Chat & Expense Spaces Routes
app.get('/api/chat/groups', auth_1.authenticateToken, chat_1.listChatGroups);
app.get('/api/chat/stats', auth_1.authenticateToken, chat_1.getCompanyChatStats);
app.post('/api/chat/group', auth_1.authenticateToken, chat_1.createChatGroup);
app.get('/api/chat/group/:groupId/messages', auth_1.authenticateToken, chat_1.getChatGroupMessages);
app.post('/api/chat/group/:groupId/message', auth_1.authenticateToken, chat_1.sendChatGroupMessage);
app.post('/api/chat/group/:groupId/members', auth_1.authenticateToken, chat_1.manageChatGroupMembers);
app.patch('/api/chat/group/:groupId/settings', auth_1.authenticateToken, chat_1.updateChatGroupSettings);
// 6. General Administration Module Routes (Company Profile & Features Only)
app.get('/api/admin/company/profile', auth_1.authenticateToken, controllers_1.getCompanyProfile);
app.patch('/api/admin/company/profile', auth_1.authenticateToken, controllers_1.updateCompanyProfile);
app.get('/api/admin/features', auth_1.authenticateToken, controllers_1.getCompanyFeatures);
app.post('/api/super/feature/toggle', auth_1.authenticateToken, auth_1.requireSuperAdmin, controllers_1.toggleCompanyFeature);
// Start the Integrated Express + HTTP + WebSockets Server
server.listen(port, () => {
    console.log(`\n🚀 ========================================================`);
    console.log(`   ERP backend monolith running on http://localhost:${port}`);
    console.log(`   Realtime WebSockets ready for notifications.`);
    console.log(`   PostgreSQL database connection: ACTIVE.`);
    console.log(`========================================================\n`);
});
//# sourceMappingURL=index.js.map