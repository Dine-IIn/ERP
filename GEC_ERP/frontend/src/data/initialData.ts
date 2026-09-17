import { 
  User, Item, Customer, Vendor, JobworkChallan, 
  PurchaseOrder, GoodsReceivedNotice, WorkOrder, QCInspection, 
  MachineAssembly, BOM, SalesOrder, JobCard, FloorStation, 
  FinishedGoodUnit, DispatchRecord, ProcessDefinition, ItemProcessCard,
  VendorDebitChallan, IntermediateProcessItem
} from '../types/erp';

// Initial Accounts metadata (Passwords are dynamically authenticated and salted by backend)
export const INITIAL_USERS: User[] = [
  {
    id: 'usr-admin',
    username: 'admin',
    fullName: 'System Administrator',
    role: 'Admin',
    email: 'admin@gecmachines.com',
    isSuperAdmin: false
  },
  {
    id: 'usr-superadmin',
    username: 'superadmin',
    fullName: 'GEC System Super Admin',
    role: 'Admin',
    email: 'superadmin@gecmachines.com',
    isSuperAdmin: true
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [];

export const INITIAL_VENDORS: Vendor[] = [];

export const INITIAL_ITEM_CATEGORIES: string[] = [
  'Raw Material Casting',
  'Machined Component',
  'Bought Out Component',
  'Machine Sub-Assembly',
  'Final Machine Unit',
  'Electrical & PLC',
  'Hydraulics & Pneumatics'
];

export const INITIAL_VENDOR_CATEGORIES: string[] = [
  'Raw Material Supplier',
  'External Jobwork Vendor',
  'Bought Out Components Supplier',
  'Electrical & Electronics Vendor',
  'Hydraulics & Piping Partner'
];

export const INITIAL_ASSEMBLY_STAGES: string[] = [
  '1. BASE FABRICATION',
  '2. SUB ASSEMBLY',
  '3. HYDRAULIC FITTING',
  '4. ELECTRICAL CABLING',
  '5. FINAL TESTING & QC'
];

export const INITIAL_ITEMS: Item[] = [];

export const INITIAL_BOMS: BOM[] = [];

export const INITIAL_SALES_ORDERS: SalesOrder[] = [];

export const INITIAL_WORK_ORDERS: WorkOrder[] = [];

export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [];

export const INITIAL_GRNS: GoodsReceivedNotice[] = [];

export const INITIAL_JOBWORK_CHALLANS: JobworkChallan[] = [];

export const INITIAL_QC_INSPECTIONS: QCInspection[] = [];

export const INITIAL_ASSEMBLIES: MachineAssembly[] = [];

export const INITIAL_JOB_CARDS: JobCard[] = [];

export const INITIAL_FLOOR_STATIONS: FloorStation[] = [
  {
    id: 'stn-1',
    code: 'STN-01',
    name: 'Base Fabrication & Machining',
    capacity: 2,
    stageTag: 'BASE_FABRICATION',
    supervisorName: 'Fabrication Lead',
    assignedWOIds: []
  },
  {
    id: 'stn-2',
    code: 'STN-02',
    name: 'Clamping Unit & Platen Fitment',
    capacity: 2,
    stageTag: 'CLAMPING_FITMENT',
    supervisorName: 'Mechanical Fitment Lead',
    assignedWOIds: []
  },
  {
    id: 'stn-3',
    code: 'STN-03',
    name: 'Injection Unit & Screw Assembly',
    capacity: 2,
    stageTag: 'INJECTION_ASSEMBLY',
    supervisorName: 'Injection Specialist',
    assignedWOIds: []
  },
  {
    id: 'stn-4',
    code: 'STN-04',
    name: 'Hydraulic Manifold & Valve Piping',
    capacity: 2,
    stageTag: 'HYDRAULIC_PIPING',
    supervisorName: 'Hydraulics Engineer',
    assignedWOIds: []
  },
  {
    id: 'stn-5',
    code: 'STN-05',
    name: 'Electrical PLC & Wiring Harness',
    capacity: 2,
    stageTag: 'ELECTRICAL_WIRING',
    supervisorName: 'Electrical Lead',
    assignedWOIds: []
  },
  {
    id: 'stn-6',
    code: 'STN-06',
    name: 'Dry Run & Pressure Calibration',
    capacity: 1,
    stageTag: 'FINAL_TESTING',
    supervisorName: 'QC & Commissioning Head',
    assignedWOIds: []
  }
];

export const INITIAL_FINISHED_GOODS: FinishedGoodUnit[] = [];

export const INITIAL_DISPATCH_RECORDS: DispatchRecord[] = [];

export const INITIAL_PROCESS_DEFINITIONS: ProcessDefinition[] = [
  { id: 'proc-1', name: 'Laser Cutting', shortCode: 'LC', description: 'CNC Sheet metal & plate precision fiber laser cutting', defaultRate: 35, isSystem: true },
  { id: 'proc-2', name: 'CNC Turning / Lathe', shortCode: 'TRN', description: 'CNC Precision turning, facing, threading & grooving', defaultRate: 65, isSystem: true },
  { id: 'proc-3', name: 'VMC Machining / Milling', shortCode: 'VMC', description: '4-Axis Vertical Machining Center boring & milling', defaultRate: 120, isSystem: true },
  { id: 'proc-4', name: 'Induction Hardening / Heat Treatment', shortCode: 'HT', description: 'Induction surface case hardening 55-60 HRC', defaultRate: 45, isSystem: true },
  { id: 'proc-5', name: 'Cylindrical & Surface Grinding', shortCode: 'GRD', description: 'Micron-level Ra 0.4 surface finishing and OD grinding', defaultRate: 80, isSystem: true },
  { id: 'proc-6', name: 'Hard Chrome / Zinc Plating', shortCode: 'PLT', description: 'Corrosion-resistant electrolytic plating (25-30 micron)', defaultRate: 50, isSystem: true },
  { id: 'proc-7', name: 'Powder Coating / PU Painting', shortCode: 'PC', description: 'Industrial grade 7-tank pretreatment powder coating', defaultRate: 40, isSystem: true },
  { id: 'proc-8', name: 'Wire EDM / Spark Erosion', shortCode: 'EDM', description: 'Precision die profile wire cut electric discharge', defaultRate: 150, isSystem: true },
  { id: 'proc-9', name: 'Base Fabrication & Stress Relieving', shortCode: 'FAB', description: 'Heavy MIG welding with vibration stress relief', defaultRate: 75, isSystem: true },
  { id: 'proc-10', name: 'CNC / VMC Heavy Machining', shortCode: 'MCH', description: 'Heavy CNC/VMC Face & Profile Milling, Edge Truing & Squaring', defaultRate: 110, isSystem: true },
  { id: 'proc-11', name: 'Precision Line Boring', shortCode: 'BOR', description: 'CNC Line Boring, Tie Bar Hole Boring & Pivot Seat Machining (H7)', defaultRate: 130, isSystem: true },
  { id: 'proc-12', name: 'CNC Pattern Drilling & Tapping', shortCode: 'DRL', description: 'CNC PCD Hole Pattern Drilling, Tapping, Counterboring & Reaming', defaultRate: 55, isSystem: true },
  { id: 'proc-13', name: 'Bore Honing & Mirror Polishing', shortCode: 'POL', description: 'Mirror Finish Internal Bore Honing, Buffing & Lapping', defaultRate: 70, isSystem: true }
];

export const INITIAL_ITEM_PROCESS_CARDS: ItemProcessCard[] = [];

export const INITIAL_VENDOR_DEBIT_CHALLANS: VendorDebitChallan[] = [];

export const INITIAL_INTERMEDIATE_PROCESS_ITEMS: IntermediateProcessItem[] = [];
