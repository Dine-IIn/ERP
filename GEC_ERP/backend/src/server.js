import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { pool, isPostgresConnected, initDatabase } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// 2. COMPREHENSIVE SYNC API (Bootstrap & State)
// ==========================================
// GET /api/sync/all - Send full central dataset to client
app.get('/api/sync/all', (req, res) => {
  res.json({
    success: true,
    data: centralStore,
    serverTime: new Date().toISOString(),
    message: 'Central GEC ERP state synchronized successfully.'
  });
});

// POST /api/sync/save-all - Client bulk syncs entire state
app.post('/api/sync/save-all', (req, res) => {
  try {
    const payload = req.body;
    if (payload && typeof payload === 'object') {
      Object.keys(payload).forEach(key => {
        if (Array.isArray(payload[key]) || (payload[key] && typeof payload[key] === 'object')) {
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
    centralStore[entity] = data;
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
        const idx = centralStore[entity].findIndex(x => x.id === targetId);
        if (idx >= 0) {
          centralStore[entity][idx] = item;
        } else {
          centralStore[entity].push(item);
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

app.post('/api/backup/now', async (req, res) => {
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
});
