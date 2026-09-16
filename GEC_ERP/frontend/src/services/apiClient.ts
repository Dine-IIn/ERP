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

  // 1. User/Device Configured Server URL in localStorage (Takes Highest Priority)
  const savedUrl = localStorage.getItem('gec_erp_server_url');
  if (savedUrl && savedUrl.trim()) {
    return savedUrl.trim().replace(/\/$/, '');
  }

  // 2. Tauri Desktop App Environment Detection
  const isTauri = 
    window.location.hostname.includes('tauri') || 
    window.location.protocol.includes('tauri') || 
    Boolean((window as any).__TAURI_INTERNALS__) ||
    Boolean((window as any).__TAURI__);
  
  if (isTauri) {
    // Check environment variable override for Tauri if provided
    if ((import.meta as any).env?.VITE_API_URL) {
      return ((import.meta as any).env.VITE_API_URL as string).replace(/\/$/, '');
    }
    return 'http://localhost:5000';
  }

  // 3. Capacitor Native Android / iOS App Detection
  const isCapacitor = 
    window.location.protocol === 'capacitor:' || 
    Boolean((window as any).Capacitor);

  if (isCapacitor) {
    if ((import.meta as any).env?.VITE_API_URL) {
      return ((import.meta as any).env.VITE_API_URL as string).replace(/\/$/, '');
    }
    return 'http://localhost:5000';
  }

  // 4. Vite Environment Variable Override
  if ((import.meta as any).env?.VITE_API_URL) {
    return ((import.meta as any).env.VITE_API_URL as string).replace(/\/$/, '');
  }

  const { protocol, hostname, port } = window.location;

  // 5. Standard Vite Dev Server Ports (5173, 3000, 3001) -> target backend on port 5000
  if (port === '5173' || port === '3000' || port === '3001') {
    return `${protocol}//${hostname}:5000`;
  }

  // 6. Direct Backend Serve or Reverse Proxy (Port 5000, 80, 443)
  if (port === '5000' || port === '80' || port === '443') {
    return `${protocol}//${hostname}${port && port !== '80' && port !== '443' ? `:${port}` : ''}`;
  }

  // 7. Default fallback: target backend on port 5000 of the same hostname
  return `${protocol}//${hostname || 'localhost'}:5000`;
}

class HybridApiClient {
  private activeBaseUrl: string = '';
  private isOnline: boolean = true;
  private lastHealth: ServerHealthResponse | null = null;
  private syncQueue: Array<() => Promise<any>> = [];
  private isSyncingQueue: boolean = false;

  constructor() {
    this.activeBaseUrl = getApiBaseUrl();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.checkHealth().then(() => this.processSyncQueue());
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  public getBaseUrl(): string {
    return this.activeBaseUrl || getApiBaseUrl();
  }

  public setCustomServerUrl(url: string): void {
    if (typeof window !== 'undefined') {
      if (url && url.trim()) {
        localStorage.setItem('gec_erp_server_url', url.trim().replace(/\/$/, ''));
      } else {
        localStorage.removeItem('gec_erp_server_url');
      }
      this.activeBaseUrl = getApiBaseUrl();
    }
  }

  public setLanUrl(url: string): void {
    if (typeof window !== 'undefined') {
      if (url && url.trim()) {
        localStorage.setItem('gec_erp_lan_url', url.trim().replace(/\/$/, ''));
      } else {
        localStorage.removeItem('gec_erp_lan_url');
      }
    }
  }

  public setCloudUrl(url: string): void {
    if (typeof window !== 'undefined') {
      if (url && url.trim()) {
        localStorage.setItem('gec_erp_cloud_url', url.trim().replace(/\/$/, ''));
      } else {
        localStorage.removeItem('gec_erp_cloud_url');
      }
    }
  }

  public getCustomServerUrl(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gec_erp_server_url');
    }
    return null;
  }

  public getLanUrl(): string | null {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('gec_erp_lan_url');
      if (stored) return stored;
      if ((import.meta as any).env?.VITE_API_LAN_URL) {
        return ((import.meta as any).env.VITE_API_LAN_URL as string).trim().replace(/\/$/, '');
      }
    }
    return null;
  }

  public getCloudUrl(): string | null {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('gec_erp_cloud_url');
      if (stored) return stored;
      if ((import.meta as any).env?.VITE_API_CLOUD_URL) {
        return ((import.meta as any).env.VITE_API_CLOUD_URL as string).trim().replace(/\/$/, '');
      }
    }
    return null;
  }

  public getLastHealth(): ServerHealthResponse | null {
    return this.lastHealth;
  }

  // Probe a single endpoint health
  private async probeEndpoint(baseUrl: string, timeoutMs: number = 2000): Promise<{ online: boolean; data?: ServerHealthResponse }> {
    try {
      const cleanUrl = baseUrl.replace(/\/$/, '');
      const res = await fetch(`${cleanUrl}/api/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (res.ok) {
        const data: ServerHealthResponse = await res.json();
        return { online: true, data };
      }
    } catch {
      // Unreachable
    }
    return { online: false };
  }

  // Check health with smart LAN-First priority
  public async checkHealth(): Promise<{ online: boolean; mode: 'LAN' | 'CLOUD' | 'LOCALHOST' | 'OFFLINE'; data?: ServerHealthResponse }> {
    const customUrl = this.getCustomServerUrl();
    const lanUrl = this.getLanUrl();
    const cloudUrl = this.getCloudUrl();

    // 1. If explicit custom URL is provided, test it first
    if (customUrl) {
      const result = await this.probeEndpoint(customUrl, 3000);
      if (result.online) {
        this.activeBaseUrl = customUrl;
        this.lastHealth = result.data || null;
        this.isOnline = true;
        let mode: 'LAN' | 'CLOUD' | 'LOCALHOST' | 'OFFLINE' = 'LAN';
        try {
          const host = new URL(customUrl).hostname;
          if (host === 'localhost' || host === '127.0.0.1') mode = 'LOCALHOST';
          else if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) mode = 'LAN';
          else mode = 'CLOUD';
        } catch {
          mode = 'LAN';
        }
        return { online: true, mode, data: result.data };
      }
    }

    // 2. Candidate candidate endpoints: LAN First, then Cloud
    const lanCandidates: string[] = [];
    if (lanUrl) lanCandidates.push(lanUrl);

    // Auto-detect localhost / current host
    const defaultUrl = getApiBaseUrl();
    if (!lanCandidates.includes(defaultUrl)) {
      lanCandidates.push(defaultUrl);
    }

    // Also include localhost:5000 if not already present
    if (!lanCandidates.includes('http://localhost:5000')) {
      lanCandidates.push('http://localhost:5000');
    }

    // If server previously announced its IPs, include them as LAN candidates
    if (this.lastHealth?.serverIps) {
      for (const ip of this.lastHealth.serverIps) {
        const candidate = `http://${ip}:${this.lastHealth.serverPort || 5000}`;
        if (!lanCandidates.includes(candidate)) lanCandidates.push(candidate);
      }
    }

    // Probe LAN Candidates first (High priority, fast timeout)
    for (const lanCandidate of lanCandidates) {
      const lanResult = await this.probeEndpoint(lanCandidate, 1800);
      if (lanResult.online) {
        this.activeBaseUrl = lanCandidate;
        this.lastHealth = lanResult.data || null;
        this.isOnline = true;
        let mode: 'LAN' | 'CLOUD' | 'LOCALHOST' | 'OFFLINE' = 'LAN';
        try {
          const host = new URL(lanCandidate).hostname;
          mode = (host === 'localhost' || host === '127.0.0.1') ? 'LOCALHOST' : 'LAN';
        } catch {
          mode = 'LAN';
        }
        return { online: true, mode, data: lanResult.data };
      }
    }

    // 3. If LAN not reachable, probe Cloud / Domain URL fallback
    if (cloudUrl) {
      const cloudResult = await this.probeEndpoint(cloudUrl, 3500);
      if (cloudResult.online) {
        this.activeBaseUrl = cloudUrl;
        this.lastHealth = cloudResult.data || null;
        this.isOnline = true;
        return { online: true, mode: 'CLOUD', data: cloudResult.data };
      }
    }

    // 4. Everything unreachable -> Switch to Offline Read-Only mode
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
