import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../services/db';
import { logAudit } from '../utils/audit';
import { sendEmailNotification } from '../utils';

// Helper to generate next document number
async function generateDocNo(companyId: string, prefix: string, modelName: 'salesOrder' | 'proformaInvoice' | 'salesInvoice' | 'deliveryChallan' | 'dispatch'): Promise<string> {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${new Date().getFullYear()}-${rand}`;
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
          include: { product: true }
        }
      },
      orderBy: { orderDate: 'desc' }
    });

    return res.json({ orders });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createSalesOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { customerId, deliveryDate, discount, items } = req.body;

    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Customer and at least one product order item are required." });
    }

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
          status: 'PENDING'
        }
      });

      for (const item of items) {
        if (!item.productId || !item.quantity || !item.price) continue;
        await tx.salesOrderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId,
            quantity: parseFloat(item.quantity),
            price: parseFloat(item.price),
            deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : (deliveryDate ? new Date(deliveryDate) : null),
            discount: parseFloat(item.discount) || 0.0
          }
        });
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
    const { customerId, deliveryDate, discount, status, items } = req.body;

    const orderToUpdate = await prisma.salesOrder.findFirst({
      where: { id, companyId }
    });
    if (!orderToUpdate) {
      return res.status(404).json({ error: "Sales Order not found" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.salesOrder.update({
        where: { id },
        data: {
          ...(customerId && { customerId }),
          ...(deliveryDate !== undefined && { deliveryDate: deliveryDate ? new Date(deliveryDate) : null }),
          ...(discount !== undefined && { discount: parseFloat(discount) || 0.0 }),
          ...(status && { status })
        }
      });

      if (items && Array.isArray(items)) {
        await tx.salesOrderItem.deleteMany({ where: { orderId: id } });
        for (const item of items) {
          if (!item.productId || !item.quantity || !item.price) continue;
          await tx.salesOrderItem.create({
            data: {
              orderId: id,
              productId: item.productId,
              quantity: parseFloat(item.quantity),
              price: parseFloat(item.price),
              deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : null,
              discount: parseFloat(item.discount) || 0.0
            }
          });
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

    const { customerId, dueDate, discount, tax, subtotal, total, status, items } = req.body;

    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Customer and at least one item are required." });
    }

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
          status: status || 'DRAFT'
        }
      });

      for (const item of items) {
        if (!item.productId || !item.quantity || !item.price) continue;
        await tx.proformaInvoiceItem.create({
          data: {
            invoiceId: newInvoice.id,
            productId: item.productId,
            quantity: parseFloat(item.quantity),
            price: parseFloat(item.price),
            discount: parseFloat(item.discount) || 0.0
          }
        });
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
    const { customerId, dueDate, discount, tax, subtotal, total, status, items } = req.body;

    const invoice = await prisma.proformaInvoice.findFirst({ where: { id, companyId } });
    if (!invoice) return res.status(404).json({ error: "Proforma Invoice not found" });

    await prisma.$transaction(async (tx) => {
      await tx.proformaInvoice.update({
        where: { id },
        data: {
          ...(customerId && { customerId }),
          ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
          ...(subtotal !== undefined && { subtotal: parseFloat(subtotal) || 0.0 }),
          ...(discount !== undefined && { discount: parseFloat(discount) || 0.0 }),
          ...(tax !== undefined && { tax: parseFloat(tax) || 0.0 }),
          ...(total !== undefined && { total: parseFloat(total) || 0.0 }),
          ...(status && { status })
        }
      });

      if (items && Array.isArray(items)) {
        await tx.proformaInvoiceItem.deleteMany({ where: { invoiceId: id } });
        for (const item of items) {
          if (!item.productId || !item.quantity || !item.price) continue;
          await tx.proformaInvoiceItem.create({
            data: {
              invoiceId: id,
              productId: item.productId,
              quantity: parseFloat(item.quantity),
              price: parseFloat(item.price),
              discount: parseFloat(item.discount) || 0.0
            }
          });
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

    const emailBody = `Dear ${invoice.customer.name},\r\n\r\nPlease find details for Proforma Invoice ${invoice.invoiceNo}.\r\n\r\nInvoice Date: ${invoice.date.toLocaleDateString()}\r\nTotal Amount Due: $${invoice.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}\r\n\r\nThank you for doing business with us!`;

    await sendEmailNotification(
      invoice.customer.email,
      `Proforma Invoice ${invoice.invoiceNo} from ERP Console`,
      emailBody,
      req.user?.companyCode
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

    const { customerId, dueDate, discount, tax, subtotal, total, status, items } = req.body;

    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Customer and at least one item are required." });
    }

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
          tax: parseFloat(tax) || 0.0,
          total: parseFloat(total) || 0.0,
          status: status || 'UNPAID'
        }
      });

      for (const item of items) {
        if (!item.productId || !item.quantity || !item.price) continue;
        await tx.salesInvoiceItem.create({
          data: {
            invoiceId: newInvoice.id,
            productId: item.productId,
            quantity: parseFloat(item.quantity),
            price: parseFloat(item.price),
            discount: parseFloat(item.discount) || 0.0
          }
        });
      }

      return newInvoice;
    });

    const finalInvoice = await prisma.salesInvoice.findUnique({
      where: { id: invoice.id },
      include: { customer: true, items: { include: { product: true } } }
    });

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
    const { customerId, dueDate, discount, tax, subtotal, total, status, items } = req.body;

    const invoice = await prisma.salesInvoice.findFirst({ where: { id, companyId } });
    if (!invoice) return res.status(404).json({ error: "Sales Invoice not found" });

    await prisma.$transaction(async (tx) => {
      await tx.salesInvoice.update({
        where: { id },
        data: {
          ...(customerId && { customerId }),
          ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
          ...(subtotal !== undefined && { subtotal: parseFloat(subtotal) || 0.0 }),
          ...(discount !== undefined && { discount: parseFloat(discount) || 0.0 }),
          ...(tax !== undefined && { tax: parseFloat(tax) || 0.0 }),
          ...(total !== undefined && { total: parseFloat(total) || 0.0 }),
          ...(status && { status })
        }
      });

      if (items && Array.isArray(items)) {
        await tx.salesInvoiceItem.deleteMany({ where: { invoiceId: id } });
        for (const item of items) {
          if (!item.productId || !item.quantity || !item.price) continue;
          await tx.salesInvoiceItem.create({
            data: {
              invoiceId: id,
              productId: item.productId,
              quantity: parseFloat(item.quantity),
              price: parseFloat(item.price),
              discount: parseFloat(item.discount) || 0.0
            }
          });
        }
      }
    });

    const finalInvoice = await prisma.salesInvoice.findUnique({
      where: { id },
      include: { customer: true, items: { include: { product: true } } }
    });

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
    await prisma.salesInvoice.delete({ where: { id } });
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

    const emailBody = `Dear ${invoice.customer.name},\r\n\r\nPlease find details for Sales Invoice ${invoice.invoiceNo}.\r\n\r\nInvoice Date: ${invoice.date.toLocaleDateString()}\r\nTotal Amount Due: $${invoice.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}\r\nPayment Status: ${invoice.status}\r\n\r\nThank you for your valuable corporate business!`;

    await sendEmailNotification(
      invoice.customer.email,
      `Sales Invoice ${invoice.invoiceNo} from ERP Console`,
      emailBody,
      req.user?.companyCode
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

    const { customerId, status, items } = req.body;

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
          status: status || 'ISSUED'
        }
      });

      for (const item of items) {
        if (!item.productId || !item.quantity) continue;
        await tx.deliveryChallanItem.create({
          data: {
            challanId: newChallan.id,
            productId: item.productId,
            quantity: parseFloat(item.quantity),
            price: parseFloat(item.price) || 0.0
          }
        });
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
    const { customerId, status, items } = req.body;

    const challan = await prisma.deliveryChallan.findFirst({ where: { id, companyId } });
    if (!challan) return res.status(404).json({ error: "Delivery Challan not found" });

    await prisma.$transaction(async (tx) => {
      await tx.deliveryChallan.update({
        where: { id },
        data: {
          ...(customerId && { customerId }),
          ...(status && { status })
        }
      });

      if (items && Array.isArray(items)) {
        await tx.deliveryChallanItem.deleteMany({ where: { challanId: id } });
        for (const item of items) {
          if (!item.productId || !item.quantity) continue;
          await tx.deliveryChallanItem.create({
            data: {
              challanId: id,
              productId: item.productId,
              quantity: parseFloat(item.quantity),
              price: parseFloat(item.price) || 0.0
            }
          });
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

    await sendEmailNotification(
      challan.customer.email,
      `Delivery Challan ${challan.challanNo} from ERP Console`,
      emailBody,
      req.user?.companyCode
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

    const { orderId, carrier, trackingNo, vehicleNo, shippingCost, status, notes } = req.body;

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

      return newDisp;
    });

    const finalDispatch = await prisma.dispatch.findUnique({
      where: { id: dispatch.id },
      include: { order: { include: { customer: true } } }
    });

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
    const { carrier, trackingNo, vehicleNo, shippingCost, status, notes } = req.body;

    const disp = await prisma.dispatch.findFirst({ where: { id, companyId } });
    if (!disp) return res.status(404).json({ error: "Dispatch record not found" });

    const updated = await prisma.dispatch.update({
      where: { id },
      data: {
        ...(carrier !== undefined && { carrier: carrier || null }),
        ...(trackingNo !== undefined && { trackingNo: trackingNo || null }),
        ...(vehicleNo !== undefined && { vehicleNo: vehicleNo || null }),
        ...(shippingCost !== undefined && { shippingCost: parseFloat(shippingCost) || 0.0 }),
        ...(status && { status }),
        ...(notes !== undefined && { notes: notes || null })
      }
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
    await prisma.dispatch.delete({ where: { id } });
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

    const { customerId, date, expiryDate, subtotal, discount, tax, total, status, items } = req.body;

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
    const { status } = req.body;

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

    const { customerId, productId, serialNumber, title, type, priority, status, scheduledDate, resolutionNotes } = req.body;

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
    const { status, resolutionNotes, scheduledDate, priority } = req.body;

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
    await prisma.serviceTicket.delete({ where: { id } });
    return res.json({ message: "Service ticket deleted successfully." });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
