import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { config } from '../config';
import { CentralLicenseSchema, CentralDiscoverySchema, CentralUpdaterSchema, CentralDevConfigSchema } from '../types';

// Helper to proxy requests to Central Services
async function proxyCentralAdminCall(req: AuthenticatedRequest, res: Response, method: string, path: string, body?: any) {
  try {
    const centralUrl = config.centralUrl;
    const url = `${centralUrl}${path}`;
    
    console.log(`📡 [Proxy Central Admin] Forwarding ${method} request to ${url}`);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Central-Admin-Secret': config.centralAdminSecret
    };

    const fetchOptions: RequestInit = {
      method,
      headers
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    if (response.status === 204) {
      return res.status(204).send();
    }

    const responseData = await response.json();
    return res.status(response.status).json(responseData);
  } catch (error: any) {
    console.error(`🔴 [Proxy Central Admin Error] Failed proxying request:`, error);
    return res.status(502).json({ error: `Central Services communication error: ${error.message}` });
  }
}

// Licenses Proxy Endpoints
export async function getCentralLicenses(req: AuthenticatedRequest, res: Response) {
  return proxyCentralAdminCall(req, res, 'GET', '/admin/licenses');
}

export async function saveCentralLicense(req: AuthenticatedRequest, res: Response) {
  const parsed = CentralLicenseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  return proxyCentralAdminCall(req, res, 'POST', '/admin/licenses', parsed.data);
}

export async function deleteCentralLicense(req: AuthenticatedRequest, res: Response) {
  const { licenseKey } = req.params;
  return proxyCentralAdminCall(req, res, 'DELETE', `/admin/licenses/${encodeURIComponent(licenseKey)}`);
}

// Discovery Proxy Endpoints
export async function getCentralDiscovery(req: AuthenticatedRequest, res: Response) {
  return proxyCentralAdminCall(req, res, 'GET', '/admin/discovery');
}

export async function saveCentralDiscovery(req: AuthenticatedRequest, res: Response) {
  const parsed = CentralDiscoverySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  return proxyCentralAdminCall(req, res, 'POST', '/admin/discovery', parsed.data);
}

export async function deleteCentralDiscovery(req: AuthenticatedRequest, res: Response) {
  const { companyCode } = req.params;
  return proxyCentralAdminCall(req, res, 'DELETE', `/admin/discovery/${encodeURIComponent(companyCode)}`);
}

// Dynamic Updater Proxy Endpoints
export async function getCentralUpdater(req: AuthenticatedRequest, res: Response) {
  return proxyCentralAdminCall(req, res, 'GET', '/admin/updater');
}

export async function saveCentralUpdater(req: AuthenticatedRequest, res: Response) {
  const parsed = CentralUpdaterSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  return proxyCentralAdminCall(req, res, 'POST', '/admin/updater', parsed.data);
}

// Telemetry Monitor Status Proxy Endpoint
export async function getCentralUpdaterStatus(req: AuthenticatedRequest, res: Response) {
  return proxyCentralAdminCall(req, res, 'GET', '/admin/updater-status');
}

// Developer-Managed Backend Config Proxy Endpoints
export async function getCentralDevConfigs(req: AuthenticatedRequest, res: Response) {
  return proxyCentralAdminCall(req, res, 'GET', '/admin/dev-configs');
}

export async function saveCentralDevConfig(req: AuthenticatedRequest, res: Response) {
  const parsed = CentralDevConfigSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  return proxyCentralAdminCall(req, res, 'POST', '/admin/dev-configs', parsed.data);
}

export async function deleteCentralDevConfig(req: AuthenticatedRequest, res: Response) {
  const { companyCode } = req.params;
  return proxyCentralAdminCall(req, res, 'DELETE', `/admin/dev-configs/${encodeURIComponent(companyCode)}`);
}

// Local Database Info (read-only introspection of the backend's own DB)
export function getDbInfo(req: AuthenticatedRequest, res: Response) {
  const rawUrl = process.env.DATABASE_URL || '';
  let dbType = 'unknown';
  let dbHost = 'localhost';
  let dbName = 'unknown';
  let dbPort = '';
  let isCloud = false;
  let maskedUrl = '(not configured)';
  let hostingMode: 'self-hosted' | 'cloud' | 'local-file' | 'unknown' = 'unknown';

  if (rawUrl.startsWith('file:') || rawUrl.startsWith('sqlite:')) {
    dbType = 'SQLite';
    dbName = rawUrl.replace(/^(file:|sqlite:)\/?\/?\.?\//, '') || 'dev.db';
    dbHost = 'localhost (file)';
    hostingMode = 'local-file';
    maskedUrl = rawUrl;
  } else if (rawUrl.startsWith('postgresql://') || rawUrl.startsWith('postgres://')) {
    dbType = 'PostgreSQL';
    try {
      const u = new URL(rawUrl);
      dbHost = u.hostname;
      dbPort = u.port || '5432';
      dbName = u.pathname.replace('/', '');
      // Mask credentials
      maskedUrl = `postgresql://****:****@${dbHost}:${dbPort}/${dbName}`;
      const localPatterns = ['localhost', '127.0.0.1', '::1', '192.168.', '10.', '172.'];
      isCloud = !localPatterns.some(p => dbHost.startsWith(p));
      hostingMode = isCloud ? 'cloud' : 'self-hosted';
    } catch {
      maskedUrl = 'postgresql://****@(parse error)';
    }
  } else if (rawUrl.startsWith('mysql://') || rawUrl.startsWith('mariadb://')) {
    dbType = 'MySQL/MariaDB';
    try {
      const u = new URL(rawUrl);
      dbHost = u.hostname;
      dbPort = u.port || '3306';
      dbName = u.pathname.replace('/', '');
      maskedUrl = `mysql://****:****@${dbHost}:${dbPort}/${dbName}`;
      const localPatterns = ['localhost', '127.0.0.1', '::1', '192.168.', '10.', '172.'];
      isCloud = !localPatterns.some(p => dbHost.startsWith(p));
      hostingMode = isCloud ? 'cloud' : 'self-hosted';
    } catch {
      maskedUrl = 'mysql://****@(parse error)';
    }
  }

  return res.json({
    dbType,
    dbHost,
    dbPort,
    dbName,
    hostingMode,
    isCloud,
    maskedUrl,
    serverVersion: process.version,
    platform: process.platform,
    pid: process.pid,
    uptime: Math.floor(process.uptime()),
    memoryUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
  });
}
