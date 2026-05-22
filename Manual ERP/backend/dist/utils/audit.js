"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAudit = logAudit;
const db_1 = __importDefault(require("../services/db"));
async function logAudit(companyId, userId, username, moduleName, actionType, oldValue, newValue, ipAddress, deviceInfo) {
    try {
        await db_1.default.auditLog.create({
            data: {
                companyId,
                userId,
                username,
                moduleName,
                actionType,
                oldValue: oldValue ? JSON.stringify(oldValue) : null,
                newValue: newValue ? JSON.stringify(newValue) : null,
                ipAddress: ipAddress || null,
                deviceInfo: deviceInfo || null,
            }
        });
    }
    catch (error) {
        console.error("❌ Failed to log audit event:", error);
    }
}
//# sourceMappingURL=audit.js.map