import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../services/db';
import { hashPassword } from '../utils';
import { logAudit } from '../utils/audit';
import fs from 'fs';
import path from 'path';

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
      role: u.role?.name || null,
      department: u.department?.name || null,
      createdAt: u.createdAt
    }));

    const roles = await prisma.role.findMany({ where: { companyId } });
    const departments = await prisma.department.findMany({ where: { companyId } });
    const auditLogs = await prisma.auditLog.findMany({ where: { companyId }, take: 100 });

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
        auditLogs
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
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { filename } = req.params;
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

    const { backupRetentionDays } = req.body;
    if (backupRetentionDays === undefined || isNaN(parseInt(backupRetentionDays))) {
      return res.status(400).json({ error: "backupRetentionDays is required and must be a valid integer" });
    }

    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: { backupRetentionDays: parseInt(backupRetentionDays) }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'backup',
      'UPDATE_SETTINGS',
      null,
      { backupRetentionDays },
      req.ip,
      req.headers['user-agent']
    );

    return res.json({
      message: "Backup policy settings updated successfully",
      backupRetentionDays: updatedCompany.backupRetentionDays
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

    const { username, mobileNo, email, password, roleId, departmentId } = req.body;

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
        departmentId: departmentId || null
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
    const { username, mobileNo, email, password, roleId, departmentId, status } = req.body;

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

    const data: any = {
      ...(username && { username }),
      ...(mobileNo && { mobileNo }),
      ...(email !== undefined && { email: email || null }),
      ...(roleId && { roleId }),
      ...(departmentId !== undefined && { departmentId: departmentId || null }),
      ...(status && { status })
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
