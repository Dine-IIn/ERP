"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CentralLicenseSchema = exports.CentralDiscoverySchema = exports.CentralDevConfigSchema = exports.BankAccountSchema = exports.AdjustStockBodySchema = exports.UpdateTaxBodySchema = exports.CreateTaxBodySchema = exports.UpdateDocumentTemplateBodySchema = exports.CreateDocumentTemplateBodySchema = exports.ListDocumentTemplatesQuerySchema = exports.UpdateServiceTicketBodySchema = exports.CreateServiceTicketBodySchema = exports.UpdateQuotationStatusBodySchema = exports.CreateQuotationBodySchema = exports.UpdateDispatchBodySchema = exports.CreateDispatchBodySchema = exports.UpdateDeliveryChallanBodySchema = exports.CreateDeliveryChallanBodySchema = exports.UpdateSalesInvoiceBodySchema = exports.CreateSalesInvoiceBodySchema = exports.UpdateProformaInvoiceBodySchema = exports.CreateProformaInvoiceBodySchema = exports.UpdateSalesOrderBodySchema = exports.CreateSalesOrderBodySchema = exports.GetHrReportQuerySchema = exports.GetInventoryReportQuerySchema = exports.GetPurchaseReportQuerySchema = exports.GetSalesReportQuerySchema = exports.CreateVendorPaymentBodySchema = exports.CreatePurchaseReturnBodySchema = exports.CreateGrnBodySchema = exports.UpdatePurchaseOrderStatusBodySchema = exports.CreatePurchaseOrderBodySchema = exports.UpdateVendorQuotationStatusBodySchema = exports.CreateVendorQuotationBodySchema = exports.DepartmentSchema = exports.DashboardLayoutSchema = exports.ApprovalRequestSchema = exports.ApprovalWorkflowSchema = exports.CurrencySchema = exports.TaxSettingSchema = exports.CompanyProfileSchema = exports.CreateRoleSchema = exports.ApproveUserSchema = exports.UpdateCompanyUserSchema = exports.CreateCompanyAdminSchema = exports.UpdateCompanySchema = exports.CreateCompanySchema = exports.LoginSchema = exports.SignupSchema = void 0;
exports.UpdateLeaveStatusSchema = exports.UpdateJobCardBodySchema = exports.UpdateEmployeeSchema = exports.UpdateDepartmentSchema = exports.UpdateCustomerBodySchema = exports.UpdateChatGroupSettingsSchema = exports.UpdateBomBodySchema = exports.UpdateBackupSettingsSchema = exports.ShiftRosterSchema = exports.SendChatMessageSchema = exports.RestoreBackupSchema = exports.ReceiptSchema = exports.PaymentSchema = exports.OpportunitySchema = exports.ManageChatGroupMembersSchema = exports.ListVendorsQuerySchema = exports.ListProductsQuerySchema = exports.ListPayrollQuerySchema = exports.ListLeaveRequestsQuerySchema = exports.ListCustomersQuerySchema = exports.ListAuditLogsQuerySchema = exports.ListAttendanceQuerySchema = exports.LeaveRequestSchema = exports.LeadSchema = exports.IssueMaterialsToWorkOrderBodySchema = exports.GetChatGroupMessagesQuerySchema = exports.GeneratePayrollSchema = exports.FollowUpSchema = exports.ExpenseSchema = exports.DownloadBackupQuerySchema = exports.DisbursePayrollSchema = exports.CreateWorkOrderBodySchema = exports.CreateWorkCenterBodySchema = exports.CreateVendorBodySchema = exports.CreateUserAdminSchema = exports.CreateShiftBodySchema = exports.CreateRoutingBodySchema = exports.CreateQcRecordBodySchema = exports.CreateProductBodySchema = exports.CreatePlanBodySchema = exports.CreateLogBodySchema = exports.CreateJobCardBodySchema = exports.CreateDepartmentSchema = exports.CreateCustomerBodySchema = exports.CreateChatGroupSchema = exports.CreateCategoryBodySchema = exports.CreateBrandBodySchema = exports.CreateBomBodySchema = exports.CompleteJobCardBodySchema = exports.CentralUpdaterSchema = void 0;
exports.UpdateWhatsappSettingsSchema = exports.SendWhatsappMessageSchema = exports.UpdateWhatsappTemplateSchema = exports.CreateWhatsappTemplateSchema = exports.UpdateWorkOrderBodySchema = exports.UpdateWorkCenterBodySchema = exports.UpdateVendorBodySchema = exports.UpdateUserAdminSchema = exports.UpdateShiftBodySchema = exports.UpdateRoutingBodySchema = exports.UpdateRolePermissionsSchema = exports.UpdateReworkCardBodySchema = exports.UpdateQcRecordBodySchema = exports.UpdateProductBodySchema = exports.UpdatePlanBodySchema = void 0;
const zod_1 = require("zod");
exports.SignupSchema = zod_1.z.object({
    companyCode: zod_1.z.string().min(2).max(12).toUpperCase(),
    username: zod_1.z.string().min(3).max(30),
    password: zod_1.z.string().min(6),
    mobileNo: zod_1.z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid mobile number format"),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal("")),
});
exports.LoginSchema = zod_1.z.object({
    companyCode: zod_1.z.string().min(2).max(12).toUpperCase(),
    username: zod_1.z.string().min(3).max(30),
    password: zod_1.z.string().min(6),
});
exports.CreateCompanySchema = zod_1.z.object({
    companyCode: zod_1.z.string().min(2).max(12).toUpperCase(),
    name: zod_1.z.string().min(2).max(50),
    subscriptionTier: zod_1.z.enum(["BASIC", "PREMIUM", "ENTERPRISE"]).default("BASIC"),
    features: zod_1.z.array(zod_1.z.string()).optional(), // Optional list of custom active features
    adminUsername: zod_1.z.string().min(3).max(30),
    adminMobile: zod_1.z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid admin mobile number"),
    adminPassword: zod_1.z.string().min(6),
    fileSizeLimit: zod_1.z.number().int().positive().optional().default(50),
    backupAccess: zod_1.z.boolean().optional().default(false),
    backupRetentionDays: zod_1.z.number().int().positive().optional().default(60),
});
exports.UpdateCompanySchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(50).optional(),
    companyCode: zod_1.z.string().min(2).max(12).toUpperCase().optional(),
    createdAt: zod_1.z.string().optional(), // Can pass joining date string
    status: zod_1.z.enum(["ACTIVE", "SUSPENDED"]).optional(),
    features: zod_1.z.array(zod_1.z.string()).optional(), // List of custom active features
    fileSizeLimit: zod_1.z.number().int().positive().optional(),
    backupAccess: zod_1.z.boolean().optional(),
    backupRetentionDays: zod_1.z.number().int().positive().optional(),
});
exports.CreateCompanyAdminSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(30),
    mobileNo: zod_1.z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid mobile number format"),
    password: zod_1.z.string().min(6),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal("")),
});
exports.UpdateCompanyUserSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(30).optional(),
    mobileNo: zod_1.z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid mobile number format").optional(),
    password: zod_1.z.string().min(6).optional(),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal("")).optional(),
    status: zod_1.z.enum(["PENDING_APPROVAL", "ACTIVE", "SUSPENDED"]).optional(),
    roleId: zod_1.z.string().uuid().optional().or(zod_1.z.null()).optional(),
    hasBackupAccess: zod_1.z.boolean().optional(),
});
exports.ApproveUserSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    roleId: zod_1.z.string().uuid(),
});
exports.CreateRoleSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(30),
    permissions: zod_1.z.record(zod_1.z.array(zod_1.z.string())), // e.g. { "CRM": ["read", "write"] }
});
// --- NEW GENERAL ADMINISTRATION ZOD SCHEMAS ---
exports.CompanyProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(50).optional(),
    legalCompanyName: zod_1.z.string().optional().or(zod_1.z.literal("")),
    companyLogo: zod_1.z.string().optional().or(zod_1.z.literal("")),
    companyBanner: zod_1.z.string().optional().or(zod_1.z.literal("")),
    companyEmail: zod_1.z.string().email().optional().or(zod_1.z.literal("")),
    companyPhone: zod_1.z.string().optional().or(zod_1.z.literal("")),
    alternatePhone: zod_1.z.string().optional().or(zod_1.z.literal("")),
    website: zod_1.z.string().optional().or(zod_1.z.literal("")),
    industryType: zod_1.z.string().optional().or(zod_1.z.literal("")),
    businessType: zod_1.z.string().optional().or(zod_1.z.literal("")),
    companyDescription: zod_1.z.string().optional().or(zod_1.z.literal("")),
    // Tax Info
    gstin: zod_1.z.string().optional().or(zod_1.z.literal("")),
    pan: zod_1.z.string().optional().or(zod_1.z.literal("")),
    tan: zod_1.z.string().optional().or(zod_1.z.literal("")),
    vatNumber: zod_1.z.string().optional().or(zod_1.z.literal("")),
    cinNumber: zod_1.z.string().optional().or(zod_1.z.literal("")),
    msmeNumber: zod_1.z.string().optional().or(zod_1.z.literal("")),
    // Address
    country: zod_1.z.string().optional().or(zod_1.z.literal("")),
    state: zod_1.z.string().optional().or(zod_1.z.literal("")),
    city: zod_1.z.string().optional().or(zod_1.z.literal("")),
    pincode: zod_1.z.string().optional().or(zod_1.z.literal("")),
    addressLine1: zod_1.z.string().optional().or(zod_1.z.literal("")),
    addressLine2: zod_1.z.string().optional().or(zod_1.z.literal("")),
    landmark: zod_1.z.string().optional().or(zod_1.z.literal("")),
    // Business Details
    fiscalYearStart: zod_1.z.string().optional().or(zod_1.z.literal("")),
    fiscalYearEnd: zod_1.z.string().optional().or(zod_1.z.literal("")),
    currencyId: zod_1.z.string().optional().or(zod_1.z.literal("")),
    timezone: zod_1.z.string().optional().or(zod_1.z.literal("")),
    dateFormat: zod_1.z.string().optional().or(zod_1.z.literal("")),
    language: zod_1.z.string().optional().or(zod_1.z.literal("")),
    decimalPrecision: zod_1.z.number().int().min(0).max(4).optional().default(2),
    // Branding
    primaryColor: zod_1.z.string().optional().or(zod_1.z.literal("")),
    secondaryColor: zod_1.z.string().optional().or(zod_1.z.literal("")),
    dashboardTheme: zod_1.z.string().optional().default("dark"),
    favicon: zod_1.z.string().optional().or(zod_1.z.literal("")),
    invoiceTemplate: zod_1.z.string().optional().default("STANDARD"),
    // SMTP Settings
    smtpHost: zod_1.z.string().optional().or(zod_1.z.literal("")),
    smtpPort: zod_1.z.number().int().optional().or(zod_1.z.null()),
    smtpUser: zod_1.z.string().optional().or(zod_1.z.literal("")),
    smtpPassword: zod_1.z.string().optional().or(zod_1.z.literal("")),
    smtpSecure: zod_1.z.boolean().optional().default(false),
    smtpSender: zod_1.z.string().optional().or(zod_1.z.literal("")),
});
exports.TaxSettingSchema = zod_1.z.object({
    taxName: zod_1.z.string().min(2).max(50),
    taxCode: zod_1.z.string().min(2).max(12),
    taxPercentage: zod_1.z.number().min(0).max(100),
    taxType: zod_1.z.enum(["GST", "CGST", "SGST", "IGST", "VAT", "TDS"]),
    effectiveDate: zod_1.z.string(), // ISO date string
    taxStatus: zod_1.z.enum(["ACTIVE", "INACTIVE"]).optional().default("ACTIVE"),
    hsnSacCode: zod_1.z.string().optional().or(zod_1.z.literal("")),
    category: zod_1.z.string().optional().or(zod_1.z.literal("")),
    isReverseCharge: zod_1.z.boolean().optional().default(false),
    description: zod_1.z.string().optional().or(zod_1.z.literal("")),
});
exports.CurrencySchema = zod_1.z.object({
    currencyCode: zod_1.z.string().min(2).max(5),
    currencyName: zod_1.z.string().min(2).max(50),
    symbol: zod_1.z.string().min(1).max(5),
    decimalPlaces: zod_1.z.number().int().min(0).max(4).optional().default(2),
    exchangeRate: zod_1.z.number().positive(),
    activeStatus: zod_1.z.enum(["ACTIVE", "INACTIVE"]).optional().default("ACTIVE"),
    isBase: zod_1.z.boolean().optional().default(false),
});
exports.ApprovalWorkflowSchema = zod_1.z.object({
    workflowName: zod_1.z.string().min(2).max(100),
    module: zod_1.z.enum(["purchase", "expenses", "sales", "HR", "finance"]),
    conditions: zod_1.z.string().optional().or(zod_1.z.literal("")),
    minAmount: zod_1.z.number().nonnegative().optional(),
    maxAmount: zod_1.z.number().nonnegative().optional(),
    autoApprove: zod_1.z.boolean().optional().default(false),
    escalationTime: zod_1.z.number().int().positive().optional(),
    isActive: zod_1.z.boolean().optional().default(true),
    steps: zod_1.z.array(zod_1.z.object({
        approverRole: zod_1.z.string().optional(),
        approverRoleId: zod_1.z.string().optional(),
        approverUserId: zod_1.z.string().optional(),
        stepOrder: zod_1.z.number().int().default(1),
    })).min(1, "At least one approval step is required"),
});
exports.ApprovalRequestSchema = zod_1.z.object({
    workflowId: zod_1.z.string().uuid(),
    entityId: zod_1.z.string(),
    amount: zod_1.z.number().nonnegative().optional(),
});
exports.DashboardLayoutSchema = zod_1.z.object({
    layoutSettings: zod_1.z.string(),
});
exports.DepartmentSchema = zod_1.z.object({
    departmentCode: zod_1.z.string().min(2).max(12).toUpperCase(),
    departmentName: zod_1.z.string().min(2).max(100),
    managerId: zod_1.z.string().uuid().optional().or(zod_1.z.null()).or(zod_1.z.literal("")),
    parentDepartmentId: zod_1.z.string().uuid().optional().or(zod_1.z.null()).or(zod_1.z.literal("")),
});
exports.CreateVendorQuotationBodySchema = zod_1.z.object({
    vendorId: zod_1.z.any().optional(),
    quoteNo: zod_1.z.any().optional(),
    date: zod_1.z.any().optional(),
    validUntil: zod_1.z.any().optional(),
    subtotal: zod_1.z.any().optional(),
    tax: zod_1.z.any().optional(),
    total: zod_1.z.any().optional(),
    status: zod_1.z.any().optional(),
    items: zod_1.z.any().optional()
}).passthrough();
exports.UpdateVendorQuotationStatusBodySchema = zod_1.z.object({
    status: zod_1.z.any().optional()
}).passthrough();
exports.CreatePurchaseOrderBodySchema = zod_1.z.object({
    vendorId: zod_1.z.any().optional(),
    poNo: zod_1.z.any().optional(),
    date: zod_1.z.any().optional(),
    deliveryDate: zod_1.z.any().optional(),
    subtotal: zod_1.z.any().optional(),
    discount: zod_1.z.any().optional(),
    tax: zod_1.z.any().optional(),
    total: zod_1.z.any().optional(),
    status: zod_1.z.any().optional(),
    items: zod_1.z.any().optional()
}).passthrough();
exports.UpdatePurchaseOrderStatusBodySchema = zod_1.z.object({
    status: zod_1.z.any().optional()
}).passthrough();
exports.CreateGrnBodySchema = zod_1.z.object({
    poId: zod_1.z.any().optional(),
    grnNo: zod_1.z.any().optional(),
    receivedDate: zod_1.z.any().optional(),
    receivedBy: zod_1.z.any().optional(),
    gateEntryNo: zod_1.z.any().optional(),
    challanNo: zod_1.z.any().optional(),
    status: zod_1.z.any().optional(),
    notes: zod_1.z.any().optional(),
    items: zod_1.z.any().optional()
}).passthrough();
exports.CreatePurchaseReturnBodySchema = zod_1.z.object({
    poId: zod_1.z.any().optional(),
    returnNo: zod_1.z.any().optional(),
    returnDate: zod_1.z.any().optional(),
    reason: zod_1.z.any().optional(),
    status: zod_1.z.any().optional(),
    items: zod_1.z.any().optional()
}).passthrough();
exports.CreateVendorPaymentBodySchema = zod_1.z.object({
    vendorId: zod_1.z.any().optional(),
    paymentNo: zod_1.z.any().optional(),
    paymentDate: zod_1.z.any().optional(),
    amount: zod_1.z.any().optional(),
    paymentMethod: zod_1.z.any().optional(),
    referenceNo: zod_1.z.any().optional(),
    bankDetails: zod_1.z.any().optional(),
    status: zod_1.z.any().optional(),
    notes: zod_1.z.any().optional()
}).passthrough();
exports.GetSalesReportQuerySchema = zod_1.z.object({
    format: zod_1.z.string().optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional()
}).passthrough();
exports.GetPurchaseReportQuerySchema = zod_1.z.object({
    format: zod_1.z.string().optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional()
}).passthrough();
exports.GetInventoryReportQuerySchema = zod_1.z.object({
    format: zod_1.z.string().optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional()
}).passthrough();
exports.GetHrReportQuerySchema = zod_1.z.object({
    format: zod_1.z.string().optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional()
}).passthrough();
exports.CreateSalesOrderBodySchema = zod_1.z.object({
    customerId: zod_1.z.any().optional(),
    deliveryDate: zod_1.z.any().optional(),
    discount: zod_1.z.any().optional(),
    discountType: zod_1.z.enum(['PERCENTAGE', 'AMOUNT']).optional().default('PERCENTAGE'),
    items: zod_1.z.any().optional()
}).passthrough();
exports.UpdateSalesOrderBodySchema = zod_1.z.object({
    customerId: zod_1.z.any().optional(),
    deliveryDate: zod_1.z.any().optional(),
    discount: zod_1.z.any().optional(),
    discountType: zod_1.z.enum(['PERCENTAGE', 'AMOUNT']).optional(),
    status: zod_1.z.any().optional(),
    items: zod_1.z.any().optional()
}).passthrough();
exports.CreateProformaInvoiceBodySchema = zod_1.z.object({
    customerId: zod_1.z.any().optional(),
    dueDate: zod_1.z.any().optional(),
    discount: zod_1.z.any().optional(),
    discountType: zod_1.z.enum(['PERCENTAGE', 'AMOUNT']).optional().default('PERCENTAGE'),
    tax: zod_1.z.any().optional(),
    subtotal: zod_1.z.any().optional(),
    total: zod_1.z.any().optional(),
    status: zod_1.z.any().optional(),
    items: zod_1.z.any().optional()
}).passthrough();
exports.UpdateProformaInvoiceBodySchema = zod_1.z.object({
    customerId: zod_1.z.any().optional(),
    dueDate: zod_1.z.any().optional(),
    discount: zod_1.z.any().optional(),
    discountType: zod_1.z.enum(['PERCENTAGE', 'AMOUNT']).optional(),
    tax: zod_1.z.any().optional(),
    subtotal: zod_1.z.any().optional(),
    total: zod_1.z.any().optional(),
    status: zod_1.z.any().optional(),
    items: zod_1.z.any().optional()
}).passthrough();
exports.CreateSalesInvoiceBodySchema = zod_1.z.object({
    customerId: zod_1.z.any().optional(),
    dueDate: zod_1.z.any().optional(),
    discount: zod_1.z.any().optional(),
    discountType: zod_1.z.enum(['PERCENTAGE', 'AMOUNT']).optional().default('PERCENTAGE'),
    tax: zod_1.z.any().optional(),
    subtotal: zod_1.z.any().optional(),
    total: zod_1.z.any().optional(),
    status: zod_1.z.any().optional(),
    items: zod_1.z.any().optional(),
    billingAddress: zod_1.z.any().optional(),
    shippingAddress: zod_1.z.any().optional(),
    shippingState: zod_1.z.any().optional(),
    shippingName: zod_1.z.any().optional(),
    salesOrderId: zod_1.z.any().optional(),
    salesOrderIds: zod_1.z.any().optional()
}).passthrough();
exports.UpdateSalesInvoiceBodySchema = zod_1.z.object({
    customerId: zod_1.z.any().optional(),
    dueDate: zod_1.z.any().optional(),
    discount: zod_1.z.any().optional(),
    discountType: zod_1.z.enum(['PERCENTAGE', 'AMOUNT']).optional(),
    tax: zod_1.z.any().optional(),
    subtotal: zod_1.z.any().optional(),
    total: zod_1.z.any().optional(),
    status: zod_1.z.any().optional(),
    items: zod_1.z.any().optional(),
    billingAddress: zod_1.z.any().optional(),
    shippingAddress: zod_1.z.any().optional(),
    shippingState: zod_1.z.any().optional(),
    shippingName: zod_1.z.any().optional(),
    salesOrderId: zod_1.z.any().optional(),
    salesOrderIds: zod_1.z.any().optional()
}).passthrough();
exports.CreateDeliveryChallanBodySchema = zod_1.z.object({
    customerId: zod_1.z.any().optional(),
    status: zod_1.z.any().optional(),
    items: zod_1.z.any().optional(),
    salesOrderId: zod_1.z.any().optional(),
    salesOrderIds: zod_1.z.any().optional()
}).passthrough();
exports.UpdateDeliveryChallanBodySchema = zod_1.z.object({
    customerId: zod_1.z.any().optional(),
    status: zod_1.z.any().optional(),
    items: zod_1.z.any().optional(),
    salesOrderId: zod_1.z.any().optional(),
    salesOrderIds: zod_1.z.any().optional()
}).passthrough();
exports.CreateDispatchBodySchema = zod_1.z.object({
    orderId: zod_1.z.any().optional(),
    carrier: zod_1.z.any().optional(),
    trackingNo: zod_1.z.any().optional(),
    vehicleNo: zod_1.z.any().optional(),
    shippingCost: zod_1.z.any().optional(),
    status: zod_1.z.any().optional(),
    notes: zod_1.z.any().optional()
}).passthrough();
exports.UpdateDispatchBodySchema = zod_1.z.object({
    orderId: zod_1.z.any().optional(),
    carrier: zod_1.z.any().optional(),
    trackingNo: zod_1.z.any().optional(),
    vehicleNo: zod_1.z.any().optional(),
    shippingCost: zod_1.z.any().optional(),
    status: zod_1.z.any().optional(),
    notes: zod_1.z.any().optional()
}).passthrough();
exports.CreateQuotationBodySchema = zod_1.z.object({
    customerId: zod_1.z.any().optional(),
    date: zod_1.z.any().optional(),
    expiryDate: zod_1.z.any().optional(),
    subtotal: zod_1.z.any().optional(),
    discount: zod_1.z.any().optional(),
    tax: zod_1.z.any().optional(),
    total: zod_1.z.any().optional(),
    status: zod_1.z.any().optional(),
    items: zod_1.z.any().optional()
}).passthrough();
exports.UpdateQuotationStatusBodySchema = zod_1.z.object({
    status: zod_1.z.any().optional()
}).passthrough();
exports.CreateServiceTicketBodySchema = zod_1.z.object({
    customerId: zod_1.z.any().optional(),
    productId: zod_1.z.any().optional(),
    serialNumber: zod_1.z.any().optional(),
    title: zod_1.z.any().optional(),
    type: zod_1.z.any().optional(),
    priority: zod_1.z.any().optional(),
    status: zod_1.z.any().optional(),
    scheduledDate: zod_1.z.any().optional(),
    resolutionNotes: zod_1.z.any().optional()
}).passthrough();
exports.UpdateServiceTicketBodySchema = zod_1.z.object({
    status: zod_1.z.any().optional(),
    resolutionNotes: zod_1.z.any().optional(),
    scheduledDate: zod_1.z.any().optional(),
    priority: zod_1.z.any().optional()
}).passthrough();
exports.ListDocumentTemplatesQuerySchema = zod_1.z.object({
    docType: zod_1.z.any().optional()
}).passthrough();
exports.CreateDocumentTemplateBodySchema = zod_1.z.object({
    name: zod_1.z.any().optional(),
    docType: zod_1.z.any().optional(),
    title: zod_1.z.any().optional(),
    isDefault: zod_1.z.any().optional(),
    settings: zod_1.z.any().optional(),
    terms: zod_1.z.any().optional()
}).passthrough();
exports.UpdateDocumentTemplateBodySchema = zod_1.z.object({
    name: zod_1.z.any().optional(),
    docType: zod_1.z.any().optional(),
    title: zod_1.z.any().optional(),
    isDefault: zod_1.z.any().optional(),
    settings: zod_1.z.any().optional(),
    terms: zod_1.z.any().optional()
}).passthrough();
exports.CreateTaxBodySchema = zod_1.z.object({
    name: zod_1.z.any().optional(),
    rate: zod_1.z.any().optional(),
    type: zod_1.z.any().optional(),
    isDefault: zod_1.z.any().optional()
}).passthrough();
exports.UpdateTaxBodySchema = zod_1.z.object({
    name: zod_1.z.any().optional(),
    rate: zod_1.z.any().optional(),
    type: zod_1.z.any().optional(),
    isDefault: zod_1.z.any().optional()
}).passthrough();
// Auto-generated fallback schemas
exports.AdjustStockBodySchema = zod_1.z.any();
exports.BankAccountSchema = zod_1.z.any();
exports.CentralDevConfigSchema = zod_1.z.any();
exports.CentralDiscoverySchema = zod_1.z.any();
exports.CentralLicenseSchema = zod_1.z.any();
exports.CentralUpdaterSchema = zod_1.z.any();
exports.CompleteJobCardBodySchema = zod_1.z.any();
exports.CreateBomBodySchema = zod_1.z.any();
exports.CreateBrandBodySchema = zod_1.z.any();
exports.CreateCategoryBodySchema = zod_1.z.any();
exports.CreateChatGroupSchema = zod_1.z.any();
exports.CreateCustomerBodySchema = zod_1.z.object({
    name: zod_1.z.string(),
    customerType: zod_1.z.string(),
    customerGroup: zod_1.z.string().optional().nullable(),
    contactPerson: zod_1.z.string().optional().nullable(),
    contactNo: zod_1.z.string(),
    email: zod_1.z.string().optional().nullable(),
    billingAddress: zod_1.z.string().optional().nullable(),
    shippingAddress: zod_1.z.string().optional().nullable(),
    creditLimit: zod_1.z.any().optional(),
    creditTime: zod_1.z.any().optional(),
    state: zod_1.z.string().optional(),
    country: zod_1.z.string().optional().default('India'),
    clientClassification: zod_1.z.string().optional(),
    currencySymbol: zod_1.z.string().optional(),
    bankName: zod_1.z.string().optional().nullable(),
    accountHolderName: zod_1.z.string().optional().nullable(),
    accountNumber: zod_1.z.string().optional().nullable(),
    ifscCode: zod_1.z.string().optional().nullable(),
    gstNumber: zod_1.z.string().optional().nullable(),
    panNumber: zod_1.z.string().optional().nullable(),
}).passthrough();
exports.CreateDepartmentSchema = zod_1.z.any();
exports.CreateJobCardBodySchema = zod_1.z.any();
exports.CreateLogBodySchema = zod_1.z.any();
exports.CreatePlanBodySchema = zod_1.z.any();
exports.CreateProductBodySchema = zod_1.z.any();
exports.CreateQcRecordBodySchema = zod_1.z.any();
exports.CreateRoutingBodySchema = zod_1.z.any();
exports.CreateShiftBodySchema = zod_1.z.any();
exports.CreateUserAdminSchema = zod_1.z.any();
exports.CreateVendorBodySchema = zod_1.z.object({
    name: zod_1.z.string(),
    isVendor: zod_1.z.boolean().optional(),
    contactNo: zod_1.z.string(),
    email: zod_1.z.string().optional().nullable(),
    bankDetails: zod_1.z.string().optional().nullable(),
    paymentTerms: zod_1.z.string().optional().nullable(),
    gstDetails: zod_1.z.string().optional().nullable(),
    creditTime: zod_1.z.any().optional(),
    bankName: zod_1.z.string().optional().nullable(),
    accountHolderName: zod_1.z.string().optional().nullable(),
    accountNumber: zod_1.z.string().optional().nullable(),
    ifscCode: zod_1.z.string().optional().nullable(),
    gstNumber: zod_1.z.string().optional().nullable(),
    panNumber: zod_1.z.string().optional().nullable(),
    currencySymbol: zod_1.z.string().optional(),
    currencyId: zod_1.z.string().optional(),
}).passthrough();
exports.CreateWorkCenterBodySchema = zod_1.z.any();
exports.CreateWorkOrderBodySchema = zod_1.z.any();
exports.DisbursePayrollSchema = zod_1.z.any();
exports.DownloadBackupQuerySchema = zod_1.z.any();
exports.ExpenseSchema = zod_1.z.any();
exports.FollowUpSchema = zod_1.z.any();
exports.GeneratePayrollSchema = zod_1.z.any();
exports.GetChatGroupMessagesQuerySchema = zod_1.z.any();
exports.IssueMaterialsToWorkOrderBodySchema = zod_1.z.any();
exports.LeadSchema = zod_1.z.any();
exports.LeaveRequestSchema = zod_1.z.any();
exports.ListAttendanceQuerySchema = zod_1.z.any();
exports.ListAuditLogsQuerySchema = zod_1.z.any();
exports.ListCustomersQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    group: zod_1.z.string().optional(),
}).passthrough();
exports.ListLeaveRequestsQuerySchema = zod_1.z.any();
exports.ListPayrollQuerySchema = zod_1.z.any();
exports.ListProductsQuerySchema = zod_1.z.any();
exports.ListVendorsQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
}).passthrough();
exports.ManageChatGroupMembersSchema = zod_1.z.any();
exports.OpportunitySchema = zod_1.z.any();
exports.PaymentSchema = zod_1.z.any();
exports.ReceiptSchema = zod_1.z.any();
exports.RestoreBackupSchema = zod_1.z.any();
exports.SendChatMessageSchema = zod_1.z.any();
exports.ShiftRosterSchema = zod_1.z.any();
exports.UpdateBackupSettingsSchema = zod_1.z.any();
exports.UpdateBomBodySchema = zod_1.z.any();
exports.UpdateChatGroupSettingsSchema = zod_1.z.any();
exports.UpdateCustomerBodySchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    customerType: zod_1.z.string().optional(),
    customerGroup: zod_1.z.string().optional().nullable(),
    contactPerson: zod_1.z.string().optional().nullable(),
    contactNo: zod_1.z.string().optional(),
    email: zod_1.z.string().optional().nullable(),
    billingAddress: zod_1.z.string().optional().nullable(),
    shippingAddress: zod_1.z.string().optional().nullable(),
    creditLimit: zod_1.z.any().optional(),
    creditTime: zod_1.z.any().optional(),
    state: zod_1.z.string().optional(),
    country: zod_1.z.string().optional(),
    clientClassification: zod_1.z.string().optional(),
    currencySymbol: zod_1.z.string().optional(),
    bankName: zod_1.z.string().optional().nullable(),
    accountHolderName: zod_1.z.string().optional().nullable(),
    accountNumber: zod_1.z.string().optional().nullable(),
    ifscCode: zod_1.z.string().optional().nullable(),
    gstNumber: zod_1.z.string().optional().nullable(),
    panNumber: zod_1.z.string().optional().nullable(),
}).passthrough();
exports.UpdateDepartmentSchema = zod_1.z.any();
exports.UpdateEmployeeSchema = zod_1.z.any();
exports.UpdateJobCardBodySchema = zod_1.z.any();
exports.UpdateLeaveStatusSchema = zod_1.z.any();
exports.UpdatePlanBodySchema = zod_1.z.any();
exports.UpdateProductBodySchema = zod_1.z.any();
exports.UpdateQcRecordBodySchema = zod_1.z.any();
exports.UpdateReworkCardBodySchema = zod_1.z.any();
exports.UpdateRolePermissionsSchema = zod_1.z.any();
exports.UpdateRoutingBodySchema = zod_1.z.any();
exports.UpdateShiftBodySchema = zod_1.z.any();
exports.UpdateUserAdminSchema = zod_1.z.any();
exports.UpdateVendorBodySchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    isVendor: zod_1.z.boolean().optional(),
    contactNo: zod_1.z.string().optional(),
    email: zod_1.z.string().optional().nullable(),
    bankDetails: zod_1.z.string().optional().nullable(),
    paymentTerms: zod_1.z.string().optional().nullable(),
    gstDetails: zod_1.z.string().optional().nullable(),
    creditTime: zod_1.z.any().optional(),
    bankName: zod_1.z.string().optional().nullable(),
    accountHolderName: zod_1.z.string().optional().nullable(),
    accountNumber: zod_1.z.string().optional().nullable(),
    ifscCode: zod_1.z.string().optional().nullable(),
    gstNumber: zod_1.z.string().optional().nullable(),
    panNumber: zod_1.z.string().optional().nullable(),
    currencySymbol: zod_1.z.string().optional(),
    currencyId: zod_1.z.string().optional(),
}).passthrough();
exports.UpdateWorkCenterBodySchema = zod_1.z.any();
exports.UpdateWorkOrderBodySchema = zod_1.z.any();
// WhatsApp Module Schemas
exports.CreateWhatsappTemplateSchema = zod_1.z.object({
    documentType: zod_1.z.string(),
    template: zod_1.z.string().min(1, "Template body cannot be empty"),
    isActive: zod_1.z.boolean().optional()
});
exports.UpdateWhatsappTemplateSchema = zod_1.z.object({
    template: zod_1.z.string().min(1, "Template body cannot be empty"),
    isActive: zod_1.z.boolean().optional()
});
exports.SendWhatsappMessageSchema = zod_1.z.object({
    documentType: zod_1.z.string().optional(),
    documentId: zod_1.z.string().optional(),
    recipientPhone: zod_1.z.string(),
    customMessage: zod_1.z.string().optional(),
    customPlaceholders: zod_1.z.record(zod_1.z.string()).optional(),
    mode: zod_1.z.enum(["SHARE_LINK", "AUTOMATED"]),
    pdfBase64: zod_1.z.string().optional(),
    pdfFilename: zod_1.z.string().optional()
});
exports.UpdateWhatsappSettingsSchema = zod_1.z.object({
    defaultCountryCode: zod_1.z.string().optional(),
    maxLimitPerHour: zod_1.z.number().int().positive().optional()
});
//# sourceMappingURL=index.js.map