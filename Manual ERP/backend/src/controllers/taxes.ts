import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../services/db';
import { logAudit } from '../utils/audit';

export async function listTaxes(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const taxes = await prisma.tax.findMany({
      where: { companyId },
      orderBy: { rate: 'asc' }
    });

    return res.json({ taxes });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createTax(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { name, rate, type, isDefault } = req.body;

    if (!name || rate === undefined || !type) {
      return res.status(400).json({ error: "Name, rate, and type are required fields." });
    }

    const parsedRate = parseFloat(rate);
    if (isNaN(parsedRate) || parsedRate < 0) {
      return res.status(400).json({ error: "Rate must be a non-negative number." });
    }

    // Check unique tax name in company
    const existing = await prisma.tax.findFirst({
      where: { companyId, name }
    });
    if (existing) {
      return res.status(409).json({ error: `Tax code '${name}' already exists.` });
    }

    // If setting as default, clear existing defaults first
    if (isDefault) {
      await prisma.tax.updateMany({
        where: { companyId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const tax = await prisma.tax.create({
      data: {
        companyId,
        name,
        rate: parsedRate,
        type,
        isDefault: !!isDefault
      }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'tax_master',
      'CREATE',
      null,
      { id: tax.id, name: tax.name, rate: tax.rate },
      req.ip,
      req.headers['user-agent']
    );

    return res.status(201).json({ message: "Tax created successfully", tax });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateTax(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const { name, rate, type, isDefault } = req.body;

    const taxToUpdate = await prisma.tax.findFirst({
      where: { id, companyId }
    });
    if (!taxToUpdate) {
      return res.status(404).json({ error: "Tax configuration not found." });
    }

    if (name && name !== taxToUpdate.name) {
      const exist = await prisma.tax.findFirst({
        where: { companyId, name }
      });
      if (exist) return res.status(409).json({ error: `Tax code '${name}' already registered.` });
    }

    // If changing to default, clear existing defaults
    if (isDefault && !taxToUpdate.isDefault) {
      await prisma.tax.updateMany({
        where: { companyId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const updated = await prisma.tax.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(rate !== undefined && { rate: parseFloat(rate) || 0.0 }),
        ...(type && { type }),
        ...(isDefault !== undefined && { isDefault: !!isDefault })
      }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'tax_master',
      'UPDATE',
      taxToUpdate,
      updated,
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: "Tax configuration updated", tax: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteTax(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;

    const tax = await prisma.tax.findFirst({
      where: { id, companyId }
    });
    if (!tax) return res.status(404).json({ error: "Tax configuration not found." });

    await prisma.tax.delete({
      where: { id }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'tax_master',
      'DELETE',
      { id: tax.id, name: tax.name },
      null,
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: `Tax scheme '${tax.name}' permanently deleted.` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
