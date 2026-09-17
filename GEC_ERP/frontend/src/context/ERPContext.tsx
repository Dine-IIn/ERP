import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import { 
  User, Item, Customer, Vendor, JobworkChallan, 
  PurchaseOrder, GoodsReceivedNotice, WorkOrder, 
  QCInspection, QCType, MachineAssembly, BOM, SalesOrder, Role, Department, CustomRole,
  JobCard, FloorStation, FinishedGoodUnit, DispatchRecord, UserActivityLog, BackupRecord, RBAC_FEATURES,
  JobCardMaterialReissue, MaterialIssueRecord, POItem, POStatus, SystemErrorLog,
  ProcessDefinition, ItemProcessCard, IntermediateProcessItem, VendorDebitChallan,
  MaterialProcessSource,
  generateNextPONumber, generateNextJobworkNumber, generateNextQCNumber,
  generateNextJobCardNumber, generateNextWorkOrderNumber, generateNextSalesOrderNumber,
  generateNextGRNNumber, generateNextDispatchNumber, generateNextBOMNumber,
  generateNextDebitChallanNumber
} from '../types/erp';
import { 
  INITIAL_USERS, INITIAL_CUSTOMERS, INITIAL_VENDORS, INITIAL_ITEM_CATEGORIES, INITIAL_VENDOR_CATEGORIES, INITIAL_ITEMS, 
  INITIAL_BOMS, INITIAL_SALES_ORDERS, INITIAL_JOBWORK_CHALLANS, INITIAL_PURCHASE_ORDERS, INITIAL_GRNS, 
  INITIAL_WORK_ORDERS, INITIAL_QC_INSPECTIONS, INITIAL_ASSEMBLIES, INITIAL_ASSEMBLY_STAGES,
  INITIAL_JOB_CARDS, INITIAL_FLOOR_STATIONS, INITIAL_FINISHED_GOODS, INITIAL_DISPATCH_RECORDS,
  INITIAL_PROCESS_DEFINITIONS, INITIAL_ITEM_PROCESS_CARDS, INITIAL_VENDOR_DEBIT_CHALLANS, INITIAL_INTERMEDIATE_PROCESS_ITEMS
} from '../data/initialData';

export const DEFAULT_UNIFIED_ROLES: CustomRole[] = [
  {
    id: 'role-admin',
    name: 'Admin',
    roleName: 'Admin',
    description: 'System Administrator with complete access across all modules',
    isSystemRole: false,
    permissions: RBAC_FEATURES.reduce((acc, f) => ({ ...acc, [f.key]: 'FULL_ACCESS' }), {})
  },
  {
    id: 'role-prod-mgr',
    name: 'Production Manager',
    roleName: 'Production Manager',
    description: 'Production Lead managing Work Orders, Job Cards, Assembly & Floor Planning',
    departmentId: 'dept-1',
    isSystemRole: false,
    permissions: {
      item_master: 'VIEW',
      customer_master: 'VIEW',
      vendor_master: 'VIEW',
      bom_master: 'FULL_ACCESS',
      sales_orders: 'VIEW',
      work_orders: 'FULL_ACCESS',
      job_cards: 'FULL_ACCESS',
      floor_planning: 'FULL_ACCESS',
      inhouse_inventory: 'VIEW',
      external_jobwork: 'EDIT',
      purchase_orders: 'VIEW',
      goods_receipt: 'VIEW',
      quality_control: 'VIEW',
      machine_assembly: 'FULL_ACCESS',
      dispatch: 'EDIT',
      shortage_planning: 'FULL_ACCESS',
      user_management: 'NO_ACCESS',
      backups: 'NO_ACCESS'
    }
  },
  {
    id: 'role-store-mgr',
    name: 'Store Manager',
    roleName: 'Store Manager',
    description: 'Store Manager managing In-House Inventory, GRN Receipts, Purchase Orders & Jobwork',
    departmentId: 'dept-2',
    isSystemRole: false,
    permissions: {
      item_master: 'EDIT',
      customer_master: 'VIEW',
      vendor_master: 'EDIT',
      bom_master: 'VIEW',
      sales_orders: 'VIEW',
      work_orders: 'VIEW',
      job_cards: 'VIEW',
      floor_planning: 'VIEW',
      inhouse_inventory: 'FULL_ACCESS',
      external_jobwork: 'FULL_ACCESS',
      purchase_orders: 'FULL_ACCESS',
      goods_receipt: 'FULL_ACCESS',
      quality_control: 'VIEW',
      machine_assembly: 'VIEW',
      dispatch: 'FULL_ACCESS',
      shortage_planning: 'FULL_ACCESS',
      user_management: 'NO_ACCESS',
      backups: 'NO_ACCESS'
    }
  },
  {
    id: 'role-qc-officer',
    name: 'QC Officer',
    roleName: 'QC Officer',
    description: 'Quality Control Officer handling inward inspection, stage testing & audit certificates',
    departmentId: 'dept-3',
    isSystemRole: false,
    permissions: {
      item_master: 'VIEW',
      customer_master: 'VIEW',
      vendor_master: 'VIEW',
      bom_master: 'VIEW',
      sales_orders: 'VIEW',
      work_orders: 'VIEW',
      job_cards: 'VIEW',
      floor_planning: 'VIEW',
      inhouse_inventory: 'VIEW',
      external_jobwork: 'VIEW',
      purchase_orders: 'VIEW',
      goods_receipt: 'EDIT',
      quality_control: 'FULL_ACCESS',
      machine_assembly: 'EDIT',
      dispatch: 'VIEW',
      shortage_planning: 'VIEW',
      user_management: 'NO_ACCESS',
      backups: 'NO_ACCESS'
    }
  }
];

export interface BackupSettings {
  cycleValue: number;
  cycleUnit: 'Hours' | 'Days';
  retentionLife: string; // e.g. '7 Days', '30 Days', 'Infinite'
}

interface ERPContextType {
  currentUser: User | null;
  users: User[];
  departments: Department[];
  customRoles: CustomRole[];
  items: Item[];
  itemCategories: string[];
  customers: Customer[];
  vendors: Vendor[];
  vendorCategories: string[];
  boms: BOM[];
  salesOrders: SalesOrder[];
  jobworks: JobworkChallan[];
  purchaseOrders: PurchaseOrder[];
  grns: GoodsReceivedNotice[];
  workOrders: WorkOrder[];
  qcInspections: QCInspection[];
  assemblies: MachineAssembly[];
  assemblyStages: string[];
  jobCards: JobCard[];
  floorStations: FloorStation[];
  finishedGoods: FinishedGoodUnit[];
  dispatchRecords: DispatchRecord[];
  backupSettings: BackupSettings;
  activeModule: string;
  theme: 'dark' | 'light';
  searchTerm: string;
  selectedWOIdForEdit: string | null;
  setSelectedWOIdForEdit: (id: string | null) => void;
  openWOInEditor: (woId: string) => void;
  selectedBOMIdForView: string | null;
  setSelectedBOMIdForView: (id: string | null) => void;
  openBOMInEditor: (bomId: string) => void;
  jobCardMaterialReissues: JobCardMaterialReissue[];
  addJobCardMaterialReissue: (reissue: Omit<JobCardMaterialReissue, 'id' | 'reissueNo'>) => void;
  resubmitPOForApproval: (poId: string, updatedItems?: POItem[], notes?: string) => void;
  setSearchTerm: (term: string) => void;
  isMobileNavOpen: boolean;
  setIsMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
  setActiveModule: (moduleKey: string) => void;
  toggleTheme: () => void;
  
  // Auth & User Management
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  signup: (username: string, password: string, fullName: string, role: Role) => { success: boolean; message: string };
  logout: () => void;
  resetUserPassword: (usernameOrEmail: string, newPass: string) => Promise<{ success: boolean; message: string }>;
  addUser: (user: Omit<User, 'id'>) => { success: boolean; message: string };
  updateUser: (user: User) => void;
  deleteUser: (id: string) => { success: boolean; message: string };
  updateUserRole: (id: string, role: Role) => { success: boolean; message: string };
  addDepartment: (dept: Omit<Department, 'id'>) => void;
  updateDepartment: (dept: Department) => void;
  deleteDepartment: (id: string) => void;
  addRole: (role: Omit<CustomRole, 'id'>) => void;
  updateRole: (role: CustomRole) => void;
  deleteRole: (id: string) => void;

  // Item Master methods & Dynamic Categories
  addItem: (item: Omit<Item, 'id'>) => void;
  updateItem: (item: Item) => void;
  deleteItem: (id: string) => void;
  recoverItem: (id: string) => void;
  bulkAddItems: (itemsList: Omit<Item, 'id'>[]) => void;
  bulkDeleteItems: (ids: string[]) => void;
  bulkRecoverItems: (ids: string[]) => void;
  adjustItemStock: (id: string, newInHouseStock: number, reason?: string, location?: string, reorderLevel?: number, unitPrice?: number) => void;
  updateItemCategory: (oldCat: string, newCat: string) => void;
  removeAllOldItemCodes: () => void;
  addItemCategory: (cat: string) => void;
  deleteItemCategory: (cat: string) => void;

  // QC Methods
  addQCInspection: (qc: Omit<QCInspection, 'id' | 'timestamp'>) => void;
  updateQCInspection: (qc: QCInspection) => void;

  // Assembly Stages Methods
  addAssemblyStage: (stage: string) => void;
  deleteAssemblyStage: (stage: string) => void;

  // Customer Master methods
  addCustomer: (c: Omit<Customer, 'id'>) => void;
  updateCustomer: (c: Customer) => void;
  deleteCustomer: (id: string) => void;
  bulkAddCustomers: (customersList: Omit<Customer, 'id'>[]) => void;

  // Vendor Master & Dynamic Categories
  addVendor: (v: Omit<Vendor, 'id'>) => void;
  updateVendor: (v: Vendor) => void;
  deleteVendor: (id: string) => void;
  bulkAddVendors: (vendorsList: Omit<Vendor, 'id'>[]) => void;
  addVendorCategory: (cat: string) => void;
  deleteVendorCategory: (cat: string) => void;

  // BOM Master methods
  addBOM: (b: Omit<BOM, 'id' | 'lastUpdated'>) => void;
  updateBOM: (b: BOM) => void;
  deleteBOM: (id: string) => void;
  bulkAddBOMs: (bomsList: Omit<BOM, 'id' | 'lastUpdated'>[]) => void;

  // Sales Order (SO) methods
  addSalesOrder: (so: Omit<SalesOrder, 'id' | 'status'>) => void;
  updateSalesOrder: (so: SalesOrder) => void;
  deleteSalesOrder: (id: string) => boolean;
  updateSOStatus: (id: string, status: SalesOrder['status']) => void;
  generateWOFromSO: (soId: string) => void;

  // Work Order methods with custom components & Job Card Exchange
  addWorkOrder: (wo: Omit<WorkOrder, 'id'>) => void;
  updateWorkOrderComponents: (woId: string, woComponents: WorkOrder['woComponents'], oldComponents?: WorkOrder['woComponents']) => void;
  updateWorkOrderStage: (woId: string, stage: WorkOrder['stage'], status?: WorkOrder['status']) => void;

  // Job Cards Methods
  addJobCard: (jc: Omit<JobCard, 'id' | 'jobCardNo'>) => void;
  updateJobCard: (jc: JobCard) => void;
  updateJobCardProgress: (id: string, completedQuantity: number) => void;
  closeJobCard: (id: string) => void;
  reopenJobCard: (id: string) => void;
  deleteJobCard: (id: string) => boolean;
  createExchangeJobCard: (woId: string, returnParts: any[], newParts: any[]) => void;

  // Material Issue Methods
  materialIssueRecords: MaterialIssueRecord[];
  issueMaterialForJobCard: (jcId: string, itemId: string, qty: number, issuedTo?: string, notes?: string) => boolean;
  issueMaterialForWorkOrder: (woId: string, itemId: string, qty: number, issuedTo?: string, notes?: string) => boolean;
  issueAllAvailableForCard: (cardType: 'JOB_CARD' | 'WORK_ORDER', cardId: string, issuedTo?: string) => number;

  // Floor Planning Methods
  addFloorStation: (station: Omit<FloorStation, 'id'>) => void;
  updateFloorStation: (station: FloorStation) => void;
  deleteFloorStation: (id: string) => void;
  assignWOToStation: (woId: string, stationId: string) => void;
  moveWOStation: (woId: string, fromStationId: string, toStationId: string) => void;

  // Finished Goods & Dispatch Methods
  addFinishedGoodFromWO: (woId: string, serialNo: string, configurationNote?: string) => void;
  reallocateFinishedGood: (finishedGoodId: string, targetSOId: string) => void;
  dispatchFinishedGood: (dispatchData: Omit<DispatchRecord, 'id' | 'dispatchNo'>) => void;

  // Process Master & Item Routing Cards
  processDefinitions: ProcessDefinition[];
  addProcessDefinition: (proc: Omit<ProcessDefinition, 'id' | 'createdAt'>) => { success: boolean; message: string };
  updateProcessDefinition: (proc: ProcessDefinition) => { success: boolean; message: string };
  deleteProcessDefinition: (id: string) => { success: boolean; message: string };
  itemProcessCards: ItemProcessCard[];
  saveItemProcessCard: (card: Omit<ItemProcessCard, 'id' | 'lastUpdated'> & { id?: string }) => { success: boolean; message: string };
  deleteItemProcessCard: (id: string) => void;
  
  // Vendor Debit Notes & Loss Challans
  vendorDebitChallans: VendorDebitChallan[];
  createVendorDebitChallan: (challan: Omit<VendorDebitChallan, 'id' | 'challanNo' | 'createdAt'>) => VendorDebitChallan;
  updateVendorDebitChallan: (challan: VendorDebitChallan) => void;
  deleteVendorDebitChallan: (id: string) => void;
  approveVendorDebitChallan: (id: string) => void;
  rejectVendorDebitChallan: (id: string) => void;

  // Intermediate Process Items & Dynamic Stock
  intermediateProcessItems: IntermediateProcessItem[];
  allInventoryItems: Item[];

  // Audit Logs & Backups
  auditLogs: UserActivityLog[];
  addAuditLog: (action: string, module: string, details: string) => void;
  systemErrors: SystemErrorLog[];
  addSystemError: (err: Omit<SystemErrorLog, 'id' | 'timestamp' | 'userAgent'>) => void;
  clearSystemErrors: () => void;
  backups: BackupRecord[];
  createBackup: () => BackupRecord;
  deleteBackup: (id: string) => void;
  downloadBackup: (id: string) => void;
  restoreBackup: (backupData: any) => { success: boolean; message: string };
  updateBackupSettings: (settings: BackupSettings) => void;
  resetOperationalData: () => { success: boolean; message: string };
  resetInventory: () => { success: boolean; message: string };

  // Super Admin Mass Ingestion Methods
  massUpsertItems: (items: Item[], mode: 'APPEND' | 'OVERWRITE') => void;
  massUpsertBOMs: (boms: BOM[], mode: 'APPEND' | 'OVERWRITE') => void;
  massUpsertVendors: (vendors: Vendor[], mode: 'APPEND' | 'OVERWRITE') => void;
  massUpsertCustomers: (customers: Customer[], mode: 'APPEND' | 'OVERWRITE') => void;
  massUpsertProcesses: (procs: ProcessDefinition[], mode: 'APPEND' | 'OVERWRITE') => void;
  massUpsertItemProcessCards: (cards: ItemProcessCard[], mode: 'APPEND' | 'OVERWRITE') => void;
  massUpdateInventory: (updates: { itemId?: string; itemCode: string; inHouseStock: number; externalStock: number; location?: string; unitPrice?: number; minStockQty?: number }[]) => void;

  // Operational methods
  addJobworkChallan: (challan: Omit<JobworkChallan, 'id' | 'pendingBalance' | 'status'>) => void;
  recordJobworkReturn: (challanId: string, receivedQty: number, scrapQty: number) => void;

  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'status' | 'subtotal' | 'taxAmount' | 'totalAmount'>) => void;
  updatePurchaseOrder: (po: PurchaseOrder) => void;
  deletePurchaseOrder: (id: string) => void;
  sendPODraftsForApproval: (ids: string[]) => void;
  updatePOStatus: (id: string, status: PurchaseOrder['status'], rejectionReason?: string) => void;

  addGRN: (grn: Omit<GoodsReceivedNotice, 'id' | 'status'>) => void;
  updateGRN: (grn: GoodsReceivedNotice) => void;
  approveGRN: (grnId: string) => void;

  reportQCInspection: (payload: ReportQCPayload) => void;

  addAssembly: (assembly: Omit<MachineAssembly, 'id'>) => void;
  updateAssemblyProgress: (id: string, progress: number, status: MachineAssembly['status']) => void;
}

export interface ReportQCPayload {
  grnId?: string;
  grnNumber?: string;
  vendorId?: string;
  vendorName?: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  grnQty?: number;
  inspectedQty: number;
  approvedQty: number;
  rejectedQty: number;
  disposition?: any;
  defectReason?: string;
  inspectorName?: string;
  inspectionDate?: string;
  type?: QCType;
}

const ERPContext = createContext<ERPContextType | undefined>(undefined);

export const ERPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // One-time automatic cleanup to wipe legacy demo data and ensure 100% clean production start
  const CLEAN_PRODUCTION_KEY = 'gec_erp_v2_clean_production_init';
  if (typeof window !== 'undefined') {
    try {
      const isCleaned = localStorage.getItem(CLEAN_PRODUCTION_KEY);
      if (!isCleaned) {
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('gec_erp_')) {
            localStorage.removeItem(k);
          }
        });
        localStorage.setItem(CLEAN_PRODUCTION_KEY, 'true');
      }
    } catch (e) {
      console.warn('Storage init check:', e);
    }
  }

  const getStored = <T,>(key: string, defaultValue: T): T => {
    try {
      const stored = localStorage.getItem(`gec_erp_${key}`);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const setStored = <T,>(key: string, value: T) => {
    try {
      localStorage.setItem(`gec_erp_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  };

  const [isServerHydrated, setIsServerHydrated] = useState(false);

  const syncTimersRef = React.useRef<Record<string, any>>({});
  const syncEntityHelper = (key: string, data: any) => {
    setStored(key, data);
    if (isServerHydrated) {
      if (syncTimersRef.current[key]) clearTimeout(syncTimersRef.current[key]);
      syncTimersRef.current[key] = setTimeout(() => {
        apiClient.syncEntity(key, data);
      }, 250);
    }
  };

  const [users, setUsers] = useState<User[]>(() => {
    const loaded = getStored<User[]>('users', INITIAL_USERS);
    // Sanitize any existing localStorage data so 'admin' is NEVER isSuperAdmin, and 'superadmin' ALWAYS exists and IS isSuperAdmin
    const hasSuperAdmin = loaded.some(u => u.username.toLowerCase() === 'superadmin');
    let sanitized = loaded.map(u => {
      const isSuper = u.username.toLowerCase() === 'superadmin';
      return {
        ...u,
        isSuperAdmin: isSuper,
        password: u.password || (isSuper ? 'GEC_SuperAdmin#2026!Secured$' : (u.username.toLowerCase() === 'admin' ? 'admin' : 'password'))
      };
    });

    if (!hasSuperAdmin) {
      sanitized = [
        {
          id: 'usr-superadmin',
          username: 'superadmin',
          fullName: 'GEC System Super Admin',
          role: 'Admin',
          email: 'superadmin@gecmachines.com',
          password: 'GEC_SuperAdmin#2026!Secured$',
          isSuperAdmin: true
        },
        ...sanitized
      ];
    }
    return sanitized;
  });
  const [departments, setDepartments] = useState<Department[]>(() => getStored('departments', [
    { id: 'dept-1', code: 'PROD', name: 'Production', headName: 'Rajesh Sharma', description: 'Assembly & Machining' },
    { id: 'dept-2', code: 'STORE', name: 'Store & Inventory', headName: 'Manish Patel', description: 'Material Storage' },
    { id: 'dept-3', code: 'QC', name: 'Quality Control', headName: 'Vikram Singh', description: 'Inspection & Compliance' }
  ]));
  const [customRoles, setCustomRoles] = useState<CustomRole[]>(() => {
    const stored = getStored<CustomRole[]>('customRoles', []);
    if (!stored || stored.length === 0) {
      return DEFAULT_UNIFIED_ROLES;
    }
    return stored;
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const stored = getStored<User | null>('currentUser', null);
    if (!stored) return null;

    // Persistent 15-minute Session Timeout Check
    const timeoutMs = 15 * 60 * 1000;
    const lastActivityStr = localStorage.getItem('gec_erp_lastActivityTime');
    if (lastActivityStr) {
      const lastTime = parseInt(lastActivityStr, 10);
      if (!isNaN(lastTime) && Date.now() - lastTime > timeoutMs) {
        localStorage.removeItem('gec_erp_currentUser');
        localStorage.removeItem('gec_erp_lastActivityTime');
        return null;
      }
    }

    // Still within 15 minutes: refresh activity timestamp & restore user
    localStorage.setItem('gec_erp_lastActivityTime', Date.now().toString());
    const isSuper = stored.username?.toLowerCase() === 'superadmin';
    return {
      ...stored,
      isSuperAdmin: isSuper
    };
  });
  const [items, setItems] = useState<Item[]>(() => {
    const rawItems = getStored<Item[]>('items', INITIAL_ITEMS);
    return rawItems.map(it => {
      const rawSources = it.materialProcessSources || (it.processType ? (it.processType === 'Job work + Bought out' ? ['Job work', 'Bought out'] : [it.processType]) : []);
      const cleanSources = Array.from(new Set(
        rawSources.map(s => ((s as string) === 'Brought out' ? 'Bought out' : s) as MaterialProcessSource)
      ));
      let cleanProcessType = it.processType;
      if (cleanProcessType === ('Brought out' as any)) {
        cleanProcessType = 'Bought out';
      }
      if (cleanSources.includes('Job work') && cleanSources.includes('Bought out')) {
        cleanProcessType = 'Job work + Bought out';
      } else if (cleanSources.includes('Job work')) {
        cleanProcessType = 'Job work';
      } else if (cleanSources.includes('Bought out')) {
        cleanProcessType = 'Bought out';
      } else if (cleanSources.includes('In-house')) {
        cleanProcessType = 'In-house';
      }
      return {
        ...it,
        materialProcessSources: cleanSources,
        processType: cleanProcessType
      };
    });
  });
  const [itemCategories, setItemCategories] = useState<string[]>(() => getStored('itemCategories', INITIAL_ITEM_CATEGORIES));
  const [customers, setCustomers] = useState<Customer[]>(() => getStored('customers', INITIAL_CUSTOMERS));
  const [vendors, setVendors] = useState<Vendor[]>(() => getStored('vendors', INITIAL_VENDORS));
  const [vendorCategories, setVendorCategories] = useState<string[]>(() => getStored('vendorCategories', INITIAL_VENDOR_CATEGORIES));
  const [boms, setBOMs] = useState<BOM[]>(() => getStored('boms', INITIAL_BOMS));
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(() => getStored('salesOrders', INITIAL_SALES_ORDERS));
  
  const [jobworks, setJobworks] = useState<JobworkChallan[]>(() => getStored('jobworks', INITIAL_JOBWORK_CHALLANS));
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => getStored('purchaseOrders', INITIAL_PURCHASE_ORDERS));
  const [grns, setGRNs] = useState<GoodsReceivedNotice[]>(() => getStored('grns', INITIAL_GRNS));
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(() => getStored('workOrders', INITIAL_WORK_ORDERS));
  const [qcInspections, setQCInspections] = useState<QCInspection[]>(() => getStored('qcInspections', INITIAL_QC_INSPECTIONS));
  const [assemblies, setAssemblies] = useState<MachineAssembly[]>(() => getStored('assemblies', INITIAL_ASSEMBLIES));
  const [assemblyStages, setAssemblyStages] = useState<string[]>(() => getStored('assemblyStages', INITIAL_ASSEMBLY_STAGES));

  const [jobCards, setJobCards] = useState<JobCard[]>(() => getStored('jobCards', INITIAL_JOB_CARDS));
  const [floorStations, setFloorStations] = useState<FloorStation[]>(() => getStored('floorStations', INITIAL_FLOOR_STATIONS));
  const [finishedGoods, setFinishedGoods] = useState<FinishedGoodUnit[]>(() => getStored('finishedGoods', INITIAL_FINISHED_GOODS));
  const [dispatchRecords, setDispatchRecords] = useState<DispatchRecord[]>(() => getStored('dispatchRecords', INITIAL_DISPATCH_RECORDS));
  const [auditLogs, setAuditLogs] = useState<UserActivityLog[]>(() => getStored('auditLogs', [
    {
      id: 'log-init',
      username: 'admin',
      role: 'Admin',
      action: 'SYSTEM_BOOT',
      module: 'Security & Auth',
      details: 'GEC ERP Enterprise Engine initialized with secure PostgreSQL sync.',
      timestamp: new Date().toISOString()
    }
  ]));
  const [backups, setBackups] = useState<BackupRecord[]>(() => getStored('backups', []));

  // Process Master, Process Cards & Debit Challans States
  const [processDefinitions, setProcessDefinitions] = useState<ProcessDefinition[]>(() => {
    const loaded = getStored<ProcessDefinition[]>('processDefinitions', INITIAL_PROCESS_DEFINITIONS);
    if (!loaded || loaded.length === 0) return INITIAL_PROCESS_DEFINITIONS;
    return loaded;
  });
  const [itemProcessCards, setItemProcessCards] = useState<ItemProcessCard[]>(() => getStored('itemProcessCards', INITIAL_ITEM_PROCESS_CARDS));
  const [vendorDebitChallans, setVendorDebitChallans] = useState<VendorDebitChallan[]>(() => getStored('vendorDebitChallans', INITIAL_VENDOR_DEBIT_CHALLANS));
  const [intermediateProcessItems, setIntermediateProcessItems] = useState<IntermediateProcessItem[]>(() => getStored('intermediateProcessItems', INITIAL_INTERMEDIATE_PROCESS_ITEMS));

  useEffect(() => syncEntityHelper('processDefinitions', processDefinitions), [processDefinitions, isServerHydrated]);
  useEffect(() => syncEntityHelper('itemProcessCards', itemProcessCards), [itemProcessCards, isServerHydrated]);
  useEffect(() => syncEntityHelper('vendorDebitChallans', vendorDebitChallans), [vendorDebitChallans, isServerHydrated]);
  useEffect(() => syncEntityHelper('intermediateProcessItems', intermediateProcessItems), [intermediateProcessItems, isServerHydrated]);

  // Computed All Inventory Items (Base items including 0 stock + Intermediate items ONLY when stock > 0)
  const allInventoryItems = React.useMemo<Item[]>(() => {
    const baseList: Item[] = [...items];
    intermediateProcessItems.forEach(ip => {
      if ((ip.inHouseStock || 0) > 0 || (ip.externalStock || 0) > 0) {
        const base = items.find(it => it.id === ip.baseItemId);
        baseList.push({
          id: ip.id,
          itemCode: ip.fullItemCode,
          name: `${ip.baseItemName} [${ip.processCodeSuffix.replace(/^-/, '')}]`,
          category: base?.category || 'Machined Component',
          unit: ip.unit || base?.unit || 'Nos',
          inHouseStock: ip.inHouseStock || 0,
          externalStock: ip.externalStock || 0,
          unitPrice: ip.unitPrice || base?.unitPrice || 0,
          location: base?.location || 'Floor WIP Rack',
          isProcessItem: true,
          baseItemId: ip.baseItemId,
          processCodeSuffix: ip.processCodeSuffix
        });
      }
    });
    return baseList;
  }, [items, intermediateProcessItems]);

  // Process Definition Operations
  const addProcessDefinition = (proc: Omit<ProcessDefinition, 'id' | 'createdAt'>) => {
    const cleanShort = proc.shortCode.trim().toUpperCase();
    const exists = processDefinitions.some(p => p.shortCode.toUpperCase() === cleanShort || p.name.toLowerCase() === proc.name.trim().toLowerCase());
    if (exists) {
      return { success: false, message: `Process with name "${proc.name}" or short code "${cleanShort}" already exists.` };
    }
    const newProc: ProcessDefinition = {
      ...proc,
      id: `proc-${Date.now()}`,
      shortCode: cleanShort,
      name: proc.name.trim(),
      createdAt: new Date().toISOString()
    };
    setProcessDefinitions(prev => [...prev, newProc]);
    addAuditLog('CREATE_PROCESS', 'Process Master', `Created process definition: ${newProc.name} (${newProc.shortCode})`);
    return { success: true, message: `Process "${newProc.name}" added successfully.` };
  };

  const updateProcessDefinition = (proc: ProcessDefinition) => {
    const cleanShort = proc.shortCode.trim().toUpperCase();
    const conflict = processDefinitions.some(p => p.id !== proc.id && (p.shortCode.toUpperCase() === cleanShort || p.name.toLowerCase() === proc.name.trim().toLowerCase()));
    if (conflict) {
      return { success: false, message: `Another process with name "${proc.name}" or code "${cleanShort}" already exists.` };
    }
    setProcessDefinitions(prev => prev.map(p => p.id === proc.id ? { ...proc, shortCode: cleanShort, name: proc.name.trim() } : p));
    addAuditLog('UPDATE_PROCESS', 'Process Master', `Updated process: ${proc.name} (${cleanShort})`);
    return { success: true, message: `Process "${proc.name}" updated successfully.` };
  };

  const deleteProcessDefinition = (id: string) => {
    const target = processDefinitions.find(p => p.id === id);
    if (!target) return { success: false, message: 'Process not found.' };

    // Strict Safe-Deletion Check: verify if used in any item process card
    const usedInCard = itemProcessCards.find(c => c.steps.some(s => s.processId === id || s.processShortCode === target.shortCode));
    if (usedInCard) {
      return { 
        success: false, 
        message: `Cannot delete "${target.name} (${target.shortCode})". It is currently configured in the Process Card for Item "${usedInCard.itemCode} - ${usedInCard.itemName}".` 
      };
    }

    // Check active job works
    const usedInJW = jobworks.find(j => j.status !== 'COMPLETED' && (j.processRequired?.includes(target.name) || j.processCodeSuffix?.includes(target.shortCode)));
    if (usedInJW) {
      return { 
        success: false, 
        message: `Cannot delete "${target.name}". It is in active use on Job Work Challan "${usedInJW.challanNo}".` 
      };
    }

    setProcessDefinitions(prev => prev.filter(p => p.id !== id));
    addAuditLog('DELETE_PROCESS', 'Process Master', `Deleted process definition ${target.name} (${target.shortCode})`);
    return { success: true, message: `Process "${target.name}" deleted successfully.` };
  };

  const saveItemProcessCard = (cardData: Omit<ItemProcessCard, 'id' | 'lastUpdated'> & { id?: string }) => {
    const existingId = cardData.id || itemProcessCards.find(c => c.itemId === cardData.itemId)?.id;
    const nowIso = new Date().toISOString();

    if (existingId) {
      const updated: ItemProcessCard = {
        ...cardData,
        id: existingId,
        lastUpdated: nowIso
      };
      setItemProcessCards(prev => prev.map(c => c.id === existingId ? updated : c));
      addAuditLog('UPDATE_PROCESS_CARD', 'Process Routing', `Updated process card for item ${cardData.itemCode} with ${cardData.steps.length} sequential steps.`);
      return { success: true, message: `Process Card for ${cardData.itemCode} updated successfully.` };
    } else {
      const newCard: ItemProcessCard = {
        ...cardData,
        id: `pcard-${Date.now()}`,
        lastUpdated: nowIso
      };
      setItemProcessCards(prev => [newCard, ...prev]);
      addAuditLog('CREATE_PROCESS_CARD', 'Process Routing', `Configured new process routing card for item ${cardData.itemCode} (${cardData.steps.length} steps).`);
      return { success: true, message: `Process Card for ${cardData.itemCode} created successfully.` };
    }
  };

  const deleteItemProcessCard = (id: string) => {
    const target = itemProcessCards.find(c => c.id === id);
    setItemProcessCards(prev => prev.filter(c => c.id !== id));
    if (target) {
      addAuditLog('DELETE_PROCESS_CARD', 'Process Routing', `Removed process card for item ${target.itemCode}`);
    }
  };

  const createVendorDebitChallan = (challanData: Omit<VendorDebitChallan, 'id' | 'challanNo' | 'createdAt'>) => {
    const nextNo = generateNextDebitChallanNumber(vendorDebitChallans);
    const newChallan: VendorDebitChallan = {
      ...challanData,
      id: `dn-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      challanNo: nextNo,
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.fullName || currentUser?.username || 'System'
    };
    setVendorDebitChallans(prev => [newChallan, ...prev]);
    addAuditLog('CREATE_DEBIT_CHALLAN', 'Vendor Rejection & Loss', `Generated Debit Note ${newChallan.challanNo} against ${newChallan.vendorName} for ₹${newChallan.totalLossAmount.toLocaleString()} (${newChallan.rejectedQty} ${newChallan.unit} of ${newChallan.itemCode}).`);
    return newChallan;
  };

  const updateVendorDebitChallan = (challan: VendorDebitChallan) => {
    setVendorDebitChallans(prev => prev.map(c => c.id === challan.id ? challan : c));
  };

  const deleteVendorDebitChallan = (id: string) => {
    setVendorDebitChallans(prev => prev.filter(c => c.id !== id));
  };

  const approveVendorDebitChallan = (id: string) => {
    setVendorDebitChallans(prev => prev.map(c => c.id === id ? { ...c, status: 'DEBITED' } : c));
    addAuditLog('APPROVE_DEBIT_CHALLAN', 'Vendor Rejection & Loss', `Approved debit challan ${id}`);
  };

  const rejectVendorDebitChallan = (id: string) => {
    setVendorDebitChallans(prev => prev.map(c => c.id === id ? { ...c, status: 'REPLACED_CREDIT' } : c));
    addAuditLog('REJECT_DEBIT_CHALLAN', 'Vendor Rejection & Loss', `Marked debit challan ${id} as credit replaced`);
  };

  const addAuditLog = (action: string, module: string, details: string) => {
    const newLog: UserActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      userId: currentUser?.id,
      username: currentUser?.fullName ? `${currentUser.fullName} (${currentUser.username})` : (currentUser?.username || 'admin'),
      role: currentUser?.role || 'Admin',
      action,
      module,
      details,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString()
    };
    setAuditLogs(prev => [newLog, ...prev.slice(0, 999)]);
  };

  const [systemErrors, setSystemErrors] = useState<SystemErrorLog[]>(() => getStored('systemErrors', []));

  useEffect(() => setStored('systemErrors', systemErrors), [systemErrors]);

  const addSystemError = (err: Omit<SystemErrorLog, 'id' | 'timestamp' | 'userAgent'>) => {
    const newErr: SystemErrorLog = {
      ...err,
      id: `err-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };
    setSystemErrors(prev => [newErr, ...prev.slice(0, 199)]);
  };

  const clearSystemErrors = () => {
    setSystemErrors([]);
    localStorage.removeItem('gec_erp_systemErrors');
  };

  // Global window error listener for runtime crashes & unhandled exceptions
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      addSystemError({
        message: event.message || 'Unhandled Client Exception',
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack || '',
        severity: 'FATAL'
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      addSystemError({
        message: typeof event.reason === 'string' ? event.reason : (event.reason?.message || 'Unhandled Promise Rejection'),
        stack: event.reason?.stack || '',
        severity: 'ERROR'
      });
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const [backupSettings, setBackupSettings] = useState<BackupSettings>(() => getStored('backupSettings', {
    cycleValue: 2,
    cycleUnit: 'Days',
    retentionLife: 'Infinite'
  }));

  const [activeModule, setActiveModuleState] = useState<string>(() => {
    const timeoutMs = 15 * 60 * 1000;
    const lastActivityStr = localStorage.getItem('gec_erp_lastActivityTime');
    if (lastActivityStr) {
      const lastTime = parseInt(lastActivityStr, 10);
      if (!isNaN(lastTime) && Date.now() - lastTime > timeoutMs) {
        return 'dashboard';
      }
    }
    const storedUser = getStored<User | null>('currentUser', null);
    if (storedUser && (storedUser.username?.toLowerCase() === 'superadmin' || storedUser.isSuperAdmin)) {
      return 'superadmin-analytics';
    }
    return 'dashboard';
  });
  const [theme, setTheme] = useState<'dark' | 'light'>(() => getStored('theme', 'dark'));
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedWOIdForEdit, setSelectedWOIdForEdit] = useState<string | null>(null);
  const [selectedBOMIdForView, setSelectedBOMIdForView] = useState<string | null>(null);
  const [jobCardMaterialReissues, setJobCardMaterialReissues] = useState<JobCardMaterialReissue[]>(() => getStored('jobCardMaterialReissues', []));
  const [materialIssueRecords, setMaterialIssueRecords] = useState<MaterialIssueRecord[]>(() => getStored('materialIssueRecords', []));

  const openWOInEditor = (woId: string) => {
    setSelectedWOIdForEdit(woId);
    setActiveModuleState('work-orders');
  };

  const openBOMInEditor = (bomId: string) => {
    setSelectedBOMIdForView(bomId);
    setActiveModuleState('bom-master');
  };

  // Initial Bootstrap Sync from Central Server
  useEffect(() => {
    let isMounted = true;
    const bootstrapSync = async () => {
      try {
        const res = await apiClient.fetchFullSync();
        if (res.success && res.data && isMounted) {
          const d = res.data;
          if (Array.isArray(d.items) && d.items.length > 0) setItems(d.items);
          if (Array.isArray(d.customers) && d.customers.length > 0) setCustomers(d.customers);
          if (Array.isArray(d.vendors) && d.vendors.length > 0) setVendors(d.vendors);
          if (Array.isArray(d.boms) && d.boms.length > 0) setBOMs(d.boms);
          if (Array.isArray(d.salesOrders) && d.salesOrders.length > 0) setSalesOrders(d.salesOrders);
          if (Array.isArray(d.workOrders) && d.workOrders.length > 0) setWorkOrders(d.workOrders);
          if (Array.isArray(d.jobCards) && d.jobCards.length > 0) setJobCards(d.jobCards);
          if (Array.isArray(d.purchaseOrders) && d.purchaseOrders.length > 0) setPurchaseOrders(d.purchaseOrders);
          if (Array.isArray(d.grns) && d.grns.length > 0) setGRNs(d.grns);
          if (Array.isArray(d.jobworks) && d.jobworks.length > 0) setJobworks(d.jobworks);
          if (Array.isArray(d.qcInspections) && d.qcInspections.length > 0) setQCInspections(d.qcInspections);
          if (Array.isArray(d.assemblies) && d.assemblies.length > 0) setAssemblies(d.assemblies);
          if (Array.isArray(d.floorStations) && d.floorStations.length > 0) setFloorStations(d.floorStations);
          if (Array.isArray(d.finishedGoods) && d.finishedGoods.length > 0) setFinishedGoods(d.finishedGoods);
          if (Array.isArray(d.dispatchRecords) && d.dispatchRecords.length > 0) setDispatchRecords(d.dispatchRecords);
          if (Array.isArray(d.processDefinitions) && d.processDefinitions.length > 0) setProcessDefinitions(d.processDefinitions);
          if (Array.isArray(d.itemProcessCards) && d.itemProcessCards.length > 0) setItemProcessCards(d.itemProcessCards);
          if (Array.isArray(d.vendorDebitChallans) && d.vendorDebitChallans.length > 0) setVendorDebitChallans(d.vendorDebitChallans);
          if (Array.isArray(d.intermediateProcessItems) && d.intermediateProcessItems.length > 0) setIntermediateProcessItems(d.intermediateProcessItems);
          if (Array.isArray(d.departments) && d.departments.length > 0) setDepartments(d.departments);
          if (Array.isArray(d.customRoles) && d.customRoles.length > 0) setCustomRoles(d.customRoles);
          if (Array.isArray(d.users) && d.users.length > 0) setUsers(d.users);
          setIsServerHydrated(true);
        } else {
          setIsServerHydrated(true);
        }
      } catch (e) {
        setIsServerHydrated(true);
      }
    };
    bootstrapSync();
    return () => { isMounted = false; };
  }, []);



  useEffect(() => syncEntityHelper('users', users), [users, isServerHydrated]);
  useEffect(() => syncEntityHelper('departments', departments), [departments, isServerHydrated]);
  useEffect(() => syncEntityHelper('customRoles', customRoles), [customRoles, isServerHydrated]);
  useEffect(() => setStored('currentUser', currentUser), [currentUser]);
  useEffect(() => syncEntityHelper('items', items), [items, isServerHydrated]);
  useEffect(() => syncEntityHelper('itemCategories', itemCategories), [itemCategories, isServerHydrated]);
  useEffect(() => syncEntityHelper('customers', customers), [customers, isServerHydrated]);
  useEffect(() => syncEntityHelper('vendors', vendors), [vendors, isServerHydrated]);
  useEffect(() => syncEntityHelper('vendorCategories', vendorCategories), [vendorCategories, isServerHydrated]);
  useEffect(() => syncEntityHelper('boms', boms), [boms, isServerHydrated]);
  useEffect(() => syncEntityHelper('salesOrders', salesOrders), [salesOrders, isServerHydrated]);
  useEffect(() => syncEntityHelper('jobworks', jobworks), [jobworks, isServerHydrated]);
  useEffect(() => syncEntityHelper('purchaseOrders', purchaseOrders), [purchaseOrders, isServerHydrated]);
  useEffect(() => syncEntityHelper('grns', grns), [grns, isServerHydrated]);
  useEffect(() => syncEntityHelper('workOrders', workOrders), [workOrders, isServerHydrated]);
  useEffect(() => syncEntityHelper('qcInspections', qcInspections), [qcInspections, isServerHydrated]);
  useEffect(() => syncEntityHelper('assemblies', assemblies), [assemblies, isServerHydrated]);
  useEffect(() => syncEntityHelper('assemblyStages', assemblyStages), [assemblyStages, isServerHydrated]);
  useEffect(() => syncEntityHelper('jobCards', jobCards), [jobCards, isServerHydrated]);
  useEffect(() => syncEntityHelper('jobCardMaterialReissues', jobCardMaterialReissues), [jobCardMaterialReissues, isServerHydrated]);
  useEffect(() => syncEntityHelper('materialIssueRecords', materialIssueRecords), [materialIssueRecords, isServerHydrated]);
  useEffect(() => syncEntityHelper('floorStations', floorStations), [floorStations, isServerHydrated]);
  useEffect(() => syncEntityHelper('finishedGoods', finishedGoods), [finishedGoods, isServerHydrated]);
  useEffect(() => syncEntityHelper('dispatchRecords', dispatchRecords), [dispatchRecords, isServerHydrated]);
  useEffect(() => syncEntityHelper('auditLogs', auditLogs), [auditLogs, isServerHydrated]);
  useEffect(() => syncEntityHelper('backups', backups), [backups, isServerHydrated]);
  useEffect(() => syncEntityHelper('backupSettings', backupSettings), [backupSettings, isServerHydrated]);
  useEffect(() => setStored('theme', theme), [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);

  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const toggleMobileNav = () => setIsMobileNavOpen(prev => !prev);
  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const setActiveModule = (moduleKey: string) => {
    setActiveModuleState(moduleKey);
    setSearchTerm('');
    setIsMobileNavOpen(false);
  };

  // 15-min Persistent Inactivity Auto-Logout for Web & Desktop (Tauri)
  useEffect(() => {
    if (!currentUser) {
      localStorage.removeItem('gec_erp_lastActivityTime');
      return;
    }

    const timeoutMinutes = 15;
    const timeoutMs = timeoutMinutes * 60 * 1000;

    const recordActivity = () => {
      localStorage.setItem('gec_erp_lastActivityTime', Date.now().toString());
    };

    recordActivity();

    const checkInterval = setInterval(() => {
      const lastActivityStr = localStorage.getItem('gec_erp_lastActivityTime');
      const lastTime = lastActivityStr ? parseInt(lastActivityStr, 10) : Date.now();

      if (Date.now() - lastTime >= timeoutMs) {
        alert(`🔒 Inactive Session Timeout: You have been automatically logged out due to ${timeoutMinutes} minutes of inactivity.`);
        setCurrentUser(null);
        localStorage.removeItem('gec_erp_currentUser');
        localStorage.removeItem('gec_erp_lastActivityTime');
      }
    }, 10000);

    const events = ['mousemove', 'mousedown', 'keydown', 'click', 'scroll', 'touchstart', 'focus', 'beforeunload'];
    events.forEach(ev => window.addEventListener(ev, recordActivity, { passive: true }));

    return () => {
      clearInterval(checkInterval);
      events.forEach(ev => window.removeEventListener(ev, recordActivity));
    };
  }, [currentUser]);

  // Auth Methods - Dynamic Server-Backed Verification
  const login = async (username: string, password: string): Promise<{ success: boolean; message: string }> => {
    const cleanUser = username.trim().toLowerCase();
    const deviceType = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop';

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password, deviceType })
      });

      const data = await response.json();
      if (response.ok && data.success && data.user) {
        const userObj: User = {
          ...data.user,
          isSuperAdmin: data.user.isSuperAdmin === true || data.user.username?.toLowerCase() === 'superadmin'
        };

        localStorage.setItem('gec_erp_lastActivityTime', Date.now().toString());
        if (data.sessionId) {
          localStorage.setItem('gec_erp_sessionId', data.sessionId);
        }
        setCurrentUser(userObj);
        if (userObj.isSuperAdmin) {
          setActiveModule('superadmin-analytics');
        } else {
          setActiveModule('dashboard');
        }
        return { success: true, message: data.message || `Welcome back, ${userObj.fullName}!` };
      }

      return { 
        success: false, 
        message: data.message || 'Invalid username or password. Passwords are case-sensitive.' 
      };
    } catch (err) {
      console.warn('Backend login endpoint unavailable, attempting local fallback:', err);
      const found = users.find(u => u.username.toLowerCase() === cleanUser);
      if (found) {
        const newSessionId = `sess-${Date.now()}-${Math.random()}`;
        const updatedUser: User = {
          ...found,
          isSuperAdmin: found.isSuperAdmin === true || cleanUser === 'superadmin',
          ...(deviceType === 'desktop' ? { desktopSessionId: newSessionId } : { mobileSessionId: newSessionId })
        };
        localStorage.setItem('gec_erp_lastActivityTime', Date.now().toString());
        setCurrentUser(updatedUser);
        setActiveModule(updatedUser.isSuperAdmin ? 'superadmin-analytics' : 'dashboard');
        return { success: true, message: `Welcome back, ${updatedUser.fullName}!` };
      }
      return { 
        success: false, 
        message: 'Could not connect to authentication server. Please check your connection.' 
      };
    }
  };

  const resetUserPassword = async (usernameOrEmail: string, newPass: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameOrEmail.trim(), newPassword: newPass })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        return { success: true, message: data.message || 'Password updated successfully!' };
      }
      return { success: false, message: data.message || 'Could not update password.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Server communication error.' };
    }
  };

  const signup = (username: string, password: string, fullName: string, role: Role) => {
    return { success: false, message: 'Self-service registration disabled. Contact System Administrator.' };
  };

  const logout = () => {
    const sessionId = localStorage.getItem('gec_erp_sessionId');
    if (sessionId) {
      fetch('/api/session/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      }).catch(() => {});
    }
    setCurrentUser(null);
    localStorage.removeItem('gec_erp_currentUser');
    localStorage.removeItem('gec_erp_sessionId');
    localStorage.removeItem('gec_erp_lastActivityTime');
  };

  const addUser = (userData: Omit<User, 'id'>) => {
    const exists = users.some(u => u.username.toLowerCase() === userData.username.toLowerCase());
    if (exists) return { success: false, message: 'Username already exists' };

    const newUser: User = {
      ...userData,
      id: `usr-${Date.now()}`
    };
    setUsers(prev => [newUser, ...prev]);
    return { success: true, message: 'User added successfully' };
  };

  const updateUser = (userData: User) => {
    const target = users.find(u => u.id === userData.id);
    const isSuper = target?.isSuperAdmin || target?.username.toLowerCase() === 'superadmin';
    if (isSuper && !currentUser?.isSuperAdmin) {
      return;
    }
    setUsers(prev => prev.map(u => u.id === userData.id ? userData : u));
  };

  const deleteUser = (id: string) => {
    const target = users.find(u => u.id === id);
    if (target?.isSuperAdmin || target?.username.toLowerCase() === 'superadmin') {
      return { success: false, message: 'Super Admin cannot be deleted' };
    }
    setUsers(prev => prev.filter(u => u.id !== id));
    return { success: true, message: 'User removed successfully' };
  };

  const updateUserRole = (id: string, role: Role) => {
    const target = users.find(u => u.id === id);
    if (target?.isSuperAdmin && role !== 'Admin') {
      return { success: false, message: 'Cannot demote Super Admin' };
    }
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
    return { success: true, message: 'Role updated successfully' };
  };

  const addDepartment = (dept: Omit<Department, 'id'>) => {
    setDepartments(prev => [{ ...dept, id: `dept-${Date.now()}` }, ...prev]);
  };

  const updateDepartment = (dept: Department) => {
    setDepartments(prev => prev.map(d => d.id === dept.id ? dept : d));
  };

  const deleteDepartment = (id: string) => {
    setDepartments(prev => prev.filter(d => d.id !== id));
  };

  const addRole = (roleData: Omit<CustomRole, 'id'>) => {
    setCustomRoles(prev => [{ ...roleData, id: `role-${Date.now()}` }, ...prev]);
  };

  const updateRole = (roleData: CustomRole) => {
    setCustomRoles(prev => prev.map(r => r.id === roleData.id ? roleData : r));
  };

  const deleteRole = (id: string) => {
    setCustomRoles(prev => prev.filter(r => r.id !== id));
  };

  // Item Master methods & Dynamic Categories
  const addItem = (item: Omit<Item, 'id'>) => {
    const newItem: Item = {
      ...item,
      id: `itm-${Date.now()}`,
      leadTimeDays: item.leadTimeDays || 10
    };
    setItems(prev => [newItem, ...prev]);
    addAuditLog('CREATE_ITEM', 'Item Master', `Added new item: ${newItem.itemCode} - ${newItem.name} (Class: ${newItem.category})`);
  };

  const updateItem = (item: Item) => {
    setItems(prev => prev.map(i => i.id === item.id ? item : i));
    addAuditLog('UPDATE_ITEM', 'Item Master', `Updated item: ${item.itemCode} - ${item.name}`);
  };

  const deleteItem = (id: string) => {
    const target = items.find(i => i.id === id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, isBlocked: true, blockedAt: new Date().toISOString() } : i));
    addAuditLog('BLOCK_ITEM', 'Item Master', `Moved item to blocked/history: ${target?.itemCode || id} (${target?.name || ''})`);
  };

  const recoverItem = (id: string) => {
    const target = items.find(i => i.id === id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, isBlocked: false, blockedAt: undefined } : i));
    addAuditLog('RECOVER_ITEM', 'Item Master', `Restored item from blocked/history: ${target?.itemCode || id} (${target?.name || ''})`);
  };

  const bulkAddItems = (itemsList: Omit<Item, 'id'>[]) => {
    const newItems = itemsList.map(item => ({
      ...item,
      id: `itm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      leadTimeDays: item.leadTimeDays || 10
    }));
    setItems(prev => [...newItems, ...prev]);
    addAuditLog('BULK_CREATE_ITEMS', 'Item Master', `Bulk uploaded ${itemsList.length} items`);
  };

  const bulkDeleteItems = (ids: string[]) => {
    setItems(prev => prev.map(i => ids.includes(i.id) ? { ...i, isBlocked: true, blockedAt: new Date().toISOString() } : i));
    addAuditLog('BULK_BLOCK_ITEMS', 'Item Master', `Moved ${ids.length} items to blocked/history`);
  };

  const bulkRecoverItems = (ids: string[]) => {
    setItems(prev => prev.map(i => ids.includes(i.id) ? { ...i, isBlocked: false, blockedAt: undefined } : i));
    addAuditLog('BULK_RECOVER_ITEMS', 'Item Master', `Restored ${ids.length} items from blocked/history`);
  };

  const adjustItemStock = (id: string, newInHouseStock: number, reason?: string, location?: string, reorderLevel?: number, unitPrice?: number) => {
    const target = items.find(i => i.id === id);
    const oldStock = target?.inHouseStock || 0;
    setItems(prev => prev.map(i => {
      if (i.id === id) {
        return {
          ...i,
          inHouseStock: Math.max(0, newInHouseStock),
          location: location !== undefined ? location : i.location,
          reorderLevel: reorderLevel !== undefined ? reorderLevel : i.reorderLevel,
          unitPrice: unitPrice !== undefined ? unitPrice : i.unitPrice
        };
      }
      return i;
    }));
    addAuditLog('ADJUST_STOCK', 'In-House Inventory', `Adjusted stock for ${target?.itemCode || id}: ${oldStock} -> ${newInHouseStock} ${target?.unit || 'PCS'} (Reason: ${reason || 'Physical Inventory Count Adjustment'})`);
  };

  const updateItemCategory = (oldCat: string, newCat: string) => {
    setItemCategories(prev => prev.map(c => c === oldCat ? newCat : c));
    setItems(prev => prev.map(i => i.category === oldCat ? { ...i, category: newCat } : i));
  };

  const removeAllOldItemCodes = () => {
    setItems(prev => prev.map(i => ({ ...i, oldItemCode: undefined })));
  };

  const addItemCategory = (cat: string) => {
    if (!itemCategories.includes(cat)) setItemCategories(prev => [...prev, cat]);
  };

  const deleteItemCategory = (cat: string) => {
    setItemCategories(prev => prev.filter(c => c !== cat));
  };

  // QC Methods
  const addQCInspection = (qc: Omit<QCInspection, 'id' | 'timestamp'>) => {
    const newQC = { ...qc, id: `qc-${Date.now()}`, timestamp: new Date().toISOString() };
    setQCInspections(prev => [newQC, ...prev]);
    addAuditLog('CREATE_QC', 'Quality Control', `Recorded QC inspection: ${newQC.inspectionNo || newQC.qcNumber || 'QC'} (${qc.referenceType || 'QC'}) - Status: ${qc.status || 'PENDING'}`);

    const passedQty = qc.passedQuantity !== undefined ? qc.passedQuantity : (qc.approvedQty || 0);
    const isPassed = ((qc.disposition as string) === 'PASSED' || qc.status === 'APPROVED' || (qc.disposition as string) === 'APPROVED');
    if (isPassed && passedQty > 0 && qc.itemId) {
      setItems(prevItems => prevItems.map(item => {
        if (item.id === qc.itemId || item.itemCode === qc.itemCode) {
          const deductQC = Math.min(item.pendingQCStock || 0, passedQty);
          return {
            ...item,
            pendingQCStock: Math.max(0, (item.pendingQCStock || 0) - deductQC),
            inHouseStock: (item.inHouseStock || 0) + deductQC
          };
        }
        return item;
      }));
    }
  };

  const updateQCInspection = (qc: QCInspection) => {
    const prevQC = qcInspections.find(q => q.id === qc.id);
    setQCInspections(prev => prev.map(q => q.id === qc.id ? qc : q));
    addAuditLog('UPDATE_QC', 'Quality Control', `Updated QC inspection: ${qc.inspectionNo || qc.qcNumber || qc.id}`);

    const oldPassed = prevQC ? (prevQC.passedQuantity !== undefined ? prevQC.passedQuantity : (prevQC.approvedQty || 0)) : 0;
    const newPassed = ((qc.disposition as string) === 'PASSED' || qc.status === 'APPROVED' || (qc.disposition as string) === 'APPROVED') 
      ? (qc.passedQuantity !== undefined ? qc.passedQuantity : (qc.approvedQty || 0)) 
      : 0;
    const transferQty = Math.max(0, newPassed - oldPassed);

    if (transferQty > 0 && qc.itemId) {
      setItems(prevItems => prevItems.map(item => {
        if (item.id === qc.itemId || item.itemCode === qc.itemCode) {
          const deductQC = Math.min(item.pendingQCStock || 0, transferQty);
          return {
            ...item,
            pendingQCStock: Math.max(0, (item.pendingQCStock || 0) - deductQC),
            inHouseStock: (item.inHouseStock || 0) + deductQC
          };
        }
        return item;
      }));
    }

    if (qc.referenceNo) {
      const refNo = qc.referenceNo;
      setGRNs(prevGRNs => prevGRNs.map(g => {
        if (g.grnNumber === refNo) {
          return { ...g, status: 'QC_APPROVED' };
        }
        return g;
      }));
    }
  };

  // Assembly Stages
  const addAssemblyStage = (stage: string) => {
    if (!assemblyStages.includes(stage)) setAssemblyStages(prev => [...prev, stage]);
  };

  const deleteAssemblyStage = (stage: string) => {
    setAssemblyStages(prev => prev.filter(s => s !== stage));
  };

  // Customer Master methods
  const addCustomer = (c: Omit<Customer, 'id'>) => {
    const newCust = { ...c, id: `cst-${Date.now()}` };
    setCustomers(prev => [newCust, ...prev]);
    addAuditLog('CREATE_CUSTOMER', 'Customer Master', `Added customer: ${newCust.name} (${newCust.customerCode})`);
  };

  const updateCustomer = (c: Customer) => {
    setCustomers(prev => prev.map(item => item.id === c.id ? c : item));
    addAuditLog('UPDATE_CUSTOMER', 'Customer Master', `Updated customer: ${c.name} (${c.customerCode})`);
  };

  const deleteCustomer = (id: string) => {
    const target = customers.find(c => c.id === id);
    setCustomers(prev => prev.filter(c => c.id !== id));
    addAuditLog('DELETE_CUSTOMER', 'Customer Master', `Deleted customer: ${target?.name || id}`);
  };

  const bulkAddCustomers = (customersList: Omit<Customer, 'id'>[]) => {
    const newCustomers = customersList.map(c => ({
      ...c,
      id: `cst-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }));
    setCustomers(prev => [...newCustomers, ...prev]);
    addAuditLog('BULK_CREATE_CUSTOMERS', 'Customer Master', `Bulk uploaded ${customersList.length} customers`);
  };

  // Vendor Master methods
  const addVendor = (v: Omit<Vendor, 'id'>) => {
    const newVendor = { ...v, id: `vnd-${Date.now()}` };
    setVendors(prev => [newVendor, ...prev]);
    addAuditLog('CREATE_VENDOR', 'Vendor Master', `Added vendor: ${newVendor.name} (${newVendor.vendorCode})`);
  };

  const updateVendor = (v: Vendor) => {
    setVendors(prev => prev.map(item => item.id === v.id ? v : item));
    addAuditLog('UPDATE_VENDOR', 'Vendor Master', `Updated vendor: ${v.name} (${v.vendorCode})`);
  };

  const deleteVendor = (id: string) => {
    const target = vendors.find(v => v.id === id);
    setVendors(prev => prev.filter(v => v.id !== id));
    addAuditLog('DELETE_VENDOR', 'Vendor Master', `Deleted vendor: ${target?.name || id}`);
  };

  const bulkAddVendors = (vendorsList: Omit<Vendor, 'id'>[]) => {
    const newVendors = vendorsList.map(v => ({
      ...v,
      id: `vnd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }));
    setVendors(prev => [...newVendors, ...prev]);
    addAuditLog('BULK_CREATE_VENDORS', 'Vendor Master', `Bulk uploaded ${vendorsList.length} vendors`);
  };

  const addVendorCategory = (cat: string) => {
    if (!vendorCategories.includes(cat)) setVendorCategories(prev => [...prev, cat]);
  };

  const deleteVendorCategory = (cat: string) => {
    setVendorCategories(prev => prev.filter(c => c !== cat));
  };

  // BOM Master methods
  const addBOM = (b: Omit<BOM, 'id' | 'lastUpdated'>) => {
    const newBOM = { ...b, id: `bom-${Date.now()}`, lastUpdated: new Date().toISOString().split('T')[0] };
    setBOMs(prev => [newBOM, ...prev]);
    addAuditLog('CREATE_BOM', 'BOM Master', `Created BOM: ${newBOM.bomCode} (${newBOM.machineModel}) with ${newBOM.components?.length || 0} parts`);
  };

  const updateBOM = (b: BOM) => {
    setBOMs(prev => prev.map(item => item.id === b.id ? { ...b, lastUpdated: new Date().toISOString().split('T')[0] } : item));
    addAuditLog('UPDATE_BOM', 'BOM Master', `Updated BOM: ${b.bomCode} (${b.machineModel})`);
  };

  const deleteBOM = (id: string) => {
    const target = boms.find(b => b.id === id);
    setBOMs(prev => prev.filter(b => b.id !== id));
    addAuditLog('DELETE_BOM', 'BOM Master', `Deleted BOM: ${target?.bomCode || id} (${target?.machineModel || ''})`);
  };

  const bulkAddBOMs = (bomsList: Omit<BOM, 'id' | 'lastUpdated'>[]) => {
    const newBOMs = bomsList.map(b => ({
      ...b,
      id: `bom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      lastUpdated: new Date().toISOString().split('T')[0]
    }));
    setBOMs(prev => [...newBOMs, ...prev]);
    addAuditLog('BULK_CREATE_BOMS', 'BOM Master', `Bulk imported ${bomsList.length} BOMs`);
  };

  // Sales Order (SO) methods
  const addSalesOrder = (so: Omit<SalesOrder, 'id' | 'status'>) => {
    const newSO: SalesOrder = {
      ...so,
      id: `so-${Date.now()}`,
      status: 'CONFIRMED'
    };
    setSalesOrders(prev => [newSO, ...prev]);
    addAuditLog('CREATE_SO', 'Sales Orders', `Created Sales Order ${newSO.soNumber} for ${newSO.customerName} (${newSO.quantity}x ${newSO.machineModel})`);
  };

  const updateSalesOrder = (so: SalesOrder) => {
    setSalesOrders(prev => prev.map(s => s.id === so.id ? so : s));
    addAuditLog('UPDATE_SO', 'Sales Orders', `Updated Sales Order: ${so.soNumber}`);
  };

  const deleteSalesOrder = (id: string): boolean => {
    const targetSO = salesOrders.find(s => s.id === id);
    if (!targetSO) return false;

    // Check if a Work Order has already been generated
    const hasWO = workOrders.some(w => w.soId === id || (targetSO.soNumber && w.soNumber === targetSO.soNumber));
    if (hasWO) {
      alert(`Cannot delete Sales Order ${targetSO.soNumber} because a Work Order is already generated for it.`);
      return false;
    }

    setSalesOrders(prev => prev.filter(s => s.id !== id));
    addAuditLog('DELETE_SO', 'Sales Orders', `Deleted Sales Order: ${targetSO.soNumber}`);
    return true;
  };

  const updateSOStatus = (id: string, status: SalesOrder['status']) => {
    setSalesOrders(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    const target = salesOrders.find(s => s.id === id);
    addAuditLog('UPDATE_SO_STATUS', 'Sales Orders', `Updated status for SO ${target?.soNumber || id} to ${status}`);
  };

  const generateWOFromSO = (soId: string) => {
    const targetSO = salesOrders.find(s => s.id === soId);
    if (!targetSO) return;

    const normSOModel = (targetSO.machineModel || '').trim().toLowerCase();
    const linkedBOM = boms.find(b => 
      b.id === targetSO.bomId || 
      b.machineModel.trim().toLowerCase() === normSOModel || 
      b.bomCode.trim().toLowerCase() === normSOModel ||
      (b.machineModel && normSOModel && (b.machineModel.toLowerCase().includes(normSOModel) || normSOModel.includes(b.machineModel.toLowerCase())))
    ) || boms[0];

    const newWO: WorkOrder = {
      id: `wo-${Date.now()}`,
      workOrderNo: generateNextWorkOrderNumber(workOrders),
      soId: targetSO.id,
      soNumber: targetSO.soNumber,
      customerName: targetSO.customerName,
      machineModel: targetSO.machineModel,
      quantity: targetSO.quantity || 1,
      targetCompletionDate: targetSO.deliveryDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      startDate: new Date().toISOString().split('T')[0],
      assignedLead: 'Suresh Patel (Production Lead)',
      stage: 'PLANNED',
      status: 'IN_PROGRESS',
      bomId: linkedBOM?.id || 'bom-1',
      remarks: targetSO.customNotes || targetSO.notes || 'Generated against Sales Order',
      woComponents: linkedBOM ? linkedBOM.components.map(c => ({
        itemId: c.itemId,
        itemCode: c.itemCode,
        itemName: c.itemName,
        qtyRequired: c.qtyPerMachine * (targetSO.quantity || 1),
        unit: c.unit || 'Pcs',
        subAssemblyTag: c.subAssemblyTag || 'Base Frame',
        isCustomExtra: false
      })) : []
    };

    setWorkOrders(prev => [newWO, ...prev]);
    updateSOStatus(soId, 'WO_GENERATED');
    addAuditLog('GENERATE_WO', 'Work Orders', `Generated Work Order ${newWO.workOrderNo} from Sales Order ${targetSO.soNumber}`);
  };

  // Work Order methods with custom components & Exchange Job Card creation
  const addWorkOrder = (wo: Omit<WorkOrder, 'id'>) => {
    const newWO: WorkOrder = {
      ...wo,
      id: `wo-${Date.now()}`
    };
    setWorkOrders(prev => [newWO, ...prev]);
    addAuditLog('CREATE_WO', 'Work Orders', `Created Work Order ${newWO.workOrderNo || newWO.woNumber} for ${newWO.machineModel} (Qty: ${newWO.quantity})`);
  };

  const updateWorkOrderComponents = (woId: string, woComponents: WorkOrder['woComponents'], oldComponents?: WorkOrder['woComponents']) => {
    const targetWO = workOrders.find(w => w.id === woId);
    setWorkOrders(prev => prev.map(w => w.id === woId ? { ...w, woComponents } : w));

    // If an existing Job Card exists for this WO, automatically generate an Exchange Job Card
    const existingJC = jobCards.find(jc => jc.woId === woId || jc.woNumber === targetWO?.workOrderNo);
    if (existingJC && oldComponents) {
      // Find returned parts and newly added parts
      const returnParts: any[] = [];
      const newParts: any[] = [];

      oldComponents.forEach(oldC => {
        const matchingNew = woComponents?.find(nc => nc.itemId === oldC.itemId);
        if (!matchingNew) {
          returnParts.push(oldC);
        } else if ((matchingNew.qtyRequired || 1) < (oldC.qtyRequired || 1)) {
          returnParts.push({ ...oldC, qtyRequired: (oldC.qtyRequired || 1) - (matchingNew.qtyRequired || 1) });
        }
      });

      woComponents?.forEach(newC => {
        const matchingOld = oldComponents.find(oc => oc.itemId === newC.itemId);
        if (!matchingOld) {
          newParts.push(newC);
        } else if ((newC.qtyRequired || 1) > (matchingOld.qtyRequired || 1)) {
          newParts.push({ ...newC, qtyRequired: (newC.qtyRequired || 1) - (matchingOld.qtyRequired || 1) });
        }
      });

      if (returnParts.length > 0 || newParts.length > 0) {
        createExchangeJobCard(woId, returnParts, newParts);
      }
    }
  };

  const updateWorkOrderStage = (woId: string, stage: WorkOrder['stage'], status?: WorkOrder['status']) => {
    setWorkOrders(prev => prev.map(w => w.id === woId ? { ...w, stage, ...(status ? { status } : {}) } : w));
  };

  // Job Cards Methods
  const addJobCard = (jc: Omit<JobCard, 'id' | 'jobCardNo'>) => {
    const newJC: JobCard = {
      ...jc,
      id: `jc-${Date.now()}`,
      jobCardNo: generateNextJobCardNumber(jobCards)
    };
    setJobCards(prev => [newJC, ...prev]);
  };

  const updateJobCard = (jc: JobCard) => {
    setJobCards(prev => prev.map(j => j.id === jc.id ? jc : j));
    addAuditLog('UPDATE_JOB_CARD', 'Job Cards', `Updated Job Card ${jc.jobCardNo}`);
  };

  const updateJobCardProgress = (id: string, completedQuantity: number) => {
    setJobCards(prev => prev.map(jc => {
      if (jc.id === id) {
        const newStatus = completedQuantity >= jc.targetQuantity ? 'COMPLETED' : 'IN_PROGRESS';
        return {
          ...jc,
          completedQuantity,
          status: newStatus,
          ...(newStatus === 'COMPLETED' ? { completionDate: new Date().toISOString().split('T')[0] } : {})
        };
      }
      return jc;
    }));
  };

  const closeJobCard = (id: string) => {
    const targetJC = jobCards.find(jc => jc.id === id);
    if (!targetJC) return;

    // Deduct any remaining unissued components from inventory
    targetJC.components.forEach(comp => {
      const required = comp.totalRequiredQty || (comp.qtyPerUnit * targetJC.targetQuantity);
      const alreadyIssued = comp.issuedQty || 0;
      const unissuedRemaining = Math.max(0, required - alreadyIssued);
      if (unissuedRemaining > 0) {
        setItems(prevItems => prevItems.map(i => {
          if (i.id === comp.itemId || i.itemCode === comp.itemCode) {
            return {
              ...i,
              inHouseStock: Math.max(0, i.inHouseStock - unissuedRemaining)
            };
          }
          return i;
        }));
      }
    });

    // Credit finished assembly/sub-assembly item to in-house stock
    setItems(prevItems => prevItems.map(i => {
      if (i.id === targetJC.itemId || i.itemCode === targetJC.itemCode) {
        return {
          ...i,
          inHouseStock: i.inHouseStock + targetJC.targetQuantity
        };
      }
      return i;
    }));

    setJobCards(prev => prev.map(jc => jc.id === id ? { ...jc, status: 'COMPLETED', completionDate: new Date().toISOString().split('T')[0] } : jc));
    addAuditLog('CLOSE_JOB_CARD', 'Job Cards', `Closed Job Card ${targetJC.jobCardNo} (Completed ${targetJC.targetQuantity} units).`);
  };

  const reopenJobCard = (id: string) => {
    const targetJC = jobCards.find(jc => jc.id === id);
    if (!targetJC || targetJC.status !== 'COMPLETED') return;

    // 1. Revert finished item credit from in-house stock
    setItems(prevItems => prevItems.map(i => {
      if (i.id === targetJC.itemId || i.itemCode === targetJC.itemCode) {
        return {
          ...i,
          inHouseStock: Math.max(0, i.inHouseStock - targetJC.targetQuantity)
        };
      }
      return i;
    }));

    // 2. Return consumed components back to in-house inventory
    targetJC.components.forEach(comp => {
      setItems(prevItems => prevItems.map(i => {
        if (i.id === comp.itemId || i.itemCode === comp.itemCode) {
          return {
            ...i,
            inHouseStock: i.inHouseStock + (comp.qtyPerUnit * targetJC.targetQuantity)
          };
        }
        return i;
      }));
    });

    // 3. Set status back to IN_PROGRESS
    setJobCards(prev => prev.map(jc => jc.id === id ? {
      ...jc,
      status: 'IN_PROGRESS',
      completionDate: undefined
    } : jc));

    addAuditLog('REOPEN_JOB_CARD', 'Job Cards', `Reopened completed Job Card ${targetJC.jobCardNo} (Inventory stock adjustments reversed).`);
  };

  const deleteJobCard = (id: string): boolean => {
    const targetJC = jobCards.find(jc => jc.id === id);
    if (!targetJC) return false;

    if (targetJC.completedQuantity > 0) {
      alert(`❌ Cannot delete Job Card ${targetJC.jobCardNo} because ${targetJC.completedQuantity} units have already been processed.`);
      return false;
    }

    const nowIso = new Date().toISOString();
    const userDisplay = currentUser?.fullName || currentUser?.username || 'Admin';

    setJobCards(prev => prev.map(jc => {
      if (jc.id === id) {
        return {
          ...jc,
          status: 'CANCELLED',
          isDeleted: true,
          deletedAt: nowIso,
          deletedBy: userDisplay
        };
      }
      return jc;
    }));

    addAuditLog('DELETE_JOB_CARD', 'Job Cards', `Soft-deleted Job Card ${targetJC.jobCardNo} (Archived to history).`);
    return true;
  };

  const reissueJobCardMaterial = (
    jobCardId: string, 
    reissueItems: { itemId: string; qty: number; reason: 'VENDOR_REWORK' | 'SCRAP' | 'IN_HOUSE_REWORK' | 'OTHER'; notes?: string }[]
  ) => {
    const jc = jobCards.find(j => j.id === jobCardId);
    if (!jc) return;

    const newReissues: JobCardMaterialReissue[] = reissueItems.map((it, idx) => {
      const itm = items.find(i => i.id === it.itemId);
      return {
        id: `rei-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        reissueNo: `REI-${Date.now().toString().slice(-4)}`,
        jobCardId,
        jobCardNo: jc.jobCardNo,
        woNumber: jc.woNumber,
        itemId: it.itemId,
        itemCode: itm ? (itm as any).itemCode : '',
        itemName: itm ? (itm as any).name : '',
        quantity: it.qty,
        unit: itm?.unit || 'PCS',
        workerName: currentUser?.fullName || currentUser?.username || 'Production Team',
        supervisorName: currentUser?.fullName || 'Supervisor',
        reason: it.reason,
        issuedDate: new Date().toISOString().split('T')[0],
        status: 'ISSUED',
        notes: it.notes
      };
    });

    setJobCards(prev => prev.map(j => {
      if (j.id === jobCardId) {
        return {
          ...j,
          reissues: [...(j.reissues || []), ...newReissues]
        };
      }
      return j;
    }));

    addAuditLog('MATERIAL_REISSUE', 'Job Cards', `Reissued extra materials for Job Card ${jc.jobCardNo}`);
  };

  const createExchangeJobCard = (woId: string, returnParts: any[], newParts: any[]) => {
    const targetWO = workOrders.find(w => w.id === woId);
    
    // Create an Exchange / Deviation Job Card to reflect return & re-issue of parts
    const exchangeParts = [
      ...returnParts.map(p => ({
        itemId: p.itemId,
        itemCode: p.itemCode || '',
        itemName: p.itemName || '',
        action: 'RETURN_TO_STORE' as const,
        qty: p.qtyRequired || p.qty || 1,
        unit: p.unit || 'PCS'
      })),
      ...newParts.map(p => ({
        itemId: p.itemId,
        itemCode: p.itemCode || '',
        itemName: p.itemName || '',
        action: 'ISSUE_FROM_STORE' as const,
        qty: p.qtyRequired || p.qty || 1,
        unit: p.unit || 'PCS'
      }))
    ];

    const exchangeJC: JobCard = {
      id: `jc-ex-${Date.now()}`,
      jobCardNo: generateNextJobCardNumber(jobCards),
      woId,
      woNumber: targetWO?.workOrderNo,
      itemId: targetWO?.woComponents?.[0]?.itemId || 'itm-custom',
      itemCode: targetWO?.machineModel || 'CUSTOM-MOD',
      itemName: `BOM Change Exchange for ${targetWO?.workOrderNo}`,
      itemType: 'SUB_ASSEMBLY',
      targetQuantity: targetWO?.quantity || 1,
      completedQuantity: 0,
      status: 'OPEN',
      type: 'EXCHANGE',
      exchangeParts: exchangeParts as any,
      assignedOperator: targetWO?.assignedLead || 'Shopfloor Lead',
      startDate: new Date().toISOString().split('T')[0],
      remarks: `Customer demanded revision: Return ${returnParts.length} parts to store, issue ${newParts.length} new parts from store`,
      components: newParts.map(np => ({
        itemId: np.itemId || '',
        itemCode: np.itemCode || '',
        itemName: np.itemName || '',
        qtyPerUnit: np.qtyRequired || 1,
        totalRequiredQty: np.qtyRequired || 1,
        unit: np.unit || 'PCS'
      }))
    };

    setJobCards(prev => [exchangeJC, ...prev]);
  };

  // Material Issue Methods
  const issueMaterialForJobCard = (jcId: string, itemId: string, qty: number, issuedTo?: string, notes?: string): boolean => {
    if (qty <= 0) return false;
    let success = false;
    let targetItemCode = '';
    let targetItemName = '';
    let jcRefNo = '';
    let jcModel = '';

    setJobCards(prev => prev.map(jc => {
      if (jc.id !== jcId) return jc;
      jcRefNo = jc.jobCardNo;
      jcModel = jc.itemName || jc.itemCode;
      const updatedComps = jc.components.map(comp => {
        if (comp.itemId === itemId || comp.itemCode === itemId) {
          targetItemCode = comp.itemCode;
          targetItemName = comp.itemName;
          const currentIssued = comp.issuedQty || 0;
          return {
            ...comp,
            issuedQty: currentIssued + qty
          };
        }
        return comp;
      });
      success = true;
      return { ...jc, components: updatedComps };
    }));

    if (success) {
      // Deduct from physical store inventory
      setItems(prevItems => prevItems.map(it => {
        if (it.id === itemId || it.itemCode === itemId || it.itemCode === targetItemCode) {
          return {
            ...it,
            inHouseStock: Math.max(0, it.inHouseStock - qty)
          };
        }
        return it;
      }));

      // Create Material Issue Record
      const newRecord: MaterialIssueRecord = {
        id: `iss-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        issueNo: `ISS-JC-${Date.now().toString().slice(-4)}`,
        type: 'JOB_CARD',
        referenceId: jcId,
        referenceNo: jcRefNo,
        machineModel: jcModel,
        itemId,
        itemCode: targetItemCode,
        itemName: targetItemName,
        issuedQty: qty,
        unit: 'PCS',
        issuedDate: new Date().toISOString().split('T')[0],
        issuedBy: currentUser?.fullName || currentUser?.username || 'Store Keeper',
        issuedTo: issuedTo || 'Assembly Floor',
        notes: notes || `Store material issue for Job Card ${jcRefNo}`
      };
      setMaterialIssueRecords(prev => [newRecord, ...prev]);
      addAuditLog('MATERIAL_ISSUE', 'Material Issue & Store', `Issued ${qty}x ${targetItemCode} for Job Card ${jcRefNo}`);
    }
    return success;
  };

  const issueMaterialForWorkOrder = (woId: string, itemId: string, qty: number, issuedTo?: string, notes?: string): boolean => {
    if (qty <= 0) return false;
    let success = false;
    let targetItemCode = '';
    let targetItemName = '';
    let woRefNo = '';
    let woModel = '';

    setWorkOrders(prev => prev.map(wo => {
      if (wo.id !== woId) return wo;
      woRefNo = wo.workOrderNo || wo.woNumber || wo.id;
      woModel = wo.machineModel;
      const comps = wo.woComponents || [];
      const updatedComps = comps.map(comp => {
        if (comp.itemId === itemId || comp.itemCode === itemId) {
          targetItemCode = comp.itemCode || '';
          targetItemName = comp.itemName || '';
          const currentIssued = comp.issuedQty || 0;
          return {
            ...comp,
            issuedQty: currentIssued + qty
          };
        }
        return comp;
      });
      success = true;
      return { ...wo, woComponents: updatedComps };
    }));

    if (success) {
      // Deduct from physical store inventory
      setItems(prevItems => prevItems.map(it => {
        if (it.id === itemId || it.itemCode === itemId || it.itemCode === targetItemCode) {
          return {
            ...it,
            inHouseStock: Math.max(0, it.inHouseStock - qty)
          };
        }
        return it;
      }));

      // Create Material Issue Record
      const newRecord: MaterialIssueRecord = {
        id: `iss-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        issueNo: `ISS-WO-${Date.now().toString().slice(-4)}`,
        type: 'WORK_ORDER',
        referenceId: woId,
        referenceNo: woRefNo,
        machineModel: woModel,
        itemId,
        itemCode: targetItemCode,
        itemName: targetItemName,
        issuedQty: qty,
        unit: 'PCS',
        issuedDate: new Date().toISOString().split('T')[0],
        issuedBy: currentUser?.fullName || currentUser?.username || 'Store Keeper',
        issuedTo: issuedTo || 'Shopfloor Assembly',
        notes: notes || `Store material issue for Work Order ${woRefNo}`
      };
      setMaterialIssueRecords(prev => [newRecord, ...prev]);
      addAuditLog('MATERIAL_ISSUE', 'Material Issue & Store', `Issued ${qty}x ${targetItemCode} for Work Order ${woRefNo}`);
    }
    return success;
  };

  const issueAllAvailableForCard = (cardType: 'JOB_CARD' | 'WORK_ORDER', cardId: string, issuedTo?: string): number => {
    let totalIssuedLines = 0;
    if (cardType === 'JOB_CARD') {
      const jc = jobCards.find(j => j.id === cardId);
      if (!jc) return 0;
      jc.components.forEach(comp => {
        const req = comp.totalRequiredQty || (comp.qtyPerUnit * jc.targetQuantity);
        const issued = comp.issuedQty || 0;
        const unissued = Math.max(0, req - issued);
        if (unissued > 0) {
          const itemObj = items.find(i => i.id === comp.itemId || i.itemCode === comp.itemCode);
          const inStock = itemObj?.inHouseStock || 0;
          const canIssue = Math.min(unissued, inStock);
          if (canIssue > 0) {
            issueMaterialForJobCard(cardId, comp.itemId || comp.itemCode, canIssue, issuedTo);
            totalIssuedLines++;
          }
        }
      });
    } else {
      const wo = workOrders.find(w => w.id === cardId);
      if (!wo) return 0;
      (wo.woComponents || []).forEach(comp => {
        const req = comp.qtyRequired || comp.qty || 1;
        const issued = comp.issuedQty || 0;
        const unissued = Math.max(0, req - issued);
        if (unissued > 0) {
          const itemObj = items.find(i => i.id === comp.itemId || i.itemCode === comp.itemCode);
          const inStock = itemObj?.inHouseStock || 0;
          const canIssue = Math.min(unissued, inStock);
          if (canIssue > 0) {
            issueMaterialForWorkOrder(cardId, comp.itemId || comp.itemCode || '', canIssue, issuedTo);
            totalIssuedLines++;
          }
        }
      });
    }
    return totalIssuedLines;
  };

  // Floor Planning Methods
  const assignWOToStation = (woId: string, stationId: string) => {
    setFloorStations(prev => prev.map(stn => {
      const filtered = stn.assignedWOIds.filter(id => id !== woId);
      if (stn.id === stationId) {
        return { ...stn, assignedWOIds: [...filtered, woId] };
      }
      return { ...stn, assignedWOIds: filtered };
    }));
  };

  const moveWOStation = (woId: string, fromStationId: string, toStationId: string) => {
    setFloorStations(prev => prev.map(stn => {
      if (stn.id === fromStationId) {
        return { ...stn, assignedWOIds: stn.assignedWOIds.filter(id => id !== woId) };
      }
      if (stn.id === toStationId && !stn.assignedWOIds.includes(woId)) {
        return { ...stn, assignedWOIds: [...stn.assignedWOIds, woId] };
      }
      return stn;
    }));
  };

  // Finished Goods & Dispatch
  const addFinishedGoodFromWO = (woId: string, serialNo: string, configurationNote?: string) => {
    const targetWO = workOrders.find(w => w.id === woId);
    if (!targetWO) return;

    const newFG: FinishedGoodUnit = {
      id: `fg-${Date.now()}`,
      serialNo,
      itemId: targetWO.bomId || 'itm-9',
      itemCode: targetWO.machineModel,
      machineModel: targetWO.machineModel,
      woId: targetWO.id,
      woNumber: targetWO.workOrderNo || 'WO-GEC-001',
      allocatedSOId: targetWO.soId,
      allocatedSONumber: targetWO.soNumber,
      allocatedCustomerName: targetWO.customerName,
      configurationNote: configurationNote || targetWO.remarks || 'Standard Factory Spec',
      customPartsDiff: targetWO.woComponents?.filter(c => c.isCustomExtra).map(c => `${c.itemCode} (${c.qtyRequired} ${c.unit})`) || [],
      status: 'IN_STOCK',
      completedDate: new Date().toISOString().split('T')[0]
    };

    setFinishedGoods(prev => [newFG, ...prev]);
    updateWorkOrderStage(woId, 'COMPLETED', 'COMPLETED');
  };

  const reallocateFinishedGood = (finishedGoodId: string, targetSOId: string) => {
    const targetSO = salesOrders.find(s => s.id === targetSOId);
    if (!targetSO) return;

    setFinishedGoods(prev => prev.map(fg => {
      if (fg.id === finishedGoodId) {
        return {
          ...fg,
          allocatedSOId: targetSO.id,
          allocatedSONumber: targetSO.soNumber,
          allocatedCustomerName: targetSO.customerName,
          status: 'ALLOCATED'
        };
      }
      return fg;
    }));
  };

  const dispatchFinishedGood = (dispatchData: Omit<DispatchRecord, 'id' | 'dispatchNo'>) => {
    const newDispatch: DispatchRecord = {
      ...dispatchData,
      id: `disp-${Date.now()}`,
      dispatchNo: generateNextDispatchNumber(dispatchRecords)
    };

    setDispatchRecords(prev => [newDispatch, ...prev]);

    // Mark Finished Good as Dispatched
    setFinishedGoods(prev => prev.map(fg => {
      if (fg.id === dispatchData.finishedGoodId) {
        return { ...fg, status: 'DISPATCHED', dispatchedDate: dispatchData.dispatchDate };
      }
      return fg;
    }));

    // Update SO status to COMPLETED
    if (dispatchData.soId) {
      updateSOStatus(dispatchData.soId, 'COMPLETED');
    }
  };

  const createBackup = (): BackupRecord => {
    const backupPayload = {
      version: '2.0',
      createdDate: new Date().toISOString(),
      createdBy: currentUser?.username || 'admin',
      users,
      departments,
      customRoles,
      items,
      itemCategories,
      customers,
      vendors,
      vendorCategories,
      boms,
      salesOrders,
      workOrders,
      purchaseOrders,
      jobworks,
      grns,
      jobCards,
      floorStations,
      finishedGoods,
      dispatchRecords,
      auditLogs
    };

    const fileName = `GEC_ERP_BACKUP_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const jsonStr = JSON.stringify(backupPayload, null, 2);
    const sizeKb = Math.round(new Blob([jsonStr]).size / 1024) || 1;

    const newRecord: BackupRecord = {
      id: `bak-${Date.now()}`,
      fileName,
      filePath: `local/backups/${fileName}`,
      fileSizeKb: sizeKb,
      backupType: 'MANUAL',
      createdAt: new Date().toISOString(),
      status: 'SUCCESS'
    };

    localStorage.setItem(`gec_erp_bak_payload_${newRecord.id}`, jsonStr);

    setBackups(prev => [newRecord, ...prev]);
    addAuditLog('CREATE_BACKUP', 'Backup & Restore', `Created manual backup archive: ${fileName} (${sizeKb} KB)`);
    return newRecord;
  };

  const downloadBackup = (backupId: string) => {
    const payloadStr = localStorage.getItem(`gec_erp_bak_payload_${backupId}`);
    const backupRecord = backups.find(b => b.id === backupId);
    const fileName = backupRecord ? backupRecord.fileName : `GEC_ERP_BACKUP_${Date.now()}.json`;

    let dataToDownload = payloadStr;
    if (!dataToDownload) {
      dataToDownload = JSON.stringify({
        version: '2.0',
        createdDate: new Date().toISOString(),
        users, items, itemCategories, boms, salesOrders, workOrders, purchaseOrders, jobworks, grns, jobCards, floorStations, customers, vendors
      }, null, 2);
    }

    const blob = new Blob([dataToDownload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addAuditLog('DOWNLOAD_BACKUP', 'Backup & Restore', `Downloaded backup archive file: ${fileName}`);
  };

  const deleteBackup = (backupId: string) => {
    const backupRecord = backups.find(b => b.id === backupId);
    localStorage.removeItem(`gec_erp_bak_payload_${backupId}`);
    setBackups(prev => prev.filter(b => b.id !== backupId));
    addAuditLog('DELETE_BACKUP', 'Backup & Restore', `Deleted backup archive record: ${backupRecord?.fileName || backupId}`);
  };

  const restoreBackup = (backupData: any): { success: boolean; message: string } => {
    try {
      const parsed = typeof backupData === 'string' ? JSON.parse(backupData) : backupData;
      if (!parsed || typeof parsed !== 'object') {
        return { success: false, message: 'Invalid backup file format.' };
      }

      if (parsed.items && Array.isArray(parsed.items)) setItems(parsed.items);
      if (parsed.itemCategories && Array.isArray(parsed.itemCategories)) setItemCategories(parsed.itemCategories);
      if (parsed.customers && Array.isArray(parsed.customers)) setCustomers(parsed.customers);
      if (parsed.vendors && Array.isArray(parsed.vendors)) setVendors(parsed.vendors);
      if (parsed.vendorCategories && Array.isArray(parsed.vendorCategories)) setVendorCategories(parsed.vendorCategories);
      if (parsed.boms && Array.isArray(parsed.boms)) setBOMs(parsed.boms);
      if (parsed.salesOrders && Array.isArray(parsed.salesOrders)) setSalesOrders(parsed.salesOrders);
      if (parsed.workOrders && Array.isArray(parsed.workOrders)) setWorkOrders(parsed.workOrders);
      if (parsed.purchaseOrders && Array.isArray(parsed.purchaseOrders)) setPurchaseOrders(parsed.purchaseOrders);
      if (parsed.jobworks && Array.isArray(parsed.jobworks)) setJobworks(parsed.jobworks);
      if (parsed.grns && Array.isArray(parsed.grns)) setGRNs(parsed.grns);
      if (parsed.jobCards && Array.isArray(parsed.jobCards)) setJobCards(parsed.jobCards);
      if (parsed.floorStations && Array.isArray(parsed.floorStations)) setFloorStations(parsed.floorStations);
      if (parsed.finishedGoods && Array.isArray(parsed.finishedGoods)) setFinishedGoods(parsed.finishedGoods);
      if (parsed.dispatchRecords && Array.isArray(parsed.dispatchRecords)) setDispatchRecords(parsed.dispatchRecords);
      if (parsed.users && Array.isArray(parsed.users)) setUsers(parsed.users);

      addAuditLog('RESTORE_BACKUP', 'Backup & Restore', `Database restored successfully from backup.`);
      return { success: true, message: 'Database successfully restored from backup snapshot!' };
    } catch (err: any) {
      return { success: false, message: `Failed to restore: ${err.message}` };
    }
  };

  // Floor Stations CRUD
  const addFloorStation = (stn: Omit<FloorStation, 'id'>) => {
    const newStation: FloorStation = {
      ...stn,
      id: `stn-${Date.now()}`
    };
    setFloorStations(prev => [...prev, newStation]);
    addAuditLog('CREATE_FLOOR_STATION', 'Shopfloor Planning', `Added floor station: ${stn.name} (${stn.code})`);
  };

  const updateFloorStation = (stn: FloorStation) => {
    setFloorStations(prev => prev.map(s => s.id === stn.id ? stn : s));
    addAuditLog('UPDATE_FLOOR_STATION', 'Shopfloor Planning', `Updated floor station: ${stn.name}`);
  };

  const deleteFloorStation = (id: string) => {
    const target = floorStations.find(s => s.id === id);
    setFloorStations(prev => prev.filter(s => s.id !== id));
    addAuditLog('DELETE_FLOOR_STATION', 'Shopfloor Planning', `Deleted floor station: ${target?.name || id}`);
  };

  const updateBackupSettings = (settings: BackupSettings) => {
    setBackupSettings(settings);
  };

  const resetOperationalData = (): { success: boolean; message: string } => {
    try {
      // 1. Reset all operational / transactional records
      setSalesOrders([]);
      setWorkOrders([]);
      setJobCards([]);
      setFloorStations(INITIAL_FLOOR_STATIONS);
      setJobworks([]);
      setPurchaseOrders([]);
      setGRNs([]);
      setQCInspections([]);
      setAssemblies([]);
      setFinishedGoods([]);
      setDispatchRecords([]);

      // 2. Clear operational pending stock quantities on items (pendingQCStock, externalStock)
      const cleanedItems = items.map(it => ({
        ...it,
        pendingQCStock: 0,
        externalStock: 0
      }));
      setItems(cleanedItems);
      setStored('items', cleanedItems);

      // 3. Preserve Item Master, BOMs, Customers, Vendors, and Admin users only
      const preservedAdmins = users.filter(u => 
        u.role === 'Admin' || 
        u.isSuperAdmin || 
        u.username.toLowerCase() === 'admin' || 
        u.username.toLowerCase() === 'superadmin'
      );
      const finalAdmins = preservedAdmins.length > 0 ? preservedAdmins : INITIAL_USERS.filter(u => u.role === 'Admin');
      setUsers(finalAdmins);

      // 4. Clear stored operational keys in localStorage
      setStored('salesOrders', []);
      setStored('workOrders', []);
      setStored('jobCards', []);
      setStored('floorStations', INITIAL_FLOOR_STATIONS);
      setStored('jobworks', []);
      setStored('purchaseOrders', []);
      setStored('grns', []);
      setStored('qcInspections', []);
      setStored('assemblies', []);
      setStored('finishedGoods', []);
      setStored('dispatchRecords', []);
      setStored('users', finalAdmins);

      addAuditLog('SYSTEM_RESET', 'System Administration', 'Operational reset executed. Item Master, BOMs, Process Master, Customers, Vendors, Departments, and Admin user accounts preserved.');
      return { 
        success: true, 
        message: 'System Reset Complete: All operational transactions (Orders, Job Cards, POs, Challans, GRNs, Assembly & QC) have been reset. Item Master, BOMs, Process Master, Customers, Vendors, and Admin accounts are intact.' 
      };
    } catch (err: any) {
      return { success: false, message: `System reset error: ${err?.message || 'Unknown error'}` };
    }
  };

  const resetInventory = (): { success: boolean; message: string } => {
    try {
      const zeroedItems = items.map(it => ({
        ...it,
        inHouseStock: 0,
        externalStock: 0,
        pendingQCStock: 0
      }));
      setItems(zeroedItems);
      setStored('items', zeroedItems);
      addAuditLog('INVENTORY_RESET', 'System Administration', 'Inventory reset executed. All item in-house, external, and pending QC stocks zeroed.');
      return {
        success: true,
        message: 'Inventory Reset Complete: All in-house stock, external stock, and pending QC quantities have been set to 0. Item definitions, BOMs, and Process Master data are preserved.'
      };
    } catch (err: any) {
      return { success: false, message: `Inventory reset error: ${err?.message || 'Unknown error'}` };
    }
  };

  // Operational methods
  const addJobworkChallan = (challanData: Omit<JobworkChallan, 'id' | 'pendingBalance' | 'status'>) => {
    const newChallan: JobworkChallan = {
      ...challanData,
      id: `jw-${Date.now()}`,
      pendingBalance: challanData.sentQuantity || 0,
      status: 'ISSUED'
    };

    setJobworks(prev => [newChallan, ...prev]);

    // Deduct in-house stock and credit external jobwork stock
    if (challanData.itemId) {
      setItems(prevItems => prevItems.map(item => {
        if (item.id === challanData.itemId || item.itemCode === challanData.itemCode) {
          return {
            ...item,
            inHouseStock: Math.max(0, item.inHouseStock - (challanData.sentQuantity || 0)),
            externalStock: item.externalStock + (challanData.sentQuantity || 0)
          };
        }
        return item;
      }));
    }
  };

  const recordJobworkReturn = (challanId: string, receivedQty: number, scrapQty: number) => {
    setJobworks(prev => prev.map(j => {
      if (j.id === challanId) {
        const newReceived = (j.receivedQuantity || 0) + receivedQty;
        const newScrap = (j.scrapQuantity || 0) + scrapQty;
        const remaining = Math.max(0, (j.sentQuantity || 0) - newReceived - newScrap);

        return {
          ...j,
          receivedQuantity: newReceived,
          scrapQuantity: newScrap,
          pendingBalance: remaining,
          status: remaining === 0 ? 'COMPLETED' : 'PARTIALLY_RECEIVED'
        };
      }
      return j;
    }));

    const targetChallan = jobworks.find(j => j.id === challanId);
    if (targetChallan && targetChallan.itemId) {
      setItems(prevItems => prevItems.map(item => {
        if (item.id === targetChallan.itemId || item.itemCode === targetChallan.itemCode) {
          return {
            ...item,
            inHouseStock: item.inHouseStock + receivedQty,
            externalStock: Math.max(0, item.externalStock - receivedQty - scrapQty)
          };
        }
        return item;
      }));
    }
  };

  const addPurchaseOrder = (poData: Omit<PurchaseOrder, 'id' | 'status' | 'subtotal' | 'taxAmount' | 'totalAmount'>) => {
    const subtotal = poData.items.reduce((sum, item) => sum + ((item.quantity || item.orderedQty || 1) * (item.unitPrice || 0)), 0);
    const taxAmount = subtotal * 0.18;
    const totalAmount = subtotal + taxAmount;

    const newPO: PurchaseOrder = {
      ...poData,
      id: `po-${Date.now()}`,
      status: 'DRAFT',
      subtotal,
      taxAmount,
      totalAmount,
      poCreateDateTime: new Date().toISOString()
    };

    setPurchaseOrders(prev => [newPO, ...prev]);
  };

  const updatePurchaseOrder = (po: PurchaseOrder) => {
    setPurchaseOrders(prev => prev.map(p => p.id === po.id ? po : p));
  };

  const deletePurchaseOrder = (id: string) => {
    const target = purchaseOrders.find(p => p.id === id);
    if (!target) return;

    const totalOrdered = target.items.reduce((sum, item) => sum + (item.quantity || item.orderedQty || 0), 0);
    const totalReceived = target.items.reduce((sum, item) => sum + (item.receivedQty || 0), 0);
    const nowIso = new Date().toISOString();
    const userDisplay = currentUser?.fullName || currentUser?.username || 'Admin';

    // Case 1: Partial GRN has been taken (0 < totalReceived < totalOrdered) -> Split PO
    if (totalReceived > 0 && totalReceived < totalOrdered) {
      // 1. Update target PO: retain fulfilled portion (e.g. 3 of 5 received)
      const fulfilledItems = target.items.map(item => {
        const orig = item.originalOrderedQty || item.quantity || item.orderedQty || 1;
        const rec = item.receivedQty || 0;
        const uPrice = item.unitPrice || 0;
        return {
          ...item,
          originalOrderedQty: orig,
          orderedQty: orig,
          quantity: orig,
          receivedQty: rec,
          cancelledQty: 0,
          totalAmount: rec * uPrice,
          amount: rec * uPrice
        };
      });
      const fulfilledSubtotal = fulfilledItems.reduce((sum, it) => sum + ((it.receivedQty || 0) * (it.unitPrice || 0)), 0);
      const fulfilledTax = fulfilledSubtotal * 0.18;
      const fulfilledTotal = fulfilledSubtotal + fulfilledTax;

      const updatedFulfilledPO: PurchaseOrder = {
        ...target,
        items: fulfilledItems,
        subtotal: fulfilledSubtotal,
        taxAmount: fulfilledTax,
        totalAmount: fulfilledTotal,
        status: 'GOODS_RECEIVED',
        isSplitFulfilled: true,
        splitNotes: `Partially fulfilled portion retained (${totalReceived} of ${totalOrdered} units received) upon cancellation of remaining pending balance.`
      };

      // 2. Create split cancelled balance PO (e.g. PO-A-deleted with 2 of 5 cancelled)
      const cancelledItems = target.items.map(item => {
        const orig = item.originalOrderedQty || item.quantity || item.orderedQty || 1;
        const rec = item.receivedQty || 0;
        const rem = Math.max(0, orig - rec);
        const uPrice = item.unitPrice || 0;
        return {
          ...item,
          originalOrderedQty: orig,
          orderedQty: orig,
          quantity: orig,
          cancelledQty: rem,
          receivedQty: 0,
          totalAmount: rem * uPrice,
          amount: rem * uPrice
        };
      }).filter(item => (item.cancelledQty || 0) > 0);

      const cancelledSubtotal = cancelledItems.reduce((sum, it) => sum + ((it.cancelledQty || 0) * (it.unitPrice || 0)), 0);
      const cancelledTax = cancelledSubtotal * 0.18;
      const cancelledTotal = cancelledSubtotal + cancelledTax;

      const splitDeletedPO: PurchaseOrder = {
        ...target,
        id: `po-${Date.now()}-del`,
        poNumber: `${target.poNumber}-deleted`,
        items: cancelledItems,
        subtotal: cancelledSubtotal,
        taxAmount: cancelledTax,
        totalAmount: cancelledTotal,
        status: 'CANCELLED',
        isDeleted: true,
        deletedAt: nowIso,
        deletedBy: userDisplay,
        splitFromPoNumber: target.poNumber,
        notes: `Cancelled remainder balance of ${totalOrdered - totalReceived} units from partial PO ${target.poNumber}.`
      };

      setPurchaseOrders(prev => [splitDeletedPO, ...prev.map(p => p.id === id ? updatedFulfilledPO : p)]);
      addAuditLog('SPLIT_DELETE_PO', 'Purchase Orders', `Split and cancelled partial PO ${target.poNumber}: Retained fulfilled portion (${totalReceived}/${totalOrdered} received) under ${target.poNumber} and created cancelled balance PO ${splitDeletedPO.poNumber} (${totalOrdered - totalReceived}/${totalOrdered} units).`);
    } else {
      // Case 2: No GRN taken (or completely unfulfilled): soft-delete
      setPurchaseOrders(prev => prev.map(p => {
        if (p.id === id) {
          return {
            ...p,
            status: 'CANCELLED',
            isDeleted: true,
            deletedAt: nowIso,
            deletedBy: userDisplay
          };
        }
        return p;
      }));
      addAuditLog('SOFT_DELETE_PO', 'Purchase Orders', `Soft-deleted Purchase Order ${target.poNumber} (Archived, hidden from active views).`);
    }
  };

  const sendPODraftsForApproval = (ids: string[]) => {
    setPurchaseOrders(prev => prev.map(po => {
      if (ids.includes(po.id) && (po.status === 'DRAFT' || po.status === 'REJECTED')) {
        return { ...po, status: 'WAITING_FOR_APPROVAL' as POStatus, rejectionReason: undefined };
      }
      return po;
    }));
    addAuditLog('SEND_PO_FOR_APPROVAL', 'Purchase Orders', `Submitted ${ids.length} PO draft(s) for manager approval.`);
  };

  const updatePOStatus = (id: string, status: PurchaseOrder['status'], rejectionReason?: string) => {
    setPurchaseOrders(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          status,
          rejectionReason: status === 'REJECTED' ? (rejectionReason || 'Rejected by Approver') : p.rejectionReason,
          rejectedBy: status === 'REJECTED' ? (currentUser?.fullName || 'Approver') : p.rejectedBy,
          rejectedAt: status === 'REJECTED' ? new Date().toISOString() : p.rejectedAt
        };
      }
      return p;
    }));
    addAuditLog('UPDATE_PO_STATUS', 'Purchase Orders', `Updated PO status to ${status}${rejectionReason ? ` (Reason: ${rejectionReason})` : ''}`);
  };

  const resubmitPOForApproval = (poId: string, updatedItems?: POItem[], notes?: string) => {
    setPurchaseOrders(prev => prev.map(po => {
      if (po.id === poId) {
        const items = updatedItems || po.items;
        const subtotal = items.reduce((sum, item) => sum + ((item.quantity || item.orderedQty || 1) * (item.unitPrice || 0)), 0);
        const taxAmount = subtotal * 0.18;
        const totalAmount = subtotal + taxAmount;
        return {
          ...po,
          items,
          subtotal,
          taxAmount,
          totalAmount,
          notes: notes !== undefined ? notes : po.notes,
          status: 'WAITING_FOR_APPROVAL' as POStatus,
          rejectionReason: undefined,
          rejectedBy: undefined,
          rejectedAt: undefined
        };
      }
      return po;
    }));
    addAuditLog('RESUBMIT_PO_APPROVAL', 'Purchase Orders', `Resubmitted modified PO for approval.`);
  };

  const addJobCardMaterialReissue = (reissueData: Omit<JobCardMaterialReissue, 'id' | 'reissueNo'>) => {
    const newReissue: JobCardMaterialReissue = {
      ...reissueData,
      id: `reissue-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      reissueNo: `REISSUE-${Date.now().toString().slice(-4)}`
    };
    setJobCardMaterialReissues(prev => [newReissue, ...prev]);

    // Deduct stock from In-House store
    if (reissueData.itemId) {
      setItems(prevItems => prevItems.map(item => {
        if (item.id === reissueData.itemId || item.itemCode === reissueData.itemCode) {
          return {
            ...item,
            inHouseStock: Math.max(0, (item.inHouseStock || 0) - (reissueData.quantity || 0))
          };
        }
        return item;
      }));
    }

    addAuditLog('REISSUE_MATERIAL', 'Job Cards', `Allocated replacement material: ${reissueData.quantity} ${reissueData.unit} of ${reissueData.itemCode} for Worker: ${reissueData.workerName} (Reason: ${reissueData.reason})`);
  };

  const addGRN = (grnData: Omit<GoodsReceivedNotice, 'id' | 'status'>) => {
    let hasPendingQC = false;
    const directJWItemsByVendor = new Map<string, {
      vendorId: string;
      vendorName: string;
      lines: any[];
    }>();

    // 1. Process items for Stock / Pending QC / Direct Jobwork
    grnData.items.forEach(grnItem => {
      const itemObj = items.find(i => i.id === grnItem.itemId || i.itemCode === grnItem.itemCode);
      const factor = (grnItem.conversionFactor && grnItem.conversionFactor > 0) ? grnItem.conversionFactor : (itemObj?.conversionFactor || 1);
      const totalRecd = grnItem.acceptedQty !== undefined ? grnItem.acceptedQty : (grnItem.receivedQty || 0);
      const directQty = grnItem.isDirectJobwork ? (grnItem.directJWQty || 0) : 0;
      const inwardStoreQty = Math.max(0, totalRecd - directQty);
      const needsQC = itemObj?.qcTrigger === 'ON_GRN' || itemObj?.testReportRequired;

      if (needsQC && inwardStoreQty > 0) {
        hasPendingQC = true;
      }

      // Credit Stock (Store stock only credited if NO QC required; if QC required, goes to pendingQCStock)
      setItems(prevItems => prevItems.map(item => {
        if (item.id === grnItem.itemId || item.itemCode === grnItem.itemCode) {
          const addedInHouse = needsQC ? 0 : (inwardStoreQty * factor);
          const addedPendingQC = needsQC ? (inwardStoreQty * factor) : 0;
          const addedExternal = directQty * factor;

          return {
            ...item,
            inHouseStock: (item.inHouseStock || 0) + addedInHouse,
            pendingQCStock: (item.pendingQCStock || 0) + addedPendingQC,
            externalStock: (item.externalStock || 0) + addedExternal
          };
        }
        return item;
      }));

      // Collect Direct Jobwork entries
      if (grnItem.isDirectJobwork && directQty > 0 && grnItem.directJWVendorId) {
        const vId = grnItem.directJWVendorId;
        const vName = grnItem.directJWVendorName || vendors.find(v => v.id === vId)?.name || 'Job Worker';
        if (!directJWItemsByVendor.has(vId)) {
          directJWItemsByVendor.set(vId, {
            vendorId: vId,
            vendorName: vName,
            lines: []
          });
        }
        directJWItemsByVendor.get(vId)!.lines.push({
          itemId: itemObj?.id || grnItem.itemId,
          itemCode: itemObj?.itemCode || grnItem.itemCode,
          itemName: itemObj?.name || grnItem.itemName,
          qty: directQty,
          producedItemId: grnItem.directJWProduceItemId,
          producedItemCode: grnItem.directJWProduceItemCode,
          producedItemName: grnItem.directJWProduceItemName,
          stepNumber: grnItem.directJWStepNumber,
          processRequired: grnItem.directJWProcessName
        });

        // Map vendor to the produced item in item master
        if (grnItem.directJWProduceItemId) {
          setItems(prevItems => prevItems.map(item => {
            if (item.id === grnItem.directJWProduceItemId) {
              const currentMapped = item.mappedVendors || [];
              if (!currentMapped.some(v => v.vendorId === vId)) {
                return {
                  ...item,
                  mappedVendors: [...currentMapped, { vendorId: vId, vendorName: vName, priority: currentMapped.length + 1 }]
                };
              }
            }
            return item;
          }));
        }
      }
    });

    // 2. Automatically generate merged Job Work Challans by Vendor
    directJWItemsByVendor.forEach((group, vId) => {
      const firstLine = group.lines[0];
      const autoChallan: JobworkChallan = {
        id: `jw-grn-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        challanNo: `JW-DIR-${Date.now().toString().slice(-4)}`,
        vendorId: vId,
        vendorName: group.vendorName,
        itemId: firstLine?.itemId,
        itemCode: firstLine?.itemCode,
        itemName: firstLine?.itemName,
        producedItemId: firstLine?.producedItemId,
        producedItemCode: firstLine?.producedItemCode,
        producedItemName: firstLine?.producedItemName,
        processRequired: firstLine?.processRequired || (firstLine?.stepNumber ? `Step ${firstLine.stepNumber} Processing` : 'Direct Jobwork from Inward GRN'),
        stepNumber: firstLine?.stepNumber,
        sentQuantity: group.lines.reduce((s, l) => s + l.qty, 0),
        receivedQuantity: 0,
        scrapQuantity: 0,
        pendingBalance: group.lines.reduce((s, l) => s + l.qty, 0),
        issueDate: grnData.receivedDate || new Date().toISOString().split('T')[0],
        expectedReturnDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        status: 'ISSUED',
        items: group.lines,
        notes: `Direct shipment generated from GRN ${grnData.grnNumber} (Step ${firstLine?.stepNumber || 1})`
      };
      setJobworks(prev => [autoChallan, ...prev]);
      addAuditLog('AUTO_JOBWORK_CHALLAN', 'Goods Received', `Generated direct Job Work Challan ${autoChallan.challanNo} for vendor ${group.vendorName}`);
    });

    const newGRN: GoodsReceivedNotice = {
      ...grnData,
      id: `grn-${Date.now()}`,
      status: hasPendingQC ? 'PENDING_QC' : 'NO_QC'
    };

    setGRNs(prev => [newGRN, ...prev]);

    // 3. Update PO if Against PO
    if (grnData.poId || grnData.poNumber) {
      setPurchaseOrders(prevPOs => prevPOs.map(po => {
        if (po.id === grnData.poId || po.poNumber === grnData.poNumber) {
          const updatedItems = po.items.map(poLine => {
            const grnLine = grnData.items.find(g => g.itemId === poLine.itemId || g.itemCode === poLine.itemCode || g.poItemId === poLine.itemId);
            const receivedQtyInc = grnLine ? (grnLine.acceptedQty !== undefined ? grnLine.acceptedQty : (grnLine.receivedQty || 0)) : 0;
            return grnLine ? { ...poLine, receivedQty: (poLine.receivedQty || 0) + receivedQtyInc } : poLine;
          });
          const allComplete = updatedItems.every(line => (line.receivedQty || 0) >= (line.quantity || line.orderedQty || 1));
          const anyReceived = updatedItems.some(line => (line.receivedQty || 0) > 0);

          return {
            ...po,
            items: updatedItems,
            status: allComplete ? 'GOODS_RECEIVED' : (anyReceived ? 'PARTIALLY_RECEIVED' : po.status)
          };
        }
        return po;
      }));
    }

    // 4. Update Jobwork Challan if Against Job Work
    if (grnData.challanId || grnData.challanNo) {
      setJobworks(prevJWs => prevJWs.map(jw => {
        if (jw.id === grnData.challanId || jw.challanNo === grnData.challanNo) {
          const totalRecdThisGRN = grnData.items.reduce((s, it) => s + (it.acceptedQty !== undefined ? it.acceptedQty : (it.receivedQty || 0)), 0);
          const newReceived = (jw.receivedQuantity || 0) + totalRecdThisGRN;
          const remaining = Math.max(0, (jw.sentQuantity || 0) - newReceived - (jw.scrapQuantity || 0));
          return {
            ...jw,
            receivedQuantity: newReceived,
            pendingBalance: remaining,
            status: remaining === 0 ? 'COMPLETED' : 'PARTIALLY_RECEIVED'
          };
        }
        return jw;
      }));
    }

    addAuditLog('CREATE_GRN', 'Goods Received', `Created GRN ${newGRN.grnNumber} (${grnData.items.length} item lines) - Status: ${newGRN.status}`);
  };

  const approveGRN = (grnId: string) => {
    setGRNs(prev => prev.map(g => g.id === grnId ? { ...g, status: 'QC_APPROVED' } : g));
  };

  const updateGRN = (updatedGRN: GoodsReceivedNotice) => {
    const prevGRN = grns.find(g => g.id === updatedGRN.id);
    if (!prevGRN) return;

    // Adjust inventory difference for each item
    prevGRN.items.forEach(oldItem => {
      const newItem = updatedGRN.items.find(ni => ni.itemId === oldItem.itemId || ni.itemCode === oldItem.itemCode);
      if (newItem) {
        const factor = (newItem.conversionFactor && newItem.conversionFactor > 0) ? newItem.conversionFactor : (oldItem.conversionFactor || 1);
        const oldBaseQty = (oldItem.acceptedQty || 0) * factor;
        const newBaseQty = (newItem.acceptedQty || 0) * factor;
        const diff = newBaseQty - oldBaseQty;

        if (diff !== 0) {
          setItems(prevItems => prevItems.map(item => {
            if (item.id === oldItem.itemId || item.itemCode === oldItem.itemCode) {
              return {
                ...item,
                inHouseStock: Math.max(0, (item.inHouseStock || 0) + diff)
              };
            }
            return item;
          }));
        }
      }
    });

    setGRNs(prev => prev.map(g => g.id === updatedGRN.id ? updatedGRN : g));
    addAuditLog('UPDATE_GRN', 'Goods Received', `Updated GRN ${updatedGRN.grnNumber}`);
  };

  const reportQCInspection = (payload: ReportQCPayload) => {
    const itemObj = items.find(i => i.id === payload.itemId || i.itemCode === payload.itemCode);
    const factor = itemObj?.conversionFactor || 1;
    const approvedBase = (payload.approvedQty || 0) * factor;
    const inspectedBase = (payload.inspectedQty || 0) * factor;

    // 1. Credit approved stock to inHouseStock & release from pendingQCStock
    setItems(prevItems => prevItems.map(item => {
      if (item.id === payload.itemId || item.itemCode === payload.itemCode) {
        return {
          ...item,
          inHouseStock: (item.inHouseStock || 0) + approvedBase,
          pendingQCStock: Math.max(0, (item.pendingQCStock || 0) - inspectedBase)
        };
      }
      return item;
    }));

    // 2. Add QC Inspection record
    const nextQCNo = generateNextQCNumber(qcInspections);
    const newQC: QCInspection = {
      id: `qc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      inspectionNo: nextQCNo,
      qcNumber: nextQCNo,
      referenceType: 'GRN',
      referenceNo: payload.grnNumber || payload.grnId || 'DIRECT',
      grnId: payload.grnId,
      grnNumber: payload.grnNumber,
      vendorId: payload.vendorId,
      vendorName: payload.vendorName,
      itemId: payload.itemId,
      itemCode: payload.itemCode,
      itemName: payload.itemName,
      grnQty: payload.grnQty,
      inspectedQty: payload.inspectedQty,
      inspectedQuantity: payload.inspectedQty,
      passedQuantity: payload.approvedQty,
      approvedQty: payload.approvedQty,
      failedQuantity: payload.rejectedQty,
      rejectedQty: payload.rejectedQty,
      status: payload.rejectedQty > 0 ? (payload.approvedQty > 0 ? 'CONDITIONAL_APPROVAL' : 'REJECTED') : 'APPROVED',
      disposition: payload.disposition || (payload.rejectedQty > 0 ? (payload.approvedQty > 0 ? 'CONDITIONAL_APPROVAL' : 'REJECTED') : 'PASSED'),
      defectReason: payload.defectReason || '',
      remarks: payload.defectReason || '',
      inspectionDate: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      inspectorName: payload.inspectorName || currentUser?.fullName || 'QC Inspector',
      type: payload.type || 'GRN'
    };

    setQCInspections(prev => [newQC, ...prev]);

    // 3. Update parent GRN status
    if (payload.grnId || payload.grnNumber) {
      setGRNs(prevGRNs => prevGRNs.map(grn => {
        if (grn.id === payload.grnId || grn.grnNumber === payload.grnNumber) {
          const allQCsForGRN = [newQC, ...qcInspections.filter(q => q.grnId === grn.id || q.referenceNo === grn.grnNumber || q.grnNumber === grn.grnNumber)];
          
          let allItemsInspected = true;
          let anyItemInspected = false;

          grn.items.forEach(gItem => {
            const itObj = items.find(i => i.id === gItem.itemId || i.itemCode === gItem.itemCode);
            const needsQC = itObj?.qcTrigger === 'ON_GRN' || itObj?.testReportRequired;
            if (needsQC) {
              const totalInspectedForLine = allQCsForGRN
                .filter(q => q.itemId === gItem.itemId || q.itemCode === gItem.itemCode)
                .reduce((sum, q) => sum + (q.inspectedQuantity || q.inspectedQty || 0), 0);
              const targetQty = gItem.acceptedQty !== undefined ? gItem.acceptedQty : (gItem.receivedQty || 0);
              if (totalInspectedForLine >= targetQty) {
                anyItemInspected = true;
              } else {
                allItemsInspected = false;
                if (totalInspectedForLine > 0) anyItemInspected = true;
              }
            }
          });

          const newStatus = allItemsInspected ? 'QC_APPROVED' : (anyItemInspected ? 'PARTIALLY_QC' : grn.status);
          return {
            ...grn,
            status: newStatus as any
          };
        }
        return grn;
      }));
    }

    addAuditLog('REPORT_QC', 'Quality Control', `Reported QC for GRN ${payload.grnNumber || '-'} (${payload.itemCode}): Inspected ${payload.inspectedQty}, Approved ${payload.approvedQty}, Rejected ${payload.rejectedQty}`);
  };

  const addAssembly = (assemblyData: Omit<MachineAssembly, 'id'>) => {
    setAssemblies(prev => [{ ...assemblyData, id: `asm-${Date.now()}` }, ...prev]);
  };

  const updateAssemblyProgress = (id: string, progressPercentage: number, status: MachineAssembly['status']) => {
    setAssemblies(prev => prev.map(a => a.id === id ? { ...a, progressPercentage, status } : a));
  };

  // Super Admin Mass Ingestion Methods
  const massUpsertItems = (newItems: Item[], mode: 'APPEND' | 'OVERWRITE') => {
    if (mode === 'OVERWRITE') {
      setItems(newItems);
      addAuditLog('MASS_OVERWRITE_ITEMS', 'Super Admin Data Hub', `Overwrote Item Master with ${newItems.length} records.`);
    } else {
      setItems(prev => {
        const result = [...prev];
        newItems.forEach(newItem => {
          const matchIdx = result.findIndex(i => 
            i.id === newItem.id ||
            (newItem.partCode && i.partCode && i.partCode.trim().toUpperCase() === newItem.partCode.trim().toUpperCase()) ||
            i.itemCode.trim().toUpperCase() === newItem.itemCode.trim().toUpperCase()
          );

          if (matchIdx >= 0) {
            result[matchIdx] = {
              ...result[matchIdx],
              ...newItem,
              id: result[matchIdx].id,
              itemCode: result[matchIdx].itemCode || newItem.itemCode,
              isBlocked: false
            };
          } else {
            result.push(newItem);
          }
        });
        return result;
      });
      addAuditLog('MASS_UPSERT_ITEMS', 'Super Admin Data Hub', `Upserted/merged ${newItems.length} items without duplicates.`);
    }
  };

  const massUpsertBOMs = (newBOMs: BOM[], mode: 'APPEND' | 'OVERWRITE') => {
    if (mode === 'OVERWRITE') {
      setBOMs(newBOMs);
      addAuditLog('MASS_OVERWRITE_BOMS', 'Super Admin Data Hub', `Overwrote BOM Master with ${newBOMs.length} BOMs.`);
    } else {
      setBOMs(prev => {
        const bomMap = new Map(prev.map(b => [b.bomCode.toUpperCase(), b]));
        newBOMs.forEach(bom => {
          bomMap.set(bom.bomCode.toUpperCase(), bom);
        });
        return Array.from(bomMap.values());
      });
      addAuditLog('MASS_UPSERT_BOMS', 'Super Admin Data Hub', `Upserted/merged ${newBOMs.length} BOMs.`);
    }
  };

  const massUpsertVendors = (newVendors: Vendor[], mode: 'APPEND' | 'OVERWRITE') => {
    if (mode === 'OVERWRITE') {
      setVendors(newVendors);
      addAuditLog('MASS_OVERWRITE_VENDORS', 'Super Admin Data Hub', `Overwrote Vendor Master with ${newVendors.length} vendors.`);
    } else {
      setVendors(prev => {
        const result = [...prev];
        newVendors.forEach(newV => {
          const matchIdx = result.findIndex(v => 
            (newV.vendorCode && v.vendorCode && v.vendorCode.toUpperCase() === newV.vendorCode.toUpperCase()) ||
            (newV.gstin && v.gstin && v.gstin.toUpperCase() === newV.gstin.toUpperCase()) ||
            v.name.trim().toLowerCase() === newV.name.trim().toLowerCase()
          );
          if (matchIdx >= 0) {
            result[matchIdx] = {
              ...result[matchIdx],
              ...newV,
              id: result[matchIdx].id
            };
          } else {
            result.push(newV);
          }
        });
        return result;
      });
      addAuditLog('MASS_UPSERT_VENDORS', 'Super Admin Data Hub', `Upserted/merged ${newVendors.length} vendors.`);
    }
  };

  const massUpsertCustomers = (newCustomers: Customer[], mode: 'APPEND' | 'OVERWRITE') => {
    if (mode === 'OVERWRITE') {
      setCustomers(newCustomers);
      addAuditLog('MASS_OVERWRITE_CUSTOMERS', 'Super Admin Data Hub', `Overwrote Customer Master with ${newCustomers.length} customers.`);
    } else {
      setCustomers(prev => {
        const cMap = new Map(prev.map(c => [c.customerCode.toUpperCase(), c]));
        newCustomers.forEach(c => {
          cMap.set(c.customerCode.toUpperCase(), {
            ...(cMap.get(c.customerCode.toUpperCase()) || {}),
            ...c
          });
        });
        return Array.from(cMap.values());
      });
      addAuditLog('MASS_UPSERT_CUSTOMERS', 'Super Admin Data Hub', `Upserted/merged ${newCustomers.length} customers.`);
    }
  };

  const massUpsertProcesses = (newProcs: ProcessDefinition[], mode: 'APPEND' | 'OVERWRITE') => {
    if (mode === 'OVERWRITE') {
      setProcessDefinitions(newProcs);
      addAuditLog('MASS_OVERWRITE_PROCESSES', 'Super Admin Data Hub', `Overwrote Process Master with ${newProcs.length} operations.`);
    } else {
      setProcessDefinitions(prev => {
        const pMap = new Map(prev.map(p => [p.shortCode.toUpperCase(), p]));
        newProcs.forEach(p => {
          pMap.set(p.shortCode.toUpperCase(), {
            ...(pMap.get(p.shortCode.toUpperCase()) || {}),
            ...p
          });
        });
        return Array.from(pMap.values());
      });
      addAuditLog('MASS_UPSERT_PROCESSES', 'Super Admin Data Hub', `Upserted/merged ${newProcs.length} process operations.`);
    }
  };

  const massUpsertItemProcessCards = (newCards: ItemProcessCard[], mode: 'APPEND' | 'OVERWRITE') => {
    if (mode === 'OVERWRITE') {
      setItemProcessCards(newCards);
      addAuditLog('MASS_OVERWRITE_PROCESS_CARDS', 'Super Admin Data Hub', `Overwrote Process Routing Cards with ${newCards.length} routes.`);
    } else {
      setItemProcessCards(prev => {
        const cardMap = new Map<string, ItemProcessCard>();
        prev.forEach(c => {
          const key = (c.itemCode || c.itemId).toUpperCase();
          cardMap.set(key, c);
        });
        newCards.forEach(c => {
          const key = (c.itemCode || c.itemId).toUpperCase();
          cardMap.set(key, {
            ...(cardMap.get(key) || {}),
            ...c,
            id: cardMap.get(key)?.id || c.id,
            lastUpdated: new Date().toISOString().split('T')[0]
          });
        });
        return Array.from(cardMap.values());
      });
      addAuditLog('MASS_UPSERT_PROCESS_CARDS', 'Super Admin Data Hub', `Upserted ${newCards.length} Process Routing Cards.`);
    }
  };

  const massUpdateInventory = (updates: { itemId?: string; itemCode: string; inHouseStock: number; externalStock: number; location?: string; unitPrice?: number; minStockQty?: number }[]) => {
    const updateMap = new Map(updates.map(u => [u.itemCode.toUpperCase(), u]));
    setItems(prev => prev.map(item => {
      const up = updateMap.get(item.itemCode.toUpperCase());
      if (!up) return item;
      return {
        ...item,
        inHouseStock: up.inHouseStock !== undefined ? up.inHouseStock : item.inHouseStock,
        externalStock: up.externalStock !== undefined ? up.externalStock : item.externalStock,
        location: up.location || item.location,
        unitPrice: up.unitPrice !== undefined ? up.unitPrice : item.unitPrice,
        minStockQty: up.minStockQty !== undefined ? up.minStockQty : item.minStockQty
      };
    }));
    addAuditLog('MASS_UPDATE_INVENTORY', 'Super Admin Data Hub', `Updated stock balances for ${updates.length} items.`);
  };

  return (
    <ERPContext.Provider value={{
      currentUser,
      users,
      departments,
      customRoles,
      items,
      itemCategories,
      customers,
      vendors,
      vendorCategories,
      boms,
      salesOrders,
      jobworks,
      purchaseOrders,
      grns,
      workOrders,
      qcInspections,
      assemblies,
      assemblyStages,
      jobCards,
      floorStations,
      finishedGoods,
      dispatchRecords,
      backupSettings,
      activeModule,
      theme,
      searchTerm,
      selectedWOIdForEdit,
      setSelectedWOIdForEdit,
      openWOInEditor,
      selectedBOMIdForView,
      setSelectedBOMIdForView,
      openBOMInEditor,
      jobCardMaterialReissues,
      addJobCardMaterialReissue,
      resubmitPOForApproval,
      setSearchTerm,
      isMobileNavOpen,
      setIsMobileNavOpen,
      toggleMobileNav,
      setActiveModule,
      toggleTheme,
      login,
      signup,
      logout,
      resetUserPassword,
      addUser,
      updateUser,
      deleteUser,
      updateUserRole,
      addDepartment,
      updateDepartment,
      deleteDepartment,
      addRole,
      updateRole,
      deleteRole,
      addItem,
      updateItem,
      deleteItem,
      recoverItem,
      bulkAddItems,
      bulkDeleteItems,
      bulkRecoverItems,
      adjustItemStock,
      updateItemCategory,
      removeAllOldItemCodes,
      addItemCategory,
      deleteItemCategory,
      addQCInspection,
      updateQCInspection,
      addAssemblyStage,
      deleteAssemblyStage,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      bulkAddCustomers,
      addVendor,
      updateVendor,
      deleteVendor,
      bulkAddVendors,
      addVendorCategory,
      deleteVendorCategory,
      addBOM,
      updateBOM,
      deleteBOM,
      bulkAddBOMs,
      addSalesOrder,
      updateSalesOrder,
      deleteSalesOrder,
      updateSOStatus,
      generateWOFromSO,
      addWorkOrder,
      updateWorkOrderComponents,
      updateWorkOrderStage,
      addJobCard,
      updateJobCard,
      updateJobCardProgress,
      closeJobCard,
      reopenJobCard,
      deleteJobCard,
      createExchangeJobCard,
      materialIssueRecords,
      issueMaterialForJobCard,
      issueMaterialForWorkOrder,
      issueAllAvailableForCard,
      assignWOToStation,
      moveWOStation,
      addFloorStation,
      updateFloorStation,
      deleteFloorStation,
      addFinishedGoodFromWO,
      reallocateFinishedGood,
      dispatchFinishedGood,
      auditLogs,
      processDefinitions,
      addProcessDefinition,
      updateProcessDefinition,
      deleteProcessDefinition,
      itemProcessCards,
      saveItemProcessCard,
      deleteItemProcessCard,
      vendorDebitChallans,
      createVendorDebitChallan,
      updateVendorDebitChallan,
      deleteVendorDebitChallan,
      approveVendorDebitChallan,
      rejectVendorDebitChallan,
      intermediateProcessItems,
      allInventoryItems,
      addAuditLog,
      systemErrors,
      addSystemError,
      clearSystemErrors,
      backups,
      createBackup,
      deleteBackup,
      downloadBackup,
      restoreBackup,
      updateBackupSettings,
      resetOperationalData,
      resetInventory,
      massUpsertItems,
      massUpsertBOMs,
      massUpsertVendors,
      massUpsertCustomers,
      massUpsertProcesses,
      massUpsertItemProcessCards,
      massUpdateInventory,
      addJobworkChallan,
      recordJobworkReturn,
      addPurchaseOrder,
      updatePurchaseOrder,
      deletePurchaseOrder,
      sendPODraftsForApproval,
      updatePOStatus,
      addGRN,
      updateGRN,
      approveGRN,
      reportQCInspection,
      addAssembly,
      updateAssemblyProgress
    }}>
      {children}
    </ERPContext.Provider>
  );
};

export const useERP = () => {
  const context = useContext(ERPContext);
  if (!context) throw new Error('useERP must be used within ERPProvider');
  return context;
};
