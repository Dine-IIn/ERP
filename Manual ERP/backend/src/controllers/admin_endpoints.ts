import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../services/db';
import { hashPassword, sendSimulatedOTP, verifySimulatedOTP } from '../utils';
import { logAudit } from '../utils/audit';
import fs from 'fs';
import path from 'path';

// Memory store for backup 2FA OTPs
export const backupOtps = new Map<string, { code: string, expires: number }>();

// ==========================================
// 1. AUDIT LOGS TRAIL API
// ==========================================

export async function listAuditLogs(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { username, moduleName, actionType, skip, take } = req.query;

    const whereClause: any = { companyId };
    if (username) whereClause.username = { contains: String(username), mode: 'insensitive' };
    if (moduleName) whereClause.moduleName = { equals: String(moduleName) };
    if (actionType) whereClause.actionType = { equals: String(actionType) };

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      skip: skip ? parseInt(String(skip)) : 0,
      take: take ? parseInt(String(take)) : 50
    });

    const total = await prisma.auditLog.count({ where: whereClause });

    return res.json({ logs, total });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 2. DATA BACKUP AND SNAPSHOTS API
// ==========================================

const BACKUPS_ROOT = path.join(process.cwd(), 'uploads', 'backups');

export async function listBackups(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const companyDir = path.join(BACKUPS_ROOT, companyId);
    if (!fs.existsSync(companyDir)) {
      return res.json({ backups: [] });
    }

    const files = fs.readdirSync(companyDir);
    const backups = files
      .filter(f => f.endsWith('.json'))
      .map(file => {
        const filePath = path.join(companyDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          sizeBytes: stats.size,
          createdAt: stats.birthtime
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return res.json({ backups });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function triggerBackup(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    const actorId = req.user?.userId;
    const actorName = req.user?.username;

    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    // Fetch entire company configuration securely (excluding passwords)
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { features: { include: { feature: true } } }
    });

    const users = await prisma.user.findMany({
      where: { companyId },
      include: { role: true, department: true }
    });

    const sanitizedUsers = users.map(u => ({
      id: u.id,
      username: u.username,
      mobileNo: u.mobileNo,
      email: u.email,
      status: u.status,
      passwordHash: u.passwordHash, // Backup password hash for complete structural recoveries
      roleId: u.roleId,
      departmentId: u.departmentId,
      reportsToId: u.reportsToId,
      shiftStart: u.shiftStart,
      shiftEnd: u.shiftEnd,
      shiftName: u.shiftName,
      documents: u.documents,
      createdAt: u.createdAt
    }));

    const roles = await prisma.role.findMany({ where: { companyId } });
    const departments = await prisma.department.findMany({ where: { companyId } });
    const auditLogs = await prisma.auditLog.findMany({ where: { companyId }, take: 100 });

    const customers = await prisma.customer.findMany({ where: { companyId } });
    const vendors = await prisma.vendor.findMany({ where: { companyId } });
    const productCategories = await prisma.productCategory.findMany({ where: { companyId } });
    const brands = await prisma.brand.findMany({ where: { companyId } });
    const products = await prisma.product.findMany({
      where: { companyId },
      include: { variants: true }
    });

    const backupPayload = {
      companyCode: company?.companyCode,
      companyName: company?.name,
      exportedAt: new Date().toISOString(),
      schemaVersion: "1.0",
      data: {
        company,
        users: sanitizedUsers,
        roles,
        departments,
        auditLogs,
        customers,
        vendors,
        productCategories,
        brands,
        products
      }
    };

    // Save backup JSON to file
    const companyDir = path.join(BACKUPS_ROOT, companyId);
    fs.mkdirSync(companyDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `snapshot_${timestamp}.json`;
    const filePath = path.join(companyDir, filename);

    fs.writeFileSync(filePath, JSON.stringify(backupPayload, null, 2), 'utf-8');

    // Log to Audit Trail
    await logAudit(
      companyId,
      actorId || null,
      actorName || null,
      'backup',
      'CREATE',
      null,
      { filename, size: fs.statSync(filePath).size },
      req.ip,
      req.headers['user-agent']
    );

    return res.status(201).json({
      message: "Database snapshot backup generated successfully!",
      backup: {
        filename,
        sizeBytes: fs.statSync(filePath).size,
        createdAt: new Date()
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function downloadBackup(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.userId;
    if (!companyId || !userId) return res.status(401).json({ error: "Unauthorized" });

    const { filename } = req.params;
    const { otpCode } = req.query;

    const userDb = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!userDb) return res.status(404).json({ error: "User profile not found" });
    const target = userDb.email || userDb.mobileNo;
    if (!target) return res.status(400).json({ error: "No registered email or mobile number found on your profile to verify" });

    const isOtpValid = await verifySimulatedOTP(target, String(otpCode));
    if (!isOtpValid) {
      return res.status(401).json({ error: "Invalid or expired 2FA OTP code" });
    }

    if (!filename || !filename.endsWith('.json') || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: "Invalid backup filename format" });
    }

    const filePath = path.join(BACKUPS_ROOT, companyId, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Backup file snapshot not found" });
    }

    return res.download(filePath, filename);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateBackupSettings(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { backupRetentionDays, autoBackupInterval } = req.body;
    
    const data: any = {};
    if (backupRetentionDays !== undefined) {
      if (isNaN(parseInt(backupRetentionDays))) {
        return res.status(400).json({ error: "backupRetentionDays must be an integer" });
      }
      data.backupRetentionDays = parseInt(backupRetentionDays);
    }
    if (autoBackupInterval !== undefined) {
      if (isNaN(parseInt(autoBackupInterval))) {
        return res.status(400).json({ error: "autoBackupInterval must be an integer" });
      }
      data.autoBackupInterval = parseInt(autoBackupInterval);
    }

    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'backup',
      'UPDATE_SETTINGS',
      null,
      data,
      req.ip,
      req.headers['user-agent']
    );

    return res.json({
      message: "Backup policy settings updated successfully",
      backupRetentionDays: updatedCompany.backupRetentionDays,
      autoBackupInterval: updatedCompany.autoBackupInterval
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 3. EMPLOYEE USER MANAGEMENT API
// ==========================================

export async function createUserForAdmin(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { username, mobileNo, email, password, roleId, departmentId, reportsToId, shiftStart, shiftEnd, shiftName, documents } = req.body;

    if (!username || !mobileNo || !password || !roleId) {
      return res.status(400).json({ error: "username, mobileNo, password and roleId are required fields" });
    }

    // Verify username uniqueness inside the company
    const existingUser = await prisma.user.findFirst({
      where: { companyId, username }
    });
    if (existingUser) {
      return res.status(409).json({ error: `Username '${username}' is already in use by another colleague.` });
    }

    // Verify mobileNo globally unique
    const existingMobile = await prisma.user.findUnique({
      where: { mobileNo }
    });
    if (existingMobile) {
      return res.status(409).json({ error: "Mobile number is already registered to another user on the platform." });
    }

    // Verify role belongs to company
    const role = await prisma.role.findFirst({
      where: { id: roleId, companyId }
    });
    if (!role) {
      return res.status(404).json({ error: "Allocated role was not found." });
    }

    // Verify department belongs to company if provided
    if (departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: departmentId, companyId }
      });
      if (!dept) {
        return res.status(404).json({ error: "Allocated department was not found." });
      }
    }

    // Verify reporting manager belongs to company if provided
    if (reportsToId) {
      const manager = await prisma.user.findFirst({
        where: { id: reportsToId, companyId }
      });
      if (!manager) {
        return res.status(404).json({ error: "Reporting manager was not found." });
      }
    }

    const passwordHash = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: {
        companyId,
        username,
        mobileNo,
        email: email || null,
        passwordHash,
        status: "ACTIVE", // Created directly by Admin -> Active!
        roleId: role.id,
        departmentId: departmentId || null,
        reportsToId: reportsToId || null,
        shiftStart: shiftStart || null,
        shiftEnd: shiftEnd || null,
        shiftName: shiftName || null,
        documents: documents || null
      }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'user',
      'CREATE',
      null,
      { userId: newUser.id, username: newUser.username, role: role.name },
      req.ip,
      req.headers['user-agent']
    );

    return res.status(201).json({
      message: `Employee user '${username}' created and onboarded successfully.`,
      user: { id: newUser.id, username: newUser.username, status: newUser.status }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateUserForAdmin(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { userId } = req.params;
    const { username, mobileNo, email, password, roleId, departmentId, status, reportsToId, shiftStart, shiftEnd, shiftName, documents } = req.body;

    // Verify user belongs to same company
    const userToUpdate = await prisma.user.findFirst({
      where: { id: userId, companyId }
    });
    if (!userToUpdate) {
      return res.status(404).json({ error: "Colleague profile not found" });
    }

    // Check unique constraints
    if (username && username !== userToUpdate.username) {
      const exist = await prisma.user.findFirst({
        where: { companyId, username }
      });
      if (exist) return res.status(409).json({ error: `Username '${username}' already exists.` });
    }

    if (mobileNo && mobileNo !== userToUpdate.mobileNo) {
      const exist = await prisma.user.findUnique({
        where: { mobileNo }
      });
      if (exist) return res.status(409).json({ error: "Mobile number is already registered to another account." });
    }

    if (roleId) {
      const role = await prisma.role.findFirst({
        where: { id: roleId, companyId }
      });
      if (!role) return res.status(404).json({ error: "Allocated role was not found." });
    }

    if (departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: departmentId, companyId }
      });
      if (!dept) return res.status(404).json({ error: "Allocated department was not found." });
    }

    // Verify reporting manager belongs to company if provided
    if (reportsToId) {
      const manager = await prisma.user.findFirst({
        where: { id: reportsToId, companyId }
      });
      if (!manager) return res.status(404).json({ error: "Reporting manager not found." });
    }

    const data: any = {
      ...(username && { username }),
      ...(mobileNo && { mobileNo }),
      ...(email !== undefined && { email: email || null }),
      ...(roleId && { roleId }),
      ...(departmentId !== undefined && { departmentId: departmentId || null }),
      ...(status && { status }),
      ...(reportsToId !== undefined && { reportsToId: reportsToId || null }),
      ...(shiftStart !== undefined && { shiftStart: shiftStart || null }),
      ...(shiftEnd !== undefined && { shiftEnd: shiftEnd || null }),
      ...(shiftName !== undefined && { shiftName: shiftName || null }),
      ...(documents !== undefined && { documents: documents || null })
    };

    if (password) {
      data.passwordHash = await hashPassword(password);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'user',
      'UPDATE',
      { username: userToUpdate.username, status: userToUpdate.status },
      { username: updatedUser.username, status: updatedUser.status },
      req.ip,
      req.headers['user-agent']
    );

    return res.json({
      message: `Employee profile '${updatedUser.username}' updated successfully.`,
      user: { id: updatedUser.id, username: updatedUser.username, status: updatedUser.status }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteUserForAdmin(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { userId } = req.params;

    // Verify user belongs to same company
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId }
    });
    if (!user) {
      return res.status(404).json({ error: "Colleague profile not found" });
    }

    // Protect admin themselves from deletion
    if (user.id === req.user?.userId) {
      return res.status(400).json({ error: "Self-deletion is forbidden for active system administrators." });
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'user',
      'DELETE',
      { username: user.username, email: user.email },
      null,
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: `Employee user '${user.username}' has been permanently offboarded.` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 4. CORPORATE DEPARTMENTS MANAGEMENT API
// ==========================================

export async function listDepartments(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const departments = await prisma.department.findMany({
      where: { companyId },
      include: {
        manager: {
          select: { id: true, username: true, email: true }
        },
        _count: {
          select: { users: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Parse the stringified features array
    const parsedDepartments = departments.map(d => ({
      ...d,
      features: JSON.parse(d.features)
    }));

    return res.json({ departments: parsedDepartments });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createDepartment(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { name, description, features, managerId } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Department name is required" });
    }

    // Verify name uniqueness inside company
    const existing = await prisma.department.findFirst({
      where: { companyId, name }
    });
    if (existing) {
      return res.status(409).json({ error: `Department with title '${name}' already exists in your company.` });
    }

    // If manager specified, verify they exist and are not already managing a department
    if (managerId) {
      const user = await prisma.user.findFirst({
        where: { id: managerId, companyId }
      });
      if (!user) return res.status(404).json({ error: "Specified manager user not found." });

      const alreadyManaging = await prisma.department.findUnique({
        where: { managerId }
      });
      if (alreadyManaging) {
        return res.status(400).json({ error: `User '${user.username}' is already manager of the '${alreadyManaging.name}' department.` });
      }
    }

    const newDept = await prisma.department.create({
      data: {
        companyId,
        name,
        description: description || null,
        features: JSON.stringify(features || []),
        managerId: managerId || null
      }
    });

    // Update the manager user's department assignment too if they exist
    if (managerId) {
      await prisma.user.update({
        where: { id: managerId },
        data: { departmentId: newDept.id }
      });
    }

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'department',
      'CREATE',
      null,
      { name: newDept.name, features },
      req.ip,
      req.headers['user-agent']
    );

    return res.status(201).json({
      message: `Department '${name}' created successfully.`,
      department: {
        ...newDept,
        features: features || []
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateDepartment(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { deptId } = req.params;
    const { name, description, features, managerId } = req.body;

    const dept = await prisma.department.findFirst({
      where: { id: deptId, companyId }
    });
    if (!dept) return res.status(404).json({ error: "Department not found." });

    if (name && name !== dept.name) {
      const exist = await prisma.department.findFirst({
        where: { companyId, name }
      });
      if (exist) return res.status(409).json({ error: `Department '${name}' already exists.` });
    }

    if (managerId && managerId !== dept.managerId) {
      const user = await prisma.user.findFirst({
        where: { id: managerId, companyId }
      });
      if (!user) return res.status(404).json({ error: "Specified manager user not found." });

      const alreadyManaging = await prisma.department.findFirst({
        where: { managerId, id: { not: deptId } }
      });
      if (alreadyManaging) {
        return res.status(400).json({ error: `User '${user.username}' already manages department '${alreadyManaging.name}'.` });
      }
    }

    const data: any = {
      ...(name && { name }),
      ...(description !== undefined && { description: description || null }),
      ...(features && { features: JSON.stringify(features) }),
      ...(managerId !== undefined && { managerId: managerId || null })
    };

    const updatedDept = await prisma.department.update({
      where: { id: deptId },
      data
    });

    // Sync department assignments
    if (managerId && managerId !== dept.managerId) {
      // Set new manager's department
      await prisma.user.update({
        where: { id: managerId },
        data: { departmentId: deptId }
      });
    }

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'department',
      'UPDATE',
      { name: dept.name },
      { name: updatedDept.name, features },
      req.ip,
      req.headers['user-agent']
    );

    return res.json({
      message: `Department '${updatedDept.name}' updated successfully.`,
      department: {
        ...updatedDept,
        features: features || []
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteDepartment(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { deptId } = req.params;

    const dept = await prisma.department.findFirst({
      where: { id: deptId, companyId }
    });
    if (!dept) return res.status(404).json({ error: "Department not found." });

    await prisma.department.delete({
      where: { id: deptId }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'department',
      'DELETE',
      { name: dept.name },
      null,
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: `Department '${dept.name}' deleted successfully.` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 5. ACTIVE ROLES & PERMISSIONS UPDATE API
// ==========================================

export async function updateRolePermissions(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { roleId } = req.params;
    const { name, permissions } = req.body;

    const role = await prisma.role.findFirst({
      where: { id: roleId, companyId }
    });
    if (!role) return res.status(404).json({ error: "Role not found in your company." });

    if (role.name === 'Admin') {
      return res.status(400).json({ error: "The default master administrative role permissions are locked by system policy." });
    }

    if (name && name !== role.name) {
      const exist = await prisma.role.findFirst({
        where: { companyId, name }
      });
      if (exist) return res.status(409).json({ error: `Role name '${name}' already exists.` });
    }

    const data: any = {
      ...(name && { name }),
      ...(permissions && { permissions: JSON.stringify(permissions) })
    };

    const updated = await prisma.role.update({
      where: { id: roleId },
      data
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'role',
      'UPDATE',
      { name: role.name },
      { name: updated.name, permissions },
      req.ip,
      req.headers['user-agent']
    );

    return res.json({
      message: `Role permissions for '${updated.name}' successfully modified.`,
      role: {
        id: updated.id,
        name: updated.name,
        permissions: permissions || {}
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteRoleForAdmin(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { roleId } = req.params;

    const role = await prisma.role.findFirst({
      where: { id: roleId, companyId }
    });
    if (!role) return res.status(404).json({ error: "Role not found in your company." });

    if (role.name === 'Admin') {
      return res.status(400).json({ error: "Default administrative master role cannot be deleted." });
    }

    // Check if role assigned to any user
    const usersWithRole = await prisma.user.count({
      where: { roleId }
    });
    if (usersWithRole > 0) {
      return res.status(400).json({ error: `This role cannot be deleted because it is currently assigned to ${usersWithRole} employee users.` });
    }

    await prisma.role.delete({
      where: { id: roleId }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'role',
      'DELETE',
      { name: role.name },
      null,
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: `Role '${role.name}' has been permanently deleted.` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 6. BACKUP SECURE 2FA & ROLLBACK API
// ==========================================

export async function requestBackupOTP(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Fetch user details including company details
    const userDb = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true }
    });

    if (!userDb) {
      return res.status(404).json({ error: "User profile not found" });
    }

    const target = userDb.email || userDb.mobileNo;
    if (!target) {
      return res.status(400).json({ error: "No registered email or mobile number found on your profile to dispatch OTP" });
    }

    const isEmail = target.includes('@');
    
    // Dispatch real-time OTP via Email/Twilio SMS
    const code = await sendSimulatedOTP(target, userDb.company.companyCode);

    return res.json({
      message: `Secure 2FA verification OTP sent successfully to your registered ${isEmail ? 'email' : 'mobile number'}!`,
      target,
      otpCode: process.env.NODE_ENV !== 'production' ? code : undefined
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteBackup(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.userId;
    if (!companyId || !userId) return res.status(401).json({ error: "Unauthorized" });

    const otpHeader = req.headers['x-otp-code'] as string;
    
    const userDb = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!userDb) return res.status(404).json({ error: "User profile not found" });
    const target = userDb.email || userDb.mobileNo;
    if (!target) return res.status(400).json({ error: "No registered email or mobile number found on your profile to verify" });

    const isOtpValid = await verifySimulatedOTP(target, String(otpHeader));
    if (!isOtpValid) {
      return res.status(401).json({ error: "Invalid or expired 2FA OTP code" });
    }

    const { filename } = req.params;
    if (!filename || !filename.endsWith('.json') || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: "Invalid backup filename format" });
    }

    const filePath = path.join(BACKUPS_ROOT, companyId, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Backup file snapshot not found" });
    }

    fs.unlinkSync(filePath);

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'backup',
      'DELETE',
      { filename },
      null,
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: "Backup snapshot deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function restoreBackup(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.userId;
    const username = req.user?.username;
    if (!companyId || !userId) return res.status(401).json({ error: "Unauthorized" });

    const { filename, otpCode } = req.body;
    if (!otpCode) {
      return res.status(400).json({ error: "2FA OTP code is required for database restores" });
    }

    const userDb = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!userDb) return res.status(404).json({ error: "User profile not found" });
    const target = userDb.email || userDb.mobileNo;
    if (!target) return res.status(400).json({ error: "No registered email or mobile number found on your profile to verify" });

    const isOtpValid = await verifySimulatedOTP(target, String(otpCode));
    if (!isOtpValid) {
      return res.status(401).json({ error: "Invalid or expired 2FA OTP code" });
    }

    if (!filename || !filename.endsWith('.json') || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: "Invalid backup filename format" });
    }

    const filePath = path.join(BACKUPS_ROOT, companyId, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Backup snapshot file not found" });
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const snapshot = JSON.parse(fileContent);

    // Validate that the company code matches
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company || snapshot.companyCode !== company.companyCode) {
      return res.status(400).json({ error: "Snapshot company code mismatch. Restore aborted." });
    }

    // Execute secure database transaction to rollback data
    await prisma.$transaction(async (tx) => {
      // 1. Wipe departments
      await tx.department.deleteMany({ where: { companyId } });

      // 2. Wipe audit logs
      await tx.auditLog.deleteMany({ where: { companyId } });

      // Wipe new master data tables
      await tx.productVariant.deleteMany({});
      await tx.product.deleteMany({ where: { companyId } });
      await tx.productCategory.deleteMany({ where: { companyId } });
      await tx.brand.deleteMany({ where: { companyId } });
      await tx.customer.deleteMany({ where: { companyId } });
      await tx.vendor.deleteMany({ where: { companyId } });

      // 3. Wipe users other than the active restoring admin user itself (to keep session active)
      await tx.userSession.deleteMany({
        where: {
          user: { companyId },
          token: { not: req.headers['authorization']?.split(' ')[1] }
        }
      });
      await tx.user.deleteMany({
        where: {
          companyId,
          id: { not: userId }
        }
      });

      // 4. Wipe custom roles other than 'Admin' role
      await tx.role.deleteMany({
        where: {
          companyId,
          name: { not: 'Admin' }
        }
      });

      // 5. Restore roles
      const snapshotRoles = snapshot.data.roles || [];
      for (const r of snapshotRoles) {
        if (r.name === 'Admin') {
          // Update the existing master Admin role permissions in-place
          await tx.role.updateMany({
            where: { companyId, name: 'Admin' },
            data: { permissions: r.permissions }
          });
        } else {
          await tx.role.create({
            data: {
              id: r.id,
              companyId,
              name: r.name,
              permissions: r.permissions,
              createdAt: new Date(r.createdAt),
              updatedAt: new Date(r.updatedAt || r.createdAt)
            }
          });
        }
      }

      // 6. Restore departments
      const snapshotDepts = snapshot.data.departments || [];
      for (const d of snapshotDepts) {
        await tx.department.create({
          data: {
            id: d.id,
            companyId,
            name: d.name,
            description: d.description,
            features: d.features,
            managerId: d.managerId || null,
            createdAt: new Date(d.createdAt),
            updatedAt: new Date(d.updatedAt || d.createdAt)
          }
        });
      }

      // 7. Restore users
      const snapshotUsers = snapshot.data.users || [];
      for (const u of snapshotUsers) {
        if (u.id === userId) {
          // Update the active restoring admin user's role and department relation in-place
          const adminRole = await tx.role.findFirst({ where: { companyId, name: 'Admin' } });
          await tx.user.update({
            where: { id: userId },
            data: {
              roleId: adminRole?.id || u.roleId || undefined,
              departmentId: u.departmentId || null,
              reportsToId: u.reportsToId || null,
              shiftStart: u.shiftStart || null,
              shiftEnd: u.shiftEnd || null,
              shiftName: u.shiftName || null,
              documents: u.documents || null
            }
          });
        } else {
          // Find matching role in restored DB or fall back to Admin
          let matchingRoleId = u.roleId;
          if (matchingRoleId) {
            const roleExists = await tx.role.findUnique({ where: { id: matchingRoleId } });
            if (!roleExists) {
              const fallback = await tx.role.findFirst({ where: { companyId, name: 'Admin' } });
              matchingRoleId = fallback?.id || '';
            }
          }

          await tx.user.create({
            data: {
              id: u.id,
              companyId: companyId,
              username: u.username,
              mobileNo: u.mobileNo,
              email: u.email,
              passwordHash: u.passwordHash || '$2a$10$fallbackpasswordhashvaluehere',
              status: u.status || 'ACTIVE',
              roleId: matchingRoleId || undefined,
              departmentId: u.departmentId || null,
              reportsToId: u.reportsToId || null,
              shiftStart: u.shiftStart || null,
              shiftEnd: u.shiftEnd || null,
              shiftName: u.shiftName || null,
              documents: u.documents || null,
              createdAt: new Date(u.createdAt)
            }
          });
        }
      }

      // Restore product categories
      const snapshotCats = snapshot.data.productCategories || [];
      for (const cat of snapshotCats) {
        await tx.productCategory.create({
          data: { id: cat.id, companyId, name: cat.name, createdAt: new Date(cat.createdAt) }
        });
      }

      // Restore brands
      const snapshotBrands = snapshot.data.brands || [];
      for (const br of snapshotBrands) {
        await tx.brand.create({
          data: { id: br.id, companyId, name: br.name, createdAt: new Date(br.createdAt) }
        });
      }

      // Restore customers
      const snapshotCustomers = snapshot.data.customers || [];
      for (const c of snapshotCustomers) {
        await tx.customer.create({
          data: {
            id: c.id,
            companyId,
            name: c.name,
            customerType: c.customerType,
            customerGroup: c.customerGroup || null,
            contactPerson: c.contactPerson || null,
            contactNo: c.contactNo,
            email: c.email || null,
            billingAddress: c.billingAddress || null,
            shippingAddress: c.shippingAddress || null,
            creditLimit: c.creditLimit ?? 0.0,
            creditTime: c.creditTime ?? 0,
            createdAt: new Date(c.createdAt),
            updatedAt: new Date(c.updatedAt)
          }
        });
      }

      // Restore vendors
      const snapshotVendors = snapshot.data.vendors || [];
      for (const v of snapshotVendors) {
        await tx.vendor.create({
          data: {
            id: v.id,
            companyId,
            name: v.name,
            isVendor: v.isVendor ?? true,
            contactNo: v.contactNo,
            email: v.email || null,
            bankDetails: v.bankDetails || null,
            paymentTerms: v.paymentTerms || null,
            gstDetails: v.gstDetails || null,
            creditTime: v.creditTime ?? 0,
            createdAt: new Date(v.createdAt),
            updatedAt: new Date(v.updatedAt)
          }
        });
      }

      // Restore products
      const snapshotProducts = snapshot.data.products || [];
      for (const p of snapshotProducts) {
        const createdProduct = await tx.product.create({
          data: {
            id: p.id,
            companyId,
            name: p.name,
            categoryId: p.categoryId || null,
            brandId: p.brandId || null,
            uom: p.uom,
            pricing: p.pricing ?? 0.0,
            hsnSacCode: p.hsnSacCode || null,
            imageUrl: p.imageUrl || null,
            bomReference: p.bomReference || null,
            moq: p.moq ?? 1.0,
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt)
          }
        });

        const variants = p.variants || [];
        for (const vr of variants) {
          await tx.productVariant.create({
            data: {
              id: vr.id,
              productId: createdProduct.id,
              name: vr.name,
              sku: vr.sku || null,
              priceAddon: vr.priceAddon ?? 0.0,
              createdAt: new Date(vr.createdAt)
            }
          });
        }
      }

      // 8. Restore audit logs
      const snapshotLogs = snapshot.data.auditLogs || [];
      for (const log of snapshotLogs) {
        await tx.auditLog.create({
          data: {
            id: log.id,
            companyId,
            userId: log.userId,
            username: log.username,
            moduleName: log.moduleName,
            actionType: log.actionType,
            oldValue: log.oldValue,
            newValue: log.newValue,
            ipAddress: log.ipAddress,
            deviceInfo: log.deviceInfo || log.userAgent || null,
            timestamp: new Date(log.timestamp)
          }
        });
      }
    });

    await logAudit(
      companyId,
      userId || null,
      username || null,
      'backup',
      'RESTORE',
      null,
      { filename },
      req.ip,
      req.headers['user-agent'] as string
    );

    return res.json({ message: "Database successfully rolled back and restored to selected snapshot." });
  } catch (error: any) {
    console.error("Rollback restore error:", error);
    return res.status(500).json({ error: error.message || "Rollback failed" });
  }
}
