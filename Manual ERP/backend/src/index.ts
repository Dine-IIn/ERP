import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
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
  setIoInstance
} from './controllers';
import {
  listChatGroups,
  createChatGroup,
  getChatGroupMessages,
  sendChatGroupMessage,
  manageChatGroupMembers,
  updateChatGroupSettings
} from './controllers/chat';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS and JSON parsing middleware
app.use(cors({
  origin: "*", // Enable connection from any dev client port
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// Setup HTTP and WebSockets
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Share Socket.io instance with controllers
setIoInstance(io);

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
app.post('/api/chat/group', authenticateToken, createChatGroup);
app.get('/api/chat/group/:groupId/messages', authenticateToken, getChatGroupMessages);
app.post('/api/chat/group/:groupId/message', authenticateToken, sendChatGroupMessage);
app.post('/api/chat/group/:groupId/members', authenticateToken, manageChatGroupMembers);
app.patch('/api/chat/group/:groupId/settings', authenticateToken, updateChatGroupSettings);


// Start the Integrated Express + HTTP + WebSockets Server
server.listen(port, () => {
  console.log(`\n🚀 ========================================================`);
  console.log(`   ERP backend monolith running on http://localhost:${port}`);
  console.log(`   Realtime WebSockets ready for notifications.`);
  console.log(`   SQLite database connection: ACTIVE.`);
  console.log(`========================================================\n`);
});
