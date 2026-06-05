import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment-specific config file based on NODE_ENV, falling back to standard .env
const nodeEnv = process.env.NODE_ENV || 'development';
const envPath = path.resolve(process.cwd(), `.env.${nodeEnv}`);
dotenv.config({ path: envPath });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log(`🔧 Loaded environment file for environment: "${nodeEnv}"`);

// Load centralized configurations
import { config } from './config';

const app = express();
const port = config.port;

// Serve update binaries statically from the ../bin and ../updates folders
app.use('/bin', express.static(path.join(__dirname, '../bin')));
app.use('/updates', express.static(path.join(__dirname, '../updates')));

interface UpdateInfo {
  latestVersion: string;
  downloadUrl: string;
  tauriUrl: string;
  tauriUpdateSignature: string;
  releaseNotes: string;
}

function getLatestUpdateInfo(req: express.Request, type: 'tauri' | 'backend'): UpdateInfo {
  let updatesDir = '/var/www/updates';
  if (!fs.existsSync(updatesDir)) {
    updatesDir = path.join(__dirname, '../updates');
  }
  const fallbackInfo: UpdateInfo = {
    latestVersion: config.latestVersion,
    downloadUrl: config.downloadUrl,
    tauriUrl: config.downloadUrl,
    tauriUpdateSignature: config.tauriUpdateSignature,
    releaseNotes: config.releaseNotes
  };

  if (!fs.existsSync(updatesDir)) {
    return fallbackInfo;
  }

  try {
    const folders = fs.readdirSync(updatesDir).filter(f => {
      const stats = fs.statSync(path.join(updatesDir, f));
      return stats.isDirectory() && /^v\d+\.\d+\.\d+$/.test(f);
    });

    if (folders.length === 0) {
      return fallbackInfo;
    }

    // Sort folders by version (semver-like descending: e.g. v0.0.2 first)
    folders.sort((a, b) => {
      const partsA = a.substring(1).split('.').map(Number);
      const partsB = b.substring(1).split('.').map(Number);
      for (let i = 0; i < 3; i++) {
        const valA = isNaN(partsA[i]) ? 0 : partsA[i];
        const valB = isNaN(partsB[i]) ? 0 : partsB[i];
        if (valA !== valB) {
          return valB - valA;
        }
      }
      return 0;
    });

    // Find the latest folder that actually contains the requested update files
    let targetFolder = '';
    let latestFolder = '';
    let latestVersion = '';
    let msiFile = '';
    let sigFile = '';
    let zipFile = '';
    let notesFile = '';

    for (const folder of folders) {
      const folderPath = path.join(updatesDir, folder);
      const files = fs.readdirSync(folderPath);
      
      const hasMsi = files.some(f => f.endsWith('.msi'));
      const hasZip = files.some(f => f.endsWith('.zip'));

      if ((type === 'tauri' && hasMsi) || (type === 'backend' && hasZip)) {
        latestFolder = folder;
        latestVersion = folder.substring(1);
        targetFolder = folderPath;
        
        msiFile = files.find(f => f.endsWith('.msi')) || '';
        sigFile = files.find(f => f.endsWith('.msi.sig')) || '';
        zipFile = files.find(f => f.endsWith('.zip')) || '';
        notesFile = files.find(f => f.toLowerCase() === 'release_notes.txt') || '';
        break;
      }
    }

    if (!latestFolder) {
      return fallbackInfo;
    }

    let tauriUpdateSignature = config.tauriUpdateSignature;
    if (sigFile) {
      try {
        tauriUpdateSignature = fs.readFileSync(path.join(targetFolder, sigFile), 'utf-8').trim();
      } catch (err) {
        console.error(`Error reading signature file:`, err);
      }
    }

    let releaseNotes = config.releaseNotes;
    if (notesFile) {
      try {
        releaseNotes = fs.readFileSync(path.join(targetFolder, notesFile), 'utf-8').trim();
      } catch (err) {
        console.error(`Error reading release notes file:`, err);
      }
    }

    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const baseUrl = `${proto}://${req.get('host')}`;

    const tauriUrl = msiFile ? `${baseUrl}/updates/${latestFolder}/${msiFile}` : '';
    const downloadUrl = zipFile ? `${baseUrl}/updates/${latestFolder}/${zipFile}` : '';

    return {
      latestVersion,
      downloadUrl,
      tauriUrl,
      tauriUpdateSignature,
      releaseNotes
    };
  } catch (err) {
    console.error(`Error scanning updates directory:`, err);
    return fallbackInfo;
  }
}

app.use(cors());
app.use(express.json());

// Global Debug Logger Middleware to trace all incoming API calls and responses
app.use((req, res, next) => {
  const start = Date.now();
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(`\n📥 [API REQUEST] [${new Date().toISOString()}] ${req.method} ${req.url} from ${ip}`);
  if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
    console.log(`📦 Request Payload:`, JSON.stringify(req.body, null, 2));
  }
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logPrefix = res.statusCode >= 400 ? '🔴 [ERROR]' : '🟢 [SUCCESS]';
    console.log(`${logPrefix} [API RESPONSE] ${req.method} ${req.url} - Status: ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// In-memory mock database representations for the licensing, discovery, and update registries
const licenseRegistry = new Map<string, { fingerprint: string; companyCode: string; status: 'ACTIVE' | 'EXPIRED' }>();
const discoveryRegistry = new Map<string, { companyName: string; serverUrl: string; status: 'ACTIVE' | 'SUSPENDED' }>();
const clientUpdaterRegistry = new Map<string, {
  companyCode: string;
  companyName: string;
  installedVersion: string;
  latestVersion: string;
  lastUpdateTime: string;
  status: string;
  rollbackStatus: string;
  message: string;
  licenseStatus: string;
}>();

// Developer-managed backend registry (for companies that don't self-host)
const devRegistry = new Map<string, {
  companyCode: string;
  companyName: string;
  backendUrl: string;
  databaseType: string;
  databaseHost: string;
  databaseName: string;
  managedBy: string;
  notes: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}>();


// Seed initial mock licenses from environment configuration or fall back to defaults
try {
  if (config.licenseSeeds) {
    const licenses = JSON.parse(config.licenseSeeds);
    if (Array.isArray(licenses)) {
      licenses.forEach((lic: any) => {
        if (lic.licenseKey && lic.companyCode) {
          licenseRegistry.set(lic.licenseKey, {
            fingerprint: lic.fingerprint || '',
            companyCode: lic.companyCode.toUpperCase(),
            status: lic.status || 'ACTIVE'
          });
        }
      });
      console.log(`🔑 [Seeding] Loaded ${licenses.length} license(s) from environment configuration.`);
    }
  } else {
    // Default fallback seed if none specified
    licenseRegistry.set('ANB-LIC-2026-DEV', { fingerprint: '', companyCode: 'ABC001', status: 'ACTIVE' });
    console.log(`🔑 [Seeding] Loaded default licensing registry fallback.`);
  }
} catch (err) {
  console.error(`🔴 [Seeding Error] Failed to parse LICENSE_SEEDS:`, err);
  licenseRegistry.set('ANB-LIC-2026-DEV', { fingerprint: '', companyCode: 'ABC001', status: 'ACTIVE' });
}

// Seed initial discovery mappings from environment configuration or fall back to defaults
try {
  let loadedCount = 0;

  // 1. Load from DISCOVERY_<COMPANY_CODE> environment variables
  Object.keys(process.env).forEach(key => {
    if (key.startsWith('DISCOVERY_')) {
      const companyCode = key.substring('DISCOVERY_'.length).toUpperCase();
      const serverUrl = process.env[key];
      if (companyCode && serverUrl) {
        discoveryRegistry.set(companyCode, {
          companyName: `${companyCode} Enterprise`,
          serverUrl: serverUrl.trim(),
          status: 'ACTIVE'
        });
        loadedCount++;
        console.log(`🔍 [Env Discovery] Registered company "${companyCode}" from env to target URL: "${serverUrl.trim()}"`);
      }
    }
  });

  // 2. Load from discoverySeeds if specified
  if (config.discoverySeeds) {
    const discovery = JSON.parse(config.discoverySeeds);
    if (Array.isArray(discovery)) {
      discovery.forEach((disc: any) => {
        if (disc.companyCode && disc.serverUrl) {
          discoveryRegistry.set(disc.companyCode.toUpperCase(), {
            companyName: disc.companyName || 'Enterprise Partner',
            serverUrl: disc.serverUrl,
            status: disc.status || 'ACTIVE'
          });
          loadedCount++;
        }
      });
      console.log(`🔍 [Seeding] Loaded ${discovery.length} discovery mapping(s) from DISCOVERY_SEEDS.`);
    }
  }

  // 3. Fall back ONLY if no mappings were loaded at all (and fallbackServerUrl is set)
  if (loadedCount === 0) {
    if (config.fallbackServerUrl) {
      discoveryRegistry.set('ABC001', { companyName: 'ABC Industries', serverUrl: config.fallbackServerUrl, status: 'ACTIVE' });
      console.log(`🔍 [Seeding] Loaded default discovery registry fallback to URL: "${config.fallbackServerUrl}"`);
    } else {
      console.log(`🔍 [Seeding] No discovery mappings loaded and fallbackServerUrl is empty.`);
    }
  }
} catch (err) {
  console.error(`🔴 [Seeding Error] Failed to parse discovery seeds:`, err);
  if (discoveryRegistry.size === 0 && config.fallbackServerUrl) {
    discoveryRegistry.set('ABC001', { companyName: 'ABC Industries', serverUrl: config.fallbackServerUrl, status: 'ACTIVE' });
  }
}

// Ensure SUPERADMIN is registered in discovery mapping
if (!discoveryRegistry.has('SUPERADMIN') && config.fallbackServerUrl) {
  discoveryRegistry.set('SUPERADMIN', {
    companyName: 'Super Admin Console',
    serverUrl: config.fallbackServerUrl,
    status: 'ACTIVE'
  });
  console.log(`🔍 [Static Seeding] Registered static SUPERADMIN mapping to fallback URL: "${config.fallbackServerUrl}"`);
}

// ==================================================
// 1. COMPANY DISCOVERY ROUTE
// ==================================================
app.get('/discovery/:companyCode', (req, res) => {
  const { companyCode } = req.params;
  const match = discoveryRegistry.get(companyCode.toUpperCase());

  if (!match) {
    console.log(`🔍 [Discovery] Failed discovery lookup for code: "${companyCode}"`);
    return res.status(404).json({ error: 'Company code not registered' });
  }

  if (match.status === 'SUSPENDED') {
    return res.status(403).json({ error: 'Company instance access suspended' });
  }

  console.log(`🔍 [Discovery] Resolved code "${companyCode}" to target URL: "${match.serverUrl}"`);
  return res.json({
    companyCode: companyCode.toUpperCase(),
    companyName: match.companyName,
    serverUrl: match.serverUrl,
    status: 'ACTIVE'
  });
});

app.post('/api/discovery', (req, res) => {
  const { companyCode } = req.body;
  if (!companyCode) {
    return res.status(400).json({ success: false, message: 'companyCode parameter is required' });
  }

  const match = discoveryRegistry.get(companyCode.toUpperCase());

  if (!match) {
    console.log(`🔍 [Discovery API] Failed lookup for: "${companyCode}"`);
    return res.status(404).json({ success: false, message: 'Company code not registered' });
  }

  if (match.status === 'SUSPENDED') {
    return res.status(403).json({ success: false, message: 'Company instance access suspended' });
  }

  console.log(`🔍 [Discovery API] Resolved code "${companyCode}" to target URL: "${match.serverUrl}"`);
  return res.json({
    success: true,
    companyName: match.companyName,
    serverUrl: match.serverUrl
  });
});

// ==================================================
// 2. LICENSE ACTIVATION ROUTE
// ==================================================
app.post('/license/activate', (req, res) => {
  const { licenseKey, fingerprint, companyCode, companyName, serverUrl } = req.body;

  if (!licenseKey || !fingerprint) {
    return res.status(400).json({ error: 'licenseKey and machine fingerprint are required' });
  }

  const record = licenseRegistry.get(licenseKey);

  if (!record) {
    // Dynamically provision trial licenses in sandbox mode for validation convenience
    if (licenseKey.startsWith('ANB-TRIAL-')) {
      const parsedCode = companyCode || 'TRIAL001';
      licenseRegistry.set(licenseKey, { fingerprint, companyCode: parsedCode, status: 'ACTIVE' });
      discoveryRegistry.set(parsedCode.toUpperCase(), { 
        companyName: companyName || 'Trial Tenant', 
        serverUrl: serverUrl || config.fallbackServerUrl, 
        status: 'ACTIVE' 
      });
      console.log(`🔑 [Licensing] Provisioned sandbox trial license: "${licenseKey}" for fingerprint: "${fingerprint}"`);
      return res.json({ status: 'VALID', message: 'Trial license activated successfully' });
    }
    return res.status(404).json({ error: 'License key invalid or not found' });
  }

  if (record.fingerprint && record.fingerprint !== fingerprint) {
    console.warn(`🔑 [Licensing] Fingerprint mismatch on activation attempt for key: "${licenseKey}"`);
    return res.status(403).json({ error: 'HW_MISMATCH_ERROR: License key already active on another machine fingerprint' });
  }

  // Bind fingerprint to license record
  record.fingerprint = fingerprint;
  if (companyCode) {
    record.companyCode = companyCode.toUpperCase();
    if (serverUrl) {
      discoveryRegistry.set(companyCode.toUpperCase(), {
        companyName: companyName || 'Enterprise Partner',
        serverUrl,
        status: 'ACTIVE'
      });
    }
  }

  console.log(`🔑 [Licensing] Activated key "${licenseKey}" on motherboard fingerprint: "${fingerprint}"`);
  return res.json({ status: 'VALID', message: 'License key successfully locked and activated' });
});

// ==================================================
// 3. LICENSE HEARTBEAT VALIDATION ROUTE
// ==================================================
app.post('/license/validate', (req, res) => {
  const { licenseKey, fingerprint } = req.body;
  const record = licenseRegistry.get(licenseKey);

  if (!record) {
    return res.status(404).json({ error: 'License key not found' });
  }

  if (record.fingerprint !== fingerprint) {
    console.warn(`🔑 [Licensing] Heartbeat fingerprint mismatch on validation for key: "${licenseKey}"`);
    return res.json({ status: 'HW_MISMATCH_ERROR', error: 'Machine fingerprint does not match registered license.' });
  }

  if (record.status === 'EXPIRED') {
    return res.json({ status: 'EXPIRED', error: 'License has expired.' });
  }

  return res.json({ status: 'VALID', message: 'License validation active.' });
});

// ==================================================
// 4. AUTO-UPDATE INTEGRATION ROUTE
// ==================================================
app.get('/updates/check', (req, res) => {
  const clientVersion = req.query.version as string;
  const updateInfo = getLatestUpdateInfo(req, 'tauri');
  
  if (clientVersion === updateInfo.latestVersion) {
    return res.json({ updateAvailable: false });
  }

  console.log(`📥 [Updates] Update available. Client version: "${clientVersion}" -> Latest: "${updateInfo.latestVersion}"`);
  return res.json({
    updateAvailable: true,
    latestVersion: updateInfo.latestVersion,
    downloadUrl: updateInfo.downloadUrl,
    releaseNotes: updateInfo.releaseNotes
  });
});

app.get('/api/updater/:target/:version', (req, res) => {
  const { target, version } = req.params;
  const updateInfo = getLatestUpdateInfo(req, 'tauri');
  
  if (version === updateInfo.latestVersion) {
    console.log(`📥 [Updater API] Client target "${target}" version "${version}" is up-to-date.`);
    return res.status(204).send(); // 204 No Content
  }

  console.log(`📥 [Updater API] Client target "${target}" version "${version}" needs update to "${updateInfo.latestVersion}".`);
  
  // Return official Tauri 2.0 updater JSON response structure
  return res.json({
    version: updateInfo.latestVersion,
    notes: updateInfo.releaseNotes,
    pub_date: new Date().toISOString(),
    platforms: {
      [target]: {
        signature: updateInfo.tauriUpdateSignature,
        url: updateInfo.tauriUrl
      }
    }
  });
});

// ==================================================
// 5. REMOTE DIAGNOSTICS GATEWAY
// ==================================================
app.post('/diagnostics/telemetry', (req, res) => {
  const { licenseKey, telemetry } = req.body;
  console.log(`📊 [Diagnostics] Received system telemetry from license: "${licenseKey}"`);
  console.log('📊 Telemetry data:', JSON.stringify(telemetry));
  return res.json({ status: 'RECEIVED' });
});

// ==================================================
// 6. CENTRAL ADMINISTRATIVE ROUTING (Proxy Protected)
// ==================================================
function requireAdminSecret(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers['x-central-admin-secret'];
  if (!token || token !== config.centralAdminSecret) {
    console.warn(`🔒 [Security Alert] Unauthorized access attempt to central administration route from ${req.ip}`);
    return res.status(401).json({ error: 'Unauthorized: Invalid central admin secret token' });
  }
  next();
}

// Licenses CRUD
app.get('/admin/licenses', requireAdminSecret, (req, res) => {
  const list = Array.from(licenseRegistry.entries()).map(([key, val]) => ({
    licenseKey: key,
    ...val
  }));
  return res.json(list);
});

app.post('/admin/licenses', requireAdminSecret, (req, res) => {
  const { licenseKey, fingerprint, companyCode, status } = req.body;
  if (!licenseKey) {
    return res.status(400).json({ error: 'licenseKey parameter is required' });
  }
  licenseRegistry.set(licenseKey, {
    fingerprint: fingerprint || '',
    companyCode: (companyCode || '').toUpperCase(),
    status: status || 'ACTIVE'
  });
  console.log(`🔑 [Admin] Saved license registry entry: "${licenseKey}" -> Company: "${companyCode}"`);
  return res.json({ success: true, message: 'License key registry updated successfully' });
});

app.delete('/admin/licenses/:licenseKey', requireAdminSecret, (req, res) => {
  const { licenseKey } = req.params;
  const deleted = licenseRegistry.delete(licenseKey);
  if (deleted) {
    console.log(`🔑 [Admin] Removed license key entry: "${licenseKey}"`);
    return res.json({ success: true, message: 'License key removed from registry' });
  }
  return res.status(404).json({ error: 'License key not found' });
});

// Discovery CRUD
app.get('/admin/discovery', requireAdminSecret, (req, res) => {
  const list = Array.from(discoveryRegistry.entries()).map(([key, val]) => ({
    companyCode: key,
    ...val
  }));
  return res.json(list);
});

app.post('/admin/discovery', requireAdminSecret, (req, res) => {
  const { companyCode, companyName, serverUrl, status } = req.body;
  if (!companyCode || !serverUrl) {
    return res.status(400).json({ error: 'companyCode and serverUrl parameters are required' });
  }
  discoveryRegistry.set(companyCode.toUpperCase(), {
    companyName: companyName || 'Enterprise Partner',
    serverUrl,
    status: status || 'ACTIVE'
  });
  console.log(`🔍 [Admin] Saved discovery registry entry: "${companyCode}" -> "${serverUrl}"`);
  return res.json({ success: true, message: 'Discovery company mapping updated successfully' });
});

app.delete('/admin/discovery/:companyCode', requireAdminSecret, (req, res) => {
  const { companyCode } = req.params;
  const deleted = discoveryRegistry.delete(companyCode.toUpperCase());
  if (deleted) {
    console.log(`🔍 [Admin] Removed discovery entry for code: "${companyCode}"`);
    return res.json({ success: true, message: 'Company discovery mapping removed' });
  }
  return res.status(404).json({ error: 'Company code not registered' });
});

// Dynamic Auto-Updater settings
app.get('/admin/updater', requireAdminSecret, (req, res) => {
  const updateInfo = getLatestUpdateInfo(req, 'tauri');
  return res.json({
    latestVersion: updateInfo.latestVersion,
    downloadUrl: updateInfo.downloadUrl,
    releaseNotes: updateInfo.releaseNotes,
    tauriUpdateSignature: updateInfo.tauriUpdateSignature
  });
});

app.post('/admin/updater', requireAdminSecret, (req, res) => {
  const { latestVersion, downloadUrl, releaseNotes, tauriUpdateSignature } = req.body;
  
  if (latestVersion !== undefined) config.latestVersion = latestVersion;
  if (downloadUrl !== undefined) config.downloadUrl = downloadUrl;
  if (releaseNotes !== undefined) config.releaseNotes = releaseNotes;
  if (tauriUpdateSignature !== undefined) config.tauriUpdateSignature = tauriUpdateSignature;
  
  console.log(`📥 [Admin] Dynamic Auto-Updater registry updated: version="${config.latestVersion}"`);
  return res.json({ success: true, message: 'Auto-Updater release registry settings updated' });
});

// ==================================================
// 7. AUTO-UPDATER TELEMETRY & MONITOR CLIENT ROUTING
// ==================================================
app.get('/api/updater/check', (req, res) => {
  const clientVersion = req.query.version as string || '1.0.0';
  const companyCode = (req.query.companyCode as string || 'UNKNOWN').toUpperCase();
  const companyName = req.query.companyName as string || 'Enterprise Partner';
  const licenseStatus = req.query.licenseStatus as string || 'ACTIVE';

  const updateInfo = getLatestUpdateInfo(req, 'backend');
  const updateAvailable = clientVersion !== updateInfo.latestVersion;
  
  // Register telemetry heartbeat
  const existing = clientUpdaterRegistry.get(companyCode);
  clientUpdaterRegistry.set(companyCode, {
    companyCode,
    companyName,
    installedVersion: clientVersion,
    latestVersion: updateInfo.latestVersion,
    lastUpdateTime: existing?.lastUpdateTime || new Date().toISOString(),
    status: existing?.status || (updateAvailable ? 'PENDING_UPDATE' : 'UP-TO-DATE'),
    rollbackStatus: existing?.rollbackStatus || 'NONE',
    message: existing?.message || 'Standard server checking loop',
    licenseStatus
  });

  return res.json({
    updateAvailable,
    latestVersion: updateInfo.latestVersion,
    downloadUrl: updateInfo.downloadUrl,
    migrationRequired: true,
    sha256: updateInfo.tauriUpdateSignature // Reuse signature parameter as file hash verify
  });
});

app.post('/api/updater/status', (req, res) => {
  const { companyCode, companyName, installedVersion, status, rollbackStatus, message, licenseStatus } = req.body;
  if (!companyCode) {
    return res.status(400).json({ error: 'companyCode is required' });
  }

  const companyCodeUpper = companyCode.toUpperCase();
  const existing = clientUpdaterRegistry.get(companyCodeUpper);
  
  clientUpdaterRegistry.set(companyCodeUpper, {
    companyCode: companyCodeUpper,
    companyName: companyName || existing?.companyName || 'Enterprise Partner',
    installedVersion: installedVersion || existing?.installedVersion || '1.0.0',
    latestVersion: config.latestVersion,
    lastUpdateTime: new Date().toISOString(),
    status: status || existing?.status || 'UNKNOWN',
    rollbackStatus: rollbackStatus || existing?.rollbackStatus || 'NONE',
    message: message || '',
    licenseStatus: licenseStatus || existing?.licenseStatus || 'ACTIVE'
  });

  console.log(`📥 [Telemetry] Status updated for company "${companyCodeUpper}": status="${status}", rollback="${rollbackStatus}"`);
  return res.json({ success: true });
});

app.get('/admin/updater-status', requireAdminSecret, (req, res) => {
  return res.json(Array.from(clientUpdaterRegistry.values()));
});

// ==================================================
// 8. DEVELOPER-MANAGED BACKEND CONFIGS
// ==================================================
app.get('/admin/dev-configs', requireAdminSecret, (req, res) => {
  return res.json(Array.from(devRegistry.values()));
});

app.post('/admin/dev-configs', requireAdminSecret, (req, res) => {
  const { companyCode, companyName, backendUrl, databaseType, databaseHost, databaseName, managedBy, notes, status } = req.body;
  if (!companyCode || !backendUrl) {
    return res.status(400).json({ error: 'companyCode and backendUrl are required' });
  }
  const codeUpper = companyCode.toUpperCase();
  const existing = devRegistry.get(codeUpper);
  devRegistry.set(codeUpper, {
    companyCode: codeUpper,
    companyName: companyName || existing?.companyName || 'Enterprise Partner',
    backendUrl,
    databaseType: databaseType || existing?.databaseType || 'postgresql',
    databaseHost: databaseHost || existing?.databaseHost || '',
    databaseName: databaseName || existing?.databaseName || '',
    managedBy: managedBy || existing?.managedBy || '',
    notes: notes || existing?.notes || '',
    status: status || existing?.status || 'ACTIVE',
    createdAt: existing?.createdAt || new Date().toISOString(),
  });
  // Auto-sync: upsert the discovery registry so routing points to dev backend
  discoveryRegistry.set(codeUpper, {
    companyName: companyName || existing?.companyName || 'Enterprise Partner',
    serverUrl: backendUrl,
    status: status || 'ACTIVE'
  });
  console.log(`🛠️ [Dev Config] Saved dev backend for company "${codeUpper}" → "${backendUrl}"`);
  return res.json({ success: true, message: 'Developer backend config saved and discovery registry synced' });
});

app.delete('/admin/dev-configs/:companyCode', requireAdminSecret, (req, res) => {
  const code = req.params.companyCode.toUpperCase();
  const deleted = devRegistry.delete(code);
  if (deleted) {
    console.log(`🛠️ [Dev Config] Removed dev backend config for: "${code}"`);
    return res.json({ success: true, message: 'Developer backend config removed' });
  }
  return res.status(404).json({ error: 'Dev config not found' });
});


app.listen(port, () => {
  console.log(`\n☁️ ============================================================`);
  console.log(`   ERP Central Services (Licensing, Discovery, Updates)`);
  console.log(`   Running on http://localhost:${port}`);
  console.log(`============================================================\n`);
});
