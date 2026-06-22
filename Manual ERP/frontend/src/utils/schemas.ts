import { z } from 'zod';

export const SignupSchema = z.object({
  companyCode: z.string().min(2).max(12).toUpperCase(),
  username: z.string().min(3).max(30),
  password: z.string().min(6),
  mobileNo: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid mobile number format"),
  email: z.string().email().optional().or(z.literal("")),
});

export const LoginSchema = z.object({
  companyCode: z.string().min(2).max(12).toUpperCase(),
  username: z.string().min(3).max(30),
  password: z.string().min(6),
});

export const CreateCompanySchema = z.object({
  companyCode: z.string().min(2).max(12).toUpperCase(),
  name: z.string().min(2).max(50),
  subscriptionTier: z.enum(["BASIC", "PREMIUM", "ENTERPRISE"]).default("BASIC"),
  features: z.array(z.string()).optional(), // Optional list of custom active features
  adminUsername: z.string().min(3).max(30),
  adminMobile: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid admin mobile number"),
  adminPassword: z.string().min(6),
  fileSizeLimit: z.number().int().positive().optional().default(50),
  backupAccess: z.boolean().optional().default(false),
  backupRetentionDays: z.number().int().positive().optional().default(60),
});

export const UpdateCompanySchema = z.object({
  name: z.string().min(2).max(50).optional(),
  companyCode: z.string().min(2).max(12).toUpperCase().optional(),
  createdAt: z.string().optional(), // Can pass joining date string
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  features: z.array(z.string()).optional(), // List of custom active features
  fileSizeLimit: z.number().int().positive().optional(),
  backupAccess: z.boolean().optional(),
  backupRetentionDays: z.number().int().positive().optional(),
});

export const CreateCompanyAdminSchema = z.object({
  username: z.string().min(3).max(30),
  mobileNo: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid mobile number format"),
  password: z.string().min(6),
  email: z.string().email().optional().or(z.literal("")),
});

export const UpdateCompanyUserSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  mobileNo: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid mobile number format").optional(),
  password: z.string().min(6).optional(),
  email: z.string().email().optional().or(z.literal("")).optional(),
  status: z.enum(["PENDING_APPROVAL", "ACTIVE", "SUSPENDED"]).optional(),
  roleId: z.string().uuid().optional().or(z.null()).optional(),
  hasBackupAccess: z.boolean().optional(),
});

export const ApproveUserSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
});

export const CreateRoleSchema = z.object({
  name: z.string().min(2).max(30),
  permissions: z.record(z.string(), z.array(z.string())), // e.g. { "CRM": ["read", "write"] }
});

// --- NEW GENERAL ADMINISTRATION ZOD SCHEMAS ---

export const CompanyProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  legalCompanyName: z.string().optional().or(z.literal("")),
  companyLogo: z.string().optional().or(z.literal("")),
  companyBanner: z.string().optional().or(z.literal("")),
  companyEmail: z.string().email().optional().or(z.literal("")),
  companyPhone: z.string().optional().or(z.literal("")),
  alternatePhone: z.string().optional().or(z.literal("")),
  website: z.string().optional().or(z.literal("")),
  industryType: z.string().optional().or(z.literal("")),
  businessType: z.string().optional().or(z.literal("")),
  companyDescription: z.string().optional().or(z.literal("")),

  // Tax Info
  gstin: z.string().optional().or(z.literal("")),
  pan: z.string().optional().or(z.literal("")),
  tan: z.string().optional().or(z.literal("")),
  vatNumber: z.string().optional().or(z.literal("")),
  cinNumber: z.string().optional().or(z.literal("")),
  msmeNumber: z.string().optional().or(z.literal("")),

  // Address
  country: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  pincode: z.string().optional().or(z.literal("")),
  addressLine1: z.string().optional().or(z.literal("")),
  addressLine2: z.string().optional().or(z.literal("")),
  landmark: z.string().optional().or(z.literal("")),

  // Business Details
  fiscalYearStart: z.string().optional().or(z.literal("")),
  fiscalYearEnd: z.string().optional().or(z.literal("")),
  currencyId: z.string().optional().or(z.literal("")),
  timezone: z.string().optional().or(z.literal("")),
  dateFormat: z.string().optional().or(z.literal("")),
  language: z.string().optional().or(z.literal("")),
  decimalPrecision: z.number().int().min(0).max(4).optional().default(2),

  // Branding
  primaryColor: z.string().optional().or(z.literal("")),
  secondaryColor: z.string().optional().or(z.literal("")),
  dashboardTheme: z.string().optional().default("dark"),
  favicon: z.string().optional().or(z.literal("")),
  invoiceTemplate: z.string().optional().default("STANDARD"),

  // SMTP Settings
  smtpHost: z.string().optional().or(z.literal("")),
  smtpPort: z.number().int().optional().or(z.null()),
  smtpUser: z.string().optional().or(z.literal("")),
  smtpPassword: z.string().optional().or(z.literal("")),
  smtpSecure: z.boolean().optional().default(false),
  smtpSender: z.string().optional().or(z.literal("")),
});

export const TaxSettingSchema = z.object({
  taxName: z.string().min(2).max(50),
  taxCode: z.string().min(2).max(12),
  taxPercentage: z.number().min(0).max(100),
  taxType: z.enum(["GST", "CGST", "SGST", "IGST", "VAT", "TDS"]),
  effectiveDate: z.string(), // ISO date string
  taxStatus: z.enum(["ACTIVE", "INACTIVE"]).optional().default("ACTIVE"),
  hsnSacCode: z.string().optional().or(z.literal("")),
  category: z.string().optional().or(z.literal("")),
  isReverseCharge: z.boolean().optional().default(false),
  description: z.string().optional().or(z.literal("")),
});

export const CurrencySchema = z.object({
  currencyCode: z.string().min(2).max(5),
  currencyName: z.string().min(2).max(50),
  symbol: z.string().min(1).max(5),
  decimalPlaces: z.number().int().min(0).max(4).optional().default(2),
  exchangeRate: z.number().positive(),
  activeStatus: z.enum(["ACTIVE", "INACTIVE"]).optional().default("ACTIVE"),
  isBase: z.boolean().optional().default(false),
});

export const ApprovalWorkflowSchema = z.object({
  workflowName: z.string().min(2).max(100),
  module: z.enum(["purchase", "expenses", "sales", "HR", "finance"]),
  conditions: z.string().optional().or(z.literal("")),
  minAmount: z.number().nonnegative().optional(),
  maxAmount: z.number().nonnegative().optional(),
  autoApprove: z.boolean().optional().default(false),
  escalationTime: z.number().int().positive().optional(),
  isActive: z.boolean().optional().default(true),
  steps: z.array(z.object({
    approverRole: z.string().optional(),
    approverRoleId: z.string().optional(),
    approverUserId: z.string().optional(),
    stepOrder: z.number().int().default(1),
  })).min(1, "At least one approval step is required"),
});

export const ApprovalRequestSchema = z.object({
  workflowId: z.string().uuid(),
  entityId: z.string(),
  amount: z.number().nonnegative().optional(),
});

export const DashboardLayoutSchema = z.object({
  layoutSettings: z.string(),
});

export const DepartmentSchema = z.object({
  departmentCode: z.string().min(2).max(12).toUpperCase(),
  departmentName: z.string().min(2).max(100),
  managerId: z.string().uuid().optional().or(z.null()).or(z.literal("")),
  parentDepartmentId: z.string().uuid().optional().or(z.null()).or(z.literal("")),
});




export const CreateVendorQuotationBodySchema = z.object({
  vendorId: z.any().optional(),
  quoteNo: z.any().optional(),
  date: z.any().optional(),
  validUntil: z.any().optional(),
  subtotal: z.any().optional(),
  tax: z.any().optional(),
  total: z.any().optional(),
  status: z.any().optional(),
  items: z.any().optional()
}).passthrough();

export const UpdateVendorQuotationStatusBodySchema = z.object({
  status: z.any().optional()
}).passthrough();

export const CreatePurchaseOrderBodySchema = z.object({
  vendorId: z.any().optional(),
  poNo: z.any().optional(),
  date: z.any().optional(),
  deliveryDate: z.any().optional(),
  subtotal: z.any().optional(),
  discount: z.any().optional(),
  tax: z.any().optional(),
  total: z.any().optional(),
  status: z.any().optional(),
  items: z.any().optional()
}).passthrough();

export const UpdatePurchaseOrderStatusBodySchema = z.object({
  status: z.any().optional()
}).passthrough();

export const CreateGrnBodySchema = z.object({
  poId: z.any().optional(),
  grnNo: z.any().optional(),
  receivedDate: z.any().optional(),
  receivedBy: z.any().optional(),
  gateEntryNo: z.any().optional(),
  challanNo: z.any().optional(),
  status: z.any().optional(),
  notes: z.any().optional(),
  items: z.any().optional()
}).passthrough();

export const CreatePurchaseReturnBodySchema = z.object({
  poId: z.any().optional(),
  returnNo: z.any().optional(),
  returnDate: z.any().optional(),
  reason: z.any().optional(),
  status: z.any().optional(),
  items: z.any().optional()
}).passthrough();

export const CreateVendorPaymentBodySchema = z.object({
  vendorId: z.any().optional(),
  paymentNo: z.any().optional(),
  paymentDate: z.any().optional(),
  amount: z.any().optional(),
  paymentMethod: z.any().optional(),
  referenceNo: z.any().optional(),
  bankDetails: z.any().optional(),
  status: z.any().optional(),
  notes: z.any().optional()
}).passthrough();

export const GetSalesReportQuerySchema = z.object({
  format: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
}).passthrough();

export const GetPurchaseReportQuerySchema = z.object({
  format: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
}).passthrough();

export const GetInventoryReportQuerySchema = z.object({
  format: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
}).passthrough();

export const GetHrReportQuerySchema = z.object({
  format: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
}).passthrough();

export const CreateSalesOrderBodySchema = z.object({
  customerId: z.any().optional(),
  deliveryDate: z.any().optional(),
  discount: z.any().optional(),
  items: z.any().optional()
}).passthrough();

export const UpdateSalesOrderBodySchema = z.object({
  customerId: z.any().optional(),
  deliveryDate: z.any().optional(),
  discount: z.any().optional(),
  status: z.any().optional(),
  items: z.any().optional()
}).passthrough();

export const CreateProformaInvoiceBodySchema = z.object({
  customerId: z.any().optional(),
  dueDate: z.any().optional(),
  discount: z.any().optional(),
  tax: z.any().optional(),
  subtotal: z.any().optional(),
  total: z.any().optional(),
  status: z.any().optional(),
  items: z.any().optional()
}).passthrough();

export const UpdateProformaInvoiceBodySchema = z.object({
  customerId: z.any().optional(),
  dueDate: z.any().optional(),
  discount: z.any().optional(),
  tax: z.any().optional(),
  subtotal: z.any().optional(),
  total: z.any().optional(),
  status: z.any().optional(),
  items: z.any().optional()
}).passthrough();

export const CreateSalesInvoiceBodySchema = z.object({
  customerId: z.any().optional(),
  dueDate: z.any().optional(),
  discount: z.any().optional(),
  tax: z.any().optional(),
  subtotal: z.any().optional(),
  total: z.any().optional(),
  status: z.any().optional(),
  items: z.any().optional(),
  billingAddress: z.any().optional(),
  shippingAddress: z.any().optional(),
  shippingState: z.any().optional(),
  shippingName: z.any().optional(),
  salesOrderId: z.any().optional(),
  salesOrderIds: z.any().optional()
}).passthrough();

export const UpdateSalesInvoiceBodySchema = z.object({
  customerId: z.any().optional(),
  dueDate: z.any().optional(),
  discount: z.any().optional(),
  tax: z.any().optional(),
  subtotal: z.any().optional(),
  total: z.any().optional(),
  status: z.any().optional(),
  items: z.any().optional(),
  billingAddress: z.any().optional(),
  shippingAddress: z.any().optional(),
  shippingState: z.any().optional(),
  shippingName: z.any().optional(),
  salesOrderId: z.any().optional(),
  salesOrderIds: z.any().optional()
}).passthrough();

export const CreateDeliveryChallanBodySchema = z.object({
  customerId: z.any().optional(),
  status: z.any().optional(),
  items: z.any().optional(),
  salesOrderId: z.any().optional(),
  salesOrderIds: z.any().optional()
}).passthrough();

export const UpdateDeliveryChallanBodySchema = z.object({
  customerId: z.any().optional(),
  status: z.any().optional(),
  items: z.any().optional(),
  salesOrderId: z.any().optional(),
  salesOrderIds: z.any().optional()
}).passthrough();

export const CreateDispatchBodySchema = z.object({
  orderId: z.any().optional(),
  carrier: z.any().optional(),
  trackingNo: z.any().optional(),
  vehicleNo: z.any().optional(),
  shippingCost: z.any().optional(),
  status: z.any().optional(),
  notes: z.any().optional()
}).passthrough();

export const UpdateDispatchBodySchema = z.object({
  orderId: z.any().optional(),
  carrier: z.any().optional(),
  trackingNo: z.any().optional(),
  vehicleNo: z.any().optional(),
  shippingCost: z.any().optional(),
  status: z.any().optional(),
  notes: z.any().optional()
}).passthrough();

export const CreateQuotationBodySchema = z.object({
  customerId: z.any().optional(),
  date: z.any().optional(),
  expiryDate: z.any().optional(),
  subtotal: z.any().optional(),
  discount: z.any().optional(),
  tax: z.any().optional(),
  total: z.any().optional(),
  status: z.any().optional(),
  items: z.any().optional()
}).passthrough();

export const UpdateQuotationStatusBodySchema = z.object({
  status: z.any().optional()
}).passthrough();

export const CreateServiceTicketBodySchema = z.object({
  customerId: z.any().optional(),
  productId: z.any().optional(),
  serialNumber: z.any().optional(),
  title: z.any().optional(),
  type: z.any().optional(),
  priority: z.any().optional(),
  status: z.any().optional(),
  scheduledDate: z.any().optional(),
  resolutionNotes: z.any().optional()
}).passthrough();

export const UpdateServiceTicketBodySchema = z.object({
  status: z.any().optional(),
  resolutionNotes: z.any().optional(),
  scheduledDate: z.any().optional(),
  priority: z.any().optional()
}).passthrough();

export const ListDocumentTemplatesQuerySchema = z.object({
  docType: z.any().optional()
}).passthrough();

export const CreateDocumentTemplateBodySchema = z.object({
  name: z.any().optional(),
  docType: z.any().optional(),
  title: z.any().optional(),
  isDefault: z.any().optional(),
  settings: z.any().optional(),
  terms: z.any().optional()
}).passthrough();

export const UpdateDocumentTemplateBodySchema = z.object({
  name: z.any().optional(),
  docType: z.any().optional(),
  title: z.any().optional(),
  isDefault: z.any().optional(),
  settings: z.any().optional(),
  terms: z.any().optional()
}).passthrough();

export const CreateTaxBodySchema = z.object({
  name: z.any().optional(),
  rate: z.any().optional(),
  type: z.any().optional(),
  isDefault: z.any().optional()
}).passthrough();

export const UpdateTaxBodySchema = z.object({
  name: z.any().optional(),
  rate: z.any().optional(),
  type: z.any().optional(),
  isDefault: z.any().optional()
}).passthrough();


// Auto-generated fallback schemas
export const AdjustStockBodySchema = z.any();
export const BankAccountSchema = z.any();
export const CentralDevConfigSchema = z.any();
export const CentralDiscoverySchema = z.any();
export const CentralLicenseSchema = z.any();
export const CentralUpdaterSchema = z.any();
export const CompleteJobCardBodySchema = z.any();
export const CreateBomBodySchema = z.any();
export const CreateBrandBodySchema = z.any();
export const CreateCategoryBodySchema = z.any();
export const CreateChatGroupSchema = z.any();
export const CreateCustomerBodySchema = z.any();
export const CreateDepartmentSchema = z.any();
export const CreateJobCardBodySchema = z.any();
export const CreateLogBodySchema = z.any();
export const CreatePlanBodySchema = z.any();
export const CreateProductBodySchema = z.any();
export const CreateQcRecordBodySchema = z.any();
export const CreateRoutingBodySchema = z.any();
export const CreateShiftBodySchema = z.any();
export const CreateUserAdminSchema = z.any();
export const CreateVendorBodySchema = z.any();
export const CreateWorkCenterBodySchema = z.any();
export const CreateWorkOrderBodySchema = z.any();
export const DisbursePayrollSchema = z.any();
export const DownloadBackupQuerySchema = z.any();
export const UpdateJobCardBodySchema = z.any();
export const UpdateLeaveStatusSchema = z.any();
export const UpdatePlanBodySchema = z.any();
export const UpdateProductBodySchema = z.any();
export const UpdateQcRecordBodySchema = z.any();
export const UpdateReworkCardBodySchema = z.any();
export const UpdateRolePermissionsSchema = z.any();
export const UpdateRoutingBodySchema = z.any();
export const UpdateShiftBodySchema = z.any();
export const UpdateUserAdminSchema = z.any();
export const UpdateVendorBodySchema = z.any();
export const UpdateWorkCenterBodySchema = z.any();
export const UpdateWorkOrderBodySchema = z.any();

// --- HRMS Schemas ---
export const EmployeeUpdateSchema = z.object({
  roleId: z.string().nullable().optional().or(z.literal('')),
  departmentId: z.string().nullable().optional().or(z.literal('')),
  status: z.string(),
  shiftStart: z.string().nullable().optional(),
  shiftEnd: z.string().nullable().optional(),
  shiftName: z.string().nullable().optional(),
  reportsToId: z.string().nullable().optional().or(z.literal('')),
  mobileNo: z.string().min(1, "Mobile number is required"),
  email: z.string().email().nullable().optional().or(z.literal(''))
});

export const LeaveRequestSchema = z.object({
  type: z.string().min(1, "Leave type is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(1, "Reason is required")
});

export const ShiftRosterSchema = z.object({
  name: z.string().min(1, "Shift name is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  gracePeriod: z.number().min(0)
});

export const PayrollGenerateSchema = z.object({
  userId: z.string().min(1, "Employee is required"),
  month: z.number().min(1).max(12),
  year: z.number().min(2000),
  basicSalary: z.number().min(0),
  allowances: z.number().min(0).optional(),
  deductions: z.number().min(0).optional()
});

// --- Inventory Schemas ---
export const StockAdjustSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  type: z.string().min(1, "Adjustment type is required"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  reason: z.string().min(1, "Reason is required")
});

export const ProductUpdateSchema = z.object({
  reorderLevel: z.number().min(0).optional(),
  warehouseLoc: z.string().optional()
});

export const GstSettingSchema = z.object({
  taxName: z.string().min(1, "Tax name is required"),
  taxCode: z.string().min(1, "Tax code is required"),
  taxPercentage: z.number().min(0).max(100),
  taxType: z.string(),
  effectiveDate: z.string()
});


// Fallbacks for imports
export const CashTransactionSchema = z.any();
export const CustomerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  customerType: z.enum(["INDIVIDUAL", "COMPANY"]),
  customerGroup: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  contactNo: z.string().min(8, "Contact number must be at least 8 digits"),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  billingAddress: z.string().optional().nullable(),
  shippingAddress: z.string().optional().nullable(),
  creditLimit: z.any().optional(),
  creditTime: z.any().optional(),
  state: z.string().default("Gujarat"),
  clientClassification: z.enum(["NATIONAL", "INTERNATIONAL"]).default("NATIONAL"),
  currencySymbol: z.string().default("$"),
  bankName: z.string().optional().nullable(),
  accountHolderName: z.string().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  ifscCode: z.string().optional().nullable(),
  gstNumber: z.string().optional().nullable(),
  panNumber: z.string().optional().nullable(),
});
export const EmployeeSchema = z.any();
export const ExpenseSchema = z.any();
export const FollowUpSchema = z.any();
export const GeneratePayrollSchema = z.any();
export const GetChatGroupMessagesQuerySchema = z.any();
export const IssueMaterialsToWorkOrderBodySchema = z.any();
export const LeadSchema = z.any();
export const ListAttendanceQuerySchema = z.any();
export const ListAuditLogsQuerySchema = z.any();
export const ListCustomersQuerySchema = z.any();
export const ListLeaveRequestsQuerySchema = z.any();
export const ListPayrollQuerySchema = z.any();
export const ListProductsQuerySchema = z.any();
export const ListVendorsQuerySchema = z.any();
export const LogSchema = z.any();
export const ManageChatGroupMembersSchema = z.any();
export const OpportunitySchema = z.any();
export const PaymentSchema = z.any();
export const ProductSchema = z.any();
export const ReceiptSchema = z.any();
export const RestoreBackupSchema = z.any();
export const SendChatMessageSchema = z.any();
export const UpdateBackupSettingsSchema = z.any();
export const UpdateBomBodySchema = z.any();
export const UpdateChatGroupSettingsSchema = z.any();
export const UpdateCustomerBodySchema = z.any();
export const UpdateDepartmentSchema = z.any();
export const UpdateEmployeeSchema = z.any();
export const VendorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  isVendor: z.boolean().default(true),
  contactNo: z.string().min(8, "Contact number must be at least 8 digits"),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  bankDetails: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  gstDetails: z.string().optional().nullable(),
  creditTime: z.any().optional(),
  creditLimit: z.any().optional(),
  bankName: z.string().optional().nullable(),
  accountHolderName: z.string().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  ifscCode: z.string().optional().nullable(),
  gstNumber: z.string().optional().nullable(),
  panNumber: z.string().optional().nullable(),
  currencySymbol: z.string().optional().default("$"),
  currencyId: z.string().optional().default("USD"),
});
