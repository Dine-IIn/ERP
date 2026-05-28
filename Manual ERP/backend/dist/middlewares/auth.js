"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
exports.requireSuperAdmin = requireSuperAdmin;
exports.requireFeature = requireFeature;
exports.requirePermission = requirePermission;
const utils_1 = require("../utils");
const db_1 = __importDefault(require("../services/db"));
// 1. Authenticate User & Validate Tenant Status
async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: "Access token required" });
    }
    try {
        const decoded = (0, utils_1.verifyToken)(token);
        req.user = decoded;
        // Skip database active check for Super Admin
        if (decoded.isSuperAdmin) {
            return next();
        }
        // Load session from database to ensure it's still active and not logged out
        const session = await db_1.default.userSession.findUnique({
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
                await db_1.default.userSession.delete({
                    where: { id: session.id }
                });
                return res.status(401).json({ error: "Session logged out due to inactivity", inactiveLogout: true });
            }
            // Update lastActiveAt in DB (throttled to at most once per minute to optimize write performance)
            if (timeDiff > 60 * 1000) {
                await db_1.default.userSession.update({
                    where: { id: session.id },
                    data: { lastActiveAt: new Date() }
                });
            }
        }
        // Load user and company status from DB to ensure they are active
        const userFromDb = await db_1.default.user.findUnique({
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
    }
    catch (error) {
        return res.status(403).json({ error: "Invalid or expired access token" });
    }
}
// 2. Enforce Super Admin permissions
function requireSuperAdmin(req, res, next) {
    if (!req.user || !req.user.isSuperAdmin) {
        return res.status(403).json({ error: "Requires Super Admin permissions" });
    }
    next();
}
// 3. Enforce Tenant Subscription Feature Flag
function requireFeature(featureKey) {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }
        // Super Admin has universal access
        if (req.user.isSuperAdmin) {
            return next();
        }
        // Check if the feature is activated for the tenant
        const hasFeature = await db_1.default.companyFeature.findFirst({
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
function requirePermission(featureKey, action) {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }
        // Super Admin and Company Admin bypass RBAC checks
        if (req.user.isSuperAdmin || req.user.role === "Admin") {
            return next();
        }
        // Fetch the user's role permissions
        const userFromDb = await db_1.default.user.findUnique({
            where: { id: req.user.userId },
            include: { role: true }
        });
        if (!userFromDb || !userFromDb.role) {
            return res.status(403).json({ error: "You are not assigned any roles or permissions" });
        }
        let permissions = {};
        try {
            permissions = typeof userFromDb.role.permissions === 'string'
                ? JSON.parse(userFromDb.role.permissions)
                : userFromDb.role.permissions;
        }
        catch (e) {
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
//# sourceMappingURL=auth.js.map