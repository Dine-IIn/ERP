import prisma from '../src/services/db';

async function main() {
  try {
    const companies = await prisma.company.findMany();
    console.log('--- Companies in Database ---');
    console.log(JSON.stringify(companies, null, 2));

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        status: true,
        companyId: true
      }
    });
    console.log('--- Users in Database ---');
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
