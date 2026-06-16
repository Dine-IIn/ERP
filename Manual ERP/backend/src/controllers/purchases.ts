import { CreateVendorPaymentBodySchema } from '../types/index';
import { CreatePurchaseReturnBodySchema } from '../types/index';
import { CreateGrnBodySchema } from '../types/index';
import { UpdatePurchaseOrderStatusBodySchema } from '../types/index';
import { CreatePurchaseOrderBodySchema } from '../types/index';
import { UpdateVendorQuotationStatusBodySchema } from '../types/index';
import { CreateVendorQuotationBodySchema } from '../types/index';
import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../services/db';
import { logAudit } from '../utils/audit';
import { markNeedsRefresh } from '../services/forecast';

// Shared purchases financial helpers
async function handleOutwardPayment(
  tx: any,
  companyId: string,
  amount: number,
  vendorId: string,
  paymentNo: string,
  referenceNo: string | null
) {
  const vendor = await tx.vendor.findFirst({ where: { id: vendorId, companyId }, select: { name: true } });
  const vendorName = vendor?.name || "Vendor";

  await tx.companyExpense.create({
    data: {
      companyId,
      amount,
      description: `Vendor Payment: to ${vendorName} [No: ${paymentNo}]`,
      category: "PROCUREMENT",
      date: new Date(),
      referenceNo: paymentNo
    }
  });

  const bankAccount = await tx.companyBankAccount.findFirst({ where: { companyId } });
  if (bankAccount) {
    await tx.companyBankAccount.update({
      where: { id: bankAccount.id },
      data: { balance: { decrement: amount } }
    });
  }

  const lastVoucher = await tx.cashbookVoucher.findFirst({
    where: { companyId },
    orderBy: { createdAt: 'desc' }
  });
  const previousBal = lastVoucher ? lastVoucher.currentBal : 0.0;
  const currentBal = previousBal - amount;

  const count = await tx.cashbookVoucher.count({ where: { companyId } });
  const voucherNo = `VCH-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, '0')}`;

  await tx.cashbookVoucher.create({
    data: {
      companyId,
      voucherNo,
      entryType: 'OUTWARD_PAYMENT',
      amount,
      previousBal,
      currentBal,
      description: `Vendor Payment: to ${vendorName} [No: ${paymentNo}]`,
      referenceNo: paymentNo
    }
  });
}

async function handleVoidOutwardPayment(
  tx: any,
  companyId: string,
  amount: number,
  paymentNo: string
) {
  await tx.companyExpense.deleteMany({
    where: { companyId, referenceNo: paymentNo }
  });

  const bankAccount = await tx.companyBankAccount.findFirst({ where: { companyId } });
  if (bankAccount) {
    await tx.companyBankAccount.update({
      where: { id: bankAccount.id },
      data: { balance: { increment: amount } }
    });
  }

  await tx.cashbookVoucher.deleteMany({
    where: { companyId, referenceNo: paymentNo }
  });
}

// ==========================================
// 1. VENDOR QUOTATIONS CONTROLLER
// ==========================================

export async function listVendorQuotations(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const quotations = await prisma.vendorQuotation.findMany({
      where: { companyId },
      include: {
        vendor: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, uom: true } } } }
      },
      orderBy: { date: 'desc' }
    });

    return res.json({ quotations });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createVendorQuotation(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    
    const parsedBody = CreateVendorQuotationBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Bad Request", details: parsedBody.error });
    const {  vendorId, quoteNo, date, validUntil, subtotal, tax, total, status, items  } = parsedBody.data;


    if (!vendorId || !quoteNo || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Vendor, Quote Number, and at least one quote item are required." });
    }

    const existing = await prisma.vendorQuotation.findFirst({
      where: { companyId, quoteNo }
    });
    if (existing) {
      return res.status(409).json({ error: `Vendor Quotation '${quoteNo}' already registered.` });
    }

    const quotation = await prisma.vendorQuotation.create({
      data: {
        companyId,
        vendorId,
        quoteNo,
        date: date ? new Date(date) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
        subtotal: parseFloat(subtotal) || 0.0,
        tax: parseFloat(tax) || 0.0,
        total: parseFloat(total) || 0.0,
        status: status || "PENDING",
        items: {
          create: items.map((it: any) => ({
            productId: it.productId,
            quantity: parseFloat(it.quantity) || 1.0,
            price: parseFloat(it.price) || 0.0
          }))
        }
      },
      include: { items: true }
    });

    return res.status(201).json({ message: "Vendor Quotation registered successfully", quotation });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateVendorQuotationStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    
    const parsedBody = UpdateVendorQuotationStatusBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Bad Request", details: parsedBody.error });
    const {  status  } = parsedBody.data;


    const quote = await prisma.vendorQuotation.findFirst({ where: { id, companyId } });
    if (!quote) return res.status(404).json({ error: "Vendor Quotation not found" });
    const updated = await prisma.vendorQuotation.update({
      where: { id },
      data: { status }
    });

    return res.json({ message: "Vendor Quotation status updated", quotation: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteVendorQuotation(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const quote = await prisma.vendorQuotation.findFirst({ where: { id, companyId } });
    if (!quote) return res.status(404).json({ error: "Vendor Quotation not found" });
    await prisma.vendorQuotation.delete({ where: { id } });
    return res.json({ message: "Vendor Quotation deleted successfully." });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 2. PURCHASE ORDERS CONTROLLER
// ==========================================

export async function listPurchaseOrders(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: { companyId },
      include: {
        vendor: { select: { id: true, name: true, contactNo: true } },
        items: { include: { product: { select: { id: true, name: true, uom: true } } } }
      },
      orderBy: { date: 'desc' }
    });

    return res.json({ purchaseOrders });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createPurchaseOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    
    const parsedBody = CreatePurchaseOrderBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Bad Request", details: parsedBody.error });
    const {  vendorId, poNo, date, deliveryDate, subtotal, discount, tax, total, status, items  } = parsedBody.data;


    if (!vendorId || !poNo || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Vendor, PO Number, and at least one item are required." });
    }

    const existing = await prisma.purchaseOrder.findFirst({
      where: { companyId, poNo }
    });
    if (existing) {
      return res.status(409).json({ error: `Purchase Order '${poNo}' already registered.` });
    }

    const po = await prisma.purchaseOrder.create({
      data: {
        companyId,
        vendorId,
        poNo,
        date: date ? new Date(date) : new Date(),
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        subtotal: parseFloat(subtotal) || 0.0,
        discount: parseFloat(discount) || 0.0,
        tax: parseFloat(tax) || 0.0,
        total: parseFloat(total) || 0.0,
        status: status || "PENDING",
        items: {
          create: items.map((it: any) => ({
            productId: it.productId,
            quantity: parseFloat(it.quantity) || 1.0,
            price: parseFloat(it.price) || 0.0,
            discount: parseFloat(it.discount) || 0.0
          }))
        }
      },
      include: { items: true }
    });

    return res.status(201).json({ message: "Purchase Order created successfully", purchaseOrder: po });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updatePurchaseOrderStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    
    const parsedBody = UpdatePurchaseOrderStatusBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Bad Request", details: parsedBody.error });
    const {  status  } = parsedBody.data;


    const poExist = await prisma.purchaseOrder.findFirst({ where: { id, companyId } });
    if (!poExist) return res.status(404).json({ error: "Purchase Order not found" });
    const po = await prisma.purchaseOrder.update({
      where: { id },
      data: { status }
    });

    await markNeedsRefresh(companyId);
    return res.json({ message: "Purchase Order status updated", purchaseOrder: po });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deletePurchaseOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const poExist = await prisma.purchaseOrder.findFirst({ where: { id, companyId } });
    if (!poExist) return res.status(404).json({ error: "Purchase Order not found" });
    await prisma.purchaseOrder.delete({ where: { id } });
    return res.json({ message: "Purchase Order voided and deleted." });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 3. GOODS RECEIPT NOTE (GRN) & INVENTORY STOCK INWARD ADJUSTMENT
// ==========================================

export async function listGrns(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const grns = await prisma.grn.findMany({
      where: { companyId },
      include: {
        purchaseOrder: { select: { id: true, poNo: true } },
        items: { include: { product: { select: { id: true, name: true, uom: true } } } }
      },
      orderBy: { receivedDate: 'desc' }
    });

    return res.json({ grns });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createGrn(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    
    const parsedBody = CreateGrnBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Bad Request", details: parsedBody.error });
    const {  poId, grnNo, receivedDate, receivedBy, gateEntryNo, challanNo, status, notes, items  } = parsedBody.data;


    if (!poId || !grnNo || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "PO Reference, GRN Number, and items checklist are required." });
    }

    const existing = await prisma.grn.findFirst({
      where: { companyId, grnNo }
    });
    if (existing) {
      return res.status(409).json({ error: `GRN '${grnNo}' already exists in database.` });
    }

    // Transaction to create GRN, adjust inventory stocks, and write stock ledger logs!
    const grn = await prisma.$transaction(async (tx) => {
      const createdGrn = await tx.grn.create({
        data: {
          companyId,
          poId,
          grnNo,
          receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
          receivedBy: receivedBy || null,
          gateEntryNo: gateEntryNo || null,
          challanNo: challanNo || null,
          status: status || "RECEIVED",
          notes: notes || null,
          items: {
            create: items.map((it: any) => ({
              productId: it.productId,
              qtyOrdered: parseFloat(it.qtyOrdered) || 0.0,
              qtyReceived: parseFloat(it.qtyReceived) || 0.0,
              qtyAccepted: parseFloat(it.qtyAccepted) || 0.0,
              qtyRejected: parseFloat(it.qtyRejected) || 0.0
            }))
          }
        },
        include: { items: true }
      });

      // Update product inventory levels (quarantine stock) and stock adjustments ledger logs
      for (const item of items) {
        const prod = await tx.product.findFirst({ where: { id: item.productId, companyId } });
        if (prod) {
          const qtyToAdd = parseFloat(item.qtyAccepted) || 0.0;
          const previousStock = prod.stock || 0.0;
          const newStock = previousStock; // physical stock remains unchanged until QC passes

          // 1. Update product quarantine stock level atomically
          await tx.product.update({
            where: { id: item.productId },
            data: { quarantineStock: { increment: qtyToAdd } }
          });

          // 2. Generate stock adjustment ledger transaction
          await tx.stockAdjustment.create({
            data: {
              companyId,
              productId: item.productId,
              adjustmentNo: `ADJ-IN-${Math.floor(100000 + Math.random() * 900000)}`,
              type: "INWARD_PO",
              quantity: qtyToAdd,
              previousStock,
              newStock,
              reason: `Supply inward via Goods Receipt Note '${grnNo}' linked to PO (Placed in Quarantine Hold).`,
              referenceNo: grnNo
            }
          });
        }
      }

      // Check if PO is Subcontract PO and hook it to complete the Job Card
      const purchaseOrder = await tx.purchaseOrder.findFirst({ where: { id: poId, companyId }});

      // Auto-update PO status to COMPLETED when GRN is completed
      await tx.purchaseOrder.update({
        where: { id: poId },
        data: { status: "COMPLETED" }
      });

      if (purchaseOrder && purchaseOrder.isSubcontract && purchaseOrder.jobCardId) {
        const totalAccepted = items.reduce((sum: number, it: any) => sum + (parseFloat(it.qtyAccepted) || 0.0), 0);
        const totalScrapped = items.reduce((sum: number, it: any) => sum + (parseFloat(it.qtyRejected) || 0.0), 0);
        
        await tx.jobCard.update({
          where: { id: purchaseOrder.jobCardId },
          data: {
            status: "COMPLETED",
            endTime: new Date(),
            qtyAccepted: totalAccepted,
            qtyScrapped: totalScrapped
          }
        });
      }

      return createdGrn;
    });

    return res.status(201).json({ message: "GRN logged and inventory inward adjustments updated successfully", grn });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteGrn(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    
    // Fetch GRN to adjust stock back (subtract accepting volumes)
    const grn = await prisma.grn.findFirst({
      where: { id, companyId },
      include: { items: true }
    });
    if (!grn) return res.status(404).json({ error: "GRN not found." });

    await prisma.$transaction(async (tx) => {
      for (const item of grn.items) {
        const prod = await tx.product.findFirst({ where: { id: item.productId, companyId } });
        if (prod) {
          const qtyToSub = item.qtyAccepted;
          const previousStock = prod.stock || 0.0;

          await tx.product.update({
            where: { id: item.productId },
            data: { quarantineStock: { decrement: qtyToSub } }
          });

          await tx.stockAdjustment.create({
            data: {
              companyId,
              productId: item.productId,
              adjustmentNo: `ADJ-OUT-${Math.floor(100000 + Math.random() * 900000)}`,
              type: "MANUAL_SUB",
              quantity: -qtyToSub,
              previousStock,
              newStock: previousStock,
              reason: `Stock deduction due to deletion/voiding of GRN '${grn.grnNo}' (Removed from Quarantine Hold).`,
              referenceNo: grn.grnNo
            }
          });
        }
      }

      await tx.grn.delete({ where: { id } });
    });

    return res.json({ message: "GRN voided and physical inventory stock levels adjusted back." });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 4. PURCHASE RETURNS CONTROLLER
// ==========================================

export async function listPurchaseReturns(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const returns = await prisma.purchaseReturn.findMany({
      where: { companyId },
      include: {
        purchaseOrder: { select: { id: true, poNo: true } },
        items: { include: { product: { select: { id: true, name: true, uom: true } } } }
      },
      orderBy: { returnDate: 'desc' }
    });

    return res.json({ returns });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createPurchaseReturn(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    
    const parsedBody = CreatePurchaseReturnBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Bad Request", details: parsedBody.error });
    const {  poId, returnNo, returnDate, reason, status, items  } = parsedBody.data;


    if (!poId || !returnNo || !reason || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "PO Reference, Return No, Reason, and return items list are required." });
    }

    const existing = await prisma.purchaseReturn.findFirst({
      where: { companyId, returnNo }
    });
    if (existing) {
      return res.status(409).json({ error: `Purchase Return No '${returnNo}' already registered.` });
    }

    const pret = await prisma.$transaction(async (tx) => {
      const createdReturn = await tx.purchaseReturn.create({
        data: {
          companyId,
          poId,
          returnNo,
          returnDate: returnDate ? new Date(returnDate) : new Date(),
          reason,
          status: status || "PENDING",
          items: {
            create: items.map((it: any) => ({
              productId: it.productId,
              quantity: parseFloat(it.quantity) || 1.0,
              price: parseFloat(it.price) || 0.0
            }))
          }
        },
        include: { items: true }
      });

      // Deduct stock for returned products
      for (const item of items) {
        const prod = await tx.product.findFirst({ where: { id: item.productId, companyId } });
        if (prod) {
          const qtyToSub = parseFloat(item.quantity) || 0.0;
          const previousStock = prod.stock || 0.0;
          const newStock = Math.max(0, previousStock - qtyToSub);

          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: qtyToSub } }
          });

          await tx.stockAdjustment.create({
            data: {
              companyId,
              productId: item.productId,
              adjustmentNo: `ADJ-RET-${Math.floor(100000 + Math.random() * 900000)}`,
              type: "OUTWARD_RETURN",
              quantity: -qtyToSub,
              previousStock,
              newStock,
              reason: `Material return to supplier (debit note) via Purchase Return '${returnNo}'`,
              referenceNo: returnNo
            }
          });
        }
      }

      return createdReturn;
    });

    return res.status(201).json({ message: "Purchase Return registered and stock adjusted outward.", return: pret });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deletePurchaseReturn(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    
    const pret = await prisma.purchaseReturn.findFirst({
      where: { id, companyId },
      include: { items: true }
    });
    if (!pret) return res.status(404).json({ error: "Purchase Return not found." });

    await prisma.$transaction(async (tx) => {
      // Re-add stock returning back the voided return volumes
      for (const item of pret.items) {
        const prod = await tx.product.findFirst({ where: { id: item.productId, companyId } });
        if (prod) {
          const qtyToAdd = item.quantity;
          const previousStock = prod.stock || 0.0;
          const newStock = previousStock + qtyToAdd;

          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: qtyToAdd } }
          });

          await tx.stockAdjustment.create({
            data: {
              companyId,
              productId: item.productId,
              adjustmentNo: `ADJ-IN-${Math.floor(100000 + Math.random() * 900000)}`,
              type: "MANUAL_ADD",
              quantity: qtyToAdd,
              previousStock,
              newStock,
              reason: `Voiding / deleting Purchase Return '${pret.returnNo}', re-adding materials to stock.`,
              referenceNo: pret.returnNo
            }
          });
        }
      }

      await tx.purchaseReturn.delete({ where: { id } });
    });

    return res.json({ message: "Purchase Return cancelled and inventory quantities re-added." });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 5. VENDOR PAYMENTS CONTROLLER
// ==========================================

export async function listVendorPayments(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const payments = await prisma.vendorPayment.findMany({
      where: { companyId },
      include: { vendor: { select: { id: true, name: true } } },
      orderBy: { paymentDate: 'desc' }
    });

    return res.json({ payments });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createVendorPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    
    const parsedBody = CreateVendorPaymentBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Bad Request", details: parsedBody.error });
    const {  vendorId, paymentNo, paymentDate, amount, paymentMethod, referenceNo, bankDetails, status, notes  } = parsedBody.data;


    if (!vendorId || !paymentNo || amount === undefined || !paymentMethod) {
      return res.status(400).json({ error: "Vendor reference, payment number, payout amount, and payment method are required." });
    }

    const existing = await prisma.vendorPayment.findFirst({
      where: { companyId, paymentNo }
    });
    if (existing) {
      return res.status(409).json({ error: `Payment receipt number '${paymentNo}' is already registered.` });
    }

    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.vendorPayment.create({
        data: {
          companyId,
          vendorId,
          paymentNo,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          amount: parseFloat(amount) || 0.0,
          paymentMethod,
          referenceNo: referenceNo || null,
          bankDetails: bankDetails || null,
          status: status || "COMPLETED",
          notes: notes || null
        }
      });

      if ((status || "COMPLETED") === "COMPLETED") {
        await handleOutwardPayment(tx, companyId, parseFloat(amount) || 0.0, vendorId, paymentNo, referenceNo || null);
      }

      return p;
    });

    return res.status(201).json({ message: "Vendor payment recorded successfully", payment });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteVendorPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const payment = await prisma.vendorPayment.findFirst({ where: { id, companyId } });
    if (!payment) return res.status(404).json({ error: "Vendor payment not found" });

    await prisma.$transaction(async (tx) => {
      if (payment.status === "COMPLETED") {
        await handleVoidOutwardPayment(tx, companyId, payment.amount, payment.paymentNo);
      }
      await tx.vendorPayment.delete({ where: { id } });
    });

    return res.json({ message: "Vendor payment voucher voided and removed." });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updatePurchaseOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const { vendorId, poNo, date, deliveryDate, subtotal, discount, tax, total, status, items } = req.body;

    const poToUpdate = await prisma.purchaseOrder.findFirst({
      where: { id, companyId }
    });
    if (!poToUpdate) {
      return res.status(404).json({ error: "Purchase Order not found" });
    }

    if (poToUpdate.status === "COMPLETED") {
      return res.status(400).json({ error: "Completed Purchase Orders cannot be modified." });
    }

    await prisma.$transaction(async (tx) => {
      await tx.purchaseOrder.update({
        where: { id },
        data: {
          ...(vendorId && { vendorId }),
          ...(poNo && { poNo }),
          ...(date !== undefined && { date: date ? new Date(date) : new Date() }),
          ...(deliveryDate !== undefined && { deliveryDate: deliveryDate ? new Date(deliveryDate) : null }),
          ...(subtotal !== undefined && { subtotal: parseFloat(subtotal) || 0.0 }),
          ...(discount !== undefined && { discount: parseFloat(discount) || 0.0 }),
          ...(tax !== undefined && { tax: parseFloat(tax) || 0.0 }),
          ...(total !== undefined && { total: parseFloat(total) || 0.0 }),
          ...(status && { status })
        }
      });

      if (items && Array.isArray(items)) {
        await tx.purchaseOrderItem.deleteMany({ where: { poId: id } });
        const validItems = items.filter((item: any) => item.productId && item.quantity && item.price).map((item: any) => ({
          poId: id,
          productId: item.productId,
          quantity: parseFloat(item.quantity),
          price: parseFloat(item.price),
          discount: parseFloat(item.discount) || 0.0
        }));
        if (validItems.length > 0) {
          await tx.purchaseOrderItem.createMany({ data: validItems });
        }
      }
    });

    const finalPo = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { vendor: true, items: { include: { product: true } } }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'purchase_order',
      'UPDATE',
      poToUpdate,
      finalPo,
      req.ip,
      req.headers['user-agent']
    );

    await markNeedsRefresh(companyId);
    return res.json({ message: `Purchase Order updated successfully`, purchaseOrder: finalPo });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

