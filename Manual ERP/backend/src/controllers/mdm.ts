import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../services/db';
import { logAudit } from '../utils/audit';

const router = Router();

// Cache object for master dropdown lists (10 seconds expiry)
const dropdownCache: Record<string, { data: any[]; expiry: number }> = {};
const CACHE_DURATION_MS = 10000;

const MASTER_MAP: Record<string, {
  model: any;
  codeField: string;
  nameField: string;
  moduleName: string;
  label: string;
}> = {
  product: {
    model: prisma.productMaster,
    codeField: 'productCode',
    nameField: 'productName',
    moduleName: 'product_master',
    label: 'Product Master'
  },
  customer: {
    model: prisma.customerMaster,
    codeField: 'customerCode',
    nameField: 'customerName',
    moduleName: 'customer_master',
    label: 'Customer Master'
  },
  vendor: {
    model: prisma.vendorMaster,
    codeField: 'vendorCode',
    nameField: 'vendorName',
    moduleName: 'vendor_master',
    label: 'Vendor Master'
  },
  employee: {
    model: prisma.employeeMaster,
    codeField: 'employeeCode',
    nameField: 'employeeName',
    moduleName: 'employee_master',
    label: 'Employee Master'
  },
  warehouse: {
    model: prisma.warehouseMaster,
    codeField: 'warehouseCode',
    nameField: 'warehouseName',
    moduleName: 'warehouse_master',
    label: 'Warehouse Master'
  },
  tax: {
    model: prisma.taxMaster,
    codeField: 'taxCode',
    nameField: 'taxName',
    moduleName: 'tax_master',
    label: 'Tax Master'
  },
  unit: {
    model: prisma.unitMaster,
    codeField: 'unitCode',
    nameField: 'unitName',
    moduleName: 'unit_master',
    label: 'Unit Master'
  },
  category: {
    model: prisma.categoryMaster,
    codeField: 'categoryCode',
    nameField: 'categoryName',
    moduleName: 'category_master',
    label: 'Category Master'
  },
  brand: {
    model: prisma.brandMaster,
    codeField: 'brandCode',
    nameField: 'brandName',
    moduleName: 'brand_master',
    label: 'Brand Master'
  },
  account: {
    model: prisma.chartOfAccounts,
    codeField: 'accountCode',
    nameField: 'accountName',
    moduleName: 'chart_of_accounts',
    label: 'Chart of Accounts'
  }
};

// Helper: Invalidate dropdown cache for a specific master type and company
function invalidateCache(masterType: string, companyId: string) {
  const cacheKey = `${masterType}:${companyId}`;
  delete dropdownCache[cacheKey];
}

// ==========================================
// 1. REUSABLE MASTER DROPDOWN API WITH CACHING
// ==========================================
router.get('/dropdown/:masterType', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { masterType } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized: Missing Company context' });
    }

    const config = MASTER_MAP[masterType.toLowerCase()];
    if (!config) {
      return res.status(400).json({ error: `Invalid master data type: ${masterType}` });
    }

    const cacheKey = `${masterType.toLowerCase()}:${companyId}`;
    const now = Date.now();
    if (dropdownCache[cacheKey] && dropdownCache[cacheKey].expiry > now) {
      return res.json({ records: dropdownCache[cacheKey].data });
    }

    const records = await config.model.findMany({
      where: {
        companyId,
        isDeleted: false,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        [config.codeField]: true,
        [config.nameField]: true
      },
      orderBy: {
        [config.codeField]: 'asc'
      }
    });

    const formatted = records.map((r: any) => ({
      id: r.id,
      code: r[config.codeField],
      name: r[config.nameField]
    }));

    // Cache the dropdown records
    dropdownCache[cacheKey] = {
      data: formatted,
      expiry: now + CACHE_DURATION_MS
    };

    return res.json({ records: formatted });
  } catch (error: any) {
    console.error('❌ Dropdown fetch failed:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. EXPORT MASTER DATA (CSV FORMAT)
// ==========================================
router.get('/:masterType/export', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { masterType } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const config = MASTER_MAP[masterType.toLowerCase()];
    if (!config) {
      return res.status(400).json({ error: `Invalid master data type: ${masterType}` });
    }

    const records = await config.model.findMany({
      where: {
        companyId,
        isDeleted: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (records.length === 0) {
      // Return empty file headers
      return res.send('');
    }

    // Dynamic CSV generation
    const headers = Object.keys(records[0]).filter(key => key !== 'id' && key !== 'companyId' && key !== 'isDeleted');
    const csvRows = [headers.join(',')];

    for (const record of records) {
      const values = headers.map(header => {
        const val = record[header];
        if (val === null || val === undefined) return '';
        if (val instanceof Date) return val.toISOString();
        if (typeof val === 'string') {
          // Escape quotes
          return `"${val.replace(/"/g, '""')}"`;
        }
        return String(val);
      });
      csvRows.push(values.join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${masterType}_export.csv`);
    return res.send(csvRows.join('\n'));
  } catch (error: any) {
    console.error('❌ Export failed:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. IMPORT MASTER DATA (CSV/EXCEL PARSED ARRAY)
// ==========================================
router.post('/:masterType/import', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { masterType } = req.params;
    const companyId = req.user?.companyId;
    const records = req.body.records; // JSON array representing CSV data

    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty records list' });
    }

    const config = MASTER_MAP[masterType.toLowerCase()];
    if (!config) {
      return res.status(400).json({ error: `Invalid master data type: ${masterType}` });
    }

    const createdCount = { count: 0 };
    const duplicateCodes: string[] = [];

    // Run imports sequentially using config.model directly (avoids $transaction delegate key issues)
    for (const item of records) {
      const codeValue = String(item[config.codeField] || '').trim();
      const nameValue = String(item[config.nameField] || '').trim();

      if (!codeValue || !nameValue) continue;

      // Duplicate prevention check
      const existing = await config.model.findFirst({
        where: {
          companyId,
          [config.codeField]: codeValue,
          isDeleted: false
        }
      });

      if (existing) {
        duplicateCodes.push(codeValue);
        continue;
      }

      // Prepare data payload stripping unnecessary relations and injecting companyId
      const dataPayload: any = { ...item, companyId, isDeleted: false };
      delete dataPayload.id;
      delete dataPayload.createdAt;
      delete dataPayload.updatedAt;

      // Parse numbers if applicable
      if (dataPayload.costPrice !== undefined) dataPayload.costPrice = parseFloat(dataPayload.costPrice) || 0;
      if (dataPayload.sellingPrice !== undefined) dataPayload.sellingPrice = parseFloat(dataPayload.sellingPrice) || 0;
      if (dataPayload.creditLimit !== undefined) dataPayload.creditLimit = parseFloat(dataPayload.creditLimit) || 0;
      if (dataPayload.outstandingAmount !== undefined) dataPayload.outstandingAmount = parseFloat(dataPayload.outstandingAmount) || 0;
      if (dataPayload.rating !== undefined) dataPayload.rating = parseFloat(dataPayload.rating) || 5;
      if (dataPayload.taxRate !== undefined) dataPayload.taxRate = parseFloat(dataPayload.taxRate) || 0;
      if (dataPayload.balance !== undefined) dataPayload.balance = parseFloat(dataPayload.balance) || 0;
      if (dataPayload.salary !== undefined) dataPayload.salary = parseFloat(dataPayload.salary) || 0;

      await config.model.create({ data: dataPayload });

      createdCount.count++;
    }

    invalidateCache(masterType.toLowerCase(), companyId);

    // Log the import audit
    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      config.moduleName,
      'CREATE',
      null,
      { count: createdCount.count, action: 'IMPORT' }
    );

    return res.json({
      success: true,
      message: `Successfully imported ${createdCount.count} records.`,
      duplicatesSkipped: duplicateCodes
    });
  } catch (error: any) {
    console.error('❌ Import failed:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 4. STANDARD CRUD - LIST & SEARCH & FILTER
// ==========================================
router.get('/:masterType', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { masterType } = req.params;
    const companyId = req.user?.companyId;
    const { search, status, category, type } = req.query;

    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const config = MASTER_MAP[masterType.toLowerCase()];
    if (!config) {
      return res.status(400).json({ error: `Invalid master data type: ${masterType}` });
    }

    // Build Prisma query filters dynamically
    const whereClause: any = {
      companyId,
      isDeleted: false
    };

    if (status) {
      whereClause.status = String(status);
    }

    if (category) {
      whereClause.category = String(category);
    }

    if (type) {
      // Support customerType or accountType or taxType
      if (masterType.toLowerCase() === 'customer') whereClause.customerType = String(type);
      if (masterType.toLowerCase() === 'account') whereClause.accountType = String(type);
      if (masterType.toLowerCase() === 'tax') whereClause.taxType = String(type);
    }

    if (search) {
      const term = String(search).trim();
      whereClause.OR = [
        { [config.codeField]: { contains: term } },
        { [config.nameField]: { contains: term } }
      ];
    }

    const records = await config.model.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.json({ records });
  } catch (error: any) {
    console.error('❌ Master list failed:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 5. GET SINGLE RECORD
// ==========================================
router.get('/:masterType/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { masterType, id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const config = MASTER_MAP[masterType.toLowerCase()];
    if (!config) {
      return res.status(400).json({ error: `Invalid master data type: ${masterType}` });
    }

    const record = await config.model.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false
      }
    });

    if (!record) {
      return res.status(404).json({ error: 'Record not found or has been deleted.' });
    }

    return res.json({ record });
  } catch (error: any) {
    console.error('❌ Fetch record failed:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 6. CREATE RECORD (WITH DUPLICATE PREVENTION)
// ==========================================
router.post('/:masterType', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { masterType } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const config = MASTER_MAP[masterType.toLowerCase()];
    if (!config) {
      return res.status(400).json({ error: `Invalid master data type: ${masterType}` });
    }

    const codeValue = String(req.body[config.codeField] || '').trim();
    if (!codeValue) {
      return res.status(400).json({ error: `${config.codeField} is required.` });
    }

    // Duplicate prevention
    const existing = await config.model.findFirst({
      where: {
        companyId,
        [config.codeField]: codeValue,
        isDeleted: false
      }
    });

    if (existing) {
      return res.status(400).json({ error: `Duplicate prevention active: A record with code '${codeValue}' already exists.` });
    }

    const payload = { ...req.body, companyId };
    delete payload.id;
    delete payload.isDeleted;

    const record = await config.model.create({
      data: payload
    });

    invalidateCache(masterType.toLowerCase(), companyId);

    // Audit log
    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      config.moduleName,
      'CREATE',
      null,
      record
    );

    return res.json({ success: true, record });
  } catch (error: any) {
    console.error('❌ Create failed:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 7. UPDATE RECORD
// ==========================================
router.patch('/:masterType/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { masterType, id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const config = MASTER_MAP[masterType.toLowerCase()];
    if (!config) {
      return res.status(400).json({ error: `Invalid master data type: ${masterType}` });
    }

    const oldRecord = await config.model.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false
      }
    });

    if (!oldRecord) {
      return res.status(404).json({ error: 'Record not found' });
    }

    // If code field is changing, verify no other record has this new code
    const newCode = req.body[config.codeField];
    if (newCode && String(newCode).trim() !== oldRecord[config.codeField]) {
      const existing = await config.model.findFirst({
        where: {
          companyId,
          [config.codeField]: String(newCode).trim(),
          isDeleted: false,
          id: { not: id }
        }
      });
      if (existing) {
        return res.status(400).json({ error: `Duplicate prevention: A record with code '${newCode}' already exists.` });
      }
    }

    const payload = { ...req.body };
    delete payload.id;
    delete payload.companyId;
    delete payload.isDeleted;

    const record = await config.model.update({
      where: { id },
      data: payload
    });

    invalidateCache(masterType.toLowerCase(), companyId);

    // Audit log
    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      config.moduleName,
      'UPDATE',
      oldRecord,
      record
    );

    return res.json({ success: true, record });
  } catch (error: any) {
    console.error('❌ Update failed:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 8. SOFT DELETE RECORD
// ==========================================
router.delete('/:masterType/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { masterType, id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const config = MASTER_MAP[masterType.toLowerCase()];
    if (!config) {
      return res.status(400).json({ error: `Invalid master data type: ${masterType}` });
    }

    const oldRecord = await config.model.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false
      }
    });

    if (!oldRecord) {
      return res.status(404).json({ error: 'Record not found' });
    }

    await config.model.update({
      where: { id },
      data: { isDeleted: true }
    });

    invalidateCache(masterType.toLowerCase(), companyId);

    // Audit log
    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      config.moduleName,
      'DELETE',
      oldRecord,
      null
    );

    return res.json({ success: true, message: `Soft deleted ${config.label} record.` });
  } catch (error: any) {
    console.error('❌ Delete failed:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
