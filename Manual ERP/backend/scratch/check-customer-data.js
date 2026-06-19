const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const customers = await prisma.customer.findMany({
    select: { id: true, name: true, gstNumber: true, panNumber: true, bankName: true, accountNumber: true, ifscCode: true, accountHolderName: true }
  });

  console.log('\n=== CUSTOMER MASTER DATA ===');
  customers.forEach(function(c) {
    console.log('\nCustomer: ' + c.name);
    console.log('  GST:    ' + (c.gstNumber || 'NULL - NOT FILLED'));
    console.log('  PAN:    ' + (c.panNumber || 'NULL - NOT FILLED'));
    console.log('  Bank:   ' + (c.bankName || 'NULL - NOT FILLED'));
    console.log('  A/C No: ' + (c.accountNumber || 'NULL - NOT FILLED'));
    console.log('  IFSC:   ' + (c.ifscCode || 'NULL - NOT FILLED'));
    console.log('  Holder: ' + (c.accountHolderName || 'NULL - NOT FILLED'));
  });

  const invoices = await prisma.salesInvoice.findMany({
    take: 5,
    orderBy: { date: 'desc' },
    select: { invoiceNo: true, customerGstNumber: true, customerPanNumber: true, customerBankName: true, customerAccountNumber: true }
  });
  
  console.log('\n=== INVOICE STORED CUSTOMER DATA (latest 5) ===');
  invoices.forEach(function(i) {
    console.log('\nInvoice: ' + i.invoiceNo);
    console.log('  GST:    ' + (i.customerGstNumber || 'NULL'));
    console.log('  PAN:    ' + (i.customerPanNumber || 'NULL'));
    console.log('  Bank:   ' + (i.customerBankName || 'NULL'));
    console.log('  A/C No: ' + (i.customerAccountNumber || 'NULL'));
  });

  await prisma.$disconnect();
}

main().catch(function(e) { console.error(e.message); process.exit(1); });
