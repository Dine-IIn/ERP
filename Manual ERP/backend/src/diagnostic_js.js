const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    console.log("=== JS DIAGNOSTIC ===");
    const companies = await prisma.company.findMany({
      include: {
        features: {
          include: {
            feature: true
          }
        }
      }
    });
    for (const comp of companies) {
      console.log(`Company: ${comp.name} [Code: ${comp.companyCode}]`);
      console.log("Features mapped:", comp.features.map(f => f.feature.key));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
