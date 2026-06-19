import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const customers = await prisma.customer.findMany({});
  console.log("=== CUSTOMERS ===");
  customers.forEach(c => {
    console.log({
      id: c.id,
      name: c.name,
      gstNumber: c.gstNumber,
      panNumber: c.panNumber,
      bankName: c.bankName,
      accountNumber: c.accountNumber,
      ifscCode: c.ifscCode
    });
  });

  const invoices = await prisma.salesInvoice.findMany({
    include: { customer: true }
  });
  console.log("=== INVOICES ===");
  invoices.forEach(inv => {
    console.log({
      id: inv.id,
      invoiceNo: inv.invoiceNo,
      customerId: inv.customerId,
      customerGstNumber: inv.customerGstNumber,
      customerPanNumber: inv.customerPanNumber,
      customerBankName: inv.customerBankName,
      customerAccountNumber: inv.customerAccountNumber,
      hasCustomerRel: !!inv.customer,
      custGstRel: inv.customer?.gstNumber
    });
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
