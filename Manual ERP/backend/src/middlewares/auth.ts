import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils';
import prisma from '../services/db';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload & {
    userRecord?: any;
  };
}

// 1. Authenticate User & Validate Tenant Status
export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  if (!token && req.query.token) {
    token = req.query.token as string;
  }

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

    // Load session from database to ensure it's still active and not logged out
    const session = await prisma.userSession.findUnique({
      where: { token }
    });

    if (!session) {
      return res.status(401).json({ error: "Session expired or logged out from another device", sessionConflict: false });
    }

    // Check desktop inactivity timeout (15 minutes = 900,000 ms)
    if (session.deviceType === 'DESKTOP') {
      const INACTIVITY_TIMEOUT = 15 * 60 * 1000;
      const timeDiff = Date.now() - session.lastActiveAt.getTime();

      if (timeDiff > INACTIVITY_TIMEOUT) {
        // Terminate session due to inactivity
        await prisma.userSession.delete({
          where: { id: session.id }
        });
        return res.status(401).json({ error: "Session logged out due to inactivity", inactiveLogout: true });
      }

      // Update lastActiveAt in DB (throttled to at most once per minute to optimize write performance)
      if (timeDiff > 60 * 1000) {
        await prisma.userSession.update({
          where: { id: session.id },
          data: { lastActiveAt: new Date() }
        });
      }
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

    // Cache the loaded record to prevent duplicate database lookups in subsequent RBAC middleware
    req.user = { ...decoded, userRecord: userFromDb };

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
export function requirePermission(featureKey: string, action: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Super Admin and Company Admin bypass RBAC checks
    if (req.user.isSuperAdmin || req.user.role === "Admin") {
      return next();
    }

    // Retrieve cached user record or fetch from DB if not already cached
    const userFromDb = req.user.userRecord || await prisma.user.findUnique({
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
