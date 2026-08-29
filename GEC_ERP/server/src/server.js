import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { pool, isPostgresConnected, initDatabase } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, '../../storage');
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '../../backups');

// Ensure directories exist
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

// Security Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper function to get local Network IP
function getLocalNetworkIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

// In-Memory fallback store for hybrid resilient offline support
const fallbackStore = {
  users: [
    { id: 'usr-superadmin', username: 'superadmin', full_name: 'GEC System Super Admin', role: 'Admin', email: 'superadmin@gecmachines.com', is_super_admin: true, is_admin: true }
  ],
  activityLogs: [],
  backups: [],
  settings: {
    backupIntervalDays: 2,
    lastBackupDate: null,
    storageLocation: STORAGE_DIR,
    backupLocation: BACKUP_DIR
  }
};

// Activity Logging Middleware
async function logActivity(userId, username, role, action, module, details, req) {
  const ip = req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || '127.0.0.1';
  const logId = `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const timestamp = new Date().toISOString();

  if (isPostgresConnected) {
    try {
      await pool.query(
        `INSERT INTO user_activity_logs (id, user_id, username, role, action, module, details, ip_address, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [logId, userId || 'SYSTEM', username || 'System', role || 'Admin', action, module, details, ip, timestamp]
      );
      return;
    } catch (e) {
      console.error('Failed to log activity to PG:', e.message);
    }
  }

  fallbackStore.activityLogs.unshift({
    id: logId,
    userId: userId || 'SYSTEM',
    username: username || 'System',
    role: role || 'Admin',
    action,
    module,
    details,
    ipAddress: ip,
    timestamp
  });
}

// ==========================================
// 1. HEALTHCHECK & SYSTEM STATUS
// ==========================================
app.get('/api/health', (req, res) => {
  const localIp = getLocalNetworkIp();
  res.json({
    status: 'ONLINE',
    system: 'GEC ERP Enterprise Server',
    database: isPostgresConnected ? 'PostgreSQL Connected (Live)' : 'Hybrid Offline Cache Mode',
    serverIp: localIp,
    serverUrl: `http://${localIp}:${PORT}`,
    storageDirectory: STORAGE_DIR,
    backupDirectory: BACKUP_DIR,
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// 2. AUDIT TRAIL / ACTIVITY LOGS API
// ==========================================
app.get('/api/audit-logs', async (req, res) => {
  if (isPostgresConnected) {
    try {
      const { rows } = await pool.query('SELECT * FROM user_activity_logs ORDER BY created_at DESC LIMIT 200');
      return res.json({ success: true, logs: rows });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
  res.json({ success: true, logs: fallbackStore.activityLogs });
});

// ==========================================
// 3. BACKUP SYSTEM API (Manual & Scheduled)
// ==========================================
async function performBackup(backupType = 'MANUAL') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `GEC_ERP_BACKUP_${timestamp}.json`;
  const filePath = path.join(BACKUP_DIR, fileName);

  let dumpData = {};

  if (isPostgresConnected) {
    try {
      const tables = ['users', 'departments', 'custom_roles', 'items', 'customers', 'vendors', 'boms', 'sales_orders', 'work_orders', 'purchase_orders', 'grns', 'jobwork_challans', 'qc_inspections', 'assemblies', 'user_activity_logs'];
      for (const t of tables) {
        const { rows } = await pool.query(`SELECT * FROM ${t}`);
        dumpData[t] = rows;
      }
    } catch (e) {
      dumpData = fallbackStore;
    }
  } else {
    dumpData = fallbackStore;
  }

  const jsonStr = JSON.stringify(dumpData, null, 2);
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

  fallbackStore.backups.unshift(backupRecord);
  fallbackStore.settings.lastBackupDate = backupRecord.createdAt;

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

// Trigger Instant Backup
app.post('/api/backup/now', async (req, res) => {
  try {
    const record = await performBackup('MANUAL');
    await logActivity(req.body.userId, req.body.username, req.body.role || 'Admin', 'CREATE_BACKUP', 'Backup Management', `Created manual backup file ${record.fileName} (${record.fileSizeKb} KB)`, req);
    res.json({ success: true, message: `Backup created successfully! File: ${record.fileName}`, backup: record });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Backup creation failed: ' + err.message });
  }
});

// List All Backups
app.get('/api/backup/list', async (req, res) => {
  if (isPostgresConnected) {
    try {
      const { rows } = await pool.query('SELECT * FROM backups ORDER BY created_at DESC LIMIT 50');
      return res.json({ success: true, backups: rows });
    } catch (e) {
      // fallback
    }
  }
  res.json({ success: true, backups: fallbackStore.backups });
});

// Automated Backup Scheduler (Runs check every 12 hours)
setInterval(async () => {
  const intervalDays = fallbackStore.settings.backupIntervalDays || 2;
  const lastBackup = fallbackStore.settings.lastBackupDate ? new Date(fallbackStore.settings.lastBackupDate) : null;
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
// 4. GENERIC REST SYNC ENDPOINTS
// ==========================================
app.get('/api/sync/all', (req, res) => {
  res.json({
    success: true,
    data: fallbackStore,
    message: 'Central GEC ERP database synced successfully.'
  });
});

// Start Server & Initialize Database
app.listen(PORT, async () => {
  const localIp = getLocalNetworkIp();
  console.log(`================================================================`);
  console.log(`🚀 GEC ERP Enterprise Backend Server is LIVE!`);
  console.log(`📡 Local Network Access URL: http://${localIp}:${PORT}`);
  console.log(`💻 Localhost Access URL:     http://localhost:${PORT}`);
  console.log(`💾 File Storage Directory:   ${STORAGE_DIR}`);
  console.log(`📦 Database Backup Folder:   ${BACKUP_DIR}`);
  console.log(`================================================================`);
  
  await initDatabase();
});
