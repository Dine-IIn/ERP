import { CreateVendorBodySchema, ListCustomersQuerySchema, CreateBrandBodySchema, ListProductsQuerySchema, CreateCustomerBodySchema, CreateProductBodySchema, ListVendorsQuerySchema, CreateCategoryBodySchema, UpdateProductBodySchema, UpdateCustomerBodySchema, UpdateVendorBodySchema } from '../types/index';
import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../services/db';
import { logAudit } from '../utils/audit';

// ==========================================
// 1. CUSTOMER MASTER MANAGEMENT API
// ==========================================

export async function listCustomers(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const parsedQuery = ListCustomersQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) return res.status(400).json({ error: "Invalid input", details: parsedQuery.error.issues });
    const { query } = parsedQuery.data;

    const whereClause: any = { companyId };
    if (query) {
      whereClause.OR = [
        { name: { contains: String(query), mode: 'insensitive' } },
        { contactNo: { contains: String(query), mode: 'insensitive' } },
        { email: { contains: String(query), mode: 'insensitive' } }
      ];
    }

    const customers = await prisma.customer.findMany({
      where: whereClause,
      orderBy: { name: 'asc' }
    });

    return res.json({ customers });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createCustomer(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const parsedBody = CreateCustomerBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Invalid input", details: parsedBody.error.issues });
    const { name, customerType, customerGroup, contactPerson, contactNo, email, billingAddress, shippingAddress, creditLimit, creditTime, state, clientClassification, currencySymbol, bankName, accountHolderName, accountNumber, ifscCode, gstNumber, panNumber } = parsedBody.data;

    if (!name || !customerType || !contactNo || !state) {
      return res.status(400).json({ error: "Name, customerType, contactNo, and state are required fields" });
    }

    // Check unique customer name in company
    const existing = await prisma.customer.findFirst({
      where: { companyId, name }
    });
    if (existing) {
      return res.status(409).json({ error: `Customer '${name}' is already registered.` });
    }

    const customer = await prisma.customer.create({
      data: {
        companyId,
        name,
        customerType,
        customerGroup: customerGroup || null,
        contactPerson: contactPerson || null,
        contactNo,
        email: email || null,
        billingAddress: billingAddress || null,
        shippingAddress: shippingAddress || billingAddress || null,
        creditLimit: creditLimit ? parseFloat(creditLimit) : 0.0,
        creditTime: creditTime ? parseInt(creditTime) : 0,
        state: state,
        clientClassification: clientClassification || "NATIONAL",
        currencySymbol: currencySymbol || "$",
        bankName: bankName || null,
        accountHolderName: accountHolderName || null,
        accountNumber: accountNumber || null,
        ifscCode: ifscCode || null,
        gstNumber: gstNumber || null,
        panNumber: panNumber || null
      }
    });

    // Auto onboard bank account in bank account hub
    if (bankName && accountNumber && ifscCode) {
      const existingAccount = await prisma.companyBankAccount.findFirst({
        where: { companyId, accountNo: accountNumber }
      });
      if (!existingAccount) {
        await prisma.companyBankAccount.create({
          data: {
            companyId,
            bankName,
            accountNo: accountNumber,
            ifscCode,
            accountType: "CURRENT",
            balance: 0.0
          }
        });
      }
    }

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'customer_master',
      'CREATE',
      null,
      { id: customer.id, name: customer.name },
      req.ip,
      req.headers['user-agent']
    );

    return res.status(201).json({ message: "Customer created successfully", customer });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateCustomer(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const parsedBody = UpdateCustomerBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Invalid input", details: parsedBody.error.issues });
    const { name, customerType, customerGroup, contactPerson, contactNo, email, billingAddress, shippingAddress, creditLimit, creditTime, state, clientClassification, currencySymbol, bankName, accountHolderName, accountNumber, ifscCode, gstNumber, panNumber } = parsedBody.data;

    const customerToUpdate = await prisma.customer.findFirst({
      where: { id, companyId }
    });
    if (!customerToUpdate) {
      return res.status(404).json({ error: "Customer profile not found" });
    }

    if (name && name !== customerToUpdate.name) {
      const exist = await prisma.customer.findFirst({
        where: { companyId, name }
      });
      if (exist) return res.status(409).json({ error: `Customer name '${name}' already exists.` });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(customerType && { customerType }),
        ...(customerGroup !== undefined && { customerGroup: customerGroup || null }),
        ...(contactPerson !== undefined && { contactPerson: contactPerson || null }),
        ...(contactNo && { contactNo }),
        ...(email !== undefined && { email: email || null }),
        ...(billingAddress !== undefined && { billingAddress: billingAddress || null }),
        ...(shippingAddress !== undefined && { shippingAddress: shippingAddress || billingAddress || null }),
        ...(creditLimit !== undefined && { creditLimit: parseFloat(creditLimit) || 0.0 }),
        ...(creditTime !== undefined && { creditTime: parseInt(creditTime) || 0 }),
        ...(state !== undefined && { state }),
        ...(clientClassification !== undefined && { clientClassification }),
        ...(currencySymbol !== undefined && { currencySymbol }),
        ...(bankName !== undefined && { bankName: bankName || null }),
        ...(accountHolderName !== undefined && { accountHolderName: accountHolderName || null }),
        ...(accountNumber !== undefined && { accountNumber: accountNumber || null }),
        ...(ifscCode !== undefined && { ifscCode: ifscCode || null }),
        ...(gstNumber !== undefined && { gstNumber: gstNumber || null }),
        ...(panNumber !== undefined && { panNumber: panNumber || null })
      }
    });

    // Auto onboard bank account in bank account hub
    if (updated.bankName && updated.accountNumber && updated.ifscCode) {
      const existingAccount = await prisma.companyBankAccount.findFirst({
        where: { companyId, accountNo: updated.accountNumber }
      });
      if (!existingAccount) {
        await prisma.companyBankAccount.create({
          data: {
            companyId,
            bankName: updated.bankName,
            accountNo: updated.accountNumber,
            ifscCode: updated.ifscCode,
            accountType: "CURRENT",
            balance: 0.0
          }
        });
      }
    }

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'customer_master',
      'UPDATE',
      customerToUpdate,
      updated,
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: "Customer updated successfully", customer: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteCustomer(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;

    const customer = await prisma.customer.findFirst({
      where: { id, companyId }
    });
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    await prisma.customer.delete({
      where: { id }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'customer_master',
      'DELETE',
      { id: customer.id, name: customer.name },
      null,
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: `Customer '${customer.name}' permanently deleted.` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 2. VENDOR MASTER MANAGEMENT API
// ==========================================

export async function listVendors(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const parsedQuery = ListVendorsQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) return res.status(400).json({ error: "Invalid input", details: parsedQuery.error.issues });
    const { query } = parsedQuery.data;

    const whereClause: any = { companyId };
    if (query) {
      whereClause.OR = [
        { name: { contains: String(query), mode: 'insensitive' } },
        { contactNo: { contains: String(query), mode: 'insensitive' } },
        { email: { contains: String(query), mode: 'insensitive' } }
      ];
    }

    const vendors = await prisma.vendor.findMany({
      where: whereClause,
      orderBy: { name: 'asc' }
    });

    return res.json({ vendors });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createVendor(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const parsedBody = CreateVendorBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Invalid input", details: parsedBody.error.issues });
    const { name, isVendor, contactNo, email, bankDetails, paymentTerms, gstDetails, creditTime, creditLimit, bankName, accountHolderName, accountNumber, ifscCode, gstNumber, panNumber, currencySymbol, currencyId } = parsedBody.data;

    if (!name || !contactNo) {
      return res.status(400).json({ error: "Name and contactNo are required fields" });
    }

    const existing = await prisma.vendor.findFirst({
      where: { companyId, name }
    });
    if (existing) {
      return res.status(409).json({ error: `Supplier/Vendor '${name}' is already registered.` });
    }

    const vendor = await prisma.vendor.create({
      data: {
        companyId,
        name,
        isVendor: isVendor !== undefined ? isVendor : true,
        contactNo,
        email: email || null,
        bankDetails: bankDetails || null,
        paymentTerms: paymentTerms || null,
        gstDetails: gstDetails || null,
        creditTime: creditTime ? parseInt(creditTime) : 0,
        creditLimit: creditLimit ? parseFloat(creditLimit) : 0.0,
        bankName: bankName || null,
        accountHolderName: accountHolderName || null,
        accountNumber: accountNumber || null,
        ifscCode: ifscCode || null,
        gstNumber: gstNumber || null,
        panNumber: panNumber || null,
        currencySymbol: currencySymbol || "$",
        currencyId: currencyId || "USD"
      }
    });

    // Auto onboard bank account in bank account hub
    if (bankName && accountNumber && ifscCode) {
      const existingAccount = await prisma.companyBankAccount.findFirst({
        where: { companyId, accountNo: accountNumber }
      });
      if (!existingAccount) {
        await prisma.companyBankAccount.create({
          data: {
            companyId,
            bankName,
            accountNo: accountNumber,
            ifscCode,
            accountType: "CURRENT",
            balance: 0.0
          }
        });
      }
    }

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'vendor_master',
      'CREATE',
      null,
      { id: vendor.id, name: vendor.name },
      req.ip,
      req.headers['user-agent']
    );

    return res.status(201).json({ message: "Vendor/Supplier onboarded successfully", vendor });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateVendor(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const parsedBody = UpdateVendorBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Invalid input", details: parsedBody.error.issues });
    const { name, isVendor, contactNo, email, bankDetails, paymentTerms, gstDetails, creditTime, creditLimit, bankName, accountHolderName, accountNumber, ifscCode, gstNumber, panNumber, currencySymbol, currencyId } = parsedBody.data;

    const vendorToUpdate = await prisma.vendor.findFirst({
      where: { id, companyId }
    });
    if (!vendorToUpdate) {
      return res.status(404).json({ error: "Vendor/Supplier record not found" });
    }

    if (name && name !== vendorToUpdate.name) {
      const exist = await prisma.vendor.findFirst({
        where: { companyId, name }
      });
      if (exist) return res.status(409).json({ error: `Vendor name '${name}' already registered.` });
    }

    const updated = await prisma.vendor.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(isVendor !== undefined && { isVendor }),
        ...(contactNo && { contactNo }),
        ...(email !== undefined && { email: email || null }),
        ...(bankDetails !== undefined && { bankDetails: bankDetails || null }),
        ...(paymentTerms !== undefined && { paymentTerms: paymentTerms || null }),
        ...(gstDetails !== undefined && { gstDetails: gstDetails || null }),
        ...(creditTime !== undefined && { creditTime: parseInt(creditTime) || 0 }),
        ...(creditLimit !== undefined && { creditLimit: parseFloat(creditLimit) || 0.0 }),
        ...(bankName !== undefined && { bankName: bankName || null }),
        ...(accountHolderName !== undefined && { accountHolderName: accountHolderName || null }),
        ...(accountNumber !== undefined && { accountNumber: accountNumber || null }),
        ...(ifscCode !== undefined && { ifscCode: ifscCode || null }),
        ...(gstNumber !== undefined && { gstNumber: gstNumber || null }),
        ...(panNumber !== undefined && { panNumber: panNumber || null }),
        ...(currencySymbol !== undefined && { currencySymbol }),
        ...(currencyId !== undefined && { currencyId })
      }
    });

    // Auto onboard bank account in bank account hub
    if (updated.bankName && updated.accountNumber && updated.ifscCode) {
      const existingAccount = await prisma.companyBankAccount.findFirst({
        where: { companyId, accountNo: updated.accountNumber }
      });
      if (!existingAccount) {
        await prisma.companyBankAccount.create({
          data: {
            companyId,
            bankName: updated.bankName,
            accountNo: updated.accountNumber,
            ifscCode: updated.ifscCode,
            accountType: "CURRENT",
            balance: 0.0
          }
        });
      }
    }

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'vendor_master',
      'UPDATE',
      vendorToUpdate,
      updated,
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: "Vendor/Supplier details updated", vendor: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteVendor(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;

    const vendor = await prisma.vendor.findFirst({
      where: { id, companyId }
    });
    if (!vendor) return res.status(404).json({ error: "Vendor/Supplier record not found" });

    await prisma.vendor.delete({
      where: { id }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'vendor_master',
      'DELETE',
      { id: vendor.id, name: vendor.name },
      null,
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: `Vendor/Supplier '${vendor.name}' permanently deleted.` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 3. PRODUCT & CATALOG MASTER MANAGEMENT API
// ==========================================

// CATEGORIES HELPERS
export async function listCategories(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const categories = await prisma.productCategory.findMany({
      where: { companyId },
      orderBy: { name: 'asc' }
    });
    return res.json({ categories });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createCategory(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const parsedBody = CreateCategoryBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Invalid input", details: parsedBody.error.issues });
    const { name } = parsedBody.data;
    if (!name) return res.status(400).json({ error: "Category name is required" });

    const exist = await prisma.productCategory.findFirst({ where: { companyId, name } });
    if (exist) return res.status(409).json({ error: "Category already exists" });

    const category = await prisma.productCategory.create({
      data: { companyId, name }
    });
    return res.status(201).json({ category });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteCategory(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const category = await prisma.productCategory.findFirst({ where: { id, companyId } });
    if (!category) return res.status(404).json({ error: "Category not found or access denied" });

    await prisma.productCategory.delete({ where: { id } });
    return res.json({ message: "Category deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// BRANDS HELPERS
export async function listBrands(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const brands = await prisma.brand.findMany({
      where: { companyId },
      orderBy: { name: 'asc' }
    });
    return res.json({ brands });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createBrand(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const parsedBody = CreateBrandBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Invalid input", details: parsedBody.error.issues });
    const { name } = parsedBody.data;
    if (!name) return res.status(400).json({ error: "Brand name is required" });

    const exist = await prisma.brand.findFirst({ where: { companyId, name } });
    if (exist) return res.status(409).json({ error: "Brand already exists" });

    const brand = await prisma.brand.create({
      data: { companyId, name }
    });
    return res.status(201).json({ brand });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteBrand(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const brand = await prisma.brand.findFirst({ where: { id, companyId } });
    if (!brand) return res.status(404).json({ error: "Brand not found or access denied" });

    await prisma.brand.delete({ where: { id } });
    return res.json({ message: "Brand deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// PRODUCT CRUDS
export async function listProducts(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const parsedQuery = ListProductsQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) return res.status(400).json({ error: "Invalid input", details: parsedQuery.error.issues });
    const { query } = parsedQuery.data;

    const whereClause: any = { companyId };
    if (query) {
      whereClause.OR = [
        { name: { contains: String(query), mode: 'insensitive' } },
        { hsnSacCode: { contains: String(query), mode: 'insensitive' } }
      ];
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: true,
        brand: true,
        variants: true
      },
      orderBy: { name: 'asc' }
    });

    return res.json({ products });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createProduct(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const parsedBody = CreateProductBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Invalid input", details: parsedBody.error.issues });
    const { name, categoryId, brandId, uom, pricing, hsnSacCode, imageUrl, bomReference, moq, variants, reorderLevel, warehouseLoc } = parsedBody.data;

    if (!name || !uom) {
      return res.status(400).json({ error: "Product name and UOM are required fields" });
    }

    const existing = await prisma.product.findFirst({
      where: { companyId, name }
    });
    if (existing) {
      return res.status(409).json({ error: `Product '${name}' already exists in your inventory.` });
    }

    // Save product record
    const product = await prisma.product.create({
      data: {
        companyId,
        name,
        categoryId: categoryId || null,
        brandId: brandId || null,
        uom,
        pricing: pricing ? parseFloat(pricing) : 0.0,
        hsnSacCode: hsnSacCode || null,
        imageUrl: imageUrl || null,
        bomReference: bomReference || null,
        moq: moq ? parseFloat(moq) : 1.0,
        reorderLevel: reorderLevel ? parseFloat(reorderLevel) : 5.0,
        warehouseLoc: warehouseLoc || null
      }
    });

    // Check if initial stock (which defaults to 0) drops below reorderLevel
    const { checkAndNotifyLowStock } = require('../utils/lowStockAlert');
    await checkAndNotifyLowStock(product.id, req.user?.userId);

    // Create variants if any
    const createdVariants: any[] = [];
    if (variants && Array.isArray(variants)) {
      const validVariants = variants.filter(v => v.name).map(v => ({
        productId: product.id,
        name: v.name,
        sku: v.sku || null,
        priceAddon: v.priceAddon ? parseFloat(v.priceAddon) : 0.0
      }));
      if (validVariants.length > 0) {
        await prisma.productVariant.createMany({ data: validVariants });
        createdVariants.push(...validVariants);
      }
    }

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'product_master',
      'CREATE',
      null,
      { id: product.id, name: product.name, variantsCount: createdVariants.length },
      req.ip,
      req.headers['user-agent']
    );

    return res.status(201).json({
      message: "Product catalog entry created successfully",
      product: { ...product, variants: createdVariants }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateProduct(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const parsedBody = UpdateProductBodySchema.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Invalid input", details: parsedBody.error.issues });
    const { name, categoryId, brandId, uom, pricing, hsnSacCode, imageUrl, bomReference, moq, variants, reorderLevel, warehouseLoc } = parsedBody.data;

    const productToUpdate = await prisma.product.findFirst({
      where: { id, companyId },
      include: { variants: true }
    });
    if (!productToUpdate) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (name && name !== productToUpdate.name) {
      const exist = await prisma.product.findFirst({
        where: { companyId, name }
      });
      if (exist) return res.status(409).json({ error: `Product name '${name}' already exists.` });
    }

    // Perform Cost Roll-Up if pricing changed
    if (pricing !== undefined && productToUpdate.pricing !== parseFloat(pricing)) {
      const newP = parseFloat(pricing) || 0.0;
      const priceDiff = newP - productToUpdate.pricing;
      
      const bomComponents = await prisma.bomComponent.findMany({
        where: { productId: id },
        include: { bom: { include: { finishedProduct: true } } }
      });

      for (const comp of bomComponents) {
        const parentProduct = comp.bom.finishedProduct;
        if (parentProduct && parentProduct.companyId === companyId) {
          const costIncrease = priceDiff * comp.qtyRequired;
          const updatedParentPrice = Math.max(0, parentProduct.pricing + costIncrease);
          await prisma.product.update({
            where: { id: parentProduct.id },
            data: { pricing: updatedParentPrice }
          });
        }
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(brandId !== undefined && { brandId: brandId || null }),
        ...(uom && { uom }),
        ...(pricing !== undefined && { pricing: parseFloat(pricing) || 0.0 }),
        ...(hsnSacCode !== undefined && { hsnSacCode: hsnSacCode || null }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(bomReference !== undefined && { bomReference: bomReference || null }),
        ...(moq !== undefined && { moq: parseFloat(moq) || 1.0 }),
        ...(reorderLevel !== undefined && { reorderLevel: parseFloat(reorderLevel) || 0.0 }),
        ...(warehouseLoc !== undefined && { warehouseLoc: warehouseLoc || null })
      }
    });

    // Check if updated parameters caused product to drop below reorder limit
    const { checkAndNotifyLowStock } = require('../utils/lowStockAlert');
    await checkAndNotifyLowStock(id, req.user?.userId);

    // Handle variant replacements (simpler transaction: wipe and recreate)
    if (variants && Array.isArray(variants)) {
      await prisma.productVariant.deleteMany({ where: { productId: id } });
      const validVariants = variants.filter(v => v.name).map(v => ({
        productId: id,
        name: v.name,
        sku: v.sku || null,
        priceAddon: v.priceAddon ? parseFloat(v.priceAddon) : 0.0
      }));
      if (validVariants.length > 0) {
        await prisma.productVariant.createMany({ data: validVariants });
      }
    }

    const finalProduct = await prisma.product.findFirst({ where: { id, companyId },
      include: { category: true, brand: true, variants: true }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'product_master',
      'UPDATE',
      productToUpdate,
      finalProduct,
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: "Product details updated successfully", product: finalProduct });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteProduct(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: { id, companyId }
    });
    if (!product) return res.status(404).json({ error: "Product not found" });

    await prisma.product.delete({
      where: { id }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'product_master',
      'DELETE',
      { id: product.id, name: product.name },
      null,
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: `Product '${product.name}' permanently deleted.` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
