import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import {
  authenticateToken,
  requireSuperAdmin
} from './middlewares/auth';
import {
  requestSignupOTP,
  signup,
  login,
  logout,
  updateSelfProfile,
  resetPassword,
  requestForgotPasswordOTP,
  createCompany,
  updateCompany,
  listCompanyUsers,
  createCompanyAdmin,
  updateCompanyUser,
  deleteCompanyUser,
  listCompanies,
  listPendingSignups,
  approveSignup,
  createRole,
  getCompanyRolesAndUsers,
  listNotifications,
  markAsRead,
  registerPushToken,
  setIoInstance,
  getCompanyProfile,
  updateCompanyProfile,
  archiveNotification,
  getCompanyFeatures,
  toggleCompanyFeature
} from './controllers';
import {
  listChatGroups,
  createChatGroup,
  getChatGroupMessages,
  sendChatGroupMessage,
  manageChatGroupMembers,
  updateChatGroupSettings,
  getCompanyChatStats
} from './controllers/chat';

import {
  listTaxes,
  createTax,
  updateTax,
  deleteTax
} from './controllers/taxes';

import {
  listLeads,
  createLead,
  updateLead,
  deleteLead,
  listOpportunities,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  listFollowUps,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
  getCrmStats
} from './controllers/crm';

import {
  listVendorQuotations,
  createVendorQuotation,
  updateVendorQuotationStatus,
  deleteVendorQuotation,
  listPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  deletePurchaseOrder,
  listGrns,
  createGrn,
  deleteGrn,
  listPurchaseReturns,
  createPurchaseReturn,
  deletePurchaseReturn,
  listVendorPayments,
  createVendorPayment,
  deleteVendorPayment
} from './controllers/purchases';

import {
  listStockAdjustments,
  adjustStock
} from './controllers/inventory';

import {
  listQuotations,
  createQuotation,
  updateQuotationStatus,
  deleteQuotation,
  listServiceTickets,
  createServiceTicket,
  updateServiceTicket,
  deleteServiceTicket
} from './controllers/sales';

import {
  listEmployees,
  updateEmployee,
  listAttendance,
  punchAttendance,
  listLeaveRequests,
  createLeaveRequest,
  updateLeaveRequestStatus,
  listShiftRosters,
  createShiftRoster,
  listPayroll,
  generatePayroll,
  disbursePayroll
} from './controllers/hrms';

import {
  listExpenses,
  createExpense,
  listPayments,
  createPayment,
  listReceipts,
  createReceipt,
  listCashbookVouchers,
  getGstWorksheet,
  listBankAccounts,
  createBankAccount
} from './controllers/finance';

import {
  getSalesReport,
  getPurchaseReport,
  getInventoryReport,
  getHrReport,
  getFinancialReport
} from './controllers/reports';

dotenv.config();
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is missing in environment variables');
}
const app = express();
const port = process.env.PORT || 5000;

// Production security and performance middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));
app.use(compression());

// Define whitelisted production origins for CORS
const allowedOrigins = [
  'http://localhost:5173',
  'https://localhost',
  'http://tauri.localhost',
  'https://erp.anbindustries.com',
  'https://yourfrontend.vercel.app'
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.includes(origin) ||
                      /^(http|https):\/\/localhost(:\d+)?$/.test(origin) ||
                      origin.startsWith('tauri://') ||
                      origin.startsWith('capacitor://');
                      
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('❌ BLOCKED ORIGIN:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};

// Enable CORS and JSON parsing middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Set up rate limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/', authLimiter);

// Serve static assets for uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Setup HTTP and WebSockets
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed = allowedOrigins.includes(origin) || 
                        /^(http|https):\/\/localhost(:\d+)?$/.test(origin) ||
                        origin.startsWith('tauri://') ||
                        origin.startsWith('capacitor://');
      if (isAllowed) {
        callback(null, true);
      } else {
        console.log('❌ BLOCKED ORIGIN:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket']
});

// Share Socket.io instance with controllers
setIoInstance(io);

io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    socket.data.user = decoded;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

// WebSocket Connection Handler
io.on('connection', (socket) => {
  socket.on('join_group', (groupId: string) => {
    socket.join(`group_${groupId}`);
  });

  socket.on('leave_group', (groupId: string) => {
    socket.leave(`group_${groupId}`);
  });

  socket.on('disconnect', () => {
    // Client disconnected
  });
});

// ==========================================
// API ROUTING MODULES
// ==========================================

// Public Health Probe Route
app.get('/health', (req, res) => {
  res.json({ status: "healthy", service: "Enterprise Multi-Tenant ERP", timestamp: new Date() });
});

// 1. Core Authentication Routes
app.post('/api/auth/otp-request', requestSignupOTP);
app.post('/api/auth/signup', signup);
app.post('/api/auth/login', login);
app.post('/api/auth/logout', authenticateToken, logout);
app.patch('/api/auth/profile', authenticateToken, updateSelfProfile);
app.post('/api/auth/reset-password', resetPassword);
app.post('/api/auth/forgot-password-otp', requestForgotPasswordOTP);

// 2. Super Admin Routes (Create Companies & Manage Global Tiers)
app.post('/api/super/company', authenticateToken, requireSuperAdmin, createCompany);
app.get('/api/super/companies', authenticateToken, requireSuperAdmin, listCompanies);
app.patch('/api/super/company/:id', authenticateToken, requireSuperAdmin, updateCompany);
app.get('/api/super/company/:id/users', authenticateToken, requireSuperAdmin, listCompanyUsers);
app.post('/api/super/company/:id/admins', authenticateToken, requireSuperAdmin, createCompanyAdmin);
app.patch('/api/super/company/:id/users/:userId', authenticateToken, requireSuperAdmin, updateCompanyUser);
app.delete('/api/super/company/:id/users/:userId', authenticateToken, requireSuperAdmin, deleteCompanyUser);

// 3. Company Admin Routes (Approvals & RBAC Configurations)
app.get('/api/admin/pending-signups', authenticateToken, listPendingSignups);
app.post('/api/admin/approve', authenticateToken, approveSignup);
app.post('/api/admin/role', authenticateToken, createRole);
app.get('/api/admin/dashboard', authenticateToken, getCompanyRolesAndUsers);

// 4. Integrated Multi-Channel Notifications Routes
app.get('/api/notifications', authenticateToken, listNotifications);
app.patch('/api/notifications/:id/read', authenticateToken, markAsRead);
app.post('/api/notifications/register-token', authenticateToken, registerPushToken);
app.patch('/api/notifications/:id/archive', authenticateToken, archiveNotification);

// 5. Enterprise Real-time Chat & Expense Spaces Routes
app.get('/api/chat/groups', authenticateToken, listChatGroups);
app.get('/api/chat/stats', authenticateToken, getCompanyChatStats);
app.post('/api/chat/group', authenticateToken, createChatGroup);
app.get('/api/chat/group/:groupId/messages', authenticateToken, getChatGroupMessages);
app.post('/api/chat/group/:groupId/message', authenticateToken, sendChatGroupMessage);
app.post('/api/chat/group/:groupId/members', authenticateToken, manageChatGroupMembers);
app.patch('/api/chat/group/:groupId/settings', authenticateToken, updateChatGroupSettings);

import prisma from './services/db';
import { HIERARCHICAL_FEATURES } from './controllers';
import {
  listAuditLogs,
  listBackups,
  triggerBackup,
  downloadBackup,
  updateBackupSettings,
  createUserForAdmin,
  updateUserForAdmin,
  deleteUserForAdmin,
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  updateRolePermissions,
  deleteRoleForAdmin,
  requestBackupOTP,
  deleteBackup,
  restoreBackup
} from './controllers/admin_endpoints';

import {
  listCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  listVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  listCategories,
  createCategory,
  deleteCategory,
  listBrands,
  createBrand,
  deleteBrand,
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct
} from './controllers/master_data';

import {
  listSalesOrders,
  createSalesOrder,
  updateSalesOrder,
  deleteSalesOrder,
  listProformaInvoices,
  createProformaInvoice,
  updateProformaInvoice,
  deleteProformaInvoice,
  sendProformaInvoiceEmail,
  listSalesInvoices,
  createSalesInvoice,
  updateSalesInvoice,
  deleteSalesInvoice,
  sendSalesInvoiceEmail,
  listDeliveryChallans,
  createDeliveryChallan,
  updateDeliveryChallan,
  deleteDeliveryChallan,
  sendDeliveryChallanEmail,
  listDispatches,
  createDispatch,
  updateDispatch,
  deleteDispatch
} from './controllers/sales';

// 6. General Administration Module Routes (Company Profile & Features Only)
app.get('/api/admin/company/profile', authenticateToken, getCompanyProfile);
app.patch('/api/admin/company/profile', authenticateToken, updateCompanyProfile);
app.get('/api/admin/features', authenticateToken, getCompanyFeatures);
app.post('/api/super/feature/toggle', authenticateToken, requireSuperAdmin, toggleCompanyFeature);

// 7. Advanced Company Administration Console REST APIs (Company Admin Scoped)
app.get('/api/admin/audit-logs', authenticateToken, listAuditLogs);
app.get('/api/admin/backups', authenticateToken, listBackups);
app.post('/api/admin/backups', authenticateToken, triggerBackup);
app.patch('/api/admin/backups/settings', authenticateToken, updateBackupSettings);
app.get('/api/admin/backups/download/:filename', authenticateToken, downloadBackup);
app.post('/api/admin/backups/request-otp', authenticateToken, requestBackupOTP);
app.delete('/api/admin/backups/:filename', authenticateToken, deleteBackup);
app.post('/api/admin/backups/reset', authenticateToken, restoreBackup);

app.post('/api/admin/users', authenticateToken, createUserForAdmin);
app.patch('/api/admin/users/:userId', authenticateToken, updateUserForAdmin);
app.delete('/api/admin/users/:userId', authenticateToken, deleteCompanyUser); // Wipes from session registry

app.get('/api/admin/departments', authenticateToken, listDepartments);
app.post('/api/admin/departments', authenticateToken, createDepartment);
app.patch('/api/admin/departments/:deptId', authenticateToken, updateDepartment);
app.delete('/api/admin/departments/:deptId', authenticateToken, deleteDepartment);

app.patch('/api/admin/roles/:roleId', authenticateToken, updateRolePermissions);
app.delete('/api/admin/roles/:roleId', authenticateToken, deleteRoleForAdmin);

// 8. Master Data Management Console REST APIs (Company Admin / User Scoped)
app.get('/api/master/customers', authenticateToken, listCustomers);
app.post('/api/master/customers', authenticateToken, createCustomer);
app.patch('/api/master/customers/:id', authenticateToken, updateCustomer);
app.delete('/api/master/customers/:id', authenticateToken, deleteCustomer);

app.get('/api/master/vendors', authenticateToken, listVendors);
app.post('/api/master/vendors', authenticateToken, createVendor);
app.patch('/api/master/vendors/:id', authenticateToken, updateVendor);
app.delete('/api/master/vendors/:id', authenticateToken, deleteVendor);

app.get('/api/master/categories', authenticateToken, listCategories);
app.post('/api/master/categories', authenticateToken, createCategory);
app.delete('/api/master/categories/:id', authenticateToken, deleteCategory);

app.get('/api/master/brands', authenticateToken, listBrands);
app.post('/api/master/brands', authenticateToken, createBrand);
app.delete('/api/master/brands/:id', authenticateToken, deleteBrand);

app.get('/api/master/products', authenticateToken, listProducts);
app.post('/api/master/products', authenticateToken, createProduct);
app.patch('/api/master/products/:id', authenticateToken, updateProduct);
app.delete('/api/master/products/:id', authenticateToken, deleteProduct);

// 9. Sales Module Scoped Consolidated APIs
app.get('/api/sales/orders', authenticateToken, listSalesOrders);
app.post('/api/sales/orders', authenticateToken, createSalesOrder);
app.patch('/api/sales/orders/:id', authenticateToken, updateSalesOrder);
app.delete('/api/sales/orders/:id', authenticateToken, deleteSalesOrder);

app.get('/api/sales/proforma', authenticateToken, listProformaInvoices);
app.post('/api/sales/proforma', authenticateToken, createProformaInvoice);
app.patch('/api/sales/proforma/:id', authenticateToken, updateProformaInvoice);
app.delete('/api/sales/proforma/:id', authenticateToken, deleteProformaInvoice);
app.post('/api/sales/proforma/:id/email', authenticateToken, sendProformaInvoiceEmail);

app.get('/api/sales/invoices', authenticateToken, listSalesInvoices);
app.post('/api/sales/invoices', authenticateToken, createSalesInvoice);
app.patch('/api/sales/invoices/:id', authenticateToken, updateSalesInvoice);
app.delete('/api/sales/invoices/:id', authenticateToken, deleteSalesInvoice);
app.post('/api/sales/invoices/:id/email', authenticateToken, sendSalesInvoiceEmail);

app.get('/api/sales/challans', authenticateToken, listDeliveryChallans);
app.post('/api/sales/challans', authenticateToken, createDeliveryChallan);
app.patch('/api/sales/challans/:id', authenticateToken, updateDeliveryChallan);
app.delete('/api/sales/challans/:id', authenticateToken, deleteDeliveryChallan);
app.post('/api/sales/challans/:id/email', authenticateToken, sendDeliveryChallanEmail);

app.get('/api/sales/dispatches', authenticateToken, listDispatches);
app.post('/api/sales/dispatches', authenticateToken, createDispatch);
app.patch('/api/sales/dispatches/:id', authenticateToken, updateDispatch);
app.delete('/api/sales/dispatches/:id', authenticateToken, deleteDispatch);

// 9.1 Advanced Sales: Quotations & Post-Sales Maintenance Service CRUDs
app.get('/api/sales/quotations', authenticateToken, listQuotations);
app.post('/api/sales/quotations', authenticateToken, createQuotation);
app.patch('/api/sales/quotations/:id', authenticateToken, updateQuotationStatus);
app.delete('/api/sales/quotations/:id', authenticateToken, deleteQuotation);

app.get('/api/sales/service-tickets', authenticateToken, listServiceTickets);
app.post('/api/sales/service-tickets', authenticateToken, createServiceTicket);
app.patch('/api/sales/service-tickets/:id', authenticateToken, updateServiceTicket);
app.delete('/api/sales/service-tickets/:id', authenticateToken, deleteServiceTicket);

// 9.2 Tax Master CRUD
app.get('/api/master/taxes', authenticateToken, listTaxes);
app.post('/api/master/taxes', authenticateToken, createTax);
app.patch('/api/master/taxes/:id', authenticateToken, updateTax);
app.delete('/api/master/taxes/:id', authenticateToken, deleteTax);

// 9.3 CRM Portal: Leads, Opportunities, Followups and Analytics Stats CRUDs
app.get('/api/crm/leads', authenticateToken, listLeads);
app.post('/api/crm/leads', authenticateToken, createLead);
app.patch('/api/crm/leads/:id', authenticateToken, updateLead);
app.delete('/api/crm/leads/:id', authenticateToken, deleteLead);

app.get('/api/crm/opportunities', authenticateToken, listOpportunities);
app.post('/api/crm/opportunities', authenticateToken, createOpportunity);
app.patch('/api/crm/opportunities/:id', authenticateToken, updateOpportunity);
app.delete('/api/crm/opportunities/:id', authenticateToken, deleteOpportunity);

app.get('/api/crm/followups', authenticateToken, listFollowUps);
app.post('/api/crm/followups', authenticateToken, createFollowUp);
app.patch('/api/crm/followups/:id', authenticateToken, updateFollowUp);
app.delete('/api/crm/followups/:id', authenticateToken, deleteFollowUp);

app.get('/api/crm/stats', authenticateToken, getCrmStats);

// 9.4 Purchase Sourcing: Vendor Quotes, POs, GRN, Returns, Payments CRUDs
app.get('/api/purchase/vendor-quotes', authenticateToken, listVendorQuotations);
app.post('/api/purchase/vendor-quotes', authenticateToken, createVendorQuotation);
app.patch('/api/purchase/vendor-quotes/:id', authenticateToken, updateVendorQuotationStatus);
app.delete('/api/purchase/vendor-quotes/:id', authenticateToken, deleteVendorQuotation);

app.get('/api/purchase/orders', authenticateToken, listPurchaseOrders);
app.post('/api/purchase/orders', authenticateToken, createPurchaseOrder);
app.patch('/api/purchase/orders/:id', authenticateToken, updatePurchaseOrderStatus);
app.delete('/api/purchase/orders/:id', authenticateToken, deletePurchaseOrder);

app.get('/api/purchase/grns', authenticateToken, listGrns);
app.post('/api/purchase/grns', authenticateToken, createGrn);
app.delete('/api/purchase/grns/:id', authenticateToken, deleteGrn);

app.get('/api/purchase/returns', authenticateToken, listPurchaseReturns);
app.post('/api/purchase/returns', authenticateToken, createPurchaseReturn);
app.delete('/api/purchase/returns/:id', authenticateToken, deletePurchaseReturn);

app.get('/api/purchase/payments', authenticateToken, listVendorPayments);
app.post('/api/purchase/payments', authenticateToken, createVendorPayment);
app.delete('/api/purchase/payments/:id', authenticateToken, deleteVendorPayment);

// 9.5 Inventory Warehousing: Ledger listings & manual stock adjustments
app.get('/api/inventory/adjustments', authenticateToken, listStockAdjustments);
app.post('/api/inventory/adjust', authenticateToken, adjustStock);

// 9.6 HRMS Module Routes
app.get('/api/hrms/employees', authenticateToken, listEmployees);
app.patch('/api/hrms/employees/:id', authenticateToken, updateEmployee);
app.get('/api/hrms/attendance', authenticateToken, listAttendance);
app.post('/api/hrms/attendance/punch', authenticateToken, punchAttendance);
app.get('/api/hrms/leaves', authenticateToken, listLeaveRequests);
app.post('/api/hrms/leaves', authenticateToken, createLeaveRequest);
app.patch('/api/hrms/leaves/:id', authenticateToken, updateLeaveRequestStatus);
app.get('/api/hrms/shifts', authenticateToken, listShiftRosters);
app.post('/api/hrms/shifts', authenticateToken, createShiftRoster);
app.get('/api/hrms/payroll', authenticateToken, listPayroll);
app.post('/api/hrms/payroll/generate', authenticateToken, generatePayroll);
app.patch('/api/hrms/payroll/disburse/:id', authenticateToken, disbursePayroll);

// 9.7 Finance & Accounting Module Routes
app.get('/api/finance/expenses', authenticateToken, listExpenses);
app.post('/api/finance/expenses', authenticateToken, createExpense);
app.get('/api/finance/payments', authenticateToken, listPayments);
app.post('/api/finance/payments', authenticateToken, createPayment);
app.get('/api/finance/receipts', authenticateToken, listReceipts);
app.post('/api/finance/receipts', authenticateToken, createReceipt);
app.get('/api/finance/cashbook', authenticateToken, listCashbookVouchers);
app.get('/api/finance/gst-worksheet', authenticateToken, getGstWorksheet);
app.get('/api/finance/bank-accounts', authenticateToken, listBankAccounts);
app.post('/api/finance/bank-accounts', authenticateToken, createBankAccount);

// 9.8 Reports & Analytics Aggregate Routes
app.get('/api/reports/sales', authenticateToken, getSalesReport);
app.get('/api/reports/purchase', authenticateToken, getPurchaseReport);
app.get('/api/reports/inventory', authenticateToken, getInventoryReport);
app.get('/api/reports/hr', authenticateToken, getHrReport);
app.get('/api/reports/financial', authenticateToken, getFinancialReport);

// Automated Seeding Function to ensure feature keys exist and are mapped to companies
async function seedDatabase() {
  try {
    console.log("🌱 [Database Seeding] Ensuring all feature keys exist...");
    for (const item of HIERARCHICAL_FEATURES) {
      await prisma.feature.upsert({
        where: { key: item.key },
        update: { name: item.name, description: item.description },
        create: { key: item.key, name: item.name, description: item.description }
      });
    }

    console.log("🌱 [Database Seeding] Mapping new administration, master data & sales features to existing companies...");
    const coreFeatures = await prisma.feature.findMany({
      where: {
        key: {
          in: [
            "ADMINISTRATION",
            "ADMIN_PROFILE",
            "ADMIN_ROLES",
            "ADMIN_AUDIT",
            "ADMIN_BACKUP",
            "ADMIN_USERS",
            "ADMIN_DEPARTMENTS",
            "MASTER_DATA",
            "MASTER_EMPLOYEE",
            "MASTER_CUSTOMER",
            "MASTER_VENDOR",
            "MASTER_PRODUCT",
            "MASTER_TAX",
            "SALES_DATA",
            "SALES_ORDER",
            "SALES_PROFORMA",
            "SALES_INVOICE",
            "SALES_CHALLAN",
            "SALES_DISPATCH",
            "SALES_QUOTATION",
            "SALES_POST_SERVICE",
            "CRM_DATA",
            "CRM_LEAD",
            "CRM_OPPORTUNITY",
            "CRM_FOLLOWUP",
            "CRM_DASHBOARD",
            "PURCHASE_DATA",
            "PURCHASE_ORDER",
            "PURCHASE_VENDOR_QUOTE",
            "PURCHASE_GRN",
            "PURCHASE_RETURN",
            "PURCHASE_PAYMENT",
            "INVENTORY_DATA",
            "INVENTORY_PRODUCT",
            "INVENTORY_STOCK_OVERVIEW",
            "INVENTORY_LOW_ALERT",

            // Phase 2 Modules
            "HRMS_DATA",
            "HRMS_EMPLOYEES",
            "HRMS_ATTENDANCE",
            "HRMS_LEAVES",
            "HRMS_SHIFTS",
            "HRMS_PAYROLL",
            "FINANCE_DATA",
            "FINANCE_EXPENSES",
            "FINANCE_PAYMENTS",
            "FINANCE_RECEIPTS",
            "FINANCE_CASHBOOK",
            "FINANCE_GST",
            "FINANCE_BANK",
            "REPORTS_DATA",
            "REPORTS_SALES",
            "REPORTS_PURCHASE",
            "REPORTS_INVENTORY",
            "REPORTS_HR",
            "REPORTS_FINANCE"
          ]
        }
      }
    });

    const companies = await prisma.company.findMany();
    for (const company of companies) {
      for (const feature of coreFeatures) {
        const exists = await prisma.companyFeature.findFirst({
          where: { companyId: company.id, featureId: feature.id }
        });
        if (!exists) {
          await prisma.companyFeature.create({
            data: { companyId: company.id, featureId: feature.id }
          });
        }
      }

      // Automatically grant default read/write/delete permissions inside "Admin" role
      const adminRole = await prisma.role.findFirst({
        where: { companyId: company.id, name: "Admin" }
      });
      if (adminRole) {
        let permissions: any = {};
        try {
          permissions = JSON.parse(adminRole.permissions);
        } catch {
          permissions = {};
        }

        permissions.ADMINISTRATION = ["read", "write", "delete"];
        permissions.ADMIN_PROFILE = ["read", "write", "delete"];
        permissions.ADMIN_ROLES = ["read", "write", "delete"];
        permissions.ADMIN_AUDIT = ["read", "write", "delete"];
        permissions.ADMIN_BACKUP = ["read", "write", "delete"];
        permissions.ADMIN_USERS = ["read", "write", "delete"];
        permissions.ADMIN_DEPARTMENTS = ["read", "write", "delete"];

        permissions.MASTER_DATA = ["read", "write", "delete"];
        permissions.MASTER_EMPLOYEE = ["read", "write", "delete"];
        permissions.MASTER_CUSTOMER = ["read", "write", "delete"];
        permissions.MASTER_VENDOR = ["read", "write", "delete"];
        permissions.MASTER_PRODUCT = ["read", "write", "delete"];
        permissions.MASTER_TAX = ["read", "write", "delete"];

        permissions.SALES_DATA = ["read", "write", "delete"];
        permissions.SALES_ORDER = ["read", "write", "delete"];
        permissions.SALES_PROFORMA = ["read", "write", "delete"];
        permissions.SALES_INVOICE = ["read", "write", "delete"];
        permissions.SALES_CHALLAN = ["read", "write", "delete"];
        permissions.SALES_DISPATCH = ["read", "write", "delete"];
        permissions.SALES_QUOTATION = ["read", "write", "delete"];
        permissions.SALES_POST_SERVICE = ["read", "write", "delete"];

        permissions.CRM_DATA = ["read", "write", "delete"];
        permissions.CRM_LEAD = ["read", "write", "delete"];
        permissions.CRM_OPPORTUNITY = ["read", "write", "delete"];
        permissions.CRM_FOLLOWUP = ["read", "write", "delete"];
        permissions.CRM_DASHBOARD = ["read", "write", "delete"];

        permissions.PURCHASE_DATA = ["read", "write", "delete"];
        permissions.PURCHASE_ORDER = ["read", "write", "delete"];
        permissions.PURCHASE_VENDOR_QUOTE = ["read", "write", "delete"];
        permissions.PURCHASE_GRN = ["read", "write", "delete"];
        permissions.PURCHASE_RETURN = ["read", "write", "delete"];
        permissions.PURCHASE_PAYMENT = ["read", "write", "delete"];

        permissions.INVENTORY_DATA = ["read", "write", "delete"];
        permissions.INVENTORY_PRODUCT = ["read", "write", "delete"];
        permissions.INVENTORY_STOCK_OVERVIEW = ["read", "write", "delete"];
        permissions.INVENTORY_LOW_ALERT = ["read", "write", "delete"];

        // Phase 2 Modules
        permissions.HRMS_DATA = ["read", "write", "delete"];
        permissions.HRMS_EMPLOYEES = ["read", "write", "delete"];
        permissions.HRMS_ATTENDANCE = ["read", "write", "delete"];
        permissions.HRMS_LEAVES = ["read", "write", "delete"];
        permissions.HRMS_SHIFTS = ["read", "write", "delete"];
        permissions.HRMS_PAYROLL = ["read", "write", "delete"];

        permissions.FINANCE_DATA = ["read", "write", "delete"];
        permissions.FINANCE_EXPENSES = ["read", "write", "delete"];
        permissions.FINANCE_PAYMENTS = ["read", "write", "delete"];
        permissions.FINANCE_RECEIPTS = ["read", "write", "delete"];
        permissions.FINANCE_CASHBOOK = ["read", "write", "delete"];
        permissions.FINANCE_GST = ["read", "write", "delete"];
        permissions.FINANCE_BANK = ["read", "write", "delete"];

        permissions.REPORTS_DATA = ["read", "write", "delete"];
        permissions.REPORTS_SALES = ["read", "write", "delete"];
        permissions.REPORTS_PURCHASE = ["read", "write", "delete"];
        permissions.REPORTS_INVENTORY = ["read", "write", "delete"];
        permissions.REPORTS_HR = ["read", "write", "delete"];
        permissions.REPORTS_FINANCE = ["read", "write", "delete"];

        await prisma.role.update({
          where: { id: adminRole.id },
          data: { permissions: JSON.stringify(permissions) }
        });
      }
    }
    console.log("🌱 [Database Seeding] Seeding completed successfully!");
  } catch (error) {
    console.error("❌ [Database Seeding Error] Seeding failed:", error);
  }
}

// Start the Integrated Express + HTTP + WebSockets Server
seedDatabase().then(() => {
  server.listen(port, () => {
    console.log(`\n🚀 ========================================================`);
    console.log(`   ERP backend monolith running on http://localhost:${port}`);
    console.log(`   Realtime WebSockets ready for notifications.`);
    console.log(`   PostgreSQL database connection: ACTIVE.`);
    console.log(`========================================================\n`);
  });
});
