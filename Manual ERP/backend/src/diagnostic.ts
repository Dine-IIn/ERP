import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  try {
    console.log("=== DIAGNOSTIC START ===");
    
    // 1. Get companies
    const companies = await prisma.company.findMany({
      include: {
        features: {
          include: {
            feature: true
          }
        }
      }
    });

    console.log(`Found ${companies.length} companies:`);
    for (const comp of companies) {
      console.log(`\nCompany: ${comp.name} (${comp.companyCode})`);
      console.log(`Features mapped (${comp.features.length}):`);
      comp.features.forEach(f => {
        console.log(` - ${f.feature.key}`);
      });
      
      const roles = await prisma.role.findMany({
        where: { companyId: comp.id }
      });
      console.log(`Roles for this company (${roles.length}):`);
      for (const role of roles) {
        console.log(` - Role: ${role.name}`);
        console.log(`   Permissions: ${role.permissions}`);
      }
    }
    
    console.log("\n=== DIAGNOSTIC END ===");
  } catch (err) {
    console.error("Error running diagnostic:", err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
