import { Request, Response } from 'express';
import prisma from '../services/db';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username: string;
    role: string;
    companyId: string;
  };
}

/**
 * 1. CHECK DUE & OVERDUE PAYMENTS
 * Scans POs & Invoices:
 * - Vendor PO due in <= 2 days: Emits "Upcoming Vendor Bill Due" notification to Admins.
 * - Customer Invoice past due date: Emits "Overdue Customer Payment Alert" to Admins.
 */
export async function checkDueAndOverduePayments(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    // 1. Scan Purchase Orders for upcoming vendor payment dues (within 2 days)
    const upcomingVendorPos = await prisma.purchaseOrder.findMany({
      where: {
        companyId,
        status: { in: ['ORDERED', 'RECEIVED', 'PARTIAL'] },
        deliveryDate: {
          gte: now,
          lte: twoDaysFromNow
        }
      },
      include: { vendor: true }
    });

    // 2. Scan Sales Invoices for overdue customer payments
    const overdueCustomerInvoices = await prisma.salesInvoice.findMany({
      where: {
        companyId,
        status: { in: ['UNPAID', 'PARTIAL'] },
        dueDate: {
          lt: now
        }
      },
      include: { customer: true }
    });

    // Find Company Admin users to receive internal notifications
    const companyAdmins = await prisma.user.findMany({
      where: { companyId }
    });

    const createdNotifications: any[] = [];

    // Create notifications for upcoming vendor dues
    for (const po of upcomingVendorPos) {
      const daysLeft = Math.ceil((new Date(po.deliveryDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const message = `Vendor Payment Due Soon: PO ${po.poNo} for "${po.vendor?.name || 'Vendor'}" is due in ${daysLeft} day(s) on ${new Date(po.deliveryDate!).toLocaleDateString()}.`;

      for (const admin of companyAdmins) {
        // Prevent duplicate notification for same PO today
        const existing = await prisma.notification.findFirst({
          where: {
            userId: admin.id,
            message,
            createdAt: { gte: new Date(now.setHours(0, 0, 0, 0)) }
          }
        });

        if (!existing) {
          const notif = await prisma.notification.create({
            data: {
              userId: admin.id,
              category: 'VENDOR_PAYMENT_DUE',
              title: 'Upcoming Vendor Payment Due',
              message,
              channels: 'IN_APP'
            }
          });
          createdNotifications.push(notif);
        }
      }
    }

    // Create notifications for overdue customer invoices
    for (const inv of overdueCustomerInvoices) {
      const overdueDays = Math.ceil((now.getTime() - new Date(inv.dueDate!).getTime()) / (1000 * 60 * 60 * 24));
      const message = `Customer Payment Overdue: Invoice ${inv.invoiceNo} for "${inv.customer?.name || 'Customer'}" is overdue by ${overdueDays} day(s). Total Due: $${inv.total.toFixed(2)}.`;

      for (const admin of companyAdmins) {
        const existing = await prisma.notification.findFirst({
          where: {
            userId: admin.id,
            message,
            createdAt: { gte: new Date(now.setHours(0, 0, 0, 0)) }
          }
        });

        if (!existing) {
          const notif = await prisma.notification.create({
            data: {
              userId: admin.id,
              category: 'CUSTOMER_INVOICE_OVERDUE',
              title: 'Overdue Customer Invoice Alert',
              message,
              channels: 'IN_APP'
            }
          });
          createdNotifications.push(notif);
        }
      }
    }

    return res.json({
      message: 'Payment due checks executed successfully',
      upcomingVendorCount: upcomingVendorPos.length,
      overdueCustomerCount: overdueCustomerInvoices.length,
      notificationsCreated: createdNotifications.length
    });
  } catch (error: any) {
    console.error('[Due Reminders Error]:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * 2. COMBINED MULTI-INVOICE SETTLEMENT (FIFO)
 * Takes a lump-sum payment amount for a customer or vendor and automatically clears
 * past partial/unpaid balances first (FIFO order).
 */
export async function processCombinedPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    const { partyType, partyId, paymentAmount, paymentMethod, referenceNo, notes } = req.body;

    if (!companyId || !partyType || !partyId || !paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ error: 'Invalid parameter data: partyType, partyId, and positive paymentAmount required.' });
    }

    let remainingFund = Number(paymentAmount);
    const settledInvoices: string[] = [];

    if (partyType === 'CUSTOMER') {
      // Fetch open invoices for customer, oldest first (FIFO)
      const openInvoices = await prisma.salesInvoice.findMany({
        where: {
          companyId,
          customerId: partyId,
          status: { in: ['UNPAID', 'PARTIAL'] }
        },
        orderBy: { createdAt: 'asc' }
      });

      for (const inv of openInvoices) {
        if (remainingFund <= 0) break;

        // Calculate unpaid balance on this invoice
        const invTotal = inv.total;
        // Check existing receipts for this invoice
        const existingReceipts = await prisma.companyReceipt.findMany({
          where: { companyId, referenceNo: inv.invoiceNo }
        });
        const paidSoFar = existingReceipts.reduce((sum, r) => sum + r.amount, 0);
        const unpaidBalance = Math.max(0, invTotal - paidSoFar);

        if (unpaidBalance > 0) {
          const applyAmount = Math.min(remainingFund, unpaidBalance);
          remainingFund -= applyAmount;

          const isFullyPaid = (paidSoFar + applyAmount) >= (invTotal - 0.01);
          const newStatus = isFullyPaid ? 'PAID' : 'PARTIAL';

          // Update invoice status
          await prisma.salesInvoice.update({
            where: { id: inv.id },
            data: { status: newStatus }
          });

          // Log company receipt transaction
          await prisma.companyReceipt.create({
            data: {
              companyId,
              amount: applyAmount,
              payerName: inv.customerName || 'Customer',
              category: 'SALES_REVENUE',
              paymentMethod: paymentMethod || 'BANK_TRANSFER',
              referenceNo: inv.invoiceNo,
              notes: notes || `Combined Settlement Receipt for Invoice ${inv.invoiceNo}`
            }
          });

          settledInvoices.push(`${inv.invoiceNo} (Applied: $${applyAmount.toFixed(2)}, Status: ${newStatus})`);
        }
      }
    } else if (partyType === 'VENDOR') {
      // Fetch open Purchase Orders for vendor, oldest first (FIFO)
      const openPos = await prisma.purchaseOrder.findMany({
        where: {
          companyId,
          vendorId: partyId,
          status: { in: ['ORDERED', 'RECEIVED', 'PARTIAL'] }
        },
        orderBy: { createdAt: 'asc' }
      });

      for (const po of openPos) {
        if (remainingFund <= 0) break;

        const poTotal = po.total;
        const existingPayments = await prisma.companyExpense.findMany({
          where: { companyId, referenceNo: po.poNo }
        });
        const paidSoFar = existingPayments.reduce((sum, p) => sum + p.amount, 0);
        const unpaidBalance = Math.max(0, poTotal - paidSoFar);

        if (unpaidBalance > 0) {
          const applyAmount = Math.min(remainingFund, unpaidBalance);
          remainingFund -= applyAmount;

          const isFullyPaid = (paidSoFar + applyAmount) >= (poTotal - 0.01);
          const newStatus = isFullyPaid ? 'COMPLETED' : 'PARTIAL';

          await prisma.purchaseOrder.update({
            where: { id: po.id },
            data: { status: newStatus }
          });

          // Log expense transaction
          await prisma.companyExpense.create({
            data: {
              companyId,
              amount: applyAmount,
              description: `Combined Settlement Payment for PO ${po.poNo}`,
              category: 'RAW_MATERIAL',
              referenceNo: po.poNo
            }
          });

          settledInvoices.push(`PO ${po.poNo} (Applied: $${applyAmount.toFixed(2)}, Status: ${newStatus})`);
        }
      }
    }

    return res.json({
      message: `Combined Settlement Processed for ${partyType}`,
      totalPaid: paymentAmount,
      unusedFund: remainingFund,
      settledInvoices
    });
  } catch (error: any) {
    console.error('[Combined Settlement Error]:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * 3. GET CUSTOMER & VENDOR OUTSTANDING BALANCES DATA
 * Computes account ledger totals for spreadsheet synchronization.
 */
export async function getCustomerVendorBalances(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

    // Customer Balances
    const customers = await prisma.customer.findMany({
      where: { companyId },
      include: { salesInvoices: true }
    });

    const allReceipts = await prisma.companyReceipt.findMany({
      where: { companyId }
    });

    const customerBalances = customers.map(cust => {
      const totalInvoiced = cust.salesInvoices.reduce((sum, inv) => sum + inv.total, 0);
      const invNumbers = new Set(cust.salesInvoices.map(inv => inv.invoiceNo));
      const totalPaid = allReceipts
        .filter(r => r.payerName === cust.name || (r.referenceNo && invNumbers.has(r.referenceNo)))
        .reduce((sum, r) => sum + r.amount, 0);
      const outstandingBalance = Math.max(0, totalInvoiced - totalPaid);

      return {
        'Customer Name': cust.name,
        'Contact Number': cust.contactNo,
        'Email': cust.email || 'N/A',
        'Customer Type': cust.customerType,
        'Total Invoiced': totalInvoiced,
        'Total Paid': totalPaid,
        'Outstanding Balance': outstandingBalance
      };
    });

    // Vendor Balances
    const vendors = await prisma.vendor.findMany({
      where: { companyId },
      include: { purchaseOrders: true }
    });

    const allExpenses = await prisma.companyExpense.findMany({
      where: { companyId }
    });

    const vendorBalances = vendors.map(vend => {
      const totalPoValue = vend.purchaseOrders.reduce((sum, po) => sum + po.total, 0);
      const poNumbers = new Set(vend.purchaseOrders.map(po => po.poNo));
      const totalPaid = allExpenses
        .filter(e => e.referenceNo && poNumbers.has(e.referenceNo))
        .reduce((sum, e) => sum + e.amount, 0);
      const outstandingDues = Math.max(0, totalPoValue - totalPaid);

      return {
        'Vendor Name': vend.name,
        'Contact Number': vend.contactNo,
        'Email': vend.email || 'N/A',
        'Is Vendor': vend.isVendor ? 'Vendor' : 'Supplier',
        'Total PO Value': totalPoValue,
        'Total Paid': totalPaid,
        'Outstanding Dues': outstandingDues
      };
    });

    return res.json({
      customerBalances,
      vendorBalances
    });
  } catch (error: any) {
    console.error('[Balances Error]:', error);
    return res.status(500).json({ error: error.message });
  }
}
