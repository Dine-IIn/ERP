// ====================================================================
// GEC ERP - Enterprise Automated Updater & Release Gateway
// ====================================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, execSync } from 'child_process';
import { sessionManager } from './sessionManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const BACKEND_PKG_FILE = path.join(__dirname, '../package.json');
const FRONTEND_PKG_FILE = path.join(__dirname, '../../frontend/package.json');

// Read installed version
function getInstalledVersion() {
  try {
    if (fs.existsSync(FRONTEND_PKG_FILE)) {
      const pkg = JSON.parse(fs.readFileSync(FRONTEND_PKG_FILE, 'utf8'));
      return pkg.version || '1.0.0';
    }
  } catch (e) {
    // fallback
  }
  return '1.0.0';
}

class AutoUpdater {
  constructor() {
    this.currentVersion = getInstalledVersion();
    this.latestVersion = this.currentVersion;
    this.updateAvailable = false;
    this.releaseNotes = '';
    this.publishedAt = '';
    this.isUpdateStaged = false;
    this.lastCheckTime = null;
    this.isUpdating = false;
    this.updateError = null;

    // Check on startup and every 10 minutes
    setTimeout(() => this.checkForUpdates(), 5000);
    setInterval(() => this.checkForUpdates(), 10 * 60 * 1000);

    // Drain watcher: check every 30 seconds if update is staged and sessions reach 0
    setInterval(() => this.checkAndApplyIfDrained(), 30000);
  }

  async checkForUpdates() {
    this.lastCheckTime = new Date().toISOString();
    const token = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN || '';
    const repo = process.env.GITHUB_REPO || 'manavkalola/GEC_ERP'; // default or custom repo

    try {
      const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GEC-ERP-AutoUpdater'
      };
      if (token) {
        headers['Authorization'] = 	oken ;
      }

      // 1. Check GitHub latest release
      const url = https://api.github.com/repos//releases/latest;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });
      
      if (res.ok) {
        const release = await res.json();
        const rawTag = (release.tag_name || release.name || '').replace(/^v/, '').trim();
        if (rawTag) {
          this.latestVersion = rawTag;
          this.releaseNotes = release.body || 'Performance improvements and bug fixes.';
          this.publishedAt = release.published_at || new Date().toISOString();
          
          if (this.compareVersions(this.latestVersion, this.currentVersion) > 0) {
            this.updateAvailable = true;
            this.isUpdateStaged = true;
            console.log(🚀 [AutoUpdater] New release available: v (Current: v));
            return { updateAvailable: true, version: this.latestVersion };
          }
        }
      }
    } catch (err) {
      // Offline / no internet / GitHub rate limit
      this.updateError = err.message;
    }

    this.updateAvailable = false;
    this.isUpdateStaged = false;
    return { updateAvailable: false, version: this.currentVersion };
  }

  compareVersions(v1, v2) {
    const p1 = v1.split('.').map(Number);
    const p2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const num1 = p1[i] || 0;
      const num2 = p2[i] || 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  }

  async checkAndApplyIfDrained() {
    if (!this.isUpdateStaged || this.isUpdating) return;

    const activeSessions = sessionManager.getActiveSessionsCount();
    if (activeSessions === 0) {
      console.log(⚡ [AutoUpdater] Zero active user sessions detected. Applying staged update v...);
      await this.applyUpdate();
    } else {
      console.log(⏳ [AutoUpdater] Update v staged. Waiting for  active session(s) to drain.);
    }
  }

  async applyUpdate(force = false) {
    if (this.isUpdating) return { success: false, message: 'Update already in progress' };

    const activeSessions = sessionManager.getActiveSessionsCount();
    if (activeSessions > 0 && !force) {
      return {
        success: false,
        message: Cannot update now:  user(s) are currently active. Update will apply automatically when sessions end.
      };
    }

    this.isUpdating = true;
    try {
      console.log('🔄 [AutoUpdater] Executing git pull & hot-reload in root directory...');
      
      // Execute git pull
      execSync('git pull origin main', { cwd: ROOT_DIR, stdio: 'pipe' });

      // Update package version cache
      this.currentVersion = getInstalledVersion();
      this.updateAvailable = false;
      this.isUpdateStaged = false;
      this.isUpdating = false;

      // Trigger PM2 reload or graceful exit to restart
      console.log('✅ [AutoUpdater] Update applied successfully. Gracefully reloading PM2...');
      exec('pm2 reload ecosystem.config.json', { cwd: ROOT_DIR }, (err) => {
        if (err) {
          console.log('PM2 not detected or running in node mode. Safe restart complete.');
        }
      });

      return { success: true, version: this.currentVersion };
    } catch (err) {
      this.isUpdating = false;
      console.error('❌ [AutoUpdater] Failed to apply update:', err.message);
      return { success: false, message: err.message };
    }
  }

  getStatus() {
    return {
      currentVersion: this.currentVersion,
      latestVersion: this.latestVersion,
      updateAvailable: this.updateAvailable,
      isUpdateStaged: this.isUpdateStaged,
      releaseNotes: this.releaseNotes,
      publishedAt: this.publishedAt,
      lastCheckTime: this.lastCheckTime,
      activeSessionsCount: sessionManager.getActiveSessionsCount(),
      activeSessions: sessionManager.getActiveSessions(),
      isUpdating: this.isUpdating
    };
  }
}

export const autoUpdater = new AutoUpdater();
