// ====================================================================
// GEC ERP - Frontend Update Service & Session Heartbeat Manager
// ====================================================================
import { apiClient } from './apiClient';

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseNotes?: string;
  publishedAt?: string;
}

class UpdaterService {
  private sessionId: string = '';
  private heartbeatTimer: any = null;
  private onUpdateAvailableCallback: ((info: UpdateInfo) => void) | null = null;
  private latestUpdateInfo: UpdateInfo | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      let storedId = sessionStorage.getItem('gec_session_id');
      if (!storedId) {
        storedId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem('gec_session_id', storedId);
      }
      this.sessionId = storedId;
    }
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public setOnUpdateAvailable(cb: (info: UpdateInfo) => void) {
    this.onUpdateAvailableCallback = cb;
    if (this.latestUpdateInfo && this.latestUpdateInfo.updateAvailable) {
      cb(this.latestUpdateInfo);
    }
  }

  // Start continuous background heartbeat
  public startHeartbeat(currentUser?: any) {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    
    const sendPulse = async () => {
      try {
        const platform = this.detectPlatform();
        const baseUrl = apiClient.getBaseUrl();
        const res = await fetch(`${baseUrl}/api/session/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: this.sessionId,
            user: currentUser || { username: 'Operator', role: 'Staff' },
            platform
          }),
          signal: AbortSignal.timeout(3000)
        });

        if (res.ok) {
          const data = await res.json();
          if (data.updateAvailable) {
            this.latestUpdateInfo = {
              currentVersion: (import.meta as any).env?.VITE_APP_VERSION || '1.0.0',
              latestVersion: data.latestVersion,
              updateAvailable: true
            };
            if (this.onUpdateAvailableCallback) {
              this.onUpdateAvailableCallback(this.latestUpdateInfo);
            }
          }
        }
      } catch (e) {
        // Non-blocking
      }
    };

    sendPulse();
    this.heartbeatTimer = setInterval(sendPulse, 30000); // 30s heartbeat
  }

  public stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    try {
      const baseUrl = apiClient.getBaseUrl();
      fetch(`${baseUrl}/api/session/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: this.sessionId }),
        keepalive: true
      });
    } catch {}
  }

  public async checkForUpdates(): Promise<UpdateInfo | null> {
    try {
      const baseUrl = apiClient.getBaseUrl();
      const res = await fetch(`${baseUrl}/api/updates/status`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(4000)
      });

      if (res.ok) {
        const data = await res.json();
        const info: UpdateInfo = {
          currentVersion: data.currentVersion || (import.meta as any).env?.VITE_APP_VERSION || '1.0.0',
          latestVersion: data.latestVersion || '1.0.0',
          updateAvailable: Boolean(data.updateAvailable),
          releaseNotes: data.releaseNotes,
          publishedAt: data.publishedAt
        };
        this.latestUpdateInfo = info;
        if (info.updateAvailable && this.onUpdateAvailableCallback) {
          this.onUpdateAvailableCallback(info);
        }
        return info;
      }
    } catch {
      // offline
    }
    return null;
  }

  public applyClientUpdate() {
    // 1. Clear caches
    if (typeof window !== 'undefined') {
      try {
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
          });
        }
      } catch {}

      // 2. Hard reload to load fresh assets immediately
      window.location.reload();
    }
  }

  private detectPlatform(): 'tauri' | 'capacitor' | 'web' {
    if (typeof window === 'undefined') return 'web';
    if (window.location.hostname.includes('tauri') || (window as any).__TAURI_INTERNALS__) return 'tauri';
    if (window.location.protocol === 'capacitor:' || (window as any).Capacitor) return 'capacitor';
    return 'web';
  }
}

export const updaterService = new UpdaterService();
