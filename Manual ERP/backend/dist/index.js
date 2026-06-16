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
const db_1 = __importDefault(require("./services/db"));
const auth_1 = require("./middlewares/auth");
const controllers_1 = require("./controllers");
const controllers_2 = require("./controllers");
const chat_1 = require("./controllers/chat");
const taxes_1 = require("./controllers/taxes");
const crm_1 = require("./controllers/crm");
const purchases_1 = require("./controllers/purchases");
const inventory_1 = require("./controllers/inventory");
const forecast_1 = require("./controllers/forecast");
const forecast_2 = require("./services/forecast");
const forecastScheduler_1 = require("./services/forecastScheduler");
const controllers_3 = require("./controllers");
const sales_1 = require("./controllers/sales");
const hrms_1 = require("./controllers/hrms");
const finance_1 = require("./controllers/finance");
const reports_1 = require("./controllers/reports");
dotenv_1.default.config();
const fs_1 = __importDefault(require("fs"));
const licensing_1 = require("./services/licensing");
const updater_1 = require("./services/updater");
// Package check configuration
const isPackaged = process.argv[0].endsWith('ERPServer.exe');
const appRoot = isPackaged ? path_1.default.dirname(process.execPath) : process.cwd();
const configEnvPath = path_1.default.resolve(appRoot, '../Data/Config/config.env');
if (fs_1.default.existsSync(configEnvPath)) {
    try {
        const configContent = fs_1.default.readFileSync(configEnvPath, 'utf8');
        configContent.split(/\r?\n/).forEach(line => {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*["']?([^\r\n"']+)["']?/);
            if (match) {
                process.env[match[1]] = match[2].trim();
            }
        });
        console.log(`🔌 [Server Config] Dynamically loaded configuration keys from: "${configEnvPath}"`);
    }
    catch (err) {
        console.error("⚠️ Failed to parse config.env configuration file:", err.message);
    }
}
if (!process.env.CENTRAL_SERVICES_URL) {
    throw new Error("CENTRAL_SERVICES_URL environment variable is required");
}
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is missing in environment variables');
}
// Trigger background daemon loops
const licenseKey = process.env.LICENSE_KEY || '';
(0, licensing_1.initializeLicensing)(licenseKey).catch(err => {
    console.error("❌ Failed to initialize licensing daemon:", err);
});
(0, updater_1.initializeUpdater)().catch(err => {
    console.error("❌ Failed to initialize auto-updater daemon:", err);
});
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
// Production security and performance middlewares
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            connectSrc: ["'self'", "https:", "wss:"],
        },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameguard: { action: "deny" },
    noSniff: true
}));
app.use((0, compression_1.default)());
// Define whitelisted production origins for CORS
const allowedOrigins = [
    'http://localhost:5173',
    'https://localhost',
    'http://tauri.localhost',
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
            /^(http|https):\/\/localhost(:\d+)?$/.test(origin) ||
            /^(http|https):\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
            /^(http|https):\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin) ||
            /^(http|https):\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+(:\d+)?$/.test(origin) ||
            origin.startsWith('tauri://') ||
            origin.startsWith('capacitor://');
        if (isAllowed || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        }
        else {
            console.log('❌ BLOCKED ORIGIN:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
    allowedHeaders: ["Content-Type", "Authorization", "x-otp-code"],
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
                /^(http|https):\/\/localhost(:\d+)?$/.test(origin) ||
                /^(http|https):\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
                /^(http|https):\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin) ||
                /^(http|https):\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+(:\d+)?$/.test(origin) ||
                origin.startsWith('tauri://') ||
                origin.startsWith('capacitor://');
            if (isAllowed || process.env.NODE_ENV !== 'production') {
                callback(null, true);
            }
            else {
                console.log('❌ BLOCKED ORIGIN:', origin);
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['polling', 'websocket']
});
// Share Socket.io instance with controllers
(0, controllers_1.setIoInstance)(io);
io.use((socket, next) => {
    console.log("🔌 [STEP 1 - SOCKET BACKEND] handshake received. Socket ID:", socket.id);
    const token = socket.handshake.auth.token;
    console.log("🔌 [STEP 1 - SOCKET BACKEND] auth token received:", token ? `YES (length ${token.length})` : "NO");
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        console.log("🔌 [STEP 1 - SOCKET BACKEND] JWT verification result: SUCCESS. User ID:", decoded.userId, "Username:", decoded.username);
        socket.data.user = decoded;
        next();
    }
    catch (err) {
        console.error("🔌 [STEP 1 - SOCKET BACKEND] JWT verification result: FAILED. Error:", err.message);
        next(new Error("Unauthorized"));
    }
});
// WebSocket Connection Handler
io.on('connection', async (socket) => {
    const user = socket.data.user;
    console.log("🔌 [STEP 1 - SOCKET BACKEND] socket connected. ID:", socket.id, "User ID:", user?.userId);
    if (user && user.userId) {
        // Join personal user room
        socket.join(user.userId);
        console.log("Socket joined room:", user.userId);
        socket.join(`user_${user.userId}`);
        console.log("Socket joined room:", `user_${user.userId}`);
        try {
            // Auto join socket rooms for all chat groups the user is currently a member of
            const memberships = await db_1.default.groupMember.findMany({
                where: { userId: user.userId },
                select: { groupId: true }
            });
            memberships.forEach(m => {
                socket.join(`group_${m.groupId}`);
                console.log("Socket joined room:", `group_${m.groupId}`);
            });
            console.log(`🔌 Socket joined ${memberships.length} group rooms for user: ${user.username}`);
        }
        catch (err) {
            console.error("Error auto-joining chat groups on socket connection:", err);
        }
    }
    socket.on('join', (userId) => {
        socket.join(userId);
        console.log("Socket joined room:", userId);
        socket.join(`user_${userId}`);
        console.log("Socket joined room:", `user_${userId}`);
    });
    socket.on('join_group', (groupId) => {
        socket.join(`group_${groupId}`);
        console.log("Socket joined room:", `group_${groupId}`);
    });
    socket.on('leave_group', (groupId) => {
        socket.leave(`group_${groupId}`);
        console.log("Socket left room:", `group_${groupId}`);
    });
    socket.on('disconnect', (reason) => {
        console.log(`🔌 [STEP 1 - SOCKET BACKEND] socket disconnected. ID: ${socket.id}, reason: ${reason}`);
    });
});
// ==========================================
// API ROUTING MODULES
// ==========================================
// Public Health Probe Routes
app.get('/health', (req, res) => {
    res.json({ status: "healthy", service: "Enterprise Multi-Tenant ERP", timestamp: new Date() });
});
// /api/health alias used by the backend auto-updater post-restart self-check
app.get('/api/health', (req, res) => {
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
// Super Admin Central Services Mappings Proxy Routes
app.get('/api/super/central/licenses', auth_1.authenticateToken, auth_1.requireSuperAdmin, controllers_2.getCentralLicenses);
app.post('/api/super/central/licenses', auth_1.authenticateToken, auth_1.requireSuperAdmin, controllers_2.saveCentralLicense);
app.delete('/api/super/central/licenses/:licenseKey', auth_1.authenticateToken, auth_1.requireSuperAdmin, controllers_2.deleteCentralLicense);
app.get('/api/super/central/discovery', auth_1.authenticateToken, auth_1.requireSuperAdmin, controllers_2.getCentralDiscovery);
app.post('/api/super/central/discovery', auth_1.authenticateToken, auth_1.requireSuperAdmin, controllers_2.saveCentralDiscovery);
app.delete('/api/super/central/discovery/:companyCode', auth_1.authenticateToken, auth_1.requireSuperAdmin, controllers_2.deleteCentralDiscovery);
app.get('/api/super/central/updater', auth_1.authenticateToken, auth_1.requireSuperAdmin, controllers_2.getCentralUpdater);
app.post('/api/super/central/updater', auth_1.authenticateToken, auth_1.requireSuperAdmin, controllers_2.saveCentralUpdater);
app.get('/api/super/central/updater-status', auth_1.authenticateToken, auth_1.requireSuperAdmin, controllers_2.getCentralUpdaterStatus);
app.get('/api/super/central/dev-configs', auth_1.authenticateToken, auth_1.requireSuperAdmin, controllers_2.getCentralDevConfigs);
app.post('/api/super/central/dev-configs', auth_1.authenticateToken, auth_1.requireSuperAdmin, controllers_2.saveCentralDevConfig);
app.delete('/api/super/central/dev-configs/:companyCode', auth_1.authenticateToken, auth_1.requireSuperAdmin, controllers_2.deleteCentralDevConfig);
// Read-only database introspection (for super admin infrastructure view)
app.get('/api/super/db-info', auth_1.authenticateToken, auth_1.requireSuperAdmin, controllers_2.getDbInfo);
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
app.delete('/api/chat/group/:groupId', auth_1.authenticateToken, chat_1.deleteChatGroup);
app.get('/api/chat/group/:groupId/expense-sheet', auth_1.authenticateToken, chat_1.downloadExpenseSheet);
app.delete('/api/chat/message/:messageId', auth_1.authenticateToken, chat_1.deleteChatMessage);
const controllers_4 = require("./controllers");
const admin_endpoints_1 = require("./controllers/admin_endpoints");
const master_data_1 = require("./controllers/master_data");
const sales_2 = require("./controllers/sales");
// 6. General Administration Module Routes (Company Profile & Features Only)
app.get('/api/admin/company/profile', auth_1.authenticateToken, controllers_1.getCompanyProfile);
app.patch('/api/admin/company/profile', auth_1.authenticateToken, controllers_1.updateCompanyProfile);
app.get('/api/admin/features', auth_1.authenticateToken, controllers_1.getCompanyFeatures);
app.post('/api/super/feature/toggle', auth_1.authenticateToken, auth_1.requireSuperAdmin, controllers_1.toggleCompanyFeature);
// 7. Advanced Company Administration Console REST APIs (Company Admin Scoped)
app.get('/api/admin/audit-logs', auth_1.authenticateToken, admin_endpoints_1.listAuditLogs);
app.get('/api/admin/backups', auth_1.authenticateToken, admin_endpoints_1.listBackups);
app.post('/api/admin/backups', auth_1.authenticateToken, admin_endpoints_1.triggerBackup);
app.patch('/api/admin/backups/settings', auth_1.authenticateToken, admin_endpoints_1.updateBackupSettings);
app.get('/api/admin/backups/download/:filename', auth_1.authenticateToken, admin_endpoints_1.downloadBackup);
app.post('/api/admin/backups/request-otp', auth_1.authenticateToken, admin_endpoints_1.requestBackupOTP);
app.delete('/api/admin/backups/:filename', auth_1.authenticateToken, admin_endpoints_1.deleteBackup);
app.post('/api/admin/backups/reset', auth_1.authenticateToken, admin_endpoints_1.restoreBackup);
app.post('/api/admin/users', auth_1.authenticateToken, admin_endpoints_1.createUserForAdmin);
app.patch('/api/admin/users/:userId', auth_1.authenticateToken, admin_endpoints_1.updateUserForAdmin);
app.delete('/api/admin/users/:userId', auth_1.authenticateToken, controllers_1.deleteCompanyUser); // Wipes from session registry
app.get('/api/admin/departments', auth_1.authenticateToken, admin_endpoints_1.listDepartments);
app.post('/api/admin/departments', auth_1.authenticateToken, admin_endpoints_1.createDepartment);
app.patch('/api/admin/departments/:deptId', auth_1.authenticateToken, admin_endpoints_1.updateDepartment);
app.delete('/api/admin/departments/:deptId', auth_1.authenticateToken, admin_endpoints_1.deleteDepartment);
app.patch('/api/admin/roles/:roleId', auth_1.authenticateToken, admin_endpoints_1.updateRolePermissions);
app.delete('/api/admin/roles/:roleId', auth_1.authenticateToken, admin_endpoints_1.deleteRoleForAdmin);
// 8. Master Data Management Console REST APIs (Company Admin / User Scoped)
app.get('/api/master/customers', auth_1.authenticateToken, master_data_1.listCustomers);
app.post('/api/master/customers', auth_1.authenticateToken, master_data_1.createCustomer);
app.patch('/api/master/customers/:id', auth_1.authenticateToken, master_data_1.updateCustomer);
app.delete('/api/master/customers/:id', auth_1.authenticateToken, master_data_1.deleteCustomer);
app.get('/api/master/vendors', auth_1.authenticateToken, master_data_1.listVendors);
app.post('/api/master/vendors', auth_1.authenticateToken, master_data_1.createVendor);
app.patch('/api/master/vendors/:id', auth_1.authenticateToken, master_data_1.updateVendor);
app.delete('/api/master/vendors/:id', auth_1.authenticateToken, master_data_1.deleteVendor);
app.get('/api/master/categories', auth_1.authenticateToken, master_data_1.listCategories);
app.post('/api/master/categories', auth_1.authenticateToken, master_data_1.createCategory);
app.delete('/api/master/categories/:id', auth_1.authenticateToken, master_data_1.deleteCategory);
app.get('/api/master/brands', auth_1.authenticateToken, master_data_1.listBrands);
app.post('/api/master/brands', auth_1.authenticateToken, master_data_1.createBrand);
app.delete('/api/master/brands/:id', auth_1.authenticateToken, master_data_1.deleteBrand);
app.get('/api/master/products', auth_1.authenticateToken, master_data_1.listProducts);
app.post('/api/master/products', auth_1.authenticateToken, master_data_1.createProduct);
app.patch('/api/master/products/:id', auth_1.authenticateToken, master_data_1.updateProduct);
app.delete('/api/master/products/:id', auth_1.authenticateToken, master_data_1.deleteProduct);
// 9. Sales Module Scoped Consolidated APIs
app.get('/api/sales/orders', auth_1.authenticateToken, sales_2.listSalesOrders);
app.post('/api/sales/orders', auth_1.authenticateToken, sales_2.createSalesOrder);
app.patch('/api/sales/orders/:id', auth_1.authenticateToken, sales_2.updateSalesOrder);
app.delete('/api/sales/orders/:id', auth_1.authenticateToken, sales_2.deleteSalesOrder);
app.get('/api/sales/proforma', auth_1.authenticateToken, sales_2.listProformaInvoices);
app.post('/api/sales/proforma', auth_1.authenticateToken, sales_2.createProformaInvoice);
app.patch('/api/sales/proforma/:id', auth_1.authenticateToken, sales_2.updateProformaInvoice);
app.delete('/api/sales/proforma/:id', auth_1.authenticateToken, sales_2.deleteProformaInvoice);
app.post('/api/sales/proforma/:id/email', auth_1.authenticateToken, sales_2.sendProformaInvoiceEmail);
app.get('/api/sales/invoices', auth_1.authenticateToken, sales_2.listSalesInvoices);
app.post('/api/sales/invoices', auth_1.authenticateToken, sales_2.createSalesInvoice);
app.patch('/api/sales/invoices/:id', auth_1.authenticateToken, sales_2.updateSalesInvoice);
app.delete('/api/sales/invoices/:id', auth_1.authenticateToken, sales_2.deleteSalesInvoice);
app.post('/api/sales/invoices/:id/email', auth_1.authenticateToken, sales_2.sendSalesInvoiceEmail);
app.get('/api/sales/challans', auth_1.authenticateToken, sales_2.listDeliveryChallans);
app.post('/api/sales/challans', auth_1.authenticateToken, sales_2.createDeliveryChallan);
app.patch('/api/sales/challans/:id', auth_1.authenticateToken, sales_2.updateDeliveryChallan);
app.delete('/api/sales/challans/:id', auth_1.authenticateToken, sales_2.deleteDeliveryChallan);
app.post('/api/sales/challans/:id/email', auth_1.authenticateToken, sales_2.sendDeliveryChallanEmail);
app.get('/api/sales/dispatches', auth_1.authenticateToken, sales_2.listDispatches);
app.post('/api/sales/dispatches', auth_1.authenticateToken, sales_2.createDispatch);
app.patch('/api/sales/dispatches/:id', auth_1.authenticateToken, sales_2.updateDispatch);
app.delete('/api/sales/dispatches/:id', auth_1.authenticateToken, sales_2.deleteDispatch);
// 9.05 Document Templates CRUD
app.get('/api/sales/templates', auth_1.authenticateToken, sales_2.listDocumentTemplates);
app.post('/api/sales/templates', auth_1.authenticateToken, sales_2.createDocumentTemplate);
app.patch('/api/sales/templates/:id', auth_1.authenticateToken, sales_2.updateDocumentTemplate);
app.delete('/api/sales/templates/:id', auth_1.authenticateToken, sales_2.deleteDocumentTemplate);
// 9.1 Advanced Sales: Quotations & Post-Sales Maintenance Service CRUDs
app.get('/api/sales/quotations', auth_1.authenticateToken, sales_1.listQuotations);
app.post('/api/sales/quotations', auth_1.authenticateToken, sales_1.createQuotation);
app.patch('/api/sales/quotations/:id', auth_1.authenticateToken, sales_1.updateQuotationStatus);
app.delete('/api/sales/quotations/:id', auth_1.authenticateToken, sales_1.deleteQuotation);
app.get('/api/sales/service-tickets', auth_1.authenticateToken, sales_1.listServiceTickets);
app.post('/api/sales/service-tickets', auth_1.authenticateToken, sales_1.createServiceTicket);
app.patch('/api/sales/service-tickets/:id', auth_1.authenticateToken, sales_1.updateServiceTicket);
app.delete('/api/sales/service-tickets/:id', auth_1.authenticateToken, sales_1.deleteServiceTicket);
// 9.2 Tax Master CRUD
app.get('/api/master/taxes', auth_1.authenticateToken, taxes_1.listTaxes);
app.post('/api/master/taxes', auth_1.authenticateToken, taxes_1.createTax);
app.patch('/api/master/taxes/:id', auth_1.authenticateToken, taxes_1.updateTax);
app.delete('/api/master/taxes/:id', auth_1.authenticateToken, taxes_1.deleteTax);
// 9.3 CRM Portal: Leads, Opportunities, Followups and Analytics Stats CRUDs
app.get('/api/crm/leads', auth_1.authenticateToken, crm_1.listLeads);
app.post('/api/crm/leads', auth_1.authenticateToken, crm_1.createLead);
app.patch('/api/crm/leads/:id', auth_1.authenticateToken, crm_1.updateLead);
app.delete('/api/crm/leads/:id', auth_1.authenticateToken, crm_1.deleteLead);
app.get('/api/crm/opportunities', auth_1.authenticateToken, crm_1.listOpportunities);
app.post('/api/crm/opportunities', auth_1.authenticateToken, crm_1.createOpportunity);
app.patch('/api/crm/opportunities/:id', auth_1.authenticateToken, crm_1.updateOpportunity);
app.delete('/api/crm/opportunities/:id', auth_1.authenticateToken, crm_1.deleteOpportunity);
app.get('/api/crm/followups', auth_1.authenticateToken, crm_1.listFollowUps);
app.post('/api/crm/followups', auth_1.authenticateToken, crm_1.createFollowUp);
app.patch('/api/crm/followups/:id', auth_1.authenticateToken, crm_1.updateFollowUp);
app.delete('/api/crm/followups/:id', auth_1.authenticateToken, crm_1.deleteFollowUp);
app.get('/api/crm/stats', auth_1.authenticateToken, crm_1.getCrmStats);
// 9.4 Purchase Sourcing: Vendor Quotes, POs, GRN, Returns, Payments CRUDs
app.get('/api/purchase/vendor-quotes', auth_1.authenticateToken, purchases_1.listVendorQuotations);
app.post('/api/purchase/vendor-quotes', auth_1.authenticateToken, purchases_1.createVendorQuotation);
app.patch('/api/purchase/vendor-quotes/:id', auth_1.authenticateToken, purchases_1.updateVendorQuotationStatus);
app.delete('/api/purchase/vendor-quotes/:id', auth_1.authenticateToken, purchases_1.deleteVendorQuotation);
app.get('/api/purchase/orders', auth_1.authenticateToken, purchases_1.listPurchaseOrders);
app.post('/api/purchase/orders', auth_1.authenticateToken, purchases_1.createPurchaseOrder);
app.patch('/api/purchase/orders/:id', auth_1.authenticateToken, purchases_1.updatePurchaseOrder);
app.delete('/api/purchase/orders/:id', auth_1.authenticateToken, purchases_1.deletePurchaseOrder);
app.get('/api/purchase/grns', auth_1.authenticateToken, purchases_1.listGrns);
app.post('/api/purchase/grns', auth_1.authenticateToken, purchases_1.createGrn);
app.delete('/api/purchase/grns/:id', auth_1.authenticateToken, purchases_1.deleteGrn);
app.get('/api/purchase/returns', auth_1.authenticateToken, purchases_1.listPurchaseReturns);
app.post('/api/purchase/returns', auth_1.authenticateToken, purchases_1.createPurchaseReturn);
app.delete('/api/purchase/returns/:id', auth_1.authenticateToken, purchases_1.deletePurchaseReturn);
app.get('/api/purchase/payments', auth_1.authenticateToken, purchases_1.listVendorPayments);
app.post('/api/purchase/payments', auth_1.authenticateToken, purchases_1.createVendorPayment);
app.delete('/api/purchase/payments/:id', auth_1.authenticateToken, purchases_1.deleteVendorPayment);
// 9.5 Inventory Warehousing: Ledger listings & manual stock adjustments
app.get('/api/inventory/adjustments', auth_1.authenticateToken, inventory_1.listStockAdjustments);
app.post('/api/inventory/adjust', auth_1.authenticateToken, inventory_1.adjustStock);
// AI Forecasting Routes
app.get('/api/super/company/:id/forecast-config', auth_1.authenticateToken, auth_1.requireSuperAdmin, forecast_1.getSuperCompanyForecastConfig);
app.post('/api/super/company/:id/forecast-config', auth_1.authenticateToken, auth_1.requireSuperAdmin, forecast_1.saveSuperCompanyForecastConfig);
app.get('/api/forecast/status', auth_1.authenticateToken, forecast_1.getTenantForecastStatus);
app.post('/api/forecast/run', auth_1.authenticateToken, forecast_1.runTenantForecast);
app.get('/api/forecast/predictions', auth_1.authenticateToken, forecast_1.getTenantForecastPredictions);
app.get('/api/forecast/history', auth_1.authenticateToken, forecast_1.getTenantForecastHistory);
// 9.55 Manufacturing Operations Routes
app.get('/api/manufacturing/boms', auth_1.authenticateToken, controllers_3.listBoms);
app.post('/api/manufacturing/boms', auth_1.authenticateToken, controllers_3.createBom);
app.put('/api/manufacturing/boms/:id', auth_1.authenticateToken, controllers_3.updateBom);
app.delete('/api/manufacturing/boms/:id', auth_1.authenticateToken, controllers_3.deleteBom);
app.get('/api/manufacturing/plans', auth_1.authenticateToken, controllers_3.listPlans);
app.post('/api/manufacturing/plans', auth_1.authenticateToken, controllers_3.createPlan);
app.put('/api/manufacturing/plans/:id', auth_1.authenticateToken, controllers_3.updatePlan);
app.delete('/api/manufacturing/plans/:id', auth_1.authenticateToken, controllers_3.deletePlan);
app.post('/api/manufacturing/plans/:id/release', auth_1.authenticateToken, controllers_3.releasePlan);
app.get('/api/manufacturing/work-orders', auth_1.authenticateToken, controllers_3.listWorkOrders);
app.post('/api/manufacturing/work-orders', auth_1.authenticateToken, controllers_3.createWorkOrder);
app.put('/api/manufacturing/work-orders/:id', auth_1.authenticateToken, controllers_3.updateWorkOrder);
app.delete('/api/manufacturing/work-orders/:id', auth_1.authenticateToken, controllers_3.deleteWorkOrder);
app.post('/api/manufacturing/work-orders/:id/start', auth_1.authenticateToken, controllers_3.startWorkOrder);
app.get('/api/manufacturing/job-cards', auth_1.authenticateToken, controllers_3.listJobCards);
app.post('/api/manufacturing/job-cards', auth_1.authenticateToken, controllers_3.createJobCard);
app.put('/api/manufacturing/job-cards/:id', auth_1.authenticateToken, controllers_3.updateJobCard);
app.delete('/api/manufacturing/job-cards/:id', auth_1.authenticateToken, controllers_3.deleteJobCard);
app.post('/api/manufacturing/job-cards/:id/start', auth_1.authenticateToken, controllers_3.startJobCard);
app.post('/api/manufacturing/job-cards/:id/complete', auth_1.authenticateToken, controllers_3.completeJobCard);
app.post('/api/manufacturing/job-cards/:id/create-sub-po', auth_1.authenticateToken, controllers_3.createSubcontractPO);
app.get('/api/manufacturing/logs', auth_1.authenticateToken, controllers_3.listLogs);
app.post('/api/manufacturing/logs', auth_1.authenticateToken, controllers_3.createLog);
app.delete('/api/manufacturing/logs/:id', auth_1.authenticateToken, controllers_3.deleteLog);
app.get('/api/manufacturing/qc', auth_1.authenticateToken, controllers_3.listQcRecords);
app.post('/api/manufacturing/qc', auth_1.authenticateToken, controllers_3.createQcRecord);
app.put('/api/manufacturing/qc/:id', auth_1.authenticateToken, controllers_3.updateQcRecord);
app.delete('/api/manufacturing/qc/:id', auth_1.authenticateToken, controllers_3.deleteQcRecord);
app.get('/api/manufacturing/rework', auth_1.authenticateToken, controllers_3.listReworkCards);
app.put('/api/manufacturing/rework/:id', auth_1.authenticateToken, controllers_3.updateReworkCard);
app.delete('/api/manufacturing/rework/:id', auth_1.authenticateToken, controllers_3.deleteReworkCard);
app.get('/api/manufacturing/work-centers', auth_1.authenticateToken, controllers_3.listWorkCenters);
app.post('/api/manufacturing/work-centers', auth_1.authenticateToken, controllers_3.createWorkCenter);
app.put('/api/manufacturing/work-centers/:id', auth_1.authenticateToken, controllers_3.updateWorkCenter);
app.delete('/api/manufacturing/work-centers/:id', auth_1.authenticateToken, controllers_3.deleteWorkCenter);
app.get('/api/manufacturing/shifts', auth_1.authenticateToken, controllers_3.listShifts);
app.post('/api/manufacturing/shifts', auth_1.authenticateToken, controllers_3.createShift);
app.put('/api/manufacturing/shifts/:id', auth_1.authenticateToken, controllers_3.updateShift);
app.delete('/api/manufacturing/shifts/:id', auth_1.authenticateToken, controllers_3.deleteShift);
app.get('/api/manufacturing/routings', auth_1.authenticateToken, controllers_3.listRoutings);
app.post('/api/manufacturing/routings', auth_1.authenticateToken, controllers_3.createRouting);
app.put('/api/manufacturing/routings/:id', auth_1.authenticateToken, controllers_3.updateRouting);
app.delete('/api/manufacturing/routings/:id', auth_1.authenticateToken, controllers_3.deleteRouting);
app.get('/api/manufacturing/material-issues', auth_1.authenticateToken, controllers_3.listMaterialIssues);
app.post('/api/manufacturing/material-issue', auth_1.authenticateToken, controllers_3.issueMaterialsToWorkOrder);
app.get('/api/manufacturing/work-orders/:id/actual-costing', auth_1.authenticateToken, controllers_3.getWorkOrderActualCosting);
// 9.6 HRMS Module Routes
app.get('/api/hrms/employees', auth_1.authenticateToken, hrms_1.listEmployees);
app.patch('/api/hrms/employees/:id', auth_1.authenticateToken, hrms_1.updateEmployee);
app.get('/api/hrms/attendance', auth_1.authenticateToken, hrms_1.listAttendance);
app.post('/api/hrms/attendance/punch', auth_1.authenticateToken, hrms_1.punchAttendance);
app.get('/api/hrms/leaves', auth_1.authenticateToken, hrms_1.listLeaveRequests);
app.post('/api/hrms/leaves', auth_1.authenticateToken, hrms_1.createLeaveRequest);
app.patch('/api/hrms/leaves/:id', auth_1.authenticateToken, hrms_1.updateLeaveRequestStatus);
app.get('/api/hrms/shifts', auth_1.authenticateToken, hrms_1.listShiftRosters);
app.post('/api/hrms/shifts', auth_1.authenticateToken, hrms_1.createShiftRoster);
app.get('/api/hrms/payroll', auth_1.authenticateToken, hrms_1.listPayroll);
app.post('/api/hrms/payroll/generate', auth_1.authenticateToken, hrms_1.generatePayroll);
app.patch('/api/hrms/payroll/disburse/:id', auth_1.authenticateToken, hrms_1.disbursePayroll);
// 9.7 Finance & Accounting Module Routes
app.get('/api/finance/expenses', auth_1.authenticateToken, finance_1.listExpenses);
app.post('/api/finance/expenses', auth_1.authenticateToken, finance_1.createExpense);
app.get('/api/finance/payments', auth_1.authenticateToken, finance_1.listPayments);
app.post('/api/finance/payments', auth_1.authenticateToken, finance_1.createPayment);
app.get('/api/finance/receipts', auth_1.authenticateToken, finance_1.listReceipts);
app.post('/api/finance/receipts', auth_1.authenticateToken, finance_1.createReceipt);
app.get('/api/finance/cashbook', auth_1.authenticateToken, finance_1.listCashbookVouchers);
app.get('/api/finance/gst-worksheet', auth_1.authenticateToken, finance_1.getGstWorksheet);
app.get('/api/finance/bank-accounts', auth_1.authenticateToken, finance_1.listBankAccounts);
app.post('/api/finance/bank-accounts', auth_1.authenticateToken, finance_1.createBankAccount);
// 9.8 Reports & Analytics Aggregate Routes
app.get('/api/reports/sales', auth_1.authenticateToken, reports_1.getSalesReport);
app.get('/api/reports/purchase', auth_1.authenticateToken, reports_1.getPurchaseReport);
app.get('/api/reports/inventory', auth_1.authenticateToken, reports_1.getInventoryReport);
app.get('/api/reports/hr', auth_1.authenticateToken, reports_1.getHrReport);
app.get('/api/reports/financial', auth_1.authenticateToken, reports_1.getFinancialReport);
// Automated Seeding Function to ensure feature keys exist and are mapped to companies
async function seedDatabase() {
    try {
        console.log("🌱 [Database Seeding] Ensuring all feature keys exist...");
        for (const item of controllers_4.HIERARCHICAL_FEATURES) {
            await db_1.default.feature.upsert({
                where: { key: item.key },
                update: { name: item.name, description: item.description },
                create: { key: item.key, name: item.name, description: item.description }
            });
        }
        console.log("🌱 [Database Seeding] Mapping new administration, master data & sales features to existing companies...");
        const coreFeatures = await db_1.default.feature.findMany({
            where: {
                key: {
                    in: [
                        "ADMINISTRATION",
                        "ADMIN_PROFILE",
                        "ADMIN_ROLES",
                        "ADMIN_AUDIT",
                        "ADMIN_BACKUP",
                        "ADMIN_USERS",
                        "ADMIN_DEPARTMENTS",
                        "MASTER_DATA",
                        "MASTER_EMPLOYEE",
                        "MASTER_CUSTOMER",
                        "MASTER_VENDOR",
                        "MASTER_PRODUCT",
                        "MASTER_TAX",
                        "SALES_DATA",
                        "SALES_ORDER",
                        "SALES_PROFORMA",
                        "SALES_INVOICE",
                        "SALES_CHALLAN",
                        "SALES_DISPATCH",
                        "SALES_QUOTATION",
                        "SALES_POST_SERVICE",
                        "SALES_PDF_EDITOR",
                        "CRM_DATA",
                        "CRM_LEAD",
                        "CRM_OPPORTUNITY",
                        "CRM_FOLLOWUP",
                        "CRM_DASHBOARD",
                        "PURCHASE_DATA",
                        "PURCHASE_ORDER",
                        "PURCHASE_VENDOR_QUOTE",
                        "PURCHASE_GRN",
                        "PURCHASE_RETURN",
                        "PURCHASE_PAYMENT",
                        "INVENTORY_DATA",
                        "INVENTORY_PRODUCT",
                        "INVENTORY_STOCK_OVERVIEW",
                        "INVENTORY_LOW_ALERT",
                        "INVENTORY_FORECASTING",
                        // Phase 2 Modules
                        "HRMS_DATA",
                        "HRMS_EMPLOYEES",
                        "HRMS_ATTENDANCE",
                        "HRMS_LEAVES",
                        "HRMS_SHIFTS",
                        "HRMS_PAYROLL",
                        "FINANCE_DATA",
                        "FINANCE_EXPENSES",
                        "FINANCE_PAYMENTS",
                        "FINANCE_RECEIPTS",
                        "FINANCE_CASHBOOK",
                        "FINANCE_GST",
                        "FINANCE_BANK",
                        "REPORTS_DATA",
                        "REPORTS_SALES",
                        "REPORTS_PURCHASE",
                        "REPORTS_INVENTORY",
                        "REPORTS_HR",
                        "REPORTS_FINANCE",
                        // Phase 2.5 Manufacturing Modules
                        "MANUFACTURING",
                        "MANUFACTURING_BOM",
                        "MANUFACTURING_PLAN",
                        "MANUFACTURING_WORK_ORDER",
                        "MANUFACTURING_PRODUCTION",
                        "MANUFACTURING_QC",
                        "MANUFACTURING_SHOP_FLOOR",
                        "MANUFACTURING_REPORTS",
                        "MANUFACTURING_COSTING"
                    ]
                }
            }
        });
        const companies = await db_1.default.company.findMany();
        for (const company of companies) {
            for (const feature of coreFeatures) {
                const exists = await db_1.default.companyFeature.findFirst({
                    where: { companyId: company.id, featureId: feature.id }
                });
                if (!exists) {
                    await db_1.default.companyFeature.create({
                        data: { companyId: company.id, featureId: feature.id }
                    });
                }
            }
            // Automatically grant default read/write/delete permissions inside "Admin" role
            const adminRole = await db_1.default.role.findFirst({
                where: { companyId: company.id, name: "Admin" }
            });
            if (adminRole) {
                let permissions = {};
                try {
                    permissions = JSON.parse(adminRole.permissions);
                }
                catch {
                    permissions = {};
                }
                permissions.ADMINISTRATION = ["read", "write", "delete"];
                permissions.ADMIN_PROFILE = ["read", "write", "delete"];
                permissions.ADMIN_ROLES = ["read", "write", "delete"];
                permissions.ADMIN_AUDIT = ["read", "write", "delete"];
                permissions.ADMIN_BACKUP = ["read", "write", "delete"];
                permissions.ADMIN_USERS = ["read", "write", "delete"];
                permissions.ADMIN_DEPARTMENTS = ["read", "write", "delete"];
                permissions.MASTER_DATA = ["read", "write", "delete"];
                permissions.MASTER_EMPLOYEE = ["read", "write", "delete"];
                permissions.MASTER_CUSTOMER = ["read", "write", "delete"];
                permissions.MASTER_VENDOR = ["read", "write", "delete"];
                permissions.MASTER_PRODUCT = ["read", "write", "delete"];
                permissions.MASTER_TAX = ["read", "write", "delete"];
                permissions.SALES_DATA = ["read", "write", "delete"];
                permissions.SALES_ORDER = ["read", "write", "delete"];
                permissions.SALES_PROFORMA = ["read", "write", "delete"];
                permissions.SALES_INVOICE = ["read", "write", "delete"];
                permissions.SALES_CHALLAN = ["read", "write", "delete"];
                permissions.SALES_DISPATCH = ["read", "write", "delete"];
                permissions.SALES_QUOTATION = ["read", "write", "delete"];
                permissions.SALES_POST_SERVICE = ["read", "write", "delete"];
                permissions.SALES_PDF_EDITOR = ["read", "write", "delete"];
                permissions.CRM_DATA = ["read", "write", "delete"];
                permissions.CRM_LEAD = ["read", "write", "delete"];
                permissions.CRM_OPPORTUNITY = ["read", "write", "delete"];
                permissions.CRM_FOLLOWUP = ["read", "write", "delete"];
                permissions.CRM_DASHBOARD = ["read", "write", "delete"];
                permissions.PURCHASE_DATA = ["read", "write", "delete"];
                permissions.PURCHASE_ORDER = ["read", "write", "delete"];
                permissions.PURCHASE_VENDOR_QUOTE = ["read", "write", "delete"];
                permissions.PURCHASE_GRN = ["read", "write", "delete"];
                permissions.PURCHASE_RETURN = ["read", "write", "delete"];
                permissions.PURCHASE_PAYMENT = ["read", "write", "delete"];
                permissions.INVENTORY_DATA = ["read", "write", "delete"];
                permissions.INVENTORY_PRODUCT = ["read", "write", "delete"];
                permissions.INVENTORY_STOCK_OVERVIEW = ["read", "write", "delete"];
                permissions.INVENTORY_LOW_ALERT = ["read", "write", "delete"];
                permissions.INVENTORY_FORECASTING = ["read", "write", "delete"];
                // Phase 2 Modules
                permissions.HRMS_DATA = ["read", "write", "delete"];
                permissions.HRMS_EMPLOYEES = ["read", "write", "delete"];
                permissions.HRMS_ATTENDANCE = ["read", "write", "delete"];
                permissions.HRMS_LEAVES = ["read", "write", "delete"];
                permissions.HRMS_SHIFTS = ["read", "write", "delete"];
                permissions.HRMS_PAYROLL = ["read", "write", "delete"];
                permissions.FINANCE_DATA = ["read", "write", "delete"];
                permissions.FINANCE_EXPENSES = ["read", "write", "delete"];
                permissions.FINANCE_PAYMENTS = ["read", "write", "delete"];
                permissions.FINANCE_RECEIPTS = ["read", "write", "delete"];
                permissions.FINANCE_CASHBOOK = ["read", "write", "delete"];
                permissions.FINANCE_GST = ["read", "write", "delete"];
                permissions.FINANCE_BANK = ["read", "write", "delete"];
                permissions.REPORTS_DATA = ["read", "write", "delete"];
                permissions.REPORTS_SALES = ["read", "write", "delete"];
                permissions.REPORTS_PURCHASE = ["read", "write", "delete"];
                permissions.REPORTS_INVENTORY = ["read", "write", "delete"];
                permissions.REPORTS_HR = ["read", "write", "delete"];
                permissions.REPORTS_FINANCE = ["read", "write", "delete"];
                permissions.MANUFACTURING = ["read", "write", "delete"];
                permissions.MANUFACTURING_BOM = ["read", "write", "delete"];
                permissions.MANUFACTURING_PLAN = ["read", "write", "delete"];
                permissions.MANUFACTURING_WORK_ORDER = ["read", "write", "delete"];
                permissions.MANUFACTURING_PRODUCTION = ["read", "write", "delete"];
                permissions.MANUFACTURING_QC = ["read", "write", "delete"];
                permissions.MANUFACTURING_SHOP_FLOOR = ["read", "write", "delete"];
                permissions.MANUFACTURING_REPORTS = ["read", "write", "delete"];
                permissions.MANUFACTURING_COSTING = ["read", "write", "delete"];
                await db_1.default.role.update({
                    where: { id: adminRole.id },
                    data: { permissions: JSON.stringify(permissions) }
                });
            }
        }
        console.log("🌱 [Database Seeding] Seeding completed successfully!");
    }
    catch (error) {
        console.error("❌ [Database Seeding Error] Seeding failed:", error);
    }
}
// Start the Integrated Express + HTTP + WebSockets Server
seedDatabase().then(() => {
    server.listen(port, () => {
        console.log(`\n🚀 ========================================================`);
        console.log(`   ERP backend monolith running on http://localhost:${port}`);
        console.log(`   Realtime WebSockets ready for notifications.`);
        console.log(`   PostgreSQL database connection: ACTIVE.`);
        console.log(`========================================================\n`);
        // Initialize forecasting scheduler and queue worker poll loop
        try {
            (0, forecastScheduler_1.startForecastScheduler)();
            (0, forecast_2.startForecastWorkerLoop)();
            console.log("📈 [AI Forecasting] Scheduler and queue worker started successfully.");
        }
        catch (err) {
            console.error("❌ [AI Forecasting] Failed to start scheduler/worker:", err);
        }
    });
});
//# sourceMappingURL=index.js.map