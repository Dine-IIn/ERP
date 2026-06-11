import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../services/db';
import { logAudit } from '../utils/audit';

interface ExplodedComponent {
  productId: string;
  qtyRequired: number;
  hasBom: boolean;
  bomId?: string;
}

async function explodeBOM(bomId: string, qty: number, companyId: string, visited: string[] = []): Promise<ExplodedComponent[]> {
  if (visited.includes(bomId)) return [];
  visited.push(bomId);

  const bom = await prisma.billOfMaterials.findUnique({
    where: { id: bomId },
    include: { components: true }
  });
  if (!bom) return [];

  const exploded: ExplodedComponent[] = [];
  for (const comp of bom.components) {
    const totalQty = comp.qtyRequired * qty;
    const subBom = await prisma.billOfMaterials.findFirst({
      where: { finishedProductId: comp.productId, status: 'ACTIVE', companyId }
    });
    if (subBom) {
      exploded.push({
        productId: comp.productId,
        qtyRequired: totalQty,
        hasBom: true,
        bomId: subBom.id
      });
      const subExploded = await explodeBOM(subBom.id, totalQty, companyId, [...visited]);
      exploded.push(...subExploded);
    } else {
      exploded.push({
        productId: comp.productId,
        qtyRequired: totalQty,
        hasBom: false
      });
    }
  }
  return exploded;
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

// Helper to check company authentication
const getCompanyId = (req: AuthenticatedRequest, res: Response): string | null => {
  const companyId = req.user?.companyId;
  if (!companyId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return companyId;
};

// ==========================================
// 1. BILL OF MATERIALS (BOM) CRUD
// ==========================================

export async function listBoms(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const boms = await prisma.billOfMaterials.findMany({
      where: { companyId },
      include: {
        finishedProduct: true,
        components: {
          include: {
            product: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return res.json({ boms });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createBom(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { finishedProductId, version, laborHours, laborRate, overheadAllocation, components } = req.body;

    if (!finishedProductId || !version || !components || !Array.isArray(components)) {
      return res.status(400).json({ error: 'finishedProductId, version, and components array are required' });
    }

    // Check duplicate version
    const existing = await prisma.billOfMaterials.findUnique({
      where: {
        companyId_finishedProductId_version: {
          companyId,
          finishedProductId,
          version
        }
      }
    });

    if (existing) {
      return res.status(409).json({ error: `A BOM for this product with version '${version}' already exists.` });
    }

    const bom = await prisma.billOfMaterials.create({
      data: {
        companyId,
        finishedProductId,
        version,
        laborHours: parseFloat(laborHours) || 0.0,
        laborRate: parseFloat(laborRate) || 0.0,
        overheadAllocation: parseFloat(overheadAllocation) || 0.0,
        status: 'ACTIVE',
        components: {
          create: components.map((c: any) => ({
            productId: c.productId,
            qtyRequired: parseFloat(c.qtyRequired) || 0.0,
            wasteMargin: parseFloat(c.wasteMargin) || 0.0
          }))
        }
      },
      include: {
        finishedProduct: true,
        components: true
      }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'manufacturing_bom',
      'CREATE',
      null,
      { id: bom.id, finishedProduct: bom.finishedProduct.name, version: bom.version },
      req.ip,
      req.headers['user-agent']
    );

    return res.status(201).json({ message: 'BOM created successfully', bom });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateBom(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params;
    const { version, laborHours, laborRate, overheadAllocation, status, components } = req.body;

    const existingBom = await prisma.billOfMaterials.findFirst({
      where: { id, companyId }
    });

    if (!existingBom) {
      return res.status(404).json({ error: 'BOM not found' });
    }

    // Handle updates
    const updated = await prisma.billOfMaterials.update({
      where: { id },
      data: {
        ...(version && { version }),
        ...(laborHours !== undefined && { laborHours: parseFloat(laborHours) }),
        ...(laborRate !== undefined && { laborRate: parseFloat(laborRate) }),
        ...(overheadAllocation !== undefined && { overheadAllocation: parseFloat(overheadAllocation) }),
        ...(status && { status })
      }
    });

    // Replace components if provided
    if (components && Array.isArray(components)) {
      await prisma.bomComponent.deleteMany({ where: { bomId: id } });
      for (const c of components) {
        await prisma.bomComponent.create({
          data: {
            bomId: id,
            productId: c.productId,
            qtyRequired: parseFloat(c.qtyRequired) || 0.0,
            wasteMargin: parseFloat(c.wasteMargin) || 0.0
          }
        });
      }
    }

    const finalBom = await prisma.billOfMaterials.findUnique({
      where: { id },
      include: { finishedProduct: true, components: true }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'manufacturing_bom',
      'UPDATE',
      existingBom,
      finalBom,
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: 'BOM updated successfully', bom: finalBom });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteBom(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params;

    const bom = await prisma.billOfMaterials.findFirst({
      where: { id, companyId }
    });

    if (!bom) {
      return res.status(404).json({ error: 'BOM not found' });
    }

    await prisma.billOfMaterials.delete({
      where: { id }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'manufacturing_bom',
      'DELETE',
      { id: bom.id, version: bom.version },
      null,
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: 'BOM deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 2. PRODUCTION PLANNING CRUD
// ==========================================

export async function listPlans(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const plans = await prisma.productionPlan.findMany({
      where: { companyId },
      include: {
        finishedProduct: true,
        bom: true,
        salesOrder: {
          include: {
            customer: true
          }
        }
      },
      orderBy: { startDate: 'desc' }
    });

    return res.json({ plans });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createPlan(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { salesOrderId, finishedProductId, qtyToProduce, startDate, endDate, bomId } = req.body;

    if (!finishedProductId || !qtyToProduce || !startDate || !endDate || !bomId) {
      return res.status(400).json({ error: 'finishedProductId, qtyToProduce, startDate, endDate, and bomId are required' });
    }

    if (salesOrderId) {
      const existingPlan = await prisma.productionPlan.findFirst({
        where: { salesOrderId, companyId }
      });
      if (existingPlan) {
        return res.status(409).json({ error: 'A production plan has already been scheduled for this Sales Order.' });
      }
    }

    const plan = await prisma.productionPlan.create({
      data: {
        companyId,
        salesOrderId: salesOrderId || null,
        finishedProductId,
        qtyToProduce: parseFloat(qtyToProduce),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        bomId,
        status: 'PENDING'
      },
      include: {
        finishedProduct: true,
        bom: true
      }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'production_plan',
      'CREATE',
      null,
      { id: plan.id, qty: plan.qtyToProduce },
      req.ip,
      req.headers['user-agent']
    );

    return res.status(201).json({ message: 'Production Plan created', plan });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updatePlan(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params;
    const { salesOrderId, finishedProductId, qtyToProduce, startDate, endDate, status, bomId } = req.body;

    const existing = await prisma.productionPlan.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Production Plan not found' });
    }

    const updated = await prisma.productionPlan.update({
      where: { id },
      data: {
        ...(salesOrderId !== undefined && { salesOrderId: salesOrderId || null }),
        ...(finishedProductId && { finishedProductId }),
        ...(qtyToProduce !== undefined && { qtyToProduce: parseFloat(qtyToProduce) }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(status && { status }),
        ...(bomId && { bomId })
      },
      include: {
        finishedProduct: true,
        bom: true
      }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'production_plan',
      'UPDATE',
      existing,
      updated,
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: 'Production Plan updated successfully', plan: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function releasePlan(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params;
    const existing = await prisma.productionPlan.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Production Plan not found' });
    }

    const updated = await prisma.productionPlan.update({
      where: { id },
      data: { status: 'RELEASED' }
    });

    return res.json({ message: 'Plan released to shop floor successfully', plan: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deletePlan(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params;
    const plan = await prisma.productionPlan.findFirst({
      where: { id, companyId }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Production Plan not found' });
    }

    await prisma.productionPlan.delete({
      where: { id }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'production_plan',
      'DELETE',
      plan,
      null,
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: 'Production Plan deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 3. WORK ORDERS CRUD
// ==========================================

export async function listWorkOrders(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const workOrders = await prisma.workOrder.findMany({
      where: { companyId },
      include: {
        plan: {
          include: {
            finishedProduct: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ workOrders });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createWorkOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { woNo, planId, qtyTarget, priority, routingStage } = req.body;

    if (!woNo || !planId || !qtyTarget) {
      return res.status(400).json({ error: 'woNo, planId, and qtyTarget are required' });
    }

    const checkWoNo = await prisma.workOrder.findUnique({
      where: { woNo }
    });
    if (checkWoNo) {
      return res.status(409).json({ error: `Work Order number '${woNo}' is already taken.` });
    }

    const workOrder = await prisma.$transaction(async (tx) => {
      const plan = await tx.productionPlan.findFirst({
        where: { id: planId, companyId },
        include: { bom: true }
      });
      if (!plan) throw new Error("Production Plan not found");

      const finishedProductId = plan.finishedProductId;

      const wo = await tx.workOrder.create({
        data: {
          companyId,
          woNo,
          planId,
          qtyTarget: parseFloat(qtyTarget),
          qtyProduced: 0.0,
          priority: priority || 'NORMAL',
          routingStage: routingStage || 'Scheduled Routing',
          status: 'RELEASED'
        }
      });

      // 1. Generate Job Cards from configured routing
      const routing = await tx.routing.findFirst({
        where: { productId: finishedProductId, companyId },
        include: { operations: { orderBy: { sequenceNo: 'asc' } } }
      });
      if (routing && routing.operations.length > 0) {
        for (const op of routing.operations) {
          await tx.jobCard.create({
            data: {
              companyId,
              woId: wo.id,
              operationName: op.operationName,
              workCenterId: op.workCenterId,
              qtyTarget: parseFloat(qtyTarget),
              status: 'PENDING',
              cycleTimeMinutes: op.setupTimeMins + (op.runTimePerUnit * parseFloat(qtyTarget))
            }
          });
        }
      }

      // 2. Explode BOM and create dependent sub-assembly work orders for any component with an active BOM
      const exploded = await explodeBOM(plan.bomId, parseFloat(qtyTarget), companyId);
      for (const comp of exploded) {
        if (comp.hasBom && comp.bomId) {
          const subWoNo = `${woNo}-SUB-${comp.productId.substring(0, 5)}`;
          const checkSub = await tx.workOrder.findUnique({ where: { woNo: subWoNo } });
          if (!checkSub) {
            const subWo = await tx.workOrder.create({
              data: {
                companyId,
                woNo: subWoNo,
                planId,
                qtyTarget: comp.qtyRequired,
                qtyProduced: 0.0,
                priority: priority || 'NORMAL',
                routingStage: 'Scheduled Routing',
                status: 'RELEASED'
              }
            });

            const subRouting = await tx.routing.findFirst({
              where: { productId: comp.productId, companyId },
              include: { operations: { orderBy: { sequenceNo: 'asc' } } }
            });
            if (subRouting && subRouting.operations.length > 0) {
              for (const op of subRouting.operations) {
                await tx.jobCard.create({
                  data: {
                    companyId,
                    woId: subWo.id,
                    operationName: op.operationName,
                    workCenterId: op.workCenterId,
                    qtyTarget: comp.qtyRequired,
                    status: 'PENDING',
                    cycleTimeMinutes: op.setupTimeMins + (op.runTimePerUnit * comp.qtyRequired)
                  }
                });
              }
            }
          }
        }
      }

      return wo;
    });

    return res.status(201).json({ message: 'Work Order dispatched successfully', workOrder });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateWorkOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params;
    const { woNo, qtyTarget, qtyProduced, priority, routingStage, status } = req.body;

    const existing = await prisma.workOrder.findFirst({
      where: { id, companyId }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Work Order not found' });
    }

    const updated = await prisma.workOrder.update({
      where: { id },
      data: {
        ...(woNo && { woNo }),
        ...(qtyTarget !== undefined && { qtyTarget: parseFloat(qtyTarget) }),
        ...(qtyProduced !== undefined && { qtyProduced: parseFloat(qtyProduced) }),
        ...(priority && { priority }),
        ...(routingStage && { routingStage }),
        ...(status && { status })
      }
    });

    return res.json({ message: 'Work Order updated successfully', workOrder: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function startWorkOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params;
    const order = await prisma.workOrder.findFirst({ where: { id, companyId } });
    if (!order) return res.status(404).json({ error: 'Work Order not found' });

    const updated = await prisma.workOrder.update({
      where: { id },
      data: { status: 'IN_PROGRESS', routingStage: 'Molding & Curing' }
    });

    return res.json({ message: 'Work Order started', workOrder: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteWorkOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params;
    const wo = await prisma.workOrder.findFirst({ where: { id, companyId } });
    if (!wo) return res.status(404).json({ error: 'Work Order not found' });

    await prisma.workOrder.delete({ where: { id } });

    return res.json({ message: 'Work order permanently deleted' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 4. JOB CARDS CRUD
// ==========================================

export async function listJobCards(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const jobCards = await prisma.jobCard.findMany({
      where: { companyId },
      include: {
        workOrder: true,
        assignedOperator: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ jobCards });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createJobCard(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { woId, operationName, workCenterId, assignedOperatorId, cycleTimeMinutes, qtyTarget } = req.body;

    if (!woId || !operationName || !qtyTarget) {
      return res.status(400).json({ error: 'woId, operationName, and qtyTarget are required' });
    }

    let resolvedWorkCenterId: string | null = null;
    if (workCenterId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workCenterId);
      if (isUuid) {
        const wc = await prisma.workCenter.findFirst({
          where: { id: workCenterId, companyId }
        });
        if (wc) resolvedWorkCenterId = wc.id;
      }
      if (!resolvedWorkCenterId) {
        const wc = await prisma.workCenter.findFirst({
          where: {
            companyId,
            OR: [
              { name: workCenterId },
              { code: workCenterId }
            ]
          }
        });
        if (wc) {
          resolvedWorkCenterId = wc.id;
        } else {
          const newWc = await prisma.workCenter.create({
            data: {
              companyId,
              name: workCenterId,
              code: `WC-${Math.floor(1000 + Math.random() * 9000)}`,
              capacityHours: 8.0,
              status: 'OPERATIONAL'
            }
          });
          resolvedWorkCenterId = newWc.id;
        }
      }
    }

    const jobCard = await prisma.jobCard.create({
      data: {
        companyId,
        woId,
        operationName,
        workCenterId: resolvedWorkCenterId,
        assignedOperatorId: assignedOperatorId || null,
        status: 'PENDING',
        cycleTimeMinutes: parseFloat(cycleTimeMinutes) || 0.0,
        qtyTarget: parseFloat(qtyTarget) || 0.0,
        qtyAccepted: 0.0,
        qtyScrapped: 0.0
      }
    });

    return res.status(201).json({ message: 'Job Card rostered', jobCard });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateJobCard(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params;
    const { operationName, workCenterId, assignedOperatorId, status, cycleTimeMinutes, qtyTarget, qtyAccepted, qtyScrapped } = req.body;

    const existing = await prisma.jobCard.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ error: 'Job Card not found' });

    let resolvedWorkCenterId: string | null | undefined = undefined;
    if (workCenterId !== undefined) {
      if (!workCenterId) {
        resolvedWorkCenterId = null;
      } else {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workCenterId);
        if (isUuid) {
          const wc = await prisma.workCenter.findFirst({
            where: { id: workCenterId, companyId }
          });
          if (wc) resolvedWorkCenterId = wc.id;
        }
        if (!resolvedWorkCenterId) {
          const wc = await prisma.workCenter.findFirst({
            where: {
              companyId,
              OR: [
                { name: workCenterId },
                { code: workCenterId }
              ]
            }
          });
          if (wc) {
            resolvedWorkCenterId = wc.id;
          } else {
            const newWc = await prisma.workCenter.create({
              data: {
                companyId,
                name: workCenterId,
                code: `WC-${Math.floor(1000 + Math.random() * 9000)}`,
                capacityHours: 8.0,
                status: 'OPERATIONAL'
              }
            });
            resolvedWorkCenterId = newWc.id;
          }
        }
      }
    }

    const updated = await prisma.jobCard.update({
      where: { id },
      data: {
        ...(operationName && { operationName }),
        ...(resolvedWorkCenterId !== undefined && { workCenterId: resolvedWorkCenterId }),
        ...(assignedOperatorId !== undefined && { assignedOperatorId: assignedOperatorId || null }),
        ...(status && { status }),
        ...(cycleTimeMinutes !== undefined && { cycleTimeMinutes: parseFloat(cycleTimeMinutes) || 0.0 }),
        ...(qtyTarget !== undefined && { qtyTarget: parseFloat(qtyTarget) || 0.0 }),
        ...(qtyAccepted !== undefined && { qtyAccepted: parseFloat(qtyAccepted) || 0.0 }),
        ...(qtyScrapped !== undefined && { qtyScrapped: parseFloat(qtyScrapped) || 0.0 })
      }
    });

    return res.json({ message: 'Job Card updated successfully', jobCard: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function startJobCard(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params;
    const job = await prisma.jobCard.findFirst({ where: { id, companyId } });
    if (!job) return res.status(404).json({ error: 'Job Card not found' });

    const updated = await prisma.jobCard.update({
      where: { id },
      data: { status: 'RUNNING', startTime: new Date() }
    });

    return res.json({ message: 'Job started running', jobCard: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function completeJobCard(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params;
    const { qtyAccepted, qtyScrapped } = req.body;

    const job = await prisma.jobCard.findFirst({ where: { id, companyId } });
    if (!job) return res.status(404).json({ error: 'Job Card not found' });

    const updated = await prisma.jobCard.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        qtyAccepted: parseFloat(qtyAccepted) || 0.0,
        qtyScrapped: parseFloat(qtyScrapped) || 0.0,
        endTime: new Date()
      }
    });

    return res.json({ message: 'Job completed logs recorded', jobCard: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteJobCard(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params;
    const job = await prisma.jobCard.findFirst({ where: { id, companyId } });
    if (!job) return res.status(404).json({ error: 'Job Card not found' });

    await prisma.jobCard.delete({ where: { id } });

    return res.json({ message: 'Job card permanently deleted' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 5. PRODUCTION LOGS (YIELD LOGGING) & WAREHOUSE STOCK UPDATES
// ==========================================

export async function listLogs(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const logs = await prisma.productionLog.findMany({
      where: { companyId },
      include: {
        workOrder: {
          include: {
            plan: {
              include: {
                finishedProduct: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ logs });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createLog(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { woId, qtyCompleted, qtyScrapped, operatorName } = req.body;

    if (!woId || qtyCompleted === undefined) {
      return res.status(400).json({ error: 'woId and qtyCompleted are required' });
    }

    const workOrder = await prisma.workOrder.findFirst({
      where: { id: woId, companyId },
      include: {
        plan: {
          include: {
            finishedProduct: {
              include: {
                category: true
              }
            },
            bom: {
              include: {
                components: {
                  include: {
                    product: {
                      include: {
                        category: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!workOrder) {
      return res.status(404).json({ error: 'Work Order not found' });
    }

    const logQty = parseFloat(qtyCompleted);
    const scrapQty = parseFloat(qtyScrapped) || 0.0;
    const totalRequiredQty = logQty + scrapQty;

    // Start Transaction to ensure absolute atomic stock drawdowns
    const result = await prisma.$transaction(async (tx) => {
      // 1. Log yield
      const log = await tx.productionLog.create({
        data: {
          companyId,
          woId,
          qtyCompleted: logQty,
          qtyScrapped: scrapQty,
          operatorName: operatorName || 'System Operator',
          consumptionStatus: 'CONSUMED',
          dateLog: new Date()
        }
      });

      // 2. Increment Finished Goods stock
      const finishedProduct = workOrder.plan.finishedProduct;
      const isFinService = isServiceItem(finishedProduct);
      if (!isFinService) {
        const prevStockFinished = finishedProduct.stock;
        const newStockFinished = prevStockFinished + logQty;

        await tx.product.update({
          where: { id: finishedProduct.id },
          data: { stock: newStockFinished }
        });

        // Log stock adjustment for finished goods
        await tx.stockAdjustment.create({
          data: {
            companyId,
            productId: finishedProduct.id,
            adjustmentNo: `ADJ-FG-${Date.now()}`,
            type: 'MANUAL_ADD',
            quantity: logQty,
            previousStock: prevStockFinished,
            newStock: newStockFinished,
            reason: `Finished Goods Yield Receipt - Work Order: ${workOrder.woNo}`,
            referenceNo: workOrder.woNo
          }
        });
      }

      // 3. Drawdown components based on the BOM
      const bom = workOrder.plan.bom;
      if (bom && bom.components) {
        for (const comp of bom.components) {
          if (isServiceItem(comp.product)) {
            continue; // Bypass service items
          }
          // Total required per recipe x completed target (factoring waste tolerances)
          const grossQtyRequiredPerUnit = comp.qtyRequired * (1 + comp.wasteMargin / 100);
          const totalDrawdownQty = grossQtyRequiredPerUnit * totalRequiredQty;

          const rawProduct = comp.product;
          const prevRawStock = rawProduct.stock;
          const newRawStock = prevRawStock - totalDrawdownQty;

          // Update raw stock
          await tx.product.update({
            where: { id: rawProduct.id },
            data: { stock: newRawStock }
          });

          // Log stock adjustment for raw drawdown
          await tx.stockAdjustment.create({
            data: {
              companyId,
              productId: rawProduct.id,
              adjustmentNo: `ADJ-RAW-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              type: 'MANUAL_SUB',
              quantity: -totalDrawdownQty,
              previousStock: prevRawStock,
              newStock: newRawStock,
              reason: `Raw Material Drawdown - BOM Finished Goods Run: ${finishedProduct.name}`,
              referenceNo: workOrder.woNo
            }
          });
        }
      }

      // 4. Update the Work Order's produced yield qty
      const updatedProduced = workOrder.qtyProduced + logQty;
      await tx.workOrder.update({
        where: { id: woId },
        data: {
          qtyProduced: updatedProduced,
          status: updatedProduced >= workOrder.qtyTarget ? 'COMPLETED' : 'IN_PROGRESS',
          routingStage: updatedProduced >= workOrder.qtyTarget ? 'Audit & QC' : workOrder.routingStage
        }
      });

      return log;
    });

    return res.status(201).json({ message: 'Output Yield lot logged and stock drawdowns updated', log: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteLog(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params;

    const log = await prisma.productionLog.findFirst({
      where: { id, companyId }
    });

    if (!log) {
      return res.status(404).json({ error: 'Yield Log not found' });
    }

    // Delete Log directly (we keep stock adjustments as ledger logs, but delete transaction is recorded)
    await prisma.productionLog.delete({
      where: { id }
    });

    return res.json({ message: 'Production log discarded successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 6. QUALITY CONTROL (QC) CRUD
// ==========================================

export async function listQcRecords(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const qcRecords = await prisma.qualityControlRecord.findMany({
      where: { companyId },
      include: {
        product: true
      },
      orderBy: { checkDate: 'desc' }
    });

    return res.json({ qcRecords });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createQcRecord(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { batchNo, productId, totalInspected, qtyPassed, inspectorName, status, remarks } = req.body;

    if (!batchNo || !productId || totalInspected === undefined || qtyPassed === undefined) {
      return res.status(400).json({ error: 'batchNo, productId, totalInspected, and qtyPassed are required' });
    }

    const failedQty = Math.max(0, parseFloat(totalInspected) - parseFloat(qtyPassed));

    const qcRecord = await prisma.$transaction(async (tx) => {
      const rec = await tx.qualityControlRecord.create({
        data: {
          companyId,
          batchNo,
          productId,
          totalInspected: parseFloat(totalInspected),
          qtyPassed: parseFloat(qtyPassed),
          qtyFailed: failedQty,
          inspectorName: inspectorName || 'Quality Auditor',
          status: status || (failedQty === 0 ? 'PASSED' : 'REWORK_REQUIRED'),
          remarks: remarks || ''
        },
        include: {
          product: true
        }
      });

      const passedVal = parseFloat(qtyPassed);
      if (passedVal > 0) {
        // Subtract passed quantity from quarantineStock and add to active physical stock
        await tx.product.update({
          where: { id: productId },
          data: {
            quarantineStock: { decrement: passedVal },
            stock: { increment: passedVal }
          }
        });

        const prod = await tx.product.findUnique({ where: { id: productId } });
        const previousStock = prod ? prod.stock - passedVal : 0.0;
        const newStock = prod ? prod.stock : 0.0;

        await tx.stockAdjustment.create({
          data: {
            companyId,
            productId,
            adjustmentNo: `ADJ-QC-PASS-${Date.now()}`,
            type: "MANUAL_ADD",
            quantity: passedVal,
            previousStock,
            newStock,
            reason: `Passed QC Inspection - Batch: ${batchNo}`,
            referenceNo: batchNo
          }
        });
      }

      if (failedQty > 0) {
        // Remove failed quantity from quarantine
        await tx.product.update({
          where: { id: productId },
          data: {
            quarantineStock: { decrement: failedQty }
          }
        });

        // Automatically trigger rework card if defectives detected
        await tx.reworkCard.create({
          data: {
            companyId,
            qcRecordId: rec.id,
            batchNo,
            productId,
            qtyToRepair: failedQty,
            reworkOperation: 'Manual sand routing & surface inspection',
            status: 'OPEN',
            notes: remarks || 'Failed stresses/weld tolerances during QC checklists.'
          }
        });
      }

      return rec;
    });

    return res.status(201).json({ message: 'Quality control record created successfully', qcRecord });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateQcRecord(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params;
    const { batchNo, totalInspected, qtyPassed, inspectorName, status, remarks } = req.body;

    const existing = await prisma.qualityControlRecord.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ error: 'QC record not found' });

    const total = totalInspected !== undefined ? parseFloat(totalInspected) : existing.totalInspected;
    const passed = qtyPassed !== undefined ? parseFloat(qtyPassed) : existing.qtyPassed;
    const failed = Math.max(0, total - passed);

    const updated = await prisma.qualityControlRecord.update({
      where: { id },
      data: {
        ...(batchNo && { batchNo }),
        totalInspected: total,
        qtyPassed: passed,
        qtyFailed: failed,
        ...(inspectorName && { inspectorName }),
        ...(status && { status }),
        ...(remarks !== undefined && { remarks })
      }
    });

    return res.json({ message: 'QC record updated successfully', qcRecord: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteQcRecord(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params;
    const rec = await prisma.qualityControlRecord.findFirst({ where: { id, companyId } });
    if (!rec) return res.status(404).json({ error: 'QC record not found' });

    await prisma.qualityControlRecord.delete({ where: { id } });

    return res.json({ message: 'QC record deleted' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 7. REWORK CARDS CRUD
// ==========================================

export async function listReworkCards(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const reworkCards = await prisma.reworkCard.findMany({
      where: { companyId },
      include: {
        product: true,
        assignedOperator: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ reworkCards });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateReworkCard(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params;
    const { status, notes, assignedOperatorId, reworkOperation } = req.body;

    const existing = await prisma.reworkCard.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ error: 'Rework Card not found' });

    const updated = await prisma.reworkCard.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(assignedOperatorId !== undefined && { assignedOperatorId: assignedOperatorId || null }),
        ...(reworkOperation && { reworkOperation })
      }
    });

    return res.json({ message: 'Rework card status modified', reworkCard: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteReworkCard(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params;
    const rec = await prisma.reworkCard.findFirst({ where: { id, companyId } });
    if (!rec) return res.status(404).json({ error: 'Rework Card not found' });

    await prisma.reworkCard.delete({ where: { id } });

    return res.json({ message: 'Rework card deleted' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 8. WORK CENTERS CRUD
// ==========================================

export async function listWorkCenters(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const workCenters = await prisma.workCenter.findMany({
      where: { companyId },
      orderBy: { name: 'asc' }
    });

    return res.json({ workCenters });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createWorkCenter(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { name, code, capacityHours, electricityKw, status } = req.body;

    if (!name || !code || capacityHours === undefined) {
      return res.status(400).json({ error: 'name, code, and capacityHours are required' });
    }

    const checkCode = await prisma.workCenter.findUnique({
      where: {
        companyId_code: {
          companyId,
          code
        }
      }
    });
    if (checkCode) {
      return res.status(409).json({ error: `Work center with code '${code}' already exists.` });
    }

    const workCenter = await prisma.workCenter.create({
      data: {
        companyId,
        name,
        code,
        capacityHours: parseFloat(capacityHours),
        electricityKw: parseFloat(electricityKw) || 0.0,
        status: status || 'OPERATIONAL',
        runtimeLogged: 0.0,
        efficiencyScore: 100.0
      }
    });

    return res.status(201).json({ message: 'Work Center registered successfully', workCenter });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateWorkCenter(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params;
    const { name, code, capacityHours, runtimeLogged, efficiencyScore, electricityKw, status } = req.body;

    const existing = await prisma.workCenter.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ error: 'Work Center not found' });

    const updated = await prisma.workCenter.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(code && { code }),
        ...(capacityHours !== undefined && { capacityHours: parseFloat(capacityHours) }),
        ...(runtimeLogged !== undefined && { runtimeLogged: parseFloat(runtimeLogged) }),
        ...(efficiencyScore !== undefined && { efficiencyScore: parseFloat(efficiencyScore) }),
        ...(electricityKw !== undefined && { electricityKw: parseFloat(electricityKw) }),
        ...(status && { status })
      }
    });

    return res.json({ message: 'Work center updated', workCenter: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteWorkCenter(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params;
    const wc = await prisma.workCenter.findFirst({ where: { id, companyId } });
    if (!wc) return res.status(404).json({ error: 'Work Center not found' });

    await prisma.workCenter.delete({ where: { id } });

    return res.json({ message: 'Work center removed successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 9. FACTORY SHIFTS CRUD
// ==========================================

export async function listShifts(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const shifts = await prisma.factoryShift.findMany({
      where: { companyId },
      include: {
        operator: true,
        workCenter: true
      },
      orderBy: { dateScheduled: 'desc' }
    });

    return res.json({ shifts });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createShift(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { operatorId, workCenterId, shiftName, shiftHours, assignedMachine, dateScheduled } = req.body;

    if (!operatorId || !workCenterId || !shiftName || !dateScheduled) {
      return res.status(400).json({ error: 'operatorId, workCenterId, shiftName, and dateScheduled are required' });
    }

    const shift = await prisma.factoryShift.create({
      data: {
        companyId,
        operatorId,
        workCenterId,
        shiftName,
        shiftHours: shiftHours || '09:00 - 17:00',
        assignedMachine: assignedMachine || 'WC Terminal A',
        dateScheduled: new Date(dateScheduled)
      },
      include: {
        operator: true,
        workCenter: true
      }
    });

    return res.status(201).json({ message: 'Shift scheduled successfully', shift });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateShift(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params;
    const { operatorId, workCenterId, shiftName, shiftHours, assignedMachine, dateScheduled } = req.body;

    const existing = await prisma.factoryShift.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ error: 'Shift Roster not found' });

    const updated = await prisma.factoryShift.update({
      where: { id },
      data: {
        ...(operatorId && { operatorId }),
        ...(workCenterId && { workCenterId }),
        ...(shiftName && { shiftName }),
        ...(shiftHours !== undefined && { shiftHours }),
        ...(assignedMachine !== undefined && { assignedMachine }),
        ...(dateScheduled && { dateScheduled: new Date(dateScheduled) })
      }
    });

    return res.json({ message: 'Shift roster updated successfully', shift: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteShift(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params;
    const rec = await prisma.factoryShift.findFirst({ where: { id, companyId } });
    if (!rec) return res.status(404).json({ error: 'Shift roster not found' });

    await prisma.factoryShift.delete({ where: { id } });

    return res.json({ message: 'Shift roster cancelled' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 10. ROUTINGS & OPERATIONS CRUD
// ==========================================

export async function listRoutings(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const routings = await prisma.routing.findMany({
      where: { companyId },
      include: {
        product: true,
        operations: {
          include: { workCenter: true },
          orderBy: { sequenceNo: 'asc' }
        }
      }
    });

    return res.json({ routings });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createRouting(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { productId, name, operations } = req.body;
    if (!productId || !name) {
      return res.status(400).json({ error: "productId and name are required" });
    }

    const existing = await prisma.routing.findFirst({
      where: { productId, companyId }
    });
    if (existing) {
      return res.status(409).json({ error: "A routing already exists for this product" });
    }

    const routing = await prisma.routing.create({
      data: {
        companyId,
        productId,
        name,
        operations: {
          create: (operations || []).map((op: any) => ({
            sequenceNo: parseInt(op.sequenceNo) || 10,
            operationName: op.operationName,
            workCenterId: op.workCenterId || null,
            setupTimeMins: parseFloat(op.setupTimeMins) || 0.0,
            runTimePerUnit: parseFloat(op.runTimePerUnit) || 0.0
          }))
        }
      },
      include: { operations: true }
    });

    return res.status(201).json({ message: "Routing created successfully", routing });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateRouting(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params;
    const { name, operations } = req.body;

    const existing = await prisma.routing.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ error: "Routing not found" });

    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.routing.update({
        where: { id },
        data: { ...(name && { name }) }
      });

      if (operations && Array.isArray(operations)) {
        await tx.routingOperation.deleteMany({ where: { routingId: id } });
        await tx.routingOperation.createMany({
          data: operations.map((op: any) => ({
            routingId: id,
            sequenceNo: parseInt(op.sequenceNo) || 10,
            operationName: op.operationName,
            workCenterId: op.workCenterId || null,
            setupTimeMins: parseFloat(op.setupTimeMins) || 0.0,
            runTimePerUnit: parseFloat(op.runTimePerUnit) || 0.0
          }))
        });
      }

      return r;
    });

    const finalRouting = await prisma.routing.findUnique({
      where: { id },
      include: { operations: true }
    });

    return res.json({ message: "Routing updated successfully", routing: finalRouting });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteRouting(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params;
    const routing = await prisma.routing.findFirst({ where: { id, companyId } });
    if (!routing) return res.status(404).json({ error: "Routing not found" });

    await prisma.routing.delete({ where: { id } });
    return res.json({ message: "Routing deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 11. MATERIAL ISSUE (GOODS ISSUE) CRUD
// ==========================================

export async function listMaterialIssues(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const issues = await prisma.materialIssue.findMany({
      where: {
        workOrder: { companyId }
      },
      include: {
        product: true,
        workOrder: true
      },
      orderBy: { issuedDate: 'desc' }
    });

    return res.json({ issues });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function issueMaterialsToWorkOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { woId, productId, quantity } = req.body;
    if (!woId || !productId || !quantity) {
      return res.status(400).json({ error: "woId, productId, and quantity are required" });
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: "Quantity must be greater than zero" });
    }

    const wo = await prisma.workOrder.findFirst({ where: { id: woId, companyId } });
    if (!wo) return res.status(404).json({ error: "Work Order not found" });

    const prod = await prisma.product.findFirst({ where: { id: productId, companyId }, include: { category: true } });
    if (!prod) return res.status(404).json({ error: "Product not found" });

    const isServ = isServiceItem(prod);
    if (!isServ && prod.stock < qty) {
      return res.status(400).json({ error: `Insufficient stock. Available: ${prod.stock}` });
    }

    const issue = await prisma.$transaction(async (tx) => {
      // 1. Decrement raw product stock
      if (!isServ) {
        await tx.product.update({
          where: { id: productId },
          data: { stock: { decrement: qty } }
        });

        // 2. Log stock adjustment
        await tx.stockAdjustment.create({
          data: {
            companyId,
            productId,
            adjustmentNo: `ADJ-RAW-ISSUE-${Date.now()}`,
            type: 'MANUAL_SUB',
            quantity: -qty,
            previousStock: prod.stock,
            newStock: prod.stock - qty,
            reason: `Material issue to Work Order ${wo.woNo}`,
            referenceNo: wo.woNo
          }
        });
      }

      // 3. Create MaterialIssue
      const mi = await tx.materialIssue.create({
        data: {
          companyId,
          woId,
          productId,
          quantity: qty,
          issuedDate: new Date()
        }
      });

      return mi;
    });

    return res.status(201).json({ message: "Materials issued successfully", issue });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 12. ACTUAL VS STANDARD COSTING ENGINE
// ==========================================

export async function getWorkOrderActualCosting(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params; // Work Order ID

    const wo = await prisma.workOrder.findFirst({
      where: { id, companyId },
      include: {
        plan: {
          include: {
            finishedProduct: true,
            bom: {
              include: {
                components: { include: { product: true } }
              }
            }
          }
        },
        materialIssues: { include: { product: true } },
        jobCards: true
      }
    });

    if (!wo) return res.status(404).json({ error: "Work Order not found" });

    const bom = wo.plan.bom;
    const qtyTarget = wo.qtyTarget;

    // 1. Calculate Standard Cost from BOM recipe
    let standardMaterialCost = 0;
    if (bom && bom.components) {
      for (const comp of bom.components) {
        const grossQty = comp.qtyRequired * (1 + comp.wasteMargin / 100);
        standardMaterialCost += grossQty * comp.product.pricing * qtyTarget;
      }
    }
    const standardLaborCost = bom ? (bom.laborHours * bom.laborRate * qtyTarget) : 0;
    const standardOverheadCost = bom ? (bom.overheadAllocation * qtyTarget) : 0;
    const standardTotalCost = standardMaterialCost + standardLaborCost + standardOverheadCost;

    // 2. Calculate Actual Cost from Issued Materials, Job Cards cycle times
    let actualMaterialCost = 0;
    for (const issue of wo.materialIssues) {
      actualMaterialCost += issue.quantity * issue.product.pricing;
    }

    let actualLaborCost = 0;
    let actualOverheadCost = 0;
    const laborRate = bom ? bom.laborRate : 15.0; // default operator rate
    const overheadRate = bom ? bom.overheadAllocation : 10.0; // default work center rate

    for (const card of wo.jobCards) {
      const hours = card.cycleTimeMinutes / 60.0;
      actualLaborCost += hours * laborRate;
      actualOverheadCost += hours * overheadRate;
    }
    const actualTotalCost = actualMaterialCost + actualLaborCost + actualOverheadCost;

    // 3. Compute Variances
    const materialVariance = actualMaterialCost - standardMaterialCost;
    const laborVariance = actualLaborCost - standardLaborCost;
    const overheadVariance = actualOverheadCost - standardOverheadCost;
    const totalVariance = actualTotalCost - standardTotalCost;

    return res.json({
      workOrderNo: wo.woNo,
      qtyTarget,
      qtyProduced: wo.qtyProduced,
      costing: {
        standard: {
          materialCost: Math.round(standardMaterialCost * 100) / 100,
          laborCost: Math.round(standardLaborCost * 100) / 100,
          overheadCost: Math.round(standardOverheadCost * 100) / 100,
          totalCost: Math.round(standardTotalCost * 100) / 100
        },
        actual: {
          materialCost: Math.round(actualMaterialCost * 100) / 100,
          laborCost: Math.round(actualLaborCost * 100) / 100,
          overheadCost: Math.round(actualOverheadCost * 100) / 100,
          totalCost: Math.round(actualTotalCost * 100) / 100
        },
        variance: {
          material: Math.round(materialVariance * 100) / 100,
          labor: Math.round(laborVariance * 100) / 100,
          overhead: Math.round(overheadVariance * 100) / 100,
          total: Math.round(totalVariance * 100) / 100
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
