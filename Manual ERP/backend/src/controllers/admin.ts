import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../services/db';
import { CompanyProfileSchema } from '../types';
import { logAudit } from '../utils/audit';

// ==========================================
// 1. COMPANY PROFILE MANAGEMENT
// ==========================================

export async function getCompanyProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        features: { include: { feature: true } }
      }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    return res.json({ company });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateCompanyProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    const parsed = CompanyProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const currentProfile = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!currentProfile) {
      return res.status(404).json({ error: 'Company profile not found' });
    }

    // Handle profile update
    const updatedData = { ...req.body };
    const updatedProfile = await prisma.company.update({
      where: { id: companyId },
      data: updatedData
    });

    // Log to Audit Trail
    await logAudit(
      companyId!,
      req.user?.userId || null,
      req.user?.username || null,
      'company',
      'UPDATE',
      currentProfile,
      updatedProfile,
      req.ip,
      req.headers['user-agent']
    );

    return res.json({
      message: 'Company profile updated successfully',
      company: updatedProfile
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 2. FEATURE TOGGLES SYSTEM
// ==========================================

export async function getCompanyFeatures(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    const companyFeatures = await prisma.companyFeature.findMany({
      where: { companyId },
      include: { feature: true }
    });

    return res.json({
      features: companyFeatures.map(cf => cf.feature.key)
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function toggleCompanyFeature(req: AuthenticatedRequest, res: Response) {
  try {
    const { companyId, featureKey, enable } = req.body;

    if (!companyId || !featureKey || enable === undefined) {
      return res.status(400).json({ error: 'companyId, featureKey and enable are required' });
    }

    // Verify SuperAdmin
    if (!req.user?.isSuperAdmin) {
      return res.status(403).json({ error: 'Only SuperAdmin can manage module access globally.' });
    }

    const feature = await prisma.feature.findUnique({
      where: { key: featureKey.toUpperCase() }
    });

    if (!feature) {
      return res.status(404).json({ error: `System module feature '${featureKey}' not found` });
    }

    if (enable) {
      // Add Company Feature
      await prisma.companyFeature.upsert({
        where: {
          companyId_featureId: { companyId, featureId: feature.id }
        },
        update: {},
        create: { companyId, featureId: feature.id }
      });
    } else {
      // Remove Company Feature
      await prisma.companyFeature.deleteMany({
        where: { companyId, featureId: feature.id }
      });
    }

    // Log to Audit Trail
    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'company',
      'PERMISSION_CHANGE',
      null,
      { featureKey, enable },
      req.ip,
      req.headers['user-agent']
    );

    return res.json({
      message: `Module feature '${featureKey}' successfully ${enable ? 'ENABLED' : 'DISABLED'} for company.`
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 3. NOTIFICATION ARCHIVING
// ==========================================

export async function archiveNotification(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    const userId = req.user?.userId;

    const existing = await prisma.notification.findFirst({
      where: { id, userId, companyId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isArchived: true }
    });

    return res.json({
      message: 'Notification archived successfully',
      notification: updated
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
