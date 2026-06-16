import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../services/db';
import { calculateNextRun, enqueueForecastJob } from '../services/forecast';
import { logAudit } from '../utils/audit';

// 1. Get Forecast Configuration for a company (Super Admin Only)
export async function getSuperCompanyForecastConfig(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params; // Company ID
    if (!id) return res.status(400).json({ error: "Company reference is required." });

    let config = await prisma.forecastConfigurations.findUnique({
      where: { tenantId: id }
    });

    // If not exists, return template
    if (!config) {
      config = {
        id: '',
        tenantId: id,
        forecastEnabled: false,
        forecastMode: 'AUTOMATIC',
        frequency: 'DAILY',
        cronExpression: null,
        forecastTime: '02:00',
        historicalDataMonths: 12,
        modelType: 'PROPHET',
        enableSeasonality: false,
        enablePurchaseRecommendations: false,
        enableDeadStockAnalysis: false,
        enableSlowMovingAnalysis: false,
        forecastRetentionPeriodDays: 90,
        lastRunAt: null,
        nextRunAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    return res.json({ config });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// 2. Save Forecast Configuration for a company (Super Admin Only)
export async function saveSuperCompanyForecastConfig(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params; // Company ID
    if (!id) return res.status(400).json({ error: "Company reference is required." });

    const {
      forecastEnabled,
      forecastMode,
      frequency,
      cronExpression,
      forecastTime,
      historicalDataMonths,
      modelType,
      enableSeasonality,
      enablePurchaseRecommendations,
      enableDeadStockAnalysis,
      enableSlowMovingAnalysis,
      forecastRetentionPeriodDays
    } = req.body;

    const nextRun = calculateNextRun({
      frequency: frequency || 'DAILY',
      forecastTime: forecastTime || '02:00',
      cronExpression
    });

    const parsedHistoricalMonths = parseInt(historicalDataMonths) || 12;
    const parsedRetentionDays = parseInt(forecastRetentionPeriodDays) || 90;

    // Create or update configurations
    const config = await prisma.forecastConfigurations.upsert({
      where: { tenantId: id },
      update: {
        forecastEnabled: !!forecastEnabled,
        forecastMode: forecastMode || 'AUTOMATIC',
        frequency: frequency || 'DAILY',
        cronExpression: cronExpression || null,
        forecastTime: forecastTime || '02:00',
        historicalDataMonths: parsedHistoricalMonths,
        modelType: modelType || 'PROPHET',
        enableSeasonality: !!enableSeasonality,
        enablePurchaseRecommendations: !!enablePurchaseRecommendations,
        enableDeadStockAnalysis: !!enableDeadStockAnalysis,
        enableSlowMovingAnalysis: !!enableSlowMovingAnalysis,
        forecastRetentionPeriodDays: parsedRetentionDays,
        nextRunAt: nextRun
      },
      create: {
        tenantId: id,
        forecastEnabled: !!forecastEnabled,
        forecastMode: forecastMode || 'AUTOMATIC',
        frequency: frequency || 'DAILY',
        cronExpression: cronExpression || null,
        forecastTime: forecastTime || '02:00',
        historicalDataMonths: parsedHistoricalMonths,
        modelType: modelType || 'PROPHET',
        enableSeasonality: !!enableSeasonality,
        enablePurchaseRecommendations: !!enablePurchaseRecommendations,
        enableDeadStockAnalysis: !!enableDeadStockAnalysis,
        enableSlowMovingAnalysis: !!enableSlowMovingAnalysis,
        forecastRetentionPeriodDays: parsedRetentionDays,
        nextRunAt: nextRun
      }
    });

    // Sync forecast status schedule
    await prisma.forecastStatus.upsert({
      where: { tenantId: id },
      update: { nextScheduledRun: nextRun },
      create: { tenantId: id, nextScheduledRun: nextRun, needsRefresh: true, status: 'PENDING' }
    });

    // Log administrative action
    await logAudit(
      id,
      req.user?.userId || null,
      req.user?.username || null,
      'super_forecast_config_update',
      'UPDATE',
      null,
      config,
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: "Forecast configuration updated successfully.", config });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// 3. Get Forecast Status (Tenant Route)
export async function getTenantForecastStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    let status = await prisma.forecastStatus.findUnique({
      where: { tenantId: companyId }
    });

    if (status && status.status === 'Running') {
      // Self-healing: verify if there is actually a job processing or pending in the queue
      const activeJob = await prisma.forecastJob.findFirst({
        where: {
          tenantId: companyId,
          status: { in: ['PENDING', 'PROCESSING'] }
        }
      });

      if (!activeJob) {
        console.log(`🧹 [Forecast Status] Self-healing: Resetting stuck 'Running' status for tenant ${companyId} (no active jobs).`);
        
        // Find last completed/failed job to determine recovery status
        const lastJob = await prisma.forecastJob.findFirst({
          where: { tenantId: companyId },
          orderBy: { createdAt: 'desc' }
        });

        const recoveredStatus = (lastJob && lastJob.status === 'FAILED') ? 'Failed' : 'Completed';
        
        status = await prisma.forecastStatus.update({
          where: { tenantId: companyId },
          data: { status: recoveredStatus }
        });
      }
    }

    if (!status) {
      status = {
        tenantId: companyId,
        needsRefresh: false,
        lastForecastRun: null,
        lastDataChange: null,
        nextScheduledRun: null,
        status: 'PENDING'
      };
    }

    return res.json({ status });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// 4. Trigger Manual Forecasting (Tenant Route)
export async function runTenantForecast(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    const userRole = req.user?.role;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    // Restrict manual execution entirely for endusers (only Super Admin allowed)
    if (!req.user?.isSuperAdmin) {
      return res.status(403).json({ error: "Access Denied: Manual forecast triggers are disabled for tenant users. Forecasts run automatically on schedule." });
    }

    // Verify company has forecasting configured & enabled
    const config = await prisma.forecastConfigurations.findUnique({
      where: { tenantId: companyId }
    });

    if (!config || !config.forecastEnabled) {
      return res.status(400).json({ error: "Forecasting is currently disabled or unconfigured by Super Admin for this workspace." });
    }

    if (config.forecastMode === 'DISABLED') {
      return res.status(400).json({ error: "Forecasting trigger has been disabled by Super Admin configuration." });
    }

    // Enqueue manual run asynchronously in background job queue
    const jobId = await enqueueForecastJob(companyId);

    // Audit log
    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'manual_forecast_trigger',
      'CREATE',
      null,
      { jobId },
      req.ip,
      req.headers['user-agent']
    );

    return res.json({
      message: "Forecast run requested. Analysis is processing in the background.",
      jobId
    });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// 5. Get Forecast Predictions (Tenant Route)
export async function getTenantForecastPredictions(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const predictions = await prisma.forecastPrediction.findMany({
      where: { tenantId: companyId },
      include: {
        product: {
          select: {
            name: true,
            uom: true,
            stock: true,
            reorderLevel: true
          }
        }
      },
      orderBy: { product: { name: 'asc' } }
    });

    return res.json({ predictions });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// 6. Get Forecast Runs History (Tenant Route)
export async function getTenantForecastHistory(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const history = await prisma.forecastHistory.findMany({
      where: { tenantId: companyId },
      orderBy: { forecastRunDate: 'desc' },
      take: 50
    });

    return res.json({ history });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
