# GEC ERP Database Schema Documentation (`DB_SCHEMA.md`)

This document provides a comprehensive reference of all database entities, interfaces, tables, and relationships defined in the GEC ERP platform (`src/types/erp.ts`).

---

## 1. System & User Management

### `User`
Stores user accounts, authentication details, roles, and session states.
- **Primary Key**: `id: string`
- **Fields**:
  - `username: string` (Unique login handle)
  - `passwordHash?: string`
  - `fullName: string`
  - `role: Role` (`'Admin' | 'Planning' | 'Production' | 'Store' | 'Purchase' | 'Quality' | 'Dispatch' | 'User'`)
  - `isSuperAdmin?: boolean`
  - `departmentId?: string` -> Refers to `Department.id`
  - `customRoleId?: string` -> Refers to `CustomRole.id`
  - `desktopSessionId?: string`
  - `mobileSessionId?: string`
  - `createdAt: string`

### `Department`
Manufacturing and operational departments within the plant.
- **Primary Key**: `id: string`
- **Fields**: `name: string`, `code: string`, `description?: string`

### `CustomRole`
Fine-grained Role-Based Access Control (RBAC) permission matrices.
- **Primary Key**: `id: string`
- **Fields**: `roleName: string`, `permissions: Record<string, 'NO_ACCESS' | 'VIEW' | 'EDIT' | 'FULL_ACCESS'>`

---

## 2. Core Master Data

### `Item` (Item Master / SKU Catalog)
Central repository for all raw materials, components, sub-assemblies, and finished products.
- **Primary Key**: `id: string`
- **Fields**:
  - `partCode?: string` (Drawing / Manufacturer Part Number)
  - `itemCode: string` (Unique ERP SKU Code)
  - `oldItemCode?: string` (Legacy Code reference)
  - `name: string` (Description / Item Name)
  - `category: string` (`'RM'` Raw Material, `'BO'` Bought-Out, `'MF'` Manufactured, `'SA'` Sub-Assembly, `'FP'` Finished Product)
  - `processType?: 'In-house' | 'Job work' | 'Bought out' | 'Job work + Bought out'`
  - `materialProcessSources?: Array<'In-house' | 'Job work' | 'Bought out'>`
  - `unit: string` (`'Pcs'`, `'Kg'`, `'Mtr'`, etc.)
  - `inHouseStock: number` (Available inventory in main store)
  - `externalStock?: number` (Stock sitting at vendor locations for job work)
  - `pendingQCStock?: number` (Quarantine stock undergoing inspection)
  - `minStockQty?: number` (Safety reorder stock level)
  - `reorderLevel?: number`
  - `unitPrice?: number`
  - `location?: string` (Bin / Store Rack location)
  - `leadTimeDays?: number`
  - `qcTrigger?: 'MANDATORY' | 'OPTIONAL' | 'NO_QC'`

### `BOM` (Bill of Materials)
Multi-level engineering structure defining components required to build an item/machine.
- **Primary Key**: `id: string`
- **Fields**:
  - `bomCode?: string`
  - `machineModel: string` (Associated finished model name)
  - `revision: string`
  - `components: BOMComponent[]`
    - `itemId: string` -> Refers to `Item.id`
    - `itemCode: string`
    - `itemName: string`
    - `partCode?: string`
    - `oldItemCode?: string`
    - `qtyPerMachine: number`
    - `unit: string`
    - `subAssemblyTag?: string`
  - `lastUpdated: string`

### `ProcessDefinition` (Process Master)
Catalog of manufacturing processes (e.g., CNC Machining, Laser Cutting, Plating, Hardening).
- **Primary Key**: `id: string`
- **Fields**: `shortCode: string`, `name: string`, `description?: string`, `defaultRate?: number`, `defaultUOM?: string`

### `ItemProcessCard` (Process Routing Card)
Defines the sequential manufacturing routing steps and raw material link for an item.
- **Primary Key**: `id: string`
- **Fields**:
  - `itemId: string`, `itemCode: string`, `itemName: string` -> Refers to `Item`
  - `rawItemId?: string`, `rawItemCode?: string`, `rawItemName?: string` (Raw casting / input material)
  - `steps: ProcessStep[]`
    - `stepNumber: number`
    - `processId: string` -> Refers to `ProcessDefinition.id`
    - `processShortCode: string`, `processName: string`
    - `processType: 'IN_HOUSE' | 'JOB_WORK'`
    - `vendorId?: string` -> Refers to `Vendor.id`
    - `estimatedTimeMins?: number`
    - `ratePerUnit?: number`

### `Customer` & `Vendor`
Commercial partner master databases.
- **Primary Keys**: `Customer.id`, `Vendor.id`
- **Fields**: `customerCode` / `vendorCode`, `name`, `contactPerson`, `phone`, `email`, `address`, `city`, `gstin`, `pan`

---

## 3. Commercial & Procurement Transactions

### `SalesOrder` (SO)
Customer orders driving production requirements.
- **Primary Key**: `id: string`
- **Fields**:
  - `soNumber: string`
  - `customerId: string`, `customerName: string` -> Refers to `Customer`
  - `soDate: string`, `targetDeliveryDate: string`
  - `items: SOItem[]` (`itemId`, `itemCode`, `machineModel`, `orderedQty`, `unitPrice`)
  - `status: 'DRAFT' | 'APPROVED' | 'IN_PRODUCTION' | 'COMPLETED' | 'CANCELLED'`

### `PurchaseOrder` (PO)
Supplier purchase orders for bought-out items and raw materials.
- **Primary Key**: `id: string`
- **Fields**:
  - `poNumber: string`
  - `vendorId: string`, `vendorName: string` -> Refers to `Vendor`
  - `poDate: string`, `expectedDeliveryDate?: string`
  - `items: POItem[]` (`itemId`, `itemCode`, `itemName`, `quantity`, `receivedQty`, `unitPrice`, `taxRate`)
  - `status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PARTIALLY_RECEIVED' | 'GOODS_RECEIVED' | 'CANCELLED'`

---

## 4. Production & Floor Operations

### `WorkOrder` (WO)
Shop floor master work orders for assembling machines or batch components.
- **Primary Key**: `id: string`
- **Fields**:
  - `workOrderNo: string`
  - `soId?: string`, `soNumber?: string` -> Refers to `SalesOrder`
  - `machineModel: string`, `quantity: number`
  - `startDate: string`, `targetCompletionDate: string`
  - `stage: 'PLANNED' | 'FABRICATION' | 'ASSEMBLY' | 'TESTING' | 'QUALITY' | 'COMPLETED'`
  - `status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'`
  - `woComponents?: WOComponent[]` (`itemId`, `itemCode`, `partCode`, `oldItemCode`, `qtyRequired`, `issuedQty`, `location`)

### `JobCard`
Individual workstation routing tickets tracking specific manufacturing operations.
- **Primary Key**: `id: string`
- **Fields**:
  - `jobCardNo: string`
  - `woId?: string`, `woNumber?: string` -> Refers to `WorkOrder`
  - `itemId: string`, `itemCode: string`, `itemName: string`
  - `stationId?: string`, `stationName?: string`
  - `assignedOperator?: string`
  - `targetQuantity: number`, `completedQuantity: number`
  - `startDate: string`, `status: 'PLANNED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'`
  - `components?: JobCardComponent[]` (`itemId`, `itemCode`, `partCode`, `oldItemCode`, `qtyPerUnit`, `totalRequiredQty`, `issuedQty`, `location`)

### `JobworkChallan`
Outward challan for sending items to external vendors for processing under GST Rule 45.
- **Primary Key**: `id: string`
- **Fields**:
  - `challanNo: string`
  - `vendorId: string`, `vendorName: string` -> Refers to `Vendor`
  - `processRequired: string`, `issueDate: string`, `expectedReturnDate?: string`
  - `items: JobworkChallanItem[]` (`itemId`, `itemCode`, `itemName`, `sentQuantity`, `receivedQuantity`)
  - `status: 'ISSUED' | 'PARTIALLY_RETURNED' | 'COMPLETED' | 'CANCELLED'`

---

## 5. Store, Quality & Logistics

### `GoodsReceivedNotice` (GRN)
Inward goods receipt voucher recorded at the store gate.
- **Primary Key**: `id: string`
- **Fields**:
  - `grnNumber: string`
  - `poId?: string`, `poNumber?: string` -> Refers to `PurchaseOrder`
  - `vendorName: string`, `receivedDate: string`, `challanNo?: string`
  - `items: GRNItem[]` (`itemId`, `itemCode`, `receivedQty`, `acceptedQty`, `rejectedQty`)

### `QCInspection`
Quality inspection records and disposition logs.
- **Primary Key**: `id: string`
- **Fields**:
  - `grnId?: string`, `referenceNo?: string` -> Refers to `GoodsReceivedNotice`
  - `itemId: string`, `itemCode: string`, `itemName: string`
  - `inspectedQuantity: number`, `passedQuantity: number`, `rejectedQty: number`
  - `status: 'IN_INSPECTION' | 'APPROVED' | 'REJECTED' | 'PARTIALLY_APPROVED'`
  - `disposition?: 'APPROVED' | 'REJECTED' | 'REWORK'`

### `MaterialIssueRecord`
Store issuance logs for Job Cards, Work Orders, and Departments.
- **Primary Key**: `id: string`
- **Fields**:
  - `issueNo: string`, `type: 'JOB_CARD' | 'WORK_ORDER' | 'MANUAL'`
  - `referenceNo: string`, `itemId: string`, `itemCode: string`, `itemName: string`
  - `quantity: number`, `unit: string`, `issuedTo: string`, `issuedBy: string`, `issuedDate: string`

### `DispatchRecord`
Gate pass and delivery challan for dispatched finished machines.
- **Primary Key**: `id: string`
- **Fields**:
  - `dispatchNo: string`
  - `soNumber: string`, `customerName: string`
  - `machineModel: string`, `serialNo: string`
  - `transporterName?: string`, `vehicleNo?: string`, `dispatchDate: string`

---

## 6. Audit & Backup Telemetry

### `UserActivityLog`
Security and operational audit trail.
- **Primary Key**: `id: string`
- **Fields**: `userId: string`, `username: string`, `action: string`, `module: string`, `details: string`, `timestamp: string`

### `BackupRecord`
Full database dump snapshots (JSON format).
- **Primary Key**: `id: string`
- **Fields**: `timestamp: string`, `filename: string`, `data: any`, `sizeKb: number`
