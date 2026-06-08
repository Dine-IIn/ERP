import prisma from '../src/services/db';
import { hashPassword } from '../src/utils';

const HIERARCHICAL_FEATURES = [
  { key: "GENERAL", name: "GENERAL CONFIGURATION", description: "General Chat & Expenses" },
  { key: "GENERAL_CHAT", name: "General Chat", description: "General Chat" },
  { key: "GENERAL_EXPENSE_CHAT", name: "Expense Chat", description: "Expense Chat" },
  { key: "NOTIFICATIONS", name: "NOTIFICATIONS & ALERTS", description: "Enable system alerts and logs" },
  { key: "NOTIFICATIONS_PUSH", name: "Push Notifications", description: "Receive real-time push events on devices" },
  { key: "NOTIFICATIONS_AUDIT", name: "System Audit Logs", description: "View secure administrative history trails" },
  { key: "ADMINISTRATION", name: "COMPANY ADMINISTRATION", description: "Manage profile, roles, users, departments, and backups" },
  { key: "ADMIN_PROFILE", name: "Company Profile Management", description: "Update tenant brandings, logos, and contacts" },
  { key: "ADMIN_ROLES", name: "Roles & Permissions Management", description: "Create and customize permissions for corporate roles" },
  { key: "ADMIN_AUDIT", name: "System Audit Logs", description: "Track secure historical action logs" },
  { key: "ADMIN_BACKUP", name: "Snapshots Backup & Restores", description: "Schedule and execute local tenant backups" },
  { key: "ADMIN_USERS", name: "Employee Users & Approvals", description: "Approve signups and manage employee profiles" },
  { key: "ADMIN_DEPARTMENTS", name: "Corporate Departments Settings", description: "Map structures and delegate managers" },
  { key: "MASTER_DATA", name: "MASTER DATA HUB", description: "Manage Employees, Customers, Vendors, Products, and Taxes profiles" },
  { key: "MASTER_EMPLOYEE", name: "Employee Master", description: "Manage hierarchies, timing shifts, and secure documents" },
  { key: "MASTER_CUSTOMER", name: "Customer Master", description: "Administer sales accounts, billing destinations, and credit ratings" },
  { key: "MASTER_VENDOR", name: "Vendor / Supplier Master", description: "Handle supply registers, GST details, bank parameters, and payments" },
  { key: "MASTER_PRODUCT", name: "Product / Item Master", description: "Configure inventory catalog, variants, pricing, and HSN codes" },
  { key: "MASTER_TAX", name: "Tax Master", description: "Configure corporate sales tax rates, GSTIN brackets, and VAT schemes" },
  { key: "SALES_DATA", name: "SALES MANAGEMENT", description: "Consolidated Sales, Invoicing, Quotation, Maintenance and Dispatching Hub" },
  { key: "SALES_ORDER", name: "Sales Orders Hub", description: "Manage customer orders, quantities, expected delivery dates and discounts" },
  { key: "SALES_PROFORMA", name: "Proforma Invoices", description: "Generate, edit, download and email proforma invoices" },
  { key: "SALES_INVOICE", name: "Sales Invoices", description: "Manage sales invoices, track collections, and email customers" },
  { key: "SALES_CHALLAN", name: "Delivery Challans", description: "Generate transit challans and declarations" },
  { key: "SALES_DISPATCH", name: "Dispatch Management", description: "Coordinate shipments, carrier tracking and vehicles details" },
  { key: "SALES_QUOTATION", name: "Sales Quotations", description: "Generate, edit, and dispatch legal price quotations" },
  { key: "SALES_POST_SERVICE", name: "Post-Sales Service & Maintenance", description: "Coordinate warranty claims, maintenance logs, and service sheets" },
  { key: "CRM_DATA", name: "CRM PORTAL", description: "Customer Relationship Management portal" },
  { key: "CRM_LEAD", name: "CRM Leads Hub", description: "Capture, log, track, and assign sales leads" },
  { key: "CRM_OPPORTUNITY", name: "CRM Opportunities Pipeline", description: "Administer potential deal pipelines and conversion projections" },
  { key: "CRM_FOLLOWUP", name: "CRM Follow-ups Scheduler", description: "Log and schedule phone calls, emails, and meetings with clients" },
  { key: "CRM_DASHBOARD", name: "CRM Analytics Dashboard", description: "Visualize lead pipelines, conversion rates, and revenue projections" },
  { key: "PURCHASE_DATA", name: "PURCHASE MANAGEMENT", description: "Consolidated Vendor Sourcing & Purchase Operations Hub" },
  { key: "PURCHASE_ORDER", name: "Purchase Orders Hub", description: "Generate purchase orders and dispatch requests to vendors" },
  { key: "PURCHASE_VENDOR_QUOTE", name: "Vendor Quotations", description: "Capture, evaluate, and choose price quotes submitted by suppliers" },
  { key: "PURCHASE_GRN", name: "Goods Receipt Notes (GRN)", description: "Record gate entries, check material volumes, and register inward packages" },
  { key: "PURCHASE_RETURN", name: "Purchase Returns (Debit Notes)", description: "Generate debit notes and dispatch returns of defected goods" },
  { key: "PURCHASE_PAYMENT", name: "Vendor Payments Hub", description: "Manage bank transfer payments, transaction receipts, and outstanding dues" },
  { key: "INVENTORY_DATA", name: "INVENTORY MANAGEMENT", description: "Consolidated Realtime Warehousing & Inventory Control" },
  { key: "INVENTORY_PRODUCT", name: "Warehouse Stock Levels", description: "Conduct manual stock audits, warehouse taggings, and storage logs" },
  { key: "INVENTORY_STOCK_OVERVIEW", name: "Stock Ledger Overview", description: "View transaction ledgers tracking inward POs and outward SOs" },
  { key: "INVENTORY_LOW_ALERT", name: "Low Stock Alerts Console", description: "Monitor automatically flagged items dropping below minimum reorder thresholds" },
  { key: "HRMS_DATA", name: "HRMS MODULE", description: "Human Resource Management System" },
  { key: "HRMS_EMPLOYEES", name: "Employees Directory", description: "Manage company employees directory, shifts, departments and structures" },
  { key: "HRMS_ATTENDANCE", name: "Attendance & Punch logs", description: "Punch checks-in/out and worked hour records" },
  { key: "HRMS_LEAVES", name: "Leave Management Review", description: "Review, request, and decide leaves allocations" },
  { key: "HRMS_SHIFTS", name: "Corporate Timing Shifts", description: "Set shift times, durations, and grace limits" },
  { key: "HRMS_PAYROLL", name: "Basic Payroll disbursement", description: "Compile salary salaries slip" },
  { key: "FINANCE_DATA", name: "FINANCE & ACCOUNTING", description: "Corporate Expenses, Payments, Receipts, and double-entry Cashbook Ledger" },
  { key: "FINANCE_EXPENSES", name: "Central Expense Book", description: "Record and categorize corporate expense vouchers" },
  { key: "FINANCE_PAYMENTS", name: "Vendor Payments ledger", description: "Finalize outward vendor cash transactions" },
  { key: "FINANCE_RECEIPTS", name: "Revenue Receipts ledger", description: "Log customer incoming incomes and receipts" },
  { key: "FINANCE_CASHBOOK", name: "Double-Entry Cashbook vouchers", description: "Monitor running dual balances cashbook" },
  { key: "FINANCE_GST", name: "GST Tax Configurations", description: "Review and file corporate sales & purchases taxes" },
  { key: "FINANCE_BANK", name: "Company Bank Accounts directory", description: "Manage bank deposits, accounts, and reconciliations" },
  { key: "REPORTS_DATA", name: "REPORTS & ANALYTICS", description: "Multi-dimensional reports: Sales, Purchases, Stocks, HR levels and Savings statements" },
  { key: "REPORTS_SALES", name: "Sales Analytical summary", description: "Review monthly sales volumes and invoice counts" },
  { key: "REPORTS_PURCHASE", name: "Purchase Sourcing summary", description: "Examine PO ratios and complete expenses" },
  { key: "REPORTS_INVENTORY", name: "Warehouse asset valuations", description: "Audit stock evaluations and catalog sizes" },
  { key: "REPORTS_HR", name: "HR Metrics totals", description: "Review work durations and disbursed salaries" },
  { key: "REPORTS_FINANCE", name: "Financial Cashflows curves", description: "Examine inflows vs outflows and running curves" },
  { key: "MANUFACTURING", name: "MANUFACTURING OPERATIONS", description: "Factory Operations & Manufacturing Module" },
  { key: "MANUFACTURING_BOM", name: "BOM & Bill of Materials", description: "Configure product formulas, components lists, and pricing" },
  { key: "MANUFACTURING_PLAN", name: "Production Planning & MRP", description: "Schedule factory production runs and compute material deficits" },
  { key: "MANUFACTURING_WORK_ORDER", name: "Work Orders & Job Cards", description: "Dispatch assembly instructions and track operator logs" },
  { key: "MANUFACTURING_PRODUCTION", name: "Production & Material Consumption", description: "Log output quantities and raw material issues" },
  { key: "MANUFACTURING_QC", name: "Quality Control & Reworks", description: "Inspect manufactured batches and reject defects" },
  { key: "MANUFACTURING_SHOP_FLOOR", name: "Shop Floor Work Centers", description: "Manage assembly stations, capacities, and factory rosters" },
  { key: "MANUFACTURING_REPORTS", name: "Production Reports", description: "Examine monthly production outputs and analytics" },
  { key: "MANUFACTURING_COSTING", name: "Production Cost Analysis", description: "Track overhead allocation and item cost deviations" }
];

async function main() {
  console.log('🌱 Starting local database seed...');

  // 1. Seed Features
  const featuresList = [];
  for (const item of HIERARCHICAL_FEATURES) {
    const f = await prisma.feature.upsert({
      where: { key: item.key },
      update: { name: item.name, description: item.description },
      create: { key: item.key, name: item.name, description: item.description }
    });
    featuresList.push(f);
  }
  console.log(`✅ Upserted ${featuresList.length} global features`);

  // 2. Create Companies
  const companiesData = [
    { companyCode: 'ABC001', name: 'ABC Industries', subscriptionTier: 'ENTERPRISE' },
    { companyCode: 'ANB', name: 'ANB Enterprise', subscriptionTier: 'PREMIUM' }
  ];

  const passwordHash = await hashPassword('admin123');

  for (const cData of companiesData) {
    const company = await prisma.company.upsert({
      where: { companyCode: cData.companyCode },
      update: { name: cData.name, subscriptionTier: cData.subscriptionTier },
      create: {
        companyCode: cData.companyCode,
        name: cData.name,
        subscriptionTier: cData.subscriptionTier,
        status: 'ACTIVE'
      }
    });

    console.log(`✅ Seeded Company: ${company.name} (${company.companyCode})`);

    // Map all features to company
    for (const f of featuresList) {
      await prisma.companyFeature.upsert({
        where: {
          companyId_featureId: { companyId: company.id, featureId: f.id }
        },
        update: {},
        create: {
          companyId: company.id,
          featureId: f.id
        }
      });
    }
    console.log(`   - Mapped all features to ${company.companyCode}`);

    // Create Admin Role
    const permissions: any = {};
    for (const item of HIERARCHICAL_FEATURES) {
      permissions[item.key] = ["read", "write", "delete"];
    }

    const adminRole = await prisma.role.upsert({
      where: {
        companyId_name: { companyId: company.id, name: 'Admin' }
      },
      update: { permissions: JSON.stringify(permissions) },
      create: {
        companyId: company.id,
        name: 'Admin',
        permissions: JSON.stringify(permissions)
      }
    });
    console.log(`   - Seeded Admin Role for ${company.companyCode}`);

    // Create Admin User
    const adminUser = await prisma.user.upsert({
      where: {
        companyId_username: { companyId: company.id, username: 'admin' }
      },
      update: {
        passwordHash,
        status: 'ACTIVE',
        roleId: adminRole.id
      },
      create: {
        companyId: company.id,
        username: 'admin',
        passwordHash,
        mobileNo: cData.companyCode === 'ABC001' ? '+919999999999' : '+918888888888',
        email: `admin@${cData.companyCode.toLowerCase()}.com`,
        status: 'ACTIVE',
        roleId: adminRole.id
      }
    });
    console.log(`   - Seeded Admin User 'admin' (password: admin123) for ${company.companyCode}`);

    // Seed some products
    const p1 = await prisma.product.upsert({
      where: { companyId_name: { companyId: company.id, name: 'Steel Pipe 2-inch' } },
      update: {},
      create: {
        companyId: company.id,
        name: 'Steel Pipe 2-inch',
        uom: 'METER',
        pricing: 24.50,
        stock: 450,
        reorderLevel: 50
      }
    });

    const p2 = await prisma.product.upsert({
      where: { companyId_name: { companyId: company.id, name: 'Copper Wire 5mm' } },
      update: {},
      create: {
        companyId: company.id,
        name: 'Copper Wire 5mm',
        uom: 'KG',
        pricing: 12.80,
        stock: 120,
        reorderLevel: 25
      }
    });

    console.log(`   - Seeded 2 Products for ${company.companyCode}`);

    // Seed some customers
    await prisma.customer.upsert({
      where: { companyId_name: { companyId: company.id, name: 'Global Tech Solutions' } },
      update: {},
      create: {
        companyId: company.id,
        name: 'Global Tech Solutions',
        customerType: 'COMPANY',
        contactNo: '+1234567890',
        email: 'info@globaltech.com'
      }
    });

    // Seed some vendors
    await prisma.vendor.upsert({
      where: { companyId_name: { companyId: company.id, name: 'Apex Metal Suppliers' } },
      update: {},
      create: {
        companyId: company.id,
        name: 'Apex Metal Suppliers',
        contactNo: '+1098765432',
        email: 'sales@apexmetals.com'
      }
    });

    console.log(`   - Seeded default Customer and Vendor for ${company.companyCode}`);
  }

  console.log('🌱 Seed completed successfully!');
}

main()
  .catch(e => {
    console.error('Seed error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
