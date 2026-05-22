import prisma from '../services/db';

export async function logAudit(
  companyId: string,
  userId: string | null,
  username: string | null,
  moduleName: string,
  actionType: string,
  oldValue: any,
  newValue: any,
  ipAddress?: string,
  deviceInfo?: string
) {
  try {
    await prisma.auditLog.create({
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
  } catch (error) {
    console.error("❌ Failed to log audit event:", error);
  }
}
