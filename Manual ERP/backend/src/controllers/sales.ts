import { UpdateDocumentTemplateBodySchema } from '../types/index';
import { CreateDocumentTemplateBodySchema } from '../types/index';
import { ListDocumentTemplatesQuerySchema } from '../types/index';
import { UpdateServiceTicketBodySchema } from '../types/index';
import { CreateServiceTicketBodySchema } from '../types/index';
import { UpdateQuotationStatusBodySchema } from '../types/index';
import { CreateQuotationBodySchema } from '../types/index';
import { UpdateDispatchBodySchema } from '../types/index';
import { CreateDispatchBodySchema } from '../types/index';
import { UpdateDeliveryChallanBodySchema } from '../types/index';
import { CreateDeliveryChallanBodySchema } from '../types/index';
import { UpdateSalesInvoiceBodySchema } from '../types/index';
import { CreateSalesInvoiceBodySchema } from '../types/index';
import { UpdateProformaInvoiceBodySchema } from '../types/index';
import { CreateProformaInvoiceBodySchema } from '../types/index';
import { UpdateSalesOrderBodySchema } from '../types/index';
import { CreateSalesOrderBodySchema } from '../types/index';
import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../services/db';
import { logAudit } from '../utils/audit';
import { sendEmailNotification } from '../utils';
import { generateInvoicePdf } from '../utils/pdf';
import { markNeedsRefresh } from '../services/forecast';

export async function validateInvoiceTaxAndTotal(
  companyId: string,
  customerId: string,
  items: any[],
  discountValOrPct: number,
  discountType: string,
  clientTax: number,
  clientTotal: number,
  shippingState: string | null
) {
  // 1. Fetch customer
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId }
  });
  if (!customer) {
    throw new Error("Customer profile not found");
  }

  // 2. Fetch company to get state
  const companyProfile = await prisma.company.findUnique({
    where: { id: companyId }
  });
  if (!companyProfile) {
    throw new Error("Company profile not found");
  }

  // 3. Calculate subtotal
  let calculatedSubtotal = 0.0;
  for (const item of items) {
    const qty = parseFloat(item.quantity) || 0.0;
    const price = parseFloat(item.price) || 0.0;
    const itemDiscPercent = parseFloat(item.discount) || 0.0;
    const itemSub = qty * price;
    const itemDiscVal = itemSub * (itemDiscPercent / 100);
    calculatedSubtotal += (itemSub - itemDiscVal);
  }

  // 4. Calculate taxable amount
  let discVal = 0.0;
  if (discountType === 'AMOUNT') {
    discVal = discountValOrPct || 0.0;
  } else {
    discVal = calculatedSubtotal * ((discountValOrPct || 0.0) / 100);
  }
  const taxableAmount = Math.max(0, calculatedSubtotal - discVal);

  // 5. Determine tax rate based on state/classification
  const isInternational = customer.clientClassification === 'INTERNATIONAL';
  const targetState = (shippingState || customer.state || 'Gujarat').trim().toLowerCase();
  const companyState = (companyProfile.state || 'Gujarat').trim().toLowerCase();

  let taxRate = 18.0;
  if (isInternational) {
    taxRate = 0.0;
  }

  const expectedTax = taxableAmount * (taxRate / 100);
  const expectedTotal = taxableAmount + expectedTax;

  if (Math.abs(clientTax - expectedTax) > 0.05) {
    throw new Error(`Tax validation failed. Expected: ${expectedTax.toFixed(2)}, Received: ${clientTax.toFixed(2)} (Calculated at Rate: ${taxRate}%)`);
  }

  if (Math.abs(clientTotal - expectedTotal) > 0.05) {
    throw new Error(`Grand total validation failed. Expected: ${expectedTotal.toFixed(2)}, Received: ${clientTotal.toFixed(2)}`);
  }
}

const isServiceItem = (product: any): boolean => {
  if (!product) return false;
  const uomLower = (product.uom || "").toLowerCase();
  const categoryLower = (product.category?.name || "").toLowerCase();
  const nameLower = (product.name || "").toLowerCase();
  return (
    uomLower.includes("hour") ||
    uomLower.includes("hrs") ||
    uomLower.includes("serv") ||
    uomLower.includes("labor") ||
    uomLower.includes("labour") ||
    categoryLower.includes("service") ||
    categoryLower.includes("process") ||
    nameLower.includes("service") ||
    nameLower.includes("labor") ||
    nameLower.includes("labour")
  );
};

// Helper to generate next document number
async function generateDocNo(companyId: string, prefix: string, modelName: 'salesOrder' | 'proformaInvoice' | 'salesInvoice' | 'deliveryChallan' | 'dispatch'): Promise<string> {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${new Date().getFullYear()}-${rand}`;
}

// Shared financial integration helpers
async function handleInwardReceipt(
  tx: any,
  companyId: string,
  amount: number,
  customerId: string,
  invoiceNo: string,
  description: string
) {
  const customer = await tx.customer.findFirst({ where: { id: customerId, companyId }, select: { name: true } });
  const payerName = customer?.name || "Customer";

  await tx.companyReceipt.create({
    data: {
      companyId,
      amount,
      payerName,
      category: "SALES_REVENUE",
      paymentMethod: "BANK_TRANSFER",
      referenceNo: invoiceNo,
      notes: `Payment for Invoice ${invoiceNo}`
    }
  });

  const bankAccount = await tx.companyBankAccount.findFirst({ where: { companyId } });
  if (bankAccount) {
    await tx.companyBankAccount.update({
      where: { id: bankAccount.id },
      data: { balance: { increment: amount } }
    });
  }

  const lastVoucher = await tx.cashbookVoucher.findFirst({
    where: { companyId },
    orderBy: { createdAt: 'desc' }
  });
  const previousBal = lastVoucher ? lastVoucher.currentBal : 0.0;
  const currentBal = previousBal + amount;

  const count = await tx.cashbookVoucher.count({ where: { companyId } });
  const voucherNo = `VCH-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, '0')}`;

  await tx.cashbookVoucher.create({
    data: {
      companyId,
      voucherNo,
      entryType: 'INWARD_RECEIPT',
      amount,
      previousBal,
      currentBal,
      description,
      referenceNo: invoiceNo
    }
  });
}

async function handleVoidInwardReceipt(
  tx: any,
  companyId: string,
  amount: number,
  invoiceNo: string
) {
  await tx.companyReceipt.deleteMany({
    where: { companyId, referenceNo: invoiceNo }
  });

  const bankAccount = await tx.companyBankAccount.findFirst({ where: { companyId } });
  if (bankAccount) {
    await tx.companyBankAccount.update({
      where: { id: bankAccount.id },
      data: { balance: { decrement: amount } }
    });
  }

  await tx.cashbookVoucher.deleteMany({
    where: { companyId, referenceNo: invoiceNo }
  });
}

// ==========================================
// 1. SALES ORDER HUB CONTROLLERS
// ==========================================

export async function listSalesOrders(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const orders = await prisma.salesOrder.findMany({
      where: { companyId },
      include: {
        customer: true,
        items: {
          include: {
            product: {
              include: {
                category: true
              }
            }
          }
        }
      },
      orderBy: { orderDate: 'desc' }
    });

    const enrichedOrders = await Promise.all(orders.map(async (order) => {
      const invoices = await prisma.salesInvoice.findMany({
        where: {
          companyId,
          OR: [
            { salesOrderId: order.id },
            {
              salesOrderIds: {
                contains: order.id
              }
            }
          ]
        },
        include: {
          items: true
        }
      });

      const billedQuantities: Record<string, number> = {};
      for (const inv of invoices) {
        for (const item of inv.items) {
          billedQuantities[item.productId] = (billedQuantities[item.productId] || 0) + item.quantity;
        }
      }

      const challans = await prisma.deliveryChallan.findMany({
        where: {
          companyId,
          OR: [
            { salesOrderId: order.id },
            {
              salesOrderIds: {
                contains: order.id
              }
            }
          ]
        },
        include: {
          items: true
        }
      });

      const shippedQuantities: Record<string, number> = {};
      for (const challan of challans) {
        for (const item of challan.items) {
          shippedQuantities[item.productId] = (shippedQuantities[item.productId] || 0) + item.quantity;
        }
      }

      const enrichedItems = order.items.map((item) => {
        const billed = billedQuantities[item.productId] || 0.0;
        const remaining = Math.max(0.0, item.quantity - billed);
        const shipped = shippedQuantities[item.productId] || 0.0;
        const remainingChallan = Math.max(0.0, item.quantity - shipped);
        return {
          ...item,
          billedQuantity: billed,
          remainingQuantity: remaining,
          shippedQuantity: shipped,
          remainingChallanQuantity: remainingChallan
        };
      });

      return {
        ...order,
        items: enrichedItems
      };
    }));

    return res.json({ orders: enrichedOrders });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createSalesOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    
    const parsedBody = CreateSalesOrderBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Bad Request", details: parsedBody.error });
    const {  customerId, deliveryDate, discount, items  } = parsedBody.data;


    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Customer and at least one product order item are required." });
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, companyId }
    });
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    const orderNo = await generateDocNo(companyId, 'SO', 'salesOrder');

    // Run in Prisma Transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.salesOrder.create({
        data: {
          companyId,
          customerId,
          orderNo,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
          discount: parseFloat(discount) || 0.0,
          status: 'PENDING',
          billingAddress: req.body.billingAddress || customer.billingAddress || null,
          shippingAddress: req.body.shippingAddress || customer.shippingAddress || customer.billingAddress || null,
          shippingState: req.body.shippingState || customer.state || null,
          shippingName: req.body.shippingName || customer.name || null,
          customerName: customer.name,
          customerContactNo: customer.contactNo,
          customerEmail: customer.email || null,
          customerBankName: customer.bankName || null,
          customerAccountHolderName: customer.accountHolderName || null,
          customerAccountNumber: customer.accountNumber || null,
          customerIfscCode: customer.ifscCode || null,
          customerGstNumber: customer.gstNumber || null,
          customerPanNumber: customer.panNumber || null,
          templateSettings: req.body.templateSettings || null
        }
      });

      const validItems = items.filter((item: any) => item.productId && item.quantity && item.price).map((item: any) => ({
        orderId: newOrder.id,
        productId: item.productId,
        quantity: parseFloat(item.quantity),
        price: parseFloat(item.price),
        deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : (deliveryDate ? new Date(deliveryDate) : null),
        discount: parseFloat(item.discount) || 0.0
      }));
      if (validItems.length > 0) {
        await tx.salesOrderItem.createMany({ data: validItems });
      }

      return newOrder;
    });

    const finalOrder = await prisma.salesOrder.findUnique({
      where: { id: order.id },
      include: { customer: true, items: { include: { product: true } } }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'sales_order',
      'CREATE',
      null,
      { id: order.id, orderNo: order.orderNo },
      req.ip,
      req.headers['user-agent']
    );

    await markNeedsRefresh(companyId);
    return res.status(201).json({ message: `Sales Order ${orderNo} created successfully`, order: finalOrder });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateSalesOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    
    const parsedBody = UpdateSalesOrderBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Bad Request", details: parsedBody.error });
    const {  customerId, deliveryDate, discount, status, items  } = parsedBody.data;


    const orderToUpdate = await prisma.salesOrder.findFirst({
      where: { id, companyId }
    });
    if (!orderToUpdate) {
      return res.status(404).json({ error: "Sales Order not found" });
    }

    let customerData = {};
    if (customerId && customerId !== orderToUpdate.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, companyId }
      });
      if (customer) {
        customerData = {
          billingAddress: req.body.billingAddress || customer.billingAddress || null,
          shippingAddress: req.body.shippingAddress || customer.shippingAddress || customer.billingAddress || null,
          shippingState: req.body.shippingState || customer.state || null,
          shippingName: req.body.shippingName || customer.name || null,
          customerName: customer.name,
          customerContactNo: customer.contactNo,
          customerEmail: customer.email || null,
          customerBankName: customer.bankName || null,
          customerAccountHolderName: customer.accountHolderName || null,
          customerAccountNumber: customer.accountNumber || null,
          customerIfscCode: customer.ifscCode || null,
          customerGstNumber: customer.gstNumber || null,
          customerPanNumber: customer.panNumber || null
        };
      }
    } else {
      customerData = {
        ...(req.body.billingAddress !== undefined && { billingAddress: req.body.billingAddress || null }),
        ...(req.body.shippingAddress !== undefined && { shippingAddress: req.body.shippingAddress || null }),
        ...(req.body.shippingState !== undefined && { shippingState: req.body.shippingState || null }),
        ...(req.body.shippingName !== undefined && { shippingName: req.body.shippingName || null }),
        ...(req.body.customerName !== undefined && { customerName: req.body.customerName || null }),
        ...(req.body.customerContactNo !== undefined && { customerContactNo: req.body.customerContactNo || null }),
        ...(req.body.customerEmail !== undefined && { customerEmail: req.body.customerEmail || null }),
        ...(req.body.customerBankName !== undefined && { customerBankName: req.body.customerBankName || null }),
        ...(req.body.customerAccountHolderName !== undefined && { customerAccountHolderName: req.body.customerAccountHolderName || null }),
        ...(req.body.customerAccountNumber !== undefined && { customerAccountNumber: req.body.customerAccountNumber || null }),
        ...(req.body.customerIfscCode !== undefined && { customerIfscCode: req.body.customerIfscCode || null }),
        ...(req.body.customerGstNumber !== undefined && { customerGstNumber: req.body.customerGstNumber || null }),
        ...(req.body.customerPanNumber !== undefined && { customerPanNumber: req.body.customerPanNumber || null })
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.salesOrder.update({
        where: { id },
        data: {
          ...(customerId && { customerId }),
          ...(deliveryDate !== undefined && { deliveryDate: deliveryDate ? new Date(deliveryDate) : null }),
          ...(discount !== undefined && { discount: parseFloat(discount) || 0.0 }),
          ...(status && { status }),
          ...(req.body.templateSettings !== undefined && { templateSettings: req.body.templateSettings || null }),
          ...customerData
        }
      });

      if (items && Array.isArray(items)) {
        await tx.salesOrderItem.deleteMany({ where: { orderId: id } });
        const validItems = items.filter((item: any) => item.productId && item.quantity && item.price).map((item: any) => ({
          orderId: id,
          productId: item.productId,
          quantity: parseFloat(item.quantity),
          price: parseFloat(item.price),
          deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : null,
          discount: parseFloat(item.discount) || 0.0
        }));
        if (validItems.length > 0) {
          await tx.salesOrderItem.createMany({ data: validItems });
        }
      }
    });

    const finalOrder = await prisma.salesOrder.findUnique({
      where: { id },
      include: { customer: true, items: { include: { product: true } } }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'sales_order',
      'UPDATE',
      orderToUpdate,
      finalOrder,
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: `Sales Order updated successfully`, order: finalOrder });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteSalesOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;

    const order = await prisma.salesOrder.findFirst({
      where: { id, companyId }
    });
    if (!order) return res.status(404).json({ error: "Sales Order not found" });

    await prisma.salesOrder.delete({
      where: { id }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'sales_order',
      'DELETE',
      { id: order.id, orderNo: order.orderNo },
      null,
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: `Sales Order '${order.orderNo}' permanently deleted.` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 2. PROFORMA INVOICES CONTROLLERS
// ==========================================

export async function listProformaInvoices(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const invoices = await prisma.proformaInvoice.findMany({
      where: { companyId },
      include: {
        customer: true,
        items: {
          include: { product: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    return res.json({ invoices });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createProformaInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    
    const parsedBody = CreateProformaInvoiceBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Bad Request", details: parsedBody.error });
    const {  customerId, dueDate, discount, discountType, tax, subtotal, total, status, items  } = parsedBody.data;


    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Customer and at least one item are required." });
    }

    try {
      await validateInvoiceTaxAndTotal(
        companyId,
        customerId,
        items,
        parseFloat(discount) || 0.0,
        discountType || 'PERCENTAGE',
        parseFloat(tax) || 0.0,
        parseFloat(total) || 0.0,
        null
      );
    } catch (valError: any) {
      return res.status(400).json({ error: valError.message });
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, companyId }
    });
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    const invoiceNo = await generateDocNo(companyId, 'PI', 'proformaInvoice');

    const invoice = await prisma.$transaction(async (tx) => {
      const newInvoice = await tx.proformaInvoice.create({
        data: {
          companyId,
          customerId,
          invoiceNo,
          dueDate: dueDate ? new Date(dueDate) : null,
          subtotal: parseFloat(subtotal) || 0.0,
          discount: parseFloat(discount) || 0.0,
          tax: parseFloat(tax) || 0.0,
          total: parseFloat(total) || 0.0,
          status: status || 'DRAFT',
          billingAddress: req.body.billingAddress || customer.billingAddress || null,
          shippingAddress: req.body.shippingAddress || customer.shippingAddress || customer.billingAddress || null,
          shippingState: req.body.shippingState || customer.state || null,
          shippingName: req.body.shippingName || customer.name || null,
          customerName: customer.name,
          customerContactNo: customer.contactNo,
          customerEmail: customer.email || null,
          customerBankName: customer.bankName || null,
          customerAccountHolderName: customer.accountHolderName || null,
          customerAccountNumber: customer.accountNumber || null,
          customerIfscCode: customer.ifscCode || null,
          customerGstNumber: customer.gstNumber || null,
          customerPanNumber: customer.panNumber || null,
          templateSettings: req.body.templateSettings || null
        }
      });

      const validItems = items.filter((item: any) => item.productId && item.quantity && item.price).map((item: any) => ({
        invoiceId: newInvoice.id,
        productId: item.productId,
        quantity: parseFloat(item.quantity),
        price: parseFloat(item.price),
        discount: parseFloat(item.discount) || 0.0
      }));
      if (validItems.length > 0) {
        await tx.proformaInvoiceItem.createMany({ data: validItems });
      }

      return newInvoice;
    });

    const finalInvoice = await prisma.proformaInvoice.findUnique({
      where: { id: invoice.id },
      include: { customer: true, items: { include: { product: true } } }
    });

    return res.status(201).json({ message: `Proforma Invoice ${invoiceNo} generated`, invoice: finalInvoice });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateProformaInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    
    const parsedBody = UpdateProformaInvoiceBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Bad Request", details: parsedBody.error });
    const {  customerId, dueDate, discount, discountType, tax, subtotal, total, status, items  } = parsedBody.data;


    const existingInvoice = await prisma.proformaInvoice.findFirst({
      where: { id, companyId },
      include: { items: true }
    });
    if (!existingInvoice) {
      return res.status(404).json({ error: "Proforma Invoice not found" });
    }
    const invoice = existingInvoice;

    const finalCustomerId = customerId || existingInvoice.customerId;
    const finalItems = items !== undefined ? items : existingInvoice.items.map(it => ({
      productId: it.productId,
      quantity: it.quantity,
      price: it.price,
      discount: it.discount
    }));
    const finalDiscount = discount !== undefined ? parseFloat(discount) : existingInvoice.discount;
    const finalDiscountType = discountType !== undefined ? discountType : existingInvoice.discountType;
    const finalTax = tax !== undefined ? parseFloat(tax) : existingInvoice.tax;
    const finalTotal = total !== undefined ? parseFloat(total) : existingInvoice.total;

    try {
      await validateInvoiceTaxAndTotal(
        companyId,
        finalCustomerId,
        finalItems,
        finalDiscount,
        finalDiscountType,
        finalTax,
        finalTotal,
        null
      );
    } catch (valError: any) {
      return res.status(400).json({ error: valError.message });
    }

    let customerData = {};
    if (customerId && customerId !== existingInvoice.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, companyId }
      });
      if (customer) {
        customerData = {
          billingAddress: req.body.billingAddress || customer.billingAddress || null,
          shippingAddress: req.body.shippingAddress || customer.shippingAddress || customer.billingAddress || null,
          shippingState: req.body.shippingState || customer.state || null,
          shippingName: req.body.shippingName || customer.name || null,
          customerName: customer.name,
          customerContactNo: customer.contactNo,
          customerEmail: customer.email || null,
          customerBankName: customer.bankName || null,
          customerAccountHolderName: customer.accountHolderName || null,
          customerAccountNumber: customer.accountNumber || null,
          customerIfscCode: customer.ifscCode || null,
          customerGstNumber: customer.gstNumber || null,
          customerPanNumber: customer.panNumber || null
        };
      }
    } else {
      customerData = {
        ...(req.body.billingAddress !== undefined && { billingAddress: req.body.billingAddress || null }),
        ...(req.body.shippingAddress !== undefined && { shippingAddress: req.body.shippingAddress || null }),
        ...(req.body.shippingState !== undefined && { shippingState: req.body.shippingState || null }),
        ...(req.body.shippingName !== undefined && { shippingName: req.body.shippingName || null }),
        ...(req.body.customerName !== undefined && { customerName: req.body.customerName || null }),
        ...(req.body.customerContactNo !== undefined && { customerContactNo: req.body.customerContactNo || null }),
        ...(req.body.customerEmail !== undefined && { customerEmail: req.body.customerEmail || null }),
        ...(req.body.customerBankName !== undefined && { customerBankName: req.body.customerBankName || null }),
        ...(req.body.customerAccountHolderName !== undefined && { customerAccountHolderName: req.body.customerAccountHolderName || null }),
        ...(req.body.customerAccountNumber !== undefined && { customerAccountNumber: req.body.customerAccountNumber || null }),
        ...(req.body.customerIfscCode !== undefined && { customerIfscCode: req.body.customerIfscCode || null }),
        ...(req.body.customerGstNumber !== undefined && { customerGstNumber: req.body.customerGstNumber || null }),
        ...(req.body.customerPanNumber !== undefined && { customerPanNumber: req.body.customerPanNumber || null })
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.proformaInvoice.update({
        where: { id },
        data: {
          ...(customerId && { customerId }),
          ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
          ...(subtotal !== undefined && { subtotal: parseFloat(subtotal) || 0.0 }),
          ...(discount !== undefined && { discount: parseFloat(discount) || 0.0 }),
          ...(discountType !== undefined && { discountType }),
          ...(tax !== undefined && { tax: parseFloat(tax) || 0.0 }),
          ...(total !== undefined && { total: parseFloat(total) || 0.0 }),
          ...(status && { status }),
          ...(req.body.templateSettings !== undefined && { templateSettings: req.body.templateSettings || null }),
          ...customerData
        }
      });

      if (items && Array.isArray(items)) {
        await tx.proformaInvoiceItem.deleteMany({ where: { invoiceId: id } });
        const validItems = items.filter((item: any) => item.productId && item.quantity && item.price).map((item: any) => ({
          invoiceId: id,
          productId: item.productId,
          quantity: parseFloat(item.quantity),
          price: parseFloat(item.price),
          discount: parseFloat(item.discount) || 0.0
        }));
        if (validItems.length > 0) {
          await tx.proformaInvoiceItem.createMany({ data: validItems });
        }
      }
    });

    const finalInvoice = await prisma.proformaInvoice.findUnique({
      where: { id },
      include: { customer: true, items: { include: { product: true } } }
    });

    return res.json({ message: "Proforma Invoice updated successfully", invoice: finalInvoice });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteProformaInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const invoice = await prisma.proformaInvoice.findFirst({ where: { id, companyId } });
    if (!invoice) return res.status(404).json({ error: "Proforma Invoice not found or access denied" });
    await prisma.proformaInvoice.delete({ where: { id } });
    return res.json({ message: "Proforma Invoice deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function sendProformaInvoiceEmail(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const invoice = await prisma.proformaInvoice.findFirst({
      where: { id, companyId },
      include: { customer: true, items: { include: { product: true } } }
    });

    if (!invoice) return res.status(404).json({ error: "Proforma Invoice not found" });
    if (!invoice.customer.email) return res.status(400).json({ error: "Selected Customer has no registered email ID." });

    const symbol = invoice.customer.currencySymbol || "$";
    const emailBody = `Dear ${invoice.customer.name},\r\n\r\nPlease find details for Proforma Invoice ${invoice.invoiceNo}.\r\n\r\nInvoice Date: ${invoice.date.toLocaleDateString()}\r\nTotal Amount Due: ${symbol}${invoice.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}\r\n\r\nThank you for doing business with us!`;

    // Fetch company name for PDF
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true }
    });
    const companyName = company?.name || "ERP Workspace";

    // Generate PDF attachment
    const pdfData = {
      ...invoice,
      companyName,
      currencySymbol: symbol
    };
    const pdfBuffer = generateInvoicePdf("proforma", pdfData);

    await sendEmailNotification(
      invoice.customer.email,
      `Proforma Invoice ${invoice.invoiceNo} from ERP Console`,
      emailBody,
      req.user?.companyCode,
      [{ filename: `Proforma_${invoice.invoiceNo}.pdf`, content: pdfBuffer }]
    );

    return res.json({ message: `Proforma Invoice ${invoice.invoiceNo} emailed successfully to ${invoice.customer.email}` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 3. SALES INVOICES CONTROLLERS
// ==========================================

export async function listSalesInvoices(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const invoices = await prisma.salesInvoice.findMany({
      where: { companyId },
      include: {
        customer: true,
        items: {
          include: { product: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    return res.json({ invoices });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createSalesInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    
    const parsedBody = CreateSalesInvoiceBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Bad Request", details: parsedBody.error });
    const {  customerId, dueDate, discount, discountType, tax, subtotal, total, status, items, billingAddress, shippingAddress, shippingState, shippingName, salesOrderId, salesOrderIds  } = parsedBody.data;


    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Customer and at least one item are required." });
    }

    try {
      await validateInvoiceTaxAndTotal(
        companyId,
        customerId,
        items,
        parseFloat(discount) || 0.0,
        discountType || 'PERCENTAGE',
        parseFloat(tax) || 0.0,
        parseFloat(total) || 0.0,
        shippingState || null
      );
    } catch (valError: any) {
      return res.status(400).json({ error: valError.message });
    }

    // === P6: Server-side billing quantity validation ===
    if (salesOrderId || salesOrderIds) {
      const soIds: string[] = [];
      if (salesOrderId) soIds.push(salesOrderId);
      if (salesOrderIds) {
        try { soIds.push(...JSON.parse(salesOrderIds)); } catch (e) { /* ignore parse errors */ }
      }

      // Fetch all SO items for linked orders
      const soItems = await prisma.salesOrderItem.findMany({
        where: { orderId: { in: soIds } },
        include: { product: true }
      });

      // Validate each invoice item against SO remaining qty
      for (const invItem of items) {
        const matchingSoItems = soItems.filter((si: any) => si.productId === invItem.productId);
        if (matchingSoItems.length > 0) {
          const totalOrdered = matchingSoItems.reduce((sum: number, si: any) => sum + si.quantity, 0);
          const totalBilled = matchingSoItems.reduce((sum: number, si: any) => sum + (si.billedQty || 0), 0);
          const remaining = totalOrdered - totalBilled;
          const requestedQty = parseFloat(invItem.quantity) || 0;
          if (requestedQty > remaining + 0.001) {
            const productName = matchingSoItems[0]?.product?.name || invItem.productId;
            return res.status(400).json({
              error: `Quantity ${requestedQty} for "${productName}" exceeds remaining billable quantity of ${remaining.toFixed(2)} from the linked Sales Order(s).`
            });
          }
        }
      }
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, companyId }
    });
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    const invoiceNo = await generateDocNo(companyId, 'SI', 'salesInvoice');

    const invoice = await prisma.$transaction(async (tx) => {
      const newInvoice = await tx.salesInvoice.create({
        data: {
          companyId,
          customerId,
          invoiceNo,
          dueDate: dueDate ? new Date(dueDate) : null,
          subtotal: parseFloat(subtotal) || 0.0,
          discount: parseFloat(discount) || 0.0,
          discountType: parsedBody.data.discountType || 'PERCENTAGE',
          tax: parseFloat(tax) || 0.0,
          total: parseFloat(total) || 0.0,
          status: status || 'UNPAID',
          billingAddress: billingAddress || customer.billingAddress || null,
          shippingAddress: shippingAddress || customer.shippingAddress || customer.billingAddress || null,
          shippingState: shippingState || customer.state || null,
          shippingName: shippingName || customer.name || null,
          salesOrderId: salesOrderId || null,
          salesOrderIds: salesOrderIds || null,
          customerName: customer.name,
          customerContactNo: customer.contactNo,
          customerEmail: customer.email || null,
          customerBankName: customer.bankName || null,
          customerAccountHolderName: customer.accountHolderName || null,
          customerAccountNumber: customer.accountNumber || null,
          customerIfscCode: customer.ifscCode || null,
          customerGstNumber: customer.gstNumber || null,
          customerPanNumber: customer.panNumber || null,
          templateSettings: req.body.templateSettings || null
        }
      });

      const validItems = items.filter((item: any) => item.productId && item.quantity && item.price).map((item: any) => ({
        invoiceId: newInvoice.id,
        productId: item.productId,
        quantity: parseFloat(item.quantity),
        price: parseFloat(item.price),
        discount: parseFloat(item.discount) || 0.0
      }));
      if (validItems.length > 0) {
        await tx.salesInvoiceItem.createMany({ data: validItems });
      }

      // === P6: Update billedQty on linked SalesOrderItems ===
      if (salesOrderId || salesOrderIds) {
        const soIds: string[] = [];
        if (salesOrderId) soIds.push(salesOrderId);
        if (salesOrderIds) {
          try { soIds.push(...JSON.parse(salesOrderIds)); } catch (e) { /* ignore */ }
        }
        for (const invItem of items) {
          const soItems = await tx.salesOrderItem.findMany({
            where: { orderId: { in: soIds }, productId: invItem.productId }
          });
          let qtyToAllocate = parseFloat(invItem.quantity) || 0;
          for (const soItem of soItems) {
            if (qtyToAllocate <= 0) break;
            const available = soItem.quantity - (soItem.billedQty || 0);
            const allocate = Math.min(qtyToAllocate, available);
            if (allocate > 0) {
              await tx.salesOrderItem.update({
                where: { id: soItem.id },
                data: { billedQty: (soItem.billedQty || 0) + allocate }
              });
              qtyToAllocate -= allocate;
            }
          }
        }
      }

      if ((status || 'UNPAID') === 'PAID') {
        await handleInwardReceipt(tx, companyId, parseFloat(total) || 0.0, customerId, invoiceNo, `Invoice Payment ${invoiceNo}`);
      }

      return newInvoice;
    });

    const finalInvoice = await prisma.salesInvoice.findUnique({
      where: { id: invoice.id },
      include: { customer: true, items: { include: { product: true } } }
    });

    await markNeedsRefresh(companyId);
    return res.status(201).json({ message: `Sales Invoice ${invoiceNo} generated successfully`, invoice: finalInvoice });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateSalesInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    
    const parsedBody = UpdateSalesInvoiceBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Bad Request", details: parsedBody.error });
    const {  customerId, dueDate, discount, discountType, tax, subtotal, total, status, items, billingAddress, shippingAddress, shippingState, shippingName, salesOrderId, salesOrderIds  } = parsedBody.data;


    const existingInvoice = await prisma.salesInvoice.findFirst({
      where: { id, companyId },
      include: { items: true }
    });
    if (!existingInvoice) {
      return res.status(404).json({ error: "Sales Invoice not found" });
    }
    const invoice = existingInvoice;
    const oldStatus = existingInvoice.status;
    const oldTotal = existingInvoice.total;

    const finalCustomerId = customerId || existingInvoice.customerId;
    const finalItems = items !== undefined ? items : existingInvoice.items.map(it => ({
      productId: it.productId,
      quantity: it.quantity,
      price: it.price,
      discount: it.discount
    }));
    const finalDiscount = discount !== undefined ? parseFloat(discount) : existingInvoice.discount;
    const finalDiscountType = discountType !== undefined ? discountType : existingInvoice.discountType;
    const finalTax = tax !== undefined ? parseFloat(tax) : existingInvoice.tax;
    const finalTotal = total !== undefined ? parseFloat(total) : existingInvoice.total;
    const finalShippingState = shippingState !== undefined ? shippingState : existingInvoice.shippingState;

    try {
      await validateInvoiceTaxAndTotal(
        companyId,
        finalCustomerId,
        finalItems,
        finalDiscount,
        finalDiscountType,
        finalTax,
        finalTotal,
        finalShippingState
      );
    } catch (valError: any) {
      return res.status(400).json({ error: valError.message });
    }

    let customerData = {};
    if (customerId && customerId !== existingInvoice.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, companyId }
      });
      if (customer) {
        customerData = {
          billingAddress: req.body.billingAddress || customer.billingAddress || null,
          shippingAddress: req.body.shippingAddress || customer.shippingAddress || customer.billingAddress || null,
          shippingState: req.body.shippingState || customer.state || null,
          shippingName: req.body.shippingName || customer.name || null,
          customerName: customer.name,
          customerContactNo: customer.contactNo,
          customerEmail: customer.email || null,
          customerBankName: customer.bankName || null,
          customerAccountHolderName: customer.accountHolderName || null,
          customerAccountNumber: customer.accountNumber || null,
          customerIfscCode: customer.ifscCode || null,
          customerGstNumber: customer.gstNumber || null,
          customerPanNumber: customer.panNumber || null
        };
      }
    } else {
      customerData = {
        ...(req.body.billingAddress !== undefined && { billingAddress: req.body.billingAddress || null }),
        ...(req.body.shippingAddress !== undefined && { shippingAddress: req.body.shippingAddress || null }),
        ...(req.body.shippingState !== undefined && { shippingState: req.body.shippingState || null }),
        ...(req.body.shippingName !== undefined && { shippingName: req.body.shippingName || null }),
        ...(req.body.customerName !== undefined && { customerName: req.body.customerName || null }),
        ...(req.body.customerContactNo !== undefined && { customerContactNo: req.body.customerContactNo || null }),
        ...(req.body.customerEmail !== undefined && { customerEmail: req.body.customerEmail || null }),
        ...(req.body.customerBankName !== undefined && { customerBankName: req.body.customerBankName || null }),
        ...(req.body.customerAccountHolderName !== undefined && { customerAccountHolderName: req.body.customerAccountHolderName || null }),
        ...(req.body.customerAccountNumber !== undefined && { customerAccountNumber: req.body.customerAccountNumber || null }),
        ...(req.body.customerIfscCode !== undefined && { customerIfscCode: req.body.customerIfscCode || null }),
        ...(req.body.customerGstNumber !== undefined && { customerGstNumber: req.body.customerGstNumber || null }),
        ...(req.body.customerPanNumber !== undefined && { customerPanNumber: req.body.customerPanNumber || null })
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.salesInvoice.update({
        where: { id },
        data: {
          ...(customerId && { customerId }),
          ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
          ...(subtotal !== undefined && { subtotal: parseFloat(subtotal) || 0.0 }),
          ...(discount !== undefined && { discount: parseFloat(discount) || 0.0 }),
          ...(discountType !== undefined && { discountType }),
          ...(tax !== undefined && { tax: parseFloat(tax) || 0.0 }),
          ...(total !== undefined && { total: parseFloat(total) || 0.0 }),
          ...(status && { status }),
          ...(billingAddress !== undefined && { billingAddress: billingAddress || null }),
          ...(shippingAddress !== undefined && { shippingAddress: shippingAddress || null }),
          ...(shippingState !== undefined && { shippingState: shippingState || null }),
          ...(shippingName !== undefined && { shippingName: shippingName || null }),
          ...(salesOrderId !== undefined && { salesOrderId: salesOrderId || null }),
          ...(salesOrderIds !== undefined && { salesOrderIds: salesOrderIds || null }),
          ...(req.body.templateSettings !== undefined && { templateSettings: req.body.templateSettings || null }),
          ...customerData
        }
      });

      if (items && Array.isArray(items)) {
        await tx.salesInvoiceItem.deleteMany({ where: { invoiceId: id } });
        const validItems = items.filter((item: any) => item.productId && item.quantity && item.price).map((item: any) => ({
          invoiceId: id,
          productId: item.productId,
          quantity: parseFloat(item.quantity),
          price: parseFloat(item.price),
          discount: parseFloat(item.discount) || 0.0
        }));
        if (validItems.length > 0) {
          await tx.salesInvoiceItem.createMany({ data: validItems });
        }
      }

      const newStatus = status || oldStatus;
      const newTotal = total !== undefined ? parseFloat(total) : oldTotal;

      if (oldStatus === 'PAID' && newStatus !== 'PAID') {
        await handleVoidInwardReceipt(tx, companyId, oldTotal, invoice.invoiceNo);
      } else if (oldStatus !== 'PAID' && newStatus === 'PAID') {
        await handleInwardReceipt(tx, companyId, newTotal, customerId || invoice.customerId, invoice.invoiceNo, `Invoice Payment ${invoice.invoiceNo}`);
      } else if (oldStatus === 'PAID' && newStatus === 'PAID' && oldTotal !== newTotal) {
        await handleVoidInwardReceipt(tx, companyId, oldTotal, invoice.invoiceNo);
        await handleInwardReceipt(tx, companyId, newTotal, customerId || invoice.customerId, invoice.invoiceNo, `Invoice Payment ${invoice.invoiceNo}`);
      }
    });

    const finalInvoice = await prisma.salesInvoice.findUnique({
      where: { id },
      include: { customer: true, items: { include: { product: true } } }
    });

    await markNeedsRefresh(companyId);
    return res.json({ message: "Sales Invoice updated successfully", invoice: finalInvoice });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteSalesInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const invoice = await prisma.salesInvoice.findFirst({ where: { id, companyId } });
    if (!invoice) return res.status(404).json({ error: "Sales Invoice not found" });

    // === P6: Reverse billedQty on linked SalesOrderItems ===
    const invoiceToDelete = await prisma.salesInvoice.findFirst({
      where: { id, companyId },
      include: { items: true }
    });
    if (invoiceToDelete && (invoiceToDelete.salesOrderId || invoiceToDelete.salesOrderIds)) {
      const soIds: string[] = [];
      if (invoiceToDelete.salesOrderId) soIds.push(invoiceToDelete.salesOrderId);
      if (invoiceToDelete.salesOrderIds) {
        try { soIds.push(...JSON.parse(invoiceToDelete.salesOrderIds)); } catch (e) { /* ignore */ }
      }
      for (const invItem of invoiceToDelete.items) {
        const soItems = await prisma.salesOrderItem.findMany({
          where: { orderId: { in: soIds }, productId: invItem.productId }
        });
        let qtyToReverse = invItem.quantity;
        for (const soItem of soItems) {
          if (qtyToReverse <= 0) break;
          const reversal = Math.min(qtyToReverse, soItem.billedQty || 0);
          if (reversal > 0) {
            await prisma.salesOrderItem.update({
              where: { id: soItem.id },
              data: { billedQty: Math.max(0, (soItem.billedQty || 0) - reversal) }
            });
            qtyToReverse -= reversal;
          }
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      if (invoice.status === 'PAID') {
        await handleVoidInwardReceipt(tx, companyId, invoice.total, invoice.invoiceNo);
      }
      await tx.salesInvoice.delete({ where: { id } });
    });
    await markNeedsRefresh(companyId);
    return res.json({ message: "Sales Invoice deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function sendSalesInvoiceEmail(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const invoice = await prisma.salesInvoice.findFirst({
      where: { id, companyId },
      include: { customer: true, items: { include: { product: true } } }
    });

    if (!invoice) return res.status(404).json({ error: "Sales Invoice not found" });
    if (!invoice.customer.email) return res.status(400).json({ error: "Selected Customer has no registered email ID." });

    const symbol = invoice.customer.currencySymbol || "$";
    const emailBody = `Dear ${invoice.customer.name},\r\n\r\nPlease find details for Sales Invoice ${invoice.invoiceNo}.\r\n\r\nInvoice Date: ${invoice.date.toLocaleDateString()}\r\nTotal Amount Due: ${symbol}${invoice.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}\r\nPayment Status: ${invoice.status}\r\n\r\nThank you for your valuable corporate business!`;

    // Fetch company name for PDF
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true }
    });
    const companyName = company?.name || "ERP Workspace";

    // Generate PDF attachment
    const pdfData = {
      ...invoice,
      companyName,
      currencySymbol: symbol
    };
    const pdfBuffer = generateInvoicePdf("invoice", pdfData);

    await sendEmailNotification(
      invoice.customer.email,
      `Sales Invoice ${invoice.invoiceNo} from ERP Console`,
      emailBody,
      req.user?.companyCode,
      [{ filename: `Invoice_${invoice.invoiceNo}.pdf`, content: pdfBuffer }]
    );

    return res.json({ message: `Sales Invoice ${invoice.invoiceNo} emailed successfully to ${invoice.customer.email}` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 4. DELIVERY CHALLANS CONTROLLERS
// ==========================================

export async function listDeliveryChallans(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const challans = await prisma.deliveryChallan.findMany({
      where: { companyId },
      include: {
        customer: true,
        items: {
          include: { product: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    return res.json({ challans });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createDeliveryChallan(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    
    const parsedBody = CreateDeliveryChallanBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Bad Request", details: parsedBody.error });
    const {  customerId, status, items, salesOrderId, salesOrderIds  } = parsedBody.data;


    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Customer and at least one item are required." });
    }

    const challanNo = await generateDocNo(companyId, 'DC', 'deliveryChallan');

    const challan = await prisma.$transaction(async (tx) => {
      const newChallan = await tx.deliveryChallan.create({
        data: {
          companyId,
          customerId,
          challanNo,
          status: status || 'ISSUED',
          salesOrderId: salesOrderId || null,
          salesOrderIds: salesOrderIds || null
        }
      });

      const validItems = items.filter((item: any) => item.productId && item.quantity).map((item: any) => ({
        challanId: newChallan.id,
        productId: item.productId,
        quantity: parseFloat(item.quantity),
        price: parseFloat(item.price) || 0.0
      }));
      if (validItems.length > 0) {
        await tx.deliveryChallanItem.createMany({ data: validItems });
      }

      return newChallan;
    });

    const finalChallan = await prisma.deliveryChallan.findUnique({
      where: { id: challan.id },
      include: { customer: true, items: { include: { product: true } } }
    });

    return res.status(201).json({ message: `Delivery Challan ${challanNo} generated`, challan: finalChallan });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateDeliveryChallan(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    
    const parsedBody = UpdateDeliveryChallanBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Bad Request", details: parsedBody.error });
    const {  customerId, status, items, salesOrderId, salesOrderIds  } = parsedBody.data;


    const challan = await prisma.deliveryChallan.findFirst({ where: { id, companyId } });
    if (!challan) return res.status(404).json({ error: "Delivery Challan not found" });

    await prisma.$transaction(async (tx) => {
      await tx.deliveryChallan.update({
        where: { id },
        data: {
          ...(customerId && { customerId }),
          ...(status && { status }),
          salesOrderId: salesOrderId !== undefined ? salesOrderId : undefined,
          salesOrderIds: salesOrderIds !== undefined ? salesOrderIds : undefined
        }
      });

      if (items && Array.isArray(items)) {
        await tx.deliveryChallanItem.deleteMany({ where: { challanId: id } });
        const validItems = items.filter((item: any) => item.productId && item.quantity).map((item: any) => ({
          challanId: id,
          productId: item.productId,
          quantity: parseFloat(item.quantity),
          price: parseFloat(item.price) || 0.0
        }));
        if (validItems.length > 0) {
          await tx.deliveryChallanItem.createMany({ data: validItems });
        }
      }
    });

    const finalChallan = await prisma.deliveryChallan.findUnique({
      where: { id },
      include: { customer: true, items: { include: { product: true } } }
    });

    return res.json({ message: "Delivery Challan updated successfully", challan: finalChallan });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteDeliveryChallan(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const challan = await prisma.deliveryChallan.findFirst({ where: { id, companyId } });
    if (!challan) return res.status(404).json({ error: "Delivery Challan not found or access denied" });
    await prisma.deliveryChallan.delete({ where: { id } });
    return res.json({ message: "Delivery Challan deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function sendDeliveryChallanEmail(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const challan = await prisma.deliveryChallan.findFirst({
      where: { id, companyId },
      include: { customer: true, items: { include: { product: true } } }
    });

    if (!challan) return res.status(404).json({ error: "Delivery Challan not found" });
    if (!challan.customer.email) return res.status(400).json({ error: "Selected Customer has no registered email ID." });

    const emailBody = `Dear ${challan.customer.name},\r\n\r\nPlease find details for Delivery Challan ${challan.challanNo}.\r\n\r\nChallan Date: ${challan.date.toLocaleDateString()}\r\nChallan Transit Status: ${challan.status}\r\n\r\nThank you!`;

    // Fetch company name for PDF
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true }
    });
    const companyName = company?.name || "ERP Workspace";

    const symbol = challan.customer.currencySymbol || "$";
    const subtotal = challan.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
    const pdfData = {
      ...challan,
      companyName,
      currencySymbol: symbol,
      subtotal,
      discount: 0,
      discountType: "PERCENTAGE",
      tax: 0,
      total: subtotal
    };
    const pdfBuffer = generateInvoicePdf("challan", pdfData);

    await sendEmailNotification(
      challan.customer.email,
      `Delivery Challan ${challan.challanNo} from ERP Console`,
      emailBody,
      req.user?.companyCode,
      [{ filename: `Challan_${challan.challanNo}.pdf`, content: pdfBuffer }]
    );

    return res.json({ message: `Delivery Challan ${challan.challanNo} emailed successfully to ${challan.customer.email}` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 5. DISPATCH MANAGEMENT CONTROLLERS
// ==========================================

export async function listDispatches(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const dispatches = await prisma.dispatch.findMany({
      where: { companyId },
      include: {
        order: {
          include: { customer: true }
        }
      },
      orderBy: { dispatchDate: 'desc' }
    });

    return res.json({ dispatches });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createDispatch(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    
    const parsedBody = CreateDispatchBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Bad Request", details: parsedBody.error });
    const {  orderId, carrier, trackingNo, vehicleNo, shippingCost, status, notes  } = parsedBody.data;


    if (!orderId) return res.status(400).json({ error: "Active Sales Order ID is required." });

    const dispatchNo = await generateDocNo(companyId, 'DISP', 'dispatch');

    const dispatch = await prisma.$transaction(async (tx) => {
      const newDisp = await tx.dispatch.create({
        data: {
          companyId,
          orderId,
          dispatchNo,
          carrier: carrier || null,
          trackingNo: trackingNo || null,
          vehicleNo: vehicleNo || null,
          shippingCost: parseFloat(shippingCost) || 0.0,
          status: status || 'SHIPPED',
          notes: notes || null
        }
      });

      // Update corresponding SalesOrder status
      await tx.salesOrder.update({
        where: { id: orderId },
        data: { status: 'DISPATCHED' }
      });

      // Adjust stock levels and log adjustments
      const order = await tx.salesOrder.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: true
                }
              }
            }
          }
        }
      });
      if (order) {
        for (const item of order.items) {
          const isServ = isServiceItem(item.product);
          if (!isServ) {
            const remainingStock = item.product.stock - item.quantity;
            if (remainingStock < item.product.reorderLevel) {
              throw new Error(`Cannot dispatch: stock for product '${item.product.name}' will drop below safety limit of ${item.product.reorderLevel} ${item.product.uom}. Available stock: ${item.product.stock}.`);
            }

            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.quantity } }
            });

            const newStock = remainingStock;
            const previousStock = item.product.stock;

            const adjCount = await tx.stockAdjustment.count({ where: { companyId } });
            const adjustmentNo = `ADJ-${new Date().getFullYear()}-${(adjCount + 1).toString().padStart(5, '0')}`;
            await tx.stockAdjustment.create({
              data: {
                companyId,
                productId: item.productId,
                adjustmentNo,
                type: 'OUTWARD_SO',
                quantity: -item.quantity,
                previousStock,
                newStock,
                reason: `Sales Dispatch ${dispatchNo}`,
                referenceNo: dispatchNo
              }
            });
          }
        }
      }

      return newDisp;
    });

    const finalDispatch = await prisma.dispatch.findUnique({
      where: { id: dispatch.id },
      include: { order: { include: { customer: true, items: true } } }
    });

    // Fire low stock check alerts asynchronously after transaction commits
    const { checkAndNotifyLowStock } = require('../utils/lowStockAlert');
    if (finalDispatch && finalDispatch.order) {
      for (const item of finalDispatch.order.items) {
        await checkAndNotifyLowStock(item.productId, req.user?.userId);
      }
    }

    return res.status(201).json({ message: `Dispatch ${dispatchNo} registered successfully`, dispatch: finalDispatch });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateDispatch(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    
    const parsedBody = UpdateDispatchBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Bad Request", details: parsedBody.error });
    const {  orderId, carrier, trackingNo, vehicleNo, shippingCost, status, notes  } = parsedBody.data;


    const disp = await prisma.dispatch.findFirst({ where: { id, companyId } });
    if (!disp) return res.status(404).json({ error: "Dispatch record not found" });

    const updated = await prisma.$transaction(async (tx) => {
      const up = await tx.dispatch.update({
        where: { id },
        data: {
          ...(orderId && { orderId }),
          ...(carrier !== undefined && { carrier: carrier || null }),
          ...(trackingNo !== undefined && { trackingNo: trackingNo || null }),
          ...(vehicleNo !== undefined && { vehicleNo: vehicleNo || null }),
          ...(shippingCost !== undefined && { shippingCost: parseFloat(shippingCost) || 0.0 }),
          ...(status && { status }),
          ...(notes !== undefined && { notes: notes || null })
        }
      });

      // Handle SalesOrder status updates based on the dispatch status
      const targetOrderId = orderId || disp.orderId;
      const targetStatus = status || disp.status;
      
      let soStatus = 'DISPATCHED';
      if (targetStatus === 'DELIVERED') soStatus = 'COMPLETED';
      else if (targetStatus === 'RETURNED') soStatus = 'CANCELLED';

      // If orderId has changed
      if (orderId && orderId !== disp.orderId) {
        // Revert old SalesOrder if no other dispatches exist for it
        const otherDispatches = await tx.dispatch.findMany({
          where: { orderId: disp.orderId, id: { not: id } }
        });
        if (otherDispatches.length === 0) {
          await tx.salesOrder.update({
            where: { id: disp.orderId },
            data: { status: 'PENDING' }
          });
        }

        // Update new SalesOrder
        await tx.salesOrder.update({
          where: { id: orderId },
          data: { status: soStatus }
        });
      } else {
        // Just update the current SalesOrder
        await tx.salesOrder.update({
          where: { id: disp.orderId },
          data: { status: soStatus }
        });
      }

      return up;
    });

    const finalDispatch = await prisma.dispatch.findUnique({
      where: { id },
      include: { order: { include: { customer: true } } }
    });

    return res.json({ message: "Dispatch record updated", dispatch: finalDispatch });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteDispatch(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const dispatch = await prisma.dispatch.findFirst({
      where: { id, companyId },
      include: { order: { include: { items: true } } }
    });
    if (!dispatch) return res.status(404).json({ error: "Dispatch record not found" });

    await prisma.$transaction(async (tx) => {
      if (dispatch.order) {
        for (const item of dispatch.order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } }
          });

          const updatedProd = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stock: true }
          });
          const newStock = updatedProd ? updatedProd.stock : 0.0;
          const previousStock = newStock - item.quantity;

          const adjCount = await tx.stockAdjustment.count({ where: { companyId } });
          const adjustmentNo = `ADJ-${new Date().getFullYear()}-${(adjCount + 1).toString().padStart(5, '0')}`;
          await tx.stockAdjustment.create({
            data: {
              companyId,
              productId: item.productId,
              adjustmentNo,
              type: 'INWARD_RETURN',
              quantity: item.quantity,
              previousStock,
              newStock,
              reason: `Reversal of Dispatch ${dispatch.dispatchNo}`,
              referenceNo: dispatch.dispatchNo
            }
          });
        }

        await tx.salesOrder.update({
          where: { id: dispatch.orderId },
          data: { status: 'PENDING' }
        });
      }

      await tx.dispatch.delete({ where: { id } });
    });

    return res.json({ message: "Dispatch record permanently removed." });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 6. QUOTATIONS CONTROLLERS
// ==========================================

export async function listQuotations(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const quotations = await prisma.quotation.findMany({
      where: { companyId },
      include: {
        customer: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, uom: true } } } }
      },
      orderBy: { date: 'desc' }
    });

    return res.json({ quotations });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createQuotation(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    
    const parsedBody = CreateQuotationBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Bad Request", details: parsedBody.error });
    const {  customerId, date, expiryDate, subtotal, discount, tax, total, status, items  } = parsedBody.data;


    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Customer reference and at least one item are required." });
    }

    const quoteNo = await generateDocNo(companyId, 'QT', 'quotation' as any);

    const quotation = await prisma.quotation.create({
      data: {
        companyId,
        customerId,
        quoteNo,
        date: date ? new Date(date) : new Date(),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        subtotal: parseFloat(subtotal) || 0.0,
        discount: parseFloat(discount) || 0.0,
        tax: parseFloat(tax) || 0.0,
        total: parseFloat(total) || 0.0,
        status: status || 'DRAFT',
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

    return res.status(201).json({ message: `Quotation ${quoteNo} generated successfully`, quotation });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateQuotationStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    
    const parsedBody = UpdateQuotationStatusBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Bad Request", details: parsedBody.error });
    const {  status  } = parsedBody.data;


    const quote = await prisma.quotation.findFirst({ where: { id, companyId } });
    if (!quote) return res.status(404).json({ error: "Quotation not found" });
    const quotation = await prisma.quotation.update({
      where: { id },
      data: { status }
    });

    return res.json({ message: "Quotation status updated", quotation });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteQuotation(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const quote = await prisma.quotation.findFirst({ where: { id, companyId } });
    if (!quote) return res.status(404).json({ error: "Quotation not found" });
    await prisma.quotation.delete({ where: { id } });
    return res.json({ message: "Quotation permanently removed." });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 7. POST-SALES SERVICE (SERVICE TICKETS)
// ==========================================

export async function listServiceTickets(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const tickets = await prisma.serviceTicket.findMany({
      where: { companyId },
      include: {
        customer: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ tickets });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createServiceTicket(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    
    const parsedBody = CreateServiceTicketBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Bad Request", details: parsedBody.error });
    const {  customerId, productId, serialNumber, title, type, priority, status, scheduledDate, resolutionNotes  } = parsedBody.data;


    if (!customerId || !productId || !title || !type || !priority) {
      return res.status(400).json({ error: "Customer, Product, Title, Type and Priority are required fields." });
    }

    const ticketNo = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;

    const ticket = await prisma.serviceTicket.create({
      data: {
        companyId,
        customerId,
        productId,
        serialNumber: serialNumber || null,
        ticketNo,
        title,
        type,
        priority,
        status: status || "OPEN",
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        resolutionNotes: resolutionNotes || null
      }
    });

    return res.status(201).json({ message: `Service ticket ${ticketNo} logged successfully`, ticket });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateServiceTicket(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    
    const parsedBody = UpdateServiceTicketBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Bad Request", details: parsedBody.error });
    const {  status, resolutionNotes, scheduledDate, priority  } = parsedBody.data;


    const exist = await prisma.serviceTicket.findFirst({ where: { id, companyId } });
    if (!exist) return res.status(404).json({ error: "Service ticket not found" });
    const ticket = await prisma.serviceTicket.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(resolutionNotes !== undefined && { resolutionNotes: resolutionNotes || null }),
        ...(scheduledDate !== undefined && { scheduledDate: scheduledDate ? new Date(scheduledDate) : null }),
        ...(priority && { priority })
      }
    });

    return res.json({ message: "Service ticket details updated", ticket });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteServiceTicket(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const exist = await prisma.serviceTicket.findFirst({ where: { id, companyId } });
    if (!exist) return res.status(404).json({ error: "Service ticket not found" });
    await prisma.serviceTicket.delete({ where: { id } });
    return res.json({ message: "Service ticket deleted successfully." });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 5. DOCUMENT TEMPLATE CONTROLLERS
// ==========================================

export async function listDocumentTemplates(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    
    const parsedQuery = ListDocumentTemplatesQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) return res.status(400).json({ error: "Bad Request", details: parsedQuery.error });
    const {  docType  } = parsedQuery.data;


    const templates = await prisma.documentTemplate.findMany({
      where: {
        companyId,
        ...(docType && { docType: String(docType) })
      },
      orderBy: { name: 'asc' }
    });

    return res.json({ templates });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createDocumentTemplate(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    
    const parsedBody = CreateDocumentTemplateBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Bad Request", details: parsedBody.error });
    const {  name, docType, title, isDefault, settings, terms  } = parsedBody.data;


    if (!name || !docType || !settings) {
      return res.status(400).json({ error: "Name, docType, and settings are required." });
    }

    // If marked as default, unset others of same docType
    if (isDefault) {
      await prisma.documentTemplate.updateMany({
        where: { companyId, docType, isDefault: true },
        data: { isDefault: false }
      });
    }

    const template = await prisma.documentTemplate.create({
      data: {
        companyId,
        name,
        docType,
        title: title || "Tax Invoice",
        isDefault: !!isDefault,
        settings: typeof settings === 'string' ? settings : JSON.stringify(settings),
        terms: terms || null
      }
    });

    return res.status(201).json({ message: "Document template created successfully", template });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateDocumentTemplate(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    
    const parsedBody = UpdateDocumentTemplateBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Bad Request", details: parsedBody.error });
    const {  name, docType, title, isDefault, settings, terms  } = parsedBody.data;


    const exist = await prisma.documentTemplate.findFirst({ where: { id, companyId } });
    if (!exist) return res.status(404).json({ error: "Document template not found" });

    const targetDocType = docType || exist.docType;

    if (isDefault) {
      await prisma.documentTemplate.updateMany({
        where: { companyId, docType: targetDocType, isDefault: true },
        data: { isDefault: false }
      });
    }

    const template = await prisma.documentTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(docType && { docType }),
        ...(title !== undefined && { title }),
        ...(isDefault !== undefined && { isDefault: !!isDefault }),
        ...(settings !== undefined && { settings: typeof settings === 'string' ? settings : JSON.stringify(settings) }),
        ...(terms !== undefined && { terms: terms || null })
      }
    });

    return res.json({ message: "Document template updated successfully", template });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteDocumentTemplate(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const exist = await prisma.documentTemplate.findFirst({ where: { id, companyId } });
    if (!exist) return res.status(404).json({ error: "Document template not found" });

    await prisma.documentTemplate.delete({ where: { id } });
    return res.json({ message: "Document template deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getExchangeRates(req: AuthenticatedRequest, res: Response) {
  try {
    const rates = await prisma.exchangeRate.findMany();
    const rateMap: Record<string, number> = {};
    for (const r of rates) {
      rateMap[r.targetCode] = r.rate;
    }
    return res.json({ base: 'USD', rates: rateMap });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
