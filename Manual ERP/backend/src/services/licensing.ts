import { execSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

let licenseValid = false;
let configuredKey = '';

// Helper to resolve workspace paths when running inside packaged binaries
const isPackaged = process.argv[0].endsWith('ERPServer.exe');
const appRoot = isPackaged 
  ? path.dirname(process.execPath) 
  : process.cwd();

// Log directory setup
const logDir = path.resolve(appRoot, '../Data/Logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Meta sidecar path (read by updater.ts to get company identity)
const metaDir = path.resolve(appRoot, '../Data');
const metaPath = path.join(metaDir, 'license-meta.json');

function writeLicenseLog(message: string) {
  const today = new Date().toISOString().split('T')[0];
  const logFilePath = path.join(logDir, `license-${today}.log`);
  const timestamp = new Date().toISOString();
  try {
    fs.appendFileSync(logFilePath, `[${timestamp}] ${message}\n`);
  } catch (err) {
    console.error("Failed to write to license log:", err);
  }
}

/**
 * Writes a small JSON sidecar with company/license identity for use by other services.
 */
function writeLicenseMeta(companyCode: string, licenseStatus: string) {
  try {
    fs.mkdirSync(metaDir, { recursive: true });
    const meta = {
      companyCode: companyCode || process.env.COMPANY_CODE || 'UNKNOWN',
      companyName: process.env.COMPANY_NAME || 'Enterprise Partner',
      licenseKey: configuredKey,
      licenseStatus,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
  } catch (err) {
    // best effort — non-fatal
  }
}

/**
 * Extracts unique motherboard hardware IDs to construct a fingerprint GUID.
 */
export function getHardwareFingerprint(): string {
  try {
    let machineGuid = '';
    let moboUuid = '';
    let biosSerial = '';

    if (process.platform === 'win32') {
      try {
        machineGuid = execSync('reg query HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid')
          .toString()
          .split('REG_SZ')[1]
          .trim();
      } catch {}

      try {
        moboUuid = execSync('wmic csproduct get uuid')
          .toString()
          .replace('UUID', '')
          .trim();
      } catch {}

      try {
        biosSerial = execSync('wmic bios get serialnumber')
          .toString()
          .replace('SerialNumber', '')
          .trim();
      } catch {}
    } else {
      // Unix support fallback
      machineGuid = process.env.HOSTNAME || 'UNIX_HOST';
      moboUuid = 'UNIX_MOBO';
    }

    const rawString = `${machineGuid}-${moboUuid}-${biosSerial}`;
    return crypto.createHash('sha256').update(rawString).digest('hex');
  } catch (error: any) {
    return 'HW_FINGERPRINT_FALLBACK_' + (process.env.COMPUTERNAME || 'NODE_SERVER');
  }
}

/**
 * Initializes and starts the recurring background license checks.
 */
export async function initializeLicensing(licenseKey: string) {
  configuredKey = licenseKey;
  if (!licenseKey) {
    console.warn("⚠️ [Licensing] No License Key configured. ERP running in restricted/unlicensed mode.");
    writeLicenseLog("Warning: No License Key configured.");
    return;
  }

  const fingerprint = getHardwareFingerprint();
  console.log(`🔌 [Licensing] Running licensing validation check. Hardware Fingerprint: "${fingerprint}"`);
  writeLicenseLog(`Run license check. Key: ${licenseKey}, Fingerprint: ${fingerprint}`);

  await validateLicenseOnCentralServer(licenseKey, fingerprint);

  // Run a license check every hour in the background
  setInterval(async () => {
    await validateLicenseOnCentralServer(licenseKey, fingerprint);
  }, 3600000);
}

import { config } from '../config';

async function validateLicenseOnCentralServer(key: string, fingerprint: string) {
  const centralUrl = config.centralUrl;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${centralUrl}/license/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey: key, fingerprint }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json() as any;
      if (data.status === 'VALID') {
        licenseValid = true;
        console.log(`🔌 [Licensing] Heartbeat success. License status: VALID.`);
        writeLicenseLog("Validation success: License is VALID.");
        writeLicenseMeta(data.companyCode || process.env.COMPANY_CODE || 'UNKNOWN', 'ACTIVE');
      } else {
        licenseValid = false;
        console.error(`❌ [Licensing] Validation failed: ${data.error || 'UNAUTHORIZED'}`);
        writeLicenseLog(`Validation failed: ${data.error || 'UNAUTHORIZED'}`);
        writeLicenseMeta(process.env.COMPANY_CODE || 'UNKNOWN', 'INVALID');
      }
    } else {
      console.warn(`⚠️ [Licensing] Central license validation endpoint returned status: ${response.status}`);
      writeLicenseLog(`Server validation error: Code ${response.status}`);
    }
  } catch (error: any) {
    // Graceful offline behavior: If internet is down, let existing validation remain active
    console.warn(`⚠️ [Licensing Connection Failed] Server is offline or central portal is unreachable: ${error.message}. Running on cached license state.`);
    writeLicenseLog(`Server unreachable: ${error.message}. Cached validation preserved.`);
  }
}

export function isLicenseValid(): boolean {
  // Return true if sandbox trial or active validation passes
  if (configuredKey && configuredKey.startsWith('ANB-TRIAL-')) return true;
  return licenseValid;
}
