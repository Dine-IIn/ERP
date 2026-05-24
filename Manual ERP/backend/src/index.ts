import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import {
  authenticateToken,
  requireSuperAdmin
} from './middlewares/auth';
import {
  requestSignupOTP,
  signup,
  login,
  createCompany,
  updateCompany,
  listCompanyUsers,
  createCompanyAdmin,
  updateCompanyUser,
  deleteCompanyUser,
  listCompanies,
  listPendingSignups,
  approveSignup,
  createRole,
  getCompanyRolesAndUsers,
  listNotifications,
  markAsRead,
  registerPushToken,
  setIoInstance,
  getCompanyProfile,
  updateCompanyProfile,
  listTaxSettings,
  createTaxSetting,
  updateTaxSetting,
  deleteTaxSetting,
  calculateTax,
  listCurrencies,
  createCurrency,
  updateCurrency,
  deleteCurrency,
  getAuditLogs,
  listWorkflows,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  listApprovalRequests,
  createApprovalRequest,
  submitApprovalAction,
  archiveNotification,
  listDocuments,
  uploadDocument,
  addDocumentVersion,
  getBackupLogs,
  triggerBackup,
  restoreBackup,
  getCompanyFeatures,
  toggleCompanyFeature,
  getDashboardLayout,
  saveDashboardLayout,
  toggleUserBackupAccess,
  testEmailConnection,
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment
} from './controllers';
import {
  listChatGroups,
  createChatGroup,
  getChatGroupMessages,
  sendChatGroupMessage,
  manageChatGroupMembers,
  updateChatGroupSettings,
  getCompanyChatStats
} from './controllers/chat';
import mdmRouter from './controllers/mdm';
import financeRouter, { setFinanceIo } from './controllers/finance';
import {
  listStoreDocs,
  createStoreDoc,
  bulkCreateStoreDocs,
  updateStoreDoc,
  deleteStoreDoc
} from './controllers';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Production security and performance middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // standard API server does not serve HTML pages that need CSP
}));
app.use(compression());

// Define whitelisted production origins for CORS
const allowedOrigins = [
  'https://erp.anbindustries.com',
  'http://localhost:5173',
  'http://localhost:5000',
  'http://localhost:3000',
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.includes(origin) || 
                      origin.endsWith('.vercel.app') || 
                      /^http:\/\/localhost:\d+$/.test(origin);
                      
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};

// Enable CORS and JSON parsing middleware
app.use(cors(corsOptions));
app.use(express.json());

// Set up rate limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  message: { error: 'Too many authentication attempts from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/', authLimiter);

// Serve static assets for uploads and backups
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/backups', express.static(path.join(process.cwd(), 'backups')));

// Setup HTTP and WebSockets
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed = allowedOrigins.includes(origin) || 
                        origin.endsWith('.vercel.app') || 
                        /^http:\/\/localhost:\d+$/.test(origin);
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket']
});

// Share Socket.io instance with controllers
setIoInstance(io);
setFinanceIo(io);

// WebSocket Connection Handler for Realtime Dashboard Popups
io.on('connection', (socket) => {
  console.log(`🔌 [WebSocket] Client connected: ${socket.id}`);

  // When a user authenticates on the client, they join their personal private room
  socket.on('join', (userId: string) => {
    socket.join(userId);
    console.log(`👤 [WebSocket] User ${userId} joined their private notification room.`);
  });

  // When a user enters a chat room, they join its Socket.io channel
  socket.on('join_group', (groupId: string) => {
    socket.join(`group_${groupId}`);
    console.log(`💬 [WebSocket] Client ${socket.id} joined Chat Group room: group_${groupId}`);
  });

  socket.on('leave_group', (groupId: string) => {
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
app.post('/api/auth/otp-request', requestSignupOTP);
app.post('/api/auth/signup', signup);
app.post('/api/auth/login', login);

// 2. Super Admin Routes (Create Companies & Manage Global Tiers)
app.post('/api/super/company', authenticateToken, requireSuperAdmin, createCompany);
app.get('/api/super/companies', authenticateToken, requireSuperAdmin, listCompanies);
app.patch('/api/super/company/:id', authenticateToken, requireSuperAdmin, updateCompany);
app.get('/api/super/company/:id/users', authenticateToken, requireSuperAdmin, listCompanyUsers);
app.post('/api/super/company/:id/admins', authenticateToken, requireSuperAdmin, createCompanyAdmin);
app.patch('/api/super/company/:id/users/:userId', authenticateToken, requireSuperAdmin, updateCompanyUser);
app.delete('/api/super/company/:id/users/:userId', authenticateToken, requireSuperAdmin, deleteCompanyUser);

// 3. Company Admin Routes (Approvals & RBAC Configurations)
app.get('/api/admin/pending-signups', authenticateToken, listPendingSignups);
app.post('/api/admin/approve', authenticateToken, approveSignup);
app.post('/api/admin/role', authenticateToken, createRole);
app.get('/api/admin/dashboard', authenticateToken, getCompanyRolesAndUsers);

// 4. Integrated Multi-Channel Notifications Routes
app.get('/api/notifications', authenticateToken, listNotifications);
app.patch('/api/notifications/:id/read', authenticateToken, markAsRead);
app.post('/api/notifications/register-token', authenticateToken, registerPushToken);

// 5. Enterprise Real-time Chat & Expense Spaces Routes
app.get('/api/chat/groups', authenticateToken, listChatGroups);
app.get('/api/chat/stats', authenticateToken, getCompanyChatStats);
app.post('/api/chat/group', authenticateToken, createChatGroup);
app.get('/api/chat/group/:groupId/messages', authenticateToken, getChatGroupMessages);
app.post('/api/chat/group/:groupId/message', authenticateToken, sendChatGroupMessage);
app.post('/api/chat/group/:groupId/members', authenticateToken, manageChatGroupMembers);
app.patch('/api/chat/group/:groupId/settings', authenticateToken, updateChatGroupSettings);
// 6. General Administration Module Routes

// Company Profile Management
app.get('/api/admin/company/profile', authenticateToken, getCompanyProfile);
app.patch('/api/admin/company/profile', authenticateToken, updateCompanyProfile);

// GST / Tax Settings
app.get('/api/admin/tax/settings', authenticateToken, listTaxSettings);
app.post('/api/admin/tax/setting', authenticateToken, createTaxSetting);
app.patch('/api/admin/tax/setting/:id', authenticateToken, updateTaxSetting);
app.delete('/api/admin/tax/setting/:id', authenticateToken, deleteTaxSetting);
app.post('/api/admin/tax/calculate', authenticateToken, calculateTax);

// Currency Management
app.get('/api/admin/currencies', authenticateToken, listCurrencies);
app.post('/api/admin/currency', authenticateToken, createCurrency);
app.patch('/api/admin/currency/:id', authenticateToken, updateCurrency);
app.delete('/api/admin/currency/:id', authenticateToken, deleteCurrency);

// Audit Log System
app.get('/api/admin/audit-logs', authenticateToken, getAuditLogs);

// Approval Workflow Engine
app.get('/api/admin/workflows', authenticateToken, listWorkflows);
app.post('/api/admin/workflow', authenticateToken, createWorkflow);
app.patch('/api/admin/workflow/:id', authenticateToken, updateWorkflow);
app.delete('/api/admin/workflow/:id', authenticateToken, deleteWorkflow);
app.get('/api/admin/approvals', authenticateToken, listApprovalRequests);
app.post('/api/admin/approval/request', authenticateToken, createApprovalRequest);
app.post('/api/admin/approval/action', authenticateToken, submitApprovalAction);

// Notification Center (Extended)
app.patch('/api/notifications/:id/archive', authenticateToken, archiveNotification);

// Document Management System
app.get('/api/admin/documents', authenticateToken, listDocuments);
app.post('/api/admin/document/upload', authenticateToken, uploadDocument);
app.post('/api/admin/document/:id/version', authenticateToken, addDocumentVersion);

// Backup & Restore
app.get('/api/admin/backups', authenticateToken, getBackupLogs);
app.post('/api/admin/backup/trigger', authenticateToken, triggerBackup);
app.post('/api/admin/backup/restore', authenticateToken, restoreBackup);
app.patch('/api/admin/users/:userId/backup-access', authenticateToken, toggleUserBackupAccess);

// Email Integration Connection Diagnostics
app.post('/api/admin/email/test', authenticateToken, testEmailConnection);

// Department Management CRUD
app.get('/api/admin/departments', authenticateToken, listDepartments);
app.post('/api/admin/departments', authenticateToken, createDepartment);
app.patch('/api/admin/departments/:id', authenticateToken, updateDepartment);
app.delete('/api/admin/departments/:id', authenticateToken, deleteDepartment);

// Feature Toggles (Subscription Control)
app.get('/api/admin/features', authenticateToken, getCompanyFeatures);
app.post('/api/super/feature/toggle', authenticateToken, requireSuperAdmin, toggleCompanyFeature);

// Dashboard Layout Customization
app.get('/api/admin/dashboard/layout', authenticateToken, getDashboardLayout);
app.post('/api/admin/dashboard/layout', authenticateToken, saveDashboardLayout);

// Master Data Management Module Routes
app.use('/api/mdm', authenticateToken, mdmRouter);

// Finance & Accounting Module Routes
app.use('/api/finance', authenticateToken, financeRouter);

// Generic System Document Store Routes (for CRM, HR, operations, email, etc.)
app.get('/api/store/:collection', authenticateToken, listStoreDocs);
app.post('/api/store/:collection', authenticateToken, createStoreDoc);
app.post('/api/store/:collection/bulk', authenticateToken, bulkCreateStoreDocs);
app.put('/api/store/:collection/:id', authenticateToken, updateStoreDoc);
app.patch('/api/store/:collection/:id', authenticateToken, updateStoreDoc);
app.delete('/api/store/:collection/:id', authenticateToken, deleteStoreDoc);


// Start the Integrated Express + HTTP + WebSockets Server
server.listen(port, () => {
  console.log(`\n🚀 ========================================================`);
  console.log(`   ERP backend monolith running on http://localhost:${port}`);
  console.log(`   Realtime WebSockets ready for notifications.`);
  console.log(`   SQLite database connection: ACTIVE.`);
  console.log(`========================================================\n`);
});
