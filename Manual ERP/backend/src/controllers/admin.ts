import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../services/db';
import { CompanyProfileSchema } from '../types';
import { logAudit } from '../utils/audit';
import { encryptSmtp } from '../utils';

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

    // Mask SMTP password for frontend display (never send raw/encrypted password)
    // Omit smtpHost and smtpPort so the frontend never sees them
    const safeCompany = {
      ...company,
      smtpPassword: company.smtpPassword ? '••••••••' : '',
      smtpHost: undefined,
      smtpPort: undefined
    };

    return res.json({ company: safeCompany });
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

    // Handle profile update — encrypt SMTP password before storing
    const updatedData = { ...req.body };
    if (updatedData.smtpPassword && updatedData.smtpPassword !== '••••••••') {
      updatedData.smtpPassword = encryptSmtp(updatedData.smtpPassword);
    } else if (updatedData.smtpPassword === '••••••••') {
      // User didn't change the password — keep existing encrypted value
      delete updatedData.smtpPassword;
    }

    // Auto-compute SMTP Host and Port based on SMTP User email domain on the server side
    // and ignore any client-submitted host/port
    delete updatedData.smtpHost;
    delete updatedData.smtpPort;

    if (updatedData.smtpUser !== undefined) {
      if (updatedData.smtpUser) {
        const email = updatedData.smtpUser.trim().toLowerCase();
        if (email.endsWith('@gmail.com')) {
          updatedData.smtpHost = 'smtp.gmail.com';
          updatedData.smtpPort = 465;
          updatedData.smtpSecure = true;
        } else if (email.endsWith('@outlook.com') || email.endsWith('@hotmail.com') || email.endsWith('@live.com') || email.endsWith('@office365.com')) {
          updatedData.smtpHost = 'smtp.office365.com';
          updatedData.smtpPort = 587;
          updatedData.smtpSecure = false;
        } else if (email.endsWith('@yahoo.com')) {
          updatedData.smtpHost = 'smtp.mail.yahoo.com';
          updatedData.smtpPort = 465;
          updatedData.smtpSecure = true;
        } else {
          // General fallback
          updatedData.smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
          updatedData.smtpPort = Number(process.env.SMTP_PORT) || 465;
          updatedData.smtpSecure = process.env.SMTP_SECURE === 'true' || updatedData.smtpPort === 465;
        }
      } else {
        // smtpUser is empty, clear SMTP settings
        updatedData.smtpHost = null;
        updatedData.smtpPort = null;
        updatedData.smtpSecure = false;
      }
    }

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
