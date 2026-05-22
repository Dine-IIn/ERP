import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils';
import prisma from '../services/db';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// 1. Authenticate User & Validate Tenant Status
export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;

    // Skip database active check for Super Admin
    if (decoded.isSuperAdmin) {
      return next();
    }

    // Load user and company status from DB to ensure they are active
    const userFromDb = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { company: true, role: true }
    });

    if (!userFromDb) {
      return res.status(404).json({ error: "User profile not found" });
    }

    if (userFromDb.company.status !== "ACTIVE") {
      return res.status(403).json({ error: "Company account is suspended or inactive" });
    }

    if (userFromDb.status !== "ACTIVE") {
      return res.status(403).json({ error: "Your user account is pending admin approval or suspended" });
    }

    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired access token" });
  }
}

// 2. Enforce Super Admin permissions
export function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || !req.user.isSuperAdmin) {
    return res.status(403).json({ error: "Requires Super Admin permissions" });
  }
  next();
}

// 3. Enforce Tenant Subscription Feature Flag
export function requireFeature(featureKey: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Super Admin has universal access
    if (req.user.isSuperAdmin) {
      return next();
    }

    // Check if the feature is activated for the tenant
    const hasFeature = await prisma.companyFeature.findFirst({
      where: {
        companyId: req.user.companyId,
        feature: { key: featureKey }
      }
    });

    if (!hasFeature) {
      return res.status(403).json({
        error: `Feature '${featureKey}' is not enabled for your company's subscription tier`
      });
    }

    next();
  };
}

// 4. Enforce Fine-Grained Role-Based Access Control (RBAC)
export function requirePermission(featureKey: string, action: "read" | "write" | "delete") {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Super Admin and Company Admin bypass RBAC checks
    if (req.user.isSuperAdmin || req.user.role === "Admin") {
      return next();
    }

    // Fetch the user's role permissions
    const userFromDb = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { role: true }
    });

    if (!userFromDb || !userFromDb.role) {
      return res.status(403).json({ error: "You are not assigned any roles or permissions" });
    }

    let permissions: Record<string, string[]> = {};
    try {
      permissions = typeof userFromDb.role.permissions === 'string'
        ? JSON.parse(userFromDb.role.permissions)
        : (userFromDb.role.permissions as Record<string, string[]>);
    } catch (e) {
      return res.status(500).json({ error: "Corrupted role permissions configuration" });
    }

    const featureActions = permissions[featureKey] || [];
    if (!featureActions.includes(action)) {
      return res.status(403).json({
        error: `You do not have permission to ${action} in ${featureKey}`
      });
    }

    next();
  };
}
