import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { MASTER_FEATURES_HIERARCHY, getCategoryKeys, getChildKeys, getParentKey } from './features';
import {
  Wrench,
  Factory,
  ShoppingCart,
  Box,
  Shield,
  Users,
  Bell,
  CheckCircle,
  Building,
  Key,
  Layers,
  X,
  LogOut,
  Phone,
  Lock,
  User,
  Mail,
  BarChart3,
  AlertCircle,
  Clock,
  Briefcase,
  DollarSign,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Settings,
  Sun,
  Moon,
  Plus,
  Activity,
  MessageSquare,
  ArrowLeft,
  UserPlus,
  Send,
  Wallet,
  BookOpen,
  Percent,
  Folder,
  Database,
  Package,
  Ruler,
  Tag,
  Sliders,
  Truck,
  UserCircle,
  Receipt,
  Warehouse
} from 'lucide-react';

import GeneralAdmin from './components/GeneralAdmin';
import ProductMasterUI from './components/masters/ProductMasterUI';
import CustomerMasterUI from './components/masters/CustomerMasterUI';
import VendorMasterUI from './components/masters/VendorMasterUI';
import EmployeeMasterUI from './components/masters/EmployeeMasterUI';
import WarehouseMasterUI from './components/masters/WarehouseMasterUI';
import FinanceMastersUI from './components/masters/FinanceMastersUI';
import ClassificationMastersUI from './components/masters/ClassificationMastersUI';
import FinanceAccounting from './components/FinanceAccounting';
import CustomDashboard from './components/CustomDashboard';
import InventoryWarehouse from './components/InventoryWarehouse';
import PurchaseProcurement from './components/PurchaseProcurement';
import SalesOrder from './components/SalesOrder';
import ManufacturingProduction from './components/ManufacturingProduction';
import QualityMaintenance from './components/QualityMaintenance';
import GlobalEmailSystem from './components/GlobalEmailSystem';
import CrmModule from './components/CrmModule';
import HumanResources from './components/HumanResources';
import { apiClient } from './utils/apiService';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://erp.anbindustries.com';

interface UserProfile {
  id?: string;
  username: string;
  companyCode: string;
  companyName?: string;
  role: string | null;
  isSuperAdmin: boolean;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: string;
  isRead: boolean;
  createdAt: string;
}

export default function App() {
  // --- CORE SYSTEM STATES ---
  const [token, setToken] = useState<string | null>(localStorage.getItem('erp_token'));
  const [user, setUser] = useState<UserProfile | null>(
    localStorage.getItem('erp_user') ? JSON.parse(localStorage.getItem('erp_user')!) : null
  );
  const [view, setView] = useState<'login' | 'signup' | 'super_admin' | 'company_admin' | 'user_workspace'>('login');
  
  // Stateful Dark/Light theme manager
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const localTheme = localStorage.getItem('erp_theme');
    return (localTheme === 'light' || localTheme === 'dark') ? localTheme : 'dark';
  });

  // Expandable Category Sidebar States
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    crm: true,
    hr: true,
    finance: true,
    master_data: true,
    admin: true,
    alerts: true
  });

  // Profile modal and dropdown toggles
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Real-time socket reference
  const socketRef = useRef<Socket | null>(null);
  
  // Notification states
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeToast, setActiveToast] = useState<{ title: string; message: string } | null>(null);

  // --- COMPONENT DATA STATES ---
  const [companies, setCompanies] = useState<any[]>([]); // Super Admin company list
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null); // Super Admin focused tenant profile
  const [selectedCompanyUsers, setSelectedCompanyUsers] = useState<any[]>([]); // Super Admin focused tenant's users list
  
  const [pendingUsers, setPendingUsers] = useState<any[]>([]); // Company Admin approvals list
  const [companyUsers, setCompanyUsers] = useState<any[]>([]); // Company Admin employees list
  const [companyRoles, setCompanyRoles] = useState<any[]>([]); // Company Admin roles definitions
  const [companyFeatures, setCompanyFeatures] = useState<string[]>([]); // Mapped workspace modules
  const [activeWorkspaceModule, setActiveWorkspaceModule] = useState<string>('dashboard');
  const [activeWorkspaceSubModule, setActiveWorkspaceSubModule] = useState<string>('');

  // --- WORKSPACE SUB-TAB STATES ---
  const [crmSubTab, setCrmSubTab] = useState<'leads' | 'customer_logs'>('leads');
  const [hrSubTab, setHrSubTab] = useState<'roster' | 'attendance'>('roster');
  const [alertsSubTab, setAlertsSubTab] = useState<'alerts' | 'audit_logs'>('alerts');

  // --- WORKSPACE DEEP-LINK TAB STATES ---
  const [adminTab, setAdminTab] = useState<string>('profile');
  const [adminOrgSubTab, setAdminOrgSubTab] = useState<string>('dept_crud');
  const [mdmMaster, setMdmMaster] = useState<string>('product');
  const [financeDeepTab, setFinanceDeepTab] = useState<string>('general_ledger');
  const [financeDeepSubTab, setFinanceDeepSubTab] = useState<string>('');

  const [workspaceStats, setWorkspaceStats] = useState({
    totalCompanyExpense: 0,
    individualNetSum: 0,
    individualTotalExpense: 0
  });

  // --- HIGH-FIDELITY MOCK WORKSPACE DATA STATES ---
  const [customerLogs, setCustomerLogs] = useState([
    { id: "3920", customer: "Robert Vance", details: "Initial onboarding consultation & portal setup", medium: "In-Person", status: "RESOLVED", duration: "45m 00s", time: "11:20 AM" },
    { id: "3891", customer: "Hellen Carter", details: "Inquired about payroll report exporting mechanisms", medium: "Email", status: "IN_PROGRESS", duration: "12m 30s", time: "09:15 AM" }
  ]);

  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [attendanceLogs, setAttendanceLogs] = useState([
    { id: "1", username: "Corporate Admin", checkIn: "09:00:15 AM", checkOut: "05:15:30 PM", duration: "8.25 hrs", status: "OFF_DUTY" },
    { id: "2", username: "Super Admin", checkIn: "08:45:00 AM", checkOut: "05:00:00 PM", duration: "8.25 hrs", status: "OFF_DUTY" }
  ]);

  const [auditLogs, setAuditLogs] = useState([
    { id: "1", time: "2026-05-22 14:15", actor: "superadmin", action: "Tenant 'Dine-In/ERP' features mapping updated", status: "SUCCESS" },
    { id: "2", time: "2026-05-22 12:30", actor: "corpadmin", action: "Role 'Store Manager' permissions redefined", status: "SUCCESS" },
    { id: "3", time: "2026-05-22 10:45", actor: "superadmin", action: "SUSPENDED tenant 'Legacy Corp'", status: "WARNING" }
  ]);

  // Sync sub-tabs automatically based on tenant licenses
  useEffect(() => {
    if (companyFeatures.length > 0) {
      if (!companyFeatures.includes('CRM_LEADS') && companyFeatures.includes('CRM_CUSTOMER')) {
        setCrmSubTab('customer_logs');
      } else {
        setCrmSubTab('leads');
      }

      if (!companyFeatures.includes('HR_ROSTER') && companyFeatures.includes('HR_ATTENDANCE')) {
        setHrSubTab('attendance');
      } else {
        setHrSubTab('roster');
      }

      if (!companyFeatures.includes('FINANCE_LEDGER') && companyFeatures.includes('FINANCE_INVOICING')) {
        setFinanceDeepTab('subledgers');
      } else {
        setFinanceDeepTab('general_ledger');
      }

      if (!companyFeatures.includes('NOTIFICATIONS_PUSH') && companyFeatures.includes('NOTIFICATIONS_AUDIT')) {
        setAlertsSubTab('audit_logs');
      } else {
        setAlertsSubTab('alerts');
      }
    }
  }, [companyFeatures]);

  // --- FORM STATES ---
  // Login Form
  const [loginForm, setLoginForm] = useState({ companyCode: '', username: '', password: '' });
  // Signup Workflow Forms
  const [signupStep, setSignupStep] = useState<1 | 2 | 3>(1); // 1 = Details, 2 = OTP, 3 = Pending Approval
  const [signupForm, setSignupForm] = useState({
    companyCode: '',
    username: '',
    password: '',
    mobileNo: '',
    email: '',
    otpCode: ''
  });
  // Create Company Form (Super Admin) - using custom feature list checkbox switches instead of presets
  const [newCompany, setNewCompany] = useState({
    companyCode: '',
    name: '',
    features: ['NOTIFICATIONS'] as string[],
    adminUsername: '',
    adminMobile: '',
    adminPassword: ''
  });

  // Add Corporate Admin Form (Super Admin nested inside Company Profile view)
  const [newCompanyAdmin, setNewCompanyAdmin] = useState({
    username: '',
    mobileNo: '',
    password: '',
    email: ''
  });

  // Create Role Form (Company Admin)
  const [newRole, setNewRole] = useState({
    name: '',
    permissions: {
      CRM: [] as string[],
      HR: [] as string[],
      FINANCE: [] as string[]
    }
  });

  // UI status overlays
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [approveSelectedRole, setApproveSelectedRole] = useState<Record<string, string>>({}); // Maps pending userId to roleId

  // --- PLATFORM STATUS & ADVANCED EDIT MODAL STATES ---
  const [showPlatformStatusModal, setShowPlatformStatusModal] = useState(false);
  
  // Edit Company Profile Modal
  const [showEditCompanyModal, setShowEditCompanyModal] = useState(false);
  const [editCompanyForm, setEditCompanyForm] = useState({
    name: '',
    companyCode: '',
    createdAt: ''
  });

  // Edit Tenant User/Admin Modal
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
    const [featureSearchTerm, setFeatureSearchTerm] = useState('');
    const [expandedFeatureCategories, setExpandedFeatureCategories] = useState<string[]>([]);
  
  const toggleCategoryAccordion = (key: string) => {
    setExpandedFeatureCategories(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };
  
  const filteredHierarchy = MASTER_FEATURES_HIERARCHY.map(cat => {
    const term = featureSearchTerm.toLowerCase();
    const matchCat = cat.name.toLowerCase().includes(term) || cat.desc.toLowerCase().includes(term);
    const matchChildren = cat.children.filter(c => c.name.toLowerCase().includes(term) || c.desc.toLowerCase().includes(term));
    if (term && (matchCat || matchChildren.length > 0)) {
      return { ...cat, children: matchCat ? cat.children : matchChildren, isMatch: true };
    } else if (!term) {
      return { ...cat, isMatch: false };
    }
    return null;
  }).filter(Boolean);

  const handleEnableAllNewCompany = () => {
    const all = MASTER_FEATURES_HIERARCHY.flatMap(cat => [cat.key, ...cat.children.map(c => c.key)]);
    setNewCompany({ ...newCompany, features: all });
  };

  const handleEnableCategoryAllNewCompany = (catKey: string) => {
    const cat = MASTER_FEATURES_HIERARCHY.find(c => c.key === catKey);
    if (!cat) return;
    const toAdd = [cat.key, ...cat.children.map(c => c.key)];
    const updated = [...new Set([...newCompany.features, ...toAdd])];
    setNewCompany({ ...newCompany, features: updated });
  };

  const handleEnableAllCompany = async () => {
    if (!selectedCompany) return;
    const all = MASTER_FEATURES_HIERARCHY.flatMap(cat => [cat.key, ...cat.children.map(c => c.key)]);
    try {
      await apiRequest(`/api/super/company/${selectedCompany.id}`, 'PATCH', { features: all });
      fetchSuperAdminData();
    } catch (e) {}
  };

  const handleEnableCategoryAllCompany = async (catKey: string) => {
    if (!selectedCompany) return;
    const cat = MASTER_FEATURES_HIERARCHY.find(c => c.key === catKey);
    if (!cat) return;
    const current = selectedCompany.features.map((f: any) => f.feature.key);
    const toAdd = [cat.key, ...cat.children.map(c => c.key)];
    const updated = [...new Set([...current, ...toAdd])];
    try {
      await apiRequest(`/api/super/company/${selectedCompany.id}`, 'PATCH', { features: updated });
      fetchSuperAdminData();
    } catch (e) {}
  };

  const [editUserForm, setEditUserForm] = useState({
    username: '',
    password: '',
    mobileNo: '',
    email: '',
    status: 'ACTIVE' as 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED'
  });

  // --- COLLAPSIBLE SIDEBAR & POPOVER STATES ---
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activePopoverCategory, setActivePopoverCategory] = useState<string | null>(null);

  // --- FLOATING CHAT DRAWER STATES ---
  const [showChatDrawer, setShowChatDrawer] = useState(false);
  const [showAlertsPopup, setShowAlertsPopup] = useState(false);
  const [colleagueSearch, setColleagueSearch] = useState('');
  const [chatActiveView, setChatActiveView] = useState<'list' | 'room' | 'ledger'>('list');
  const [chatGroups, setChatGroups] = useState<any[]>([]);
  const [selectedChatGroup, setSelectedChatGroup] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatMessageInput, setChatMessageInput] = useState('');
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState<'GENERAL' | 'EXPENSE'>('GENERAL');
  const [newGroupIsPrivate, setNewGroupIsPrivate] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expensePaidBy, setExpensePaidBy] = useState('');
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [paymentFrom, setPaymentFrom] = useState('');
  const [paymentTo, setPaymentTo] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showGroupSettingsModal, setShowGroupSettingsModal] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleAuthExpired = () => {
      setToken(null);
      setUser(null);
      setView('login');
      setErrorMsg('Session expired. Please log in again.');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('auth-expired', handleAuthExpired);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('auth-expired', handleAuthExpired);
    };
  }, []);

  // Refs for tracking active group and auto-scrolling
  const selectedGroupIdRef = useRef<string | null>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setActivePopoverCategory(null);
        setShowProfileDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    selectedGroupIdRef.current = selectedChatGroup?.id || null;
  }, [selectedChatGroup]);

  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // ==========================================
  // 1. INITIALIZATION & SOCKETS
  // ==========================================

  useEffect(() => {
    // Synchronize HTML color-scheme class dynamically
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    localStorage.setItem('erp_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (token && user) {
      if (user.isSuperAdmin) {
        setView('super_admin');
        fetchSuperAdminData();
      } else if (user.role === 'Admin') {
        setView('company_admin');
        fetchCompanyAdminData();
      } else {
        setView('user_workspace');
        fetchUserWorkspaceData();
      }
      
      connectWebSockets();
      fetchNotifications();
      fetchWorkspaceStats();
    } else {
      setView('login');
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token]);

  const fetchChatGroups = async () => {
    if (!localStorage.getItem('erp_token')) return;
    try {
      const groups = await apiRequest('/api/chat/groups', 'GET');
      setChatGroups(groups || []);
    } catch (e) {
      console.error("Error fetching chat groups:", e);
    }
  };

  const connectWebSockets = () => {
    if (!user || !user.id) return;
    
    socketRef.current = io(BACKEND_URL, {
      transports: ['websocket'],
      upgrade: false,
      secure: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });
    
    socketRef.current.on('connect', () => {
      console.log('🔌 Connected to real-time notification socket.');
      socketRef.current?.emit('join', user.id);
      
      // Auto fetch chat rooms on connection
      fetchChatGroups();
      fetchWorkspaceStats();
    });

    socketRef.current.on('notification', (newNotification: NotificationItem) => {
      console.log('📡 Real-time notification dispatched:', newNotification);
      setNotifications(prev => [newNotification, ...prev]);
      
      setActiveToast({ title: newNotification.title, message: newNotification.message });
      setTimeout(() => setActiveToast(null), 5000);

      // Refresh corresponding metrics
      if (user.isSuperAdmin) {
        fetchSuperAdminData();
      } else if (user.role === 'Admin') {
        fetchCompanyAdminData();
        fetchWorkspaceStats();
      } else {
        fetchUserWorkspaceData();
        fetchWorkspaceStats();
      }
    });

    // Real-time chat messages channel
    socketRef.current.on('new_chat_message', (newMessage: any) => {
      console.log('💬 Real-time chat message received:', newMessage);
      if (selectedGroupIdRef.current === newMessage.groupId) {
        setChatMessages(prev => {
          if (prev.some(m => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
      }
      fetchChatGroups();
      if (newMessage.type === 'EXPENSE') {
        fetchWorkspaceStats();
      }
    });

    // Real-time group space metadata sync
    socketRef.current.on('group_created', (newGroup: any) => {
      console.log('📣 Chat space metadata updated:', newGroup);
      setChatGroups(prev => {
        if (prev.some(g => g.id === newGroup.id)) {
          return prev.map(g => g.id === newGroup.id ? newGroup : g);
        }
        return [newGroup, ...prev];
      });
    });

    // Real-time direct message alert toast
    socketRef.current.on('dm_incoming_notification', (notif: any) => {
      // Pop a nice toast alert for incoming DM if chat drawer is closed or another space is active
      if (!showChatDrawer || selectedGroupIdRef.current !== notif.groupId) {
        setActiveToast({
          title: `Message from ${notif.senderName}`,
          message: notif.message
        });
        setTimeout(() => setActiveToast(null), 5000);
      }
      fetchChatGroups();
    });
  };

  // ==========================================
  // 2. HTTP API REQUEST AGENT
  // ==========================================
  
  const apiRequest = async (url: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET', body?: any): Promise<any> => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      let data;
      if (method === 'GET') {
        data = await apiClient.get<any>(url);
      } else if (method === 'POST') {
        data = await apiClient.post<any>(url, body);
      } else if (method === 'PATCH') {
        data = await apiClient.patch<any>(url, body);
      } else if (method === 'DELETE') {
        data = await apiClient.delete<any>(url);
      }
      setLoading(false);
      return data;
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.message);
      throw err;
    }
  };

  const fetchWorkspaceStats = async () => {
    if (!token) return;
    try {
      const data = await apiRequest('/api/chat/stats', 'GET');
      if (data) {
        setWorkspaceStats({
          totalCompanyExpense: data.totalCompanyExpense || 0,
          individualNetSum: data.individualNetSum || 0,
          individualTotalExpense: data.individualTotalExpense || 0
        });
      }
    } catch (e) {
      console.error("Error fetching workspace stats:", e);
    }
  };

  // ==========================================
  // 3. SERVICE API ACTIONS
  // ==========================================

  const triggerOtpRequest = async () => {
    if (!signupForm.mobileNo) {
      setErrorMsg("Please enter your mobile number to send OTP.");
      return;
    }
    try {
      await apiRequest('/api/auth/otp-request', 'POST', { mobileNo: signupForm.mobileNo });
      setSuccessMsg("SMS OTP simulated! Check the backend server console log for your 6-digit code.");
      setSignupStep(2);
    } catch (e) {}
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await apiRequest('/api/auth/signup', 'POST', signupForm);
      setSuccessMsg(data.message);
      setSignupStep(3);
    } catch (e) {}
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await apiRequest('/api/auth/login', 'POST', loginForm);
      localStorage.setItem('erp_token', data.token);
      localStorage.setItem('erp_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setSuccessMsg(data.message);
    } catch (e) {}
  };

  const handleLogout = () => {
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    setToken(null);
    setUser(null);
    setNotifications([]);
    setView('login');
    setSelectedCompany(null);
    setSelectedCompanyUsers([]);
    setShowProfileDropdown(false);
  };

  const fetchNotifications = async () => {
    try {
      const data = await apiRequest('/api/notifications', 'GET');
      setNotifications(data.notifications);
    } catch (e) {}
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await apiRequest(`/api/notifications/${id}/read`, 'PATCH');
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (e) {}
  };

  // --- SUPER ADMIN PORTAL ACTIONS ---
  const fetchSuperAdminData = async () => {
    try {
      const data = await apiRequest('/api/super/companies', 'GET');
      setCompanies(data.companies);
      
      // If a company is currently selected, refresh its profile data & users list too
      if (selectedCompany) {
        const freshCompany = data.companies.find((c: any) => c.id === selectedCompany.id);
        if (freshCompany) {
          setSelectedCompany(freshCompany);
          fetchCompanyAdminsList(freshCompany.id);
        }
      }
    } catch (e) {}
  };

  const fetchCompanyAdminsList = async (companyId: string) => {
    try {
      const data = await apiRequest(`/api/super/company/${companyId}/users`, 'GET');
      setSelectedCompanyUsers(data.users);
    } catch (e) {}
  };

  const handleCreateCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCompany.features.length === 0) {
      setErrorMsg("Please enable at least one feature flag module.");
      return;
    }
    try {
      const companyName = newCompany.name;
      const companyCode = newCompany.companyCode;
      const data = await apiRequest('/api/super/company', 'POST', newCompany);
      setSuccessMsg(data.message);
      const newAudit = {
        id: String(auditLogs.length + 1),
        time: new Date().toISOString().replace('T', ' ').slice(0, 16),
        actor: 'superadmin',
        action: `Spawned new corporate tenant '${companyName}' (${companyCode})`,
        status: 'SUCCESS'
      };
      setAuditLogs(prev => [newAudit, ...prev]);
      setNewCompany({
        companyCode: '',
        name: '',
        features: ['NOTIFICATIONS'],
        adminUsername: '',
        adminMobile: '',
        adminPassword: ''
      });
      fetchSuperAdminData();
    } catch (e) {}
  };

  const handleSelectCompanyProfile = (company: any) => {
    setSelectedCompany(company);
    fetchCompanyAdminsList(company.id);
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleToggleCompanyFeatureHierarchical = async (featureKey: string) => {
    if (!selectedCompany) return;
    
    // Map current features
    let updatedFeatures: string[] = selectedCompany.features.map((f: any) => f.feature.key);
    const isCategory = getCategoryKeys().includes(featureKey);

    if (isCategory) {
      if (featureKey === 'NOTIFICATIONS') return; // Cannot disable notifications
      if (updatedFeatures.includes(featureKey)) {
        // Toggle off parent -> remove parent and all its children
        updatedFeatures = updatedFeatures.filter(k => k !== featureKey);
        const childKeys = getChildKeys(featureKey);
        updatedFeatures = updatedFeatures.filter(k => !childKeys.includes(k));
      } else {
        // Toggle on parent -> add category key
        updatedFeatures.push(featureKey);
      }
    } else {
      // Child toggle
      if (updatedFeatures.includes(featureKey)) {
        // Toggle off child
        updatedFeatures = updatedFeatures.filter(k => k !== featureKey);
      } else {
        // Toggle on child -> add child and auto-enable parent category
        updatedFeatures.push(featureKey);
        const parent = getParentKey(featureKey);
        if (parent && !updatedFeatures.includes(parent)) {
          updatedFeatures.push(parent);
        }
      }
    }

    try {
      await apiRequest(`/api/super/company/${selectedCompany.id}`, 'PATCH', {
        features: updatedFeatures
      });
      setSuccessMsg(`Features mapping updated successfully.`);
      fetchSuperAdminData();
    } catch (e) {}
  };

  const handleToggleNewCompanyFeatureHierarchical = (featureKey: string) => {
    let updated = [...newCompany.features];
    const isCategory = getCategoryKeys().includes(featureKey);

    if (isCategory) {
      if (featureKey === 'NOTIFICATIONS') return; // Enforced
      if (updated.includes(featureKey)) {
        // Toggle off parent -> remove parent and all its children
        updated = updated.filter(k => k !== featureKey);
        const childKeys = getChildKeys(featureKey);
        updated = updated.filter(k => !childKeys.includes(k));
      } else {
        // Toggle on parent
        updated.push(featureKey);
      }
    } else {
      // Child toggle
      if (updated.includes(featureKey)) {
        updated = updated.filter(k => k !== featureKey);
      } else {
        updated.push(featureKey);
        const parent = getParentKey(featureKey);
        if (parent && !updated.includes(parent)) {
          updated.push(parent);
        }
      }
    }
    setNewCompany({ ...newCompany, features: updated });
  };

  const handleEditCompanyProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    try {
      const joiningDate = new Date(editCompanyForm.createdAt);
      if (isNaN(joiningDate.getTime())) {
        setErrorMsg("Please enter a valid Joining Date.");
        return;
      }
      
      const payload = {
        name: editCompanyForm.name,
        companyCode: editCompanyForm.companyCode,
        createdAt: joiningDate.toISOString()
      };

      const data = await apiRequest(`/api/super/company/${selectedCompany.id}`, 'PATCH', payload);
      setSuccessMsg(data.message || "Company profile updated successfully.");
      setShowEditCompanyModal(false);
      fetchSuperAdminData();
    } catch (e) {}
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany || !editingUser) return;
    try {
      const payload: any = {
        username: editUserForm.username,
        mobileNo: editUserForm.mobileNo,
        email: editUserForm.email || undefined,
        status: editUserForm.status
      };
      if (editUserForm.password) {
        payload.password = editUserForm.password;
      }
      const data = await apiRequest(`/api/super/company/${selectedCompany.id}/users/${editingUser.id}`, 'PATCH', payload);
      setSuccessMsg(data.message || `User '${editUserForm.username}' updated successfully.`);
      setShowEditUserModal(false);
      setEditingUser(null);
      fetchCompanyAdminsList(selectedCompany.id);
    } catch (e) {}
  };

  const handleDeleteUser = async (userId: string) => {
    if (!selectedCompany) return;
    const confirmed = window.confirm("Are you sure you want to permanently delete this user? This action is irreversible.");
    if (!confirmed) return;
    try {
      const data = await apiRequest(`/api/super/company/${selectedCompany.id}/users/${userId}`, 'DELETE');
      setSuccessMsg(data.message || "User permanently deleted.");
      fetchCompanyAdminsList(selectedCompany.id);
    } catch (e) {}
  };

  const handleToggleCompanyStatus = async () => {
    if (!selectedCompany) return;
    const targetStatus = selectedCompany.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await apiRequest(`/api/super/company/${selectedCompany.id}`, 'PATCH', {
        status: targetStatus
      });
      setSuccessMsg(`Company tenant status modified to: ${targetStatus}.`);
      fetchSuperAdminData();
    } catch (e) {}
  };

  const handleCreateNewAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    try {
      const data = await apiRequest(`/api/super/company/${selectedCompany.id}/admins`, 'POST', newCompanyAdmin);
      setSuccessMsg(data.message);
      setNewCompanyAdmin({ username: '', mobileNo: '', password: '', email: '' });
      fetchCompanyAdminsList(selectedCompany.id);
      fetchSuperAdminData();
    } catch (e) {}
  };

  // Note: User activation, suspension, credentials, and full admin edit operations are handled by handleEditUserSubmit and handleDeleteUser

  // --- COMPANY ADMIN ACTIONS ---
  const fetchCompanyAdminData = async () => {
    try {
      const pendingData = await apiRequest('/api/admin/pending-signups', 'GET');
      setPendingUsers(pendingData.pendingUsers);

      const dashboardData = await apiRequest('/api/admin/dashboard', 'GET');
      setCompanyUsers(dashboardData.users);
      setCompanyRoles(dashboardData.roles);
      setCompanyFeatures(dashboardData.features);
    } catch (e) {}
  };

  const handleApproveUser = async (userId: string) => {
    const roleId = approveSelectedRole[userId];
    if (!roleId) {
      setErrorMsg("Please select a specific corporate role to assign.");
      return;
    }
    try {
      const data = await apiRequest('/api/admin/approve', 'POST', { userId, roleId });
      setSuccessMsg(data.message);
      setApproveSelectedRole(prev => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });
      fetchCompanyAdminData();
    } catch (e) {}
  };

  const handleCreateRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole.name) {
      setErrorMsg("Please enter a custom role title.");
      return;
    }
    try {
      const data = await apiRequest('/api/admin/role', 'POST', newRole);
      setSuccessMsg(data.message);
      setNewRole({
        name: '',
        permissions: { CRM: [], HR: [], FINANCE: [] }
      });
      fetchCompanyAdminData();
    } catch (e) {}
  };

  const togglePermission = (module: 'CRM' | 'HR' | 'FINANCE', action: string) => {
    setNewRole(prev => {
      const actions = prev.permissions[module];
      const updated = actions.includes(action)
        ? actions.filter(a => a !== action)
        : [...actions, action];
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [module]: updated
        }
      };
    });
  };

  // --- STANDARD USER WORKSPACE ACTIONS ---
  const fetchUserWorkspaceData = async () => {
    try {
      const dashboardData = await apiRequest('/api/admin/dashboard', 'GET');
      setCompanyFeatures(dashboardData.features || []);
      setCompanyUsers(dashboardData.users || []);
      setCompanyRoles(dashboardData.roles || []);
    } catch (e) {}
  };

  const toggleSidebarCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // --- REAL-TIME ENTERPRISE CHAT & EXPENSE ACTIONS ---

  const handleSelectChatGroup = async (group: any) => {
    if (selectedChatGroup && socketRef.current) {
      socketRef.current.emit('leave_group', selectedChatGroup.id);
    }
    
    setSelectedChatGroup(group);
    setChatActiveView('room');
    setChatMessages([]);
    
    if (socketRef.current) {
      socketRef.current.emit('join_group', group.id);
    }

    try {
      const messages = await apiRequest(`/api/chat/group/${group.id}/messages`, 'GET');
      setChatMessages(messages || []);
    } catch (e) {
      console.error("Error fetching chat messages:", e);
    }
  };

  const handleSendChatMessage = async () => {
    if (!selectedChatGroup || !chatMessageInput.trim()) return;
    const body = {
      message: chatMessageInput.trim(),
      type: 'TEXT'
    };
    setChatMessageInput('');
    try {
      await apiRequest(`/api/chat/group/${selectedChatGroup.id}/message`, 'POST', body);
    } catch (e) {
      console.error("Error sending message:", e);
    }
  };

  const handleCreateChatGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      setErrorMsg("Please provide a group name");
      return;
    }
    const body = {
      name: newGroupName.trim(),
      type: newGroupType,
      settings: JSON.stringify({ isPrivate: newGroupIsPrivate })
    };
    try {
      const createdGroup = await apiRequest('/api/chat/group', 'POST', body);
      setSuccessMsg(`Group "${createdGroup.name}" created successfully!`);
      setShowCreateGroupModal(false);
      setNewGroupName('');
      setNewGroupIsPrivate(false);
      handleSelectChatGroup(createdGroup);
    } catch (e) {
      console.error("Error creating chat group:", e);
    }
  };

  const handleStartDM = async (recipientId: string) => {
    try {
      const dmGroup = await apiRequest('/api/chat/group', 'POST', {
        type: 'DIRECT',
        recipientId
      });
      handleSelectChatGroup(dmGroup);
      setChatActiveView('room');
    } catch (e) {
      console.error("Error starting DM:", e);
    }
  };

  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChatGroup || !expenseAmount || !expenseDescription.trim()) {
      setErrorMsg("Amount and description are required.");
      return;
    }

    const amt = parseFloat(expenseAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg("Please enter a valid positive amount.");
      return;
    }

    const members = selectedChatGroup.members || [];
    if (members.length === 0) {
      setErrorMsg("No members in this group to split the expense with.");
      return;
    }

    const share = parseFloat((amt / members.length).toFixed(2));
    const splits: Record<string, number> = {};
    members.forEach((m: any) => {
      splits[m.userId] = share;
    });

    const expenseData = {
      amount: amt,
      description: expenseDescription.trim(),
      paidBy: expensePaidBy || user?.id || '',
      splits
    };

    const body = {
      message: `Logged expense: "${expenseDescription.trim()}" of $${amt.toFixed(2)}`,
      type: 'EXPENSE',
      expenseData
    };

    try {
      await apiRequest(`/api/chat/group/${selectedChatGroup.id}/message`, 'POST', body);
      setSuccessMsg("Expense logged successfully!");
      setShowAddExpenseModal(false);
      setExpenseAmount('');
      setExpenseDescription('');
      setExpensePaidBy('');
      fetchWorkspaceStats();
    } catch (e) {
      console.error("Error logging expense:", e);
    }
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChatGroup || !paymentAmount || !paymentFrom || !paymentTo) {
      setErrorMsg("Payer, recipient, and amount are required.");
      return;
    }

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg("Please enter a valid positive amount.");
      return;
    }

    const expenseData = {
      amount: amt,
      from: paymentFrom,
      to: paymentTo
    };

    const members = selectedChatGroup.members || [];
    const payerName = members.find((m: any) => m.userId === paymentFrom)?.username || 'Someone';
    const recipientName = members.find((m: any) => m.userId === paymentTo)?.username || 'Someone';

    const body = {
      message: `Recorded payment: ${payerName} paid ${recipientName} $${amt.toFixed(2)}`,
      type: 'PAYMENT',
      expenseData
    };

    try {
      await apiRequest(`/api/chat/group/${selectedChatGroup.id}/message`, 'POST', body);
      setSuccessMsg("Payment recorded successfully!");
      setShowRecordPaymentModal(false);
      setPaymentAmount('');
      setPaymentFrom('');
      setPaymentTo('');
      fetchWorkspaceStats();
    } catch (e) {
      console.error("Error recording payment:", e);
    }
  };

  const handleManageGroupMember = async (targetUserId: string, action: 'ADD' | 'REMOVE') => {
    if (!selectedChatGroup) return;
    try {
      const updatedGroup = await apiRequest(`/api/chat/group/${selectedChatGroup.id}/members`, 'POST', {
        targetUserId,
        action
      });
      setSelectedChatGroup(updatedGroup);
      setSuccessMsg(`User ${action === 'ADD' ? 'added to' : 'removed from'} group successfully.`);
    } catch (e) {
      console.error("Error managing members:", e);
    }
  };

  const handleUpdateGroupSettings = async (isPrivate: boolean) => {
    if (!selectedChatGroup) return;
    try {
      const updatedGroup = await apiRequest(`/api/chat/group/${selectedChatGroup.id}/settings`, 'PATCH', {
        isPrivate
      });
      setSelectedChatGroup(updatedGroup);
      setSuccessMsg(`Group visibility updated to ${isPrivate ? 'Private' : 'Public'}.`);
    } catch (e) {
      console.error("Error updating settings:", e);
    }
  };

  // ==========================================
  // 4. MAIN LAYOUT AND COMPONENT RENDERERS
  // ==========================================

  return (
    <div className="min-h-screen flex flex-col relative select-none bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-200">
      
      {/* Real-time Push Alert Banner */}
      {activeToast && (
        <div className="fixed top-5 right-5 z-50 max-w-sm bg-[var(--bg-card)] border border-indigo-500/50 backdrop-blur-md p-4 rounded-xl shadow-2xl flex items-start gap-3 animate-fade-in">
          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-xs text-indigo-400 flex items-center gap-1.5 font-display">
              {activeToast.title}
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
            </h4>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-normal">{activeToast.message}</p>
          </div>
          <button onClick={() => setActiveToast(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ==========================================
          WORKSPACE AUTH VIEWPORTS (LOGIN & SIGNUP)
          ========================================== */}
      {!user ? (
        <div className="flex-1 flex items-center justify-center p-6 min-h-screen">
          
          {/* Dynamic Background Glows */}
          <div className="absolute top-[20%] left-[20%] w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-[20%] right-[20%] w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />

          {view === 'login' && (
            <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] p-8 rounded-2xl shadow-xl relative">
              <div className="flex justify-center mb-6">
                <div className="p-3.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-500">
                  <Shield className="w-8 h-8" />
                </div>
              </div>

              <div className="text-center">
                <span className="text-[10px] font-bold text-indigo-500 tracking-wider uppercase">Manual ERP Platform</span>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mt-1 font-display">Sign In to Console</h2>
                <p className="text-[var(--text-secondary)] text-xs mt-1.5">Provide credentials to enter your company workstation.</p>
              </div>

              {(errorMsg || successMsg) && (
                <div className="mt-4">
                  {errorMsg && (
                    <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg flex items-center gap-2 text-red-500 text-xs leading-normal">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}
                  {successMsg && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg flex items-center gap-2 text-emerald-500 text-xs leading-normal">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>{successMsg}</span>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="mt-6 flex flex-col gap-4">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Company Tenant Code</label>
                  <div className="mt-1 relative">
                    <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. APPLE, DINEIN, SUPERADMIN"
                      value={loginForm.companyCode}
                      onChange={e => setLoginForm({ ...loginForm, companyCode: e.target.value })}
                      className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 pl-10 pr-4 rounded-lg text-xs focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Username</label>
                  <div className="mt-1 relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      required
                      placeholder="Enter username"
                      value={loginForm.username}
                      onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                      className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 pl-10 pr-4 rounded-lg text-xs focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Password</label>
                  <div className="mt-1 relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                      className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 pl-10 pr-4 rounded-lg text-xs focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg transition-colors cursor-pointer text-xs shadow-md shadow-indigo-600/10"
                >
                  {loading ? 'Authenticating...' : 'Secure Workspace Login'}
                </button>
              </form>

              <div className="mt-5 text-center border-t border-[var(--border-color)] pt-4">
                <span className="text-[var(--text-muted)] text-xs">New user on the platform?</span>
                <button 
                  onClick={() => { setView('signup'); setSignupStep(1); setErrorMsg(null); setSuccessMsg(null); }} 
                  className="text-indigo-500 hover:underline font-bold text-xs ml-1 cursor-pointer font-display"
                >
                  Join Tenant Company
                </button>
              </div>
            </div>
          )}

          {view === 'signup' && (
            <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] p-8 rounded-2xl shadow-xl">
              
              {/* Step indicator */}
              <div className="flex items-center justify-center gap-3 text-[10px] font-bold text-[var(--text-secondary)] mb-6">
                <span className={`px-2 py-0.5 rounded-full ${signupStep >= 1 ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' : 'bg-[var(--bg-tertiary)]'}`}>1. Info</span>
                <div className="w-6 h-px bg-[var(--border-color)]" />
                <span className={`px-2 py-0.5 rounded-full ${signupStep >= 2 ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' : 'bg-[var(--bg-tertiary)]'}`}>2. OTP</span>
                <div className="w-6 h-px bg-[var(--border-color)]" />
                <span className={`px-2 py-0.5 rounded-full ${signupStep === 3 ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' : 'bg-[var(--bg-tertiary)]'}`}>3. Wait</span>
              </div>

              {(errorMsg || successMsg) && (
                <div className="mb-4">
                  {errorMsg && (
                    <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg flex items-center gap-2 text-red-500 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}
                  {successMsg && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg flex items-center gap-2 text-emerald-500 text-xs">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>{successMsg}</span>
                    </div>
                  )}
                </div>
              )}

              {signupStep === 1 && (
                <div>
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-[var(--text-primary)] font-display">Create Employee Account</h2>
                    <p className="text-[var(--text-secondary)] text-xs mt-1">Submit registration details under your tenant code.</p>
                  </div>

                  <div className="mt-5 flex flex-col gap-4">
                    <div>
                      <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Target Company Code</label>
                      <div className="mt-1 relative">
                        <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                          type="text"
                          placeholder="e.g. APPLE, DINEIN"
                          value={signupForm.companyCode}
                          onChange={e => setSignupForm({ ...signupForm, companyCode: e.target.value.toUpperCase() })}
                          className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 pl-10 pr-4 rounded-lg text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Desired Username</label>
                      <div className="mt-1 relative">
                        <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                          type="text"
                          placeholder="Choose username"
                          value={signupForm.username}
                          onChange={e => setSignupForm({ ...signupForm, username: e.target.value })}
                          className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 pl-10 pr-4 rounded-lg text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Mobile No (Compulsory OTP)</label>
                      <div className="mt-1 relative">
                        <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                          type="text"
                          placeholder="e.g. +919876543210"
                          value={signupForm.mobileNo}
                          onChange={e => setSignupForm({ ...signupForm, mobileNo: e.target.value })}
                          className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 pl-10 pr-4 rounded-lg text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Email (Optional)</label>
                      <div className="mt-1 relative">
                        <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                          type="email"
                          placeholder="Enter email address"
                          value={signupForm.email}
                          onChange={e => setSignupForm({ ...signupForm, email: e.target.value })}
                          className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 pl-10 pr-4 rounded-lg text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Password</label>
                      <div className="mt-1 relative">
                        <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                          type="password"
                          placeholder="Minimum 6 characters"
                          value={signupForm.password}
                          onChange={e => setSignupForm({ ...signupForm, password: e.target.value })}
                          className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 pl-10 pr-4 rounded-lg text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      onClick={triggerOtpRequest}
                      disabled={loading}
                      className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg transition-colors cursor-pointer text-xs"
                    >
                      {loading ? 'Processing...' : 'Send Verification OTP'}
                    </button>
                  </div>
                </div>
              )}

              {signupStep === 2 && (
                <form onSubmit={handleSignupSubmit} className="text-center">
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 rounded-xl w-fit mx-auto mb-4">
                    <Key className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] font-display">Verify Phone Number</h2>
                  <p className="text-[var(--text-secondary)] text-xs mt-1.5 leading-normal">
                    Enter the simulated SMS code dispatched to <span className="font-semibold text-[var(--text-primary)]">{signupForm.mobileNo}</span>.
                  </p>
                  
                  <div className="mt-3 text-[10px] bg-indigo-500/5 border border-indigo-500/20 p-2.5 rounded-lg text-indigo-400 text-left leading-normal flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Retrieve your 6-digit OTP code from the **backend server console log** window.</span>
                  </div>

                  <div className="mt-5 text-left">
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Verification Code</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="Enter code"
                      value={signupForm.otpCode}
                      onChange={e => setSignupForm({ ...signupForm, otpCode: e.target.value })}
                      className="w-full mt-1 text-center text-lg tracking-[8px] font-mono bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 rounded-lg text-[var(--text-primary)] placeholder-slate-600 focus:outline-none"
                    />
                  </div>

                  <div className="mt-6 flex flex-col gap-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg transition-colors cursor-pointer text-xs"
                    >
                      {loading ? 'Submitting...' : 'Verify OTP & Finish Registration'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setSignupStep(1)} 
                      className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold py-2.5 rounded-lg transition-colors text-xs cursor-pointer"
                    >
                      Back to Info
                    </button>
                  </div>
                </form>
              )}

              {signupStep === 3 && (
                <div className="text-center py-4">
                  <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 rounded-full w-fit mx-auto mb-4 animate-pulse">
                    <Clock className="w-10 h-10" />
                  </div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] font-display">Holding for Admin Approval</h2>
                  <p className="text-[var(--text-secondary)] text-xs mt-3 leading-normal">
                    Your verification was <span className="text-emerald-500 font-semibold">approved</span>. Your account is on hold pending Administrator security vetting.
                  </p>
                  
                  <button
                    onClick={() => { setView('login'); setErrorMsg(null); setSuccessMsg(null); }}
                    className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg transition-colors cursor-pointer text-xs"
                  >
                    Return to Sign In
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        
        /* ==========================================
            ERP PORTALS - FIXED SIDEBAR LAYOUT
            ========================================== */
        <div className="flex-1 flex relative">
          
          {/* ==========================================
              FIXED LEFT SIDEBAR MENU
              ========================================== */}
          <aside ref={sidebarRef} className={`fixed top-0 bottom-0 left-0 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col z-30 transition-all duration-300 ${sidebarCollapsed ? 'w-16 overflow-visible' : 'w-64'}`}>
            
            {/* Top Left User Profile Card Dropdown */}
            <div className="relative border-b border-[var(--border-color)] p-4 flex justify-center">
              {sidebarCollapsed ? (
                <button 
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center font-bold text-sm shrink-0 uppercase shadow-inner cursor-pointer border border-[var(--border-color)]"
                  title={user.username}
                >
                  {user.username.substring(0, 2)}
                </button>
              ) : (
                <button 
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors text-left cursor-pointer border border-[var(--border-color)]"
                >
                  <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 uppercase shadow-inner" style={{ flexShrink: 0 }}>
                    {user.username.substring(0, 2)}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-xs font-bold text-[var(--text-primary)] truncate font-display">{user.username}</h4>
                    <span className="text-[9px] text-[var(--text-secondary)] font-semibold uppercase tracking-wider block truncate">
                      {user.isSuperAdmin ? 'Super Admin' : user.role || 'Employee'}
                    </span>
                  </div>
                </button>
              )}
              
              {showProfileDropdown && (
                <div className={`absolute bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-xl z-50 p-2 animate-fade-in text-left ${sidebarCollapsed ? 'left-16 top-4 w-48' : 'left-4 right-4 mt-2'}`}>
                  <div className="px-3 py-2 border-b border-[var(--border-color)] text-[10px] text-[var(--text-secondary)]">
                    Logged in as <strong className="text-[var(--text-primary)]">{user.username}</strong>
                    {!user.isSuperAdmin && <p className="mt-1">Tenant Code: <span className="font-mono text-indigo-500 font-bold">{user.companyCode}</span></p>}
                  </div>
                  
                  {/* Theme Switcher Button */}
                  <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors flex items-center justify-between cursor-pointer mt-1"
                  >
                    <span className="flex items-center gap-2">
                      {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-indigo-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                      Theme Mode
                    </span>
                    <span className="text-[9px] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-[var(--text-secondary)] font-bold capitalize">
                      {theme}
                    </span>
                  </button>

                  {/* Subscription Details (Company Admin only) */}
                  {!user.isSuperAdmin && user.role === 'Admin' && (
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        setShowSubscriptionModal(true);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors flex items-center gap-2 cursor-pointer mt-1"
                    >
                      <Building className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Subscription Details</span>
                    </button>
                  )}

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2 cursor-pointer mt-1"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-500" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>

            {/* Expandable Navigation Tree Menu */}
            <div className={`flex-1 ${sidebarCollapsed ? 'overflow-visible' : 'overflow-y-auto'} p-3 flex flex-col gap-1 select-none`}>
              
              {/* If Super Admin, show system configuration sidebar options */}
              {user.isSuperAdmin ? (
                <>
                  {!sidebarCollapsed && <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase px-3 block my-1">System Coordinator</span>}
                  
                  <button
                    onClick={() => { setActiveWorkspaceModule('dashboard'); setSelectedCompany(null); }}
                    className={`w-full py-2 px-3 rounded-lg text-left text-xs font-semibold transition-colors flex items-center gap-2 ${
                      activeWorkspaceModule === 'dashboard' && !selectedCompany
                        ? 'bg-[var(--bg-tertiary)] text-indigo-500 font-bold border-l-2 border-indigo-500'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                    }`}
                    title={sidebarCollapsed ? "Corporate Tenants" : ""}
                  >
                    <Layers className="w-4 h-4" style={{ flexShrink: 0 }} />
                    {!sidebarCollapsed && <span>Corporate Tenants</span>}
                  </button>

                  <button
                    onClick={() => { setActiveWorkspaceModule('spawn_company'); setSelectedCompany(null); }}
                    className={`w-full py-2 px-3 rounded-lg text-left text-xs font-semibold transition-colors flex items-center gap-2 ${
                      activeWorkspaceModule === 'spawn_company'
                        ? 'bg-[var(--bg-tertiary)] text-indigo-500 font-bold border-l-2 border-indigo-500'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                    }`}
                    title={sidebarCollapsed ? "Spawn Tenant" : ""}
                  >
                    <Plus className="w-4 h-4" style={{ flexShrink: 0 }} />
                    {!sidebarCollapsed && <span>Spawn Tenant</span>}
                  </button>

                  {/* Spawned Company List shortcut profiles */}
                  {companies.length > 0 && (
                    <div className={`mt-4 flex flex-col gap-1 ${!sidebarCollapsed ? 'border-t border-[var(--border-color)] pt-3' : ''}`}>
                      {!sidebarCollapsed ? (
                        <>
                          <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase px-3 block mb-1">Company Profiles</span>
                          {companies.map(c => (
                            <button
                              key={c.id}
                              onClick={() => handleSelectCompanyProfile(c)}
                              className={`w-full py-1.5 px-3 rounded-lg text-left text-[11px] font-medium transition-colors flex items-center justify-between ${
                                selectedCompany?.id === c.id
                                  ? 'bg-indigo-500/10 text-indigo-400 font-semibold'
                                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                              }`}
                            >
                              <span className="truncate">{c.name}</span>
                              <span className="text-[9px] bg-[var(--bg-tertiary)] px-1 rounded font-mono font-bold text-[var(--text-muted)] shrink-0">{c.companyCode}</span>
                            </button>
                          ))}
                        </>
                      ) : (
                        <div className="relative flex justify-center">
                          <button
                            onClick={() => setActivePopoverCategory(activePopoverCategory === 'companies' ? null : 'companies')}
                            className={`p-2.5 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer ${selectedCompany ? 'bg-indigo-500/10 text-indigo-500' : 'text-[var(--text-secondary)]'}`}
                            title="Company Profiles"
                          >
                            <Building className="w-4 h-4" />
                          </button>
                          {activePopoverCategory === 'companies' && (
                            <div className="absolute left-14 top-0 z-50 w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl p-2 animate-scale-up text-left">
                              <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase px-2 block mb-1">Company Profiles</span>
                              {companies.map(c => (
                                <button
                                  key={c.id}
                                  onClick={() => {
                                    handleSelectCompanyProfile(c);
                                    setActivePopoverCategory(null);
                                  }}
                                  className={`w-full text-left py-1.5 px-2 rounded-lg text-[11px] font-medium transition-colors flex items-center justify-between ${
                                    selectedCompany?.id === c.id
                                      ? 'bg-indigo-500/10 text-indigo-400 font-semibold'
                                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                                  }`}
                                >
                                  <span className="truncate">{c.name}</span>
                                  <span className="text-[9px] bg-[var(--bg-primary)] px-1 rounded font-mono font-bold text-[var(--text-muted)] shrink-0">{c.companyCode}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                
                /* Employee / Company Admin sidebar menu tree */
                <>
                  {!sidebarCollapsed && <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase px-3 block my-1">Menu Navigator</span>}

                  {/* Dashboard / Home option */}
                  <button
                    onClick={() => setActiveWorkspaceModule('dashboard')}
                    className={`w-full py-2 px-3 rounded-lg text-left text-xs font-semibold transition-colors flex items-center gap-2 ${
                      activeWorkspaceModule === 'dashboard'
                        ? 'bg-[var(--bg-tertiary)] text-indigo-500 font-bold border-l-2 border-indigo-500'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                    }`}
                    title={sidebarCollapsed ? "Console Home" : ""}
                  >
                    <Layers className="w-4 h-4" style={{ flexShrink: 0 }} />
                    {!sidebarCollapsed && <span>Console Home</span>}
                  </button>

                  {/* Dynamic Sidebar Modules */}
                  {['MDM', 'FINANCE', 'INVENTORY', 'PURCHASE', 'SALES', 'MANUFACTURING', 'QUALITY', 'EMAIL', 'CRM', 'HR'].map((modKey) => {
                    if (!companyFeatures.includes(modKey)) return null;
                    const catData = MASTER_FEATURES_HIERARCHY.find(c => c.key === modKey);
                    if (!catData) return null;
                    
                    const moduleKeyMap: Record<string, string> = {
                        'INVENTORY': 'inventory',
                        'PURCHASE': 'purchase',
                        'SALES': 'sales',
                        'MANUFACTURING': 'manufacturing',
                        'QUALITY': 'quality',
                        'EMAIL': 'email',
                        'CRM': 'crm',
                        'HR': 'hr',
                        'FINANCE': 'finance',
                        'MDM': 'master_data'
                    };
                    const mKey = moduleKeyMap[modKey];
                    
                    const iconMap: Record<string, any> = {
                        'INVENTORY': Box,
                        'PURCHASE': ShoppingCart,
                        'SALES': Tag,
                        'MANUFACTURING': Factory,
                        'QUALITY': Shield,
                        'EMAIL': Mail,
                        'CRM': MessageSquare,
                        'HR': Users,
                        'FINANCE': BarChart3,
                        'MDM': Layers
                    };
                    const Icon = iconMap[modKey] || Folder;
                    
                    // Tailwind requires full class names
                    const colors: Record<string, any> = {
                        'INVENTORY': { text: 'text-blue-400', bgHover: 'bg-blue-500/10', textHover: 'text-blue-500', activeBg: 'bg-blue-500/5' },
                        'PURCHASE': { text: 'text-teal-400', bgHover: 'bg-teal-500/10', textHover: 'text-teal-500', activeBg: 'bg-teal-500/5' },
                        'SALES': { text: 'text-pink-400', bgHover: 'bg-pink-500/10', textHover: 'text-pink-500', activeBg: 'bg-pink-500/5' },
                        'MANUFACTURING': { text: 'text-orange-400', bgHover: 'bg-orange-500/10', textHover: 'text-orange-500', activeBg: 'bg-orange-500/5' },
                        'QUALITY': { text: 'text-rose-400', bgHover: 'bg-rose-500/10', textHover: 'text-rose-500', activeBg: 'bg-rose-500/5' },
                        'EMAIL': { text: 'text-amber-400', bgHover: 'bg-amber-500/10', textHover: 'text-amber-500', activeBg: 'bg-amber-500/5' },
                        'CRM': { text: 'text-purple-400', bgHover: 'bg-purple-500/10', textHover: 'text-purple-500', activeBg: 'bg-purple-500/5' },
                        'HR': { text: 'text-cyan-400', bgHover: 'bg-cyan-500/10', textHover: 'text-cyan-500', activeBg: 'bg-cyan-500/5' },
                        'FINANCE': { text: 'text-emerald-400', bgHover: 'bg-emerald-500/10', textHover: 'text-emerald-500', activeBg: 'bg-emerald-500/5' },
                        'MDM': { text: 'text-indigo-400', bgHover: 'bg-indigo-500/10', textHover: 'text-indigo-500', activeBg: 'bg-indigo-500/5' }
                    };
                    const theme = colors[modKey];

                    return (
                    <div key={modKey} className="flex flex-col mt-1 relative">
                      {sidebarCollapsed ? (
                        <div className="flex justify-center">
                          <button
                            onClick={() => setActivePopoverCategory(activePopoverCategory === mKey ? null : mKey)}
                            className={`p-2.5 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer ${activeWorkspaceModule === mKey ? `${theme.bgHover} ${theme.textHover}` : theme.text}`}
                            title={catData.name}
                          >
                            <Icon className="w-4 h-4" />
                          </button>
                          {activePopoverCategory === mKey && (
                            <div className="absolute left-14 top-0 z-50 w-52 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl p-2 animate-scale-up text-left flex flex-col gap-1 max-h-[360px] overflow-y-auto">
                              <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase px-2 block mb-1">{catData.name}</span>
                              {mKey === 'master_data' ? (
                                [
                                  { id: 'MDM_PRODUCT', label: 'Product Master', icon: <Package className="w-3.5 h-3.5" />, color: 'text-indigo-400' },
                                  { id: 'MDM_CUSTOMER', label: 'Customer Master', icon: <Users className="w-3.5 h-3.5" />, color: 'text-emerald-400' },
                                  { id: 'MDM_VENDOR', label: 'Vendor Master', icon: <Truck className="w-3.5 h-3.5" />, color: 'text-amber-500' },
                                  { id: 'MDM_EMPLOYEE', label: 'Employee Master', icon: <UserCircle className="w-3.5 h-3.5" />, color: 'text-purple-400' },
                                  { id: 'MDM_WAREHOUSE', label: 'Warehouse Master', icon: <Warehouse className="w-3.5 h-3.5" />, color: 'text-cyan-400' },
                                  { id: 'MDM_FINANCE', label: 'Finance & Tax', icon: <Receipt className="w-3.5 h-3.5" />, color: 'text-rose-400', reqs: ['MDM_TAX', 'MDM_COA'] },
                                  { id: 'MDM_CLASSIFICATION', label: 'Classifications', icon: <Tag className="w-3.5 h-3.5" />, color: 'text-orange-400', reqs: ['MDM_UNIT', 'MDM_CATEGORY', 'MDM_BRAND'] }
                                ].map(uiItem => {
                                  const reqs = uiItem.reqs || [uiItem.id];
                                  if (!reqs.some(f => companyFeatures.includes(f))) return null;
                                  const isActive = activeWorkspaceModule === mKey && activeWorkspaceSubModule === uiItem.id;
                                  return (
                                    <button
                                      key={uiItem.id}
                                      onClick={() => { setActiveWorkspaceModule(mKey); setActiveWorkspaceSubModule(uiItem.id); setActivePopoverCategory(null); }}
                                      className={`w-full py-1.5 px-2 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${isActive ? `${uiItem.color} font-bold ${theme.activeBg}` : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                    >
                                      {uiItem.icon} <span>{uiItem.label}</span>
                                    </button>
                                  );
                                })
                              ) : (
                                catData.children.map((child: any) => {
                                  if (!companyFeatures.includes(child.key)) return null;
                                  const isActive = activeWorkspaceModule === mKey && activeWorkspaceSubModule === child.key;
                                  return (
                                    <button
                                      key={child.key}
                                      onClick={() => { setActiveWorkspaceModule(mKey); setActiveWorkspaceSubModule(child.key); setActivePopoverCategory(null); }}
                                      className={`w-full py-1.5 px-2 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${isActive ? `${theme.textHover} font-bold ${theme.activeBg}` : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                    >
                                      <Folder className="w-3.5 h-3.5" /> <span>{child.name}</span>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => toggleSidebarCategory(mKey)}
                            className="w-full py-2 px-3 rounded-lg text-left text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <Icon className={`w-4 h-4 ${theme.text}`} style={{ flexShrink: 0 }} />
                              <span>{catData.name}</span>
                            </span>
                            {expandedCategories[mKey] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                          
                          {expandedCategories[mKey] && (
                            <div className="pl-6 flex flex-col gap-1 mt-1 border-l border-[var(--border-color)] ml-4">
                              {mKey === 'master_data' ? (
                                [
                                  { id: 'MDM_PRODUCT', label: 'Product Master', icon: <Package className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />, color: 'text-indigo-400' },
                                  { id: 'MDM_CUSTOMER', label: 'Customer Master', icon: <Users className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />, color: 'text-emerald-400' },
                                  { id: 'MDM_VENDOR', label: 'Vendor Master', icon: <Truck className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />, color: 'text-amber-500' },
                                  { id: 'MDM_EMPLOYEE', label: 'Employee Master', icon: <UserCircle className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />, color: 'text-purple-400' },
                                  { id: 'MDM_WAREHOUSE', label: 'Warehouse Master', icon: <Warehouse className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />, color: 'text-cyan-400' },
                                  { id: 'MDM_FINANCE', label: 'Finance & Tax', icon: <Receipt className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />, color: 'text-rose-400', reqs: ['MDM_TAX', 'MDM_COA'] },
                                  { id: 'MDM_CLASSIFICATION', label: 'Classifications', icon: <Tag className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />, color: 'text-orange-400', reqs: ['MDM_UNIT', 'MDM_CATEGORY', 'MDM_BRAND'] }
                                ].map(uiItem => {
                                  const reqs = uiItem.reqs || [uiItem.id];
                                  if (!reqs.some(f => companyFeatures.includes(f))) return null;
                                  const isActive = activeWorkspaceModule === mKey && activeWorkspaceSubModule === uiItem.id;
                                  return (
                                    <button
                                      key={uiItem.id}
                                      onClick={() => { setActiveWorkspaceModule(mKey); setActiveWorkspaceSubModule(uiItem.id); }}
                                      className={`w-full py-1.5 px-3 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${isActive ? `${uiItem.color} font-bold ${theme.activeBg}` : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                    >
                                      {uiItem.icon}
                                      <span>{uiItem.label}</span>
                                    </button>
                                  );
                                })
                              ) : (
                                catData.children.map((child: any) => {
                                  if (!companyFeatures.includes(child.key)) return null;
                                  const isActive = activeWorkspaceModule === mKey && activeWorkspaceSubModule === child.key;
                                  return (
                                    <button
                                      key={child.key}
                                      onClick={() => { setActiveWorkspaceModule(mKey); setActiveWorkspaceSubModule(child.key); }}
                                      className={`w-full py-1.5 px-3 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${isActive ? `${theme.textHover} font-bold ${theme.activeBg}` : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                    >
                                      <Folder className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />
                                      <span>{child.name}</span>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                  })}

                  {/* Category E: System Administration (Admin Role Only) */}
                  {user.role === 'Admin' && companyFeatures.includes('ADMIN') && (
                    <div className="flex flex-col mt-2 relative">
                      {sidebarCollapsed ? (
                        <div className="flex justify-center border-t border-[var(--border-color)] pt-2">
                          <button
                            onClick={() => setActivePopoverCategory(activePopoverCategory === 'admin' ? null : 'admin')}
                            className={`p-2.5 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer ${['general_admin', 'approvals', 'employee_directory', 'dashboard'].includes(activeWorkspaceModule) ? 'bg-indigo-500/10 text-indigo-500' : 'text-slate-400'}`}
                            title="Administration"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          {activePopoverCategory === 'admin' && (
                            <div className="absolute left-14 top-0 z-50 w-52 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl p-2 animate-scale-up text-left flex flex-col gap-1 max-h-[360px] overflow-y-auto">
                              <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase px-2 block mb-1">Administration</span>
                              <button
                                onClick={() => {
                                  setActiveWorkspaceModule('general_admin');
                                  setAdminTab('email');
                                  setActivePopoverCategory(null);
                                }}
                                className={`w-full py-1.5 px-2 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${
                                  activeWorkspaceModule === 'general_admin' && adminTab === 'email' ? 'text-indigo-400 font-bold bg-indigo-500/5' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <Mail className="w-3.5 h-3.5" />
                                <span>SMTP Email Settings</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveWorkspaceModule('general_admin');
                                  setAdminTab('org');
                                  setAdminOrgSubTab('dept_crud');
                                  setActivePopoverCategory(null);
                                }}
                                className={`w-full py-1.5 px-2 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${
                                  activeWorkspaceModule === 'general_admin' && adminTab === 'org' && adminOrgSubTab === 'dept_crud' ? 'text-indigo-400 font-bold bg-indigo-500/5' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <Folder className="w-3.5 h-3.5" />
                                <span>Department Tree</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveWorkspaceModule('general_admin');
                                  setAdminTab('org');
                                  setAdminOrgSubTab('org_chart');
                                  setActivePopoverCategory(null);
                                }}
                                className={`w-full py-1.5 px-2 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${
                                  activeWorkspaceModule === 'general_admin' && adminTab === 'org' && adminOrgSubTab === 'org_chart' ? 'text-indigo-400 font-bold bg-indigo-500/5' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <Users className="w-3.5 h-3.5" />
                                <span>Employee Org Chart</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveWorkspaceModule('general_admin');
                                  setAdminTab('features');
                                  setActivePopoverCategory(null);
                                }}
                                className={`w-full py-1.5 px-2 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${
                                  activeWorkspaceModule === 'general_admin' && adminTab === 'features' ? 'text-indigo-400 font-bold bg-indigo-500/5' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <Shield className="w-3.5 h-3.5" />
                                <span>Role Designer</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveWorkspaceModule('general_admin');
                                  setAdminTab('workflow');
                                  setActivePopoverCategory(null);
                                }}
                                className={`w-full py-1.5 px-2 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${
                                  activeWorkspaceModule === 'general_admin' && adminTab === 'workflow' ? 'text-indigo-400 font-bold bg-indigo-500/5' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Approval Engine</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveWorkspaceModule('general_admin');
                                  setAdminTab('notifications');
                                  setActivePopoverCategory(null);
                                }}
                                className={`w-full py-1.5 px-2 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${
                                  activeWorkspaceModule === 'general_admin' && adminTab === 'notifications' ? 'text-indigo-400 font-bold bg-indigo-500/5' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <Bell className="w-3.5 h-3.5" />
                                <span>Notification Hub</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveWorkspaceModule('general_admin');
                                  setAdminTab('dms');
                                  setActivePopoverCategory(null);
                                }}
                                className={`w-full py-1.5 px-2 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${
                                  activeWorkspaceModule === 'general_admin' && adminTab === 'dms' ? 'text-indigo-400 font-bold bg-indigo-500/5' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <Layers className="w-3.5 h-3.5" />
                                <span>Document Management (DMS)</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveWorkspaceModule('general_admin');
                                  setAdminTab('audit');
                                  setActivePopoverCategory(null);
                                }}
                                className={`w-full py-1.5 px-2 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${
                                  activeWorkspaceModule === 'general_admin' && adminTab === 'audit' ? 'text-indigo-400 font-bold bg-indigo-500/5' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <Activity className="w-3.5 h-3.5" />
                                <span>Audit Trail Logs</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveWorkspaceModule('general_admin');
                                  setAdminTab('backup');
                                  setActivePopoverCategory(null);
                                }}
                                className={`w-full py-1.5 px-2 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${
                                  activeWorkspaceModule === 'general_admin' && adminTab === 'backup' ? 'text-indigo-400 font-bold bg-indigo-500/5' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <Database className="w-3.5 h-3.5" />
                                <span>Backups</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveWorkspaceModule('general_admin');
                                  setAdminTab('profile');
                                  setActivePopoverCategory(null);
                                }}
                                className={`w-full py-1.5 px-2 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${
                                  activeWorkspaceModule === 'general_admin' && adminTab === 'profile' ? 'text-indigo-400 font-bold bg-indigo-500/5' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <Building className="w-3.5 h-3.5" />
                                <span>Company Profile</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveWorkspaceModule('general_admin');
                                  setAdminTab('tax');
                                  setActivePopoverCategory(null);
                                }}
                                className={`w-full py-1.5 px-2 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${
                                  activeWorkspaceModule === 'general_admin' && adminTab === 'tax' ? 'text-indigo-400 font-bold bg-indigo-500/5' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <Percent className="w-3.5 h-3.5" />
                                <span>Tax Settings</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveWorkspaceModule('general_admin');
                                  setAdminTab('currency');
                                  setActivePopoverCategory(null);
                                }}
                                className={`w-full py-1.5 px-2 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${
                                  activeWorkspaceModule === 'general_admin' && adminTab === 'currency' ? 'text-indigo-400 font-bold bg-indigo-500/5' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Currencies</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveWorkspaceModule('approvals');
                                  setActivePopoverCategory(null);
                                }}
                                className={`w-full py-1.5 px-2 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${
                                  activeWorkspaceModule === 'approvals' ? 'text-indigo-400 font-bold bg-indigo-500/5' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>User Security Approvals {pendingUsers.length > 0 && `(${pendingUsers.length})`}</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveWorkspaceModule('employee_directory');
                                  setActivePopoverCategory(null);
                                }}
                                className={`w-full py-1.5 px-2 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${
                                  activeWorkspaceModule === 'employee_directory' ? 'text-indigo-400 font-bold bg-indigo-500/5' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <Briefcase className="w-3.5 h-3.5" />
                                <span>System Employee Directory</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveWorkspaceModule('dashboard');
                                  setActivePopoverCategory(null);
                                }}
                                className={`w-full py-1.5 px-2 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${
                                  activeWorkspaceModule === 'dashboard' ? 'text-indigo-400 font-bold bg-indigo-500/5' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <Layers className="w-3.5 h-3.5" />
                                <span>Customizable Dashboard</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="border-t border-[var(--border-color)] pt-2">
                          <button
                            onClick={() => toggleSidebarCategory('admin')}
                            className="w-full py-2 px-3 rounded-lg text-left text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <Settings className="w-4 h-4 text-slate-400" style={{ flexShrink: 0 }} />
                              <span>Administration</span>
                            </span>
                            {expandedCategories.admin ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>

                          {expandedCategories.admin && (
                            <div className="pl-6 flex flex-col gap-1 mt-1 border-l border-[var(--border-color)] ml-4">
                              <button
                                onClick={() => {
                                  setActiveWorkspaceModule('general_admin');
                                  setAdminTab('email');
                                }}
                                className={`w-full py-1.5 px-3 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${
                                  activeWorkspaceModule === 'general_admin' && adminTab === 'email'
                                    ? 'text-indigo-400 font-bold bg-indigo-500/5'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <Mail className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />
                                <span>SMTP Email Settings</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveWorkspaceModule('general_admin');
                                  setAdminTab('org');
                                  setAdminOrgSubTab('dept_crud');
                                }}
                                className={`w-full py-1.5 px-3 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${
                                  activeWorkspaceModule === 'general_admin' && adminTab === 'org' && adminOrgSubTab === 'dept_crud'
                                    ? 'text-indigo-400 font-bold bg-indigo-500/5'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <Folder className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />
                                <span>Department Tree</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveWorkspaceModule('general_admin');
                                  setAdminTab('org');
                                  setAdminOrgSubTab('org_chart');
                                }}
                                className={`w-full py-1.5 px-3 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${
                                  activeWorkspaceModule === 'general_admin' && adminTab === 'org' && adminOrgSubTab === 'org_chart'
                                    ? 'text-indigo-400 font-bold bg-indigo-500/5'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <Users className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />
                                <span>Employee Org Chart</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveWorkspaceModule('general_admin');
                                  setAdminTab('features');
                                }}
                                className={`w-full py-1.5 px-3 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${
                                  activeWorkspaceModule === 'general_admin' && adminTab === 'features'
                                    ? 'text-indigo-400 font-bold bg-indigo-500/5'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <Shield className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />
                                <span>Role Designer</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveWorkspaceModule('general_admin');
                                  setAdminTab('workflow');
                                }}
                                className={`w-full py-1.5 px-3 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${
                                  activeWorkspaceModule === 'general_admin' && adminTab === 'workflow'
                                    ? 'text-indigo-400 font-bold bg-indigo-500/5'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <CheckCircle className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />
                                <span>Approval Engine</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveWorkspaceModule('general_admin');
                                  setAdminTab('notifications');
                                }}
                                className={`w-full py-1.5 px-3 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${
                                  activeWorkspaceModule === 'general_admin' && adminTab === 'notifications'
                                    ? 'text-indigo-400 font-bold bg-indigo-500/5'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <Bell className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />
                                <span>Notification Hub</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveWorkspaceModule('general_admin');
                                  setAdminTab('dms');
                                }}
                                className={`w-full py-1.5 px-3 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${
                                  activeWorkspaceModule === 'general_admin' && adminTab === 'dms'
                                    ? 'text-indigo-400 font-bold bg-indigo-500/5'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <Layers className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />
                                <span>Document Management (DMS)</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveWorkspaceModule('general_admin');
                                  setAdminTab('audit');
                                }}
                                className={`w-full py-1.5 px-3 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${
                                  activeWorkspaceModule === 'general_admin' && adminTab === 'audit'
                                    ? 'text-indigo-400 font-bold bg-indigo-500/5'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <Activity className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />
                                <span>Audit Trail Logs</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveWorkspaceModule('general_admin');
                                  setAdminTab('backup');
                                }}
                                className={`w-full py-1.5 px-3 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${
                                  activeWorkspaceModule === 'general_admin' && adminTab === 'backup'
                                    ? 'text-indigo-400 font-bold bg-indigo-500/5'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <Database className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />
                                <span>Backups</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveWorkspaceModule('general_admin');
                                  setAdminTab('profile');
                                }}
                                className={`w-full py-1.5 px-3 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${
                                  activeWorkspaceModule === 'general_admin' && adminTab === 'profile'
                                    ? 'text-indigo-400 font-bold bg-indigo-500/5'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <Building className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />
                                <span>Company Profile</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveWorkspaceModule('general_admin');
                                  setAdminTab('tax');
                                }}
                                className={`w-full py-1.5 px-3 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${
                                  activeWorkspaceModule === 'general_admin' && adminTab === 'tax'
                                    ? 'text-indigo-400 font-bold bg-indigo-500/5'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <Percent className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />
                                <span>Tax Settings</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveWorkspaceModule('general_admin');
                                  setAdminTab('currency');
                                }}
                                className={`w-full py-1.5 px-3 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${
                                  activeWorkspaceModule === 'general_admin' && adminTab === 'currency'
                                    ? 'text-indigo-400 font-bold bg-indigo-500/5'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <DollarSign className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />
                                <span>Currencies</span>
                              </button>

                              <button
                                onClick={() => { setActiveWorkspaceModule('approvals'); }}
                                className={`w-full py-1.5 px-3 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center justify-between gap-2 ${
                                  activeWorkspaceModule === 'approvals'
                                    ? 'text-indigo-400 font-bold bg-indigo-500/5'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <UserPlus className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />
                                  <span>User Security Approvals</span>
                                </span>
                                {pendingUsers.length > 0 && (
                                  <span className="bg-indigo-500 text-white font-extrabold text-[8px] px-1.5 py-0.5 rounded-full leading-none">{pendingUsers.length}</span>
                                )}
                              </button>

                              <button
                                onClick={() => { setActiveWorkspaceModule('employee_directory'); }}
                                className={`w-full py-1.5 px-3 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${
                                  activeWorkspaceModule === 'employee_directory'
                                    ? 'text-indigo-400 font-bold bg-indigo-500/5'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <Briefcase className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />
                                <span>System Employee Directory</span>
                              </button>

                              <button
                                onClick={() => { setActiveWorkspaceModule('dashboard'); }}
                                className={`w-full py-1.5 px-3 rounded-md text-left text-[11px] font-semibold transition-colors flex items-center gap-2 ${
                                  activeWorkspaceModule === 'dashboard'
                                    ? 'text-indigo-400 font-bold bg-indigo-500/5'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                <Layers className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />
                                <span>Customizable Dashboard</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}


                </>
              )}
            </div>

            {/* Sidebar Toggle Chevron Button */}
            <div className="p-2 border-t border-[var(--border-color)] flex justify-center bg-[var(--bg-secondary)]">
              <button
                onClick={() => {
                  setSidebarCollapsed(!sidebarCollapsed);
                  setActivePopoverCategory(null);
                }}
                className="p-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors shadow-sm flex items-center justify-center"
                title={sidebarCollapsed ? "Expand Navigation" : "Collapse Navigation"}
              >
                {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Sidebar System Info */}
            <div 
              onClick={() => setShowPlatformStatusModal(true)}
              className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-primary)] text-center text-[10px] text-[var(--text-muted)] flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[var(--bg-tertiary)] transition-all select-none"
              title="Click to view detailed system health metrics"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-500 shrink-0 animate-pulse" />
              {!sidebarCollapsed && (
                <span className="font-semibold text-[var(--text-secondary)] truncate">
                  Platform Status: <span className="text-emerald-500 font-extrabold">ACTIVE</span>
                </span>
              )}
            </div>
          </aside>

          {/* ==========================================
              MAIN CONTENT VIEWPORT
              ========================================== */}
          <div className={`flex-1 ${sidebarCollapsed ? 'ml-16' : 'ml-64'} flex flex-col min-h-screen transition-all duration-300`}>
            
            {/* Top Workspace Header */}
            <header className="sticky top-0 z-20 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-6 py-4 flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-indigo-500 tracking-wider uppercase font-display">Workstation Hub</span>
                <span className="text-slate-400">/</span>
                <h1 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 leading-none uppercase">
                  {selectedCompany ? `${selectedCompany.name} Profile` : activeWorkspaceModule.replace('_', ' ')}
                </h1>
              </div>

              {/* Top Right Corner Status */}
              <div className="flex items-center gap-4">
                {/* Backup Info & Trigger */}
                <div className="flex items-center gap-2 border-r border-[var(--border-color)] pr-4">
                  <button
                    onClick={() => {
                      setActiveWorkspaceModule('general_admin');
                      setAdminTab('backup');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors text-xs font-bold cursor-pointer"
                    title="Initiate Backup"
                  >
                    <Database className="w-3.5 h-3.5" /> Backup Now
                  </button>
                  <div className="text-[9px] text-[var(--text-secondary)] font-mono leading-tight">
                    <div>Last Backup</div>
                    <div className="text-[var(--text-primary)] font-bold">Today, 10:30 AM</div>
                  </div>
                </div>

                {/* Online/Offline Status */}
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isOnline ? 'text-[var(--text-primary)]' : 'text-rose-400'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </header>

            {/* Central Work Content Pane */}
            <main className="flex-1 p-6 relative select-none">
              
              {(errorMsg || successMsg) && (
                <div className="mb-6 max-w-4xl mx-auto">
                  {errorMsg && (
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-center gap-3 text-red-500 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}
                  {successMsg && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg flex items-center gap-3 text-emerald-500 text-xs">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>{successMsg}</span>
                    </div>
                  )}
                </div>
              )}

              {/* ==========================================
                  DASHBOARD HOME VIEW (EMPTY / WELCOME STATE)
                  ========================================== */}
              {activeWorkspaceModule === 'dashboard' && !selectedCompany && (
                user.isSuperAdmin ? (
                  <div className="max-w-4xl mx-auto my-12 text-center select-none">
                    <div className="p-4 bg-indigo-500/5 text-indigo-500 border border-indigo-500/10 rounded-2xl w-fit mx-auto mb-6">
                      <Building className="w-12 h-12" />
                    </div>
                    <h2 className="text-xl font-bold text-[var(--text-primary)] font-display">
                      Welcome, System Super Administrator
                    </h2>
                    <p className="text-[var(--text-secondary)] text-xs mt-2 max-w-md mx-auto leading-relaxed">
                      Select a section from the left collapsing categories to manage corporate configurations, process pipelines, or monitor audit trails.
                    </p>
                    
                    <div className="mt-8 border-t border-[var(--border-color)] pt-8">
                      <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Enterprise Tenants Overview</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 rounded-xl text-left">
                          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Total Spawning Tenants</span>
                          <p className="text-2xl font-bold text-indigo-500 mt-1 font-display">{companies.length}</p>
                        </div>
                        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 rounded-xl text-left">
                          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">System Nodes</span>
                          <p className="text-2xl font-bold text-emerald-500 mt-1 font-display">ACTIVE</p>
                        </div>
                        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 rounded-xl text-left">
                          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Active WebSockets</span>
                          <p className="text-2xl font-bold text-purple-500 mt-1 font-display">MONITORED</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <CustomDashboard
                    user={user!}
                    token={token || ''}
                    backendUrl={BACKEND_URL}
                    socket={socketRef.current}
                    workspaceStats={workspaceStats}
                    onNavigate={(module) => {
                      if (module === 'general_admin') {
                        setActiveWorkspaceModule('general_admin');
                        setAdminTab('profile');
                      } else {
                        setActiveWorkspaceModule(module);
                      }
                    }}
                  />
                )
              )}

              {/* ==========================================
                  SUPER ADMIN VIEW A: CREATE COMPANY
                  ========================================== */}
              {user.isSuperAdmin && activeWorkspaceModule === 'spawn_company' && !selectedCompany && (
                <div className="max-w-xl mx-auto bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 rounded-2xl shadow-sm">
                  <h3 className="font-bold text-base text-[var(--text-primary)] border-b border-[var(--border-color)] pb-3 font-display">
                    Spawn Corporate Tenant (Multi-Tenant Node)
                  </h3>
                  
                  <form onSubmit={handleCreateCompanySubmit} className="mt-4 flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Company Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Acme Corp"
                          value={newCompany.name}
                          onChange={e => setNewCompany({ ...newCompany, name: e.target.value })}
                          className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Unique Company Code</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. ACME"
                          value={newCompany.companyCode}
                          onChange={e => setNewCompany({ ...newCompany, companyCode: e.target.value.toUpperCase() })}
                          className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs"
                        />
                      </div>
                          {/* Subscription Modules Toggle Switches - replaced flat view with hierarchical tree */}
                    <div className="col-span-1 md:col-span-2 text-left">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-[10px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Subscription Feature Modules</label>
                        <button type="button" onClick={handleEnableAllNewCompany} className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold shadow-sm transition-colors cursor-pointer">
                          Enable All Categories & Features
                        </button>
                      </div>
                      <div className="mb-4 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Activity className="h-4 w-4 text-[var(--text-muted)]" />
                        </div>
                        <input
                          type="text"
                          placeholder="Search features or categories..."
                          value={featureSearchTerm}
                          onChange={(e) => setFeatureSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-xs focus:outline-none focus:border-indigo-500/50 text-[var(--text-primary)] transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-3">
                        {filteredHierarchy.map((cat: any) => {
                          const isParentActive = newCompany.features.includes(cat.key);
                          const isNotifications = cat.key === 'NOTIFICATIONS';
                          const isExpanded = expandedFeatureCategories.includes(cat.key) || cat.isMatch;

                          return (
                            <div key={cat.key} className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col gap-3 select-none">
                              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]/50">
                                <div className="text-left cursor-pointer flex-1" onClick={() => toggleCategoryAccordion(cat.key)}>
                                  <span className="text-xs font-extrabold text-[var(--text-primary)] block font-display uppercase tracking-wider flex items-center gap-2">
                                    {isExpanded ? <ChevronDown size={14} className="text-indigo-500" /> : <ChevronRight size={14} className="text-slate-400" />}
                                    <span className={`w-2.5 h-2.5 rounded-full ${isParentActive ? 'bg-indigo-500 animate-pulse' : 'bg-slate-500'}`} />
                                    {cat.name}
                                  </span>
                                  <span className="text-[9px] text-[var(--text-muted)] mt-0.5 block ml-6">{cat.desc}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {!isNotifications && (
                                    <button
                                      type="button"
                                      onClick={() => handleEnableCategoryAllNewCompany(cat.key)}
                                      className="px-2 py-1 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 cursor-pointer"
                                    >
                                      ENABLE ALL
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    disabled={isNotifications}
                                    onClick={() => handleToggleNewCompanyFeatureHierarchical(cat.key)}
                                    className={`px-3 py-1 rounded text-[10px] font-extrabold transition-colors cursor-pointer ${
                                      isNotifications 
                                        ? 'bg-indigo-500/20 text-indigo-400 cursor-not-allowed border border-indigo-500/30'
                                        : isParentActive 
                                          ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                                          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                                  >
                                    {isNotifications ? 'ENFORCED' : isParentActive ? 'ENABLED' : 'DISABLED'}
                                  </button>
                                </div>
                              </div>

                              {/* Child items grid */}
                              {isExpanded && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1 pl-4 border-l-2 border-indigo-500/10">
                                {cat.children.map((child: any) => {
                                  const isChildActive = newCompany.features.includes(child.key);
                                  const isLocked = !isParentActive; // Lock if parent category is disabled

                                  return (
                                    <div 
                                      key={child.key}
                                      className={`p-2.5 border rounded-lg flex items-center justify-between transition-all ${
                                        isLocked
                                          ? 'opacity-40 bg-[var(--bg-tertiary)] border-[var(--border-color)] cursor-not-allowed'
                                          : isChildActive
                                            ? 'bg-indigo-500/5 border-indigo-500/30'
                                            : 'bg-[var(--bg-primary)] border-[var(--border-color)] hover:border-[var(--border-active)]'
                                      }`}
                                    >
                                      <div className="text-left max-w-[70%]">
                                        <span className="text-[11px] font-bold text-[var(--text-primary)] block font-display leading-tight">{child.name}</span>
                                        <span className="text-[8.5px] text-[var(--text-muted)] leading-tight block mt-0.5">{child.desc}</span>
                                      </div>

                                      <button
                                        type="button"
                                        disabled={isLocked || (isNotifications && child.key === 'NOTIFICATIONS_PUSH')} // Push is enforced in creator
                                        onClick={() => handleToggleNewCompanyFeatureHierarchical(child.key)}
                                        className={`px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-colors ${
                                          isLocked
                                            ? 'bg-transparent text-[var(--text-muted)] border border-dashed border-[var(--border-color)] cursor-not-allowed'
                                            : isChildActive
                                              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                              : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                        }`}
                                      >
                                        {isLocked ? 'LOCKED' : isChildActive ? 'ACTIVE' : 'OFF'}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>                </div>

                    <div className="border-t border-[var(--border-color)] pt-4 mt-2">
                      <h4 className="text-xs font-bold text-indigo-400 mb-3 font-display">Provision First Corporate Admin (Bypasses approvals)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Username</label>
                          <input
                            type="text"
                            required
                            placeholder="admin"
                            value={newCompany.adminUsername}
                            onChange={e => setNewCompany({ ...newCompany, adminUsername: e.target.value })}
                            className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Admin Mobile No</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. +919999999999"
                            value={newCompany.adminMobile}
                            onChange={e => setNewCompany({ ...newCompany, adminMobile: e.target.value })}
                            className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Admin Password</label>
                          <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={newCompany.adminPassword}
                            onChange={e => setNewCompany({ ...newCompany, adminPassword: e.target.value })}
                            className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg text-xs cursor-pointer"
                    >
                      {loading ? 'Provisioning Tenant Nodes...' : 'Provision Corporate Tenant'}
                    </button>
                  </form>
                </div>
              )}

              {/* ==========================================
                  SUPER ADMIN VIEW B: DETAILED COMPANY PROFILE
                  ========================================== */}
              {user.isSuperAdmin && selectedCompany && (
                <div className="max-w-4xl mx-auto flex flex-col gap-6 select-none animate-fade-in">
                  
                  {/* General company profile header */}
                  <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 px-2 py-0.5 rounded font-mono uppercase">
                          Code: {selectedCompany.companyCode}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          selectedCompany.status === 'ACTIVE' 
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                            : 'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}>
                          {selectedCompany.status}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-[var(--text-primary)] mt-1.5 font-display">{selectedCompany.name} Workspace Profile</h2>
                      <p className="text-[var(--text-muted)] text-[10px] mt-1">Tenant ID: {selectedCompany.id} | Provisioned: {new Date(selectedCompany.createdAt).toLocaleDateString()}</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditCompanyForm({
                            name: selectedCompany.name,
                            companyCode: selectedCompany.companyCode,
                            createdAt: selectedCompany.createdAt ? selectedCompany.createdAt.split('T')[0] : ''
                          });
                          setShowEditCompanyModal(true);
                        }}
                        className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        Edit Profile
                      </button>
                      <button
                        onClick={handleToggleCompanyStatus}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          selectedCompany.status === 'ACTIVE'
                            ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20'
                        }`}
                      >
                        {selectedCompany.status === 'ACTIVE' ? 'Suspend Tenant' : 'Activate Tenant'}
                      </button>
                      <button
                        onClick={() => setSelectedCompany(null)}
                        className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] px-4 py-2 rounded-lg text-xs font-semibold hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        Close Profile
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Subscription feature toggles card - replaced flat checkboxes with hierarchical accordion tree */}
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 rounded-2xl flex flex-col gap-4 col-span-1 select-none">
                      <h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2 font-display">
                        Hierarchical Feature Configuration
                      </h3>
                      <p className="text-[var(--text-secondary)] text-[10px] leading-relaxed">
                        Toggle category locks or individually assign active features for this corporate tenant. Child sub-features auto-enable their parent categories.
                      </p>

                      <div className="flex items-center justify-between mt-3 mb-1">
                        <label className="text-[10px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Subscription Feature Modules</label>
                        <button type="button" onClick={handleEnableAllCompany} className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold shadow-sm transition-colors cursor-pointer">
                          Enable All Categories & Features
                        </button>
                      </div>
                      <div className="mb-4 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Activity className="h-4 w-4 text-[var(--text-muted)]" />
                        </div>
                        <input
                          type="text"
                          placeholder="Search features or categories..."
                          value={featureSearchTerm}
                          onChange={(e) => setFeatureSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-xs focus:outline-none focus:border-indigo-500/50 text-[var(--text-primary)] transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-3">
                        {filteredHierarchy.map((cat: any) => {
                          const activeKeys = selectedCompany.features.map((f: any) => f.feature.key);
                          const isParentActive = activeKeys.includes(cat.key);
                          const isNotifications = cat.key === 'NOTIFICATIONS';
                          const isExpanded = expandedFeatureCategories.includes(cat.key) || cat.isMatch;

                          return (
                            <div key={cat.key} className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 flex flex-col gap-2.5 select-none">
                              <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border-color)]/50">
                                <div className="text-left cursor-pointer flex-1" onClick={() => toggleCategoryAccordion(cat.key)}>
                                  <span className="text-[11px] font-extrabold text-[var(--text-primary)] block font-display uppercase tracking-wider flex items-center gap-2">
                                    {isExpanded ? <ChevronDown size={14} className="text-indigo-500" /> : <ChevronRight size={14} className="text-slate-400" />}
                                    <span className={`w-2 h-2 rounded-full ${isParentActive ? 'bg-indigo-500 animate-pulse' : 'bg-slate-500'}`} />
                                    {cat.name}
                                  </span>
                                  <span className="text-[9px] text-[var(--text-muted)] mt-0.5 block ml-6">{cat.desc}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {!isNotifications && (
                                    <button
                                      type="button"
                                      onClick={() => handleEnableCategoryAllCompany(cat.key)}
                                      className="px-2 py-1 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 cursor-pointer"
                                    >
                                      ENABLE ALL
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    disabled={isNotifications}
                                    onClick={() => handleToggleCompanyFeatureHierarchical(cat.key)}
                                    className={`px-2 py-0.5 rounded text-[9px] font-extrabold transition-colors cursor-pointer ${
                                      isNotifications 
                                        ? 'bg-indigo-500/20 text-indigo-400 cursor-not-allowed border border-indigo-500/30'
                                        : isParentActive 
                                          ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                                          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                                  >
                                    {isNotifications ? 'ENFORCED' : isParentActive ? 'ENABLED' : 'DISABLED'}
                                  </button>
                                </div>
                              </div>

                              {/* Child items grid */}
                              {isExpanded && (
                              <div className="grid grid-cols-1 gap-2 mt-0.5 pl-3 border-l-2 border-indigo-500/10 text-left">
                                {cat.children.map((child: any) => {
                                  const isChildActive = activeKeys.includes(child.key);
                                  const isLocked = !isParentActive;

                                  return (
                                    <div 
                                      key={child.key}
                                      className={`p-2 border rounded-lg flex items-center justify-between transition-all ${
                                        isLocked
                                          ? 'opacity-40 bg-[var(--bg-tertiary)] border-[var(--border-color)] cursor-not-allowed'
                                          : isChildActive
                                            ? 'bg-indigo-500/5 border-indigo-500/30'
                                            : 'bg-[var(--bg-primary)] border-[var(--border-color)] hover:border-[var(--border-active)]'
                                      }`}
                                    >
                                      <div className="text-left max-w-[70%]">
                                        <span className="text-[10px] font-bold text-[var(--text-primary)] block font-display leading-tight">{child.name}</span>
                                        <span className="text-[8px] text-[var(--text-muted)] leading-tight block mt-0.5">{child.desc}</span>
                                      </div>

                                      <button
                                        type="button"
                                        disabled={isLocked || (isNotifications && child.key === 'NOTIFICATIONS_PUSH')}
                                        onClick={() => handleToggleCompanyFeatureHierarchical(child.key)}
                                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold cursor-pointer transition-colors ${
                                          isLocked
                                            ? 'bg-transparent text-[var(--text-muted)] border border-dashed border-[var(--border-color)] cursor-not-allowed'
                                            : isChildActive
                                              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                              : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                        }`}
                                      >
                                        {isLocked ? 'LOCKED' : isChildActive ? 'ACTIVE' : 'OFF'}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Corporate Admin addition card */}
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 rounded-2xl flex flex-col gap-4">
                      <h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2 font-display">
                        Provision Additional Corporate Admin
                      </h3>
                      
                      <form onSubmit={handleCreateNewAdminSubmit} className="flex flex-col gap-3 mt-1">
                        <div>
                          <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Username</label>
                          <input
                            type="text"
                            required
                            placeholder="Enter username"
                            value={newCompanyAdmin.username}
                            onChange={e => setNewCompanyAdmin({ ...newCompanyAdmin, username: e.target.value })}
                            className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Mobile No</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. +918888888888"
                            value={newCompanyAdmin.mobileNo}
                            onChange={e => setNewCompanyAdmin({ ...newCompanyAdmin, mobileNo: e.target.value })}
                            className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Password</label>
                          <input
                            type="password"
                            required
                            placeholder="Minimum 6 characters"
                            value={newCompanyAdmin.password}
                            onChange={e => setNewCompanyAdmin({ ...newCompanyAdmin, password: e.target.value })}
                            className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs"
                          />
                        </div>
                        
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer mt-2"
                        >
                          {loading ? 'Registering Admin...' : 'Register Corporate Admin'}
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Registered corporate admins overview list */}
                  <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 rounded-2xl">
                    <h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border-color)] pb-3 mb-4 font-display">
                      Corporate Users & Admins Directory
                    </h3>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-bold">
                            <th className="py-2.5 px-3">Username</th>
                            <th className="py-2.5 px-3">Role</th>
                            <th className="py-2.5 px-3">Mobile No</th>
                            <th className="py-2.5 px-3">Joined Date</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCompanyUsers.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center py-6 text-[var(--text-muted)]">No users found under this company.</td>
                            </tr>
                          ) : (
                            selectedCompanyUsers.map(usr => (
                              <tr key={usr.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-primary)] transition-colors">
                                <td className="py-3 px-3 font-bold text-[var(--text-primary)]">{usr.username}</td>
                                <td className="py-3 px-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    usr.role === 'Admin' 
                                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                                      : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                                  }`}>
                                    {usr.role || 'Employee'}
                                  </span>
                                </td>
                                <td className="py-3 px-3 font-mono">{usr.mobileNo}</td>
                                <td className="py-3 px-3 text-[var(--text-secondary)]">{new Date(usr.createdAt).toLocaleDateString()}</td>
                                <td className="py-3 px-3 text-center">
                                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                                    usr.status === 'ACTIVE' 
                                      ? 'bg-emerald-500/10 text-emerald-500' 
                                      : 'bg-red-500/10 text-red-500'
                                  }`}>
                                    {usr.status}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right flex gap-1.5 justify-end">
                                  <button
                                    onClick={() => {
                                      setEditingUser(usr);
                                      setEditUserForm({
                                        username: usr.username,
                                        password: '',
                                        mobileNo: usr.mobileNo || '',
                                        email: usr.email || '',
                                        status: usr.status
                                      });
                                      setShowEditUserModal(true);
                                    }}
                                    className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded text-[10px] font-extrabold cursor-pointer transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(usr.id)}
                                    className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded text-[10px] font-extrabold cursor-pointer transition-colors"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ==========================================
                  STANDARD USER VIEW A: CRM PIPELINES Mock
                  ========================================== */}
              {activeWorkspaceModule === 'crm' && !selectedCompany && (
                  <CrmModule user={user!} activeTab={activeWorkspaceSubModule} token={token || ''} backendUrl={BACKEND_URL} />
                )}
  
                {activeWorkspaceModule === 'hr' && !selectedCompany && (
                  <HumanResources user={user!} activeTab={activeWorkspaceSubModule} token={token || ''} backendUrl={BACKEND_URL} />
                )}
  
                {activeWorkspaceModule === 'finance' && !selectedCompany && (
                <FinanceAccounting
                  user={user!}
                  token={token || ''}
                  backendUrl={BACKEND_URL}
                  activeSubModule={activeWorkspaceSubModule}
                  initialTab={financeDeepTab as any}
                  initialSubTab={financeDeepSubTab}
                />
              )}

              {activeWorkspaceModule === 'master_data' && !selectedCompany && (
                <div className="flex-1 w-full bg-[var(--bg-primary)] overflow-hidden flex flex-col">
                  {(!activeWorkspaceSubModule || activeWorkspaceSubModule === 'MDM_PRODUCT') && <ProductMasterUI token={token || ''} backendUrl={BACKEND_URL} />}
                  {activeWorkspaceSubModule === 'MDM_CUSTOMER' && <CustomerMasterUI token={token || ''} backendUrl={BACKEND_URL} />}
                  {activeWorkspaceSubModule === 'MDM_VENDOR' && <VendorMasterUI token={token || ''} backendUrl={BACKEND_URL} />}
                  {activeWorkspaceSubModule === 'MDM_EMPLOYEE' && <EmployeeMasterUI token={token || ''} backendUrl={BACKEND_URL} />}
                  {activeWorkspaceSubModule === 'MDM_WAREHOUSE' && <WarehouseMasterUI token={token || ''} backendUrl={BACKEND_URL} />}
                  {activeWorkspaceSubModule === 'MDM_FINANCE' && <FinanceMastersUI token={token || ''} backendUrl={BACKEND_URL} />}
                  {activeWorkspaceSubModule === 'MDM_CLASSIFICATION' && <ClassificationMastersUI token={token || ''} backendUrl={BACKEND_URL} />}
                </div>
              )}

              {activeWorkspaceModule === 'general_admin' && !selectedCompany && (
                <GeneralAdmin
                  user={user as any}
                  token={token || ''}
                  backendUrl={BACKEND_URL}
                  socket={socketRef.current}
                  companyFeatures={companyFeatures}
                  onUpdateFeatures={setCompanyFeatures}
                  initialTab={adminTab as any}
                  initialOrgSubTab={adminOrgSubTab as any}
                  activeTab={activeWorkspaceSubModule}
                />
              )}

              {/* ==========================================
                  COMPANY ADMIN VIEW A: USER APPROVALS
                  ========================================== */}
              {user.role === 'Admin' && activeWorkspaceModule === 'approvals' && !selectedCompany && (
                <div className="max-w-4xl mx-auto select-none animate-fade-in">
                  <h3 className="font-bold text-base text-[var(--text-primary)] border-b border-[var(--border-color)] pb-3 mb-4 font-display">
                    Signups Awaiting Verification (Security Queue)
                  </h3>

                  {pendingUsers.length === 0 ? (
                    <div className="bg-[var(--bg-secondary)] p-12 text-center rounded-2xl border border-[var(--border-color)]">
                      <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                      <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Approval Queue Clear</h4>
                      <p className="text-[var(--text-secondary)] text-xs mt-1">No employee registration requests are currently pending vetting.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {pendingUsers.map(usr => (
                        <div key={usr.id} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="text-left">
                            <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">{usr.username}</h4>
                            <p className="text-[var(--text-secondary)] text-[11px] mt-0.5">Mobile: {usr.mobileNo} | Email: {usr.email || 'N/A'}</p>
                            <span className="text-[9px] text-[var(--text-muted)]">Signed up: {new Date(usr.createdAt).toLocaleString()}</span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div>
                              <select
                                value={approveSelectedRole[usr.id] || ''}
                                onChange={e => setApproveSelectedRole({ ...approveSelectedRole, [usr.id]: e.target.value })}
                                className="bg-[var(--bg-primary)] border border-[var(--border-color)] px-2.5 py-1.5 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                              >
                                <option value="">-- Assign Role --</option>
                                {companyRoles.map(role => (
                                  <option key={role.id} value={role.id}>{role.name}</option>
                                ))}
                              </select>
                            </div>

                            <button
                              onClick={() => handleApproveUser(usr.id)}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-1.5 rounded-lg text-xs cursor-pointer"
                            >
                              Approve Employee
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ==========================================
                  COMPANY ADMIN VIEW B: ROLE PERMISSIONS DESIGNER
                  ========================================== */}
              {user.role === 'Admin' && activeWorkspaceModule === 'role_designer' && !selectedCompany && (
                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 select-none animate-fade-in">
                  
                  {/* Left Role designer creator */}
                  <div className="md:col-span-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] p-5 rounded-2xl">
                    <h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border-color)] pb-3 mb-4 font-display">
                      Create Custom Corporate Role
                    </h3>

                    <form onSubmit={handleCreateRoleSubmit} className="flex flex-col gap-4">
                      <div>
                        <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Role Title</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Sales Manager"
                          value={newRole.name}
                          onChange={e => setNewRole({ ...newRole, name: e.target.value })}
                          className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] py-2 px-3 rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-2">RBAC Scope Authorization</label>
                        
                        <div className="flex flex-col gap-3">
                          {['CRM', 'HR', 'FINANCE'].map(module => {
                            const isEnabled = companyFeatures.includes(module);
                            return (
                              <div 
                                key={module} 
                                className={`p-2.5 border rounded-xl text-left ${
                                  isEnabled ? 'bg-[var(--bg-primary)] border-[var(--border-color)]' : 'bg-red-500/5 border-red-500/10 opacity-60'
                                }`}
                              >
                                <span className="font-bold text-[10px] text-[var(--text-primary)] block font-display">{module} Module</span>
                                <div className="flex gap-3 mt-1.5">
                                  {['read', 'write', 'delete'].map(action => (
                                    <label key={action} className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]">
                                      <input
                                        type="checkbox"
                                        disabled={!isEnabled}
                                        checked={newRole.permissions[module as 'CRM' | 'HR' | 'FINANCE'].includes(action)}
                                        onChange={() => togglePermission(module as 'CRM' | 'HR' | 'FINANCE', action)}
                                        className="w-3.5 h-3.5 rounded text-indigo-600 bg-gray-900 border-gray-800"
                                      />
                                      <span className="capitalize">{action}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer"
                      >
                        Create Custom Role
                      </button>
                    </form>
                  </div>

                  {/* Right existing Roles list */}
                  <div className="md:col-span-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] p-5 rounded-2xl">
                    <h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border-color)] pb-3 mb-4 font-display">
                      Role Permissions Matrices
                    </h3>

                    <div className="flex flex-col gap-3">
                      {companyRoles.map(role => (
                        <div key={role.id} className="p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-left">
                          <h4 className="font-bold text-xs text-[var(--text-primary)] font-display">{role.name} Role</h4>
                          
                          <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-[var(--border-color)]">
                            {Object.entries(role.permissions).map(([mod, actions]: any) => (
                              <div key={mod} className="text-[10px]">
                                <span className="font-bold text-[9px] text-[var(--text-secondary)] tracking-wider uppercase block">{mod} Scope</span>
                                <span className="text-[var(--text-muted)] truncate block mt-0.5">
                                  {actions.length === 0 ? 'NO ACCESS' : actions.join(', ').toUpperCase()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ==========================================
                  COMPANY ADMIN VIEW C: EMPLOYEE DIRECTORY
                  ========================================== */}
              {user.role === 'Admin' && activeWorkspaceModule === 'employee_directory' && !selectedCompany && (
                <div className="max-w-4xl mx-auto bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 rounded-2xl select-none animate-fade-in">
                  <h3 className="font-bold text-base text-[var(--text-primary)] border-b border-[var(--border-color)] pb-3 mb-4 font-display">
                    Corporate Employees Directory
                  </h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-bold">
                          <th className="py-2.5 px-3">Username</th>
                          <th className="py-2.5 px-3">Role</th>
                          <th className="py-2.5 px-3">Mobile No</th>
                          <th className="py-2.5 px-3">Joined Date</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companyUsers.map(emp => (
                          <tr key={emp.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-primary)]">
                            <td className="py-3 px-3 font-bold text-[var(--text-primary)]">{emp.username}</td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                emp.role === 'Admin' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-[var(--bg-tertiary)]'
                              }`}>
                                {emp.role || 'Employee'}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono">{emp.mobileNo}</td>
                            <td className="py-3 px-3 text-[var(--text-secondary)]">{new Date(emp.createdAt).toLocaleDateString()}</td>
                            <td className="py-3 px-3 text-center">
                              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                                emp.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                              }`}>
                                {emp.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ==========================================
                  IN-APP ALERTS / NOTIFICATIONS FEED MODULE
                  ========================================== */}

              {activeWorkspaceModule === 'inventory' && !selectedCompany && (
                <InventoryWarehouse user={user!} activeTab={activeWorkspaceSubModule} token={token || ''} backendUrl={BACKEND_URL} />
              )}
              {activeWorkspaceModule === 'purchase' && !selectedCompany && (
                <PurchaseProcurement user={user!} activeTab={activeWorkspaceSubModule} token={token || ''} backendUrl={BACKEND_URL} />
              )}
              {activeWorkspaceModule === 'sales' && !selectedCompany && (
                <SalesOrder user={user!} activeTab={activeWorkspaceSubModule} token={token || ''} backendUrl={BACKEND_URL} />
              )}
              {activeWorkspaceModule === 'manufacturing' && !selectedCompany && (
                <ManufacturingProduction user={user!} activeTab={activeWorkspaceSubModule} token={token || ''} backendUrl={BACKEND_URL} />
              )}
              {activeWorkspaceModule === 'quality' && !selectedCompany && (
                <QualityMaintenance user={user!} activeTab={activeWorkspaceSubModule} token={token || ''} backendUrl={BACKEND_URL} />
              )}
              {activeWorkspaceModule === 'email' && !selectedCompany && (
                <GlobalEmailSystem user={user!} activeTab={activeWorkspaceSubModule} token={token || ''} backendUrl={BACKEND_URL} />
              )}

              {activeWorkspaceModule === 'alerts' && !selectedCompany && (
                <div className="max-w-3xl mx-auto select-none animate-fade-in">
                  <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3 mb-4">
                    <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2 font-display">
                      <Bell className="w-5 h-5 text-purple-400" />
                      Alert Logs & Gateways
                    </h3>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-bold rounded">
                      ACTIVE
                    </span>
                  </div>



                  {alertsSubTab === 'alerts' && companyFeatures.includes('NOTIFICATIONS_PUSH') && (
                    <div className="animate-fade-in">
                      <div className="flex justify-end mt-4 mb-2">
                        <button 
                          onClick={() => setNotifications(prev => prev.map(n => ({...n, isRead: true})))} 
                          className="text-xs text-indigo-500 hover:underline font-bold font-display cursor-pointer bg-transparent border-0"
                        >
                          Mark all as read
                        </button>
                      </div>

                      <div className="flex flex-col gap-2">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl">
                            <p className="text-xs text-[var(--text-secondary)]">Your notifications ledger is clear.</p>
                          </div>
                        ) : (
                          notifications.map(n => (
                            <div 
                              key={n.id} 
                              onClick={() => handleMarkNotificationRead(n.id)}
                              className={`p-3 border rounded-xl flex items-start gap-3 transition-colors cursor-pointer text-left ${
                                n.isRead 
                                  ? 'bg-[var(--bg-secondary)]/30 border-[var(--border-color)]/50 opacity-60' 
                                  : 'bg-indigo-500/5 border-indigo-500/20 hover:border-indigo-500/30'
                              }`}
                            >
                              <div className={`p-2 rounded-lg shrink-0 ${n.isRead ? 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]' : 'bg-indigo-500/10 text-indigo-400'}`}>
                                <Bell className="w-4 h-4" />
                              </div>
                              <div className="text-left flex-1">
                                <div className="flex justify-between items-center">
                                  <span className={`text-[9px] font-bold tracking-widest uppercase ${n.isRead ? 'text-[var(--text-muted)]' : 'text-indigo-400'}`}>
                                    {n.category}
                                  </span>
                                  <span className="text-[9px] text-[var(--text-muted)]">
                                    {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </span>
                                </div>
                                <h4 className="font-bold text-xs text-[var(--text-primary)] mt-1 font-display">{n.title}</h4>
                                <p className="text-[10.5px] text-[var(--text-secondary)] mt-0.5 leading-normal">{n.message}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {alertsSubTab === 'audit_logs' && companyFeatures.includes('NOTIFICATIONS_AUDIT') && (
                    <div className="mt-6 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden p-6 animate-fade-in flex flex-col gap-4 text-left">
                      <div>
                        <h4 className="text-sm font-bold text-[var(--text-primary)] font-display">Secure Access & Database Audit Logs</h4>
                        <p className="text-[var(--text-secondary)] text-[10px] mt-0.5">Immutable write-ahead audit logging of administrative changes</p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-bold">
                              <th className="py-2.5 px-3">Audit ID</th>
                              <th className="py-2.5 px-3">Timestamp</th>
                              <th className="py-2.5 px-3">System Actor</th>
                              <th className="py-2.5 px-3">Action Description</th>
                              <th className="py-2.5 px-3 text-center">Security Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {auditLogs.map(log => (
                              <tr key={log.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-primary)] transition-colors">
                                <td className="py-3 px-3 font-mono text-[var(--text-muted)]">#AUD-{log.id}</td>
                                <td className="py-3 px-3 font-mono text-[var(--text-secondary)]">{log.time}</td>
                                <td className="py-3 px-3 font-bold text-indigo-400 font-display">{log.actor}</td>
                                <td className="py-3 px-3 text-[var(--text-secondary)]">{log.action}</td>
                                <td className="py-3 px-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                    log.status === 'SUCCESS' 
                                      ? 'bg-emerald-500/10 text-emerald-500' 
                                      : 'bg-amber-500/10 text-amber-500 font-bold animate-pulse'
                                  }`}>
                                    {log.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </main>
          </div>

          {/* ==========================================
              MODAL: USER SUBSCRIPTION DETAILS (Admin only)
              ========================================== */}
          {showSubscriptionModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none">
                <button 
                  onClick={() => setShowSubscriptionModal(false)}
                  className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color)]">
                  <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                    <Building className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[var(--text-primary)] font-display">Corporate Subscription Details</h3>
                    <p className="text-[var(--text-secondary)] text-[10px]">Active modular scopes for company workspace</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3.5">
                  <div className="bg-[var(--bg-tertiary)] p-3 rounded-lg border border-[var(--border-color)]">
                    <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-wider uppercase">Licensed Corporate Tenant</span>
                    <p className="text-xs font-bold text-[var(--text-primary)] mt-1 font-display">{user.companyName}</p>
                    <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">Corporate Code: <span className="font-mono text-indigo-400 font-bold">{user.companyCode}</span></span>
                  </div>

                  <div>
                    <span className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-2">Licensed Features & Modules</span>
                    <div className="flex flex-col gap-1.5">
                      {['CRM', 'HR', 'FINANCE', 'NOTIFICATIONS'].map(modKey => {
                        const isLicensed = companyFeatures.includes(modKey);
                        return (
                          <div key={modKey} className="flex items-center justify-between text-xs py-1 px-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg">
                            <span className="font-bold text-[11px] font-display">{modKey} Module</span>
                            {isLicensed ? (
                              <span className="px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-extrabold text-[8px] rounded uppercase flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> ACTIVE
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-500 font-extrabold text-[8px] rounded uppercase">
                                LOCKED
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowSubscriptionModal(false)}
                  className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer"
                >
                  Close Scope Panel
                </button>
              </div>
            </div>
          )}

          {/* ==========================================
              MODAL: PLATFORM HEALTH STATUS DETAILS
              ========================================== */}
          {showPlatformStatusModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg p-6 relative shadow-2xl text-left select-none animate-scale-up">
                <button 
                  onClick={() => setShowPlatformStatusModal(false)}
                  className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer animate-pulse"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color)]">
                  <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20">
                    <Activity className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[var(--text-primary)] font-display">System Platform Status Metrics</h3>
                    <p className="text-[var(--text-secondary)] text-[10px]">Real-time environment nodes & gateway diagnostics</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl flex flex-col hover:border-emerald-500/30 transition-all select-none">
                      <span className="text-[8.5px] font-bold text-[var(--text-muted)] tracking-wider uppercase">Express Web Server</span>
                      <span className="text-emerald-500 font-extrabold text-[11px] mt-1 flex items-center gap-1.5 font-display">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" /> ONLINE
                      </span>
                      <span className="text-[8px] text-[var(--text-secondary)] mt-1 font-mono">Port: 5000 | Host: localhost</span>
                    </div>

                    <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl flex flex-col hover:border-emerald-500/30 transition-all select-none">
                      <span className="text-[8.5px] font-bold text-[var(--text-muted)] tracking-wider uppercase">SQLite Database</span>
                      <span className="text-emerald-500 font-extrabold text-[11px] mt-1 flex items-center gap-1.5 font-display">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" /> CONNECTED
                      </span>
                      <span className="text-[8px] text-[var(--text-secondary)] mt-1 font-mono">dev.db | Prisma ORM</span>
                    </div>

                    <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl flex flex-col hover:border-emerald-500/30 transition-all select-none">
                      <span className="text-[8.5px] font-bold text-[var(--text-muted)] tracking-wider uppercase">WebSocket Gateway</span>
                      <span className="text-emerald-500 font-extrabold text-[11px] mt-1 flex items-center gap-1.5 font-display">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" /> BROADCASTING
                      </span>
                      <span className="text-[8px] text-[var(--text-secondary)] mt-1 font-mono">Engine.IO | Active Broker</span>
                    </div>

                    <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl flex flex-col hover:border-indigo-500/30 transition-all select-none">
                      <span className="text-[8.5px] font-bold text-[var(--text-muted)] tracking-wider uppercase">Gateway Latency</span>
                      <span className="text-indigo-400 font-extrabold text-[11px] mt-1 flex items-center gap-1.5 font-display font-mono">
                        12 ms
                      </span>
                      <span className="text-[8px] text-[var(--text-secondary)] mt-1">Live response synchronization</span>
                    </div>
                  </div>

                  <div className="bg-indigo-500/5 border border-indigo-500/10 p-3.5 rounded-xl text-left">
                    <h4 className="text-[10px] font-extrabold text-indigo-400 font-display uppercase tracking-wider">Monolithic Environment Metrics</h4>
                    <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed mt-1">
                      System workloads, background event dispatch queues, and database reads/writes are operating safely. Dynamic tenant modules are successfully synchronizing with high integrity.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowPlatformStatusModal(false)}
                  className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer"
                >
                  Close Status Monitor
                </button>
              </div>
            </div>
          )}

          {/* ==========================================
              MODAL: SUPER ADMIN - EDIT COMPANY PROFILE
              ========================================== */}
          {showEditCompanyModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none animate-scale-up">
                <button 
                  onClick={() => setShowEditCompanyModal(false)}
                  className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color)]">
                  <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                    <Building className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[var(--text-primary)] font-display">Edit Corporate Tenant Profile</h3>
                    <p className="text-[var(--text-secondary)] text-[10px]">Modify corporate metadata & registry files</p>
                  </div>
                </div>

                <form onSubmit={handleEditCompanyProfileSubmit} className="mt-4 flex flex-col gap-4">
                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Company Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Corporation"
                      value={editCompanyForm.name}
                      onChange={e => setEditCompanyForm({ ...editCompanyForm, name: e.target.value })}
                      className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Company Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ACME"
                      value={editCompanyForm.companyCode}
                      onChange={e => setEditCompanyForm({ ...editCompanyForm, companyCode: e.target.value })}
                      className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Joining Date (Provisioning Date)</label>
                    <input
                      type="date"
                      required
                      value={editCompanyForm.createdAt}
                      onChange={e => setEditCompanyForm({ ...editCompanyForm, createdAt: e.target.value })}
                      className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs"
                    />
                  </div>

                  <div className="flex gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => setShowEditCompanyModal(false)}
                      className="w-1/2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:text-[var(--text-primary)] font-bold py-2 rounded-lg text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-1/2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer animate-pulse"
                    >
                      {loading ? 'Saving Changes...' : 'Save Profile Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ==========================================
              MODAL: SUPER ADMIN - EDIT USER DETAILS
              ========================================== */}
          {showEditUserModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none animate-scale-up">
                <button 
                  onClick={() => { setShowEditUserModal(false); setEditingUser(null); }}
                  className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color)]">
                  <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[var(--text-primary)] font-display">Edit Company User Profile</h3>
                    <p className="text-[var(--text-secondary)] text-[10px]">Modify corporate credentials & access security</p>
                  </div>
                </div>

                <form onSubmit={handleEditUserSubmit} className="mt-4 flex flex-col gap-4">
                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Username</label>
                    <input
                      type="text"
                      required
                      value={editUserForm.username}
                      onChange={e => setEditUserForm({ ...editUserForm, username: e.target.value })}
                      className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Mobile No</label>
                    <input
                      type="text"
                      required
                      value={editUserForm.mobileNo}
                      onChange={e => setEditUserForm({ ...editUserForm, mobileNo: e.target.value })}
                      className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Email Address (Optional)</label>
                    <input
                      type="email"
                      value={editUserForm.email}
                      onChange={e => setEditUserForm({ ...editUserForm, email: e.target.value })}
                      className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">New Password (Optional)</label>
                    <input
                      type="password"
                      placeholder="Leave blank to keep current"
                      value={editUserForm.password}
                      onChange={e => setEditUserForm({ ...editUserForm, password: e.target.value })}
                      className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Vetting Status</label>
                    <select
                      value={editUserForm.status}
                      onChange={e => setEditUserForm({ ...editUserForm, status: e.target.value as any })}
                      className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] cursor-pointer focus:outline-none"
                    >
                      <option value="ACTIVE">ACTIVE (Verified Access)</option>
                      <option value="PENDING_APPROVAL">PENDING APPROVAL (Security Vetting)</option>
                      <option value="SUSPENDED">SUSPENDED (Locked Access)</option>
                    </select>
                  </div>

                  <div className="flex gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => { setShowEditUserModal(false); setEditingUser(null); }}
                      className="w-1/2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:text-[var(--text-primary)] font-bold py-2 rounded-lg text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-1/2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer animate-pulse"
                    >
                      {loading ? 'Saving Changes...' : 'Save User Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ==========================================
              REAL-TIME ENTERPRISE CHAT DRAWER
              ========================================== */}
          {showChatDrawer && (
            <div
              className="fixed bottom-24 z-40 w-[380px] h-[550px] bg-[var(--bg-card)]/95 backdrop-blur-md border border-[var(--border-color)] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-up text-left"
              style={{
                left: sidebarCollapsed ? '88px' : '280px',
                transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s ease',
              }}
            >
              {/* Header */}
              <div className="p-4 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-bold text-sm text-[var(--text-primary)] font-display">Corporate Messenger</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  {selectedChatGroup && (
                    <button
                      onClick={() => setChatActiveView('list')}
                      className="p-1 rounded hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                      title="Back to List"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setShowChatDrawer(false)}
                    className="p-1 rounded hover:bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* LIST VIEW */}
              {chatActiveView === 'list' && (
                <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-card)] select-none">
                  {/* Quick DM Search */}
                  <div className="p-3 border-b border-[var(--border-color)] flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase">Direct Colleague Messaging</span>
                      <button
                        onClick={() => {
                          setNewGroupType('GENERAL');
                          setShowCreateGroupModal(true);
                        }}
                        className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-transparent border-0 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> New Group
                      </button>
                    </div>
                    <div className="relative">
                      <UserPlus className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        placeholder="Search colleague directory..."
                        value={colleagueSearch}
                        onChange={e => setColleagueSearch(e.target.value)}
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] pl-8 pr-3 py-1.5 rounded-lg text-xs focus:outline-none"
                      />
                    </div>

                    {/* Colleague Search Results */}
                    {colleagueSearch.trim().length > 0 && (
                      <div className="max-h-28 overflow-y-auto border border-[var(--border-color)] bg-[var(--bg-primary)] rounded-lg p-1.5 flex flex-col gap-1 z-10">
                        {companyUsers
                          .filter(
                            u =>
                              u.id !== user?.id &&
                              u.username.toLowerCase().includes(colleagueSearch.toLowerCase())
                          )
                          .map(colleague => (
                            <button
                              key={colleague.id}
                              onClick={() => {
                                setColleagueSearch('');
                                handleStartDM(colleague.id);
                              }}
                              className="w-full text-left p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[11px] font-semibold text-[var(--text-primary)] flex items-center gap-2 cursor-pointer bg-transparent border-0"
                            >
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>{colleague.username}</span>
                              <span className="text-[8px] text-[var(--text-muted)] italic">({colleague.role || 'Employee'})</span>
                            </button>
                          ))}
                        {companyUsers.filter(
                          u =>
                            u.id !== user?.id &&
                            u.username.toLowerCase().includes(colleagueSearch.toLowerCase())
                        ).length === 0 && (
                          <div className="text-[10px] text-[var(--text-muted)] text-center py-2">No colleagues found</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Channels & DM Conversations */}
                  <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
                    {/* Groups Section */}
                    <div>
                      <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-wider uppercase block mb-1.5">Group Channels</span>
                      <div className="flex flex-col gap-1.5">
                        {chatGroups
                          .filter(g => g.type !== 'DIRECT')
                          .map(group => (
                            <button
                              key={group.id}
                              onClick={() => handleSelectChatGroup(group)}
                              className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer bg-transparent ${
                                selectedChatGroup?.id === group.id
                                  ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400 font-bold'
                                  : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] hover:border-[var(--border-color)]/80 text-[var(--text-primary)]'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {group.type === 'EXPENSE' ? (
                                  <Wallet className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                                )}
                                <div className="text-left">
                                  <span className="text-xs block font-bold truncate max-w-[200px]">{group.name}</span>
                                  <span className="text-[8px] text-[var(--text-muted)] block uppercase">
                                    {group.type} CHAT • {group.members?.length || 0} members
                                  </span>
                                </div>
                              </div>
                            </button>
                          ))}
                        {chatGroups.filter(g => g.type !== 'DIRECT').length === 0 && (
                          <div className="p-4 bg-[var(--bg-tertiary)]/50 rounded-xl text-center text-[10px] text-[var(--text-muted)]">
                            No active group channels.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* DMs Section */}
                    <div>
                      <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-wider uppercase block mb-1.5">Individual DMs</span>
                      <div className="flex flex-col gap-1.5">
                        {chatGroups
                          .filter(g => g.type === 'DIRECT')
                          .map(group => (
                            <button
                              key={group.id}
                              onClick={() => handleSelectChatGroup(group)}
                              className={`w-full text-left p-2.5 rounded-xl border flex items-center transition-all cursor-pointer bg-transparent ${
                                selectedChatGroup?.id === group.id
                                  ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400 font-bold'
                                  : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] hover:border-[var(--border-color)]/80 text-[var(--text-primary)]'
                              }`}
                            >
                              <User className="w-4 h-4 text-indigo-400 shrink-0 mr-2" />
                              <div className="text-left flex-1 min-w-0">
                                <span className="text-xs font-bold block truncate">{group.name}</span>
                                <span className="text-[8px] text-[var(--text-muted)] block">Direct Message</span>
                              </div>
                            </button>
                          ))}
                        {chatGroups.filter(g => g.type === 'DIRECT').length === 0 && (
                          <div className="p-4 bg-[var(--bg-tertiary)]/50 rounded-xl text-center text-[10px] text-[var(--text-muted)]">
                            No direct messages started. Search a colleague above to begin!
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ROOM VIEW */}
              {chatActiveView === 'room' && selectedChatGroup && (
                <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-card)]">
                  {/* Room Subheader */}
                  <div className="px-4 py-2 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/50 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedChatGroup.type === 'EXPENSE' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                      <span className="font-extrabold tracking-wider uppercase text-[9px] text-[var(--text-secondary)]">
                        {selectedChatGroup.type} CHANNEL
                      </span>
                    </div>

                    {selectedChatGroup.type !== 'DIRECT' && (
                      <button
                        onClick={() => setShowGroupSettingsModal(true)}
                        className="p-1 rounded hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer animate-fade-in"
                        title="Manage Room Members & Privacy"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Expense Stats Bar */}
                  {selectedChatGroup.type === 'EXPENSE' && (() => {
                    // Compute stats dynamically in pure React
                    let totalExp = 0;
                    const netBalances: Record<string, number> = {};
                    selectedChatGroup.members.forEach((m: any) => netBalances[m.userId] = 0);

                    chatMessages.forEach(msg => {
                      if (msg.type === 'EXPENSE') {
                        const data = typeof msg.expenseData === 'string' ? JSON.parse(msg.expenseData) : msg.expenseData;
                        if (data) {
                          totalExp += data.amount || 0;
                          const splits = data.splits || {};
                          const paidBy = data.paidBy;
                          netBalances[paidBy] = (netBalances[paidBy] || 0) + (data.amount || 0);
                          Object.entries(splits).forEach(([uId, share]) => {
                            netBalances[uId] = (netBalances[uId] || 0) - (share as number);
                          });
                        }
                      } else if (msg.type === 'PAYMENT') {
                        const data = typeof msg.expenseData === 'string' ? JSON.parse(msg.expenseData) : msg.expenseData;
                        if (data) {
                          netBalances[data.from] = (netBalances[data.from] || 0) + (data.amount || 0);
                          netBalances[data.to] = (netBalances[data.to] || 0) - (data.amount || 0);
                        }
                      }
                    });

                    const myBal = netBalances[user?.id || ''] || 0;

                    return (
                      <div className="bg-emerald-500/5 border-b border-[var(--border-color)] px-4 py-2 flex items-center justify-between text-[11px] select-none">
                        <div>
                          <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase block">Total Expenditure</span>
                          <span className="font-extrabold text-emerald-500">${totalExp.toFixed(2)}</span>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase block">My Net Balance</span>
                            <span className={`font-extrabold ${myBal > 0.01 ? 'text-emerald-500' : myBal < -0.01 ? 'text-rose-500' : 'text-[var(--text-secondary)]'}`}>
                              {myBal > 0.01 ? `+$${myBal.toFixed(2)}` : myBal < -0.01 ? `-$${Math.abs(myBal).toFixed(2)}` : '$0.00'}
                            </span>
                          </div>
                          <button
                            onClick={() => setChatActiveView('ledger')}
                            className="ml-1 px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 text-[9px] font-extrabold rounded uppercase cursor-pointer transition-colors"
                          >
                            Ledger
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Message Stream */}
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                    {chatMessages.length === 0 ? (
                      <div className="my-auto text-center p-6">
                        <p className="text-[11px] text-[var(--text-muted)]">This space is quiet. Send a message to get started!</p>
                      </div>
                    ) : (
                      chatMessages.map(msg => {
                        const isMe = msg.senderId === user?.id;
                        
                        if (msg.type === 'EXPENSE') {
                          const data = typeof msg.expenseData === 'string' ? JSON.parse(msg.expenseData) : msg.expenseData;
                          const payerName = selectedChatGroup.members.find((m: any) => m.userId === data?.paidBy)?.username || msg.senderName;
                          return (
                            <div key={msg.id} className="flex flex-col items-center my-1 select-none w-full animate-fade-in">
                              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 max-w-[280px] w-full text-xs">
                                <div className="flex items-center gap-1.5 text-emerald-500 font-extrabold text-[9px] tracking-wider uppercase mb-1">
                                  <Wallet className="w-3.5 h-3.5" /> EXPENSE REGISTERED
                                </div>
                                <h4 className="font-bold text-[var(--text-primary)] font-display">{data?.description}</h4>
                                <div className="flex justify-between items-center mt-2 pt-2 border-t border-[var(--border-color)]/40 text-[10px]">
                                  <span className="text-[var(--text-secondary)]">Amount: <span className="font-bold text-[var(--text-primary)]">${(data?.amount || 0).toFixed(2)}</span></span>
                                  <span className="text-[var(--text-secondary)]">Paid by: <span className="font-bold text-emerald-400">{payerName}</span></span>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        if (msg.type === 'PAYMENT') {
                          const data = typeof msg.expenseData === 'string' ? JSON.parse(msg.expenseData) : msg.expenseData;
                          const payerName = selectedChatGroup.members.find((m: any) => m.userId === data?.from)?.username || 'Someone';
                          const recipientName = selectedChatGroup.members.find((m: any) => m.userId === data?.to)?.username || 'Someone';
                          return (
                            <div key={msg.id} className="flex flex-col items-center my-1 select-none w-full animate-fade-in">
                              <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-3 max-w-[280px] w-full text-xs">
                                <div className="flex items-center gap-1.5 text-indigo-400 font-extrabold text-[9px] tracking-wider uppercase mb-1">
                                  <CheckCircle className="w-3.5 h-3.5" /> PAYMENT RECORDED
                                </div>
                                <p className="text-[10px] text-[var(--text-secondary)] font-semibold leading-relaxed">
                                  <span className="font-bold text-[var(--text-primary)]">{payerName}</span> paid <span className="font-bold text-[var(--text-primary)]">{recipientName}</span> <span className="font-bold text-indigo-400">${(data?.amount || 0).toFixed(2)}</span> to settle debts.
                                </p>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={msg.id} className={`flex flex-col max-w-[75%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'} select-text`}>
                            <span className="text-[8px] text-[var(--text-muted)] font-bold mb-0.5 px-1">{msg.senderName}</span>
                            <div className={`p-2.5 rounded-2xl text-xs leading-normal shadow-sm ${
                              isMe 
                                ? 'bg-indigo-600 text-white rounded-tr-none' 
                                : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)]/30 rounded-tl-none'
                            }`}>
                              {msg.message}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatMessagesEndRef} />
                  </div>

                  {/* Input Bar */}
                  <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      {selectedChatGroup.type === 'EXPENSE' && (
                        <div className="flex gap-1 mr-1">
                          <button
                            onClick={() => {
                              setExpensePaidBy(user?.id || '');
                              setShowAddExpenseModal(true);
                            }}
                            className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-lg cursor-pointer transition-colors"
                            title="Add Expense"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setPaymentFrom(user?.id || '');
                              setShowRecordPaymentModal(true);
                            }}
                            className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg cursor-pointer transition-colors"
                            title="Record Payment"
                          >
                            <Wallet className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      
                      <input
                        type="text"
                        placeholder="Type standard message..."
                        value={chatMessageInput}
                        onChange={e => setChatMessageInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSendChatMessage();
                        }}
                        className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-2 rounded-lg text-xs focus:outline-none"
                      />
                      <button
                        onClick={handleSendChatMessage}
                        className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg cursor-pointer transition-colors flex items-center justify-center"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* EXPENSE LEDGER VIEW */}
              {chatActiveView === 'ledger' && selectedChatGroup && (
                <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-card)]">
                  {/* Ledger Header */}
                  <div className="px-4 py-2 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/50 flex items-center gap-2 text-xs">
                    <button
                      onClick={() => setChatActiveView('room')}
                      className="p-1 rounded hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-extrabold tracking-wider uppercase text-[9px] text-[var(--text-secondary)]">
                      EXPENSE LEDGER & SETTLEMENTS
                    </span>
                  </div>

                  {/* Calculations */}
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs select-none">
                    {(() => {
                      const netBalances: Record<string, number> = {};
                      selectedChatGroup.members.forEach((m: any) => netBalances[m.userId] = 0);

                      chatMessages.forEach(msg => {
                        if (msg.type === 'EXPENSE') {
                          const data = typeof msg.expenseData === 'string' ? JSON.parse(msg.expenseData) : msg.expenseData;
                          if (data) {
                            const splits = data.splits || {};
                            const paidBy = data.paidBy;
                            netBalances[paidBy] = (netBalances[paidBy] || 0) + (data.amount || 0);
                            Object.entries(splits).forEach(([uId, share]) => {
                              netBalances[uId] = (netBalances[uId] || 0) - (share as number);
                            });
                          }
                        } else if (msg.type === 'PAYMENT') {
                          const data = typeof msg.expenseData === 'string' ? JSON.parse(msg.expenseData) : msg.expenseData;
                          if (data) {
                            netBalances[data.from] = (netBalances[data.from] || 0) + (data.amount || 0);
                            netBalances[data.to] = (netBalances[data.to] || 0) - (data.amount || 0);
                          }
                        }
                      });

                      // GREEDY ENGINE SETTLEMENT TRANSACTION RESOLUTIONS
                      const debtors: { userId: string; username: string; amount: number }[] = [];
                      const creditors: { userId: string; username: string; amount: number }[] = [];

                      Object.entries(netBalances).forEach(([uId, bal]) => {
                        const name = selectedChatGroup.members.find((m: any) => m.userId === uId)?.username || 'Unknown Colleague';
                        if (bal < -0.01) {
                          debtors.push({ userId: uId, username: name, amount: -bal });
                        } else if (bal > 0.01) {
                          creditors.push({ userId: uId, username: name, amount: bal });
                        }
                      });

                      debtors.sort((a, b) => b.amount - a.amount);
                      creditors.sort((a, b) => b.amount - a.amount);

                      const transactions: { fromId: string; fromName: string; toId: string; toName: string; amount: number }[] = [];
                      let dIdx = 0;
                      let cIdx = 0;

                      const tempDebtors = debtors.map(d => ({ ...d }));
                      const tempCreditors = creditors.map(c => ({ ...c }));

                      while (dIdx < tempDebtors.length && cIdx < tempCreditors.length) {
                        const debtor = tempDebtors[dIdx];
                        const creditor = tempCreditors[cIdx];
                        const settleAmount = Math.min(debtor.amount, creditor.amount);

                        if (settleAmount > 0.01) {
                          transactions.push({
                            fromId: debtor.userId,
                            fromName: debtor.username,
                            toId: creditor.userId,
                            toName: creditor.username,
                            amount: parseFloat(settleAmount.toFixed(2))
                          });
                        }

                        debtor.amount -= settleAmount;
                        creditor.amount -= settleAmount;

                        if (debtor.amount < 0.01) dIdx++;
                        if (creditor.amount < 0.01) cIdx++;
                      }

                      return (
                        <div className="flex flex-col gap-4 text-left">
                          <div>
                            <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Member Net Status</h4>
                            <div className="flex flex-col gap-1.5">
                              {Object.entries(netBalances).map(([uId, bal]) => {
                                const name = selectedChatGroup.members.find((m: any) => m.userId === uId)?.username || 'Someone';
                                return (
                                  <div key={uId} className="flex justify-between items-center p-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                                    <span className="font-semibold">{name}</span>
                                    <span className={`font-bold ${bal > 0.01 ? 'text-emerald-500' : bal < -0.01 ? 'text-rose-500' : 'text-[var(--text-muted)]'}`}>
                                      {bal > 0.01 ? `+$${bal.toFixed(2)}` : bal < -0.01 ? `-$${Math.abs(bal).toFixed(2)}` : 'Settle/Cleared'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="border-t border-[var(--border-color)] pt-3 mt-1">
                            <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Greedy Debt Clearance Recommendations</h4>
                            <div className="flex flex-col gap-1.5">
                              {transactions.length === 0 ? (
                                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-center font-semibold text-emerald-500 text-[10px]">
                                  🎉 ALL OUTSTANDING BALANCES FULLY SETTLED!
                                </div>
                              ) : (
                                transactions.map((t, idx) => {
                                  const amIDebtor = t.fromId === user?.id;
                                  return (
                                    <div key={idx} className="p-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] flex items-center justify-between text-[11.5px]">
                                      <div className="flex-1">
                                        <span className="font-bold text-[var(--text-primary)]">{t.fromName}</span> owes <span className="font-bold text-[var(--text-primary)]">{t.toName}</span> <span className="font-extrabold text-rose-500">${t.amount.toFixed(2)}</span>
                                      </div>
                                      {amIDebtor && (
                                        <button
                                          onClick={() => {
                                            setPaymentFrom(t.fromId);
                                            setPaymentTo(t.toId);
                                            setPaymentAmount(String(t.amount));
                                            setShowRecordPaymentModal(true);
                                          }}
                                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[9px] uppercase rounded cursor-pointer transition-colors"
                                        >
                                          Settle
                                        </button>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==========================================
              POPUP OVERLAY BACKDROP & DRAWER FOR ALERT FEED
              ========================================== */}
          {showAlertsPopup && (
            <div 
              className="fixed inset-0 z-30 bg-transparent cursor-default" 
              onClick={() => setShowAlertsPopup(false)}
            />
          )}

          {showAlertsPopup && (
            <div
              className="fixed bottom-40 z-40 w-[380px] h-[480px] bg-[var(--bg-card)]/95 backdrop-blur-md border border-[var(--border-color)] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-up text-left text-xs font-sans"
              style={{
                left: sidebarCollapsed ? '88px' : '280px',
                transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s ease',
              }}
            >
              {/* Header */}
              <div className="p-4 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-purple-500 animate-pulse" />
                  <h3 className="font-bold text-sm text-[var(--text-primary)] font-display">Alert Logs & Feed</h3>
                </div>
                <div className="flex items-center gap-2">
                  {notifications.filter((n: any) => !n.isRead).length > 0 && (
                    <button
                      onClick={async () => {
                        try {
                          await Promise.all(
                            notifications.filter((n: any) => !n.isRead).map((n: any) =>
                              apiRequest(`/api/notifications/${n.id}/read`, 'PATCH')
                            )
                          );
                          setNotifications(prev => prev.map((n: any) => ({ ...n, isRead: true })));
                        } catch (e) {}
                      }}
                      className="text-[9.5px] font-bold text-purple-400 hover:text-purple-300 border border-purple-500/25 bg-purple-500/5 px-2 py-0.5 rounded cursor-pointer transition-all"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setShowAlertsPopup(false)}
                    className="p-1 rounded hover:bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Feed Content */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-xs text-[var(--text-muted)] font-medium">
                    <Bell className="w-8 h-8 opacity-20 mb-2" />
                    <span>Your notification ledger is clear.</span>
                  </div>
                ) : (
                  notifications.map((n: any) => (
                    <div 
                      key={n.id} 
                      onClick={() => handleMarkNotificationRead(n.id)}
                      className={`p-3 border rounded-xl flex items-start gap-3 transition-all cursor-pointer text-left hover:shadow-md ${
                        n.isRead 
                          ? 'bg-[var(--bg-secondary)]/30 border-[var(--border-color)]/50 opacity-60' 
                          : 'bg-purple-500/5 border-purple-500/20 hover:border-purple-500/30'
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${n.isRead ? 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]' : 'bg-purple-500/10 text-purple-400'}`}>
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="flex justify-between items-center">
                          <span className={`text-[8.5px] font-extrabold tracking-widest uppercase ${n.isRead ? 'text-[var(--text-muted)]' : 'text-purple-400'}`}>
                            {n.category}
                          </span>
                          <span className="text-[8.5px] text-[var(--text-muted)] font-mono">
                            {new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <h4 className="font-bold text-[11px] text-[var(--text-primary)] mt-1 font-display leading-tight">{n.title}</h4>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 leading-snug">{n.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ==========================================
              LAUNCHER BUBBLE ACTION FOR ALERT LOGS
              ========================================== */}
          <button
            onClick={() => {
              setShowAlertsPopup(!showAlertsPopup);
              setShowChatDrawer(false);
            }}
            className={`fixed bottom-24 z-40 p-4 ${
              showAlertsPopup ? 'bg-purple-700' : 'bg-purple-600 hover:bg-purple-500'
            } hover:scale-105 active:scale-95 text-white rounded-full shadow-lg cursor-pointer transition-all duration-200 flex items-center justify-center`}
            style={{
              left: sidebarCollapsed ? '88px' : '280px',
              transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            title="Alert Logs & Gateways"
          >
            <Bell className="w-6 h-6" />
            {notifications.filter((n: any) => !n.isRead).length > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded-full border-2 border-slate-900 shadow-md animate-scale-up">
                {notifications.filter((n: any) => !n.isRead).length}
              </span>
            )}
          </button>

          {/* ==========================================
              LAUNCHER BUBBLE ACTION TRIGGER BUTTON
              ========================================== */}
          <button
            onClick={() => {
              setShowChatDrawer(!showChatDrawer);
              setShowAlertsPopup(false);
              setChatActiveView('list');
            }}
            className="fixed bottom-6 z-40 p-4 bg-indigo-600 hover:bg-indigo-500 hover:scale-105 active:scale-95 text-white rounded-full shadow-lg cursor-pointer transition-all duration-200 flex items-center justify-center"
            style={{
              left: sidebarCollapsed ? '88px' : '280px',
              transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            title="Corporate Chat Messenger"
          >
            <MessageSquare className="w-6 h-6 animate-pulse" />
          </button>

          {/* ==========================================
              MODAL: CREATE CHAT GROUP / CHANNEL
              ========================================== */}
          {showCreateGroupModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none animate-scale-up">
                <button 
                  onClick={() => setShowCreateGroupModal(false)}
                  className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color)]">
                  <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[var(--text-primary)] font-display">Spawn Corporate Chat Group</h3>
                    <p className="text-[var(--text-secondary)] text-[10px]">Create a new real-time communication space</p>
                  </div>
                </div>

                <form onSubmit={handleCreateChatGroupSubmit} className="mt-4 flex flex-col gap-4">
                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Group Channel Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sales Pipeline discussion"
                      value={newGroupName}
                      onChange={e => setNewGroupName(e.target.value)}
                      className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Channel Workspace Scope</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setNewGroupType('GENERAL')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                          newGroupType === 'GENERAL'
                            ? 'bg-indigo-600 text-white border-indigo-500'
                            : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        General Chat
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewGroupType('EXPENSE')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                          newGroupType === 'EXPENSE'
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        Expense Tracker
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 border border-[var(--border-color)] rounded-xl bg-[var(--bg-tertiary)] mt-1 select-none">
                    <div>
                      <span className="font-bold text-[11px] block font-display">Restrict Visibility (Private Channel)</span>
                      <span className="text-[9px] text-[var(--text-secondary)] mt-0.5 block">Only added members will see this space</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={newGroupIsPrivate}
                        onChange={e => setNewGroupIsPrivate(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <div className="flex gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateGroupModal(false)}
                      className="w-1/2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:text-[var(--text-primary)] font-bold py-2 rounded-lg text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-1/2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer"
                    >
                      Create Channel Space
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ==========================================
              MODAL: ADD EXPENSE TO CHANNEL
              ========================================== */}
          {showAddExpenseModal && selectedChatGroup && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none animate-scale-up">
                <button 
                  onClick={() => setShowAddExpenseModal(false)}
                  className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color)]">
                  <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[var(--text-primary)] font-display">Log Group Expenditure</h3>
                    <p className="text-[var(--text-secondary)] text-[10px]">Log expenses to split equally among group members</p>
                  </div>
                </div>

                <form onSubmit={handleAddExpenseSubmit} className="mt-4 flex flex-col gap-4">
                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Expense Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={expenseAmount}
                      onChange={e => setExpenseAmount(e.target.value)}
                      className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-emerald-500/50 py-2.5 px-3 rounded-lg text-sm font-bold font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Expense Description</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Server hosting bills, team meal"
                      value={expenseDescription}
                      onChange={e => setExpenseDescription(e.target.value)}
                      className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-emerald-500/50 py-2 px-3 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Paid By</label>
                    <select
                      value={expensePaidBy}
                      onChange={e => setExpensePaidBy(e.target.value)}
                      className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] cursor-pointer"
                    >
                      {selectedChatGroup.members.map((m: any) => (
                        <option key={m.userId} value={m.userId}>{m.username}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddExpenseModal(false)}
                      className="w-1/2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:text-[var(--text-primary)] font-bold py-2 rounded-lg text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-1/2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer"
                    >
                      Log Expenditure
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ==========================================
              MODAL: RECORD SETTLEMENT / TRANSFER PAYMENT
              ========================================== */}
          {showRecordPaymentModal && selectedChatGroup && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none animate-scale-up">
                <button 
                  onClick={() => setShowRecordPaymentModal(false)}
                  className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color)]">
                  <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[var(--text-primary)] font-display">Record Debt Settlement</h3>
                    <p className="text-[var(--text-secondary)] text-[10px]">Log direct transfer receipts between colleagues</p>
                  </div>
                </div>

                <form onSubmit={handleRecordPaymentSubmit} className="mt-4 flex flex-col gap-4">
                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Settled Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(e.target.value)}
                      className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2.5 px-3 rounded-lg text-sm font-bold font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Payer (Paid From)</label>
                      <select
                        value={paymentFrom}
                        onChange={e => setPaymentFrom(e.target.value)}
                        className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] cursor-pointer"
                      >
                        <option value="">-- Payer --</option>
                        {selectedChatGroup.members.map((m: any) => (
                          <option key={m.userId} value={m.userId}>{m.username}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Recipient (Paid To)</label>
                      <select
                        value={paymentTo}
                        onChange={e => setPaymentTo(e.target.value)}
                        className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] cursor-pointer"
                      >
                        <option value="">-- Recipient --</option>
                        {selectedChatGroup.members.map((m: any) => (
                          <option key={m.userId} value={m.userId}>{m.username}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => setShowRecordPaymentModal(false)}
                      className="w-1/2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:text-[var(--text-primary)] font-bold py-2 rounded-lg text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-1/2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer"
                    >
                      Record Receipt
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ==========================================
              MODAL: GROUP CHAT ROOM CONFIG & SETTINGS
              ========================================== */}
          {showGroupSettingsModal && selectedChatGroup && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none animate-scale-up">
                <button 
                  onClick={() => setShowGroupSettingsModal(false)}
                  className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color)]">
                  <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                    <Settings className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[var(--text-primary)] font-display">Room Settings & Membership</h3>
                    <p className="text-[var(--text-secondary)] text-[10px]">Configure privacy scopes and group members</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-4 max-h-[380px] overflow-y-auto">
                  {/* Privacy Toggle */}
                  <div className="flex items-center justify-between p-2.5 border border-[var(--border-color)] rounded-xl bg-[var(--bg-tertiary)]">
                    <div>
                      <span className="font-bold text-[11px] block font-display">Restrict Visibility (Private Channel)</span>
                      <span className="text-[9px] text-[var(--text-secondary)] mt-0.5 block">Only added members will discover this room</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={JSON.parse(selectedChatGroup.settings || '{}').isPrivate || false}
                        onChange={e => handleUpdateGroupSettings(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {/* Add Members Section */}
                  <div>
                    <span className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-2">Add Colleague to Room</span>
                    <div className="flex flex-col gap-1.5 border border-[var(--border-color)] p-2 rounded-xl bg-[var(--bg-primary)] max-h-32 overflow-y-auto">
                      {companyUsers
                        .filter(u => !selectedChatGroup.members.some((m: any) => m.userId === u.id))
                        .map(colleague => (
                          <div key={colleague.id} className="flex justify-between items-center text-xs py-1 px-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
                            <span className="font-semibold text-[var(--text-primary)]">{colleague.username}</span>
                            <button
                              type="button"
                              onClick={() => handleManageGroupMember(colleague.id, 'ADD')}
                              className="px-2 py-0.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white font-extrabold text-[8px] uppercase rounded transition-all cursor-pointer"
                            >
                              Add
                            </button>
                          </div>
                        ))}
                      {companyUsers.filter(u => !selectedChatGroup.members.some((m: any) => m.userId === u.id)).length === 0 && (
                        <div className="text-[10px] text-[var(--text-muted)] text-center py-2">All colleagues are members of this space</div>
                      )}
                    </div>
                  </div>

                  {/* Current Members list */}
                  <div>
                    <span className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-2">Current Members ({selectedChatGroup.members.length})</span>
                    <div className="flex flex-col gap-1.5 border border-[var(--border-color)] p-2 rounded-xl bg-[var(--bg-primary)] max-h-36 overflow-y-auto">
                      {selectedChatGroup.members.map((m: any) => {
                        const canKick = m.userId !== selectedChatGroup.createdById;
                        return (
                          <div key={m.id} className="flex justify-between items-center text-xs py-1 px-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-[var(--text-primary)]">{m.username}</span>
                              <span className={`text-[8px] font-extrabold px-1 rounded uppercase ${m.role === 'ADMIN' ? 'bg-indigo-500/15 text-indigo-400' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'}`}>
                                {m.role}
                              </span>
                            </div>
                            {canKick ? (
                              <button
                                type="button"
                                onClick={() => handleManageGroupMember(m.userId, 'REMOVE')}
                                className="px-2 py-0.5 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white font-extrabold text-[8px] uppercase rounded transition-all cursor-pointer"
                              >
                                Kick
                              </button>
                            ) : (
                              <span className="text-[8px] text-[var(--text-muted)] italic">Founder</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowGroupSettingsModal(false)}
                  className="w-full mt-6 bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:text-[var(--text-primary)] font-bold py-2 rounded-lg text-xs cursor-pointer"
                >
                  Close Settings
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
