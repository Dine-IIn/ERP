// TypeScript types for GEC Moulding Machine Custom ERP

export type Role = 'Admin' | 'Production Manager' | 'Store Manager' | 'QC Officer' | string;

export type PermissionLevel = 'FULL_ACCESS' | 'VIEW_EDIT' | 'VIEW_ONLY' | 'VIEW_ACCESS' | 'NO_ACCESS';

export interface ModulePermission {
  moduleKey: string;
  moduleName: string;
  level: PermissionLevel;
}

export interface CustomRole {
  id: string;
  name?: string;
  roleName?: string;
  description?: string;
  departmentId?: string;
  permissions?: any;
  isSystemRole?: boolean;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  headName?: string;
  description?: string;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  roleId?: string;
  departmentId?: string;
  email: string;
  avatarUrl?: string;
  isSuperAdmin?: boolean;
  desktopSessionId?: string;
  mobileSessionId?: string;
}

export type ItemCategory = 
  | 'Raw Material Casting'
  | 'Machined Component'
  | 'Hydraulic Part'
  | 'Electrical & Automation'
  | 'Machine Sub-Assembly'
  | 'Final Machine Unit'
  | 'Consumable & Hardware'
  | string;

export type QCTrigger = 'ON_GRN' | 'DURING_ASSEMBLY' | 'NO_QC';

export type MaterialProcessType = 'IN_HOUSE' | 'JOBWORK_EXTERNAL' | 'BOUGHT_OUT' | 'In-house' | string;

export interface ItemMappedVendor {
  vendorId: string;
  vendorName: string;
  priorityOrder?: number;
  priority?: number;
}

export interface Item {
  id: string;
  itemCode: string;
  partCode?: string;
  oldItemCode?: string;
  name: string;
  partNo?: string;
  category: ItemCategory;
  drawingNo?: string;
  unit: string;
  purchaseUOM?: string;
  conversionFactor?: number;
  inHouseStock: number;
  externalStock: number;
  minStockQty?: number;
  minOrderQty?: number;
  reorderLevel?: number;
  grnAllowancePercent?: number;
  unitPrice: number;
  weightKg?: number;
  location: string;
  qcTrigger?: QCTrigger;
  testReportRequired?: boolean;
  note?: string;
  mappedVendors?: ItemMappedVendor[];
  specification?: string;
  isDirectJobworkShipment?: boolean;
}

export interface UserActivityLog {
  id: string;
  userId?: string;
  username: string;
  role: string;
  action: string;
  module: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface BackupRecord {
  id: string;
  fileName: string;
  filePath: string;
  fileSizeKb: number;
  backupType: 'MANUAL' | 'SCHEDULED';
  createdAt: string;
  status: 'SUCCESS' | 'FAILED';
}

export interface Customer {
  id: string;
  customerCode: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstin: string;
  pan?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  address: string;
  city: string;
  state: string;
}

export interface Vendor {
  id: string;
  vendorCode: string;
  name: string;
  category?: string;
  contactPerson: string;
  phone: string;
  email: string;
  city: string;
  gstin: string;
  pan?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  creditDays?: number;
  website?: string;
  note?: string;
  address?: string;
  state?: string;
  country?: string;
  pincode?: string;
  reportDocument?: string;
  reportDocumentDataUrl?: string;
  accountHolderName?: string;
  weeklyHoliday?: string;
  hasOtherShippingAddress?: boolean;
  shippingAddress?: {
    address: string;
    city: string;
    pincode: string;
    state: string;
    country: string;
  };
}

export interface BOMComponent {
  itemId?: string;
  itemCode?: string;
  itemName?: string;
  qtyPerMachine: number;
  unit: string;
  subAssemblyTag: 'Injection Unit' | 'Clamping Unit' | 'Hydraulic Powerpack' | 'Electrical Cabinet' | 'Base Frame' | string;
  scrapPercent: number;
  estimatedHours?: number;
}

export interface BOM {
  id: string;
  bomCode: string;
  machineModel: string;
  version: string;
  description?: string;
  components: BOMComponent[];
  estimatedProductionHours?: number;
  lastUpdated: string;
}

export type SOStatus = 'DRAFT' | 'CONFIRMED' | 'WO_GENERATED' | 'COMPLETED' | 'CANCELLED';

export interface SalesOrder {
  id: string;
  soNumber: string;
  customerId: string;
  customerName: string;
  machineModel: string;
  bomId?: string;
  quantity?: number;
  unitPrice?: number;
  totalAmount?: number;
  deliveryDate: string;
  orderDate: string;
  status: SOStatus;
  notes?: string;
  customNotes?: string;
}

export type POStatus = 'DRAFT' | 'WAITING_FOR_APPROVAL' | 'APPROVED' | 'ISSUED' | 'SENT' | 'PARTIALLY_RECEIVED' | 'GOODS_RECEIVED' | 'RECEIVED' | 'CANCELLED';

export interface POItem {
  itemId?: string;
  itemCode?: string;
  itemName?: string;
  quantity?: number;
  orderedQty?: number;
  receivedQty?: number;
  unit?: string;
  unitPrice?: number;
  totalAmount?: number;
  amount?: number;
}

export type POLineItem = POItem;

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  deliveryDate?: string;
  poCreateDateTime?: string;
  preparedBy?: string;
  status: POStatus;
  items: POItem[];
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  notes?: string;
  remarks?: string;
}

export type WOStage = 'PLANNING' | 'ASSEMBLY' | 'TESTING' | 'QUALITY' | 'COMPLETED' | string;

export interface WOCustomComponent {
  itemId?: string;
  itemCode?: string;
  itemName?: string;
  qty?: number;
  qtyRequired?: number;
  unit?: string;
  subAssemblyTag?: string;
  isCustomExtra?: boolean;
}

export type WOStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';

export interface WorkOrder {
  id: string;
  woNumber?: string;
  workOrderNo?: string;
  soNumber?: string;
  soId?: string;
  customerName?: string;
  quantity?: number;
  stage?: WOStage;
  woComponents?: WOCustomComponent[];
  assignedLead?: string;
  remarks?: string;
  machineModel: string;
  targetQuantity?: number;
  completedQuantity?: number;
  startDate?: string;
  targetCompletionDate?: string;
  status: WOStatus;
  assignedSupervisor?: string;
  bomId: string;
  notes?: string;
}

export type QCStatus = 'PENDING' | 'IN_INSPECTION' | 'APPROVED' | 'REJECTED' | 'CONDITIONAL_APPROVAL';
export type QCType = 'GRN' | 'ASSEMBLY' | 'IN_HOUSE_PROCESS' | string;
export type QCDisposition = 'APPROVED' | 'REJECTED' | 'REWORK' | string;

export interface QCInspection {
  id: string;
  inspectionNo?: string;
  qcNumber?: string;
  referenceType?: 'GRN' | 'ASSEMBLY' | 'IN_HOUSE_PROCESS';
  referenceNo?: string;
  itemId?: string;
  itemCode?: string;
  itemName?: string;
  inspectedQty?: number;
  inspectedQuantity?: number;
  passedQuantity?: number;
  failedQuantity?: number;
  approvedQty?: number;
  rejectedQty?: number;
  reworkQty?: number;
  inspectorName?: string;
  inspectionDate?: string;
  status?: QCStatus;
  defectCategory?: string;
  defectReason?: string;
  remarks?: string;
  disposition?: string;
  timestamp?: string;
  type?: QCType;
}

export type AssemblyStage = 'BASE_FRAME' | 'HYDRAULIC_POWERPACK' | 'CLAMPING_UNIT' | 'INJECTION_UNIT' | 'ELECTRICAL_CABINET' | 'FINAL_TESTING';
export type AssemblyStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'STAGE_COMPLETED' | 'TESTING_PASSED' | 'READY_FOR_DISPATCH';

export interface MachineAssemblyProgress {
  id: string;
  woNumber?: string;
  workOrderId?: string;
  workOrderNo?: string;
  machineSerialNo?: string;
  machineModel: string;
  currentStage?: AssemblyStage;
  stageStatus?: AssemblyStatus;
  assemblyLeader?: string;
  startDate?: string;
  targetDate?: string;
  completedStages?: AssemblyStage[];
  notes?: string;
  status?: string;
  assemblyCode?: string;
  subAssemblyType?: string;
  componentsConsumed?: any[];
  progressPercentage?: number;
}

export type MachineAssembly = MachineAssemblyProgress;

export interface JobworkChallan {
  id: string;
  challanNo: string;
  vendorId: string;
  vendorName: string;
  issueDate: string;
  expectedReturnDate: string;
  status: string;
  items?: any[];
  itemId?: string;
  itemCode?: string;
  itemName?: string;
  processRequired?: string;
  sentQuantity?: number;
  receivedQuantity?: number;
  scrapQuantity?: number;
  pendingBalance?: number;
  notes?: string;
}

export interface GRNItem {
  poItemId?: string;
  itemId?: string;
  itemCode?: string;
  itemName?: string;
  receivedQty?: number;
  acceptedQty?: number;
  rejectedQty?: number;
  unit?: string;
  unitPrice?: number;
  orderedQty?: number;
  quantity?: number;
  remarks?: string;
}

export type GRNLineItem = GRNItem;

export interface GoodsReceivedNote {
  id: string;
  grnNumber: string;
  poNumber: string;
  poId?: string;
  vendorId?: string;
  vendorName: string;
  challanNo?: string;
  invoiceNo?: string;
  invoiceDate?: string;
  receivedDate: string;
  receivedBy?: string;
  items: GRNItem[];
  status: 'PENDING_QC' | 'QC_PASSED' | 'QC_APPROVED' | 'STORED';
}

export type GoodsReceivedNotice = GoodsReceivedNote;

export interface MRPShortageItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  unit?: string;
  requiredQtyForBuild?: number;
  currentInHouseStock?: number;
  pendingPOQuantity?: number;
  netShortage?: number;
  suggestedAction?: 'RAISE_PO' | 'STOCK_SUFFICIENT' | string;
  requiredQty?: number;
  inHouseStock?: number;
  shortageQty?: number;
  suggestedVendor?: string;
}

export interface BulkUploadResult<T> {
  successRows?: T[];
  validRows?: T[];
  skippedRows?: any[];
  rejectedRows?: any[];
  errors?: string[];
}
