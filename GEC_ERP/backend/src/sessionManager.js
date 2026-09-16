// ====================================================================
// GEC ERP - Central Session & Heartbeat Manager
// ====================================================================
// Tracks active user sessions, device types, and ensures zero-disruption updates

class SessionManager {
  constructor() {
    this.sessions = new Map(); // sessionId -> { userId, username, role, platform, lastHeartbeat, ip }
    this.SESSION_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes inactivity timeout
    
    // Periodic cleanup of dead sessions every 30 seconds
    setInterval(() => this.cleanupExpiredSessions(), 30000);
  }

  recordHeartbeat(sessionId, user = {}, platform = 'web', ip = '127.0.0.1') {
    if (!sessionId) return;
    const now = Date.now();
    this.sessions.set(sessionId, {
      sessionId,
      userId: user.id || 'ANONYMOUS',
      username: user.username || 'User',
      role: user.role || 'Staff',
      platform,
      ip,
      lastHeartbeat: now,
      connectedAt: this.sessions.get(sessionId)?.connectedAt || now
    });
  }

  removeSession(sessionId) {
    if (sessionId) {
      this.sessions.delete(sessionId);
    }
  }

  cleanupExpiredSessions() {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastHeartbeat > this.SESSION_TIMEOUT_MS) {
        this.sessions.delete(id);
      }
    }
  }

  getActiveSessionsCount() {
    this.cleanupExpiredSessions();
    return this.sessions.size;
  }

  getActiveSessions() {
    this.cleanupExpiredSessions();
    return Array.from(this.sessions.values()).map(s => ({
      sessionId: s.sessionId,
      username: s.username,
      role: s.role,
      platform: s.platform,
      ip: s.ip,
      activeSecondsAgo: Math.round((Date.now() - s.lastHeartbeat) / 1000)
    }));
  }
}

export const sessionManager = new SessionManager();
