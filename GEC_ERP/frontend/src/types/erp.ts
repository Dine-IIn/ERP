// TypeScript types for GEC Moulding Machine Custom ERP

export type Role = 'Admin' | 'Production Manager' | 'Store Manager' | 'QC Officer' | string;

export type PermissionLevel = 'FULL_ACCESS' | 'EDIT' | 'CREATE' | 'VIEW' | 'NO_ACCESS';

export type PermissionAction = 'VIEW' | 'CREATE' | 'EDIT' | 'DELETE' | 'APPROVE';

export interface RBACFeatureDefinition {
  key: string;
  name: string;
  category: string;
  description: string;
}

export const RBAC_FEATURES: RBACFeatureDefinition[] = [
  { key: 'item_master', name: 'Item Master Catalog', category: 'Masters', description: 'Components, raw materials, specs & vendor priority' },
  { key: 'customer_master', name: 'Customer Master', category: 'Masters', description: 'Customer directory, shipping addresses & GSTIN' },
  { key: 'vendor_master', name: 'Vendor / Supplier Master', category: 'Masters', description: 'Vendor partner directory & bank details' },
  { key: 'bom_master', name: 'BOM Master (Bill of Materials)', category: 'Engineering', description: 'Multi-level machine structure & component costing' },
  { key: 'sales_orders', name: 'Sales Orders', category: 'Commercial', description: 'Customer orders, dispatch targets & WO generation' },
  { key: 'work_orders', name: 'Work Orders (Shopfloor Build)', category: 'Production', description: 'Machine build travellers & customized BOM components' },
  { key: 'job_cards', name: 'Job Cards & Machine Operations', category: 'Production', description: 'Sub-component in-house machining & work logs' },
  { key: 'floor_planning', name: 'Shopfloor Station Planning', category: 'Production', description: 'Station bay assignment & auto-progress scheduling' },
  { key: 'inhouse_inventory', name: 'In-House Store Inventory', category: 'Inventory', description: 'Physical store counts, reorder warnings & stock adjustments' },
  { key: 'external_jobwork', name: 'External Jobwork / Challans', category: 'Inventory', description: 'Outward jobwork challans & vendor return tracking' },
  { key: 'purchase_orders', name: 'Purchase Orders', category: 'Procurement', description: 'PO creation for bought-out parts & approval cycle' },
  { key: 'goods_receipt', name: 'Goods Received (GRN)', category: 'Procurement', description: 'Inward material inspection & store receipt' },
  { key: 'quality_control', name: 'Quality Control (QC)', category: 'Quality', description: 'QC inspection audits, pass/reject certificates' },
  { key: 'machine_assembly', name: 'Machine Assembly Tracking', category: 'Assembly', description: 'Sub-assembly progress & completion testing' },
  { key: 'dispatch', name: 'Dispatch & Gate Pass', category: 'Logistics', description: 'Finished goods dispatch, delivery challans & gate pass' },
  { key: 'shortage_planning', name: 'Shortage Planning Workbench', category: 'Planning', description: 'Item-wise & WO shortage analysis with max buildable qty' },
  { key: 'user_management', name: 'User & Security Access Control', category: 'Administration', description: 'User accounts, custom roles & full RBAC matrix' },
  { key: 'backups', name: 'Database Backup & Restore', category: 'Administration', description: 'Auto-backup cycles, restore points & JSON dumps' }
];

export interface ModulePermission {
  moduleKey: string;
  moduleName: string;
  level: PermissionLevel;
  actions?: PermissionAction[];
}

export interface CustomRole {
  id: string;
  name?: string;
  roleName?: string;
  description?: string;
  departmentId?: string;
  permissions?: Record<string, PermissionAction[] | PermissionLevel | string[]>;
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
  password?: string;
  avatarUrl?: string;
  isSuperAdmin?: boolean;
  desktopSessionId?: string;
  mobileSessionId?: string;
}

export interface ItemClassDefinition {
  code: string;
  name: string;
  description: string;
}

export const FIXED_ITEM_CLASSES: ItemClassDefinition[] = [
  { code: 'FP', name: 'Final Product', description: 'Final Finished Machine / Product' },
  { code: 'AS', name: 'Assembly', description: 'Assembly' },
  { code: 'FAS', name: 'Fabrication Assembly', description: 'Fabrication Assembly' },
  { code: 'LC', name: 'Laser Cut', description: 'Laser Cut' },
  { code: 'MF', name: 'Manufacturing', description: 'Manufacturing' },
  { code: 'RM', name: 'Raw Material', description: 'Raw Material' },
  { code: 'BO', name: 'Bought Out', description: 'Bought Out' },
  { code: 'CON', name: 'Consumable', description: 'Consumable' }
];

export type ItemCategory = string;

export type QCTrigger = 'ON_GRN' | 'DURING_ASSEMBLY' | 'NO_QC' | '';

export type MaterialProcessSource = 'In-house' | 'Job work' | 'Bought out';
export type MaterialProcessType = 'In-house' | 'Job work' | 'Bought out' | 'Job work + Bought out' | '';

export interface ProcessDefinition {
  id: string;
  name: string;
  shortCode: string; // e.g. "LC", "VMC", "TRN", "HT", "GRD", "PLT", "PC", "EDM", "FAB", "MCH", "BOR", "DRL", "POL"
  description?: string;
  defaultRate?: number;
  defaultUOM?: string;
  isSystem?: boolean;
  createdAt?: string;
}

export const SYSTEM_PROCESS_DEFINITIONS: Record<string, { name: string; description: string }> = {
  'MCH': { name: 'Machining / Milling', description: 'Heavy CNC/VMC Face & Profile Milling, Edge Truing & Squaring' },
  'BOR': { name: 'Precision Boring', description: 'CNC Line Boring, Tie Bar Hole Boring & Pivot Seat Machining (H7)' },
  'TRN': { name: 'CNC Turning / Lathe', description: 'CNC Precision Turning, Facing, Threading, OD/ID Grooving & Step Turning' },
  'DRL': { name: 'Drilling & Tapping', description: 'CNC PCD Hole Pattern Drilling, Tapping, Counterboring & Reaming' },
  'HT': { name: 'Heat Treatment', description: 'Stress Relieving, Induction Surface Hardening (50-55 HRC), Gas Nitriding' },
  'GRD': { name: 'Surface & Cylindrical Grinding', description: 'Precision Ra 0.4 Micron Surface, Diameter & Gear Tooth Profile Grinding' },
  'POL': { name: 'Honing & Polishing', description: 'Mirror Finish Internal Bore Honing, Buffing & Lapping' },
  'PLT': { name: 'Plating & Surface Treatment', description: 'Hard Chrome Plating, Manganese Phosphating, Blackening & Anti-Rust Coating' },
  'LC': { name: 'Laser Cutting', description: 'CNC Sheet metal & plate precision fiber laser cutting' },
  'VMC': { name: 'VMC Machining', description: '4-Axis Vertical Machining Center boring & milling' },
  'PC': { name: 'Powder Coating / PU Painting', description: 'Industrial grade 7-tank pretreatment powder coating' },
  'EDM': { name: 'Wire EDM / Spark Erosion', description: 'Precision die profile wire cut electric discharge machining' },
  'FAB': { name: 'Base Fabrication & Stress Relieving', description: 'Heavy MIG welding with vibration stress relief' },
  'ASSY': { name: 'Sub-Assembly & Fitting', description: 'Mechanical sub-assembly integration, alignment & pin fitment' }
};

export function getProcessTooltip(shortCode?: string, name?: string, customProcs?: ProcessDefinition[]): string {
  if (!shortCode && !name) return 'Process Operation';
  const codeKey = (shortCode || '').trim().toUpperCase();
  
  // 1. Check custom process definitions passed in
  if (customProcs && customProcs.length > 0) {
    const custom = customProcs.find(p => p.shortCode.toUpperCase() === codeKey || p.name.toLowerCase() === (name || '').toLowerCase());
    if (custom) {
      return `${custom.shortCode} - ${custom.name}${custom.description ? `: ${custom.description}` : ''}`;
    }
  }

  // 2. Check standard system definitions
  if (SYSTEM_PROCESS_DEFINITIONS[codeKey]) {
    const def = SYSTEM_PROCESS_DEFINITIONS[codeKey];
    return `${codeKey} - ${def.name}: ${def.description}`;
  }

  // 3. Fallback to name or short code
  if (name && shortCode && name.toUpperCase() !== shortCode.toUpperCase()) {
    return `${shortCode} - ${name}`;
  }
  return name || shortCode || 'Process Operation';
}

export interface ItemProcessStep {
  stepNumber: number;
  processId: string;
  processName: string;
  processShortCode: string;
  vendorIds: string[]; // Vendors authorized for this specific step
  estimatedDays?: number;
  costPerUnit?: number;
  remarks?: string;
}

export interface ItemProcessCard {
  id: string;
  itemId: string; // Base target item ID (Finished Item)
  itemCode: string;
  itemName: string;
  rawItemId?: string; // Raw Item ID
  rawItemCode?: string; // Raw Item Code
  rawItemName?: string; // Raw Item Name
  targetParentProductId?: string; // Product / Machine model on which this component goes
  targetParentProductName?: string;
  steps: ItemProcessStep[];
  lastUpdated?: string;
  notes?: string;
}

export interface IntermediateProcessItem {
  id: string;
  baseItemId: string;
  baseItemCode: string;
  baseItemName: string;
  processCardId: string;
  completedStepNumbers: number[];
  processCodeSuffix: string; // e.g. "-LC-VMC"
  fullItemCode: string; // e.g. "GEC-SHAFT-01-LC-VMC"
  inHouseStock: number;
  externalStock: number;
  unit: string;
  currentStepIndex: number;
  nextStepNumber?: number;
  nextProcessName?: string;
  nextAllowedVendorIds?: string[];
  unitPrice?: number;
}

export interface VendorDebitChallan {
  id: string;
  challanNo: string; // e.g. "DN-2026-0001"
  sourceType: 'GRN' | 'QC' | 'JOBWORK';
  sourceReferenceNo: string; // e.g. GRN Number or QC Inspection Number
  vendorId: string;
  vendorName: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  rejectedQty: number;
  unit: string;
  unitPrice: number;
  totalLossAmount: number;
  defectReason: string;
  reworkProcessRequired?: string;
  status: 'PENDING_DEBIT' | 'DEBITED' | 'REPLACED_CREDIT';
  createdAt: string;
  createdBy?: string;
}

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
  category: string; // Item Class Code (e.g. RM, MC, BO, EL, HY, SA, FG, CS)
  itemClass?: string;
  leadTimeDays?: number;
  unit: string;
  purchaseUOM?: string;
  conversionFactor?: number;
  inHouseStock: number;
  externalStock: number;
  minStockQty?: number;
  minOrderQty?: number;
  reorderLevel?: number;
  pendingQCStock?: number;
  unitPrice: number;
  weightKg?: number;
  location: string;
  qcTrigger?: QCTrigger;
  testReportRequired?: boolean;
  note?: string;
  processType?: MaterialProcessType;
  materialProcessType?: MaterialProcessType;
  materialProcessSources?: MaterialProcessSource[]; // Multi-select: ['In-house', 'Job work', 'Bought out']
  mappedVendors?: ItemMappedVendor[];
  specification?: string;
  isDirectJobworkShipment?: boolean;
  isBlocked?: boolean;
  blockedAt?: string;
  isProcessItem?: boolean;
  baseItemId?: string;
  processCodeSuffix?: string;
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

export interface SystemErrorLog {
  id: string;
  message: string;
  source?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  timestamp: string;
  severity: 'FATAL' | 'ERROR' | 'WARNING';
  userAgent?: string;
  resolved?: boolean;
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
  isBlocked?: boolean;
  blockedAt?: string;
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

export type POStatus = 'DRAFT' | 'WAITING_FOR_APPROVAL' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ISSUED' | 'SENT' | 'PARTIALLY_RECEIVED' | 'GOODS_RECEIVED' | 'RECEIVED' | 'CANCELLED';

export interface POItem {
  itemId?: string;
  itemCode?: string;
  itemName?: string;
  quantity?: number;
  orderedQty?: number;
  originalOrderedQty?: number;
  cancelledQty?: number;
  receivedQty?: number;
  unit?: string;
  purchaseUOM?: string;
  conversionFactor?: number;
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
  rejectionReason?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  cancellationReason?: string;
  cancellationChallanNo?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  isSplitFulfilled?: boolean;
  splitFromPoNumber?: string;
  splitNotes?: string;
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
  grnId?: string;
  grnNumber?: string;
  vendorId?: string;
  vendorName?: string;
  itemId?: string;
  itemCode?: string;
  itemName?: string;
  grnQty?: number;
  alreadyInspectedBefore?: number;
  remainingAfterThis?: number;
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
  jobworkType?: 'COMPLETE' | 'PROCESS_WISE';
  processCardId?: string;
  startStepNumber?: number;
  endStepNumber?: number;
  processStepsIncluded?: string[];
  processCodeSuffix?: string;
  intermediateItemCode?: string;
  isRework?: boolean;
  reworkProcessName?: string;
  items?: any[];
  itemId?: string;
  itemCode?: string;
  itemName?: string;
  producedItemId?: string;
  producedItemCode?: string;
  producedItemName?: string;
  processRequired?: string;
  sentQuantity?: number;
  receivedQuantity?: number;
  scrapQuantity?: number;
  pendingBalance?: number;
  notes?: string;
}

export type GRNRejectionDisposition = 'SCRAP' | 'IN_HOUSE_REWORK' | 'VENDOR_REWORK' | 'VENDOR_RETURN' | 'VENDOR_LOSS_DEBIT';

export interface GRNItem {
  id?: string;
  poItemId?: string;
  itemId?: string;
  itemCode?: string;
  itemName?: string;
  partCode?: string;
  isSelected?: boolean;
  prevReceived?: number;
  maxCanReceiveNow?: number;
  receivedQty?: number;
  acceptedQty?: number;
  rejectedQty?: number;
  rejectionDisposition?: GRNRejectionDisposition;
  rejectionReason?: string;
  rejectionAction?: 'NONE' | 'PROCESS_REWORK' | 'VENDOR_LOSS_DEBIT';
  reworkProcessName?: string;
  lossAmount?: number;
  debitChallanNo?: string;
  unit?: string;
  purchaseUOM?: string;
  conversionFactor?: number;
  unitPrice?: number;
  orderedQty?: number;
  quantity?: number;
  remarks?: string;
  isDirectJobwork?: boolean;
  directJWQty?: number;
  directJWProduceItemId?: string;
  directJWProduceItemCode?: string;
  directJWProduceItemName?: string;
  directJWVendorId?: string;
  directJWVendorName?: string;
  isProcessWise?: boolean;
  processCodeSuffix?: string;
  intermediateItemCode?: string;
}

export type GRNLineItem = GRNItem;

export interface GoodsReceivedNote {
  id: string;
  grnNumber: string;
  sourceType?: 'PO' | 'JOBWORK' | 'STANDALONE';
  poNumber: string;
  poId?: string;
  challanId?: string;
  vendorId?: string;
  vendorName: string;
  challanNo?: string;
  invoiceNo?: string;
  invoiceDate?: string;
  receivedDate: string;
  receivedBy?: string;
  items: GRNItem[];
  status: 'PENDING_QC' | 'QC_PASSED' | 'QC_APPROVED' | 'NO_QC' | 'PARTIALLY_QC' | 'STORED';
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

export type JobCardStatus = 'OPEN' | 'IN_PROGRESS' | 'PARTIALLY_COMPLETED' | 'COMPLETED' | 'CANCELLED';
export type JobCardType = 'PRODUCTION' | 'EXCHANGE';

export interface JobCardExchangePart {
  itemId: string;
  itemCode: string;
  itemName: string;
  action: 'RETURN_TO_STORE' | 'ISSUE_FROM_STORE';
  qty: number;
  unit: string;
}

export interface JobCardComponentLine {
  itemId: string;
  itemCode: string;
  itemName: string;
  qtyPerUnit: number;
  totalRequiredQty: number;
  issuedQty?: number;
  unit: string;
}

export interface JobCard {
  id: string;
  jobCardNo: string;
  woId?: string;
  woNumber?: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  itemType: 'SUB_ASSEMBLY' | 'ASSEMBLY';
  targetQuantity: number;
  completedQuantity: number;
  maxBuildableQuantity?: number;
  status: JobCardStatus;
  type: JobCardType;
  exchangeParts?: JobCardExchangePart[];
  reissues?: JobCardMaterialReissue[];
  assignedOperator?: string;
  startDate: string;
  completionDate?: string;
  remarks?: string;
  stationName?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  components: JobCardComponentLine[];
}

export interface FloorStation {
  id: string;
  name: string;
  code: string;
  stageTag: string;
  assignedWOIds: string[];
  capacity: number;
  supervisorName: string;
}

export interface FinishedGoodUnit {
  id: string;
  serialNo: string;
  itemId: string;
  itemCode: string;
  machineModel: string;
  woId: string;
  woNumber: string;
  allocatedSOId?: string;
  allocatedSONumber?: string;
  allocatedCustomerName?: string;
  configurationNote: string;
  customPartsDiff?: string[];
  status: 'IN_STOCK' | 'ALLOCATED' | 'DISPATCHED';
  completedDate: string;
  dispatchedDate?: string;
}

export interface DispatchRecord {
  id: string;
  dispatchNo: string;
  soId: string;
  soNumber: string;
  customerName: string;
  finishedGoodId: string;
  serialNo: string;
  machineModel: string;
  dispatchDate: string;
  transporterName?: string;
  vehicleNo?: string;
  docketNo?: string;
  notes?: string;
}

export interface JobCardMaterialReissue {
  id: string;
  reissueNo: string;
  jobCardId: string;
  jobCardNo?: string;
  woNumber?: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unit: string;
  workerName: string;
  supervisorName: string;
  reason: 'DAMAGED_DURING_FITTING' | 'LOST_MISSING' | 'MACHINE_SCRAP' | 'DEFECTIVE_RAW_MATERIAL' | 'EXTRA_REQUIREMENT' | string;
  customReason?: string;
  issuedDate: string;
  status: 'ISSUED' | 'APPROVED';
  notes?: string;
}

// Letter-Encoded Document Number Generator: PREFIX + Month (2 letters) + Year (2 letters) + 4-digit Seq
// Mapping: 0->A, 1->B, 2->C, 3->D, 4->E, 5->F, 6->G, 7->H, 8->I, 9->J
// Example: Sept 2026 -> 09 (AJ), 26 (CG) -> POAJCG0001, JWAJCG0001, QCAJCG0001, JCAJCG0001
export const generateNextDocNumber = (
  prefixType: string,
  existingList: any[] = [],
  fieldKeys: string | string[] = 'code',
  date: Date = new Date()
): string => {
  const DIGIT_MAP: Record<string, string> = {
    '0': 'A', '1': 'B', '2': 'C', '3': 'D', '4': 'E',
    '5': 'F', '6': 'G', '7': 'H', '8': 'I', '9': 'J'
  };

  const encodeDigits = (str: string) => str.split('').map(d => DIGIT_MAP[d] || d).join('');

  const monthStr = String(date.getMonth() + 1).padStart(2, '0'); // e.g. "09" -> "AJ"
  const yearStr = String(date.getFullYear()).slice(-2);           // e.g. "26" -> "CG"

  const monthCode = encodeDigits(monthStr);
  const yearCode = encodeDigits(yearStr);
  const prefix = `${prefixType}${monthCode}${yearCode}`; // e.g. "POAJCG", "JWAJCG", "QCAJCG"

  const keys = Array.isArray(fieldKeys) ? fieldKeys : [fieldKeys];
  let maxSeq = 0;

  existingList.forEach(item => {
    if (!item) return;
    for (const k of keys) {
      const val = item[k];
      if (typeof val === 'string' && val.startsWith(prefix)) {
        const seqPart = val.slice(prefix.length).split('-')[0].split('/')[0];
        const num = parseInt(seqPart, 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  });

  const nextSeq = maxSeq + 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
};

export const generateNextPONumber = (existingPOs: any[] = [], date: Date = new Date()): string => {
  return generateNextDocNumber('PO', existingPOs, ['poNumber'], date);
};

export const generateNextJobworkNumber = (existingJWs: any[] = [], date: Date = new Date()): string => {
  return generateNextDocNumber('JW', existingJWs, ['challanNo', 'jobworkNumber'], date);
};

export const generateNextQCNumber = (existingQCs: any[] = [], date: Date = new Date()): string => {
  return generateNextDocNumber('QC', existingQCs, ['qcNumber', 'inspectionNo'], date);
};

export const generateNextJobCardNumber = (existingJCs: any[] = [], date: Date = new Date()): string => {
  return generateNextDocNumber('JC', existingJCs, ['jobCardNumber', 'jobCardNo', 'id'], date);
};

export const generateNextWorkOrderNumber = (existingWOs: any[] = [], date: Date = new Date()): string => {
  return generateNextDocNumber('WO', existingWOs, ['workOrderNo', 'woNumber'], date);
};

export const generateNextSalesOrderNumber = (existingSOs: any[] = [], date: Date = new Date()): string => {
  return generateNextDocNumber('SO', existingSOs, ['soNumber', 'orderNumber'], date);
};

export const generateNextGRNNumber = (existingGRNs: any[] = [], date: Date = new Date()): string => {
  return generateNextDocNumber('GRN', existingGRNs, ['grnNumber'], date);
};

export const generateNextDispatchNumber = (existingDSPs: any[] = [], date: Date = new Date()): string => {
  return generateNextDocNumber('DSP', existingDSPs, ['dispatchNumber', 'gatepassNo', 'invoiceNo'], date);
};

export const generateNextBOMNumber = (existingBOMs: any[] = [], date: Date = new Date()): string => {
  return generateNextDocNumber('BOM', existingBOMs, ['bomCode'], date);
};

export const generateNextDebitChallanNumber = (existingDebits: any[] = [], date: Date = new Date()): string => {
  return generateNextDocNumber('DN', existingDebits, ['challanNo', 'debitChallanNo'], date);
};

export const generateNextItemCode = (existingItems: any[] = []): string => {
  let maxNum = 0;
  existingItems.forEach(item => {
    const code = item.itemCode || item.code || '';
    const match = code.match(/GEC(\d+)/i) || code.match(/(\d+)/);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });
  const nextNum = maxNum + 1;
  return `GEC${String(nextNum).padStart(7, '0')}`;
};

export const generateNextVendorCode = (existingVendors: any[] = []): string => {
  let maxNum = 0;
  existingVendors.forEach(v => {
    const code = v.vendorCode || v.code || '';
    const match = code.match(/VEN(\d+)/i) || code.match(/(\d+)/);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });
  const nextNum = maxNum + 1;
  return `VEN${String(nextNum).padStart(7, '0')}`;
};




