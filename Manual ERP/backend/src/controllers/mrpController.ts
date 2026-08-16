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
 * 1. AUTOMATED SMART MRP ENGINE
 * Auto-calculates material requirements by scanning active Production Plans & BOMs.
 */
export async function getMrpRecommendations(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

    // Fetch all active production plans
    const productionPlans = await prisma.productionPlan.findMany({
      where: { companyId, status: { in: ['PENDING', 'SCHEDULED', 'RELEASED'] } },
      include: {
        finishedProduct: true,
        bom: {
          include: {
            components: {
              include: {
                product: true
              }
            }
          }
        }
      }
    });

    // Fetch all products for stock level & reorder alerts
    const allProducts = await prisma.product.findMany({
      where: { companyId }
    });

    const jitRequirements: any[] = [];
    const bulkReorderRecommendations: any[] = [];

    // Map to aggregate component requirements
    const componentTotalDemand: Record<string, number> = {};

    for (const plan of productionPlans) {
      const qty = plan.qtyToProduce;
      const startDate = new Date(plan.startDate);
      const endDate = new Date(plan.endDate);

      // Calculate production duration in months (minimum 1 month)
      const monthsDuration = Math.max(
        1,
        (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth()) + 1
      );

      const components = plan.bom?.components || [];

      for (const comp of components) {
        const totalCompNeeded = comp.qtyRequired * qty;
        componentTotalDemand[comp.productId] = (componentTotalDemand[comp.productId] || 0) + totalCompNeeded;

        const isCostly = comp.product.pricing >= 50; // Threshold for costly item

        if (isCostly && monthsDuration > 1) {
          // Auto-calculate monthly JIT breakdown
          const monthlyQty = Math.ceil(totalCompNeeded / monthsDuration);

          for (let m = 0; m < monthsDuration; m++) {
            const reqDate = new Date(startDate);
            reqDate.setMonth(reqDate.getMonth() + m);

            jitRequirements.push({
              planId: plan.id,
              finishedProduct: plan.finishedProduct.name,
              componentId: comp.productId,
              componentName: comp.product.name,
              requiredMonth: reqDate.toLocaleString('default', { month: 'short', year: 'numeric' }),
              monthlyQuantity: monthlyQty,
              unitPrice: comp.product.pricing,
              totalCost: monthlyQty * comp.product.pricing
            });
          }
        }
      }
    }

    // Calculate Bulk Reorder recommendations for cheap/general items
    for (const prod of allProducts) {
      const needed = componentTotalDemand[prod.id] || 0;
      const currentStock = prod.stock;
      const reorderLevel = prod.reorderLevel || 5;

      // If stock after planned production drops below reorder level
      if (currentStock - needed <= reorderLevel) {
        const shortfall = Math.max(0, (reorderLevel + needed) - currentStock);
        const moq = prod.moq || 1;
        // Auto-round up to Minimum Order Quantity (MOQ)
        const recommendedOrderQty = Math.max(moq, Math.ceil(shortfall / moq) * moq);

        bulkReorderRecommendations.push({
          productId: prod.id,
          productName: prod.name,
          currentStock,
          reorderLevel,
          plannedDemand: needed,
          moq,
          recommendedOrderQty,
          unitPrice: prod.pricing,
          estimatedTotalCost: recommendedOrderQty * prod.pricing
        });
      }
    }

    return res.json({
      jitRequirements,
      bulkReorderRecommendations
    });
  } catch (error: any) {
    console.error('[MRP Controller Error]:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * 2. CUSTOMER-SPECIFIC DYNAMIC PRICING
 * Fetches the unit price of a product from the most recent Sales Invoice issued to this customer.
 */
export async function getLastCustomerPrice(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    const { customerId, productId } = req.query;

    if (!companyId || !customerId || !productId) {
      return res.status(400).json({ error: 'Missing customerId or productId' });
    }

    // Find the latest invoice item for this customer and product
    const lastInvoiceItem = await prisma.salesInvoiceItem.findFirst({
      where: {
        productId: String(productId),
        invoice: {
          companyId,
          customerId: String(customerId)
        }
      },
      include: {
        invoice: {
          select: {
            createdAt: true
          }
        }
      },
      orderBy: {
        id: 'desc'
      }
    });

    if (lastInvoiceItem) {
      return res.json({
        found: true,
        lastPrice: lastInvoiceItem.price,
        invoiceDate: lastInvoiceItem.invoice.createdAt
      });
    }

    // Fallback to base product price
    const product = await prisma.product.findUnique({
      where: { id: String(productId) },
      select: { pricing: true }
    });

    return res.json({
      found: false,
      lastPrice: product?.pricing || 0
    });
  } catch (error: any) {
    console.error('[Customer Pricing Error]:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * 3. COST ROLL-UP PROPAGATION
 * Automatically updates selling price of finished products when raw material cost changes.
 */
export async function updateRawMaterialCost(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    const { productId, newPrice } = req.body;

    if (!companyId || !productId || newPrice === undefined) {
      return res.status(400).json({ error: 'Missing productId or newPrice' });
    }

    // 1. Fetch current product
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) return res.status(404).json({ error: 'Product not found' });

    const oldPrice = product.pricing;
    const priceDiff = Number(newPrice) - oldPrice;

    // Update raw material product price
    await prisma.product.update({
      where: { id: productId },
      data: { pricing: Number(newPrice) }
    });

    // 2. If price changed, find all parent BOMs using this component
    const updatedParents: string[] = [];

    if (Math.abs(priceDiff) > 0.001) {
      const bomComponents = await prisma.bomComponent.findMany({
        where: { productId },
        include: {
          bom: {
            include: { finishedProduct: true }
          }
        }
      });

      for (const comp of bomComponents) {
        const parentProduct = comp.bom.finishedProduct;
        if (parentProduct && parentProduct.companyId === companyId) {
          // Total price increase = (Price Difference * Qty Required in BOM)
          const costIncrease = priceDiff * comp.qtyRequired;
          const updatedParentPrice = Math.max(0, parentProduct.pricing + costIncrease);

          await prisma.product.update({
            where: { id: parentProduct.id },
            data: { pricing: updatedParentPrice }
          });

          updatedParents.push(`${parentProduct.name} (Updated from $${parentProduct.pricing} to $${updatedParentPrice})`);
        }
      }
    }

    return res.json({
      message: `Product cost updated from $${oldPrice} to $${newPrice}`,
      updatedParents
    });
  } catch (error: any) {
    console.error('[Cost Roll-Up Error]:', error);
    return res.status(500).json({ error: error.message });
  }
}
