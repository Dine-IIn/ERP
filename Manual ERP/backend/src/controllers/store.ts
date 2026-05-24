import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth';

const prisma = new PrismaClient();

// List documents inside a collection
export async function listStoreDocs(req: AuthenticatedRequest, res: Response) {
  const { collection } = req.params;
  const companyId = req.user?.companyId;
  if (!companyId) {
    return res.status(400).json({ error: 'Company identification not found' });
  }

  try {
    const docs = await prisma.systemDocumentStore.findMany({
      where: { companyId, collection },
      orderBy: { createdAt: 'asc' }
    });
    const parsed = docs.map(d => ({
      dbId: d.id,
      ...JSON.parse(d.data)
    }));
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// Create a new document in a collection
export async function createStoreDoc(req: AuthenticatedRequest, res: Response) {
  const { collection } = req.params;
  const companyId = req.user?.companyId;
  if (!companyId) {
    return res.status(400).json({ error: 'Company identification not found' });
  }

  try {
    const doc = await prisma.systemDocumentStore.create({
      data: {
        companyId,
        collection,
        data: JSON.stringify(req.body)
      }
    });
    res.json({
      dbId: doc.id,
      ...JSON.parse(doc.data)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// Bulk create documents (initial seed of mock data)
export async function bulkCreateStoreDocs(req: AuthenticatedRequest, res: Response) {
  const { collection } = req.params;
  const companyId = req.user?.companyId;
  if (!companyId) {
    return res.status(400).json({ error: 'Company identification not found' });
  }

  const items = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Payload must be a JSON array' });
  }

  try {
    // Delete existing documents in this collection for the company first to prevent duplicate seed loops
    await prisma.systemDocumentStore.deleteMany({
      where: { companyId, collection }
    });

    const creations = await Promise.all(
      items.map(item =>
        prisma.systemDocumentStore.create({
          data: {
            companyId,
            collection,
            data: JSON.stringify(item)
          }
        })
      )
    );

    const parsed = creations.map(d => ({
      dbId: d.id,
      ...JSON.parse(d.data)
    }));
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// Update a document
export async function updateStoreDoc(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const companyId = req.user?.companyId;
  if (!companyId) {
    return res.status(400).json({ error: 'Company identification not found' });
  }

  try {
    const existing = await prisma.systemDocumentStore.findFirst({
      where: { id, companyId }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Merge previous data with new payload keys
    const prevData = JSON.parse(existing.data);
    const merged = { ...prevData, ...req.body };

    const doc = await prisma.systemDocumentStore.update({
      where: { id },
      data: {
        data: JSON.stringify(merged)
      }
    });

    res.json({
      dbId: doc.id,
      ...JSON.parse(doc.data)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// Delete a document
export async function deleteStoreDoc(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const companyId = req.user?.companyId;
  if (!companyId) {
    return res.status(400).json({ error: 'Company identification not found' });
  }

  try {
    const existing = await prisma.systemDocumentStore.findFirst({
      where: { id, companyId }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Document not found' });
    }

    await prisma.systemDocumentStore.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Document deleted from database store' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
