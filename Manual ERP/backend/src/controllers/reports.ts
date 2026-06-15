import { GetHrReportQuerySchema } from '../types/index';
import { GetInventoryReportQuerySchema } from '../types/index';
import { GetPurchaseReportQuerySchema } from '../types/index';
import { GetSalesReportQuerySchema } from '../types/index';
import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../services/db';

// Helper: Convert array of objects to CSV string
function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const escaped = ('' + row[header]).replace(/"/g, '\\"');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

// =========================================================================
// 1. Sales Analytics Reports
// =========================================================================

export async function getSalesReport(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const parsedQuery = GetSalesReportQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) return res.status(400).json({ error: "Bad Request", details: parsedQuery.error });


    // Aggregate monthly sales invoice amounts
    const invoices = await prisma.salesInvoice.findMany({
      where: { companyId },
      select: { total: true, date: true, status: true }
    });

    const monthlySales: Record<string, number> = {};
    let totalSalesRevenue = 0.0;
    let paidSalesCount = 0;
    let unpaidSalesCount = 0;

    invoices.forEach(inv => {
      const dateStr = inv.date.toISOString().slice(0, 7); // YYYY-MM
      monthlySales[dateStr] = (monthlySales[dateStr] || 0) + inv.total;
      totalSalesRevenue += inv.total;
      if (inv.status === "PAID") {
        paidSalesCount++;
      } else {
        unpaidSalesCount++;
      }
    });

    const formattedMonthlySales = Object.entries(monthlySales).map(([month, value]) => ({
      month,
      value: Math.round(value * 100) / 100
    })).sort((a, b) => a.month.localeCompare(b.month));

    const invoiceSummaries = invoices.map(inv => ({
      date: inv.date.toISOString().slice(0, 10),
      total: inv.total,
      status: inv.status
    }));

    const isCsv = req.query.format === 'csv';
    if (isCsv) {
      const csvStr = convertToCSV(invoiceSummaries);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sales_report.csv"');
      return res.status(200).send(csvStr);
    }

    return res.json({
      monthlySales: formattedMonthlySales,
      totalSalesRevenue: Math.round(totalSalesRevenue * 100) / 100,
      paidSalesCount,
      unpaidSalesCount,
      invoiceCount: invoices.length
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// =========================================================================
// 2. Purchase Analytics Reports
// =========================================================================

export async function getPurchaseReport(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    // Aggregate purchase orders
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: { companyId },
      select: { total: true, date: true, status: true }
    });

    const monthlyPurchases: Record<string, number> = {};
    let totalPurchasesValuation = 0.0;
    let pendingCount = 0;
    let completedCount = 0;

    purchaseOrders.forEach(po => {
      const dateStr = po.date.toISOString().slice(0, 7); // YYYY-MM
      monthlyPurchases[dateStr] = (monthlyPurchases[dateStr] || 0) + po.total;
      totalPurchasesValuation += po.total;
      if (po.status === "COMPLETED" || po.status === "APPROVED") {
        completedCount++;
      } else {
        pendingCount++;
      }
    });

    const formattedMonthlyPurchases = Object.entries(monthlyPurchases).map(([month, value]) => ({
      month,
      value: Math.round(value * 100) / 100
    })).sort((a, b) => a.month.localeCompare(b.month));

    const poSummaries = purchaseOrders.map(po => ({
      date: po.date.toISOString().slice(0, 10),
      total: po.total,
      status: po.status
    }));

    const isCsv = req.query.format === 'csv';
    if (isCsv) {
      const csvStr = convertToCSV(poSummaries);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="purchase_report.csv"');
      return res.status(200).send(csvStr);
    }

    return res.json({
      monthlyPurchases: formattedMonthlyPurchases,
      totalPurchasesValuation: Math.round(totalPurchasesValuation * 100) / 100,
      pendingCount,
      completedCount,
      purchaseCount: purchaseOrders.length
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// =========================================================================
// 3. Inventory Asset Reports
// =========================================================================

export async function getInventoryReport(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    // Fetch products list and stock levels
    const products = await prisma.product.findMany({
      where: { companyId },
      select: { name: true, stock: true, pricing: true, reorderLevel: true, uom: true }
    });

    let totalAssetValuation = 0.0;
    let lowStockCount = 0;
    const itemsList: any[] = [];

    products.forEach(p => {
      const assetValue = p.stock * p.pricing;
      totalAssetValuation += assetValue;
      const isLow = p.stock <= p.reorderLevel;
      if (isLow) lowStockCount++;

      itemsList.push({
        name: p.name,
        stock: p.stock,
        uom: p.uom,
        pricing: p.pricing,
        assetValue: Math.round(assetValue * 100) / 100,
        isLowStock: isLow ? "YES" : "NO"
      });
    });

    const isCsv = req.query.format === 'csv';
    if (isCsv) {
      const csvStr = convertToCSV(itemsList);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="inventory_report.csv"');
      return res.status(200).send(csvStr);
    }

    return res.json({
      products: itemsList,
      totalAssetValuation: Math.round(totalAssetValuation * 100) / 100,
      lowStockCount,
      totalProductsCount: products.length
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// =========================================================================
// 4. HR Payroll & Attendance Level Reports
// =========================================================================

export async function getHrReport(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    // Headcount
    const headcount = await prisma.user.count({ where: { companyId } });

    // Active punch metrics
    const attendances = await prisma.attendance.findMany({
      where: { companyId },
      select: { status: true, duration: true }
    });

    let presentCount = 0;
    let lateCount = 0;
    let totalWorkedHours = 0.0;

    attendances.forEach(att => {
      if (att.status === "PRESENT") presentCount++;
      if (att.status === "LATE") lateCount++;
      totalWorkedHours += (att.duration || 0.0);
    });

    // Payroll disbursements totals
    const payrollPeriods = await prisma.payrollPeriod.findMany({
      where: { companyId, status: "DISBURSED" },
      select: { netSalary: true }
    });

    const totalSalaryDisbursed = payrollPeriods.reduce((sum, p) => sum + p.netSalary, 0.0);

    const metrics = [
      { metric: "Headcount", value: headcount },
      { metric: "Presents Registered", value: presentCount },
      { metric: "Lates Registered", value: lateCount },
      { metric: "Total Work Hours logged", value: Math.round(totalWorkedHours * 100) / 100 },
      { metric: "Total Salaries Paid", value: Math.round(totalSalaryDisbursed * 100) / 100 }
    ];

    const isCsv = req.query.format === 'csv';
    if (isCsv) {
      const csvStr = convertToCSV(metrics);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="hr_report.csv"');
      return res.status(200).send(csvStr);
    }

    return res.json({
      headcount,
      presentCount,
      lateCount,
      totalWorkedHours: Math.round(totalWorkedHours * 100) / 100,
      totalSalaryDisbursed: Math.round(totalSalaryDisbursed * 100) / 100
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// =========================================================================
// 5. Financial Inflow/Outflow Reports
// =========================================================================

export async function getFinancialReport(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    // Aggregate receipts (cash-inflow)
    const receipts = await prisma.companyReceipt.findMany({
      where: { companyId },
      select: { amount: true, date: true }
    });

    // Aggregate expenses + payments (cash-outflow)
    const expenses = await prisma.companyExpense.findMany({
      where: { companyId },
      select: { amount: true, date: true }
    });
    const payments = await prisma.vendorPayment.findMany({
      where: { companyId },
      select: { amount: true, paymentDate: true }
    });

    let totalInflow = receipts.reduce((sum, rec) => sum + rec.amount, 0.0);
    let totalOutflow = expenses.reduce((sum, exp) => sum + exp.amount, 0.0) + payments.reduce((sum, pay) => sum + pay.amount, 0.0);
    let netSavings = totalInflow - totalOutflow;

    const monthlyCashflow: Record<string, { inward: number; outward: number }> = {};

    receipts.forEach(rec => {
      const m = rec.date.toISOString().slice(0, 7);
      if (!monthlyCashflow[m]) monthlyCashflow[m] = { inward: 0, outward: 0 };
      monthlyCashflow[m].inward += rec.amount;
    });

    expenses.forEach(exp => {
      const m = exp.date.toISOString().slice(0, 7);
      if (!monthlyCashflow[m]) monthlyCashflow[m] = { inward: 0, outward: 0 };
      monthlyCashflow[m].outward += exp.amount;
    });

    payments.forEach(pay => {
      const m = pay.paymentDate.toISOString().slice(0, 7);
      if (!monthlyCashflow[m]) monthlyCashflow[m] = { inward: 0, outward: 0 };
      monthlyCashflow[m].outward += pay.amount;
    });

    const cashflowArray = Object.entries(monthlyCashflow).map(([month, data]) => ({
      month,
      inward: Math.round(data.inward * 100) / 100,
      outward: Math.round(data.outward * 100) / 100,
      net: Math.round((data.inward - data.outward) * 100) / 100
    })).sort((a, b) => a.month.localeCompare(b.month));

    const isCsv = req.query.format === 'csv';
    if (isCsv) {
      const csvStr = convertToCSV(cashflowArray);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="financial_cashflow_report.csv"');
      return res.status(200).send(csvStr);
    }

    return res.json({
      monthlyCashflow: cashflowArray,
      totalInflow: Math.round(totalInflow * 100) / 100,
      totalOutflow: Math.round(totalOutflow * 100) / 100,
      netSavings: Math.round(netSavings * 100) / 100
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
