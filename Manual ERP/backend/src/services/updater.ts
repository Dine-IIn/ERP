import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { config } from '../config';

// ============================================================
// CONSTANTS & PATH RESOLUTION
// ============================================================

const currentVersion = '0.0.2';

const isPackaged = process.argv[0].endsWith('ERPServer.exe');
const appRoot = isPackaged
  ? path.dirname(process.execPath)     // e.g.  D:\ERP\App\
  : process.cwd();                      // e.g.  D:\ERP\Manual ERP\backend\

// Directory layout (all relative to appRoot):
//   D:\ERP\App\               <- appRoot (exe lives here)
//   D:\ERP\Data\Logs\         <- persistent logs
//   D:\ERP\Data\Backups\      <- pg_dump snapshots
//   D:\ERP\Updates\           <- staging area for downloaded archives

const dataRoot    = path.resolve(appRoot, '../Data');
const logDir      = path.join(dataRoot, 'Logs');
const backupDir   = path.join(dataRoot, 'Backups');
const updatesDir  = path.resolve(appRoot, '../Updates');

// Ensure directories exist at module load time
for (const dir of [logDir, backupDir, updatesDir]) {
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
}

// ============================================================
// LOGGING
// ============================================================

function log(level: 'INFO' | 'WARN' | 'ERROR', message: string) {
  const today = new Date().toISOString().split('T')[0];
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level}] ${message}\n`;

  console.log(`📥 [Updater] ${line.trim()}`);

  try {
    fs.appendFileSync(path.join(logDir, `updater-${today}.log`), line);
  } catch { /* best effort */ }
}

// ============================================================
// COMPANY / LICENSE META (read from local config file if present)
// ============================================================

interface LocalMeta {
  companyCode: string;
  companyName: string;
  licenseKey: string;
  licenseStatus: string;
}

function readLocalMeta(): LocalMeta {
  // The licensing service writes a small JSON sidecar after successful activation
  const metaPath = path.join(dataRoot, 'license-meta.json');
  try {
    if (fs.existsSync(metaPath)) {
      return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    }
  } catch { /* ignore parse errors */ }
  return {
    companyCode: process.env.COMPANY_CODE || 'UNKNOWN',
    companyName: process.env.COMPANY_NAME || 'Enterprise Partner',
    licenseKey: process.env.LICENSE_KEY || '',
    licenseStatus: 'ACTIVE',
  };
}

// ============================================================
// TELEMETRY HELPERS
// ============================================================

async function reportStatus(
  status: string,
  rollbackStatus: string = 'NONE',
  message: string = ''
) {
  const meta = readLocalMeta();
  try {
    await fetch(`${config.centralUrl}/api/updater/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyCode: meta.companyCode,
        companyName: meta.companyName,
        installedVersion: currentVersion,
        status,
        rollbackStatus,
        message,
        licenseStatus: meta.licenseStatus,
      }),
      signal: AbortSignal.timeout(8000),
    });
    log('INFO', `Telemetry reported: status="${status}" rollback="${rollbackStatus}"`);
  } catch (err: any) {
    log('WARN', `Telemetry report failed (offline?): ${err.message}`);
  }
}

// ============================================================
// DATABASE BACKUP  (pg_dump)
// ============================================================

function runDatabaseBackup(versionLabel: string): string | null {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.startsWith('file:')) {
    log('INFO', 'Skipping pg_dump — no PostgreSQL DATABASE_URL configured.');
    return null;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `erp-backup-${versionLabel}-${stamp}.sql`);

  try {
    log('INFO', `Starting pg_dump → ${backupFile}`);
    execSync(`pg_dump "${dbUrl}" -f "${backupFile}"`, {
      timeout: 120_000,   // 2 minutes max
      windowsHide: true,
      stdio: 'pipe',
    });
    log('INFO', `pg_dump completed successfully → ${backupFile}`);
    return backupFile;
  } catch (err: any) {
    log('ERROR', `pg_dump failed: ${err.message}`);
    return null;
  }
}

// ============================================================
// FILE DOWNLOAD
// ============================================================

async function downloadFile(url: string, destPath: string): Promise<void> {
  log('INFO', `Downloading binary archive from: ${url}`);

  const response = await fetch(url, { signal: AbortSignal.timeout(300_000) }); // 5 min
  if (!response.ok || !response.body) {
    throw new Error(`Download failed: HTTP ${response.status} from ${url}`);
  }

  const fileStream = createWriteStream(destPath);
  // @ts-ignore  — Node 18+ fetch body is a web ReadableStream; pipeline handles it
  await pipeline(response.body, fileStream);

  const { size } = fs.statSync(destPath);
  log('INFO', `Download complete. File size: ${(size / 1024).toFixed(1)} KB → ${destPath}`);
}

// ============================================================
// ARCHIVE EXTRACTION  (PowerShell Expand-Archive, no 7-zip needed)
// ============================================================

function extractArchive(zipPath: string, destDir: string): void {
  log('INFO', `Extracting archive: ${zipPath} → ${destDir}`);

  // Ensure destination exists
  fs.mkdirSync(destDir, { recursive: true });

  execSync(
    `powershell -NoProfile -NonInteractive -WindowStyle Hidden -Command "Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${destDir}' -Force"`,
    { timeout: 120_000, windowsHide: true, stdio: 'pipe' }
  );

  log('INFO', 'Archive extraction complete.');
}

// ============================================================
// SELF-RESTART ORCHESTRATION  (hidden PowerShell script)
// ============================================================

function generateRestartScript(newBinaryPath: string, currentExePath: string, backupFile: string | null): string {
  const scriptPath = path.join(updatesDir, 'apply-update.ps1');

  const logDirEscaped = logDir.replace(/'/g, "''");
  const currentExeEscaped = currentExePath.replace(/'/g, "''");
  const newBinaryEscaped = newBinaryPath.replace(/'/g, "''");
  const backupFileEscaped = (backupFile || '').replace(/'/g, "''");
  
  const port = process.env.PORT || '5000';
  const dbUrlEscaped = (process.env.DATABASE_URL || '').replace(/'/g, "''");
  const centralUrlEscaped = config.centralUrl.replace(/'/g, "''");
  
  const meta = readLocalMeta();
  const companyCodeEscaped = meta.companyCode.replace(/'/g, "''");
  const companyNameEscaped = meta.companyName.replace(/'/g, "''");
  const licenseStatusEscaped = meta.licenseStatus.replace(/'/g, "''");

  const lines: string[] = [
    '# ERP Auto-Update Restart Script - generated by updater.ts',
    '# DO NOT EDIT MANUALLY',
    '',
    '$ErrorActionPreference = "Stop"',
    `$logDir = '${logDirEscaped}'`,
    `$logFile = Join-Path $logDir "apply-update-$((Get-Date).ToString('yyyy-MM-dd')).log"`,
    '',
    'function Write-Log($msg) {',
    "  $line = \"[$(Get-Date -Format 'o')] $msg\"",
    '  Write-Output $line',
    '  Add-Content -Path $logFile -Value $line -Encoding UTF8',
    '}',
    '',
    'Write-Log "=== ERP Apply-Update Script Starting ==="',
    '',
    '# Step 1: Wait for the ERP Server process to fully exit (up to 30 seconds)',
    `$oldExe = '${currentExeEscaped}'`,
    `$exeName = [System.IO.Path]::GetFileNameWithoutExtension($oldExe)`,
    'Write-Log "Waiting for process $exeName to exit..."',
    '$waited = 0',
    'while ((Get-Process -Name $exeName -ErrorAction SilentlyContinue) -and $waited -lt 30) {',
    '  Start-Sleep -Seconds 1',
    '  $waited++',
    '}',
    'Write-Log "Process no longer running (waited $waited seconds)."',
    '',
    '# Step 2: Backup old binary',
    `$newExe = '${newBinaryEscaped}'`,
    '$rollback = "$oldExe.rollback"',
    '',
    'Write-Log "Backing up old binary to: $rollback"',
    'Copy-Item -LiteralPath $oldExe -Destination $rollback -Force',
    '',
    'Write-Log "Copying new binary to: $oldExe"',
    'Copy-Item -LiteralPath $newExe -Destination $oldExe -Force',
    '',
    '# Step 3: Relaunch new binary silently',
    'Write-Log "Relaunching ERP Server..."',
    '$newProc = Start-Process -FilePath $oldExe -WindowStyle Hidden -PassThru',
    '',
    '# Step 4: Health check the new binary',
    `$port = '${port}'`,
    `$healthUrl = "http://localhost:$port/api/health"`,
    'Write-Log "Running health check on new server at $healthUrl..."',
    '$healthPassed = $false',
    '',
    'for ($i = 1; $i -le 6; $i++) {',
    '  Start-Sleep -Seconds 5',
    '  ',
    '  # Check if the process has exited unexpectedly',
    '  if (-not (Get-Process -Id $newProc.Id -ErrorAction SilentlyContinue)) {',
    '    Write-Log "Process has exited or crashed during startup."',
    '    break',
    '  }',
    '  ',
    '  try {',
    '    $response = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 4',
    '    if ($response.status -eq "healthy") {',
    '      Write-Log "Health check passed on attempt $i."',
    '      $healthPassed = $true',
    '      break',
    '    }',
    '  } catch {',
    '    Write-Log "Health check attempt $i/6 failed: $_"',
    '  }',
    '}',
    '',
    'if (-not $healthPassed) {',
    '  Write-Log "Health check failed after 30 seconds. Initiating rollback..."',
    '  ',
    '  # Kill the failed process if it is still running',
    '  $failedProc = Get-Process -Id $newProc.Id -ErrorAction SilentlyContinue',
    '  if ($failedProc) {',
    '    Write-Log "Stopping failed process..."',
    '    Stop-Process -InputObject $failedProc -Force',
    '    Start-Sleep -Seconds 2',
    '  }',
    '  ',
    '  # Restore old binary',
    '  Write-Log "Restoring old binary from $rollback to $oldExe..."',
    '  Copy-Item -LiteralPath $rollback -Destination $oldExe -Force',
    '  ',
    '  # Restore database backup if pg_dump backup exists',
    `  $dbUrl = '${dbUrlEscaped}'`,
    `  $backupFile = '${backupFileEscaped}'`,
    '  if ($dbUrl -and $backupFile -and (Test-Path $backupFile)) {',
    '    Write-Log "Restoring database from backup file: $backupFile"',
    '    try {',
    '      # Use psql to restore the database',
    '      & psql $dbUrl -f $backupFile',
    '      Write-Log "Database restore completed successfully."',
    '    } catch {',
    '      Write-Log "Database restore failed: $_"',
    '    }',
    '  }',
    '  ',
    '  # Report rollback status telemetry to central services',
    `  $telemetryUrl = '${centralUrlEscaped}/api/updater/status'`,
    '  $body = @{',
    `    companyCode = '${companyCodeEscaped}'`,
    `    companyName = '${companyNameEscaped}'`,
    `    installedVersion = '${currentVersion}'`,
    '    status = "UPDATE_FAILED"',
    '    rollbackStatus = "ROLLED_BACK"',
    `    message = "Health check failed. System rolled back to v${currentVersion}."`,
    `    licenseStatus = '${licenseStatusEscaped}'`,
    '  } | ConvertTo-Json',
    '  ',
    '  try {',
    '    Write-Log "Reporting rollback telemetry..."',
    '    Invoke-RestMethod -Uri $telemetryUrl -Method Post -ContentType "application/json" -Body $body -TimeoutSec 8',
    '    Write-Log "Telemetry reported successfully."',
    '  } catch {',
    '    Write-Log "Telemetry reporting failed: $_"',
    '  }',
    '  ',
    '  # Relaunch original binary',
    '  Write-Log "Relaunching original stable binary..."',
    '  Start-Process -FilePath $oldExe -WindowStyle Hidden',
    '  Write-Log "=== Rollback execution completed ==="',
    '} else {',
    '  Write-Log "=== ERP Apply-Update Script Completed Successfully ==="',
    '}'
  ];

  const scriptContent = lines.join('\r\n');
  fs.writeFileSync(scriptPath, scriptContent, 'utf-8');
  log('INFO', `Restart script written → ${scriptPath}`);
  return scriptPath;
}

function launchRestartScript(scriptPath: string): void {
  log('INFO', `Launching hidden PowerShell restart orchestrator: ${scriptPath}`);

  const ps = spawn(
    'powershell',
    [
      '-NoProfile',
      '-NonInteractive',
      '-WindowStyle', 'Hidden',
      '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath,
    ],
    {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    }
  );

  ps.unref(); // Allow the Node process to exit without waiting
  log('INFO', 'PowerShell restart orchestrator detached. Server will restart shortly.');
}

// ============================================================
// CORE UPDATE ORCHESTRATION
// ============================================================

async function applyUpdate(latestVersion: string, downloadUrl: string): Promise<void> {
  const currentExePath = process.execPath; // full path to ERPServer.exe
  const zipDest = path.join(updatesDir, `ERPServer-${latestVersion}.zip`);
  const extractDest = path.join(updatesDir, `ERPServer-${latestVersion}`);

  log('INFO', `=== Beginning update: ${currentVersion} → ${latestVersion} ===`);
  await reportStatus('DOWNLOADING', 'NONE', `Downloading v${latestVersion} binary archive`);

  // 1. Download
  try {
    await downloadFile(downloadUrl, zipDest);
  } catch (err: any) {
    log('ERROR', `Download failed: ${err.message}`);
    await reportStatus('DOWNLOAD_FAILED', 'NONE', err.message);
    return;
  }

  // 2. Database Backup
  await reportStatus('BACKING_UP', 'NONE', 'Running pg_dump database snapshot');
  const backupFile = runDatabaseBackup(currentVersion);
  if (!backupFile && process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('file:')) {
    log('ERROR', 'Database backup failed. Aborting update to protect data integrity.');
    await reportStatus('BACKUP_FAILED', 'NONE', 'pg_dump failed — update aborted for data safety');
    // Clean up downloaded file
    try { fs.unlinkSync(zipDest); } catch {}
    return;
  }

  // 3. Extract
  try {
    extractArchive(zipDest, extractDest);
  } catch (err: any) {
    log('ERROR', `Extraction failed: ${err.message}`);
    await reportStatus('EXTRACT_FAILED', 'NONE', err.message);
    return;
  }

  // 4. Find the new binary inside the extracted folder
  const newBinaryPath = path.join(extractDest, 'ERPServer.exe');
  if (!fs.existsSync(newBinaryPath)) {
    log('ERROR', `New binary not found in extracted archive at: ${newBinaryPath}`);
    await reportStatus('EXTRACT_FAILED', 'NONE', 'ERPServer.exe not found in archive');
    return;
  }

  // 5. Generate & launch the hidden restart script
  await reportStatus('RESTARTING', 'NONE', 'Initiating hidden binary swap and service restart');
  const scriptPath = generateRestartScript(newBinaryPath, currentExePath, backupFile);

  // Give telemetry a moment to send before process exits
  await new Promise(r => setTimeout(r, 1000));

  launchRestartScript(scriptPath);

  // 6. The current Node process will exit naturally because the PS script will
  //    kill and relaunch. We schedule a self-exit after 3 seconds to ensure clean shutdown.
  setTimeout(() => {
    log('INFO', 'Graceful self-exit to allow restart script to take over.');
    process.exit(0);
  }, 3000);
}

// ============================================================
// MAIN UPDATE CHECK LOOP
// ============================================================

async function checkUpdates() {
  const meta = readLocalMeta();
  const centralUrl = config.centralUrl;

  try {
    const url = `${centralUrl}/api/updater/check?version=${encodeURIComponent(currentVersion)}&companyCode=${encodeURIComponent(meta.companyCode)}&companyName=${encodeURIComponent(meta.companyName)}&licenseStatus=${encodeURIComponent(meta.licenseStatus)}`;

    log('INFO', `Checking for updates at: ${url}`);

    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });

    if (!response.ok) {
      log('WARN', `Update check returned HTTP ${response.status}`);
      return;
    }

    const data = await response.json() as any;

    if (!data.updateAvailable) {
      log('INFO', `Server is up-to-date (v${currentVersion}).`);
      await reportStatus('UP-TO-DATE');
      return;
    }

    log('INFO', `Update available: ${currentVersion} → ${data.latestVersion}`);
    log('INFO', `Download URL: ${data.downloadUrl}`);

    // Only apply if running as packaged binary (never run in dev mode)
    if (!isPackaged) {
      log('WARN', 'Running in development mode — skipping automatic binary update. Update would apply in production.');
      await reportStatus('PENDING_UPDATE', 'NONE', `Dev mode: update v${data.latestVersion} detected but not applied`);
      return;
    }

    await applyUpdate(data.latestVersion, data.downloadUrl);

  } catch (error: any) {
    log('WARN', `Update check failed (offline?): ${error.message}`);
    // Don't report this to central — we're likely just offline
  }
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Initializes the auto-updater service.
 * Call once from src/index.ts after server boots.
 */
export async function initializeUpdater() {
  log('INFO', `=== Auto-Updater Service Initialized. Current Version: ${currentVersion} ===`);

  // Report startup telemetry immediately
  await reportStatus('STARTING', 'NONE', `ERP Server v${currentVersion} started`);

  // Run first check after 30 seconds (let the server fully initialize)
  setTimeout(async () => {
    await checkUpdates();
  }, 30_000);

  // Then check every 6 hours
  setInterval(async () => {
    await checkUpdates();
  }, 6 * 60 * 60 * 1000);

  // Report heartbeat every 30 minutes
  setInterval(async () => {
    await reportStatus('RUNNING', 'NONE', 'Periodic heartbeat');
  }, 30 * 60 * 1000);
}

/**
 * Returns the currently installed version string.
 */
export function getInstalledVersion(): string {
  return currentVersion;
}
