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

// Environment-aware helpers
function getEnvMode(): 'production' | 'development' {
  return (import.meta as any).env?.VITE_APP_ENV === 'production' ? 'production' : 'development';
}

function getEnvLanUrl(): string {
  const mode = getEnvMode();
  const envKey = mode === 'production' ? 'VITE_PROD_LAN_URL' : 'VITE_DEV_LAN_URL';
  const val = (import.meta as any).env?.[envKey] as string | undefined;
  if (val && val.trim()) return val.trim().replace(/\/$/, '');
  // Legacy fallback
  if ((import.meta as any).env?.VITE_API_LAN_URL) return ((import.meta as any).env.VITE_API_LAN_URL as string).trim().replace(/\/$/, '');
  return mode === 'production' ? 'http://192.168.1.88:5000' : 'http://192.168.1.88:5001';
}

function getEnvCloudUrl(): string {
  const mode = getEnvMode();
  const envKey = mode === 'production' ? 'VITE_PROD_CLOUD_URL' : 'VITE_DEV_CLOUD_URL';
  const val = (import.meta as any).env?.[envKey] as string | undefined;
  if (val && val.trim()) return val.trim().replace(/\/$/, '');
  // Legacy fallback
  if ((import.meta as any).env?.VITE_API_CLOUD_URL) return ((import.meta as any).env.VITE_API_CLOUD_URL as string).trim().replace(/\/$/, '');
  return mode === 'production' ? 'https://erp.manavkalola.xyz' : 'https://erp-dev.manavkalola.xyz';
}

function getEnvBackendPort(): number {
  return getEnvMode() === 'production' ? 5000 : 5001;
}

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return `http://localhost:${getEnvBackendPort()}`;
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
    // Legacy VITE_API_URL override for Tauri if provided
    if ((import.meta as any).env?.VITE_API_URL) {
      return ((import.meta as any).env.VITE_API_URL as string).replace(/\/$/, '');
    }
    return getEnvLanUrl();
  }

  // 3. Capacitor Native Android / iOS App Detection
  const isCapacitor = 
    window.location.protocol === 'capacitor:' || 
    Boolean((window as any).Capacitor);

  if (isCapacitor) {
    if ((import.meta as any).env?.VITE_API_URL) {
      return ((import.meta as any).env.VITE_API_URL as string).replace(/\/$/, '');
    }
    const savedCloud = localStorage.getItem('gec_erp_cloud_url');
    if (savedCloud && savedCloud.trim()) return savedCloud.trim().replace(/\/$/, '');
    return getEnvCloudUrl();
  }

  // 4. Legacy Vite Environment Variable Override (VITE_API_URL)
  if ((import.meta as any).env?.VITE_API_URL) {
    return ((import.meta as any).env.VITE_API_URL as string).replace(/\/$/, '');
  }

  const { protocol, hostname, port } = window.location;
  const backendPort = getEnvBackendPort();

  // 5. Standard Vite Dev Server Ports (5173, 3000, 3001) -> target backend on env-aware port
  if (port === '5173' || port === '3000' || port === '3001') {
    return `${protocol}//${hostname}:${backendPort}`;
  }

  // 6. Direct Backend Serve or Reverse Proxy (Port 5000/5001, 80, 443)
  if (port === '5000' || port === '5001' || port === '80' || port === '443') {
    return `${protocol}//${hostname}${port && port !== '80' && port !== '443' ? `:${port}` : ''}`;
  }

  // 7. Default fallback: target backend on env-aware port
  return `${protocol}//${hostname || 'localhost'}:${backendPort}`;
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
      if (stored) {
        // If stored URL is on old production port but we are now in development mode (or vice-versa), prioritize current env
        const currentDevPort = getEnvBackendPort();
        try {
          const parsed = new URL(stored);
          if ((parsed.port === '5000' && currentDevPort === 5001) || (parsed.port === '5001' && currentDevPort === 5000)) {
            // Environment toggle changed; use current environment LAN URL
            return getEnvLanUrl();
          }
        } catch {}
        return stored;
      }
      return getEnvLanUrl();
    }
    return getEnvLanUrl();
  }

  public getCloudUrl(): string | null {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('gec_erp_cloud_url');
      if (stored) {
        const mode = getEnvMode();
        if ((mode === 'development' && stored.includes('erp.manavkalola.xyz') && !stored.includes('dev')) ||
            (mode === 'production' && stored.includes('erp-dev.manavkalola.xyz'))) {
          // Environment toggle changed; use current environment Cloud URL
          return getEnvCloudUrl();
        }
        return stored;
      }
      return getEnvCloudUrl();
    }
    return getEnvCloudUrl();
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

  // Check internet reachability independently of local networks
  public async checkInternetReachability(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2200);
      await fetch(`https://1.1.1.1/cdn-cgi/trace?_=${Date.now()}`, {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return true;
    } catch {
      try {
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 2000);
        await fetch(`https://www.google.com/favicon.ico?_=${Date.now()}`, {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store',
          signal: controller2.signal
        });
        clearTimeout(timeoutId2);
        return true;
      } catch {
        return false;
      }
    }
  }

  // Check health with smart LAN-First priority and accurate telemetry
  public async checkHealth(): Promise<{ 
    online: boolean; 
    mode: 'LAN' | 'CLOUD' | 'LOCALHOST' | 'OFFLINE'; 
    isInternetReachable: boolean;
    isLanReachable: boolean;
    data?: ServerHealthResponse 
  }> {
    const customUrl = this.getCustomServerUrl();
    const lanUrl = this.getLanUrl();
    const cloudUrl = this.getCloudUrl();
    const activePort = getEnvBackendPort();

    let isInternetReachable = false;
    let isLanReachable = false;

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
          if (host === 'localhost' || host === '127.0.0.1') {
            mode = 'LOCALHOST';
            isLanReachable = true;
          } else if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
            mode = 'LAN';
            isLanReachable = true;
          } else {
            mode = 'CLOUD';
            isInternetReachable = true;
          }
        } catch {
          mode = 'LAN';
        }
        if (!isInternetReachable) {
          isInternetReachable = await this.checkInternetReachability();
        }
        return { online: true, mode, isInternetReachable, isLanReachable, data: result.data };
      }
    }

    // 2. Candidate LAN endpoints: Prioritize direct LAN connection & localhost
    const lanCandidates: string[] = [];

    // Prioritize localhost with active backend port for local desktop/dev setups
    const localActive = `http://localhost:${activePort}`;
    lanCandidates.push(localActive);
    lanCandidates.push(`http://127.0.0.1:${activePort}`);

    if (lanUrl && !lanCandidates.includes(lanUrl)) lanCandidates.push(lanUrl);

    const defaultUrl = getApiBaseUrl();
    if (!lanCandidates.includes(defaultUrl) && !defaultUrl.startsWith('https://')) {
      lanCandidates.push(defaultUrl);
    }

    const otherPort = activePort === 5001 ? 5000 : 5001;
    if (!lanCandidates.includes(`http://localhost:${otherPort}`)) {
      lanCandidates.push(`http://localhost:${otherPort}`);
    }

    if (this.lastHealth?.serverIps) {
      for (const ip of this.lastHealth.serverIps) {
        const candidate = `http://${ip}:${this.lastHealth.serverPort || activePort}`;
        if (!lanCandidates.includes(candidate)) lanCandidates.push(candidate);
      }
    }

    // Probe LAN Candidates first (High priority, fast timeout)
    for (const lanCandidate of lanCandidates) {
      const lanResult = await this.probeEndpoint(lanCandidate, 1500);
      if (lanResult.online) {
        this.activeBaseUrl = lanCandidate;
        this.lastHealth = lanResult.data || null;
        this.isOnline = true;
        isLanReachable = true;
        let mode: 'LAN' | 'CLOUD' | 'LOCALHOST' | 'OFFLINE' = 'LAN';
        try {
          const host = new URL(lanCandidate).hostname;
          mode = (host === 'localhost' || host === '127.0.0.1') ? 'LOCALHOST' : 'LAN';
        } catch {
          mode = 'LAN';
        }
        isInternetReachable = await this.checkInternetReachability();
        return { online: true, mode, isInternetReachable, isLanReachable, data: lanResult.data };
      }
    }

    // 3. If LAN not reachable, probe Cloud / Domain URL fallback
    if (cloudUrl) {
      const cloudResult = await this.probeEndpoint(cloudUrl, 3000);
      if (cloudResult.online) {
        this.activeBaseUrl = cloudUrl;
        this.lastHealth = cloudResult.data || null;
        this.isOnline = true;
        isInternetReachable = true;
        return { online: true, mode: 'CLOUD', isInternetReachable, isLanReachable: false, data: cloudResult.data };
      }
    }

    // 4. Server unreachable via both LAN and Cloud
    isInternetReachable = await this.checkInternetReachability();
    this.isOnline = false;
    return { online: false, mode: 'OFFLINE', isInternetReachable, isLanReachable: false };
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

  // Reset inventory stock levels on server
  public async resetInventoryOnServer(user?: { id?: string; username?: string; role?: string }): Promise<{ success: boolean; message: string }> {
    try {
      const url = `${this.getBaseUrl()}/api/admin/reset-inventory`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': user?.role || 'Admin',
          'x-username': user?.username || 'admin'
        },
        body: JSON.stringify({ userId: user?.id, username: user?.username, role: user?.role })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to connect to server' };
    }
  }

  // Reset operational transactional records on server
  public async resetOperationalOnServer(user?: { id?: string; username?: string; role?: string }): Promise<{ success: boolean; message: string }> {
    try {
      const url = `${this.getBaseUrl()}/api/admin/reset-operational`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': user?.role || 'Admin',
          'x-username': user?.username || 'admin'
        },
        body: JSON.stringify({ userId: user?.id, username: user?.username, role: user?.role })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to connect to server' };
    }
  }

  // Completely wipe server database and restore fresh baseline
  public async wipeDatabaseOnServer(user?: { id?: string; username?: string; role?: string }): Promise<{ success: boolean; message: string; safetyBackup?: string }> {
    try {
      const url = `${this.getBaseUrl()}/api/admin/wipe-database`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': user?.role || 'Admin',
          'x-username': user?.username || 'superadmin',
          'x-is-superadmin': 'true'
        },
        body: JSON.stringify({ userId: user?.id, username: user?.username, role: user?.role, isSuperAdmin: true })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to connect to server' };
    }
  }

  // Email & SMTP Methods
  public async sendEmail(payload: any): Promise<{ success: boolean; message: string; messageId?: string; error?: string }> {
    try {
      const url = `${this.getBaseUrl()}/api/mail/send`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err?.message || 'Network error sending email', error: err?.message };
    }
  }

  public async getSMTPConfig(): Promise<{ success: boolean; config: any; configs?: any }> {
    try {
      const url = `${this.getBaseUrl()}/api/mail/config`;
      const res = await fetch(url);
      return await res.json();
    } catch (err: any) {
      return { success: false, config: null };
    }
  }

  public async saveSMTPConfig(config: any): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const url = `${this.getBaseUrl()}/api/mail/config`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to save SMTP config', error: err?.message };
    }
  }

  public async getEmailTemplates(): Promise<{ success: boolean; templates: any[] }> {
    try {
      const url = `${this.getBaseUrl()}/api/mail/templates`;
      const res = await fetch(url);
      return await res.json();
    } catch (err: any) {
      return { success: false, templates: [] };
    }
  }

  public async saveEmailTemplate(template: any): Promise<{ success: boolean; message: string; error?: string }> {
    return this.saveEmailTemplates([template]);
  }

  public async saveEmailTemplates(templates: any[]): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const url = `${this.getBaseUrl()}/api/mail/templates`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to save templates', error: err?.message };
    }
  }

  // Drawings & CAD Versioning Methods
  public async getDrawings(): Promise<{ success: boolean; data: any[]; drawings: any[]; readReceipts: any[] }> {
    return this.fetchDrawings();
  }

  public async fetchDrawings(): Promise<{ success: boolean; data: any[]; drawings: any[]; readReceipts: any[] }> {
    try {
      const url = `${this.getBaseUrl()}/api/drawings/list`;
      const res = await fetch(url);
      const json = await res.json();
      const list = json.drawings || json.data || [];
      return { success: json.success ?? true, data: list, drawings: list, readReceipts: json.readReceipts || [] };
    } catch (err: any) {
      return { success: false, data: [], drawings: [], readReceipts: [] };
    }
  }

  public async saveDrawing(record: any): Promise<{ success: boolean; message: string; data?: any; drawing?: any; error?: string }> {
    try {
      const url = `${this.getBaseUrl()}/api/drawings/save`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      const json = await res.json();
      return { ...json, data: json.drawing || json.data || record };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to save drawing', error: err?.message };
    }
  }

  public async acknowledgeDrawing(itemIdOrPayload: any, versionId?: string, username?: string): Promise<{ success: boolean; receipt?: any; error?: string }> {
    try {
      const url = `${this.getBaseUrl()}/api/drawings/acknowledge`;
      const payload = typeof itemIdOrPayload === 'string'
        ? { itemId: itemIdOrPayload, versionId, username }
        : itemIdOrPayload;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  // Dynamic Item Classes Methods
  public async fetchItemClasses(): Promise<{ success: boolean; itemClasses: any[]; data?: any[] }> {
    try {
      const url = `${this.getBaseUrl()}/api/item-classes`;
      const res = await fetch(url);
      const json = await res.json();
      return { success: json.success ?? true, itemClasses: json.itemClasses || json.data || [], data: json.itemClasses || json.data || [] };
    } catch (err: any) {
      return { success: false, itemClasses: [], data: [] };
    }
  }

  public async saveItemClass(cls: any): Promise<{ success: boolean; message: string; data?: any; itemClass?: any; error?: string }> {
    try {
      const url = `${this.getBaseUrl()}/api/item-classes/save`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cls)
      });
      const json = await res.json();
      return { ...json, data: json.itemClass || json.data || cls };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to save Item Class', error: err?.message };
    }
  }

  public async deleteItemClass(idOrCode: string): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const url = `${this.getBaseUrl()}/api/item-classes/delete`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: idOrCode, code: idOrCode })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to delete Item Class', error: err?.message };
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
