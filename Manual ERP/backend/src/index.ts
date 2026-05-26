import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import {
  authenticateToken,
  requireSuperAdmin
} from './middlewares/auth';
import {
  requestSignupOTP,
  signup,
  login,
  logout,
  updateSelfProfile,
  resetPassword,
  requestForgotPasswordOTP,
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
  archiveNotification,
  getCompanyFeatures,
  toggleCompanyFeature
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

dotenv.config();
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is missing in environment variables');
}
const app = express();
const port = process.env.PORT || 5000;

// Production security and performance middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));
app.use(compression());

// Define whitelisted production origins for CORS
const allowedOrigins = [
  'http://localhost:5173',
  'https://erp.anbindustries.com',
  'https://yourfrontend.vercel.app'
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.includes(origin) ||
                      /^http:\/\/localhost:\d+$/.test(origin) ||
                      origin.startsWith('tauri://') ||
                      origin.startsWith('capacitor://');
                      
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Set up rate limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/', authLimiter);

// Serve static assets for uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Setup HTTP and WebSockets
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed = allowedOrigins.includes(origin) || 
                        /^http:\/\/localhost:\d+$/.test(origin) ||
                        origin.startsWith('tauri://') ||
                        origin.startsWith('capacitor://');
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

io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    socket.data.user = decoded;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

// WebSocket Connection Handler
io.on('connection', (socket) => {
  socket.on('join_group', (groupId: string) => {
    socket.join(`group_${groupId}`);
  });

  socket.on('leave_group', (groupId: string) => {
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
app.post('/api/auth/otp-request', requestSignupOTP);
app.post('/api/auth/signup', signup);
app.post('/api/auth/login', login);
app.post('/api/auth/logout', authenticateToken, logout);
app.patch('/api/auth/profile', authenticateToken, updateSelfProfile);
app.post('/api/auth/reset-password', resetPassword);
app.post('/api/auth/forgot-password-otp', requestForgotPasswordOTP);

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
app.patch('/api/notifications/:id/archive', authenticateToken, archiveNotification);

// 5. Enterprise Real-time Chat & Expense Spaces Routes
app.get('/api/chat/groups', authenticateToken, listChatGroups);
app.get('/api/chat/stats', authenticateToken, getCompanyChatStats);
app.post('/api/chat/group', authenticateToken, createChatGroup);
app.get('/api/chat/group/:groupId/messages', authenticateToken, getChatGroupMessages);
app.post('/api/chat/group/:groupId/message', authenticateToken, sendChatGroupMessage);
app.post('/api/chat/group/:groupId/members', authenticateToken, manageChatGroupMembers);
app.patch('/api/chat/group/:groupId/settings', authenticateToken, updateChatGroupSettings);

import prisma from './services/db';
import { HIERARCHICAL_FEATURES } from './controllers';
import {
  listAuditLogs,
  listBackups,
  triggerBackup,
  downloadBackup,
  updateBackupSettings,
  createUserForAdmin,
  updateUserForAdmin,
  deleteUserForAdmin,
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  updateRolePermissions,
  deleteRoleForAdmin,
  requestBackupOTP,
  deleteBackup,
  restoreBackup
} from './controllers/admin_endpoints';

// 6. General Administration Module Routes (Company Profile & Features Only)
app.get('/api/admin/company/profile', authenticateToken, getCompanyProfile);
app.patch('/api/admin/company/profile', authenticateToken, updateCompanyProfile);
app.get('/api/admin/features', authenticateToken, getCompanyFeatures);
app.post('/api/super/feature/toggle', authenticateToken, requireSuperAdmin, toggleCompanyFeature);

// 7. Advanced Company Administration Console REST APIs (Company Admin Scoped)
app.get('/api/admin/audit-logs', authenticateToken, listAuditLogs);
app.get('/api/admin/backups', authenticateToken, listBackups);
app.post('/api/admin/backups', authenticateToken, triggerBackup);
app.patch('/api/admin/backups/settings', authenticateToken, updateBackupSettings);
app.get('/api/admin/backups/download/:filename', authenticateToken, downloadBackup);
app.post('/api/admin/backups/request-otp', authenticateToken, requestBackupOTP);
app.delete('/api/admin/backups/:filename', authenticateToken, deleteBackup);
app.post('/api/admin/backups/reset', authenticateToken, restoreBackup);

app.post('/api/admin/users', authenticateToken, createUserForAdmin);
app.patch('/api/admin/users/:userId', authenticateToken, updateUserForAdmin);
app.delete('/api/admin/users/:userId', authenticateToken, deleteUserForAdmin);

app.get('/api/admin/departments', authenticateToken, listDepartments);
app.post('/api/admin/departments', authenticateToken, createDepartment);
app.patch('/api/admin/departments/:deptId', authenticateToken, updateDepartment);
app.delete('/api/admin/departments/:deptId', authenticateToken, deleteDepartment);

app.patch('/api/admin/roles/:roleId', authenticateToken, updateRolePermissions);
app.delete('/api/admin/roles/:roleId', authenticateToken, deleteRoleForAdmin);

// Automated Seeding Function to ensure feature keys exist and are mapped to companies
async function seedDatabase() {
  try {
    console.log("🌱 [Database Seeding] Ensuring all feature keys exist...");
    for (const item of HIERARCHICAL_FEATURES) {
      await prisma.feature.upsert({
        where: { key: item.key },
        update: { name: item.name, description: item.description },
        create: { key: item.key, name: item.name, description: item.description }
      });
    }

    console.log("🌱 [Database Seeding] Mapping new administration features to existing companies...");
    const adminFeatures = await prisma.feature.findMany({
      where: {
        key: {
          in: [
            "ADMINISTRATION",
            "ADMIN_PROFILE",
            "ADMIN_ROLES",
            "ADMIN_AUDIT",
            "ADMIN_BACKUP",
            "ADMIN_USERS",
            "ADMIN_DEPARTMENTS"
          ]
        }
      }
    });

    const companies = await prisma.company.findMany();
    for (const company of companies) {
      for (const feature of adminFeatures) {
        const exists = await prisma.companyFeature.findFirst({
          where: { companyId: company.id, featureId: feature.id }
        });
        if (!exists) {
          await prisma.companyFeature.create({
            data: { companyId: company.id, featureId: feature.id }
          });
        }
      }

      // Automatically grant default read/write/delete permissions inside "Admin" role
      const adminRole = await prisma.role.findFirst({
        where: { companyId: company.id, name: "Admin" }
      });
      if (adminRole) {
        let permissions: any = {};
        try {
          permissions = JSON.parse(adminRole.permissions);
        } catch {
          permissions = {};
        }

        permissions.ADMINISTRATION = ["read", "write", "delete"];
        permissions.ADMIN_PROFILE = ["read", "write", "delete"];
        permissions.ADMIN_ROLES = ["read", "write", "delete"];
        permissions.ADMIN_AUDIT = ["read", "write", "delete"];
        permissions.ADMIN_BACKUP = ["read", "write", "delete"];
        permissions.ADMIN_USERS = ["read", "write", "delete"];
        permissions.ADMIN_DEPARTMENTS = ["read", "write", "delete"];

        await prisma.role.update({
          where: { id: adminRole.id },
          data: { permissions: JSON.stringify(permissions) }
        });
      }
    }
    console.log("🌱 [Database Seeding] Seeding completed successfully!");
  } catch (error) {
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
  });
});
