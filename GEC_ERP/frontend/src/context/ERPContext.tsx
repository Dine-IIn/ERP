import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, Item, Customer, Vendor, JobworkChallan, 
  PurchaseOrder, GoodsReceivedNotice, WorkOrder, 
  QCInspection, QCType, MachineAssembly, BOM, SalesOrder, Role, Department, CustomRole,
  JobCard, FloorStation, FinishedGoodUnit, DispatchRecord, UserActivityLog, BackupRecord, RBAC_FEATURES,
  JobCardMaterialReissue, POItem, POStatus, SystemErrorLog
} from '../types/erp';
import { 
  INITIAL_USERS, INITIAL_CUSTOMERS, INITIAL_VENDORS, INITIAL_ITEM_CATEGORIES, INITIAL_VENDOR_CATEGORIES, INITIAL_ITEMS, 
  INITIAL_BOMS, INITIAL_SALES_ORDERS, INITIAL_JOBWORK_CHALLANS, INITIAL_PURCHASE_ORDERS, INITIAL_GRNS, 
  INITIAL_WORK_ORDERS, INITIAL_QC_INSPECTIONS, INITIAL_ASSEMBLIES, INITIAL_ASSEMBLY_STAGES,
  INITIAL_JOB_CARDS, INITIAL_FLOOR_STATIONS, INITIAL_FINISHED_GOODS, INITIAL_DISPATCH_RECORDS
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
  setActiveModule: (moduleKey: string) => void;
  toggleTheme: () => void;
  
  // Auth & User Management
  login: (username: string, password: string) => { success: boolean; message: string };
  signup: (username: string, password: string, fullName: string, role: Role) => { success: boolean; message: string };
  logout: () => void;
  resetUserPassword: (usernameOrEmail: string, newPass: string) => { success: boolean; message: string };
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
  const [items, setItems] = useState<Item[]>(() => getStored('items', INITIAL_ITEMS));
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

  const openWOInEditor = (woId: string) => {
    setSelectedWOIdForEdit(woId);
    setActiveModuleState('work-orders');
  };

  const openBOMInEditor = (bomId: string) => {
    setSelectedBOMIdForView(bomId);
    setActiveModuleState('bom-master');
  };

  useEffect(() => setStored('users', users), [users]);
  useEffect(() => setStored('departments', departments), [departments]);
  useEffect(() => setStored('customRoles', customRoles), [customRoles]);
  useEffect(() => setStored('currentUser', currentUser), [currentUser]);
  useEffect(() => setStored('items', items), [items]);
  useEffect(() => setStored('itemCategories', itemCategories), [itemCategories]);
  useEffect(() => setStored('customers', customers), [customers]);
  useEffect(() => setStored('vendors', vendors), [vendors]);
  useEffect(() => setStored('vendorCategories', vendorCategories), [vendorCategories]);
  useEffect(() => setStored('boms', boms), [boms]);
  useEffect(() => setStored('salesOrders', salesOrders), [salesOrders]);
  useEffect(() => setStored('jobworks', jobworks), [jobworks]);
  useEffect(() => setStored('purchaseOrders', purchaseOrders), [purchaseOrders]);
  useEffect(() => setStored('grns', grns), [grns]);
  useEffect(() => setStored('workOrders', workOrders), [workOrders]);
  useEffect(() => setStored('qcInspections', qcInspections), [qcInspections]);
  useEffect(() => setStored('assemblies', assemblies), [assemblies]);
  useEffect(() => setStored('assemblyStages', assemblyStages), [assemblyStages]);
  useEffect(() => setStored('jobCards', jobCards), [jobCards]);
  useEffect(() => setStored('jobCardMaterialReissues', jobCardMaterialReissues), [jobCardMaterialReissues]);
  useEffect(() => setStored('floorStations', floorStations), [floorStations]);
  useEffect(() => setStored('finishedGoods', finishedGoods), [finishedGoods]);
  useEffect(() => setStored('dispatchRecords', dispatchRecords), [dispatchRecords]);
  useEffect(() => setStored('auditLogs', auditLogs), [auditLogs]);
  useEffect(() => setStored('backups', backups), [backups]);
  useEffect(() => setStored('backupSettings', backupSettings), [backupSettings]);
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

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const setActiveModule = (moduleKey: string) => {
    setActiveModuleState(moduleKey);
    setSearchTerm('');
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

  // Auth Methods - Strict Case-Sensitive Verification
  const login = (username: string, password: string) => {
    const cleanUser = username.trim().toLowerCase();
    const found = users.find(u => u.username.toLowerCase() === cleanUser);
    
    if (cleanUser === 'superadmin') {
      const expectedSuperPass = found?.password || 'GEC_SuperAdmin#2026!Secured$';
      // Case-sensitive exact match
      if (password === expectedSuperPass) {
        const deviceType = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
        const newSessionId = `sess-${Date.now()}-${Math.random()}`;
        const updatedSuperUser: User = {
          ...(found || {
            id: 'usr-superadmin',
            username: 'superadmin',
            fullName: 'GEC System Super Admin',
            role: 'Admin',
            email: 'superadmin@gecmachines.com',
            password: expectedSuperPass,
          }),
          isSuperAdmin: true,
          ...(deviceType === 'desktop' ? { desktopSessionId: newSessionId } : { mobileSessionId: newSessionId })
        };

        setUsers(prev => {
          const exists = prev.some(u => u.username.toLowerCase() === 'superadmin');
          return exists 
            ? prev.map(u => u.username.toLowerCase() === 'superadmin' ? updatedSuperUser : { ...u, isSuperAdmin: false }) 
            : [updatedSuperUser, ...prev.map(u => ({ ...u, isSuperAdmin: false }))];
        });
        localStorage.setItem('gec_erp_lastActivityTime', Date.now().toString());
        setCurrentUser(updatedSuperUser);
        setActiveModule('superadmin-analytics');
        return { success: true, message: 'Super Admin logged in successfully' };
      }
      return { success: false, message: 'Invalid Super Admin password. Passwords are case-sensitive.' };
    }

    if (found) {
      const expectedPassword = found.password || (found.username.toLowerCase() === 'admin' ? 'admin' : 'password');
      // Case-sensitive exact match
      if (password === expectedPassword) {
        const deviceType = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
        const newSessionId = `sess-${Date.now()}-${Math.random()}`;
        const updatedUser: User = {
          ...found,
          isSuperAdmin: false,
          ...(deviceType === 'desktop' ? { desktopSessionId: newSessionId } : { mobileSessionId: newSessionId })
        };

        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : (u.username.toLowerCase() === 'superadmin' ? { ...u, isSuperAdmin: true } : { ...u, isSuperAdmin: false })));
        localStorage.setItem('gec_erp_lastActivityTime', Date.now().toString());
        setCurrentUser(updatedUser);
        setActiveModule('dashboard');
        return { success: true, message: `Welcome back, ${updatedUser.fullName}!` };
      }
    }

    return { 
      success: false, 
      message: 'Invalid username or password. Passwords are case-sensitive.' 
    };
  };

  const resetUserPassword = (usernameOrEmail: string, newPass: string) => {
    const target = users.find(u => 
      u.username.toLowerCase() === usernameOrEmail.toLowerCase().trim() || 
      (u.email && u.email.toLowerCase() === usernameOrEmail.toLowerCase().trim())
    );
    if (!target) return { success: false, message: 'User account not found.' };
    setUsers(prev => prev.map(u => u.id === target.id ? { ...u, password: newPass } : u));
    return { success: true, message: 'Password updated successfully!' };
  };

  const signup = (username: string, password: string, fullName: string, role: Role) => {
    return { success: false, message: 'Self-service registration disabled. Contact System Administrator.' };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('gec_erp_currentUser');
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
      workOrderNo: `WO-GEC-${String(workOrders.length + 1).padStart(3, '0')}`,
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
      jobCardNo: `JC-${new Date().getFullYear()}-${String(jobCards.length + 1).padStart(3, '0')}`
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

    // Deduct consumed components from inventory
    targetJC.components.forEach(comp => {
      setItems(prevItems => prevItems.map(i => {
        if (i.id === comp.itemId || i.itemCode === comp.itemCode) {
          return {
            ...i,
            inHouseStock: Math.max(0, i.inHouseStock - (comp.qtyPerUnit * targetJC.targetQuantity))
          };
        }
        return i;
      }));
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

  const createExchangeJobCard = (woId: string, returnParts: any[], newParts: any[]) => {
    const targetWO = workOrders.find(w => w.id === woId);
    const exchangeParts = [
      ...returnParts.map(p => ({
        itemId: p.itemId || '',
        itemCode: p.itemCode || '',
        itemName: p.itemName || '',
        action: 'RETURN_TO_STORE' as const,
        qty: p.qtyRequired || p.qty || 1,
        unit: p.unit || 'PCS'
      })),
      ...newParts.map(p => ({
        itemId: p.itemId || '',
        itemCode: p.itemCode || '',
        itemName: p.itemName || '',
        action: 'ISSUE_FROM_STORE' as const,
        qty: p.qtyRequired || p.qty || 1,
        unit: p.unit || 'PCS'
      }))
    ];

    const exchangeJC: JobCard = {
      id: `jc-ex-${Date.now()}`,
      jobCardNo: `JC-EX-${new Date().getFullYear()}-${String(jobCards.length + 1).padStart(3, '0')}`,
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
      exchangeParts,
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
      dispatchNo: `DSP-GEC-${new Date().getFullYear()}-${String(dispatchRecords.length + 1).padStart(3, '0')}`
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

      // 2. Preserve Item Master, BOMs, Customers, Vendors, and Admin users only
      const preservedAdmins = users.filter(u => 
        u.role === 'Admin' || 
        u.isSuperAdmin || 
        u.username.toLowerCase() === 'admin' || 
        u.username.toLowerCase() === 'superadmin'
      );
      const finalAdmins = preservedAdmins.length > 0 ? preservedAdmins : INITIAL_USERS.filter(u => u.role === 'Admin');
      setUsers(finalAdmins);

      // 3. Clear stored operational keys in localStorage
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

      addAuditLog('SYSTEM_RESET', 'System Administration', 'Operational reset executed. Item Master, BOMs, Customers, Vendors, Departments, and Admin user accounts preserved.');
      return { 
        success: true, 
        message: 'System Reset Complete: All operational transactions (Orders, Job Cards, POs, Challans, GRNs, Assembly & QC) have been reset. Item Master, BOMs, Customers, Vendors, and Admin accounts are intact.' 
      };
    } catch (err: any) {
      return { success: false, message: `System reset error: ${err?.message || 'Unknown error'}` };
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
          producedItemName: grnItem.directJWProduceItemName
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
        processRequired: 'Direct Jobwork from Inward GRN',
        sentQuantity: group.lines.reduce((s, l) => s + l.qty, 0),
        receivedQuantity: 0,
        scrapQuantity: 0,
        pendingBalance: group.lines.reduce((s, l) => s + l.qty, 0),
        issueDate: grnData.receivedDate || new Date().toISOString().split('T')[0],
        expectedReturnDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        status: 'ISSUED',
        items: group.lines,
        notes: `Direct shipment generated from GRN ${grnData.grnNumber}`
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
    const newQC: QCInspection = {
      id: `qc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      inspectionNo: `QC-INSP-${Date.now().toString().slice(-4)}`,
      qcNumber: `QC-GEC-${String(qcInspections.length + 1).padStart(3, '0')}`,
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
      assignWOToStation,
      moveWOStation,
      addFloorStation,
      updateFloorStation,
      deleteFloorStation,
      addFinishedGoodFromWO,
      reallocateFinishedGood,
      dispatchFinishedGood,
      auditLogs,
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
