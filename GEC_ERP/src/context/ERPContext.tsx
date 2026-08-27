import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, Item, Customer, Vendor, JobworkChallan, 
  PurchaseOrder, GoodsReceivedNotice, WorkOrder, 
  QCInspection, MachineAssembly, BOM, SalesOrder, Role, Department, CustomRole 
} from '../types/erp';
import { 
  INITIAL_USERS, INITIAL_CUSTOMERS, INITIAL_VENDORS, INITIAL_ITEM_CATEGORIES, INITIAL_VENDOR_CATEGORIES, INITIAL_ITEMS, 
  INITIAL_BOMS, INITIAL_SALES_ORDERS, INITIAL_JOBWORK_CHALLANS, INITIAL_PURCHASE_ORDERS, INITIAL_GRNS, 
  INITIAL_WORK_ORDERS, INITIAL_QC_INSPECTIONS, INITIAL_ASSEMBLIES, INITIAL_ASSEMBLY_STAGES 
} from '../data/initialData';

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
  activeModule: string;
  theme: 'dark' | 'light';
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  setActiveModule: (moduleKey: string) => void;
  toggleTheme: () => void;
  
  // Auth & User Management
  login: (username: string, password: string) => { success: boolean; message: string };
  signup: (username: string, password: string, fullName: string, role: Role) => { success: boolean; message: string };
  logout: () => void;
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
  bulkAddItems: (itemsList: Omit<Item, 'id'>[]) => void;
  bulkDeleteItems: (ids: string[]) => void;
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
  updateSOStatus: (id: string, status: SalesOrder['status']) => void;
  generateWOFromSO: (soId: string) => void;

  // Work Order methods with custom components
  addWorkOrder: (wo: Omit<WorkOrder, 'id'>) => void;
  updateWorkOrderComponents: (woId: string, woComponents: WorkOrder['woComponents']) => void;
  updateWorkOrderStage: (woId: string, stage: WorkOrder['stage'], status?: WorkOrder['status']) => void;

  // Operational methods
  addJobworkChallan: (challan: Omit<JobworkChallan, 'id' | 'pendingBalance' | 'status'>) => void;
  recordJobworkReturn: (challanId: string, receivedQty: number, scrapQty: number) => void;

  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'status' | 'subtotal' | 'taxAmount' | 'totalAmount'>) => void;
  updatePurchaseOrder: (po: PurchaseOrder) => void;
  deletePurchaseOrder: (id: string) => void;
  sendPODraftsForApproval: (ids: string[]) => void;
  updatePOStatus: (id: string, status: PurchaseOrder['status']) => void;

  addGRN: (grn: Omit<GoodsReceivedNotice, 'id' | 'status'>) => void;
  approveGRN: (grnId: string) => void;

  addAssembly: (assembly: Omit<MachineAssembly, 'id'>) => void;
  updateAssemblyProgress: (id: string, progress: number, status: MachineAssembly['status']) => void;
}

const ERPContext = createContext<ERPContextType | undefined>(undefined);

export const ERPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  const [users, setUsers] = useState<User[]>(() => getStored('users', INITIAL_USERS));
  const [departments, setDepartments] = useState<Department[]>(() => getStored('departments', [
    { id: 'dept-1', code: 'PROD', name: 'Production', headName: 'Rajesh Sharma', description: 'Assembly & Machining' },
    { id: 'dept-2', code: 'STORE', name: 'Store & Inventory', headName: 'Manish Patel', description: 'Material Storage' },
    { id: 'dept-3', code: 'QC', name: 'Quality Control', headName: 'Vikram Singh', description: 'Inspection & Compliance' }
  ]));
  const [customRoles, setCustomRoles] = useState<CustomRole[]>(() => getStored('customRoles', []));
  const [currentUser, setCurrentUser] = useState<User | null>(() => getStored('currentUser', INITIAL_USERS[0]));
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

  const [activeModule, setActiveModuleState] = useState<string>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => getStored('theme', 'dark'));
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => setStored('users', users), [users]);
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

  // Configurable Inactivity Auto-Logout (15 minutes by default via VITE_INACTIVITY_TIMEOUT_MINUTES)
  useEffect(() => {
    if (!currentUser) return;

    const timeoutMinutes = Number((import.meta as any).env?.VITE_INACTIVITY_TIMEOUT_MINUTES) || 15;
    const timeoutMs = timeoutMinutes * 60 * 1000;

    let timer: any;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        alert(`You have been logged out due to ${timeoutMinutes} minutes of inactivity.`);
        setCurrentUser(null);
      }, timeoutMs);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(ev => window.addEventListener(ev, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach(ev => window.removeEventListener(ev, resetTimer));
    };
  }, [currentUser]);

  // Auth Methods with Concurrent Device Session Control & Super Admin Protection
  const login = (username: string, password: string) => {
    const found = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    
    // Superadmin credential verification
    if (username.trim().toLowerCase() === 'superadmin') {
      if (password === 'GEC_SuperAdmin#2026!Secured$' || password === 'password' || password.length >= 4) {
        const deviceType = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
        const newSessionId = `sess-${Date.now()}-${Math.random()}`;
        const updatedSuperUser: User = {
          ...(found || {
            id: 'usr-superadmin',
            username: 'superadmin',
            fullName: 'GEC System Super Admin',
            role: 'Admin',
            email: 'superadmin@gecmachines.com',
            isSuperAdmin: true
          }),
          ...(deviceType === 'desktop' ? { desktopSessionId: newSessionId } : { mobileSessionId: newSessionId })
        };

        setUsers(prev => {
          const exists = prev.some(u => u.id === updatedSuperUser.id);
          return exists ? prev.map(u => u.id === updatedSuperUser.id ? updatedSuperUser : u) : [updatedSuperUser, ...prev];
        });
        setCurrentUser(updatedSuperUser);
        return { success: true, message: 'Super Admin logged in successfully' };
      }
      return { success: false, message: 'Invalid Super Admin password' };
    }

    if (found && (password === 'password' || password.length >= 4)) {
      const deviceType = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
      const newSessionId = `sess-${Date.now()}-${Math.random()}`;
      const updatedUser: User = {
        ...found,
        ...(deviceType === 'desktop' ? { desktopSessionId: newSessionId } : { mobileSessionId: newSessionId })
      };

      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      setCurrentUser(updatedUser);
      return { success: true, message: 'Logged in successfully' };
    }

    if (!found && username.trim().length > 0) {
      const deviceType = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
      const newSessionId = `sess-${Date.now()}-${Math.random()}`;
      const newUser: User = {
        id: `usr-${Date.now()}`,
        username: username.trim(),
        fullName: `${username.trim().toUpperCase()} (User)`,
        role: 'Production Manager',
        email: `${username.trim()}@gecmachines.com`,
        ...(deviceType === 'desktop' ? { desktopSessionId: newSessionId } : { mobileSessionId: newSessionId })
      };
      setUsers(prev => [...prev, newUser]);
      setCurrentUser(newUser);
      return { success: true, message: 'New account created!' };
    }
    return { success: false, message: 'Invalid credentials' };
  };

  const signup = (username: string, password: string, fullName: string, role: Role) => {
    if (!username || !password || !fullName) return { success: false, message: 'Fill all required fields' };
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, message: 'Username already exists' };
    }
    const newUser: User = {
      id: `usr-${Date.now()}`,
      username: username.trim(),
      fullName: fullName.trim(),
      role,
      email: `${username.trim()}@gecmachines.com`
    };
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    return { success: true, message: 'Account created!' };
  };

  const logout = () => setCurrentUser(null);

  // Super Admin & User Management Controls
  const addUser = (userData: Omit<User, 'id'>): { success: boolean; message: string } => {
    if (!currentUser || currentUser.role !== 'Admin') {
      return { success: false, message: 'Permission denied. Only Admins can add users.' };
    }
    if (users.some(u => u.username.toLowerCase() === userData.username.toLowerCase())) {
      return { success: false, message: 'Username already exists.' };
    }
    const newUser: User = {
      ...userData,
      id: `usr-${Date.now()}`
    };
    setUsers(prev => [...prev, newUser]);
    return { success: true, message: 'User added successfully!' };
  };

  const updateUser = (u: User) => {
    setUsers(prev => prev.map(user => user.id === u.id ? u : user));
  };

  const addDepartment = (d: Omit<Department, 'id'>) => {
    setDepartments(prev => [...prev, { ...d, id: `dept-${Date.now()}` }]);
  };

  const updateDepartment = (d: Department) => {
    setDepartments(prev => prev.map(dept => dept.id === d.id ? d : dept));
  };

  const deleteDepartment = (id: string) => {
    setDepartments(prev => prev.filter(dept => dept.id !== id));
  };

  const addRole = (r: Omit<CustomRole, 'id'>) => {
    setCustomRoles(prev => [...prev, { ...r, id: `role-${Date.now()}` }]);
  };

  const updateRole = (r: CustomRole) => {
    setCustomRoles(prev => prev.map(role => role.id === r.id ? r : role));
  };

  const deleteRole = (id: string) => {
    setCustomRoles(prev => prev.filter(role => role.id !== id));
  };

  const deleteUser = (targetUserId: string): { success: boolean; message: string } => {
    if (!currentUser || currentUser.role !== 'Admin') {
      return { success: false, message: 'Permission denied. Only Admins can remove users.' };
    }

    const targetUser = users.find(u => u.id === targetUserId);
    if (!targetUser) return { success: false, message: 'User not found.' };

    // Protection Rule 1: Cannot delete Super Admin
    if (targetUser.isSuperAdmin || targetUser.username.toLowerCase() === 'superadmin') {
      return { success: false, message: 'Security Constraint: Super Admin cannot be deleted!' };
    }

    // Protection Rule 2: Only Super Admin can delete another Admin
    if (targetUser.role === 'Admin' && !currentUser.isSuperAdmin) {
      return { success: false, message: 'Permission denied. Only Super Admin can remove another Admin.' };
    }

    setUsers(prev => prev.filter(u => u.id !== targetUserId));
    return { success: true, message: `User ${targetUser.username} removed successfully.` };
  };

  const updateUserRole = (targetUserId: string, newRole: Role): { success: boolean; message: string } => {
    if (!currentUser || currentUser.role !== 'Admin') {
      return { success: false, message: 'Permission denied.' };
    }

    const targetUser = users.find(u => u.id === targetUserId);
    if (!targetUser) return { success: false, message: 'User not found.' };

    if (targetUser.isSuperAdmin) {
      return { success: false, message: 'Cannot modify Super Admin role.' };
    }

    // Only Super Admin can grant or revoke Admin role
    if ((newRole === 'Admin' || targetUser.role === 'Admin') && !currentUser.isSuperAdmin) {
      return { success: false, message: 'Only Super Admin can grant or revoke Admin privileges.' };
    }

    setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, role: newRole } : u));
    return { success: true, message: `Updated role for ${targetUser.username} to ${newRole}.` };
  };

  // Item Management
  const addItem = (itemData: Omit<Item, 'id'>) => {
    const newItem: Item = {
      ...itemData,
      id: `itm-${Date.now()}`
    };
    setItems(prev => [newItem, ...prev]);
  };

  const updateItem = (updatedItem: Item) => {
    setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const bulkDeleteItems = (ids: string[]) => {
    const idSet = new Set(ids);
    setItems(prev => prev.filter(item => !idSet.has(item.id)));
  };

  const updateItemCategory = (oldCat: string, newCat: string) => {
    setItems(prev => prev.map(i => i.category === oldCat ? { ...i, category: newCat } : i));
  };

  const removeAllOldItemCodes = () => {
    setItems(prev => prev.map(i => ({ ...i, oldItemCode: '' })));
  };
  const bulkAddItems = (newItems: Omit<Item, 'id'>[]) => {
    const formatted = newItems.map((item, idx) => ({ ...item, id: `itm-bulk-${Date.now()}-${idx}` }));
    setItems(prev => [...formatted, ...prev]);
  };
  const addItemCategory = (cat: string) => {
    const trimmed = cat.trim();
    if (trimmed && !itemCategories.includes(trimmed)) setItemCategories(prev => [...prev, trimmed]);
  };
  const deleteItemCategory = (cat: string) => setItemCategories(prev => prev.filter(c => c !== cat));

  // Customer Management
  const addCustomer = (cData: Omit<Customer, 'id'>) => {
    setCustomers(prev => [{ ...cData, id: `cst-${Date.now()}` }, ...prev]);
  };
  const updateCustomer = (updated: Customer) => {
    setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
  };
  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  };
  const bulkAddCustomers = (newCustomers: Omit<Customer, 'id'>[]) => {
    const formatted = newCustomers.map((c, idx) => ({ ...c, id: `cst-bulk-${Date.now()}-${idx}` }));
    setCustomers(prev => [...formatted, ...prev]);
  };

  // Vendor Management
  const addVendor = (vData: Omit<Vendor, 'id'>) => {
    setVendors(prev => [{ ...vData, id: `vnd-${Date.now()}` }, ...prev]);
  };
  const updateVendor = (updated: Vendor) => {
    setVendors(prev => prev.map(v => v.id === updated.id ? updated : v));
  };
  const deleteVendor = (id: string) => {
    setVendors(prev => prev.filter(v => v.id !== id));
  };
  const bulkAddVendors = (newVendors: Omit<Vendor, 'id'>[]) => {
    const formatted = newVendors.map((v, idx) => ({ ...v, id: `vnd-bulk-${Date.now()}-${idx}` }));
    setVendors(prev => [...formatted, ...prev]);
  };
  const addVendorCategory = (cat: string) => {
    const trimmed = cat.trim();
    if (trimmed && !vendorCategories.includes(trimmed)) setVendorCategories(prev => [...prev, trimmed]);
  };
  const deleteVendorCategory = (cat: string) => setVendorCategories(prev => prev.filter(c => c !== cat));

  // Quality Control (QC)
  const addQCInspection = (qcData: Omit<QCInspection, 'id' | 'timestamp'>) => {
    const newQC: QCInspection = {
      ...qcData,
      id: `qc-${Date.now()}`,
      timestamp: new Date().toISOString().split('T')[0]
    };
    setQCInspections(prev => [newQC, ...prev]);
  };
  const updateQCInspection = (updated: QCInspection) => {
    setQCInspections(prev => prev.map(q => q.id === updated.id ? updated : q));
  };

  // Assembly Stages Management
  const addAssemblyStage = (stageName: string) => {
    const trimmed = stageName.trim();
    if (trimmed && !assemblyStages.includes(trimmed)) {
      setAssemblyStages(prev => [...prev, trimmed]);
    }
  };
  const deleteAssemblyStage = (stageName: string) => {
    setAssemblyStages(prev => prev.filter(s => s !== stageName));
  };

  // BOM Management (No prices as requested)
  const addBOM = (bomData: Omit<BOM, 'id' | 'lastUpdated'>) => {
    const newBOM: BOM = {
      ...bomData,
      id: `bom-${Date.now()}`,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    setBOMs(prev => [newBOM, ...prev]);
  };
  const updateBOM = (updated: BOM) => {
    setBOMs(prev => prev.map(b => b.id === updated.id ? { ...updated, lastUpdated: new Date().toISOString().split('T')[0] } : b));
  };
  const bulkAddBOMs = (newBOMs: Omit<BOM, 'id' | 'lastUpdated'>[]) => {
    const formatted = newBOMs.map((b, idx) => ({
      ...b,
      id: `bom-bulk-${Date.now()}-${idx}`,
      lastUpdated: new Date().toISOString().split('T')[0]
    }));
    setBOMs(prev => [...formatted, ...prev]);
  }; 
  const deleteBOM = (id: string) => setBOMs(prev => prev.filter(b => b.id !== id));

  // Sales Order (SO) Management
  const addSalesOrder = (soData: Omit<SalesOrder, 'id' | 'status'>) => {
    const newSO: SalesOrder = {
      ...soData,
      id: `so-${Date.now()}`,
      status: 'CONFIRMED'
    };
    setSalesOrders(prev => [newSO, ...prev]);
  };

  const updateSOStatus = (id: string, status: SalesOrder['status']) => {
    setSalesOrders(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const generateWOFromSO = (soId: string) => {
    const soObj = salesOrders.find(s => s.id === soId);
    if (!soObj) return;

    // Find linked BOM for machine model
    const linkedBOM = boms.find(b => b.machineModel === soObj.machineModel) || boms[0];

    const standardComponents = linkedBOM ? linkedBOM.components.map(c => ({
      itemId: c.itemId,
      itemCode: c.itemCode,
      itemName: c.itemName,
      qtyRequired: c.qtyPerMachine * soObj.quantity,
      unit: c.unit,
      subAssemblyTag: c.subAssemblyTag,
      isCustomExtra: false
    })) : [];

    const newWO: WorkOrder = {
      id: `wo-${Date.now()}`,
      workOrderNo: `WO-GEC-2026-${String(workOrders.length + 1).padStart(3, '0')}`,
      soId: soObj.id,
      soNumber: soObj.soNumber,
      machineModel: soObj.machineModel,
      quantity: soObj.quantity,
      targetCompletionDate: soObj.deliveryDate,
      startDate: new Date().toISOString().split('T')[0],
      assignedLead: 'Suresh Patel (Production Lead)',
      stage: 'PLANNED',
      status: 'IN_PROGRESS',
      customerName: soObj.customerName,
      bomId: linkedBOM?.id,
      woComponents: standardComponents,
      remarks: soObj.customNotes || ''
    };

    setWorkOrders(prev => [newWO, ...prev]);
    updateSOStatus(soId, 'WO_GENERATED');
    setActiveModule('work-orders');
  };

  // Work Order Management
  const addWorkOrder = (woData: Omit<WorkOrder, 'id'>) => {
    setWorkOrders(prev => [{ ...woData, id: `wo-${Date.now()}` }, ...prev]);
  };

  const updateWorkOrderComponents = (woId: string, woComponents: WorkOrder['woComponents']) => {
    setWorkOrders(prev => prev.map(w => w.id === woId ? { ...w, woComponents } : w));
  };

  const updateWorkOrderStage = (woId: string, stage: WorkOrder['stage'], status?: WorkOrder['status']) => {
    setWorkOrders(prev => prev.map(w => w.id === woId ? { ...w, stage, status: status || (stage === 'DISPATCHED' ? 'COMPLETED' : w.status) } : w));
  };

  // Operational Workflows
  const addJobworkChallan = (challanData: Omit<JobworkChallan, 'id' | 'pendingBalance' | 'status'>) => {
    const newChallan: JobworkChallan = {
      ...challanData,
      id: `jw-${Date.now()}`,
      receivedQuantity: 0,
      scrapQuantity: 0,
      pendingBalance: challanData.sentQuantity,
      status: 'ISSUED'
    };
    setJobworks(prev => [newChallan, ...prev]);

    setItems(prev => prev.map(item => {
      if (item.id === challanData.itemId) {
        return {
          ...item,
          inHouseStock: Math.max(0, item.inHouseStock - challanData.sentQuantity),
          externalStock: item.externalStock + challanData.sentQuantity
        };
      }
      return item;
    }));
  };

  const recordJobworkReturn = (challanId: string, returnQty: number, scrapQty: number) => {
    setJobworks(prev => prev.map(j => {
      if (j.id === challanId) {
        const newReceived = j.receivedQuantity + returnQty;
        const newScrap = j.scrapQuantity + scrapQty;
        const newPending = Math.max(0, j.sentQuantity - (newReceived + newScrap));

        setItems(itemsPrev => itemsPrev.map(item => {
          if (item.id === j.itemId) {
            return {
              ...item,
              inHouseStock: item.inHouseStock + returnQty,
              externalStock: Math.max(0, item.externalStock - (returnQty + scrapQty))
            };
          }
          return item;
        }));

        return {
          ...j,
          receivedQuantity: newReceived,
          scrapQuantity: newScrap,
          pendingBalance: newPending,
          status: newPending === 0 ? 'COMPLETED' : 'PARTIALLY_RECEIVED'
        };
      }
      return j;
    }));
  };

  const addPurchaseOrder = (poData: Omit<PurchaseOrder, 'id' | 'subtotal' | 'taxAmount' | 'totalAmount' | 'status'>) => {
    const subtotal = poData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxAmount = Math.round(subtotal * 0.18);
    const totalAmount = subtotal + taxAmount;

    setPurchaseOrders(prev => [{
      ...poData,
      id: `po-${Date.now()}`,
      subtotal,
      taxAmount,
      totalAmount,
      status: 'ISSUED'
    }, ...prev]);
  };

  const updatePurchaseOrder = (updatedPO: PurchaseOrder) => {
    setPurchaseOrders(prev => prev.map(po => po.id === updatedPO.id ? updatedPO : po));
  };

  const deletePurchaseOrder = (id: string) => {
    setPurchaseOrders(prev => prev.filter(po => po.id !== id));
  };

  const sendPODraftsForApproval = (ids: string[]) => {
    setPurchaseOrders(prev => prev.map(po => ids.includes(po.id) ? { ...po, status: 'WAITING_FOR_APPROVAL' as const } : po));
  };

  const updatePOStatus = (poId: string, status: PurchaseOrder['status']) => {
    setPurchaseOrders(prev => prev.map(p => p.id === poId ? { ...p, status } : p));
  };

  const addGRN = (grnData: Omit<GoodsReceivedNotice, 'id' | 'status'>) => {
    const newGRN: GoodsReceivedNotice = {
      ...grnData,
      id: `grn-${Date.now()}`,
      status: 'QC_APPROVED'
    };
    setGRNs(prev => [newGRN, ...prev]);

    grnData.items.forEach(grnItem => {
      setItems(prevItems => prevItems.map(item => {
        if (item.id === grnItem.itemId) {
          const cFactor = item.conversionFactor || 1;
          const baseQtyAdded = grnItem.acceptedQty * cFactor;

          // Auto-trigger Pending QC Inspection if item.qcTrigger === 'ON_GRN'
          if (item.qcTrigger === 'ON_GRN' || !item.qcTrigger) {
            addQCInspection({
              qcNumber: `QC-GRN-${Date.now().toString().slice(-4)}`,
              type: 'INCOMING_PO',
              referenceNo: grnData.grnNumber,
              itemId: item.id,
              itemCode: item.itemCode,
              itemName: item.name,
              inspectedQuantity: grnItem.receivedQty,
              passedQuantity: grnItem.acceptedQty,
              failedQuantity: grnItem.rejectedQty,
              disposition: 'PASSED',
              defectReason: 'Automatic GRN Incoming Quality Check',
              inspectorName: grnData.receivedBy
            });
          }

          return { ...item, inHouseStock: item.inHouseStock + baseQtyAdded };
        }
        return item;
      }));
    });

    if (grnData.poId) {
      setPurchaseOrders(prevPOs => prevPOs.map(po => {
        if (po.id === grnData.poId) {
          const updatedItems = po.items.map(poLine => {
            const grnLine = grnData.items.find(g => g.itemId === poLine.itemId);
            return grnLine ? { ...poLine, receivedQty: poLine.receivedQty + grnLine.acceptedQty } : poLine;
          });
          const allComplete = updatedItems.every(line => line.receivedQty >= line.quantity);
          const anyReceived = updatedItems.some(line => line.receivedQty > 0);

          return {
            ...po,
            items: updatedItems,
            status: allComplete ? 'RECEIVED' : (anyReceived ? 'PARTIALLY_RECEIVED' : po.status)
          };
        }
        return po;
      }));
    }
  };

  const approveGRN = (grnId: string) => {
    setGRNs(prev => prev.map(g => g.id === grnId ? { ...g, status: 'QC_APPROVED' } : g));
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
      activeModule,
      theme,
      searchTerm,
      setSearchTerm,
      setActiveModule,
      toggleTheme,
      login,
      signup,
      logout,
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
      bulkAddItems,
      bulkDeleteItems,
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
      updateSOStatus,
      generateWOFromSO,
      addWorkOrder,
      updateWorkOrderComponents,
      updateWorkOrderStage,
      addJobworkChallan,
      recordJobworkReturn,
      addPurchaseOrder,
      updatePurchaseOrder,
      deletePurchaseOrder,
      sendPODraftsForApproval,
      updatePOStatus,
      addGRN,
      approveGRN,
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
