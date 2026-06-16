"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listExpenses = listExpenses;
exports.createExpense = createExpense;
exports.listPayments = listPayments;
exports.createPayment = createPayment;
exports.listReceipts = listReceipts;
exports.createReceipt = createReceipt;
exports.listCashbookVouchers = listCashbookVouchers;
exports.getGstWorksheet = getGstWorksheet;
exports.listBankAccounts = listBankAccounts;
exports.createBankAccount = createBankAccount;
const db_1 = __importDefault(require("../services/db"));
const audit_1 = require("../utils/audit");
const types_1 = require("../types");
// Helper: Append a Cashbook voucher and compute running balances
async function addCashbookVoucher(companyId, entryType, amount, description, referenceNo) {
    // Find last voucher to get running balance
    const lastVoucher = await db_1.default.cashbookVoucher.findFirst({
        where: { companyId },
        orderBy: { createdAt: 'desc' }
    });
    const previousBal = lastVoucher ? lastVoucher.currentBal : 0.0;
    let currentBal = previousBal;
    if (entryType === 'INWARD_RECEIPT') {
        currentBal += amount;
    }
    else {
        currentBal -= amount;
    }
    // Generate unique voucher number
    const count = await db_1.default.cashbookVoucher.count({ where: { companyId } });
    const voucherNo = `VCH-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, '0')}`;
    const voucher = await db_1.default.cashbookVoucher.create({
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
async function listExpenses(req, res) {
    try {
        const companyId = req.user?.companyId;
        if (!companyId)
            return res.status(401).json({ error: "Unauthorized" });
        const expenses = await db_1.default.companyExpense.findMany({
            where: { companyId },
            include: {
                paidBy: { select: { id: true, username: true } }
            },
            orderBy: { date: 'desc' }
        });
        return res.json({ expenses });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
async function createExpense(req, res) {
    try {
        const companyId = req.user?.companyId;
        const userId = req.user?.userId;
        if (!companyId)
            return res.status(401).json({ error: "Unauthorized" });
        const parsed = types_1.ExpenseSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ error: parsed.error.format() });
        const { amount: parsedAmount, description, category, date, syncToCashbook, referenceNo } = parsed.data;
        // Create Expense Book entry
        const expense = await db_1.default.companyExpense.create({
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
            await addCashbookVoucher(companyId, 'OUTWARD_EXPENSE', parsedAmount, `Expense: ${description} [${category}]`, referenceNo || expense.id);
        }
        await (0, audit_1.logAudit)(companyId, userId || null, req.user?.username || null, 'finance_expense', 'CREATE', null, expense, req.ip, req.headers['user-agent']);
        return res.status(201).json({ message: "Expense recorded successfully", expense });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
// =========================================================================
// 2. Vendor / Miscellaneous Payments
// =========================================================================
async function listPayments(req, res) {
    try {
        const companyId = req.user?.companyId;
        if (!companyId)
            return res.status(401).json({ error: "Unauthorized" });
        const payments = await db_1.default.vendorPayment.findMany({
            where: { companyId },
            include: {
                vendor: { select: { id: true, name: true } }
            },
            orderBy: { paymentDate: 'desc' }
        });
        return res.json({ payments });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
async function createPayment(req, res) {
    try {
        const companyId = req.user?.companyId;
        if (!companyId)
            return res.status(401).json({ error: "Unauthorized" });
        const parsed = types_1.PaymentSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ error: parsed.error.format() });
        const { vendorId, amount: parsedAmount, paymentMethod, referenceNo, bankDetails, notes } = parsed.data;
        const count = await db_1.default.vendorPayment.count({ where: { companyId } });
        const paymentNo = `PAY-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, '0')}`;
        const payment = await db_1.default.vendorPayment.create({
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
        const vendor = await db_1.default.vendor.findFirst({ where: { id: vendorId, companyId }, select: { name: true } });
        await addCashbookVoucher(companyId, 'OUTWARD_PAYMENT', parsedAmount, `Vendor Payment: to ${vendor?.name || 'Vendor'} [No: ${paymentNo}]`, referenceNo || paymentNo);
        return res.status(201).json({ message: "Vendor payment finalized", payment });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
// =========================================================================
// 3. Payer/Customer Receipts
// =========================================================================
async function listReceipts(req, res) {
    try {
        const companyId = req.user?.companyId;
        if (!companyId)
            return res.status(401).json({ error: "Unauthorized" });
        const receipts = await db_1.default.companyReceipt.findMany({
            where: { companyId },
            orderBy: { date: 'desc' }
        });
        return res.json({ receipts });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
async function createReceipt(req, res) {
    try {
        const companyId = req.user?.companyId;
        if (!companyId)
            return res.status(401).json({ error: "Unauthorized" });
        const parsed = types_1.ReceiptSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ error: parsed.error.format() });
        const { amount: parsedAmount, payerName, category, paymentMethod, referenceNo, notes } = parsed.data;
        const receipt = await db_1.default.companyReceipt.create({
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
        await addCashbookVoucher(companyId, 'INWARD_RECEIPT', parsedAmount, `Receipt: from ${payerName} [Category: ${category}]`, referenceNo || receipt.id);
        return res.status(201).json({ message: "Receipt logged successfully", receipt });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
// =========================================================================
// 4. Cashbook running vouchers double-ledger
// =========================================================================
async function listCashbookVouchers(req, res) {
    try {
        const companyId = req.user?.companyId;
        if (!companyId)
            return res.status(401).json({ error: "Unauthorized" });
        const vouchers = await db_1.default.cashbookVoucher.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' }
        });
        // Compute opening & closing balances
        const summary = await db_1.default.cashbookVoucher.aggregate({
            where: { companyId },
            _sum: { amount: true }
        });
        const activeVouchers = await db_1.default.cashbookVoucher.findMany({
            where: { companyId },
            orderBy: { createdAt: 'asc' }
        });
        const openingBalance = activeVouchers.length > 0 ? activeVouchers[0].previousBal : 0.0;
        const closingBalance = activeVouchers.length > 0 ? activeVouchers[activeVouchers.length - 1].currentBal : 0.0;
        return res.json({ vouchers, openingBalance, closingBalance });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
// =========================================================================
// 5. GST Settings & Worksheet Liability computes
// =========================================================================
async function getGstWorksheet(req, res) {
    try {
        const companyId = req.user?.companyId;
        if (!companyId)
            return res.status(401).json({ error: "Unauthorized" });
        const company = await db_1.default.company.findFirst({
            where: { id: companyId },
            select: { name: true, gstin: true, pan: true }
        });
        // Query sales invoices to compute tax liability (GST Output)
        const salesInvoices = await db_1.default.salesInvoice.findMany({
            where: { companyId, status: "PAID" },
            select: { total: true, subtotal: true, tax: true }
        });
        // Query purchase orders to compute input tax credit (GST Input Credit)
        const purchaseOrders = await db_1.default.purchaseOrder.findMany({
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
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
// =========================================================================
// 6. Bank Accounts CRUD
// =========================================================================
async function listBankAccounts(req, res) {
    try {
        const companyId = req.user?.companyId;
        if (!companyId)
            return res.status(401).json({ error: "Unauthorized" });
        const bankAccounts = await db_1.default.companyBankAccount.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' }
        });
        return res.json({ bankAccounts });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
async function createBankAccount(req, res) {
    try {
        const companyId = req.user?.companyId;
        if (!companyId)
            return res.status(401).json({ error: "Unauthorized" });
        const parsed = types_1.BankAccountSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ error: parsed.error.format() });
        const { bankName, accountNo, branchName, ifscCode, accountType, balance: parsedBalance = 0.0 } = parsed.data;
        // Check unique accountNo in company
        const existing = await db_1.default.companyBankAccount.findFirst({
            where: { companyId, accountNo }
        });
        if (existing) {
            return res.status(409).json({ error: `Bank Account number '${accountNo}' is already registered.` });
        }
        const account = await db_1.default.companyBankAccount.create({
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
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
//# sourceMappingURL=finance.js.map