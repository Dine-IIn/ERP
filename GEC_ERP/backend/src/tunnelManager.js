import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TunnelManager {
  constructor() {
    this.process = null;
    this.status = 'STOPPED'; // 'STOPPED' | 'STARTING' | 'ONLINE' | 'RECONNECTING' | 'ERROR'
    this.publicUrl = 'https://erpdev.manavkalola.xyz';
    this.edgeConnections = [];
    this.lastError = null;
    this.restartAttempts = 0;
    this.shouldAutoRestart = true;
    this.reconnectTimer = null;
  }

  findCloudflaredBinary() {
    // 1. Root of workspace
    const rootPath = path.resolve(__dirname, '../../cloudflared.exe');
    if (fs.existsSync(rootPath)) return rootPath;

    // 2. Relative to backend directory
    const backendRoot = path.resolve(__dirname, '../cloudflared.exe');
    if (fs.existsSync(backendRoot)) return backendRoot;

    // 3. System PATH fallback
    return 'cloudflared.exe';
  }

  start() {
    if (this.process) {
      console.log('⚡ Cloudflare Tunnel supervisor is already running.');
      return;
    }

    const binPath = this.findCloudflaredBinary();
    console.log(`\n======================================================`);
    console.log(`🌐 Initializing Automatic Cloudflare Tunnel Supervisor`);
    console.log(`   Binary: ${binPath}`);
    console.log(`   Public Route: ${this.publicUrl} -> http://localhost:5000`);
    console.log(`======================================================\n`);

    this.status = 'STARTING';
    this.shouldAutoRestart = true;

    try {
      this.process = spawn(binPath, ['--edge-ip-version', '4', 'tunnel', 'run'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
      });

      this.process.stdout.on('data', (data) => this.handleLog(data.toString()));
      this.process.stderr.on('data', (data) => this.handleLog(data.toString()));

      this.process.on('close', (code) => {
        console.warn(`⚠️ Cloudflare Tunnel process exited with code ${code}.`);
        this.process = null;
        this.status = 'STOPPED';
        this.edgeConnections = [];

        if (this.shouldAutoRestart) {
          this.scheduleRestart();
        }
      });

      this.process.on('error', (err) => {
        console.error('❌ Cloudflare Tunnel failed to spawn:', err.message);
        this.lastError = err.message;
        this.status = 'ERROR';
        if (this.shouldAutoRestart) {
          this.scheduleRestart();
        }
      });

    } catch (err) {
      console.error('❌ Error launching Cloudflare Tunnel:', err.message);
      this.lastError = err.message;
      this.status = 'ERROR';
    }
  }

  handleLog(text) {
    const lines = text.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (line.includes('Registered tunnel connection')) {
        this.status = 'ONLINE';
        this.restartAttempts = 0;
        const match = line.match(/location=([a-zA-Z0-9]+)/);
        const loc = match ? match[1] : 'Edge';
        if (!this.edgeConnections.includes(loc)) {
          this.edgeConnections.push(loc);
        }
        console.log(`✅ [Cloudflare Tunnel] Connected to Cloudflare Edge (${loc}) -> ${this.publicUrl}`);
      } else if (line.includes('Failed to dial') || line.includes('Retrying') || line.includes('timeout')) {
        this.status = 'RECONNECTING';
      } else if (line.includes('ERR')) {
        this.lastError = line;
      }
    }
  }

  scheduleRestart() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.restartAttempts++;
    const delay = Math.min(3000 * Math.pow(1.5, Math.min(this.restartAttempts, 5)), 30000);
    this.status = 'RECONNECTING';
    console.log(`🔄 [Cloudflare Tunnel] Auto-reconnect attempt #${this.restartAttempts} in ${(delay / 1000).toFixed(1)}s...`);
    this.reconnectTimer = setTimeout(() => {
      if (this.shouldAutoRestart && !this.process) {
        this.start();
      }
    }, delay);
  }

  stop() {
    this.shouldAutoRestart = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.process) {
      try {
        console.log('🛑 Stopping Cloudflare Tunnel supervisor...');
        this.process.kill('SIGTERM');
      } catch (e) {
        // Ignored
      }
      this.process = null;
    }
    this.status = 'STOPPED';
  }

  getStatus() {
    return {
      status: this.status,
      publicUrl: this.publicUrl,
      edgeConnections: this.edgeConnections,
      lastError: this.lastError,
      isSupervised: true
    };
  }
}

export const tunnelManager = new TunnelManager();
