import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { MASTER_FEATURES_HIERARCHY, getCategoryKeys, getChildKeys, getParentKey } from './features';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import ForgotPasswordModal from './components/auth/ForgotPasswordModal';
import CompanyProfile from './components/administration/CompanyProfile';
import RolesPermissions from './components/administration/RolesPermissions';
import AuditLogs from './components/administration/AuditLogs';
import SnapshotBackups from './components/administration/SnapshotBackups';
import EmployeeRegistry from './components/administration/EmployeeRegistry';
import CorporateDepartments from './components/administration/CorporateDepartments';
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

import { apiClient, ApiError } from './utils/apiService';

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

const getDeviceDetails = () => {
  const userAgent = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // Extract browser name/OS for display (deviceModel)
  let model = "Web Browser";
  if (userAgent.indexOf("Chrome") > -1) {
    model = "Chrome Browser";
  } else if (userAgent.indexOf("Safari") > -1) {
    model = "Safari Browser";
  } else if (userAgent.indexOf("Firefox") > -1) {
    model = "Firefox Browser";
  } else if (userAgent.indexOf("MSIE") > -1 || !!(document as any).documentMode) {
    model = "IE Browser";
  } else if (userAgent.indexOf("Edge") > -1) {
    model = "Edge Browser";
  }
  
  // OS details
  let os = "Unknown OS";
  if (userAgent.indexOf("Windows NT 10.0") > -1) os = "Windows 10/11";
  else if (userAgent.indexOf("Windows NT 6.2") > -1) os = "Windows 8";
  else if (userAgent.indexOf("Windows NT 6.1") > -1) os = "Windows 7";
  else if (userAgent.indexOf("Macintosh") > -1) os = "macOS";
  else if (userAgent.indexOf("Android") > -1) os = "Android";
  else if (userAgent.indexOf("iPhone") > -1 || userAgent.indexOf("iPad") > -1) os = "iOS";
  else if (userAgent.indexOf("Linux") > -1) os = "Linux";
  
  return {
    deviceType: isMobile ? 'MOBILE' : 'DESKTOP',
    deviceModel: `${os} - ${model}`
  };
};

const getFeatureIcon = (key: string) => {
  switch (key) {
    case 'GENERAL':
    case 'GENERAL_CHAT':
      return <MessageSquare className="w-4 h-4" style={{ flexShrink: 0 }} />;
    case 'GENERAL_EXPENSE_CHAT':
      return <DollarSign className="w-4 h-4" style={{ flexShrink: 0 }} />;
    case 'NOTIFICATIONS':
    case 'NOTIFICATIONS_PUSH':
      return <Bell className="w-4 h-4" style={{ flexShrink: 0 }} />;
    case 'NOTIFICATIONS_AUDIT':
    case 'ADMIN_AUDIT':
      return <Activity className="w-4 h-4" style={{ flexShrink: 0 }} />;
    case 'ADMINISTRATION':
      return <Settings className="w-4 h-4" style={{ flexShrink: 0 }} />;
    case 'ADMIN_PROFILE':
      return <Building className="w-4 h-4" style={{ flexShrink: 0 }} />;
    case 'ADMIN_ROLES':
      return <Shield className="w-4 h-4" style={{ flexShrink: 0 }} />;
    case 'ADMIN_BACKUP':
      return <Database className="w-4 h-4" style={{ flexShrink: 0 }} />;
    case 'ADMIN_USERS':
      return <Users className="w-4 h-4" style={{ flexShrink: 0 }} />;
    case 'ADMIN_DEPARTMENTS':
      return <Briefcase className="w-4 h-4" style={{ flexShrink: 0 }} />;
    default:
      return <Layers className="w-4 h-4" style={{ flexShrink: 0 }} />;
  }
};

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

  // Profile settings state
  const [showMyProfileModal, setShowMyProfileModal] = useState(false);
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Forgot password state
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  // Sync profile input fields reactively when user caches change
  useEffect(() => {
    if (user) {
      setProfileEmail(user.email || '');
      setProfilePhone(user.mobileNo || '');
    }
  }, [user]);

  // Real-time socket reference
  const socketRef = useRef<Socket | null>(null);
  
  // Notification states
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeToast, setActiveToast] = useState<{ title: string; message: string } | null>(null);

  // --- COMPONENT DATA STATES ---
  const [companies, setCompanies] = useState<any[]>([]); // Super Admin company list
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null); // Super Admin focused tenant profile
  const [selectedCompanyUsers, setSelectedCompanyUsers] = useState<any[]>([]); // Super Admin focused tenant's users list
  const [editCompanyFeatures, setEditCompanyFeatures] = useState<string[]>([]);
  const [isEditingAccess, setIsEditingAccess] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  
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

  useEffect(() => {
    if (selectedCompany) {
      setEditCompanyFeatures(selectedCompany.features.map((f: any) => f.feature.key));
    } else {
      setEditCompanyFeatures([]);
    }
    setIsEditingAccess(false);
    setSaveStatus('idle');
  }, [selectedCompany]);

  // --- FORM STATES ---
  // Login Form
  const [loginForm, setLoginForm] = useState({ companyCode: '', username: '', password: '' });
  // Signup Workflow Forms
  const [signupStep, setSignupStep] = useState<1 | 2 | 3>(1); // 1 = Details, 2 = OTP, 3 = Pending Approval
  const [signupVerificationMethod, setSignupVerificationMethod] = useState<'SMS' | 'EMAIL'>('SMS');
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

  // --- CONCURRENT SESSION OVERRIDE STATES ---
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictDeviceModel, setConflictDeviceModel] = useState('');
  const [conflictDeviceType, setConflictDeviceType] = useState('');

  // --- ADMINISTRATION DETAILED STATE MANAGEMENT ---
  const [adminProfileData, setAdminProfileData] = useState<any>(null);
  const [adminProfileForm, setAdminProfileForm] = useState({
    legalCompanyName: '',
    companyEmail: '',
    companyPhone: '',
    website: '',
    industryType: '',
    businessType: '',
    gstin: '',
    pan: '',
    country: '',
    state: '',
    city: '',
    addressLine1: '',
    primaryColor: '',
    secondaryColor: '',
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPassword: ''
  });

  const [auditTrailLogs, setAuditTrailLogs] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditFilterModule, setAuditFilterModule] = useState('');
  const [auditSearchActor, setAuditSearchActor] = useState('');

  const [backupList, setBackupList] = useState<any[]>([]);
  const [backupRetentionDays, setBackupRetentionDays] = useState(60);
  const [autoBackupInterval, setAutoBackupInterval] = useState(2);
  const [showTopBackupModal, setShowTopBackupModal] = useState(false);

  const [departmentList, setDepartmentList] = useState<any[]>([]);
  const [deptForm, setDeptForm] = useState({
    name: '',
    description: '',
    features: [] as string[],
    managerId: ''
  });
  const [isEditingDept, setIsEditingDept] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);

  const [isEditingAdminUser, setIsEditingAdminUser] = useState(false);
  const [editingAdminUserId, setEditingAdminUserId] = useState<string | null>(null);
  const [adminUserForm, setAdminUserForm] = useState({
    username: '',
    mobileNo: '',
    email: '',
    password: '',
    roleId: '',
    departmentId: '',
    status: 'ACTIVE'
  });



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

  const handleEnableAllCompany = () => {
    const all = MASTER_FEATURES_HIERARCHY.flatMap(cat => [cat.key, ...cat.children.map(c => c.key)]);
    setEditCompanyFeatures(all);
  };

  const handleEnableCategoryAllCompany = (catKey: string) => {
    const cat = MASTER_FEATURES_HIERARCHY.find(c => c.key === catKey);
    if (!cat) return;
    const toAdd = [cat.key, ...cat.children.map(c => c.key)];
    setEditCompanyFeatures(prev => [...new Set([...prev, ...toAdd])]);
  };

  const handleSaveCompanyFeatures = async () => {
    if (!selectedCompany) return;
    if (editCompanyFeatures.length === 0) {
      setErrorMsg("Please enable at least one feature flag module.");
      return;
    }
    setSaveStatus('saving');
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiRequest(`/api/super/company/${selectedCompany.id}`, 'PATCH', {
        features: editCompanyFeatures
      });
      setSaveStatus('success');
      await fetchSuperAdminData();
      
      // Auto-close success modal and exit edit mode after 1.5 seconds
      setTimeout(() => {
        setSaveStatus('idle');
        setIsEditingAccess(false);
      }, 1500);
    } catch (e) {
      setSaveStatus('error');
    }
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
    const handleAuthExpired = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail;

      setToken(null);
      setUser(null);
      setView('login');

      if (detail === 'inactive') {
        setErrorMsg('Session expired due to inactivity.');
      } else if (detail === 'overridden') {
        setErrorMsg('You have been logged out because your session was overridden by another login.');
      } else {
        setErrorMsg('Session expired or logged out. Please log in again.');
      }
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

  // Client-side inactivity timer for desktop sessions (15 minutes)
  useEffect(() => {
    if (!token || !user || getDeviceDetails().deviceType !== 'DESKTOP') {
      return;
    }

    const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleInactivityTimeout, INACTIVITY_TIMEOUT);
    };

    const handleInactivityTimeout = async () => {
      console.log("⏱️ User inactive for 15 minutes. Logging out...");
      
      // Call backend logout to delete session in DB
      try {
        await apiClient.post('/api/auth/logout');
      } catch (e) {
        console.error("Inactivity logout API error:", e);
      }
      
      // Perform frontend logout
      localStorage.removeItem('erp_token');
      localStorage.removeItem('erp_user');
      setToken(null);
      setUser(null);
      setNotifications([]);
      setView('login');
      setSelectedCompany(null);
      setSelectedCompanyUsers([]);
      setShowProfileDropdown(false);
      
      setErrorMsg("Session expired due to inactivity.");
    };

    // User activity listeners
    const events = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart', 'click'];
    const handler = () => resetTimer();
    events.forEach(event => window.addEventListener(event, handler));

    // Initialize timer
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, handler));
    };
  }, [token, user]);

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
    const targetValue = signupVerificationMethod === 'SMS' ? signupForm.mobileNo : signupForm.email;
    if (!targetValue) {
      setErrorMsg(`Please enter your ${signupVerificationMethod === 'SMS' ? 'mobile number' : 'email address'} to send OTP.`);
      return;
    }
    
    // Quick validation
    if (signupVerificationMethod === 'SMS') {
      if (!/^\+?[1-9]\d{9,14}$/.test(targetValue)) {
        setErrorMsg("Invalid mobile number format. Format: +919876543210");
        return;
      }
    } else {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetValue)) {
        setErrorMsg("Invalid email format. E.g. user@example.com");
        return;
      }
    }

    try {
      const res = await apiRequest('/api/auth/otp-request', 'POST', { 
        target: targetValue,
        companyCode: signupForm.companyCode
      });
      const codeSuffix = res.otpCode ? ` (Developer Mode Code: ${res.otpCode})` : "";
      setSuccessMsg(`Real-time OTP dispatched successfully via ${signupVerificationMethod === 'SMS' ? 'SMS' : 'Email'}! Please check your device.${codeSuffix}`);
      setSignupStep(2);
    } catch (e) {}
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const targetValue = signupVerificationMethod === 'SMS' ? signupForm.mobileNo : signupForm.email;
      const data = await apiRequest('/api/auth/signup', 'POST', {
        ...signupForm,
        otpTarget: targetValue
      });
      setSuccessMsg(data.message);
      setSignupStep(3);
    } catch (e) {}
  };

  const handleLoginSubmit = async (e?: React.FormEvent, force: boolean = false) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const deviceDetails = getDeviceDetails();
    const payload = {
      ...loginForm,
      deviceType: deviceDetails.deviceType,
      deviceModel: deviceDetails.deviceModel,
      force
    };

    try {
      const data = await apiRequest('/api/auth/login', 'POST', payload);
      localStorage.setItem('erp_token', data.token);
      localStorage.setItem('erp_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setSuccessMsg(data.message);
      
      // Close session conflict modal on success
      setConflictModalOpen(false);
      setConflictDeviceModel('');
      setConflictDeviceType('');
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409 && err.data?.sessionConflict) {
        // Active concurrent session detected
        setConflictDeviceModel(err.data.deviceModel || 'Unknown Device');
        setConflictDeviceType(err.data.deviceType || 'DESKTOP');
        setConflictModalOpen(true);
      } else {
        // Other errors are already captured by apiRequest inside setErrorMsg
        console.error("Login request error:", err);
      }
    }
  };

  const handleForceLogin = () => {
    handleLoginSubmit(undefined, true);
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

  const handleProfileUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profilePassword && profilePassword !== profileConfirmPassword) {
      setProfileError("Passwords do not match");
      return;
    }
    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      const res = await apiRequest('/api/auth/profile', 'PATCH', {
        email: profileEmail,
        mobileNo: profilePhone,
        ...(profilePassword && { password: profilePassword })
      });
      setProfileSuccess("Profile updated successfully!");
      // Update cached user state
      const updatedUser = {
        ...user!,
        email: res.user.email,
        mobileNo: res.user.mobileNo
      };
      setUser(updatedUser);
      localStorage.setItem('erp_user', JSON.stringify(updatedUser));
      
      // Auto close after 1.5 seconds
      setTimeout(() => {
        setShowMyProfileModal(false);
      }, 1500);
    } catch (err: any) {
      setProfileError(err.message || "Failed to update profile settings.");
    } finally {
      setProfileLoading(false);
    }
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

  const handleToggleCompanyFeatureHierarchical = (featureKey: string) => {
    if (!selectedCompany) return;
    
    // Map current features
    let updatedFeatures = [...editCompanyFeatures];
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

    setEditCompanyFeatures(updatedFeatures);
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

  // --- CORE SYSTEM DATA FETCHERS FOR ADMIN CONSOLE ---

  const fetchDepartments = async () => {
    try {
      const res = await apiRequest('/api/admin/departments', 'GET');
      setDepartmentList(res.departments || []);
    } catch (e) {
      console.error("Error fetching departments:", e);
    }
  };

  const fetchBackups = async () => {
    try {
      const res = await apiRequest('/api/admin/backups', 'GET');
      setBackupList(res.backups || []);
    } catch (e) {
      console.error("Error fetching backups:", e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const params: any = {};
      if (auditFilterModule) params.moduleName = auditFilterModule;
      if (auditSearchActor) params.username = auditSearchActor;

      const res = await apiClient.get<any>('/api/admin/audit-logs', { params });
      setAuditTrailLogs(res.logs || []);
      setAuditTotal(res.total || 0);
    } catch (e) {
      console.error("Error fetching audit logs:", e);
    }
  };

  const fetchAdminConsoleData = async () => {
    if (!token || user?.role !== 'Admin') return;
    try {
      // 1. Load profile data
      const profileRes = await apiRequest('/api/admin/company/profile', 'GET');
      if (profileRes?.company) {
        setAdminProfileData(profileRes.company);
        setAdminProfileForm({
          legalCompanyName: profileRes.company.legalCompanyName || '',
          companyEmail: profileRes.company.companyEmail || '',
          companyPhone: profileRes.company.companyPhone || '',
          website: profileRes.company.website || '',
          industryType: profileRes.company.industryType || '',
          businessType: profileRes.company.businessType || '',
          gstin: profileRes.company.gstin || '',
          pan: profileRes.company.pan || '',
          country: profileRes.company.country || '',
          state: profileRes.company.state || '',
          city: profileRes.company.city || '',
          addressLine1: profileRes.company.addressLine1 || '',
          primaryColor: profileRes.company.primaryColor || '',
          secondaryColor: profileRes.company.secondaryColor || '',
          smtpHost: profileRes.company.smtpHost || '',
          smtpPort: profileRes.company.smtpPort ? String(profileRes.company.smtpPort) : '',
          smtpUser: profileRes.company.smtpUser || '',
          smtpPassword: profileRes.company.smtpPassword || ''
        });
         setBackupRetentionDays(profileRes.company.backupRetentionDays || 60);
        setAutoBackupInterval(profileRes.company.autoBackupInterval || 2);
      }

      // 2. Load dashboard (users, roles, features)
      await fetchCompanyAdminData();

      // 3. Load departments
      await fetchDepartments();

      // 4. Load backups list
      await fetchBackups();

      // 5. Load audit trail
      await fetchAuditLogs();
    } catch (e) {
      console.error("Error loading administration data:", e);
    }
  };

  // Reactively sync data when admin workspace parameters change
  useEffect(() => {
    if (activeWorkspaceModule === 'administration') {
      fetchAdminConsoleData();
    }
  }, [activeWorkspaceModule, activeWorkspaceSubModule, auditFilterModule, auditSearchActor]);

  // --- CONTROLLER ACTION HANDLERS ---

  const handleUpdateAdminProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...adminProfileForm,
        smtpPort: adminProfileForm.smtpPort ? parseInt(adminProfileForm.smtpPort) : null
      };
      await apiRequest('/api/admin/company/profile', 'PATCH', payload);
      setSuccessMsg("Company Profile updated successfully!");
      fetchAdminConsoleData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update profile details.");
    }
  };

  const handleTriggerBackup = async () => {
    try {
      setSuccessMsg("Compiling database entities and creating snapshot...");
      const res = await apiRequest('/api/admin/backups', 'POST');
      setSuccessMsg(res.message || "Manual backup generated successfully!");
      fetchBackups();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to generate backup.");
    }
  };

  const handleUpdateBackupRetention = async (days: number) => {
    try {
      await apiRequest('/api/admin/backups/settings', 'PATCH', { backupRetentionDays: days });
      setBackupRetentionDays(days);
      setSuccessMsg(`Backup policy set to: retain files for ${days} days.`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update retention policy.");
    }
  };

  const handleUpdateAutoBackupInterval = async (interval: number) => {
    try {
      await apiRequest('/api/admin/backups/settings', 'PATCH', { autoBackupInterval: interval });
      setAutoBackupInterval(interval);
      setSuccessMsg(`Auto-backup interval successfully configured to: every ${interval} days.`);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update auto-backup interval.");
    }
  };

  const getLastBackupTimeText = () => {
    if (!backupList || backupList.length === 0) return "Never";
    const date = new Date(backupList[0].createdAt);
    if (isNaN(date.getTime())) return "Never";
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleCreateOrUpdateDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditingDept && editingDeptId) {
        await apiRequest(`/api/admin/departments/${editingDeptId}`, 'PATCH', deptForm);
        setSuccessMsg("Department updated successfully!");
      } else {
        await apiRequest('/api/admin/departments', 'POST', deptForm);
        setSuccessMsg(`Department "${deptForm.name}" created successfully.`);
      }
      setIsEditingDept(false);
      setEditingDeptId(null);
      setDeptForm({ name: '', description: '', features: [], managerId: '' });
      fetchDepartments();
      fetchCompanyAdminData(); // Refresh employee list department choices
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save department.");
    }
  };

  const handleDeleteDept = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this department?")) return;
    try {
      await apiRequest(`/api/admin/departments/${id}`, 'DELETE');
      setSuccessMsg("Department successfully removed.");
      fetchDepartments();
      fetchCompanyAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete department.");
    }
  };

  const handleCreateOrUpdateAdminUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditingAdminUser && editingAdminUserId) {
        const payload = { ...adminUserForm };
        if (!payload.password) delete (payload as any).password;
        await apiRequest(`/api/admin/users/${editingAdminUserId}`, 'PATCH', payload);
        setSuccessMsg("Employee credentials and role updated.");
      } else {
        if (!adminUserForm.password) {
          setErrorMsg("Password is required for onboarding new colleagues.");
          return;
        }
        await apiRequest('/api/admin/users', 'POST', adminUserForm);
        setSuccessMsg(`New colleague "${adminUserForm.username}" successfully onboarded!`);
      }
      setIsEditingAdminUser(false);
      setEditingAdminUserId(null);
      setAdminUserForm({ username: '', mobileNo: '', email: '', password: '', roleId: '', departmentId: '', status: 'ACTIVE' });
      fetchCompanyAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save user.");
    }
  };

  const handleDeleteAdminUser = async (id: string) => {
    if (id === user?.id) {
      setErrorMsg("Self-deletion is locked for administrative system protection.");
      return;
    }
    if (!window.confirm("Are you sure you want to permanently delete this user? This action cannot be undone.")) return;
    try {
      await apiRequest(`/api/admin/users/${id}`, 'DELETE');
      setSuccessMsg("Employee has been permanently offboarded.");
      fetchCompanyAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete user.");
    }
  };

  const handleUpdateRolePermissionsSubmit = async (roleId: string, permissions: any) => {
    try {
      await apiRequest(`/api/admin/roles/${roleId}`, 'PATCH', { permissions });
      setSuccessMsg("Role permission boundaries updated!");
      fetchCompanyAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to modify role boundaries.");
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently remove this role?")) return;
    try {
      await apiRequest(`/api/admin/roles/${id}`, 'DELETE');
      setSuccessMsg("Custom role successfully deleted.");
      fetchCompanyAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete role.");
    }
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
            <Login
              loginForm={loginForm}
              setLoginForm={setLoginForm}
              handleLoginSubmit={handleLoginSubmit}
              loading={loading}
              errorMsg={errorMsg}
              successMsg={successMsg}
              onRegisterClick={() => { setView('signup'); setSignupStep(1); setErrorMsg(null); setSuccessMsg(null); }}
              onForgotPasswordClick={() => {
                setShowForgotPasswordModal(true);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              conflictModalOpen={conflictModalOpen}
              setConflictModalOpen={setConflictModalOpen}
              conflictDeviceModel={conflictDeviceModel}
              handleForceLogin={handleForceLogin}
            />
          )}

          {view === 'signup' && (
            <Signup
              signupForm={signupForm}
              setSignupForm={setSignupForm}
              signupStep={signupStep}
              setSignupStep={setSignupStep}
              signupVerificationMethod={signupVerificationMethod}
              setSignupVerificationMethod={setSignupVerificationMethod}
              triggerOtpRequest={triggerOtpRequest}
              handleSignupSubmit={handleSignupSubmit}
              loading={loading}
              errorMsg={errorMsg}
              successMsg={successMsg}
              onBackToLoginClick={() => { setView('login'); setErrorMsg(null); setSuccessMsg(null); }}
            />
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
          <aside ref={sidebarRef} className={`fixed top-0 bottom-0 left-0 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col z-40 transition-all duration-300 ${sidebarCollapsed ? 'w-16 overflow-visible' : 'w-64'}`}>
            
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
                <>
                  <div className="fixed inset-0 z-40 bg-transparent cursor-default" onClick={() => setShowProfileDropdown(false)} />
                  <div className={`absolute bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-xl z-50 p-2 animate-fade-in text-left ${sidebarCollapsed ? 'left-[72px] top-2 w-52 shadow-[0_8px_30px_rgba(0,0,0,0.35)]' : 'top-full left-4 right-4 mt-1.5'}`}>
                    {sidebarCollapsed && (
                      <div className="absolute top-[20px] -left-1.5 w-3 h-3 bg-[var(--bg-card)] border-l border-b border-[var(--border-color)] rotate-45" />
                    )}
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

                    {/* My Profile Button */}
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        setShowMyProfileModal(true);
                        setProfilePassword('');
                        setProfileConfirmPassword('');
                        setProfileError(null);
                        setProfileSuccess(null);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors flex items-center gap-2 cursor-pointer mt-1"
                    >
                      <User className="w-3.5 h-3.5 text-indigo-400" />
                      <span>My Profile Settings</span>
                    </button>



                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2 cursor-pointer mt-1"
                    >
                      <LogOut className="w-3.5 h-3.5 text-red-500" />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
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

                  {companyFeatures.length === 0 ? (
                    <div className="px-3 py-4 mt-6 text-center select-none animate-fade-in">
                      <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest border border-dashed border-[var(--border-color)] rounded-xl py-3 px-2 block leading-relaxed bg-[var(--bg-secondary)]/30">
                        Empty Console<br/>
                        <span className="text-[8px] font-normal text-[var(--text-muted)]/70 lowercase">ready for implementation</span>
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 mt-2">
                      {MASTER_FEATURES_HIERARCHY.map(cat => {
                        // Skip GENERAL and NOTIFICATIONS categories as they are already on the top panel
                        if (cat.key === 'GENERAL' || cat.key === 'NOTIFICATIONS') {
                          return null;
                        }

                        // ADMINISTRATION category is restricted strictly to company admins
                        if (cat.key === 'ADMINISTRATION' && user.role !== 'Admin') {
                          return null;
                        }

                        // Filter children by what features are granted to the company
                        const activeChildren = cat.children.filter(child => companyFeatures.includes(child.key));
                        if (activeChildren.length === 0) {
                          return null;
                        }

                        // Render direct button if only 1 feature enabled in the category
                        if (activeChildren.length === 1) {
                          const child = activeChildren[0];
                          const isActive = activeWorkspaceModule === cat.key.toLowerCase() && activeWorkspaceSubModule === child.key;

                          return (
                            <button
                              key={child.key}
                              type="button"
                              onClick={() => {
                                setActiveWorkspaceModule(cat.key.toLowerCase());
                                setActiveWorkspaceSubModule(child.key);
                                setSelectedCompany(null); // Clear superadmin company focus
                              }}
                              className={`w-full py-2 px-3 rounded-lg text-left text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer border-0 bg-transparent ${
                                isActive
                                  ? 'bg-[var(--bg-tertiary)] text-indigo-500 font-bold border-l-2 border-indigo-500'
                                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                              }`}
                              title={sidebarCollapsed ? child.name : ""}
                            >
                              {getFeatureIcon(child.key)}
                              {!sidebarCollapsed && <span>{child.name}</span>}
                            </button>
                          );
                        }

                        // Render dropdown accordion if multiple features enabled in the category
                        const isExpanded = expandedCategories[cat.key.toLowerCase()] || false;
                        const isAnyChildActive = activeWorkspaceModule === cat.key.toLowerCase();

                        return (
                          <div key={cat.key} className="flex flex-col gap-0.5">
                            {sidebarCollapsed ? (
                              // Collapsed popover view
                              <div className="relative flex justify-center animate-fade-in">
                                <button
                                  type="button"
                                  onClick={() => setActivePopoverCategory(activePopoverCategory === cat.key.toLowerCase() ? null : cat.key.toLowerCase())}
                                  className={`p-2.5 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer border-0 bg-transparent ${
                                    isAnyChildActive ? 'bg-indigo-500/10 text-indigo-500' : 'text-[var(--text-secondary)]'
                                  }`}
                                  title={cat.name}
                                >
                                  {getFeatureIcon(cat.key)}
                                </button>
                                
                                {activePopoverCategory === cat.key.toLowerCase() && (
                                  <div className="absolute left-14 top-0 z-50 w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl p-2 animate-scale-up text-left">
                                    <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase px-2 block mb-1.5">{cat.name}</span>
                                    {activeChildren.map(child => {
                                      const isChildActive = activeWorkspaceSubModule === child.key;
                                      return (
                                        <button
                                          key={child.key}
                                          type="button"
                                          onClick={() => {
                                            setActiveWorkspaceModule(cat.key.toLowerCase());
                                            setActiveWorkspaceSubModule(child.key);
                                            setActivePopoverCategory(null);
                                            setSelectedCompany(null);
                                          }}
                                          className={`w-full text-left py-1.5 px-2 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-2 cursor-pointer border-0 bg-transparent ${
                                            isChildActive
                                              ? 'bg-indigo-500/10 text-indigo-400 font-bold'
                                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                                          }`}
                                        >
                                          {getFeatureIcon(child.key)}
                                          <span className="truncate">{child.name}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            ) : (
                              // Expanded accordion view
                              <div className="animate-fade-in flex flex-col gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => toggleSidebarCategory(cat.key.toLowerCase())}
                                  className={`w-full py-2 px-3 rounded-lg text-left text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer border-0 bg-transparent ${
                                    isAnyChildActive
                                      ? 'text-indigo-500 font-bold'
                                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                                  }`}
                                >
                                  <span className="flex items-center gap-2">
                                    {getFeatureIcon(cat.key)}
                                    <span>{cat.name}</span>
                                  </span>
                                  {isExpanded ? <ChevronDown className="w-3 h-3 text-indigo-500 shrink-0" /> : <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
                                </button>
                                
                                {isExpanded && (
                                  <div className="flex flex-col gap-0.5 pl-4 border-l border-[var(--border-color)] ml-5 mt-0.5">
                                    {activeChildren.map(child => {
                                      const isChildActive = activeWorkspaceSubModule === child.key;
                                      return (
                                        <button
                                          key={child.key}
                                          type="button"
                                          onClick={() => {
                                            setActiveWorkspaceModule(cat.key.toLowerCase());
                                            setActiveWorkspaceSubModule(child.key);
                                            setSelectedCompany(null);
                                          }}
                                          className={`w-full text-left py-1.5 px-2.5 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-2 cursor-pointer border-0 bg-transparent ${
                                            isChildActive
                                              ? 'bg-indigo-500/10 text-indigo-400 font-bold'
                                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                                          }`}
                                        >
                                          {getFeatureIcon(child.key)}
                                          <span className="truncate">{child.name}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
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
            <header className="sticky top-0 z-35 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-6 py-4 flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-indigo-500 tracking-wider uppercase font-display">Workstation Hub</span>
                <span className="text-slate-400">/</span>
                <h1 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 leading-none uppercase">
                  {selectedCompany ? `${selectedCompany.name} Profile` : activeWorkspaceModule.replace('_', ' ')}
                </h1>
              </div>

              {/* Top Right Corner Status */}
              <div className="flex items-center gap-4">
                {/* Chat & Notification Control Group */}
                <div className="flex items-center gap-2 border-r border-[var(--border-color)] pr-4">
                  {/* Chat Toggle Button */}
                  <button
                    onClick={() => {
                      setShowChatDrawer(!showChatDrawer);
                      setShowAlertsPopup(false);
                      if (!showChatDrawer) setChatActiveView('list');
                    }}
                    className={`flex items-center justify-center p-2 rounded-lg transition-all cursor-pointer border ${
                      showChatDrawer 
                        ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40' 
                        : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border-indigo-500/20 hover:scale-105 active:scale-95'
                    }`}
                    title="Corporate Chat Messenger"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>

                  {/* Notification Toggle Button */}
                  <button
                    onClick={() => {
                      setShowAlertsPopup(!showAlertsPopup);
                      setShowChatDrawer(false);
                    }}
                    className={`relative flex items-center justify-center p-2 rounded-lg transition-all cursor-pointer border ${
                      showAlertsPopup 
                        ? 'bg-purple-500/20 text-purple-400 border-purple-500/40' 
                        : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border-purple-500/20 hover:scale-105 active:scale-95'
                    }`}
                    title="Alert Logs & Gateways"
                  >
                    <Bell className="w-4 h-4" />
                    {notifications.filter((n: any) => !n.isRead).length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-extrabold text-[8px] px-1 py-0.5 rounded-full leading-none shrink-0 shadow-sm animate-pulse">
                        {notifications.filter((n: any) => !n.isRead).length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Backup Info & Trigger */}
                {user?.role === 'Admin' && (
                  <div className="flex items-center gap-2 border-r border-[var(--border-color)] pr-4">
                    <button
                      onClick={() => setShowTopBackupModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors text-xs font-bold cursor-pointer"
                      title="Initiate Backup"
                    >
                      <Database className="w-3.5 h-3.5" /> Backup Now
                    </button>
                    <div className="text-[9px] text-[var(--text-secondary)] font-mono leading-tight">
                      <div>Last Backup</div>
                      <div className="text-[var(--text-primary)] font-bold">{getLastBackupTimeText()}</div>
                    </div>
                  </div>
                )}

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
                  <div className="max-w-4xl mx-auto my-12 text-center select-none animate-fade-in">
                    <div className="p-4 bg-[var(--bg-secondary)] text-indigo-500 border border-[var(--border-color)] rounded-2xl w-fit mx-auto mb-6 shadow-sm">
                      <Activity className="w-12 h-12 animate-pulse" />
                    </div>
                    <h2 className="text-xl font-bold text-[var(--text-primary)] font-display">
                      ERP Reimplementation Console
                    </h2>
                    <p className="text-[var(--text-secondary)] text-xs mt-2 max-w-md mx-auto leading-relaxed">
                      All default dashboard views and modular features have been completely removed.
                    </p>
                    <p className="text-[var(--text-muted)] text-[11px] mt-2 max-w-md mx-auto leading-relaxed border-t border-dashed border-[var(--border-color)] pt-2">
                      Ready to implement new features one category and one feature at a time!
                    </p>
                  </div>
                )
              )}

              {/* ==========================================
                  COMPANY ADMINISTRATION WORKSPACE
                  ========================================== */}
              {activeWorkspaceModule === 'administration' && user?.role === 'Admin' && (
                <div className="max-w-6xl mx-auto animate-fade-in text-left select-none">
                  {/* Active Work Tool Panel - Full Width Viewport */}
                  <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm min-h-[480px]">
                    
                    {activeWorkspaceSubModule === 'ADMIN_PROFILE' && (
                      <CompanyProfile
                        adminProfileForm={adminProfileForm}
                        setAdminProfileForm={setAdminProfileForm}
                        handleUpdateAdminProfileSubmit={handleUpdateAdminProfileSubmit}
                        loading={loading}
                      />
                    )}

                    {activeWorkspaceSubModule === 'ADMIN_ROLES' && (
                      <RolesPermissions
                        companyRoles={companyRoles}
                        companyFeatures={companyFeatures}
                        newRole={newRole}
                        setNewRole={setNewRole}
                        handleCreateRoleSubmit={handleCreateRoleSubmit}
                        handleUpdateRolePermissionsSubmit={handleUpdateRolePermissionsSubmit}
                        handleDeleteRole={handleDeleteRole}
                      />
                    )}

                    {activeWorkspaceSubModule === 'ADMIN_AUDIT' && (
                      <AuditLogs
                        auditTrailLogs={auditTrailLogs}
                        auditTotal={auditTotal}
                        auditFilterModule={auditFilterModule}
                        setAuditFilterModule={setAuditFilterModule}
                        auditSearchActor={auditSearchActor}
                        setAuditSearchActor={setAuditSearchActor}
                      />
                    )}

                    {activeWorkspaceSubModule === 'ADMIN_BACKUP' && (
                      <SnapshotBackups
                        backupList={backupList}
                        backupRetentionDays={backupRetentionDays}
                        handleTriggerBackup={handleTriggerBackup}
                        handleUpdateBackupRetention={handleUpdateBackupRetention}
                        BACKEND_URL={BACKEND_URL}
                        fetchBackups={fetchBackups}
                      />
                    )}

                    {activeWorkspaceSubModule === 'ADMIN_USERS' && (
                      <EmployeeRegistry
                        companyUsers={companyUsers}
                        companyRoles={companyRoles}
                        departmentList={departmentList}
                        pendingUsers={pendingUsers}
                        approveSelectedRole={approveSelectedRole}
                        setApproveSelectedRole={setApproveSelectedRole}
                        handleApproveUser={handleApproveUser}
                        isEditingAdminUser={isEditingAdminUser}
                        setIsEditingAdminUser={setIsEditingAdminUser}
                        editingAdminUserId={editingAdminUserId}
                        setEditingAdminUserId={setEditingAdminUserId}
                        adminUserForm={adminUserForm}
                        setAdminUserForm={setAdminUserForm}
                        handleCreateOrUpdateAdminUserSubmit={handleCreateOrUpdateAdminUserSubmit}
                        handleDeleteAdminUser={handleDeleteAdminUser}
                        currentUser={user}
                      />
                    )}

                    {activeWorkspaceSubModule === 'ADMIN_DEPARTMENTS' && (
                      <CorporateDepartments
                        departmentList={departmentList}
                        companyUsers={companyUsers}
                        companyFeatures={companyFeatures}
                        deptForm={deptForm}
                        setDeptForm={setDeptForm}
                        isEditingDept={isEditingDept}
                        setIsEditingDept={setIsEditingDept}
                        editingDeptId={editingDeptId}
                        setEditingDeptId={setEditingDeptId}
                        handleCreateOrUpdateDeptSubmit={handleCreateOrUpdateDeptSubmit}
                        handleDeleteDept={handleDeleteDept}
                      />
                    )}
                  </div>
                </div>
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

                      <div className="flex flex-wrap items-center gap-2 justify-between mt-3 mb-1">
                        <label className="text-[10px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Subscription Feature Modules</label>
                        <div className="flex gap-2">
                          {!isEditingAccess ? (
                            <button
                              type="button"
                              onClick={() => setIsEditingAccess(true)}
                              className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Sliders className="w-3.5 h-3.5" /> Edit Access
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={handleSaveCompanyFeatures}
                                className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Save
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsEditingAccess(false);
                                  setEditCompanyFeatures(selectedCompany.features.map((f: any) => f.feature.key));
                                }}
                                className="px-3 py-1.5 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[10px] font-bold shadow-sm transition-colors cursor-pointer shrink-0"
                              >
                                Cancel
                              </button>
                              <button 
                                type="button" 
                                onClick={handleEnableAllCompany} 
                                className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold shadow-sm transition-colors cursor-pointer shrink-0"
                              >
                                Enable All
                              </button>
                            </>
                          )}
                        </div>
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
                          const activeKeys = editCompanyFeatures;
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
                                  {!isNotifications && isEditingAccess && (
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
                                    disabled={!isEditingAccess || isNotifications}
                                    onClick={() => handleToggleCompanyFeatureHierarchical(cat.key)}
                                    className={`px-2 py-0.5 rounded text-[9px] font-extrabold transition-colors ${
                                      !isEditingAccess
                                        ? 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-not-allowed border border-[var(--border-color)]'
                                        : isNotifications 
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
                                        disabled={isLocked || (isNotifications && child.key === 'NOTIFICATIONS_PUSH') || !isEditingAccess}
                                        onClick={() => handleToggleCompanyFeatureHierarchical(child.key)}
                                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold cursor-pointer transition-colors ${
                                          isLocked
                                            ? 'bg-transparent text-[var(--text-muted)] border border-dashed border-[var(--border-color)] cursor-not-allowed'
                                            : !isEditingAccess
                                              ? isChildActive
                                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 cursor-default'
                                                : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-color)] cursor-default'
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
                      
                      {isEditingAccess && (
                        <div className="mt-4 pt-3 border-t border-[var(--border-color)]/50 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingAccess(false);
                              setEditCompanyFeatures(selectedCompany.features.map((f: any) => f.feature.key));
                            }}
                            className="px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-bold transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveCompanyFeatures}
                            className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
                          >
                            <CheckCircle className="w-4 h-4" /> Save Access Changes
                          </button>
                        </div>
                      )}
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
                      className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Mobile Number</label>
                    <input
                      type="text"
                      required
                      value={editUserForm.mobileNo}
                      onChange={e => setEditUserForm({ ...editUserForm, mobileNo: e.target.value })}
                      className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Email Address (Optional)</label>
                    <input
                      type="email"
                      value={editUserForm.email}
                      onChange={e => setEditUserForm({ ...editUserForm, email: e.target.value })}
                      className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">User Status Role</label>
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
              MODAL: TOP PANEL BACKUP CONFIGURATION & TRIGGER
              ========================================== */}
          {showTopBackupModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none animate-scale-up">
                <button 
                  onClick={() => setShowTopBackupModal(false)}
                  className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer bg-transparent border-0"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color)]">
                  <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[var(--text-primary)] font-display">Data Backup Control Center</h3>
                    <p className="text-[var(--text-secondary)] text-[10px]">Configure policies and compile real-time DB snapshots</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-5">
                  {/* Dynamic Last Backup Info Card */}
                  <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 rounded-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl" />
                    <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-wider uppercase block">Computed Latest Snapshot</span>
                    <p className="text-sm font-bold text-emerald-400 mt-1 font-mono">{getLastBackupTimeText()}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-1.5 leading-normal">
                      Snapshots capture tenant structural details, including corporate departments, customized roles, active employees, and system audit trails.
                    </p>
                  </div>

                  {/* Auto-backup settings slider/numeric selector */}
                  <div className="border-t border-[var(--border-color)] pt-4">
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-2">
                      Auto-Backup Execution Cycle
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={autoBackupInterval}
                        onChange={e => setAutoBackupInterval(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs font-mono text-[var(--text-primary)] focus:outline-none"
                      />
                      <span className="text-xs text-[var(--text-secondary)]">Days Interval</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateAutoBackupInterval(autoBackupInterval)}
                        className="ml-auto px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs cursor-pointer transition-colors"
                      >
                        Apply Cycle
                      </button>
                    </div>
                    <span className="text-[9px] text-[var(--text-muted)] block mt-1">
                      System automatically executes an isolated backend snapshot export every <span className="font-bold text-indigo-400">{autoBackupInterval}</span> days.
                    </span>
                  </div>

                  {/* Manual instant snapshot trigger */}
                  <div className="border-t border-[var(--border-color)] pt-4 flex flex-col gap-3">
                    <span className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">
                      Immediate Export Gateway
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        await handleTriggerBackup();
                        setShowTopBackupModal(false);
                      }}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs cursor-pointer transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/10 active:scale-[0.99]"
                    >
                      <Plus className="w-4 h-4" /> Trigger Database Snapshot Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              REAL-TIME ENTERPRISE CHAT DRAWER
              ========================================== */}
          {showChatDrawer && (
            <div 
              className="fixed inset-0 z-30 bg-transparent cursor-default" 
              onClick={() => setShowChatDrawer(false)}
            />
          )}

          {showChatDrawer && (
            <div
              className="fixed top-[76px] right-6 z-40 w-[380px] h-[550px] bg-[var(--bg-card)]/95 backdrop-blur-md border border-[var(--border-color)] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-up text-left"
              style={{
                transition: 'transform 0.2s ease',
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
              className="fixed top-[76px] right-6 z-40 w-[380px] h-[480px] bg-[var(--bg-card)]/95 backdrop-blur-md border border-[var(--border-color)] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-up text-left text-xs font-sans"
              style={{
                transition: 'transform 0.2s ease',
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

          {/* ==========================================
              MODAL: SUPER ADMIN - ACCESS SAVING OVERLAY POPUP
              ========================================== */}
          {saveStatus !== 'idle' && (
            <div className="fixed inset-0 z-55 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in select-none">
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 text-center max-w-xs animate-scale-up">
                {saveStatus === 'saving' && (
                  <>
                    <svg className="animate-spin h-10 w-10 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <div>
                      <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Saving Configuration</h4>
                      <p className="text-[var(--text-secondary)] text-[10px] mt-1">Applying access modules to tenant registry...</p>
                    </div>
                  </>
                )}

                {saveStatus === 'success' && (
                  <>
                    <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 animate-bounce">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-emerald-500 font-display">Success!</h4>
                      <p className="text-[var(--text-secondary)] text-[10px] mt-1">Access updated successfully.</p>
                    </div>
                  </>
                )}

                {saveStatus === 'error' && (
                  <>
                    <div className="p-3 bg-rose-500/10 text-rose-500 rounded-full border border-rose-500/20 animate-pulse">
                      <AlertCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-rose-500 font-display">Failed</h4>
                      <p className="text-[var(--text-secondary)] text-[10px] mt-1">Failed to update access settings.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSaveStatus('idle')}
                      className="w-full mt-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:text-[var(--text-primary)] font-bold py-1.5 rounded-lg text-[10px] cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ==========================================
              MODAL: USER - MY PROFILE SETTINGS
              ========================================== */}
          {showMyProfileModal && user && (
            <div className="fixed inset-0 z-55 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in select-none">
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-2xl shadow-2xl w-full max-w-md animate-scale-up relative">
                <button 
                  onClick={() => setShowMyProfileModal(false)}
                  className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color)]">
                  <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                    <UserCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[var(--text-primary)] font-display">My Profile Settings</h3>
                    <p className="text-[var(--text-secondary)] text-[10px]">Update your contact details and account security passphrase</p>
                  </div>
                </div>

                {(profileError || profileSuccess) && (
                  <div className="mt-4">
                    {profileError && (
                      <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg flex items-center gap-2 text-red-500 text-xs">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{profileError}</span>
                      </div>
                    )}
                    {profileSuccess && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg flex items-center gap-2 text-emerald-500 text-xs">
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        <span>{profileSuccess}</span>
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={handleProfileUpdateSubmit} className="mt-4 flex flex-col gap-4">
                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Username (Locked)</label>
                    <div className="mt-1 relative opacity-70">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        disabled
                        value={user.username}
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] py-2 pl-10 pr-4 rounded-lg text-xs cursor-not-allowed select-none text-[var(--text-muted)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Mobile Phone Number</label>
                    <div className="mt-1 relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        required
                        placeholder="+919876543210"
                        value={profilePhone}
                        onChange={e => setProfilePhone(e.target.value)}
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 pl-10 pr-4 rounded-lg text-xs focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Email Address ID</label>
                    <div className="mt-1 relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input
                        type="email"
                        placeholder="you@company.com"
                        value={profileEmail}
                        onChange={e => setProfileEmail(e.target.value)}
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 pl-10 pr-4 rounded-lg text-xs focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="border-t border-[var(--border-color)] pt-3 mt-1">
                    <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase block mb-3">Change Security Password</span>
                    
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="text-[8px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">New Password</label>
                        <div className="mt-1 relative">
                          <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                          <input
                            type="password"
                            placeholder="Leave blank to keep current"
                            value={profilePassword}
                            onChange={e => setProfilePassword(e.target.value)}
                            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 pl-10 pr-4 rounded-lg text-xs focus:outline-none transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[8px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Confirm New Password</label>
                        <div className="mt-1 relative">
                          <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                          <input
                            type="password"
                            placeholder="Re-type new password"
                            value={profileConfirmPassword}
                            onChange={e => setProfileConfirmPassword(e.target.value)}
                            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 pl-10 pr-4 rounded-lg text-xs focus:outline-none transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[var(--border-color)]/50 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowMyProfileModal(false)}
                      className="px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={profileLoading}
                      className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shadow-md shadow-indigo-600/10 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      {profileLoading ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span>Save Changes</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          
        </div>
      )}

      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
        BACKEND_URL={BACKEND_URL}
        initialCompanyCode={loginForm.companyCode}
        initialUsername={loginForm.username}
      />
    </div>
  );
}
