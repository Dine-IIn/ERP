import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../services/db';
import { logAudit } from '../utils/audit';
import { ExpenseSchema, PaymentSchema, ReceiptSchema, BankAccountSchema } from '../types';

// Helper: Append a Cashbook voucher and compute running balances
async function addCashbookVoucher(
  companyId: string,
  entryType: 'INWARD_RECEIPT' | 'OUTWARD_PAYMENT' | 'OUTWARD_EXPENSE',
  amount: number,
  description: string,
  referenceNo?: string
) {
  // Find last voucher to get running balance
  const lastVoucher = await prisma.cashbookVoucher.findFirst({
    where: { companyId },
    orderBy: { createdAt: 'desc' }
  });

  const previousBal = lastVoucher ? lastVoucher.currentBal : 0.0;
  let currentBal = previousBal;

  if (entryType === 'INWARD_RECEIPT') {
    currentBal += amount;
  } else {
    currentBal -= amount;
  }

  // Generate unique voucher number
  const count = await prisma.cashbookVoucher.count({ where: { companyId } });
  const voucherNo = `VCH-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, '0')}`;

  const voucher = await prisma.cashbookVoucher.create({
    data: {
      companyId,
      voucherNo,
      entryType,
      amount,
      previousBal,
      currentBal,
      description,
      referenceNo: referenceNo || null
    }
  });

  return voucher;
}

// =========================================================================
// 1. Expenses Book
// =========================================================================

export async function listExpenses(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const expenses = await prisma.companyExpense.findMany({
      where: { companyId },
      include: {
        paidBy: { select: { id: true, username: true } }
      },
      orderBy: { date: 'desc' }
    });

    return res.json({ expenses });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createExpense(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.userId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const parsed = ExpenseSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
    const { amount: parsedAmount, description, category, date, syncToCashbook, referenceNo } = parsed.data;

    // Create Expense Book entry
    const expense = await prisma.companyExpense.create({
      data: {
        companyId,
        amount: parsedAmount,
        description,
        category,
        date: date ? new Date(date) : new Date(),
        paidById: userId || null,
        referenceNo: referenceNo || null
      }
    });

    // Option to sync with cashbook
    if (syncToCashbook) {
      await addCashbookVoucher(
        companyId,
        'OUTWARD_EXPENSE',
        parsedAmount,
        `Expense: ${description} [${category}]`,
        referenceNo || expense.id
      );
    }

    await logAudit(
      companyId,
      userId || null,
      req.user?.username || null,
      'finance_expense',
      'CREATE',
      null,
      expense,
      req.ip,
      req.headers['user-agent']
    );

    return res.status(201).json({ message: "Expense recorded successfully", expense });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// =========================================================================
// 2. Vendor / Miscellaneous Payments
// =========================================================================

export async function listPayments(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const payments = await prisma.vendorPayment.findMany({
      where: { companyId },
      include: {
        vendor: { select: { id: true, name: true } }
      },
      orderBy: { paymentDate: 'desc' }
    });

    return res.json({ payments });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const parsed = PaymentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
    const { vendorId, amount: parsedAmount, paymentMethod, referenceNo, bankDetails, notes } = parsed.data;
    const count = await prisma.vendorPayment.count({ where: { companyId } });
    const paymentNo = `PAY-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, '0')}`;

    const payment = await prisma.vendorPayment.create({
      data: {
        companyId,
        vendorId,
        paymentNo,
        amount: parsedAmount,
        paymentMethod,
        referenceNo: referenceNo || null,
        bankDetails: bankDetails || null,
        status: "COMPLETED",
        notes: notes || null
      }
    });

    // Auto-record Outward payment inside cashbook voucher ledger
    const vendor = await prisma.vendor.findFirst({ where: { id: vendorId, companyId }, select: { name: true } });
    await addCashbookVoucher(
      companyId,
      'OUTWARD_PAYMENT',
      parsedAmount,
      `Vendor Payment: to ${vendor?.name || 'Vendor'} [No: ${paymentNo}]`,
      referenceNo || paymentNo
    );

    return res.status(201).json({ message: "Vendor payment finalized", payment });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// =========================================================================
// 3. Payer/Customer Receipts
// =========================================================================

export async function listReceipts(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const receipts = await prisma.companyReceipt.findMany({
      where: { companyId },
      orderBy: { date: 'desc' }
    });

    return res.json({ receipts });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createReceipt(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const parsed = ReceiptSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
    const { amount: parsedAmount, payerName, category, paymentMethod, referenceNo, notes } = parsed.data;

    const receipt = await prisma.companyReceipt.create({
      data: {
        companyId,
        amount: parsedAmount,
        payerName,
        category,
        paymentMethod,
        referenceNo: referenceNo || null,
        notes: notes || null
      }
    });

    // Inward receipt adds money into company cashbook voucher ledger
    await addCashbookVoucher(
      companyId,
      'INWARD_RECEIPT',
      parsedAmount,
      `Receipt: from ${payerName} [Category: ${category}]`,
      referenceNo || receipt.id
    );

    return res.status(201).json({ message: "Receipt logged successfully", receipt });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// =========================================================================
// 4. Cashbook running vouchers double-ledger
// =========================================================================

export async function listCashbookVouchers(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const vouchers = await prisma.cashbookVoucher.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    });

    // Compute opening & closing balances
    const summary = await prisma.cashbookVoucher.aggregate({
      where: { companyId },
      _sum: { amount: true }
    });

    const activeVouchers = await prisma.cashbookVoucher.findMany({
      where: { companyId },
      orderBy: { createdAt: 'asc' }
    });

    const openingBalance = activeVouchers.length > 0 ? activeVouchers[0].previousBal : 0.0;
    const closingBalance = activeVouchers.length > 0 ? activeVouchers[activeVouchers.length - 1].currentBal : 0.0;

    return res.json({ vouchers, openingBalance, closingBalance });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// =========================================================================
// 5. GST Settings & Worksheet Liability computes
// =========================================================================

export async function getGstWorksheet(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const company = await prisma.company.findFirst({
      where: { id: companyId },
      select: { name: true, gstin: true, pan: true }
    });

    // Query sales invoices to compute tax liability (GST Output)
    const salesInvoices = await prisma.salesInvoice.findMany({
      where: { companyId, status: "PAID" },
      select: { total: true, subtotal: true, tax: true }
    });

    // Query purchase orders to compute input tax credit (GST Input Credit)
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: { companyId, status: "COMPLETED" },
      select: { total: true, subtotal: true, tax: true }
    });

    const outputGst = salesInvoices.reduce((sum, inv) => sum + (inv.tax || 0.0), 0.0);
    const inputGst = purchaseOrders.reduce((sum, po) => sum + (po.tax || 0.0), 0.0);
    const netGstPayable = outputGst - inputGst;

    return res.json({
      companyGstin: company?.gstin || "Not Registered",
      companyPan: company?.pan || "Not Registered",
      outputGst: Math.round(outputGst * 100) / 100,
      inputGst: Math.round(inputGst * 100) / 100,
      netGstPayable: Math.round(netGstPayable * 100) / 100,
      salesTaxCollected: salesInvoices.length,
      purchasesTaxCredited: purchaseOrders.length
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// =========================================================================
// 6. Bank Accounts CRUD
// =========================================================================

export async function listBankAccounts(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const bankAccounts = await prisma.companyBankAccount.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ bankAccounts });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createBankAccount(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const parsed = BankAccountSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
    const { bankName, accountNo, branchName, ifscCode, accountType, balance: parsedBalance = 0.0 } = parsed.data;

    // Check unique accountNo in company
    const existing = await prisma.companyBankAccount.findFirst({
      where: { companyId, accountNo }
    });
    if (existing) {
      return res.status(409).json({ error: `Bank Account number '${accountNo}' is already registered.` });
    }

    const account = await prisma.companyBankAccount.create({
      data: {
        companyId,
        bankName,
        accountNo,
        branchName: branchName || null,
        ifscCode,
        accountType,
        balance: parsedBalance
      }
    });

    return res.status(201).json({ message: "Bank Account registered successfully", account });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
