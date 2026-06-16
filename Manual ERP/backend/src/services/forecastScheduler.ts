import prisma from './db';
import { calculateNextRun, enqueueForecastJob } from './forecast';

let schedulerInterval: NodeJS.Timeout | null = null;

export function startForecastScheduler() {
  if (schedulerInterval) return;

  // Run scheduler check every 60 seconds
  schedulerInterval = setInterval(async () => {
    try {
      await pollScheduledForecasts();
    } catch (err) {
      console.error("[Forecast Scheduler] Error during polling checks:", err);
    }
  }, 60000);

  console.log("⏰ [Forecast Scheduler] Automated scheduled forecasting active (60s checks)");
}

export async function pollScheduledForecasts() {
  const now = new Date();

  // Find all configs that are automatic, enabled, and due
  const dueConfigs = await prisma.forecastConfigurations.findMany({
    where: {
      forecastEnabled: true,
      forecastMode: "AUTOMATIC",
      OR: [
        { nextRunAt: null },
        { nextRunAt: { lte: now } }
      ]
    }
  });

  for (const config of dueConfigs) {
    const companyId = config.tenantId;

    try {
      // Check status refresh requirement
      const status = await prisma.forecastStatus.findUnique({
        where: { tenantId: companyId }
      });

      const nextRunTime = calculateNextRun(config);

      // If no data has changed, skip retraining but update next scheduled timestamp
      if (status && !status.needsRefresh) {
        console.log(`[Forecast Scheduler] Tenant ${companyId} due but has no new transactions (needsRefresh=false). Skipping run to optimize resources.`);
        
        await prisma.$transaction([
          prisma.forecastConfigurations.update({
            where: { id: config.id },
            data: { nextRunAt: nextRunTime }
          }),
          prisma.forecastStatus.update({
            where: { tenantId: companyId },
            data: { nextScheduledRun: nextRunTime }
          })
        ]);
        continue;
      }

      // Add to queue
      await enqueueForecastJob(companyId);

      // Advance next scheduled execution time
      await prisma.forecastConfigurations.update({
        where: { id: config.id },
        data: {
          nextRunAt: nextRunTime,
          lastRunAt: now
        }
      });

    } catch (err) {
      console.error(`[Forecast Scheduler] Failed to schedule forecast for tenant ${companyId}:`, err);
    }
  }
}
