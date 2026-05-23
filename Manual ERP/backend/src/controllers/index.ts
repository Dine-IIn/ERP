import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../services/db';
import {
  SignupSchema,
  LoginSchema,
  CreateCompanySchema,
  ApproveUserSchema,
  CreateRoleSchema,
  UpdateCompanySchema,
  CreateCompanyAdminSchema,
  UpdateCompanyUserSchema
} from '../types';
import {
  hashPassword,
  comparePassword,
  generateToken,
  sendSimulatedOTP,
  verifySimulatedOTP
} from '../utils';

export const HIERARCHICAL_FEATURES = [
  { key: "ADMIN", name: "GENERAL / ADMINISTRATION MODULE", description: "System administration configuration" },
  { key: "ADMIN_PROFILE", name: "Company profile management", description: "Company profile management" },
  { key: "ADMIN_TAX", name: "GST/VAT/TAX settings", description: "GST/VAT/TAX settings" },
  { key: "ADMIN_CURRENCY", name: "Currency settings", description: "Currency settings" },
  { key: "ADMIN_AUDIT", name: "Audit logs", description: "Audit logs" },
  { key: "ADMIN_APPROVALS", name: "Approval workflow engine", description: "Approval workflow engine" },
  { key: "ADMIN_NOTIFICATIONS", name: "Notification center", description: "Notification center" },
  { key: "ADMIN_BACKUP", name: "Backup & restore", description: "Backup & restore" },
  { key: "ADMIN_DOCUMENTS", name: "Document management", description: "Document management" },
  { key: "ADMIN_EMAIL", name: "Email integration system", description: "Email integration system" },
  { key: "ADMIN_TOGGLES", name: "Feature toggle system", description: "Feature toggle system" },
  { key: "ADMIN_DASHBOARD", name: "Customizable dashboard", description: "Customizable dashboard" },
  { key: "ADMIN_ORG", name: "Organization hierarchy", description: "Organization hierarchy" },
  { key: "ADMIN_DEPARTMENTS", name: "Department management", description: "Department management" },
  { key: "ADMIN_ACTIVITY", name: "User activity logs", description: "User activity logs" },

  { key: "MDM", name: "MASTER DATA MANAGEMENT", description: "Master Data Management" },
  { key: "MDM_PRODUCT", name: "Product master", description: "Product master" },
  { key: "MDM_CUSTOMER", name: "Customer master", description: "Customer master" },
  { key: "MDM_VENDOR", name: "Vendor master", description: "Vendor master" },
  { key: "MDM_EMPLOYEE", name: "Employee master", description: "Employee master" },
  { key: "MDM_WAREHOUSE", name: "Warehouse master", description: "Warehouse master" },
  { key: "MDM_TAX", name: "Tax master", description: "Tax master" },
  { key: "MDM_UNIT", name: "Unit master", description: "Unit master" },
  { key: "MDM_CATEGORY", name: "Category master", description: "Category master" },
  { key: "MDM_BRAND", name: "Brand master", description: "Brand master" },
  { key: "MDM_COA", name: "Chart of accounts", description: "Chart of accounts" },
  { key: "MDM_DROPDOWNS", name: "Reusable dropdown/master APIs", description: "Reusable dropdown/master APIs" },
  { key: "MDM_IMPORT_EXPORT", name: "Import/export master data", description: "Import/export master data" },

  { key: "FINANCE", name: "FINANCE & ACCOUNTING MODULE", description: "Finance & Accounting" },
  { key: "FINANCE_LEDGER", name: "General ledger", description: "General ledger" },
  { key: "FINANCE_JOURNAL", name: "Journal entries", description: "Journal entries" },
  { key: "FINANCE_TRIAL_BALANCE", name: "Trial balance", description: "Trial balance" },
  { key: "FINANCE_BALANCE_SHEET", name: "Balance sheet", description: "Balance sheet" },
  { key: "FINANCE_PNL", name: "Profit & loss", description: "Profit & loss" },
  { key: "FINANCE_CASH_FLOW", name: "Cash flow statements", description: "Cash flow statements" },
  { key: "FINANCE_AP", name: "Accounts payable", description: "Accounts payable" },
  { key: "FINANCE_AR", name: "Accounts receivable", description: "Accounts receivable" },
  { key: "FINANCE_EXPENSE", name: "Expense tracking", description: "Expense tracking" },
  { key: "FINANCE_GST", name: "GST management", description: "GST management" },
  { key: "FINANCE_TAX", name: "Tax management", description: "Tax management" },
  { key: "FINANCE_ASSET", name: "Asset management", description: "Asset management" },
  { key: "FINANCE_DEPRECIATION", name: "Depreciation tracking", description: "Depreciation tracking" },
  { key: "FINANCE_BUDGET", name: "Budget management", description: "Budget management" },
  { key: "FINANCE_BANK_RECON", name: "Bank reconciliation", description: "Bank reconciliation" },
  { key: "FINANCE_REPORTS", name: "Financial reports", description: "Financial reports" },
  { key: "FINANCE_VOUCHER", name: "Voucher system", description: "Voucher system" },
  { key: "FINANCE_FISCAL_YEAR", name: "Fiscal year management", description: "Fiscal year management" },

  { key: "INVENTORY", name: "INVENTORY & WAREHOUSE MODULE", description: "Inventory & Warehouse" },
  { key: "INVENTORY_TRACKING", name: "Real-time stock tracking", description: "Real-time stock tracking" },
  { key: "INVENTORY_MULTI_WH", name: "Multi-warehouse support", description: "Multi-warehouse support" },
  { key: "INVENTORY_BATCH", name: "Batch management", description: "Batch management" },
  { key: "INVENTORY_SERIAL", name: "Serial number tracking", description: "Serial number tracking" },
  { key: "INVENTORY_TRANSFERS", name: "Stock transfers", description: "Stock transfers" },
  { key: "INVENTORY_ADJUSTMENTS", name: "Stock adjustments", description: "Stock adjustments" },
  { key: "INVENTORY_VALUATION", name: "Inventory valuation", description: "Inventory valuation" },
  { key: "INVENTORY_ALERTS", name: "Low stock alerts", description: "Low stock alerts" },
  { key: "INVENTORY_BARCODE", name: "Barcode support", description: "Barcode support" },
  { key: "INVENTORY_RACK_BIN", name: "Rack/bin management", description: "Rack/bin management" },
  { key: "INVENTORY_DISPATCH", name: "Dispatch management", description: "Dispatch management" },
  { key: "INVENTORY_GRN", name: "GRN (Goods Receipt Notes)", description: "GRN (Goods Receipt Notes)" },
  { key: "INVENTORY_REPORTS", name: "Inventory reports", description: "Inventory reports" },
  { key: "INVENTORY_LEDGER", name: "Stock ledger", description: "Stock ledger" },
  { key: "INVENTORY_CYCLE_COUNT", name: "Cycle counting", description: "Cycle counting" },

  { key: "PURCHASE", name: "PURCHASE & PROCUREMENT MODULE", description: "Purchase & Procurement" },
  { key: "PURCHASE_VENDOR_MGT", name: "Vendor management", description: "Vendor management" },
  { key: "PURCHASE_REQUISITIONS", name: "Purchase requisitions", description: "Purchase requisitions" },
  { key: "PURCHASE_ORDERS", name: "Purchase orders", description: "Purchase orders" },
  { key: "PURCHASE_QUOTATIONS", name: "Vendor quotations", description: "Vendor quotations" },
  { key: "PURCHASE_COMPARISON", name: "Vendor comparison", description: "Vendor comparison" },
  { key: "PURCHASE_PAYMENTS", name: "Supplier payment tracking", description: "Supplier payment tracking" },
  { key: "PURCHASE_APPROVALS", name: "Approval workflows", description: "Approval workflows" },
  { key: "PURCHASE_REORDER", name: "Reorder automation", description: "Reorder automation" },
  { key: "PURCHASE_GRN", name: "GRN integration", description: "GRN integration" },
  { key: "PURCHASE_DASHBOARD", name: "Procurement dashboard", description: "Procurement dashboard" },
  { key: "PURCHASE_PO_PDF", name: "PO PDF generation", description: "PO PDF generation" },
  { key: "PURCHASE_EMAIL_PO", name: "Email PO sending", description: "Email PO sending" },

  { key: "SALES", name: "SALES & ORDER MANAGEMENT MODULE", description: "Sales & Order Management" },
  { key: "SALES_QUOTATIONS", name: "Quotations", description: "Quotations" },
  { key: "SALES_ORDERS", name: "Sales orders", description: "Sales orders" },
  { key: "SALES_INVOICING", name: "Invoice generation", description: "Invoice generation" },
  { key: "SALES_TAX_CALC", name: "Tax calculations", description: "Tax calculations" },
  { key: "SALES_PRICING", name: "Customer-wise pricing", description: "Customer-wise pricing" },
  { key: "SALES_DISCOUNT", name: "Discount system", description: "Discount system" },
  { key: "SALES_RETURNS", name: "Returns/refunds", description: "Returns/refunds" },
  { key: "SALES_CREDIT_NOTES", name: "Credit notes", description: "Credit notes" },
  { key: "SALES_DELIVERY", name: "Delivery scheduling", description: "Delivery scheduling" },
  { key: "SALES_PAYMENTS", name: "Payment tracking", description: "Payment tracking" },
  { key: "SALES_INVOICE_PDF", name: "Invoice PDF generation", description: "Invoice PDF generation" },
  { key: "SALES_EMAIL_INVOICES", name: "Email invoices", description: "Email invoices" },
  { key: "SALES_STATEMENTS", name: "Customer statements", description: "Customer statements" },
  { key: "SALES_ANALYTICS", name: "Sales analytics", description: "Sales analytics" },

  { key: "HR", name: "HRM MODULE", description: "Human Resource Management" },
  { key: "HR_PROFILES", name: "Employee profiles", description: "Employee profiles" },
  { key: "HR_ATTENDANCE", name: "Attendance management", description: "Attendance management" },
  { key: "HR_LEAVE", name: "Leave management", description: "Leave management" },
  { key: "HR_PAYROLL", name: "Payroll management", description: "Payroll management" },
  { key: "HR_SALARY_SLIPS", name: "Salary slips", description: "Salary slips" },
  { key: "HR_REIMBURSEMENTS", name: "Reimbursements", description: "Reimbursements" },
  { key: "HR_RECRUITMENT", name: "Recruitment management", description: "Recruitment management" },
  { key: "HR_SHIFT", name: "Shift management", description: "Shift management" },
  { key: "HR_PERFORMANCE", name: "Performance tracking", description: "Performance tracking" },
  { key: "HR_REPORTS", name: "Payroll reports", description: "Payroll reports" },
  { key: "HR_DOCUMENTS", name: "Employee document storage", description: "Employee document storage" },

  { key: "MANUFACTURING", name: "MANUFACTURING / PRODUCTION MODULE", description: "Manufacturing & Production" },
  { key: "MANUFACTURING_BOM", name: "BOM (Bill of Materials)", description: "BOM (Bill of Materials)" },
  { key: "MANUFACTURING_ORDERS", name: "Production orders", description: "Production orders" },
  { key: "MANUFACTURING_WORK_ORDERS", name: "Work orders", description: "Work orders" },
  { key: "MANUFACTURING_PLANNING", name: "Production planning", description: "Production planning" },
  { key: "MANUFACTURING_MATERIAL", name: "Raw material consumption", description: "Raw material consumption" },
  { key: "MANUFACTURING_TRACKING", name: "Production tracking", description: "Production tracking" },
  { key: "MANUFACTURING_FG", name: "Finished goods tracking", description: "Finished goods tracking" },
  { key: "MANUFACTURING_MACHINE", name: "Machine allocation", description: "Machine allocation" },
  { key: "MANUFACTURING_SHIFT", name: "Shift planning", description: "Shift planning" },
  { key: "MANUFACTURING_QUALITY", name: "Quality inspections", description: "Quality inspections" },
  { key: "MANUFACTURING_COSTING", name: "Production costing", description: "Production costing" },
  { key: "MANUFACTURING_SCRAP", name: "Scrap tracking", description: "Scrap tracking" },

  { key: "CRM", name: "CRM MODULE", description: "Customer Relationship Management" },
  { key: "CRM_LEADS", name: "Lead management", description: "Lead management" },
  { key: "CRM_CUSTOMER", name: "Customer management", description: "Customer management" },
  { key: "CRM_PIPELINE", name: "Sales pipeline", description: "Sales pipeline" },
  { key: "CRM_FOLLOWUP", name: "Follow-up reminders", description: "Follow-up reminders" },
  { key: "CRM_OPPORTUNITY", name: "Opportunity tracking", description: "Opportunity tracking" },
  { key: "CRM_STAGES", name: "Lead stages", description: "Lead stages" },
  { key: "CRM_NOTES", name: "Communication notes", description: "Communication notes" },
  { key: "CRM_DASHBOARD", name: "Sales funnel dashboard", description: "Sales funnel dashboard" },

  { key: "QUALITY", name: "QUALITY MANAGEMENT + MAINTENANCE MODULE", description: "Quality & Maintenance" },
  { key: "QUALITY_INSPECTION", name: "Quality inspections", description: "Quality inspections" },
  { key: "QUALITY_DEFECTS", name: "Defect tracking", description: "Defect tracking" },
  { key: "QUALITY_CAPA", name: "CAPA management", description: "CAPA management" },
  { key: "QUALITY_AUDIT", name: "Audit scheduling", description: "Audit scheduling" },
  { key: "QUALITY_TESTING", name: "Product testing", description: "Product testing" },
  { key: "QUALITY_REPORTS", name: "Inspection reports", description: "Inspection reports" },
  { key: "MAINTENANCE_PREVENTIVE", name: "Preventive maintenance", description: "Preventive maintenance" },
  { key: "MAINTENANCE_BREAKDOWN", name: "Breakdown logging", description: "Breakdown logging" },
  { key: "MAINTENANCE_SCHEDULES", name: "Machine maintenance schedules", description: "Machine maintenance schedules" },
  { key: "MAINTENANCE_SPARES", name: "Spare part tracking", description: "Spare part tracking" },
  { key: "MAINTENANCE_TECHNICIAN", name: "Technician assignments", description: "Technician assignments" },
  { key: "MAINTENANCE_HISTORY", name: "Maintenance history", description: "Maintenance history" },

  { key: "EMAIL", name: "GENERAL EMAIL SYSTEM", description: "Global Email System" },
  { key: "EMAIL_SMTP", name: "SMTP configuration", description: "SMTP configuration" },
  { key: "EMAIL_TEMPLATES", name: "Email templates", description: "Email templates" },
  { key: "EMAIL_INVOICE", name: "Invoice emails", description: "Invoice emails" },
  { key: "EMAIL_PO", name: "PO emails", description: "PO emails" },
  { key: "EMAIL_APPROVAL", name: "Approval emails", description: "Approval emails" },
  { key: "EMAIL_OTP", name: "OTP emails", description: "OTP emails" },
  { key: "EMAIL_PAYROLL", name: "Payroll emails", description: "Payroll emails" },
  { key: "EMAIL_REPORT", name: "Report emails", description: "Report emails" },
  { key: "EMAIL_QUEUE", name: "Email queue system", description: "Email queue system" },
  { key: "EMAIL_RETRY", name: "Retry mechanism", description: "Retry mechanism" },
  { key: "EMAIL_ATTACHMENT", name: "Attachment support", description: "Attachment support" },
  { key: "EMAIL_LOGS", name: "Email logs/history", description: "Email logs/history" },
  { key: "EMAIL_EDITOR", name: "Template editor", description: "Template editor" },
  { key: "EMAIL_TOGGLE", name: "Super admin feature toggle", description: "Super admin feature toggle" },
  { key: "EMAIL_ENABLE", name: "Company-wise email enable/disable", description: "Company-wise email enable/disable" },
  { key: "EMAIL_QUOTA", name: "SMTP quota management", description: "SMTP quota management" },

  { key: "DASHBOARD", name: "CUSTOMIZABLE DASHBOARD FEATURES", description: "Customizable Dashboards" },
  { key: "DASHBOARD_DRAG_DROP", name: "Drag/drop widgets", description: "Drag/drop widgets" },
  { key: "DASHBOARD_RESIZE", name: "Resize widgets", description: "Resize widgets" },
  { key: "DASHBOARD_HIDE_SHOW", name: "Hide/show widgets", description: "Hide/show widgets" },
  { key: "DASHBOARD_SAVE", name: "Save layouts", description: "Save layouts" },
  { key: "DASHBOARD_RESTORE", name: "Restore layouts", description: "Restore layouts" },
  { key: "DASHBOARD_PIN", name: "Pin shortcuts", description: "Pin shortcuts" },
  { key: "DASHBOARD_KPI", name: "KPI cards", description: "KPI cards" },
  { key: "DASHBOARD_ANALYTICS", name: "Analytics cards", description: "Analytics cards" },
  { key: "DASHBOARD_APPROVALS", name: "Pending approvals widget", description: "Pending approvals widget" },
  { key: "DASHBOARD_NOTIFICATIONS", name: "Notifications widget", description: "Notifications widget" },
  { key: "DASHBOARD_REVENUE", name: "Revenue charts", description: "Revenue charts" },
  { key: "DASHBOARD_ALERTS", name: "Inventory alerts", description: "Inventory alerts" },
  { key: "DASHBOARD_REALTIME", name: "Realtime dashboard updates", description: "Realtime dashboard updates" },

    { key: "GENERAL", name: "GENERAL CONFIGURATION", description: "General Chat & Expenses" },
  { key: "GENERAL_CHAT", name: "General Chat", description: "General Chat" },
  { key: "GENERAL_EXPENSE_CHAT", name: "Expense Chat", description: "Expense Chat" },

  { key: "NOTIFICATIONS", name: "NOTIFICATIONS & ALERTS", description: "Enable system alerts and logs" },
  { key: "NOTIFICATIONS_PUSH", name: "Push Notifications", description: "Receive real-time push events on devices" },
  { key: "NOTIFICATIONS_AUDIT", name: "System Audit Logs", description: "View secure administrative history trails" }
];

// Global reference to the WebSockets emitter
export let ioInstance: any = null;
export function setIoInstance(io: any) {
  ioInstance = io;
}

// Socket Realtime Alert Helper
function triggerRealtimeAlert(userId: string, notification: any) {
  if (ioInstance) {
    ioInstance.to(userId).emit('notification', notification);
    console.log(`📡 [WebSocket] Sent real-time alert to user ${userId}: "${notification.title}"`);
  }
}

// ==========================================
// 1. PUBLIC AUTH CONTROLLERS
// ==========================================

export async function requestSignupOTP(req: AuthenticatedRequest, res: Response) {
  try {
    const { mobileNo } = req.body;
    if (!mobileNo) {
      return res.status(400).json({ error: "Mobile number is required to send OTP" });
    }
    
    await sendSimulatedOTP(mobileNo);
    return res.json({ message: "Simulated OTP sent successfully! Check server logs." });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function signup(req: AuthenticatedRequest, res: Response) {
  try {
    const parsed = SignupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { companyCode, username, password, mobileNo, email, otpCode } = req.body;

    // Verify OTP
    if (!otpCode) {
      return res.status(400).json({ error: "OTP code is required for verification" });
    }
    const isOtpValid = await verifySimulatedOTP(mobileNo, otpCode);
    if (!isOtpValid) {
      return res.status(400).json({ error: "Invalid or expired OTP code" });
    }

    // Check if company exists
    const company = await prisma.company.findUnique({
      where: { companyCode: companyCode.toUpperCase() }
    });
    if (!company) {
      return res.status(404).json({ error: `Company with code '${companyCode}' does not exist.` });
    }

    // Check if username already exists in this company
    const existingUser = await prisma.user.findFirst({
      where: {
        companyId: company.id,
        username
      }
    });
    if (existingUser) {
      return res.status(409).json({ error: `Username '${username}' is already taken in this company.` });
    }

    // Check if mobile number is already registered
    const existingMobile = await prisma.user.findUnique({
      where: { mobileNo }
    });
    if (existingMobile) {
      return res.status(409).json({ error: "Mobile number is already registered to another user." });
    }

    // Hash password & create user
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        username,
        passwordHash,
        mobileNo,
        email: email || null,
        status: "PENDING_APPROVAL" // Needs Admin Approval!
      }
    });

    // Notify Company Admin about the new signup
    const companyAdmins = await prisma.user.findMany({
      where: {
        companyId: company.id,
        role: { name: "Admin" }
      }
    });

    for (const admin of companyAdmins) {
      const dbNotification = await prisma.notification.create({
        data: {
          userId: admin.id,
          title: "New Signup Awaiting Approval",
          message: `User '${username}' has signed up and is waiting for your approval.`,
          category: "system",
          channels: "in_app"
        }
      });
      triggerRealtimeAlert(admin.id, dbNotification);
    }

    return res.status(201).json({
      message: "Signup successful! Please wait for your company admin's approval.",
      user: { id: user.id, username: user.username, status: user.status }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function login(req: AuthenticatedRequest, res: Response) {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { companyCode, username, password } = req.body;

    // Check if user is trying to log in as Super Admin
    if (companyCode.toUpperCase() === "SUPERADMIN" && username === "superadmin") {
      // For local demo, we have a default static SuperAdmin account
      const superAdminPass = "superadmin123";
      if (password !== superAdminPass) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = generateToken({
        userId: "superadmin-static-id",
        username: "superadmin",
        companyId: "superadmin-company",
        companyCode: "SUPERADMIN",
        role: "SuperAdmin",
        isSuperAdmin: true
      });

      return res.json({
        message: "Logged in as Super Admin successfully",
        token,
        user: { username: "superadmin", role: "SuperAdmin", isSuperAdmin: true }
      });
    }

    // Check Company
    const company = await prisma.company.findUnique({
      where: { companyCode: companyCode.toUpperCase() }
    });
    if (!company) {
      return res.status(404).json({ error: "Company code does not exist" });
    }
    if (company.status !== "ACTIVE") {
      return res.status(403).json({ error: "Company account has been suspended" });
    }

    // Find User
    const user = await prisma.user.findFirst({
      where: {
        companyId: company.id,
        username
      },
      include: { role: true }
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Validate Password
    const isPassValid = await comparePassword(password, user.passwordHash);
    if (!isPassValid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Validate User Status
    if (user.status === "PENDING_APPROVAL") {
      return res.status(403).json({ error: "Your account is pending administrator approval." });
    }
    if (user.status === "SUSPENDED") {
      return res.status(403).json({ error: "Your user account has been suspended by the administrator." });
    }

    const token = generateToken({
      userId: user.id,
      username: user.username,
      companyId: company.id,
      companyCode: company.companyCode,
      role: user.role?.name || null,
      isSuperAdmin: false
    });

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        companyCode: company.companyCode,
        companyName: company.name,
        role: user.role?.name || null,
        isSuperAdmin: false,
        hasBackupAccess: user.hasBackupAccess,
        backupAccess: company.backupAccess
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 2. SUPER ADMIN CONTROLLERS
// ==========================================

export async function createCompany(req: AuthenticatedRequest, res: Response) {
  try {
    const parsed = CreateCompanySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const {
      companyCode,
      name,
      subscriptionTier,
      features,
      adminUsername,
      adminMobile,
      adminPassword
    } = req.body;

    // Check if company code already exists
    const existingCompany = await prisma.company.findUnique({
      where: { companyCode: companyCode.toUpperCase() }
    });
    if (existingCompany) {
      return res.status(409).json({ error: `Company Code '${companyCode}' already exists.` });
    }

    // Check if admin mobile already registered
    const existingMobile = await prisma.user.findUnique({
      where: { mobileNo: adminMobile }
    });
    if (existingMobile) {
      return res.status(409).json({ error: "Admin mobile number already in use." });
    }

    // Create Company
    const company = await prisma.company.create({
      data: {
        companyCode: companyCode.toUpperCase(),
        name,
        subscriptionTier,
        status: "ACTIVE"
      }
    });

    // Generate active subscription features
    const defaultFeatures = HIERARCHICAL_FEATURES.map(f => f.key);
    let activeFeatureKeys: string[] = ["NOTIFICATIONS", "NOTIFICATIONS_PUSH", "NOTIFICATIONS_AUDIT"];
    if (features && Array.isArray(features)) {
      activeFeatureKeys = features.map((f: string) => f.toUpperCase());
    } else {
      if (subscriptionTier === "BASIC") {
        activeFeatureKeys.push("CRM", "CRM_LEADS", "CRM_CUSTOMER");
      } else if (subscriptionTier === "PREMIUM") {
        activeFeatureKeys.push("CRM", "CRM_LEADS", "CRM_CUSTOMER", "HR", "HR_ROSTER", "HR_ATTENDANCE");
      } else {
        activeFeatureKeys = [...defaultFeatures];
      }
    }

    if (!activeFeatureKeys.includes("NOTIFICATIONS")) {
      activeFeatureKeys.push("NOTIFICATIONS");
    }

    // Ensure all hierarchical features exist in the DB, then map them
    for (const item of HIERARCHICAL_FEATURES) {
      await prisma.feature.upsert({
        where: { key: item.key },
        update: { name: item.name, description: item.description },
        create: { key: item.key, name: item.name, description: item.description }
      });
    }

    const dbFeatures = await prisma.feature.findMany({
      where: { key: { in: activeFeatureKeys } }
    });

    for (const f of dbFeatures) {
      await prisma.companyFeature.create({
        data: {
          companyId: company.id,
          featureId: f.id
        }
      });
    }

    // Create default "Admin" role for the company
    const adminRole = await prisma.role.create({
      data: {
        companyId: company.id,
        name: "Admin",
        permissions: JSON.stringify({
          CRM: ["read", "write", "delete"],
          HR: ["read", "write", "delete"],
          FINANCE: ["read", "write", "delete"],
          NOTIFICATIONS: ["read", "write", "delete"]
        })
      }
    });

    // Create the Company Admin User (Bypasses approvals!)
    const adminHash = await hashPassword(adminPassword);
    const adminUser = await prisma.user.create({
      data: {
        companyId: company.id,
        username: adminUsername,
        passwordHash: adminHash,
        mobileNo: adminMobile,
        status: "ACTIVE", // Auto active!
        roleId: adminRole.id
      }
    });

    return res.status(201).json({
      message: `Company '${name}' created successfully with code '${companyCode}'.`,
      company,
      adminUser: { id: adminUser.id, username: adminUser.username, status: adminUser.status }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateCompany(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const parsed = UpdateCompanySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { name, companyCode, createdAt, status, features, fileSizeLimit, backupAccess, backupRetentionDays } = req.body;

    const company = await prisma.company.findUnique({
      where: { id }
    });
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    if (companyCode && companyCode.toUpperCase() !== company.companyCode) {
      const existing = await prisma.company.findUnique({
        where: { companyCode: companyCode.toUpperCase() }
      });
      if (existing) {
        return res.status(409).json({ error: `Company Code '${companyCode}' already exists.` });
      }
    }

    const updatedData: any = {
      ...(name && { name }),
      ...(companyCode && { companyCode: companyCode.toUpperCase() }),
      ...(status && { status }),
      ...(fileSizeLimit !== undefined && { fileSizeLimit: Number(fileSizeLimit) }),
      ...(backupAccess !== undefined && { backupAccess: Boolean(backupAccess) }),
      ...(backupRetentionDays !== undefined && { backupRetentionDays: Number(backupRetentionDays) })
    };

    if (createdAt) {
      const date = new Date(createdAt);
      if (!isNaN(date.getTime())) {
        updatedData.createdAt = date;
      } else {
        return res.status(400).json({ error: "Invalid joining date format" });
      }
    }

    const updatedCompany = await prisma.company.update({
      where: { id },
      data: updatedData
    });

    if (features && Array.isArray(features)) {
      await prisma.companyFeature.deleteMany({
        where: { companyId: id }
      });

      const activeFeatureKeys = [...features];
      if (!activeFeatureKeys.includes("NOTIFICATIONS")) {
        activeFeatureKeys.push("NOTIFICATIONS");
      }

      for (const item of HIERARCHICAL_FEATURES) {
        await prisma.feature.upsert({
          where: { key: item.key },
          update: { name: item.name, description: item.description },
          create: { key: item.key, name: item.name, description: item.description }
        });
      }

      const dbFeatures = await prisma.feature.findMany({
        where: { key: { in: activeFeatureKeys } }
      });

      for (const f of dbFeatures) {
        await prisma.companyFeature.create({
          data: {
            companyId: id,
            featureId: f.id
          }
        });
      }
    }

    return res.json({
      message: `Company '${updatedCompany.name}' updated successfully.`,
      company: updatedCompany
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function listCompanyUsers(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const company = await prisma.company.findUnique({
      where: { id }
    });
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    const users = await prisma.user.findMany({
      where: { companyId: id },
      include: { role: true },
      orderBy: { createdAt: 'desc' }
    });

    const sanitized = users.map(u => ({
      id: u.id,
      username: u.username,
      mobileNo: u.mobileNo,
      email: u.email,
      status: u.status,
      role: u.role?.name || null,
      roleId: u.roleId,
      createdAt: u.createdAt
    }));

    return res.json({ users: sanitized });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createCompanyAdmin(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const parsed = CreateCompanyAdminSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { username, mobileNo, password, email } = req.body;

    const company = await prisma.company.findUnique({
      where: { id }
    });
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    const existingUser = await prisma.user.findFirst({
      where: { companyId: id, username }
    });
    if (existingUser) {
      return res.status(409).json({ error: `Username '${username}' is already taken in this company.` });
    }

    const existingMobile = await prisma.user.findUnique({
      where: { mobileNo }
    });
    if (existingMobile) {
      return res.status(409).json({ error: "Mobile number is already registered to another user." });
    }

    let adminRole = await prisma.role.findFirst({
      where: { companyId: id, name: "Admin" }
    });
    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          companyId: id,
          name: "Admin",
          permissions: JSON.stringify({
            CRM: ["read", "write", "delete"],
            HR: ["read", "write", "delete"],
            FINANCE: ["read", "write", "delete"],
            NOTIFICATIONS: ["read", "write", "delete"]
          })
        }
      });
    }

    const passwordHash = await hashPassword(password);
    const adminUser = await prisma.user.create({
      data: {
        companyId: id,
        username,
        passwordHash,
        mobileNo,
        email: email || null,
        status: "ACTIVE",
        roleId: adminRole.id
      }
    });

    return res.status(201).json({
      message: `Admin user '${username}' created successfully for company '${company.name}'.`,
      user: { id: adminUser.id, username: adminUser.username, status: adminUser.status }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateCompanyUser(req: AuthenticatedRequest, res: Response) {
  try {
    const { id, userId } = req.params;
    const parsed = UpdateCompanyUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { username, mobileNo, password, email, status, roleId } = req.body;

    const user = await prisma.user.findFirst({
      where: { id: userId, companyId: id }
    });
    if (!user) {
      return res.status(404).json({ error: "User not found in this company." });
    }

    if (username && username !== user.username) {
      const existingUser = await prisma.user.findFirst({
        where: { companyId: id, username }
      });
      if (existingUser) {
        return res.status(409).json({ error: `Username '${username}' is already taken in this company.` });
      }
    }

    if (mobileNo && mobileNo !== user.mobileNo) {
      const existingMobile = await prisma.user.findUnique({
        where: { mobileNo }
      });
      if (existingMobile) {
        return res.status(409).json({ error: "Mobile number is already registered to another user." });
      }
    }

    if (roleId) {
      const role = await prisma.role.findFirst({
        where: { id: roleId, companyId: id }
      });
      if (!role) {
        return res.status(404).json({ error: "Assigned role not found in this company." });
      }
    }

    const updatedData: any = {
      ...(username && { username }),
      ...(mobileNo && { mobileNo }),
      ...(email !== undefined && { email: email || null }),
      ...(status && { status }),
      ...(roleId !== undefined && { roleId })
    };

    if (password) {
      updatedData.passwordHash = await hashPassword(password);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updatedData
    });

    return res.json({
      message: `User '${updatedUser.username}' updated successfully.`,
      user: { id: updatedUser.id, username: updatedUser.username, status: updatedUser.status }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteCompanyUser(req: AuthenticatedRequest, res: Response) {
  try {
    const { id, userId } = req.params;

    const user = await prisma.user.findFirst({
      where: { id: userId, companyId: id }
    });
    if (!user) {
      return res.status(404).json({ error: "User not found in this company." });
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    return res.json({ message: `User '${user.username}' deleted successfully.` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function listCompanies(req: AuthenticatedRequest, res: Response) {
  try {
    const companies = await prisma.company.findMany({
      include: {
        features: { include: { feature: true } },
        _count: { select: { users: true } }
      }
    });
    return res.json({ companies });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 3. COMPANY ADMIN CONTROLLERS
// ==========================================

export async function listPendingSignups(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    const pendingUsers = await prisma.user.findMany({
      where: {
        companyId,
        status: "PENDING_APPROVAL"
      },
      select: {
        id: true,
        username: true,
        mobileNo: true,
        email: true,
        createdAt: true
      }
    });

    return res.json({ pendingUsers });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function approveSignup(req: AuthenticatedRequest, res: Response) {
  try {
    const parsed = ApproveUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { userId, roleId } = req.body;
    const companyId = req.user?.companyId;

    // Verify user belongs to admin's company
    const userToApprove = await prisma.user.findFirst({
      where: { id: userId, companyId }
    });

    if (!userToApprove) {
      return res.status(404).json({ error: "Pending user not found within your company" });
    }

    // Verify role belongs to company
    const role = await prisma.role.findFirst({
      where: { id: roleId, companyId }
    });

    if (!role) {
      return res.status(404).json({ error: "Assigned role not found within your company" });
    }

    // Approve user and set role
    const approvedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        status: "ACTIVE",
        roleId: role.id
      }
    });

    // Send notification log to approved user
    const dbNotification = await prisma.notification.create({
      data: {
        userId,
        title: "Account Approved",
        message: `Welcome to the system! Your account has been approved by the Admin and you are assigned the '${role.name}' role.`,
        category: "system",
        channels: "in_app"
      }
    });
    triggerRealtimeAlert(userId, dbNotification);

    return res.json({
      message: `User '${userToApprove.username}' approved successfully as '${role.name}'.`,
      user: { id: approvedUser.id, username: approvedUser.username, status: approvedUser.status }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createRole(req: AuthenticatedRequest, res: Response) {
  try {
    const parsed = CreateRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { name, permissions } = req.body;
    const companyId = req.user?.companyId;

    // Check if role name already exists in the company
    const existingRole = await prisma.role.findFirst({
      where: { companyId, name }
    });
    if (existingRole) {
      return res.status(409).json({ error: `Role with name '${name}' already exists in your company.` });
    }

    const role = await prisma.role.create({
      data: {
        companyId,
        name,
        permissions: JSON.stringify(permissions)
      }
    });

    return res.status(201).json({
      message: `Role '${name}' created successfully.`,
      role: { id: role.id, name: role.name, permissions }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getCompanyRolesAndUsers(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;

    const roles = await prisma.role.findMany({
      where: { companyId }
    });

    const parsedRoles = roles.map(r => ({
      ...r,
      permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions
    }));

    const users = await prisma.user.findMany({
      where: { companyId },
      include: { role: true },
      orderBy: { createdAt: 'desc' }
    });

    const sanitizedUsers = users.map(u => ({
      id: u.id,
      username: u.username,
      mobileNo: u.mobileNo,
      email: u.email,
      status: u.status,
      role: u.role?.name || null,
      createdAt: u.createdAt,
      hasBackupAccess: u.hasBackupAccess
    }));

    // Fetch active subscription features
    const activeFeatures = await prisma.companyFeature.findMany({
      where: { companyId },
      include: { feature: true }
    });

    return res.json({
      roles: parsedRoles,
      users: sanitizedUsers,
      features: activeFeatures.map(af => af.feature.key)
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 4. NOTIFICATION CONTROLLERS
// ==========================================

export async function listNotifications(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return res.json({ notifications });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function markAsRead(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const notification = await prisma.notification.findFirst({
      where: { id, userId }
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    return res.json({ message: "Notification marked as read successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function registerPushToken(req: AuthenticatedRequest, res: Response) {
  try {
    const { deviceToken, platform } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: User ID missing" });
    }

    if (!deviceToken || !platform) {
      return res.status(400).json({ error: "deviceToken and platform are required" });
    }

    await prisma.pushToken.upsert({
      where: { deviceToken },
      update: { userId, platform },
      create: { userId, deviceToken, platform }
    });

    return res.json({ message: "Push token registered successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// Export all General Administration Controllers
export * from './admin';

