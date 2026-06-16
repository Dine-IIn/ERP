import { AdjustStockBodySchema } from '../types/index';
import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../services/db';
import { logAudit } from '../utils/audit';
import { markNeedsRefresh } from '../services/forecast';

export async function listStockAdjustments(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const adjustments = await prisma.stockAdjustment.findMany({
      where: { companyId },
      include: { product: { select: { id: true, name: true, uom: true } } },
      orderBy: { date: 'desc' }
    });

    return res.json({ adjustments });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function adjustStock(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const parsedBody = AdjustStockBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Invalid input", details: parsedBody.error.issues });
    const { productId, type, quantity, reason } = parsedBody.data;

    if (!productId || !type || quantity === undefined) {
      return res.status(400).json({ error: "Product reference, adjustment type (MANUAL_ADD/MANUAL_SUB), and quantity are required." });
    }

    const parsedQty = parseFloat(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({ error: "Quantity must be a positive number." });
    }

    const prod = await prisma.product.findFirst({ where: { id: productId, companyId } });
    if (!prod || prod.companyId !== companyId) {
      return res.status(404).json({ error: "Product catalog entry not found." });
    }

    const previousStock = prod.stock || 0.0;
    let delta = parsedQty;
    if (type === 'MANUAL_SUB') {
      delta = -parsedQty;
    }

    const newStock = Math.max(0, previousStock + delta);

    const adjustment = await prisma.$transaction(async (tx) => {
      // 1. Update active physical stock
      await tx.product.update({
        where: { id: productId },
        data: { stock: newStock }
      });

      // 2. Generate stock adjustment ledger transaction
      const adj = await tx.stockAdjustment.create({
        data: {
          companyId,
          productId,
          adjustmentNo: `ADJ-MAN-${Math.floor(100000 + Math.random() * 900000)}`,
          type,
          quantity: delta,
          previousStock,
          newStock,
          reason: reason || `Manual inventory audit stock adjustment.`
        },
        include: { product: { select: { id: true, name: true, uom: true } } }
      });

      return adj;
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'inventory_adjustment',
      'CREATE',
      { previousStock },
      adjustment,
      req.ip,
      req.headers['user-agent']
    );

    // Check if updated stock drops below safety limit
    const { checkAndNotifyLowStock } = require('../utils/lowStockAlert');
    await checkAndNotifyLowStock(productId, req.user?.userId);

    // Flag company forecasting data for schedule refresh
    await markNeedsRefresh(companyId);

    return res.status(201).json({ message: "Stock adjustment processed successfully", adjustment });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
