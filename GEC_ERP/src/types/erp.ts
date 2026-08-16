// TypeScript types for GEC Moulding Machine Custom ERP

export type Role = 'Admin' | 'Production Manager' | 'Store Manager' | 'QC Officer';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: Role;
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

export interface Item {
  id: string;
  itemCode: string;
  name: string;
  category: ItemCategory;
  drawingNo?: string;
  unit: string;
  purchaseUOM?: string;
  conversionFactor?: number;
  inHouseStock: number;
  externalStock: number;
  reorderLevel: number;
  unitPrice: number;
  location: string;
  specification?: string;
  qcTrigger?: QCTrigger;
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
  category: string;
  contactPerson: string;
  phone: string;
  email: string;
  city: string;
  gstin: string;
  pan?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
}

export interface BOMComponent {
  itemId: string;
  itemCode: string;
  itemName: string;
  qtyPerMachine: number;
  unit: string;
  subAssemblyTag: 'Injection Unit' | 'Clamping Unit' | 'Hydraulic Powerpack' | 'Electrical Cabinet' | 'Base Frame';
  scrapPercent: number;
  estimatedHours?: number; // Component machining / assembly hours
}

export interface BOM {
  id: string;
  bomCode: string;
  machineModel: string;
  version: string;
  description?: string;
  components: BOMComponent[];
  estimatedProductionHours?: number; // Calculated dynamic production time from child components & nested BOMs
  lastUpdated: string;
}

export type SOStatus = 'DRAFT' | 'CONFIRMED' | 'WO_GENERATED' | 'COMPLETED' | 'CANCELLED';

export interface SalesOrder {
  id: string;
  soNumber: string;
  customerId: string;
  customerName: string;
  machineModel: string;
  quantity: number;
  orderDate: string;
  deliveryDate: string;
  bomId?: string;
  status: SOStatus;
  customNotes?: string;
}

export interface WOCustomComponent {
  itemId: string;
  itemCode: string;
  itemName: string;
  qtyRequired: number;
  unit: string;
  subAssemblyTag: string;
  isCustomExtra: boolean;
  estimatedHours?: number;
}

export type WOStage = 
  | 'PLANNED'
  | 'BASE_FABRICATION'
  | 'SUB_ASSEMBLY'
  | 'HYDRAULIC_FITTING'
  | 'ELECTRICAL_PANEL'
  | 'TESTING_TRIAL'
  | 'DISPATCHED';

export type WOStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';

export interface WorkOrder {
  id: string;
  workOrderNo: string;
  soId?: string;
  soNumber?: string;
  machineModel: string;
  quantity: number;
  targetCompletionDate: string;
  startDate: string;
  assignedLead: string;
  stage: WOStage;
  status: WOStatus;
  customerName?: string;
  bomId?: string;
  woComponents: WOCustomComponent[];
  totalEstimatedHours?: number; // Smart dynamic calculated build hours
  completedHours?: number;
  remarks?: string;
}

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: 'INWARD' | 'OUTWARD' | 'JOBWORK_ISSUE' | 'JOBWORK_RECEIPT' | 'ASSEMBLY_CONSUMPTION';
  quantity: number;
  referenceNo: string;
  timestamp: string;
  performedBy: string;
  notes?: string;
}

export type JobworkStatus = 'ISSUED' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'CANCELLED';

export interface JobworkChallan {
  id: string;
  challanNo: string;
  vendorId: string;
  vendorName: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  sentQuantity: number;
  receivedQuantity: number;
  scrapQuantity: number;
  pendingBalance: number;
  processRequired: string;
  issueDate: string;
  expectedReturnDate: string;
  status: JobworkStatus;
  notes?: string;
}

export type POStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

export interface POLineItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  receivedQty: number;
  amount: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  orderDate: string;
  deliveryDate: string;
  items: POLineItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: POStatus;
  remarks?: string;
}

export type GRNStatus = 'PENDING_QC' | 'QC_APPROVED' | 'STORED';

export interface GRNLineItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  orderedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  remarks?: string;
}

export interface GoodsReceivedNotice {
  id: string;
  grnNumber: string;
  poId: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  invoiceNo: string;
  invoiceDate: string;
  receivedDate: string;
  items: GRNLineItem[];
  status: GRNStatus;
  receivedBy: string;
}

export type QCType = 'INCOMING_PO' | 'JOBWORK_RETURN' | 'IN_PROCESS_ASSEMBLY';
export type QCDisposition = 'PASSED' | 'REJECTED' | 'REWORK_REQUIRED';

export interface QCInspection {
  id: string;
  qcNumber: string;
  type: QCType;
  referenceNo: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  inspectedQuantity: number;
  passedQuantity: number;
  failedQuantity: number;
  disposition: QCDisposition;
  defectReason?: string;
  inspectorName: string;
  timestamp: string;
}

export type SubAssemblyCategory = 
  | 'Injection Unit'
  | 'Clamping Unit'
  | 'Hydraulic Powerpack'
  | 'Electrical Cabinet'
  | 'Base Frame Structural';

export interface MachineAssembly {
  id: string;
  assemblyCode: string;
  machineModel: string;
  subAssemblyType: SubAssemblyCategory;
  workOrderId: string;
  workOrderNo: string;
  componentsConsumed: {
    itemId: string;
    itemCode: string;
    itemName: string;
    qtyRequired: number;
    qtyConsumed: number;
  }[];
  progressPercentage: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'TESTED_READY';
  completedDate?: string;
}

export interface MRPShortageItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  requiredQtyForBuild: number;
  currentInHouseStock: number;
  pendingPOQuantity: number;
  netShortage: number;
  suggestedAction: 'STOCK_SUFFICIENT' | 'REORDER_NEEDED' | 'CRITICAL_SHORTAGE';
}

export interface SkippedRow {
  rowNumber: number;
  identifier: string;
  reason: string;
}

export interface RejectedRow {
  rowNumber: number;
  rawData: string;
  reasons: string[];
}

export interface BulkUploadResult<T> {
  successRows: T[];
  skippedRows: SkippedRow[];
  rejectedRows: RejectedRow[];
}
