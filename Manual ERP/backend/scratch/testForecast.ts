import prisma from '../src/services/db';
import { markNeedsRefresh, enqueueForecastJob, processNextJobs } from '../src/services/forecast';

async function runTest() {
  console.log("🧪 Starting AI Forecasting integration tests...");

  try {
    // 1. Find or create a test company
    let company = await prisma.company.findFirst();
    if (!company) {
      console.log("🌱 Creating test company...");
      company = await prisma.company.create({
        data: {
          companyCode: "TESTCOMP",
          name: "Test Company Ltd",
          subscriptionTier: "BASIC"
        }
      });
    }
    const companyId = company.id;
    console.log(`🏢 Test Company ID: ${companyId}`);

    // 2. Ensure feature exists in database and is mapped to company
    let feature = await prisma.feature.findUnique({
      where: { key: "INVENTORY_FORECASTING" }
    });
    if (!feature) {
      console.log("🌱 Creating feature registration...");
      feature = await prisma.feature.create({
        data: {
          key: "INVENTORY_FORECASTING",
          name: "AI Demand Forecasting",
          description: "Predict product demand, track replenishment times, and optimize levels"
        }
      });
    }

    let companyFeature = await prisma.companyFeature.findFirst({
      where: { companyId, featureId: feature.id }
    });
    if (!companyFeature) {
      console.log("🌱 Mapping feature to test company...");
      await prisma.companyFeature.create({
        data: { companyId, featureId: feature.id }
      });
    }

    // 3. Upsert Forecast Configuration
    console.log("🌱 Configuring AI forecasting settings...");
    await prisma.forecastConfigurations.upsert({
      where: { tenantId: companyId },
      update: {
        forecastEnabled: true,
        forecastMode: 'AUTOMATIC',
        frequency: 'DAILY',
        historicalDataMonths: 12,
        modelType: 'PROPHET',
        enableSeasonality: true,
        enablePurchaseRecommendations: true,
        enableDeadStockAnalysis: true,
        enableSlowMovingAnalysis: true,
        forecastRetentionPeriodDays: 90
      },
      create: {
        tenantId: companyId,
        forecastEnabled: true,
        forecastMode: 'AUTOMATIC',
        frequency: 'DAILY',
        historicalDataMonths: 12,
        modelType: 'PROPHET',
        enableSeasonality: true,
        enablePurchaseRecommendations: true,
        enableDeadStockAnalysis: true,
        enableSlowMovingAnalysis: true,
        forecastRetentionPeriodDays: 90
      }
    });

    // 4. Create mock product
    console.log("🌱 Setting up mock product...");
    let product = await prisma.product.findFirst({
      where: { companyId }
    });
    if (!product) {
      product = await prisma.product.create({
        data: {
          companyId,
          name: "AI Smart Widget",
          sku: "WIDGET-AI-01",
          uom: "PCS",
          stock: 15.0,
          reorderLevel: 25.0,
          price: 99.99
        }
      });
    }
    const productId = product.id;

    // 5. Create mock sales invoice history
    console.log("🌱 Creating sales invoice history...");
    const invoice = await prisma.salesInvoice.create({
      data: {
        companyId,
        invoiceNumber: `INV-${Date.now()}`,
        date: new Date(),
        customerName: "Jane Doe Customer",
        totalAmount: 199.98,
        status: "PAID",
        paymentMode: "CASH",
        items: {
          create: [
            {
              productId,
              productName: "AI Smart Widget",
              quantity: 2.0,
              rate: 99.99,
              totalAmount: 199.98
            }
          ]
        }
      }
    });

    // 6. Test change tracking interceptor
    console.log("🌱 Testing markNeedsRefresh trigger...");
    await markNeedsRefresh(companyId);

    let status = await prisma.forecastStatus.findUnique({
      where: { tenantId: companyId }
    });
    console.log("📢 Current Needs Refresh flag:", status?.needsRefresh);
    if (status?.needsRefresh !== true) {
      throw new Error("Validation failed: needsRefresh flag was not set to true after data update simulation.");
    }

    // 7. Enqueue a job
    console.log("🌱 Enqueuing forecast job...");
    const jobId = await enqueueForecastJob(companyId);
    console.log(`🔌 Enqueued Job ID: ${jobId}`);

    status = await prisma.forecastStatus.findUnique({
      where: { tenantId: companyId }
    });
    console.log("📢 Job Run Status (Pending):", status?.status);
    if (status?.status !== "Pending") {
      throw new Error(`Validation failed: Status was not set to Pending. Found: ${status?.status}`);
    }

    // 8. Process queue worker
    console.log("🌱 Executing background queue processor...");
    await processNextJobs();

    // 9. Verify completed run metrics
    console.log("🌱 Verifying run results...");
    status = await prisma.forecastStatus.findUnique({
      where: { tenantId: companyId }
    });
    console.log("📢 Needs Refresh flag (Post Run):", status?.needsRefresh);
    console.log("📢 Job Run Status (Post Run):", status?.status);
    
    if (status?.needsRefresh !== false) {
      throw new Error("Validation failed: needsRefresh flag is still true after running forecast.");
    }
    if (status?.status !== "Completed") {
      throw new Error("Validation failed: Status is not Completed after run.");
    }

    const predictions = await prisma.forecastPrediction.findMany({
      where: { tenantId: companyId, productId }
    });
    console.log(`📢 Saved Predictions Count for Product: ${predictions.length}`);
    if (predictions.length === 0) {
      throw new Error("Validation failed: No predictions were stored for the product.");
    }
    console.log("📢 First Prediction Data:", predictions[0]);

    const history = await prisma.forecastHistory.findFirst({
      where: { tenantId: companyId },
      orderBy: { forecastRunDate: 'desc' }
    });
    console.log("📢 Forecast History Log:", history);
    if (!history) {
      throw new Error("Validation failed: No history log was generated.");
    }

    console.log("🎉 Integration test scenario passed successfully!");
  } catch (error: any) {
    console.error("❌ Test failed with error:", error.message);
    process.exit(1);
  }
}

runTest();
