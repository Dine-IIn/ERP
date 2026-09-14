// Dynamic Hybrid API Client for GEC ERP
// Seamlessly operates across Localhost, LAN (192.168.x.x without internet), and Custom Domain (with SSL)

export interface ServerHealthResponse {
  status: string;
  system: string;
  database: string;
  isPostgresConnected: boolean;
  serverIps: string[];
  primaryServerIp: string;
  serverPort: number;
  serverUrl: string;
  storageDirectory: string;
  backupDirectory: string;
  stateFile: string;
  timestamp: string;
}

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:5000';
  }

  // 1. Check environment variable override
  if ((import.meta as any).env?.VITE_API_URL) {
    return ((import.meta as any).env.VITE_API_URL as string).replace(/\/$/, '');
  }

  const { protocol, hostname, port } = window.location;

  // 2. If running on standard Vite dev ports (5173, 3000, 3001), target port 5000 on the same host
  if (port === '5173' || port === '3000' || port === '3001') {
    return `${protocol}//${hostname}:5000`;
  }

  // 3. In production or when served directly by backend or reverse proxy (Caddy, Nginx, Cloudflare, Domain)
  if (port === '5000' || port === '80' || port === '443' || !port) {
    return `${protocol}//${hostname}${port && port !== '80' && port !== '443' ? `:${port}` : ''}`;
  }

  // 4. Default fallback: target backend on port 5000 of the same hostname
  return `${protocol}//${hostname}:5000`;
}

class HybridApiClient {
  private isOnline: boolean = true;
  private lastHealth: ServerHealthResponse | null = null;
  private syncQueue: Array<() => Promise<any>> = [];
  private isSyncingQueue: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.processSyncQueue();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  public getBaseUrl(): string {
    return getApiBaseUrl();
  }

  public getLastHealth(): ServerHealthResponse | null {
    return this.lastHealth;
  }

  // Check health and detect network environment
  public async checkHealth(): Promise<{ online: boolean; mode: 'LAN' | 'CLOUD' | 'LOCALHOST' | 'OFFLINE'; data?: ServerHealthResponse }> {
    try {
      const url = `${this.getBaseUrl()}/api/health`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3000)
      });

      if (res.ok) {
        const data: ServerHealthResponse = await res.json();
        this.lastHealth = data;
        this.isOnline = true;

        const hostname = window.location.hostname;
        let mode: 'LAN' | 'CLOUD' | 'LOCALHOST' | 'OFFLINE' = 'LAN';
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          mode = 'LOCALHOST';
        } else if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
          mode = 'LAN';
        } else {
          mode = 'CLOUD';
        }

        return { online: true, mode, data };
      }
    } catch {
      // Server unreachable
    }

    this.isOnline = false;
    return { online: false, mode: 'OFFLINE' };
  }

  // Full bootstrap state fetch
  public async fetchFullSync(): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const url = `${this.getBaseUrl()}/api/sync/all`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000)
      });

      if (res.ok) {
        const json = await res.json();
        return { success: true, data: json.data };
      }
      return { success: false, message: `Server responded with ${res.status}` };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Network unreachable' };
    }
  }

  // Save entire dataset snapshot
  public async saveFullSync(state: Record<string, any>): Promise<boolean> {
    try {
      const url = `${this.getBaseUrl()}/api/sync/save-all`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // Sync a single collection (e.g. items, boms, workOrders)
  public async syncEntity(entity: string, data: any[]): Promise<boolean> {
    const doSync = async () => {
      try {
        const url = `${this.getBaseUrl()}/api/sync/entity`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity, data })
        });
        return res.ok;
      } catch {
        return false;
      }
    };

    const success = await doSync();
    if (!success) {
      this.syncQueue.push(doSync);
    }
    return success;
  }

  // Push single record mutation (Upsert or Delete)
  public async syncMutate(entity: string, action: 'UPSERT' | 'DELETE', item?: any, id?: string): Promise<boolean> {
    const doMutate = async () => {
      try {
        const url = `${this.getBaseUrl()}/api/sync/mutate`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity, action, item, id })
        });
        return res.ok;
      } catch {
        return false;
      }
    };

    const success = await doMutate();
    if (!success) {
      this.syncQueue.push(doMutate);
    }
    return success;
  }

  // Push audit log
  public async logAudit(action: string, module: string, details: string, user?: { id?: string; username?: string; role?: string }): Promise<void> {
    try {
      const url = `${this.getBaseUrl()}/api/audit-logs`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || 'SYSTEM',
          username: user?.username || 'System',
          role: user?.role || 'Admin',
          action,
          module,
          details
        })
      });
    } catch {
      // Non-blocking
    }
  }

  // Trigger manual server backup
  public async triggerServerBackup(userId?: string, username?: string, role?: string): Promise<{ success: boolean; message: string; backup?: any }> {
    try {
      const url = `${this.getBaseUrl()}/api/backup/now`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, username, role })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to trigger backup' };
    }
  }

  private async processSyncQueue() {
    if (this.isSyncingQueue || this.syncQueue.length === 0) return;
    this.isSyncingQueue = true;
    while (this.syncQueue.length > 0) {
      const op = this.syncQueue.shift();
      if (op) {
        try {
          await op();
        } catch {
          // Put back if failed
          this.syncQueue.unshift(op);
          break;
        }
      }
    }
    this.isSyncingQueue = false;
  }
}

export const apiClient = new HybridApiClient();
