# GEC ERP - Comprehensive Scrollbar & Screen Size Analysis Guide

This document details the exact scrollbar behavior, pixel width/height triggers, and responsiveness across all modules and sub-features in the GEC ERP application (Tauri Desktop App & Web).

---

## 1. Global Screen Layout & Scaling Fundamentals

### Screen Resolution vs. Usable Container Space
In the Tauri desktop app, the window layout consists of:
- **Left Navigation Sidebar**: Fixed width **`240px`** (expanded) or **`64px`** (collapsed).
- **Top Header Bar**: Height **`48px`** (locked).
- **Main Viewport Container (`.module-layout-container`)**: Fills remaining space with `height: 100%`, `overflow-y: auto`, `display: flex`, `flex-direction: column`.
- **Data Table Containers (`.table-container`)**: Styled with `overflow-x: auto`, `overflow-y: auto`, `flex: 1`, `min-height: 0`.

| Display Type | Physical Size | OS Resolution | Windows Scaling | Usable App Content Width |
| :--- | :--- | :--- | :--- | :--- |
| **Standard Laptop** | 15" – 15.6" | 1920 x 1080 | 125% (Standard) | **~ 1240px - 1290px** |
| **Standard Laptop** | 15" – 15.6" | 1920 x 1080 | 150% (High Scale)| **~ 1030px - 1080px** |
| **Desktop PC Monitor** | 20" – 22" | 1920 x 1080 | 100% (Native) | **~ 1660px - 1680px** |
| **Desktop PC Monitor** | 24" – 27" | 1920 x 1080 | 100% (Native) | **~ 1680px** |
| **Desktop PC QHD** | 27"+ | 2560 x 1440 | 100% / 125% | **~ 1800px - 2300px** |

> **Horizontal Scroll Rule**: When the total width required by a table's columns exceeds the **Usable App Content Width**, a horizontal scrollbar appears. When shifting from a 15" laptop (~1100px - 1250px) to a 20"+ monitor (~1680px), **the horizontal scrollbar disappears** for tables requiring less than 1650px.

---

## 2. Feature & Sub-Feature Scrollbar Matrix

### 1. Material & Production Planning Matrix (`PlanningModule.tsx`)
* **Primary View: 14-Column Live Planning Matrix Table**
  * **Columns**: `#`, `Part Code`, `Item Code`, `Item Description`, `WO Req`, `Pend JobCard`, `Total Req`, `Curr Stock`, `Pend PO`, `Pend JobWork`, `Pend QC`, `Shortage`, `Min Level`, `Min Level Shortage`.
  * **Horizontal Scrollbar**:
    * Trigger width: Below **`1320px`**.
    * On 15" laptop (at 125%/150% scale): **Active** (scrolls ~100px - 250px for rightmost 2 columns).
    * On 20"+ PC monitor (at 100% scale): **No Scrollbar** (fits completely on screen).
  * **Vertical Scrollbar**: **As items are added** (grows vertically as catalog items or shortages increase).

---

### 2. Shortage Planning & Production Capacity Engine (`ShortageModule.tsx`)

#### Sub-Feature 2.1: Item-Wise Shortage & Capacity (`ITEM_WISE_SHORTAGE`)
* **Top Planned Items Strip**:
  * **Horizontal Scrollbar**: **None** (items wrap into fluid single rows).
  * **Vertical Scrollbar**: **As items are added** (scrolls internally if multiple planned items are added).
* **Consolidated Component Breakdown Table ($X + Y$)**:
  * **Columns (15)**: `#`, `Part Code`, `Item Code`, `Item Description`, `Class`, `Source`, `Demand From`, `Total Req`, `In Stock`, `Pend PO`, `Pend JW`, `Pend QC`, `Shortage`, `Min Stock`, `Actions`.
  * **Horizontal Scrollbar**:
    * Trigger width: Below **`1380px`**.
    * On 15" laptop: **Active** (scrolls ~150px - 280px for Actions and Min Stock columns).
    * On 20"+ PC monitor: **No Scrollbar** (fits 100% with zero horizontal scrolling).
  * **Vertical Scrollbar**: **As items are added** (scrolls as unique sub-components accumulate across selected items).

#### Sub-Feature 2.2: Work Order Shortage Tree (`WO_SHORTAGE`)
* **WO Multi-Select Bar**:
  * **Horizontal Scrollbar**: **None** (badges wrap into flex layout).
  * **Vertical Scrollbar**: Max height **`95px`**, scrolls **as items are added** (more active WOs).
* **Work Order Cards**:
  * **Vertical Scrollbar**: **As items are added** (multiple open Work Orders).
* **Child Component Table (inside each WO card)**:
  * **Columns (8)**: `#`, `Component Code`, `Component Name`, `Source`, `Total Req`, `In Stock`, `Net Shortage`, `Action`.
  * **Horizontal Scrollbar**: Trigger width below **`850px`** (fits without scrolling on almost all screens).
  * **Vertical Scrollbar**: Max height **`250px`**, scrolls **as items are added** (when a WO has > 5 shortage components).

#### Sub-Feature 2.3: PO / Bought-Out Shortage Tab (`PO_SHORTAGE`)
* **Consolidated Bought-Out Shortage Table**:
  * **Columns (11)**: `#`, `Item Code`, `Item Description`, `Class`, `Source Process`, `Total Req`, `Current Stock`, `Open PO`, `Pend JW`, `Shortage`, `Action`.
  * **Horizontal Scrollbar**: Trigger width below **`1100px`** (no scroll on 20"+ monitor).
  * **Vertical Scrollbar**: **As items are added**.

#### Sub-Feature 2.4: Job Work Shortage Tab (`JOBWORK_SHORTAGE`)
* **Consolidated Job Work Shortage Table**:
  * **Columns (11)**: Same 11-column layout as PO tab.
  * **Horizontal Scrollbar**: Trigger width below **`1100px`** (no scroll on 20"+ monitor).
  * **Vertical Scrollbar**: **As items are added**.

#### Sub-Feature 2.5: In-House Job Card Shortage Tab (`JOBCARD_SHORTAGE`)
* **Consolidated In-House Shortage Table**:
  * **Columns (11)**: Same 11-column layout.
  * **Horizontal Scrollbar**: Trigger width below **`1100px`** (no scroll on 20"+ monitor).
  * **Vertical Scrollbar**: **As items are added**.

#### Sub-Feature 2.6: Dual Sourcing Allocation Modal
* **Modal Dialog**: Fixed maximum width **`520px`**.
* **Horizontal Scrollbar**: **None**.
* **Vertical Scrollbar**: **None** (fits within viewport height).

---

### 3. Work Orders Module (`WorkOrderModule.tsx`)
* **Sub-Feature 3.1: Active Work Orders Table**:
  * **Columns (10)**: `WO #`, `Sales Order`, `Customer`, `Model`, `Target Qty`, `Completed`, `Progress Bar`, `Start Date`, `Status`, `Actions`.
  * **Horizontal Scrollbar**: Trigger width below **`1050px`** (fits on 15" and 20" screens).
  * **Vertical Scrollbar**: **As items are added** (active WOs list).
* **Sub-Feature 3.2: Custom BOM Component Override Table (Modal)**:
  * **Columns (8)**: `#`, `Part Code`, `Item Code`, `Description`, `Qty/Unit`, `Total Req`, `Process`, `Action`.
  * **Horizontal Scrollbar**: Trigger width below **`880px`**.
  * **Vertical Scrollbar**: Max height **`380px`**, scrolls **as items are added**.

---

### 4. BOM Master Module (`BOMMasterModule.tsx`)
* **Sub-Feature 4.1: Machine Models Directory Table**:
  * **Columns (7)**: `BOM Code`, `Model Name`, `Version`, `Total Parts`, `Est. Cost`, `Status`, `Actions`.
  * **Horizontal Scrollbar**: Trigger width below **`850px`** (no scroll on 15" or 20" screens).
  * **Vertical Scrollbar**: **As items are added** (machine model library).
* **Sub-Feature 4.2: Hierarchical BOM Sub-Assemblies Table**:
  * **Columns (9)**: `Level`, `Item Code`, `Part Code`, `Name`, `Class`, `Source`, `Qty/Machine`, `Unit Cost`, `Actions`.
  * **Horizontal Scrollbar**: Trigger width below **`1050px`**.
  * **Vertical Scrollbar**: **As items are added** (multi-level exploded parts).

---

### 5. Item Master Catalog (`ItemMasterModule.tsx`)
* **Main Item Master Table**:
  * **Columns (10)**: `#`, `Item Code`, `Part Code`, `Description`, `Class (Category)`, `Process Type`, `In-House Stock`, `Min Stock`, `Unit`, `Actions`.
  * **Horizontal Scrollbar**:
    * Trigger width: Below **`1150px`**.
    * On 15" laptop: May have small scroll (~50px) if display scaling is high (150%).
    * On 20"+ PC monitor: **No Scrollbar**.
  * **Vertical Scrollbar**: **As items are added** (full item catalog).
* **Item Edit / Vendor Mapping Sub-Table**:
  * **Horizontal Scrollbar**: Trigger width below **`600px`**.
  * **Vertical Scrollbar**: Max height **`200px`**, scrolls **as items are added** (multiple mapped suppliers).

---

### 6. Purchase Orders Module (`PurchaseOrderModule.tsx`)
* **Sub-Feature 6.1: Purchase Orders List Table**:
  * **Columns (9)**: `PO #`, `Vendor Name`, `Order Date`, `Exp Delivery`, `Items Count`, `Total Amount (₹)`, `Status`, `Payment`, `Actions`.
  * **Horizontal Scrollbar**: Trigger width below **`1000px`**.
  * **Vertical Scrollbar**: **As items are added**.
* **Sub-Feature 6.2: PO Line Item Editor (Modal)**:
  * **Horizontal Scrollbar**: Trigger width below **`780px`**.
  * **Vertical Scrollbar**: Max height **`300px`**, scrolls **as items are added** (line items).

---

### 7. External Job Work Module (`ExternalInventoryModule.tsx`)
* **Sub-Feature 7.1: Job Work Challans Table**:
  * **Columns (10)**: `Challan #`, `Vendor`, `Item Code`, `Item Name`, `Sent Qty`, `Received`, `Pending Balance`, `Issue Date`, `Return Due`, `Status`.
  * **Horizontal Scrollbar**: Trigger width below **`1150px`**.
  * **Vertical Scrollbar**: **As items are added**.

---

### 8. In-House Job Cards & Operations (`JobCardModule.tsx`)
* **Main Job Cards Table**:
  * **Columns (10)**: `Job Card #`, `WO #`, `Item Code`, `Item Name`, `Target Qty`, `Completed`, `Operator`, `Station`, `Status`, `Actions`.
  * **Horizontal Scrollbar**: Trigger width below **`1120px`**.
  * **Vertical Scrollbar**: **As items are added**.

---

### 9. Quality Control & Inspection (`QualityControlModule.tsx`)
* **Sub-Feature 9.1: Pending QC Inspections Table**:
  * **Columns (9)**: `Inspection #`, `Source (GRN/JC)`, `Item Code`, `Item Name`, `Lot Qty`, `Passed`, `Rejected`, `Date`, `Actions`.
  * **Horizontal Scrollbar**: Trigger width below **`1050px`**.
  * **Vertical Scrollbar**: **As items are added**.

---

### 10. Goods Received Notes - GRN (`GRNModule.tsx`)
* **GRN Register Table**:
  * **Columns (9)**: `GRN #`, `PO #`, `Vendor`, `Challan / Invoice`, `Received Date`, `Total Items`, `QC Status`, `Store Status`, `Actions`.
  * **Horizontal Scrollbar**: Trigger width below **`1050px`**.
  * **Vertical Scrollbar**: **As items are added**.

---

### 11. Sales Orders & Dispatch (`SalesOrderModule.tsx` & `DispatchModule.tsx`)
* **Sales Orders Register Table**:
  * **Columns (9)**: `SO #`, `Customer`, `Model / Qty`, `Order Date`, `Target Dispatch`, `Advance`, `Status`, `WO Generated`, `Actions`.
  * **Horizontal Scrollbar**: Trigger width below **`1000px`**.
  * **Vertical Scrollbar**: **As items are added**.
* **Dispatch & Gate Pass Table**:
  * **Columns (8)**: `Gate Pass #`, `SO #`, `Customer`, `Vehicle #`, `Transporter`, `Date`, `Status`, `Actions`.
  * **Horizontal Scrollbar**: Trigger width below **`900px`**.
  * **Vertical Scrollbar**: **As items are added**.

---

### 12. User Management & Security Access (`UserManagementModule.tsx`)
* **Sub-Feature 12.1: User Accounts Table**:
  * **Columns (7)**: `Username`, `Full Name`, `Department`, `Role`, `Contact`, `Status`, `Actions`.
  * **Horizontal Scrollbar**: Trigger width below **`800px`**.
  * **Vertical Scrollbar**: **As items are added**.
* **Sub-Feature 12.2: RBAC Feature Permission Matrix Grid**:
  * **Columns (6)**: `Module / Feature`, `Category`, `View`, `Create`, `Edit`, `Approve`.
  * **Horizontal Scrollbar**: Trigger width below **`900px`**.
  * **Vertical Scrollbar**: **As items are added** (all system feature rows).

---

## 3. Summary Comparison: 15" Laptop vs. 20"+ Desktop Monitor

| Feature / Table | Minimum Width Needed | 15" Laptop (125% Scale) | 20"+ Monitor (100% Scale) | Vertical Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Material Planning Matrix (14 Col)** | ~ 1320px | **Scrolls** (~100px) | **Zero Scrollbar** (Fits cleanly) | As items are added |
| **Consolidated Item-Wise Shortage ($X+Y$)** | ~ 1380px | **Scrolls** (~150px) | **Zero Scrollbar** (Fits cleanly) | As items are added |
| **WO Shortage Tree Child Table** | ~ 850px | **Zero Scrollbar** | **Zero Scrollbar** | Max 250px / As items added |
| **PO / Jobwork / JC Shortage Tabs** | ~ 1100px | **Zero Scrollbar** | **Zero Scrollbar** | As items are added |
| **Work Orders Master Table** | ~ 1050px | **Zero Scrollbar** | **Zero Scrollbar** | As items are added |
| **Item Master Catalog Table** | ~ 1150px | **Zero Scrollbar** | **Zero Scrollbar** | As items are added |
| **BOM Hierarchy Table** | ~ 1050px | **Zero Scrollbar** | **Zero Scrollbar** | As items are added |
| **Purchase Orders List** | ~ 1000px | **Zero Scrollbar** | **Zero Scrollbar** | As items are added |
| **Quality Control Table** | ~ 1050px | **Zero Scrollbar** | **Zero Scrollbar** | As items are added |
| **Sales Order & Dispatch Tables** | ~ 1000px | **Zero Scrollbar** | **Zero Scrollbar** | As items are added |
| **User & RBAC Permissions** | ~ 900px | **Zero Scrollbar** | **Zero Scrollbar** | As items are added |
