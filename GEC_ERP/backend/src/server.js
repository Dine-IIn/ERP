import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { pool, isPostgresConnected, initDatabase } from './db.js';
import { sessionManager } from './sessionManager.js';
import { autoUpdater } from './updater.js';
import { hashPassword, verifyPassword } from './auth.js';
import { tunnelManager } from './tunnelManager.js';
import { sendSmtpEmail } from './mailService.js';

const getDirname = () => {
  if (typeof __dirname !== 'undefined' && __dirname) return __dirname;
  try {
    if (typeof import.meta !== 'undefined' && import.meta.url) return path.dirname(fileURLToPath(import.meta.url));
  } catch (e) {}
  return process.cwd();
};
const __dirname = getDirname();

// Load server/.env with fallback to root .env
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, '../../storage');
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '../../backups');
const STATE_FILE = path.join(STORAGE_DIR, 'gec_erp_state.json');
const FRONTEND_DIST = path.join(__dirname, '../../frontend/dist');

// Ensure directories exist
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

// Security & Parsing Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Standard Industrial Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Robust In-Memory Rate Limiter Factory (sliding window)
function createRateLimiter(options = { windowMs: 60000, maxRequests: 300, message: 'Too many requests' }) {
  const ipRequests = new Map(); // ip -> [timestamps]

  // Periodic cleanup of stale timestamps every 2 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of ipRequests.entries()) {
      const valid = timestamps.filter(t => now - t < options.windowMs);
      if (valid.length === 0) {
        ipRequests.delete(ip);
      } else {
        ipRequests.set(ip, valid);
      }
    }
  }, 120000);

  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const now = Date.now();
    const timestamps = (ipRequests.get(ip) || []).filter(t => now - t < options.windowMs);

    if (timestamps.length >= options.maxRequests) {
      const oldest = timestamps[0];
      const retryAfter = Math.ceil((options.windowMs - (now - oldest)) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: options.message || 'Too many requests. Please try again later.',
        retryAfterSeconds: retryAfter
      });
    }

    timestamps.push(now);
    ipRequests.set(ip, timestamps);
    next();
  };
}

// Global General API Rate Limiter (1200 req / minute per IP for high-throughput ERP sync)
const generalLimiter = createRateLimiter({ windowMs: 60000, maxRequests: 1200, message: 'High request rate detected.' });
app.use('/api', generalLimiter);

// Strict Rate Limiter for Heavy / Admin Mutating Endpoints (e.g. Backup, Force Updates)
const strictLimiter = createRateLimiter({ windowMs: 60000, maxRequests: 60, message: 'Too many administrative requests.' });

// RBAC & Admin Verification Middleware
function requireAdmin(req, res, next) {
  const role = req.headers['x-user-role'] || req.body?.role || req.query?.role;
  const isSuperAdmin = req.headers['x-is-superadmin'] === 'true' || req.body?.isSuperAdmin === true;
  const user = req.body?.user || req.body?.username;

  // If role is explicitly provided, verify admin privileges
  if (role && !['Admin', 'SuperAdmin', 'Super Admin'].includes(role) && !isSuperAdmin && user !== 'superadmin' && user !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'Administrative privileges required to perform this action.'
    });
  }
  next();
}

// Helper function to get local Network IPs
function getLocalNetworkIps() {
  const nets = os.networkInterfaces();
  const results = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push(net.address);
      }
    }
  }
  return results.length > 0 ? results : ['127.0.0.1'];
}

// In-Memory state store with persistent file backing
let centralStore = {
  users: [
    { id: 'usr-superadmin', username: 'superadmin', fullName: 'GEC System Super Admin', role: 'Admin', email: 'superadmin@gecmachines.com', isSuperAdmin: true, is_admin: true },
    { id: 'usr-admin', username: 'admin', fullName: 'System Administrator', role: 'Admin', email: 'admin@gecmachines.com', isSuperAdmin: false, is_admin: true }
  ],
  departments: [
    { id: 'dept-1', code: 'PROD', name: 'Production', headName: 'Rajesh Sharma', description: 'Assembly & Machining' },
    { id: 'dept-2', code: 'STORE', name: 'Store & Inventory', headName: 'Manish Patel', description: 'Material Storage' },
    { id: 'dept-3', code: 'QC', name: 'Quality Control', headName: 'Vikram Singh', description: 'Inspection & Compliance' }
  ],
  customRoles: [],
  items: [],
  itemCategories: [],
  customers: [],
  vendors: [],
  vendorCategories: [],
  boms: [],
  salesOrders: [],
  workOrders: [],
  jobCards: [],
  floorStations: [],
  finishedGoods: [],
  dispatchRecords: [],
  jobworks: [],
  purchaseOrders: [],
  grns: [],
  qcInspections: [],
  assemblies: [],
  assemblyStages: [],
  processDefinitions: [],
  itemProcessCards: [],
  vendorDebitChallans: [],
  jobCardMaterialReissues: [],
  intermediateProcessItems: [],
  auditLogs: [],
  quotations: [],
  quotationCounters: {},
  drawings: [],
  drawingReadReceipts: [],
  itemClasses: [],
  smtpConfig: null,
  emailTemplates: [],
  backups: [],
  backupSettings: {
    backupIntervalDays: 2,
    lastBackupDate: null,
    storageLocation: STORAGE_DIR,
    backupLocation: BACKUP_DIR
  }
};

// Load existing state from disk if available
function loadStateFromDisk() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf8');
      const parsed = JSON.parse(data);
      centralStore = { ...centralStore, ...parsed };
      console.log('✅ Loaded central ERP state from persistent disk storage.');
    }
  } catch (err) {
    console.warn('⚠️ Could not load state from disk:', err.message);
  }

  // Ensure all users have salted cryptographic password hashes
  if (Array.isArray(centralStore.users)) {
    let hasUpdated = false;
    centralStore.users = centralStore.users.map(u => {
      let pwdHash = u.password_hash;
      if (!pwdHash) {
        hasUpdated = true;
        if (u.password) pwdHash = hashPassword(u.password);
        else if (u.username === 'superadmin') pwdHash = hashPassword('GEC_SuperAdmin#2026!Secured$');
        else if (u.username === 'admin') pwdHash = hashPassword('admin');
        else pwdHash = hashPassword('password');
      }
      const { password, ...rest } = u;
      return { ...rest, password_hash: pwdHash };
    });
    if (hasUpdated) {
      persistStateToDiskDebounced();
    }
  }
}

// Persist state to disk safely
let saveTimeout = null;
function persistStateToDiskDebounced() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      fs.writeFileSync(STATE_FILE, JSON.stringify(centralStore, null, 2), 'utf8');
    } catch (err) {
      console.error('❌ Failed to save state to disk:', err.message);
    }
  }, 300);
}

loadStateFromDisk();

// Activity Logging Helper
async function logActivity(userId, username, role, action, module, details, req) {
  const ip = req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || '127.0.0.1';
  const logId = `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const timestamp = new Date().toISOString();

  const logEntry = {
    id: logId,
    userId: userId || 'SYSTEM',
    username: username || 'System',
    role: role || 'Admin',
    action,
    module,
    details,
    ipAddress: ip,
    timestamp
  };

  if (!Array.isArray(centralStore.auditLogs)) centralStore.auditLogs = [];
  centralStore.auditLogs.unshift(logEntry);
  if (centralStore.auditLogs.length > 500) centralStore.auditLogs = centralStore.auditLogs.slice(0, 500);

  persistStateToDiskDebounced();

  if (isPostgresConnected) {
    try {
      await pool.query(
        `INSERT INTO user_activity_logs (id, user_id, username, role, action, module, details, ip_address, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [logId, userId || 'SYSTEM', username || 'System', role || 'Admin', action, module, details, ip, timestamp]
      );
    } catch (e) {
      // Ignored
    }
  }
}

// ==========================================
// 1. HEALTHCHECK & SYSTEM STATUS API
// ==========================================
app.get('/api/health', (req, res) => {
  const localIps = getLocalNetworkIps();
  const updaterStatus = autoUpdater.getStatus();
  const tunnelStatus = tunnelManager.getStatus();
  res.json({
    status: 'ONLINE',
    system: 'GEC ERP Enterprise Hybrid Server',
    database: isPostgresConnected ? 'PostgreSQL Connected (Live)' : 'Hybrid High-Speed Cache Mode',
    isPostgresConnected,
    serverIps: localIps,
    primaryServerIp: localIps[0],
    serverPort: PORT,
    serverUrl: `http://${localIps[0]}:${PORT}`,
    storageDirectory: STORAGE_DIR,
    backupDirectory: BACKUP_DIR,
    stateFile: STATE_FILE,
    version: updaterStatus.currentVersion,
    latestVersion: updaterStatus.latestVersion,
    updateAvailable: updaterStatus.updateAvailable,
    activeSessionsCount: updaterStatus.activeSessionsCount,
    tunnel: tunnelStatus,
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// 1.1 ACTIVE SESSION HEARTBEAT & TRACKING API
// ==========================================
app.post('/api/session/heartbeat', (req, res) => {
  const { sessionId, user, platform } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
  sessionManager.recordHeartbeat(sessionId, user, platform, ip);
  res.json({ 
    success: true, 
    activeSessionsCount: sessionManager.getActiveSessionsCount(),
    updateAvailable: autoUpdater.getStatus().updateAvailable,
    latestVersion: autoUpdater.getStatus().latestVersion
  });
});

app.post('/api/session/logout', (req, res) => {
  const { sessionId } = req.body;
  sessionManager.removeSession(sessionId);
  res.json({ success: true, activeSessionsCount: sessionManager.getActiveSessionsCount() });
});

app.get('/api/session/status', (req, res) => {
  res.json({
    success: true,
    activeSessionsCount: sessionManager.getActiveSessionsCount(),
    sessions: sessionManager.getActiveSessions()
  });
});

// ==========================================
// 1.2 AUTOMATED UPDATES API
// ==========================================
app.get('/api/updates/status', (req, res) => {
  res.json({
    success: true,
    ...autoUpdater.getStatus()
  });
});

app.post('/api/updates/check-now', async (req, res) => {
  const result = await autoUpdater.checkForUpdates();
  res.json({ success: true, ...result, ...autoUpdater.getStatus() });
});

app.post('/api/updates/apply-now', strictLimiter, requireAdmin, async (req, res) => {
  const { force } = req.body;
  const result = await autoUpdater.applyUpdate(Boolean(force));
  res.json(result);
});

// ==========================================
// 1.3 DYNAMIC AUTHENTICATION & CREDENTIAL API
// ==========================================
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password, platform, deviceType } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const cleanUser = username.trim().toLowerCase();
    const user = (centralStore.users || []).find(u => u.username && u.username.toLowerCase() === cleanUser);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    // Verify against password_hash or fallback password
    let storedHash = user.password_hash || user.password;
    if (!storedHash) {
      if (cleanUser === 'superadmin') storedHash = hashPassword('GEC_SuperAdmin#2026!Secured$');
      else if (cleanUser === 'admin') storedHash = hashPassword('admin');
      else storedHash = hashPassword('password');
      user.password_hash = storedHash;
      persistStateToDiskDebounced();
    }
    const isValid = verifyPassword(password, storedHash);

    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid username or password. Passwords are case-sensitive.' });
    }

    // Upgrade hash if it was plaintext
    if (user.password && !user.password_hash) {
      user.password_hash = hashPassword(password);
      delete user.password;
      persistStateToDiskDebounced();
    }

    const sessionId = `sess-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    
    // Record active session
    sessionManager.recordHeartbeat(sessionId, { username: user.username, role: user.role }, platform || deviceType || 'desktop', ip);

    // Return sanitized user object
    const safeUser = {
      id: user.id,
      username: user.username,
      fullName: user.fullName || user.username,
      role: user.role || 'Staff',
      email: user.email || '',
      isSuperAdmin: user.isSuperAdmin === true || user.username.toLowerCase() === 'superadmin',
      is_admin: user.is_admin === true || ['Admin', 'SuperAdmin'].includes(user.role)
    };

    logActivity(user.id, user.username, user.role, 'LOGIN', 'AUTHENTICATION', `User ${user.username} logged in successfully`, req);

    return res.json({
      success: true,
      message: `Welcome back, ${safeUser.fullName}!`,
      user: safeUser,
      sessionId
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during authentication.' });
  }
});

app.post('/api/auth/change-password', (req, res) => {
  try {
    const { userId, username, currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ success: false, message: 'New password must be at least 4 characters long.' });
    }

    const user = (centralStore.users || []).find(u => 
      (userId && u.id === userId) || (username && u.username && u.username.toLowerCase() === username.trim().toLowerCase())
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // If currentPassword is provided, verify it first
    if (currentPassword) {
      const storedHash = user.password_hash || user.password;
      if (!verifyPassword(currentPassword, storedHash)) {
        return res.status(401).json({ success: false, message: 'Current password does not match.' });
      }
    }

    user.password_hash = hashPassword(newPassword);
    delete user.password;
    persistStateToDiskDebounced();

    logActivity(user.id, user.username, user.role, 'PASSWORD_CHANGE', 'AUTHENTICATION', `Password changed for user ${user.username}`, req);

    return res.json({ success: true, message: 'Password updated successfully!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/auth/create-user', requireAdmin, (req, res) => {
  try {
    const { username, password, fullName, role, email, isSuperAdmin } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const cleanUser = username.trim().toLowerCase();
    if ((centralStore.users || []).some(u => u.username && u.username.toLowerCase() === cleanUser)) {
      return res.status(400).json({ success: false, message: 'Username already exists.' });
    }

    const newUser = {
      id: `usr-${Date.now()}`,
      username: cleanUser,
      fullName: fullName || username,
      role: role || 'Staff',
      email: email || '',
      isSuperAdmin: Boolean(isSuperAdmin),
      is_admin: role === 'Admin' || Boolean(isSuperAdmin),
      password_hash: hashPassword(password)
    };

    centralStore.users = [newUser, ...(centralStore.users || [])];
    persistStateToDiskDebounced();

    logActivity(newUser.id, newUser.username, newUser.role, 'USER_CREATE', 'USER_MANAGEMENT', `New user ${newUser.username} created`, req);

    const safeUser = { ...newUser };
    delete safeUser.password_hash;
    delete safeUser.password;

    return res.json({ success: true, user: safeUser, message: 'User created successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 2. COMPREHENSIVE SYNC API (Bootstrap & State)
// ==========================================
// GET /api/sync/all - Send full central dataset to client (passwords sanitized)
app.get('/api/sync/all', (req, res) => {
  const sanitizedUsers = (centralStore.users || []).map(u => {
    const { password, password_hash, ...safe } = u;
    return safe;
  });

  res.json({
    success: true,
    data: {
      ...centralStore,
      users: sanitizedUsers
    },
    serverTime: new Date().toISOString(),
    message: 'Central GEC ERP state synchronized successfully.'
  });
});

// POST /api/sync/save-all - Client bulk syncs entire state
app.post('/api/sync/save-all', strictLimiter, (req, res) => {
  try {
    const payload = req.body;
    if (payload && typeof payload === 'object') {
      Object.keys(payload).forEach(key => {
        if (key === 'users' && Array.isArray(payload.users)) {
          const existingUsersMap = new Map((centralStore.users || []).map(u => [u.id || u.username, u]));
          centralStore.users = payload.users.map(newUser => {
            const existing = existingUsersMap.get(newUser.id) || existingUsersMap.get(newUser.username);
            let pwdHash = newUser.password_hash || existing?.password_hash;
            if (!pwdHash) {
              if (newUser.password) pwdHash = hashPassword(newUser.password);
              else if (newUser.username === 'superadmin') pwdHash = hashPassword('GEC_SuperAdmin#2026!Secured$');
              else if (newUser.username === 'admin') pwdHash = hashPassword('admin');
              else pwdHash = hashPassword('password');
            }
            const { password, ...rest } = newUser;
            return { ...rest, password_hash: pwdHash };
          });
        } else if (Array.isArray(payload[key]) || (payload[key] && typeof payload[key] === 'object')) {
          centralStore[key] = payload[key];
        }
      });
      persistStateToDiskDebounced();
      return res.json({ success: true, message: 'Central database updated successfully.' });
    }
    res.status(400).json({ success: false, message: 'Invalid payload format.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/sync/entity - Client syncs single collection (e.g. items, workOrders, jobCards)
app.post('/api/sync/entity', (req, res) => {
  try {
    const { entity, data } = req.body;
    if (!entity || !data) {
      return res.status(400).json({ success: false, message: 'Missing entity or data.' });
    }
    if (entity === 'users' && Array.isArray(data)) {
      const existingUsersMap = new Map((centralStore.users || []).map(u => [u.id || u.username, u]));
      centralStore.users = data.map(newUser => {
        const existing = existingUsersMap.get(newUser.id) || existingUsersMap.get(newUser.username);
        let pwdHash = newUser.password_hash || existing?.password_hash;
        if (!pwdHash) {
          if (newUser.password) pwdHash = hashPassword(newUser.password);
          else if (newUser.username === 'superadmin') pwdHash = hashPassword('GEC_SuperAdmin#2026!Secured$');
          else if (newUser.username === 'admin') pwdHash = hashPassword('admin');
          else pwdHash = hashPassword('password');
        }
        const { password, ...rest } = newUser;
        return { ...rest, password_hash: pwdHash };
      });
    } else {
      centralStore[entity] = data;
    }
    persistStateToDiskDebounced();
    res.json({ success: true, entity, count: Array.isArray(data) ? data.length : 1 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/sync/mutate - Client pushes single record mutation (Upsert or Delete)
app.post('/api/sync/mutate', (req, res) => {
  try {
    const { entity, action, item, id } = req.body;
    if (!entity) {
      return res.status(400).json({ success: false, message: 'Missing entity name.' });
    }

    if (!Array.isArray(centralStore[entity])) {
      centralStore[entity] = [];
    }

    const targetId = id || (item ? item.id : null);

    if (action === 'DELETE') {
      if (targetId) {
        centralStore[entity] = centralStore[entity].filter(x => x.id !== targetId);
      }
    } else {
      // UPSERT
      if (item && targetId) {
        let processedItem = item;
        if (entity === 'users') {
          const existing = (centralStore.users || []).find(x => x.id === targetId || x.username === item.username);
          let pwdHash = item.password_hash || existing?.password_hash;
          if (!pwdHash) {
            if (item.password) pwdHash = hashPassword(item.password);
            else if (item.username === 'superadmin') pwdHash = hashPassword('GEC_SuperAdmin#2026!Secured$');
            else if (item.username === 'admin') pwdHash = hashPassword('admin');
            else pwdHash = hashPassword('password');
          }
          const { password, ...rest } = item;
          processedItem = { ...rest, password_hash: pwdHash };
        }
        const idx = centralStore[entity].findIndex(x => x.id === targetId);
        if (idx >= 0) {
          centralStore[entity][idx] = processedItem;
        } else {
          centralStore[entity].push(processedItem);
        }
      }
    }

    persistStateToDiskDebounced();
    res.json({ success: true, entity, action, targetId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 2.5 QUOTATION MODULE API (Central Sequence & Storage)
// ==========================================
// GET /api/quotations/next-number - Atomic Next Financial Year Quote Number
app.get('/api/quotations/next-number', (req, res) => {
  try {
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentYear = today.getFullYear();
    const startYear = currentMonth >= 4 ? currentYear : currentYear - 1;
    const endYear = startYear + 1;
    const fy = `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;

    if (!centralStore.quotationCounters) centralStore.quotationCounters = {};
    if (!centralStore.quotationCounters[fy]) centralStore.quotationCounters[fy] = 1;

    const currentCounter = centralStore.quotationCounters[fy];
    const formattedCounter = String(currentCounter).padStart(4, '0');
    const quoteNo = `${fy}/${formattedCounter}`;

    res.json({
      success: true,
      financialYear: fy,
      counter: currentCounter,
      quoteNo: quoteNo
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/quotations/save - Save or update quotation and increment sequence atomically
app.post('/api/quotations/save', (req, res) => {
  try {
    const { quoteData, user } = req.body;
    if (!quoteData || !quoteData.quoteNo) {
      return res.status(400).json({ success: false, message: 'Invalid quotation data.' });
    }

    if (!Array.isArray(centralStore.quotations)) {
      centralStore.quotations = [];
    }

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const startYear = currentMonth >= 4 ? currentYear : currentYear - 1;
    const fy = `${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`;

    // Check if updating existing or inserting new
    const existingIndex = centralStore.quotations.findIndex(q => q.quoteNo === quoteData.quoteNo || (quoteData.id && q.id === quoteData.id));
    const quotationRecord = {
      id: existingIndex >= 0 ? centralStore.quotations[existingIndex].id : (quoteData.id || `quote-${Date.now()}`),
      quoteNo: quoteData.quoteNo,
      date: quoteData.date || new Date().toISOString().split('T')[0],
      customerCompany: quoteData.customerCompany || '',
      customerName: quoteData.customerName || '',
      customerMobile: quoteData.customerMobile || '',
      customerCity: quoteData.customerCity || '',
      customerState: quoteData.customerState || '',
      customerAddress: quoteData.customerAddress || '',
      reference: quoteData.reference || '',
      modelId: quoteData.model?.id || quoteData.modelId || '',
      modelName: quoteData.model?.sheet_name || quoteData.modelName || '',
      basePrice: Number(quoteData.basePrice) || 0,
      discountPercent: Number(quoteData.discountPercent) || 0,
      selectedOptions: quoteData.selectedOptions || [],
      customDescription: quoteData.customDescription || null,
      extraDemand: quoteData.extraDemand || '',
      extraAmount: Number(quoteData.extraAmount) || 0,
      totalAmount: Number(quoteData.totalAmount) || 0,
      createdBy: user ? {
        userId: user.id || user.userId,
        username: user.username,
        fullName: user.fullName || user.username,
        role: user.role || 'Staff'
      } : (quoteData.createdBy || { username: 'System', fullName: quoteData.executiveName || 'Admin', role: 'Staff' }),
      createdAt: existingIndex >= 0 ? centralStore.quotations[existingIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: quoteData.status || (existingIndex >= 0 ? centralStore.quotations[existingIndex].status : 'DRAFT'),
      fullData: quoteData
    };

    if (existingIndex >= 0) {
      centralStore.quotations[existingIndex] = quotationRecord;
    } else {
      centralStore.quotations.unshift(quotationRecord);
      // Increment counter for this financial year if new
      if (centralStore.quotationCounters) {
        if (!centralStore.quotationCounters[fy]) centralStore.quotationCounters[fy] = 1;
        centralStore.quotationCounters[fy] += 1;
      }
    }

    persistStateToDiskDebounced();

    // Log activity
    logActivity(
      user?.id || 'SYSTEM',
      user?.username || 'System',
      user?.role || 'Staff',
      existingIndex >= 0 ? 'UPDATE_QUOTATION' : 'CREATE_QUOTATION',
      'QUOTATION_MODULE',
      `Quotation ${quotationRecord.quoteNo} for ${quotationRecord.customerCompany || 'Customer'} saved`,
      req
    );

    return res.json({
      success: true,
      quotation: quotationRecord,
      message: `Quotation ${quotationRecord.quoteNo} saved successfully!`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/quotations/list - List all saved quotations
app.get('/api/quotations/list', (req, res) => {
  try {
    const list = centralStore.quotations || [];
    res.json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/quotations/:id - Get single quotation
app.get('/api/quotations/:id', (req, res) => {
  try {
    const { id } = req.params;
    const q = (centralStore.quotations || []).find(item => item.id === id || item.quoteNo === id);
    if (!q) {
      return res.status(404).json({ success: false, message: 'Quotation not found.' });
    }
    res.json({ success: true, quotation: q });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/quotations/:id - Delete quotation
app.delete('/api/quotations/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (!Array.isArray(centralStore.quotations)) {
      return res.status(404).json({ success: false, message: 'Quotation not found.' });
    }
    const idx = centralStore.quotations.findIndex(item => item.id === id || item.quoteNo === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Quotation not found.' });
    }
    const deleted = centralStore.quotations.splice(idx, 1)[0];
    persistStateToDiskDebounced();

    logActivity(
      req.headers['x-user-id'] || 'SYSTEM',
      req.headers['x-username'] || 'System',
      req.headers['x-user-role'] || 'Staff',
      'DELETE_QUOTATION',
      'QUOTATION_MODULE',
      `Quotation ${deleted.quoteNo} deleted`,
      req
    );

    res.json({ success: true, message: `Quotation ${deleted.quoteNo} deleted successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 3. AUDIT TRAIL / LOGS API
// ==========================================
app.get('/api/audit-logs', async (req, res) => {
  if (isPostgresConnected) {
    try {
      const { rows } = await pool.query('SELECT * FROM user_activity_logs ORDER BY created_at DESC LIMIT 300');
      return res.json({ success: true, logs: rows });
    } catch (err) {
      // fallback
    }
  }
  res.json({ success: true, logs: centralStore.auditLogs || [] });
});

app.post('/api/audit-logs', async (req, res) => {
  try {
    const { userId, username, role, action, module, details } = req.body;
    await logActivity(userId, username, role, action, module, details, req);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 4. BACKUP SYSTEM API (Manual & Scheduled)
// ==========================================
async function performBackup(backupType = 'MANUAL') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `GEC_ERP_BACKUP_${timestamp}.json`;
  const filePath = path.join(BACKUP_DIR, fileName);

  const jsonStr = JSON.stringify(centralStore, null, 2);
  fs.writeFileSync(filePath, jsonStr, 'utf8');
  const stats = fs.statSync(filePath);
  const sizeKb = Math.round(stats.size / 1024);

  const backupRecord = {
    id: `bak-${Date.now()}`,
    fileName,
    filePath,
    fileSizeKb: sizeKb,
    backupType,
    status: 'SUCCESS',
    createdAt: new Date().toISOString()
  };

  if (!Array.isArray(centralStore.backups)) centralStore.backups = [];
  centralStore.backups.unshift(backupRecord);
  if (!centralStore.backupSettings) centralStore.backupSettings = {};
  centralStore.backupSettings.lastBackupDate = backupRecord.createdAt;

  persistStateToDiskDebounced();

  if (isPostgresConnected) {
    try {
      await pool.query(
        `INSERT INTO backups (id, file_name, file_path, file_size_kb, backup_type, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [backupRecord.id, fileName, filePath, sizeKb, backupType, 'SUCCESS', backupRecord.createdAt]
      );
    } catch (e) {
      // Ignored
    }
  }

  return backupRecord;
}

app.post('/api/backup/now', strictLimiter, requireAdmin, async (req, res) => {
  try {
    const record = await performBackup('MANUAL');
    await logActivity(req.body.userId, req.body.username, req.body.role || 'Admin', 'CREATE_BACKUP', 'Backup Management', `Created manual backup file ${record.fileName} (${record.fileSizeKb} KB)`, req);
    res.json({ success: true, message: `Backup created successfully! File: ${record.fileName}`, backup: record });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Backup creation failed: ' + err.message });
  }
});

app.get('/api/backup/list', async (req, res) => {
  res.json({ success: true, backups: centralStore.backups || [] });
});

// Periodic automated backup scheduler
setInterval(async () => {
  const intervalDays = centralStore.backupSettings?.backupIntervalDays || 2;
  const lastBackup = centralStore.backupSettings?.lastBackupDate ? new Date(centralStore.backupSettings.lastBackupDate) : null;
  const now = new Date();

  if (!lastBackup || (now.getTime() - lastBackup.getTime()) > (intervalDays * 86400000)) {
    console.log(`⏰ Running scheduled automated backup (${intervalDays}-day cycle)...`);
    try {
      await performBackup('SCHEDULED');
      console.log('✅ Automated periodic backup completed successfully.');
    } catch (e) {
      console.error('❌ Scheduled backup error:', e.message);
    }
  }
}, 12 * 60 * 60 * 1000);

// ==========================================
// 4.5 SYSTEM RESET & DATABASE WIPE API
// ==========================================
function getFreshInitialStore() {
  return {
    users: [
      {
        id: 'usr-superadmin',
        username: 'superadmin',
        fullName: 'GEC System Super Admin',
        role: 'Admin',
        email: 'superadmin@gecmachines.com',
        isSuperAdmin: true,
        is_admin: true,
        password_hash: hashPassword('GEC_SuperAdmin#2026!Secured$')
      },
      {
        id: 'usr-admin',
        username: 'admin',
        fullName: 'System Administrator',
        role: 'Admin',
        email: 'admin@gecmachines.com',
        isSuperAdmin: false,
        is_admin: true,
        password_hash: hashPassword('admin')
      }
    ],
    departments: [
      { id: 'dept-1', code: 'PROD', name: 'Production', headName: 'Rajesh Sharma', description: 'Assembly & Machining' },
      { id: 'dept-2', code: 'STORE', name: 'Store & Inventory', headName: 'Manish Patel', description: 'Material Storage' },
      { id: 'dept-3', code: 'QC', name: 'Quality Control', headName: 'Vikram Singh', description: 'Inspection & Compliance' }
    ],
    customRoles: [],
    items: [],
    itemCategories: [],
    customers: [],
    vendors: [],
    vendorCategories: [],
    boms: [],
    salesOrders: [],
    workOrders: [],
    jobCards: [],
    floorStations: [],
    finishedGoods: [],
    dispatchRecords: [],
    jobworks: [],
    purchaseOrders: [],
    grns: [],
    qcInspections: [],
    assemblies: [],
    processDefinitions: [],
    itemProcessCards: [],
    vendorDebitChallans: [],
    jobCardMaterialReissues: [],
    intermediateProcessItems: [],
    auditLogs: [],
    quotations: [],
    quotationCounters: {},
    backups: centralStore.backups || [],
    backupSettings: centralStore.backupSettings || {
      backupIntervalDays: 2,
      lastBackupDate: null,
      storageLocation: STORAGE_DIR,
      backupLocation: BACKUP_DIR
    }
  };
}

// POST /api/admin/reset-inventory - Set all stock levels to 0
app.post('/api/admin/reset-inventory', strictLimiter, requireAdmin, (req, res) => {
  try {
    if (Array.isArray(centralStore.items)) {
      centralStore.items = centralStore.items.map(item => ({
        ...item,
        inHouseStock: 0,
        externalStock: 0,
        pendingQCStock: 0
      }));
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(centralStore, null, 2), 'utf8');
    logActivity(req.body?.userId, req.body?.username, req.body?.role || 'Admin', 'INVENTORY_RESET', 'System Administration', 'All inventory stock levels reset to 0', req);
    res.json({
      success: true,
      message: 'Inventory Reset Complete: All in-house stock, external stock, and pending QC quantities have been set to 0. Item definitions, BOMs, and Process Master data are preserved.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Inventory reset failed: ' + err.message });
  }
});

// POST /api/admin/reset-operational - Reset transactional data, keep master data
app.post('/api/admin/reset-operational', strictLimiter, requireAdmin, (req, res) => {
  try {
    centralStore.salesOrders = [];
    centralStore.workOrders = [];
    centralStore.jobCards = [];
    centralStore.floorStations = [];
    centralStore.finishedGoods = [];
    centralStore.dispatchRecords = [];
    centralStore.jobworks = [];
    centralStore.purchaseOrders = [];
    centralStore.grns = [];
    centralStore.qcInspections = [];
    centralStore.assemblies = [];
    centralStore.quotations = [];
    centralStore.quotationCounters = {};
    centralStore.vendorDebitChallans = [];
    centralStore.jobCardMaterialReissues = [];

    if (Array.isArray(centralStore.items)) {
      centralStore.items = centralStore.items.map(item => ({
        ...item,
        pendingQCStock: 0,
        externalStock: 0
      }));
    }

    fs.writeFileSync(STATE_FILE, JSON.stringify(centralStore, null, 2), 'utf8');
    logActivity(req.body?.userId, req.body?.username, req.body?.role || 'Admin', 'OPERATIONAL_RESET', 'System Administration', 'Operational transactions reset. Master data preserved.', req);
    res.json({
      success: true,
      message: 'System Reset Complete: All operational transactions (Orders, Job Cards, POs, Challans, GRNs, Assembly & QC) have been reset. Item Master, BOMs, Process Master, Customers, Vendors, and Admin accounts are intact.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Operational reset failed: ' + err.message });
  }
});

// POST /api/admin/wipe-database - Full wipe with emergency pre-wipe backup
app.post('/api/admin/wipe-database', strictLimiter, requireAdmin, async (req, res) => {
  try {
    // 1. Create emergency pre-wipe backup snapshot
    let safetyBackup = null;
    try {
      safetyBackup = await performBackup('PRE_WIPE_SAFETY');
    } catch (bkErr) {
      console.warn('⚠️ Safety backup before wipe encountered error:', bkErr.message);
    }

    // 2. Wipe centralStore and reset to pristine state
    centralStore = getFreshInitialStore();
    if (safetyBackup) {
      centralStore.backups = [safetyBackup];
    }

    // 3. Immediately write to persistent storage
    fs.writeFileSync(STATE_FILE, JSON.stringify(centralStore, null, 2), 'utf8');

    logActivity(req.body?.userId, req.body?.username, req.body?.role || 'Admin', 'DATABASE_WIPE', 'System Administration', 'Full database wipe executed. Safety snapshot saved.', req);

    res.json({
      success: true,
      message: 'Full database wipe executed successfully. Default Administrator accounts (superadmin / admin) preserved.',
      safetyBackup: safetyBackup?.fileName || null
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database wipe failed: ' + err.message });
  }
});

// ==========================================
// 4.6 EMAIL & SMTP DISPATCH API
// ==========================================
app.get('/api/mail/config', (req, res) => {
  const cfg = centralStore.smtpConfig || null;
  res.json({ success: true, config: cfg });
});

app.post('/api/mail/config', requireAdmin, (req, res) => {
  try {
    const config = req.body;
    centralStore.smtpConfig = config;
    persistStateToDiskDebounced();
    res.json({ success: true, message: 'SMTP Configuration saved successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/mail/templates', (req, res) => {
  res.json({ success: true, templates: centralStore.emailTemplates || [] });
});

app.post('/api/mail/templates', requireAdmin, (req, res) => {
  try {
    const templates = req.body.templates || [];
    centralStore.emailTemplates = templates;
    persistStateToDiskDebounced();
    res.json({ success: true, message: 'Email Templates updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/mail/send', async (req, res) => {
  try {
    const { recipient, cc, bcc, subject, bodyHtml, docType, docNumber, attachmentPdfBase64, attachmentPdfFilename, additionalFileBase64, additionalFileFilename } = req.body;
    const smtp = centralStore.smtpConfig;
    if (!smtp || !smtp.host || !smtp.authUser) {
      return res.status(400).json({
        success: false,
        message: 'SMTP settings not configured. Please set up SMTP credentials in Security & RBAC.'
      });
    }

    const attachments = [];
    if (attachmentPdfBase64 && attachmentPdfFilename) {
      attachments.push({
        filename: attachmentPdfFilename,
        content: attachmentPdfBase64,
        contentType: 'application/pdf'
      });
    }
    if (additionalFileBase64 && additionalFileFilename) {
      attachments.push({
        filename: additionalFileFilename,
        content: additionalFileBase64,
        contentType: 'application/octet-stream'
      });
    }

    const result = await sendSmtpEmail({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      authUser: smtp.authUser,
      authPass: smtp.authPass,
      fromName: smtp.fromName,
      fromEmail: smtp.fromEmail,
      recipient,
      cc,
      bcc,
      subject,
      bodyHtml,
      attachments
    });

    await logActivity(req.body.userId, req.body.username, req.body.role || 'Staff', 'SEND_EMAIL', docType || 'Email Dispatch', `Sent ${docType} ${docNumber || ''} via email to ${recipient}`, req);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send email: ' + err.message });
  }
});

// ==========================================
// 4.7 ENGINEERING DRAWINGS & REVISION CONTROL API
// ==========================================
app.get('/api/drawings/list', (req, res) => {
  res.json({
    success: true,
    drawings: centralStore.drawings || [],
    readReceipts: centralStore.drawingReadReceipts || []
  });
});

app.post('/api/drawings/save', (req, res) => {
  try {
    const record = req.body;
    if (!Array.isArray(centralStore.drawings)) centralStore.drawings = [];
    const idx = centralStore.drawings.findIndex(d => d.id === record.id || d.itemId === record.itemId);
    if (idx >= 0) {
      centralStore.drawings[idx] = record;
    } else {
      centralStore.drawings.unshift(record);
    }
    persistStateToDiskDebounced();
    res.json({ success: true, message: 'Drawing updated successfully.', drawing: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/drawings/acknowledge', (req, res) => {
  try {
    const { drawingRecordId, itemId, itemCode, itemName, drawingVersionNo, userId, username, userRole } = req.body;
    if (!Array.isArray(centralStore.drawingReadReceipts)) centralStore.drawingReadReceipts = [];
    const receipt = {
      id: `rcpt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      drawingRecordId,
      itemId,
      itemCode,
      itemName,
      drawingVersionNo,
      userId,
      username,
      userRole,
      acknowledgedAt: new Date().toISOString()
    };
    centralStore.drawingReadReceipts.unshift(receipt);
    persistStateToDiskDebounced();
    res.json({ success: true, receipt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 4.8 DYNAMIC ITEM CLASSES API
// ==========================================
app.get('/api/item-classes', (req, res) => {
  res.json({ success: true, itemClasses: centralStore.itemClasses || [] });
});

app.post('/api/item-classes/save', requireAdmin, (req, res) => {
  try {
    const cls = req.body;
    if (!Array.isArray(centralStore.itemClasses)) centralStore.itemClasses = [];
    const idx = centralStore.itemClasses.findIndex(c => c.id === cls.id || c.code.toUpperCase() === cls.code.toUpperCase());
    if (idx >= 0) {
      centralStore.itemClasses[idx] = { ...centralStore.itemClasses[idx], ...cls };
    } else {
      centralStore.itemClasses.push({
        id: cls.id || `cls-${Date.now()}`,
        code: cls.code.toUpperCase().trim(),
        name: cls.name.trim(),
        description: cls.description || '',
        createdAt: new Date().toISOString()
      });
    }
    persistStateToDiskDebounced();
    res.json({ success: true, message: `Item Class "${cls.name}" saved.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/item-classes/delete', requireAdmin, (req, res) => {
  try {
    const { code } = req.body;
    const isUsed = (centralStore.items || []).some(i => (i.category || '').toUpperCase() === (code || '').toUpperCase());
    if (isUsed) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete Class "${code}". It is currently assigned to one or more items in the Item Master.`
      });
    }
    centralStore.itemClasses = (centralStore.itemClasses || []).filter(c => c.code.toUpperCase() !== (code || '').toUpperCase());
    persistStateToDiskDebounced();
    res.json({ success: true, message: `Item Class "${code}" deleted successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 5. STATIC FRONTEND SERVING FOR HYBRID ACCESS
// ==========================================
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
  console.log(`📦 Serving compiled frontend from ${FRONTEND_DIST}`);
}

// Start Server & Initialize Database
app.listen(PORT, '0.0.0.0', async () => {
  const localIps = getLocalNetworkIps();
  console.log(`================================================================`);
  console.log(`🚀 GEC ERP Enterprise Hybrid Backend Server is LIVE!`);
  console.log(`💻 Localhost URL:            http://localhost:${PORT}`);
  localIps.forEach(ip => {
    console.log(`📡 Local Network Access URL: http://${ip}:${PORT}`);
  });
  console.log(`💾 State File:               ${STATE_FILE}`);
  console.log(`📦 Backup Storage Folder:    ${BACKUP_DIR}`);
  console.log(`🌐 Ready for Hybrid Mode (LAN without internet + Domain over internet)`);
  console.log(`================================================================`);
  
  await initDatabase();

  // Automatically start supervised Cloudflare Tunnel
  tunnelManager.start();
});

// Graceful process exit cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down GEC ERP Backend Server...');
  tunnelManager.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  tunnelManager.stop();
  process.exit(0);
});
