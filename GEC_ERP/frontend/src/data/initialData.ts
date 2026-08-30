import { 
  User, Item, Customer, Vendor, JobworkChallan, 
  PurchaseOrder, GoodsReceivedNotice, WorkOrder, QCInspection, 
  MachineAssembly, BOM, SalesOrder, JobCard, FloorStation, 
  FinishedGoodUnit, DispatchRecord 
} from '../types/erp';

// Clean Single Admin Account
export const INITIAL_USERS: User[] = [
  {
    id: 'usr-admin',
    username: 'admin',
    fullName: 'System Administrator',
    role: 'Admin',
    email: 'admin@gecmachines.com',
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
