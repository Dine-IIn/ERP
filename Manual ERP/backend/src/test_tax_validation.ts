import { numberToIndianWords } from './utils/index';
import { validateInvoiceTaxAndTotal } from './controllers/sales';
import prisma from './services/db';

async function runTests() {
  console.log("=== RUNNING TAX SYSTEM & AMOUNT-IN-WORDS TESTS ===");

  // 1. Test numberToIndianWords
  console.log("\n--- Testing numberToIndianWords ---");
  const testCases = [
    { amount: 0, expected: "Indian Rupees Zero Only" },
    { amount: 1, expected: "Indian Rupees One Only" },
    { amount: 10, expected: "Indian Rupees Ten Only" },
    { amount: 21, expected: "Indian Rupees Twenty One Only" },
    { amount: 105, expected: "Indian Rupees One Hundred Five Only" },
    { amount: 1416, expected: "Indian Rupees One Thousand Four Hundred Sixteen Only" },
    { amount: 100000, expected: "Indian Rupees One Lakh Only" },
    { amount: 10000000, expected: "Indian Rupees One Crore Only" },
    { amount: 10.50, expected: "Indian Rupees Ten And Fifty Paisa Only" },
    { amount: 1416.75, expected: "Indian Rupees One Thousand Four Hundred Sixteen And Seventy Five Paisa Only" },
    { amount: -50, expected: "Indian Rupees Negative Fifty Only" },
  ];

  let failedWords = 0;
  for (const tc of testCases) {
    const result = numberToIndianWords(tc.amount);
    if (result !== tc.expected) {
      console.error(`FAIL: amount=${tc.amount}. Expected: "${tc.expected}", Got: "${result}"`);
      failedWords++;
    } else {
      console.log(`PASS: amount=${tc.amount} => "${result}"`);
    }
  }

  // 2. Test validateInvoiceTaxAndTotal using test database records
  console.log("\n--- Testing validateInvoiceTaxAndTotal ---");
  
  // Find or create test customer & company to run actual validation checks
  try {
    let company = await prisma.company.findFirst();
    if (!company) {
      company = await prisma.company.create({
        data: {
          companyCode: "TESTCOMP",
          name: "Test Company Ltd",
          state: "Gujarat",
          gstin: "24AAACA1294F1Z0"
        }
      });
    }

    // A. Domestic Same-State Customer (Gujarat)
    let domesticSameStateCust = await prisma.customer.findFirst({
      where: { companyId: company.id, state: "Gujarat", clientClassification: "DOMESTIC" }
    });
    if (!domesticSameStateCust) {
      domesticSameStateCust = await prisma.customer.create({
        data: {
          companyId: company.id,
          name: "Domestic Same State Client",
          state: "Gujarat",
          clientClassification: "DOMESTIC",
          customerType: "COMPANY",
          customerGroup: "wholesaler",
          contactNo: "1234567890"
        }
      });
    }

    // B. Domestic Other-State Customer (Maharashtra)
    let domesticOtherStateCust = await prisma.customer.findFirst({
      where: { companyId: company.id, state: "Maharashtra", clientClassification: "DOMESTIC" }
    });
    if (!domesticOtherStateCust) {
      domesticOtherStateCust = await prisma.customer.create({
        data: {
          companyId: company.id,
          name: "Domestic Other State Client",
          state: "Maharashtra",
          clientClassification: "DOMESTIC",
          customerType: "COMPANY",
          customerGroup: "wholesaler",
          contactNo: "1234567890"
        }
      });
    }

    // C. International Customer
    let internationalCust = await prisma.customer.findFirst({
      where: { companyId: company.id, clientClassification: "INTERNATIONAL" }
    });
    if (!internationalCust) {
      internationalCust = await prisma.customer.create({
        data: {
          companyId: company.id,
          name: "International Client Ltd",
          state: "California",
          clientClassification: "INTERNATIONAL",
          customerType: "COMPANY",
          customerGroup: "wholesaler",
          contactNo: "1234567890"
        }
      });
    }

    const items = [
      { quantity: "10", price: "100", discount: "0" }, // 1000 subtotal
      { quantity: "2", price: "250", discount: "10" }  // 500 subtotal - 50 discount = 450
    ]; // Total subtotal = 1450.00
    // Discount overall = 0%
    // Taxable amount = 1450.00

    // Test Domestic Customer (18% tax):
    // Expected tax = 1450.00 * 0.18 = 261.00
    // Expected total = 1450.00 + 261.00 = 1711.00
    console.log("Verifying Domestic Same-State Customer (Gujarat)...");
    await validateInvoiceTaxAndTotal(company.id, domesticSameStateCust.id, items, 0, 261.00, 1711.00, null);
    console.log("PASS: Domestic Same-State invoice validation succeeded.");

    console.log("Verifying Domestic Other-State Customer (Maharashtra)...");
    await validateInvoiceTaxAndTotal(company.id, domesticOtherStateCust.id, items, 0, 261.00, 1711.00, null);
    console.log("PASS: Domestic Other-State invoice validation succeeded.");

    // Test International Customer (0% tax):
    // Expected tax = 0.00
    // Expected total = 1450.00
    console.log("Verifying International Customer...");
    await validateInvoiceTaxAndTotal(company.id, internationalCust.id, items, 0, 0.00, 1450.00, null);
    console.log("PASS: International invoice validation succeeded.");

    // Test Failure case: incorrect tax
    console.log("Verifying validation failure with incorrect tax...");
    try {
      await validateInvoiceTaxAndTotal(company.id, domesticSameStateCust.id, items, 0, 200.00, 1711.00, null);
      console.error("FAIL: Expected validation error for incorrect tax, but it succeeded.");
    } catch (e: any) {
      console.log(`PASS: Correctly rejected incorrect tax: "${e.message}"`);
    }

    // Test Failure case: incorrect total
    console.log("Verifying validation failure with incorrect total...");
    try {
      await validateInvoiceTaxAndTotal(company.id, domesticSameStateCust.id, items, 0, 261.00, 1800.00, null);
      console.error("FAIL: Expected validation error for incorrect total, but it succeeded.");
    } catch (e: any) {
      console.log(`PASS: Correctly rejected incorrect total: "${e.message}"`);
    }

  } catch (error) {
    console.error("Database test setup or validation failed:", error);
  }

  console.log("\n=== TESTS COMPLETED ===");
}

runTests();
