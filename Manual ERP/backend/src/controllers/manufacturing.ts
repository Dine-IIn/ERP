import { CreateBomBodySchema, CreateWorkCenterBodySchema, CreatePlanBodySchema, CompleteJobCardBodySchema, UpdateBomBodySchema, UpdateWorkCenterBodySchema, CreateJobCardBodySchema, CreateLogBodySchema, UpdateWorkOrderBodySchema, UpdateJobCardBodySchema, CreateShiftBodySchema, UpdateRoutingBodySchema, UpdatePlanBodySchema, UpdateReworkCardBodySchema, CreateWorkOrderBodySchema, UpdateShiftBodySchema, CreateQcRecordBodySchema, UpdateQcRecordBodySchema, IssueMaterialsToWorkOrderBodySchema, CreateRoutingBodySchema } from '../types/index';
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

  const bom = await prisma.billOfMaterials.findFirst({ where: { id: bomId, companyId },
    include: { components: true }
  });
  if (!bom) return [];

  const exploded: ExplodedComponent[] = [];
  for (const comp of bom.components) {
    const totalQty = comp.qtyRequired * qty;
    const subBom = comp.subBomId
      ? await prisma.billOfMaterials.findFirst({
          where: { id: comp.subBomId, companyId }
        })
      : await prisma.billOfMaterials.findFirst({
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
            product: true,
            subBom: true
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

    const parsedBody = CreateBomBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Invalid input", details: parsedBody.error.issues });
    const { name, description, finishedProductId, version, laborHours, laborRate, overheadAllocation, components } = parsedBody.data;

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
        name: name || null,
        description: description || null,
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
            wasteMargin: parseFloat(c.wasteMargin) || 0.0,
            subBomId: c.subBomId || null,
            operationSeqNo: c.operationSeqNo !== undefined ? parseInt(c.operationSeqNo) : null
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
    const parsedBody = UpdateBomBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Invalid input", details: parsedBody.error.issues });
    const { name, description, version, laborHours, laborRate, overheadAllocation, status, components } = parsedBody.data;

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
        ...(name !== undefined && { name: name || null }),
        ...(description !== undefined && { description: description || null }),
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
            wasteMargin: parseFloat(c.wasteMargin) || 0.0,
            subBomId: c.subBomId || null,
            operationSeqNo: c.operationSeqNo !== undefined ? parseInt(c.operationSeqNo) : null
          }
        });
      }
    }

    const finalBom = await prisma.billOfMaterials.findFirst({ where: { id, companyId },
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

    const parsedBody = CreatePlanBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Invalid input", details: parsedBody.error.issues });
    const { salesOrderId, finishedProductId, qtyToProduce, startDate, endDate, bomId } = parsedBody.data;

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
    const parsedBody = UpdatePlanBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Invalid input", details: parsedBody.error.issues });
    const { salesOrderId, finishedProductId, qtyToProduce, startDate, endDate, status, bomId } = parsedBody.data;

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
        },
        jobCards: {
          include: {
            vendor: true,
            workCenter: true,
            assignedOperator: true,
            subcontractPos: true
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

    const parsedBody = CreateWorkOrderBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Invalid input", details: parsedBody.error.issues });
    const { woNo, planId, qtyTarget, priority, routingStage } = parsedBody.data;

    if (!woNo || !planId || !qtyTarget) {
      return res.status(400).json({ error: 'woNo, planId, and qtyTarget are required' });
    }

    const checkWoNo = await prisma.workOrder.findUnique({
      where: { woNo }
    });
    if (checkWoNo) {
      return res.status(409).json({ error: `Work Order number '${woNo}' is already taken.` });
    }

    // Check if an active Work Order already exists for this Production Plan
    const existingPlanWO = await prisma.workOrder.findFirst({
      where: { planId, companyId, status: { notIn: ['CANCELLED', 'COMPLETED'] } }
    });
    if (existingPlanWO) {
      return res.status(409).json({ error: `An active Work Order (${existingPlanWO.woNo}) already exists for this Production Plan. Complete or cancel it before dispatching a new one.` });
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
          // Verify workCenterId still exists before inserting
          let verifiedWcId: string | null = null;
          if (op.workCenterId) {
            const wcExists = await tx.workCenter.findFirst({ where: { id: op.workCenterId, companyId } });
            verifiedWcId = wcExists ? wcExists.id : null;
          }
          await tx.jobCard.create({
            data: {
              companyId,
              woId: wo.id,
              operationName: op.operationName,
              workCenterId: verifiedWcId,
              qtyTarget: parseFloat(qtyTarget),
              status: 'PENDING',
              cycleTimeMinutes: op.setupTimeMins + (op.runTimePerUnit * parseFloat(qtyTarget)),
              operationType: op.operationType || 'IN_HOUSE',
              vendorId: op.vendorId || null,
              outsourceCost: op.outsourceCost || 0.0
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
                let verifiedSubWcId: string | null = null;
                if (op.workCenterId) {
                  const wcExists = await tx.workCenter.findFirst({ where: { id: op.workCenterId, companyId } });
                  verifiedSubWcId = wcExists ? wcExists.id : null;
                }
                await tx.jobCard.create({
                  data: {
                    companyId,
                    woId: subWo.id,
                    operationName: op.operationName,
                    workCenterId: verifiedSubWcId,
                    qtyTarget: comp.qtyRequired,
                    status: 'PENDING',
                    cycleTimeMinutes: op.setupTimeMins + (op.runTimePerUnit * comp.qtyRequired),
                    operationType: op.operationType || 'IN_HOUSE',
                    vendorId: op.vendorId || null,
                    outsourceCost: op.outsourceCost || 0.0
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
    console.error('[releaseWorkOrder Error]:', error);
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Database integrity error: A routing step references a Work Center or resource that no longer exists. Please update the routing configuration.' });
    }
    return res.status(500).json({ error: error.message || 'Failed to release work order.' });
  }
}

export async function updateWorkOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params;
    const parsedBody = UpdateWorkOrderBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Invalid input", details: parsedBody.error.issues });
    const { woNo, qtyTarget, qtyProduced, priority, routingStage, status } = parsedBody.data;

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
        assignedOperator: true,
        workCenter: true,
        vendor: true,
        subcontractPos: true
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

    const parsedBody = CreateJobCardBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Invalid input", details: parsedBody.error.issues });
    const { woId, operationName, workCenterId, assignedOperatorId, cycleTimeMinutes, qtyTarget, operationType, vendorId, outsourceCost } = parsedBody.data;

    if (!woId || !operationName || !qtyTarget) {
      return res.status(400).json({ error: 'woId, operationName, and qtyTarget are required' });
    }

    // === RESOLVE woId: accept UUID or woNo string ===
    const targetWorkOrder = await prisma.workOrder.findFirst({
      where: {
        companyId,
        OR: [
          { id: woId },
          { woNo: woId }
        ]
      }
    });
    if (!targetWorkOrder) {
      return res.status(404).json({ error: `Work Order '${woId}' was not found. Please select or release a valid Work Order first.` });
    }
    const resolvedWoId = targetWorkOrder.id;

    // === RESOLVE workCenterId: accept UUID, name, or code ===
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
          // Auto-create a new WorkCenter from the typed name
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

    // === RESOLVE assignedOperatorId: validate against users table ===
    let resolvedOperatorId: string | null = null;
    if (assignedOperatorId) {
      const user = await prisma.user.findFirst({
        where: { id: assignedOperatorId, companyId }
      });
      resolvedOperatorId = user ? user.id : null;
    }

    // === Final defensive check: verify resolvedWorkCenterId exists ===
    if (resolvedWorkCenterId) {
      const wcVerify = await prisma.workCenter.findFirst({ where: { id: resolvedWorkCenterId } });
      if (!wcVerify) {
        console.error(`[createJobCard] resolvedWorkCenterId '${resolvedWorkCenterId}' does not exist — setting to null`);
        resolvedWorkCenterId = null;
      }
    }

    const jobCard = await prisma.jobCard.create({
      data: {
        companyId,
        woId: resolvedWoId,
        operationName,
        workCenterId: resolvedWorkCenterId,
        assignedOperatorId: resolvedOperatorId,
        status: 'PENDING',
        cycleTimeMinutes: parseFloat(cycleTimeMinutes) || 0.0,
        qtyTarget: parseFloat(qtyTarget) || 0.0,
        qtyAccepted: 0.0,
        qtyScrapped: 0.0,
        operationType: operationType || 'IN_HOUSE',
        vendorId: vendorId || null,
        outsourceCost: parseFloat(outsourceCost) || 0.0
      }
    });

    return res.status(201).json({ message: 'Job Card rostered', jobCard });
  } catch (error: any) {
    console.error('[createJobCard Error]:', error);
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Foreign key error: One of the selected references (Work Order, Work Center, or Operator) does not exist. Please refresh and try again.' });
    }
    return res.status(500).json({ error: error.message || 'Failed to create job card.' });
  }
}

export async function updateJobCard(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params;
    const parsedBody = UpdateJobCardBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Invalid input", details: parsedBody.error.issues });
    const { operationName, workCenterId, assignedOperatorId, status, cycleTimeMinutes, qtyTarget, qtyAccepted, qtyScrapped, operationType, vendorId, outsourceCost } = parsedBody.data;

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

    // Resolve assignedOperatorId safely
    let resolvedOperatorId: string | null | undefined = undefined;
    if (assignedOperatorId !== undefined) {
      if (!assignedOperatorId) {
        resolvedOperatorId = null;
      } else {
        const user = await prisma.user.findFirst({ where: { id: assignedOperatorId, companyId } });
        resolvedOperatorId = user ? user.id : null;
      }
    }

    // Final defensive check on resolvedWorkCenterId
    if (resolvedWorkCenterId) {
      const wcVerify = await prisma.workCenter.findFirst({ where: { id: resolvedWorkCenterId } });
      if (!wcVerify) {
        console.error(`[updateJobCard] resolvedWorkCenterId '${resolvedWorkCenterId}' does not exist — setting to null`);
        resolvedWorkCenterId = null;
      }
    }

    const updated = await prisma.jobCard.update({
      where: { id },
      data: {
        ...(operationName && { operationName }),
        ...(resolvedWorkCenterId !== undefined && { workCenterId: resolvedWorkCenterId }),
        ...(resolvedOperatorId !== undefined && { assignedOperatorId: resolvedOperatorId }),
        ...(status && { status }),
        ...(cycleTimeMinutes !== undefined && { cycleTimeMinutes: parseFloat(cycleTimeMinutes) || 0.0 }),
        ...(qtyTarget !== undefined && { qtyTarget: parseFloat(qtyTarget) || 0.0 }),
        ...(qtyAccepted !== undefined && { qtyAccepted: parseFloat(qtyAccepted) || 0.0 }),
        ...(qtyScrapped !== undefined && { qtyScrapped: parseFloat(qtyScrapped) || 0.0 }),
        ...(operationType && { operationType }),
        ...(vendorId !== undefined && { vendorId: vendorId || null }),
        ...(outsourceCost !== undefined && { outsourceCost: parseFloat(outsourceCost) || 0.0 })
      }
    });

    return res.json({ message: 'Job Card updated successfully', jobCard: updated });
  } catch (error: any) {
    console.error('[updateJobCard Error]:', error);
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Foreign key error: One of the selected references (Work Center or Operator) does not exist.' });
    }
    return res.status(500).json({ error: error.message || 'Failed to update job card.' });
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
    const parsedBody = CompleteJobCardBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Invalid input", details: parsedBody.error.issues });
    const { qtyAccepted, qtyScrapped } = parsedBody.data;

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

    const parsedBody = CreateLogBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Invalid input", details: parsedBody.error.issues });
    const { woId, qtyCompleted, qtyScrapped, operatorName } = parsedBody.data;

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

    const parsedBody = CreateQcRecordBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Invalid input", details: parsedBody.error.issues });
    const { batchNo, productId, totalInspected, qtyPassed, inspectorName, status, remarks } = parsedBody.data;

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

        const prod = await tx.product.findFirst({ where: { id: productId, companyId } });
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
    const parsedBody = UpdateQcRecordBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Invalid input", details: parsedBody.error.issues });
    const { batchNo, totalInspected, qtyPassed, inspectorName, status, remarks } = parsedBody.data;

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
    const parsedBody = UpdateReworkCardBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Invalid input", details: parsedBody.error.issues });
    const { status, notes, assignedOperatorId, reworkOperation } = parsedBody.data;

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

    const parsedBody = CreateWorkCenterBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Invalid input", details: parsedBody.error.issues });
    const { name, code, capacityHours, electricityKw, status } = parsedBody.data;

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
    const parsedBody = UpdateWorkCenterBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Invalid input", details: parsedBody.error.issues });
    const { name, code, capacityHours, runtimeLogged, efficiencyScore, electricityKw, status } = parsedBody.data;

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

    const parsedBody = CreateShiftBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Invalid input", details: parsedBody.error.issues });
    const { operatorId, workCenterId, shiftName, shiftHours, assignedMachine, dateScheduled } = parsedBody.data;

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
    const parsedBody = UpdateShiftBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Invalid input", details: parsedBody.error.issues });
    const { operatorId, workCenterId, shiftName, shiftHours, assignedMachine, dateScheduled } = parsedBody.data;

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
          include: { workCenter: true, vendor: true },
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

    const parsedBody = CreateRoutingBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Invalid input", details: parsedBody.error.issues });
    const { productId, name, operations } = parsedBody.data;
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
            runTimePerUnit: parseFloat(op.runTimePerUnit) || 0.0,
            operationType: op.operationType || 'IN_HOUSE',
            vendorId: op.vendorId || null,
            outsourceCost: parseFloat(op.outsourceCost) || 0.0,
            leadTimeDays: parseInt(op.leadTimeDays) || 0
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
    const parsedBody = UpdateRoutingBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Invalid input", details: parsedBody.error.issues });
    const { name, operations } = parsedBody.data;

    const existing = await prisma.routing.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ error: "Routing not found" });

    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.routing.update({
        where: { id },
        data: { ...(name && { name }) }
      });

      if (operations && Array.isArray(operations)) {
        await tx.routingOperation.deleteMany({ where: { routingId: id } });
        for (const op of operations) {
          await tx.routingOperation.create({
            data: {
              routingId: id,
              sequenceNo: parseInt(op.sequenceNo) || 10,
              operationName: op.operationName,
              workCenterId: op.workCenterId || null,
              setupTimeMins: parseFloat(op.setupTimeMins) || 0.0,
              runTimePerUnit: parseFloat(op.runTimePerUnit) || 0.0,
              operationType: op.operationType || 'IN_HOUSE',
              vendorId: op.vendorId || null,
              outsourceCost: parseFloat(op.outsourceCost) || 0.0,
              leadTimeDays: parseInt(op.leadTimeDays) || 0
            }
          });
        }
      }

      return r;
    });

    const finalRouting = await prisma.routing.findFirst({ where: { id, companyId },
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

    const parsedBody = IssueMaterialsToWorkOrderBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Invalid input", details: parsedBody.error.issues });
    const { woId, productId, quantity } = parsedBody.data;
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

    // 1. Calculate Standard Cost from BOM recipe & Job Card outsourced configurations
    let standardMaterialCost = 0;
    if (bom && bom.components) {
      for (const comp of bom.components) {
        const grossQty = comp.qtyRequired * (1 + comp.wasteMargin / 100);
        standardMaterialCost += grossQty * comp.product.pricing * qtyTarget;
      }
    }
    let standardOutsourceCost = 0;
    for (const card of wo.jobCards) {
      if (card.operationType === 'OUTSOURCED') {
        standardOutsourceCost += card.qtyTarget * card.outsourceCost;
      }
    }
    const standardLaborCost = bom ? (bom.laborHours * bom.laborRate * qtyTarget) : 0;
    const standardOverheadCost = bom ? (bom.overheadAllocation * qtyTarget) : 0;
    const standardTotalCost = standardMaterialCost + standardLaborCost + standardOverheadCost + standardOutsourceCost;

    // 2. Calculate Actual Cost from Issued Materials, Job Cards cycle times, and subcontract POs
    let actualMaterialCost = 0;
    for (const issue of wo.materialIssues) {
      actualMaterialCost += issue.quantity * issue.product.pricing;
    }

    let actualLaborCost = 0;
    let actualOverheadCost = 0;
    let actualOutsourceCost = 0;
    const laborRate = bom ? bom.laborRate : 15.0; // default operator rate
    const overheadRate = bom ? bom.overheadAllocation : 10.0; // default work center rate

    for (const card of wo.jobCards) {
      if (card.operationType === 'OUTSOURCED') {
        const linkedPos = await prisma.purchaseOrder.findMany({
          where: { jobCardId: card.id, companyId }
        });
        for (const po of linkedPos) {
          if (po.status === 'COMPLETED' || po.status === 'APPROVED' || po.status === 'SHIPPED') {
            actualOutsourceCost += po.total;
          }
        }
      } else {
        const hours = card.cycleTimeMinutes / 60.0;
        actualLaborCost += hours * laborRate;
        actualOverheadCost += hours * overheadRate;
      }
    }
    const actualTotalCost = actualMaterialCost + actualLaborCost + actualOverheadCost + actualOutsourceCost;

    // 3. Compute Variances
    const materialVariance = actualMaterialCost - standardMaterialCost;
    const laborVariance = actualLaborCost - standardLaborCost;
    const overheadVariance = actualOverheadCost - standardOverheadCost;
    const outsourceVariance = actualOutsourceCost - standardOutsourceCost;
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
          outsourceCost: Math.round(standardOutsourceCost * 100) / 100,
          totalCost: Math.round(standardTotalCost * 100) / 100
        },
        actual: {
          materialCost: Math.round(actualMaterialCost * 100) / 100,
          laborCost: Math.round(actualLaborCost * 100) / 100,
          overheadCost: Math.round(actualOverheadCost * 100) / 100,
          outsourceCost: Math.round(actualOutsourceCost * 100) / 100,
          totalCost: Math.round(actualTotalCost * 100) / 100
        },
        variance: {
          material: Math.round(materialVariance * 100) / 100,
          labor: Math.round(laborVariance * 100) / 100,
          overhead: Math.round(overheadVariance * 100) / 100,
          outsource: Math.round(outsourceVariance * 100) / 100,
          total: Math.round(totalVariance * 100) / 100
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createSubcontractPO(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params; // jobCardId

    const jobCard = await prisma.jobCard.findFirst({
      where: { id, companyId },
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
      }
    });

    if (!jobCard) {
      return res.status(404).json({ error: "Job Card not found" });
    }

    if (jobCard.operationType !== 'OUTSOURCED') {
      return res.status(400).json({ error: "Job Card is not an outsourced operation" });
    }

    if (!jobCard.vendorId) {
      return res.status(400).json({ error: "Job Card does not have an assigned vendor/subcontractor" });
    }

    // Check if PO already exists for this jobCardId
    const existingPo = await prisma.purchaseOrder.findFirst({
      where: { jobCardId: jobCard.id, companyId }
    });

    if (existingPo) {
      return res.status(409).json({ error: `A subcontract PO (${existingPo.poNo}) has already been created for this Job Card.` });
    }

    const vendor = await prisma.vendor.findFirst({ where: { id: jobCard.vendorId, companyId } });

    if (!vendor) {
      return res.status(404).json({ error: "Assigned vendor not found" });
    }

    // Count existing POs to generate sequential number
    const count = await prisma.purchaseOrder.count({ where: { companyId } });
    const poNo = `PO-SUB-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;

    const totalCost = jobCard.qtyTarget * jobCard.outsourceCost;

    const po = await prisma.purchaseOrder.create({
      data: {
        companyId,
        vendorId: jobCard.vendorId,
        poNo,
        date: new Date(),
        deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Default lead time of 3 days
        subtotal: totalCost,
        discount: 0,
        tax: 0,
        total: totalCost,
        status: "APPROVED", // Auto-approved for subcontract POs to speed up flow
        isSubcontract: true,
        jobCardId: jobCard.id,
        workOrderId: jobCard.woId,
        items: {
          create: [
            {
              productId: jobCard.workOrder.plan.finishedProductId,
              quantity: jobCard.qtyTarget,
              price: jobCard.outsourceCost,
              discount: 0
            }
          ]
        }
      },
      include: {
        items: true
      }
    });

    // Update the Job Card to RUNNING
    await prisma.jobCard.update({
      where: { id },
      data: {
        status: "RUNNING",
        startTime: new Date()
      }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'purchase_order',
      'CREATE',
      null,
      { id: po.id, poNo: po.poNo, type: 'SUBCONTRACT' },
      req.ip,
      req.headers['user-agent']
    );

    return res.status(201).json({ message: "Subcontract Purchase Order created successfully", purchaseOrder: po });
  } catch (error: any) {
    console.error("[createSubcontractPO Error]:", error);
    return res.status(500).json({ error: error.message || "Failed to create subcontract Purchase Order" });
  }
}
