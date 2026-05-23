import React, { useState, useEffect } from 'react';
import { MASTER_FEATURES_HIERARCHY } from '../features';
import {
  Building,
  DollarSign,
  Shield,
  FileText,
  Workflow,
  Bell,
  Archive,
  Database,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Search,
  RefreshCw,
  Sliders,
  Sparkles,
  Download,
  X,
  ChevronRight,
  ChevronLeft,
  Mail,
  GitMerge,
  Edit2,
  PlusCircle
} from 'lucide-react';

interface GeneralAdminProps {
  user: {
    id: string;
    username: string;
    companyCode: string;
    role: string | null;
    isSuperAdmin: boolean;
  };
  token: string;
  backendUrl: string;
  socket: any;
  companyFeatures: string[];
  onUpdateFeatures: (features: string[]) => void;
  initialTab?: 'profile' | 'tax' | 'currency' | 'audit' | 'workflow' | 'notifications' | 'dms' | 'backup' | 'features' | 'email' | 'org';
  initialOrgSubTab?: 'dept_crud' | 'org_chart';
}

export default function GeneralAdmin({
  user,
  token,
  backendUrl,
  socket,
  companyFeatures,
  onUpdateFeatures,
  initialTab,
  initialOrgSubTab
}: GeneralAdminProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'profile' | 'tax' | 'currency' | 'audit' | 'workflow' | 'notifications' | 'dms' | 'backup' | 'features' | 'email' | 'org'>('profile');

  // Wizard state for Onboarding/Profile
  const [wizardStep, setWizardStep] = useState(1);

  // States
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Company Profile Form States
  const [companyProfile, setCompanyProfile] = useState<any>({
    name: '',
    legalCompanyName: '',
    companyLogo: '',
    companyBanner: '',
    companyEmail: '',
    companyPhone: '',
    alternatePhone: '',
    website: '',
    industryType: '',
    businessType: '',
    companyDescription: '',
    gstin: '',
    pan: '',
    tan: '',
    vatNumber: '',
    cinNumber: '',
    msmeNumber: '',
    country: '',
    state: '',
    city: '',
    pincode: '',
    addressLine1: '',
    addressLine2: '',
    landmark: '',
    fiscalYearStart: '',
    fiscalYearEnd: '',
    currencyId: '',
    timezone: '',
    dateFormat: '',
    language: '',
    decimalPrecision: 2,
    primaryColor: '#6366f1',
    secondaryColor: '#4f46e5',
    dashboardTheme: 'dark',
    favicon: '',
    invoiceTemplate: 'STANDARD',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    smtpSecure: false,
    smtpSender: ''
  });

  // 2. Tax State & Engine
  const [taxSettings, setTaxSettings] = useState<any[]>([]);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [taxForm, setTaxForm] = useState({
    taxName: '',
    taxCode: '',
    taxPercentage: 0,
    taxType: 'GST' as any,
    effectiveDate: new Date().toISOString().split('T')[0],
    taxStatus: 'ACTIVE',
    hsnSacCode: '',
    category: '',
    isReverseCharge: false,
    description: ''
  });
  const [calcAmount, setCalcAmount] = useState('1000');
  const [calcTaxCode, setCalcTaxCode] = useState('');
  const [calcResult, setCalcResult] = useState<any>(null);

  // 3. Currency State
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [currencyForm, setCurrencyForm] = useState({
    currencyCode: '',
    currencyName: '',
    symbol: '',
    decimalPlaces: 2,
    exchangeRate: 1.0,
    activeStatus: 'ACTIVE',
    isBase: false
  });
  const [convAmount, setConvAmount] = useState('100');
  const [convFromCode, setConvFromCode] = useState('USD');
  const [convToCode, setConvToCode] = useState('INR');
  const [convResult, setConvResult] = useState<number | null>(null);

  // 4. Audit Trail States
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditFilters, setAuditFilters] = useState({
    moduleName: '',
    actionType: '',
    startDate: '',
    endDate: '',
    search: ''
  });

  // 5. Workflow States
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [workflowForm, setWorkflowForm] = useState({
    workflowName: '',
    module: 'expenses' as any,
    conditions: '',
    minAmount: 0,
    maxAmount: 1000000,
    autoApprove: false,
    escalationTime: 24,
    isActive: true,
    steps: [{ approverRole: 'Manager', approverRoleId: '', approverUserId: '', stepOrder: 1 }]
  });
  const [approvalRequests, setApprovalRequests] = useState<any[]>([]);
  const [activeApprovalTab, setActiveApprovalTab] = useState<'queue' | 'history'>('queue');
  const [approvalComment, setApprovalComment] = useState('');

  // 6. Notification Center States
  const [allNotifications, setAllNotifications] = useState<any[]>([]);
  const [notificationFilter, setNotificationFilter] = useState<'ALL' | 'UNREAD' | 'ARCHIVED'>('ALL');

  // 7. DMS States
  const [documents, setDocuments] = useState<any[]>([]);
  const [showDocModal, setShowDocModal] = useState(false);
  const [docForm, setDocForm] = useState({
    documentName: '',
    fileType: 'PDF' as any,
    base64Content: '',
    module: 'general',
    relatedEntityId: ''
  });
  const [selectedDocForVersion, setSelectedDocForVersion] = useState<any>(null);
  const [newVersionForm, setNewVersionForm] = useState({
    base64Content: '',
    description: ''
  });

  // 8. Backups States
  const [backups, setBackups] = useState<any[]>([]);

  // 10. Email Diagnostics States
  const [emailTestLogs, setEmailTestLogs] = useState<string[]>([]);
  const [testingEmail, setTestingEmail] = useState(false);

  // 11. Department and Employee states
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [orgSubTab, setOrgSubTab] = useState<'dept_crud' | 'org_chart'>('dept_crud');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (initialOrgSubTab) {
      setOrgSubTab(initialOrgSubTab);
    }
  }, [initialOrgSubTab]);
  const [deptForm, setDeptForm] = useState({
    departmentCode: '',
    departmentName: '',
    managerId: '',
    parentDepartmentId: ''
  });
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<any | null>(null);

  // 9. Feature Toggles
  const [allFeatures, setAllFeatures] = useState<string[]>([]);
  const [featuresList] = useState<any[]>([
    { key: 'CRM', name: 'Sales & CRM Module', description: 'Enable sales lead tracking and corporate pipelines' },
    { key: 'CRM_LEADS', name: 'Leads & Opportunities', description: 'Deep sales pipeline details' },
    { key: 'CRM_CUSTOMER', name: 'Customer Database', description: 'Central storage of client portfolios' },
    { key: 'HR', name: 'Human Resources Module', description: 'Manage employee directories and contracts' },
    { key: 'HR_ROSTER', name: 'Roster Schedule', description: 'Staff timings and workspace presence controls' },
    { key: 'HR_ATTENDANCE', name: 'Attendance & Checkins', description: 'Visual punches logs' },
    { key: 'FINANCE', name: 'Financials Core', description: 'Full double-entry ledger book-keeping' },
    { key: 'FINANCE_LEDGER', name: 'General Ledger', description: 'Tax reports, statements generator' },
    { key: 'FINANCE_INVOICING', name: 'Invoicing Terminal', description: 'Billing portals and PDF invoice creation' },
    { key: 'NOTIFICATIONS', name: 'System Alerts Engine', description: 'Live triggers and background push signals' }
  ]);

  // Load Initial Data
  useEffect(() => {
    fetchCompanyProfile();
    fetchTaxSettings();
    fetchCurrencies();
    fetchAuditLogs();
    fetchWorkflows();
    fetchApprovalRequests();
    fetchNotifications();
    fetchDocuments();
    fetchBackups();
    fetchCompanyFeatures();
    if (activeTab === 'org') {
      fetchDepartments();
      fetchEmployees();
    }
  }, [activeTab]);

  // Alert dismiss timers
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(''), 4000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(''), 5000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  // Live updates via Sockets
  useEffect(() => {
    if (socket) {
      const handleNotification = (notif: any) => {
        setAllNotifications(prev => [notif, ...prev]);
        if (activeTab === 'notifications' || activeTab === 'workflow') {
          fetchNotifications();
          fetchApprovalRequests();
        }
      };

      socket.on('notification', handleNotification);
      return () => {
        socket.off('notification', handleNotification);
      };
    }
  }, [socket, activeTab]);

  // API Call Helpers
  async function apiRequest(endpoint: string, method = 'GET', body: any = null) {
    const headers: any = {
      'Authorization': `Bearer ${token}`
    };
    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${backendUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Something went wrong');
    }
    return data;
  }

  // File Upload to Base64 Helper
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string, formSetter: any) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        formSetter((prev: any) => ({
          ...prev,
          [fieldName]: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // 1. Company profile APIs
  async function fetchCompanyProfile() {
    try {
      const data = await apiRequest('/api/admin/company/profile');
      if (data.company) {
        // Safe mapping to state
        const c = data.company;
        setCompanyProfile({
          name: c.name || '',
          legalCompanyName: c.legalCompanyName || '',
          companyLogo: c.companyLogo || '',
          companyBanner: c.companyBanner || '',
          companyEmail: c.companyEmail || '',
          companyPhone: c.companyPhone || '',
          alternatePhone: c.alternatePhone || '',
          website: c.website || '',
          industryType: c.industryType || '',
          businessType: c.businessType || '',
          companyDescription: c.companyDescription || '',
          gstin: c.gstin || '',
          pan: c.pan || '',
          tan: c.tan || '',
          vatNumber: c.vatNumber || '',
          cinNumber: c.cinNumber || '',
          msmeNumber: c.msmeNumber || '',
          country: c.country || '',
          state: c.state || '',
          city: c.city || '',
          pincode: c.pincode || '',
          addressLine1: c.addressLine1 || '',
          addressLine2: c.addressLine2 || '',
          landmark: c.landmark || '',
          fiscalYearStart: c.fiscalYearStart || '',
          fiscalYearEnd: c.fiscalYearEnd || '',
          currencyId: c.currencyId || '',
          timezone: c.timezone || '',
          dateFormat: c.dateFormat || '',
          language: c.language || '',
          decimalPrecision: c.decimalPrecision ?? 2,
          primaryColor: c.primaryColor || '#6366f1',
          secondaryColor: c.secondaryColor || '#4f46e5',
          dashboardTheme: c.dashboardTheme || 'dark',
          favicon: c.favicon || '',
          invoiceTemplate: c.invoiceTemplate || 'STANDARD',
          smtpHost: c.smtpHost || '',
          smtpPort: c.smtpPort ?? 587,
          smtpUser: c.smtpUser || '',
          smtpPassword: c.smtpPassword || '',
          smtpSecure: c.smtpSecure ?? false,
          smtpSender: c.smtpSender || ''
        });
      }
    } catch (e: any) {
      console.error(e);
    }
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest('/api/admin/company/profile', 'PATCH', companyProfile);
      setSuccessMsg('Company Profile & settings saved successfully!');
      fetchCompanyProfile();
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  }

  // 2. Tax Settings APIs
  async function fetchTaxSettings() {
    try {
      const data = await apiRequest('/api/admin/tax/settings');
      setTaxSettings(data.taxSettings || []);
      if (data.taxSettings?.length > 0 && !calcTaxCode) {
        setCalcTaxCode(data.taxSettings[0].taxCode);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleTaxSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest('/api/admin/tax/setting', 'POST', taxForm);
      setSuccessMsg('Tax setting added successfully!');
      setShowTaxModal(false);
      fetchTaxSettings();
      // Reset form
      setTaxForm({
        taxName: '',
        taxCode: '',
        taxPercentage: 0,
        taxType: 'GST',
        effectiveDate: new Date().toISOString().split('T')[0],
        taxStatus: 'ACTIVE',
        hsnSacCode: '',
        category: '',
        isReverseCharge: false,
        description: ''
      });
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteTax(id: string) {
    if (!confirm('Are you sure you want to delete this tax slab?')) return;
    try {
      await apiRequest(`/api/admin/tax/setting/${id}`, 'DELETE');
      setSuccessMsg('Tax setting deleted successfully');
      fetchTaxSettings();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  }

  async function handleCalculateTax() {
    try {
      const data = await apiRequest('/api/admin/tax/calculate', 'POST', {
        amount: Number(calcAmount),
        taxCode: calcTaxCode
      });
      setCalcResult(data);
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  }

  // 3. Currency APIs
  async function fetchCurrencies() {
    try {
      const data = await apiRequest('/api/admin/currencies');
      setCurrencies(data.currencies || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCurrencySubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest('/api/admin/currency', 'POST', currencyForm);
      setSuccessMsg('Currency rate registered successfully!');
      setShowCurrencyModal(false);
      fetchCurrencies();
      setCurrencyForm({
        currencyCode: '',
        currencyName: '',
        symbol: '',
        decimalPlaces: 2,
        exchangeRate: 1.0,
        activeStatus: 'ACTIVE',
        isBase: false
      });
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCurrency(id: string) {
    if (!confirm('Are you sure you want to remove this currency?')) return;
    try {
      await apiRequest(`/api/admin/currency/${id}`, 'DELETE');
      setSuccessMsg('Currency deleted successfully');
      fetchCurrencies();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  }

  function handleConvertCurrency() {
    const from = currencies.find(c => c.currencyCode === convFromCode);
    const to = currencies.find(c => c.currencyCode === convToCode);
    if (!from || !to) {
      setErrorMsg('Selected conversion currencies not configured.');
      return;
    }
    const baseAmt = Number(convAmount) / from.exchangeRate;
    const finalAmt = baseAmt * to.exchangeRate;
    setConvResult(Number(finalAmt.toFixed(to.decimalPlaces)));
  }

  // 4. Audit Log APIs
  async function fetchAuditLogs() {
    try {
      const queryParams = new URLSearchParams();
      if (auditFilters.moduleName) queryParams.append('moduleName', auditFilters.moduleName);
      if (auditFilters.actionType) queryParams.append('actionType', auditFilters.actionType);
      if (auditFilters.startDate) queryParams.append('startDate', auditFilters.startDate);
      if (auditFilters.endDate) queryParams.append('endDate', auditFilters.endDate);
      if (auditFilters.search) queryParams.append('search', auditFilters.search);

      const data = await apiRequest(`/api/admin/audit-logs?${queryParams.toString()}`);
      setAuditLogs(data.auditLogs || []);
    } catch (e) {
      console.error(e);
    }
  }

  // 5. Workflows APIs
  async function fetchWorkflows() {
    try {
      const data = await apiRequest('/api/admin/workflows');
      setWorkflows(data.workflows || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchApprovalRequests() {
    try {
      const data = await apiRequest('/api/admin/approvals');
      setApprovalRequests(data.approvalRequests || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleWorkflowSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest('/api/admin/workflow', 'POST', {
        ...workflowForm,
        minAmount: Number(workflowForm.minAmount),
        maxAmount: Number(workflowForm.maxAmount),
        escalationTime: Number(workflowForm.escalationTime)
      });
      setSuccessMsg('Approval workflow policy created successfully!');
      setShowWorkflowModal(false);
      fetchWorkflows();
      setWorkflowForm({
        workflowName: '',
        module: 'expenses',
        conditions: '',
        minAmount: 0,
        maxAmount: 1000000,
        autoApprove: false,
        escalationTime: 24,
        isActive: true,
        steps: [{ approverRole: 'Manager', approverRoleId: '', approverUserId: '', stepOrder: 1 }]
      });
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprovalAction(requestId: string, action: 'APPROVE' | 'REJECT' | 'ESCALATE') {
    if (!approvalComment && action === 'REJECT') {
      setErrorMsg('Rejection comment explanation is required.');
      return;
    }
    setLoading(true);
    try {
      await apiRequest('/api/admin/approval/action', 'POST', {
        requestId,
        action,
        comment: approvalComment
      });
      setSuccessMsg(`Approval successfully resolved with: ${action}`);
      setApprovalComment('');
      fetchApprovalRequests();
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  }

  // 6. Notification Center
  async function fetchNotifications() {
    try {
      const data = await apiRequest('/api/notifications');
      setAllNotifications(data.notifications || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleMarkRead(id: string) {
    try {
      await apiRequest(`/api/notifications/${id}/read`, 'PATCH');
      fetchNotifications();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  }

  async function handleArchiveNotification(id: string) {
    try {
      await apiRequest(`/api/notifications/${id}/archive`, 'PATCH');
      setSuccessMsg('Notification archived successfully');
      fetchNotifications();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  }

  // 7. DMS APIs
  async function fetchDocuments() {
    try {
      const data = await apiRequest('/api/admin/documents');
      setDocuments(data.documents || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDocSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!docForm.base64Content) {
      setErrorMsg('Please select a file to upload');
      return;
    }
    setLoading(true);
    try {
      await apiRequest('/api/admin/document/upload', 'POST', docForm);
      setSuccessMsg('Document successfully uploaded to DMS drive!');
      setShowDocModal(false);
      fetchDocuments();
      setDocForm({
        documentName: '',
        fileType: 'PDF',
        base64Content: '',
        module: 'general',
        relatedEntityId: ''
      });
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleNewVersionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newVersionForm.base64Content) {
      setErrorMsg('Please upload a file version');
      return;
    }
    setLoading(true);
    try {
      await apiRequest(`/api/admin/document/${selectedDocForVersion.id}/version`, 'POST', newVersionForm);
      setSuccessMsg('Document version updated successfully!');
      setSelectedDocForVersion(null);
      fetchDocuments();
      setNewVersionForm({ base64Content: '', description: '' });
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  }

  // 8. Backups APIs
  async function fetchBackups() {
    try {
      const data = await apiRequest('/api/admin/backups');
      setBackups(data.backups || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleTriggerBackup() {
    setLoading(true);
    try {
      await apiRequest('/api/admin/backup/trigger', 'POST');
      setSuccessMsg('Manual SQLite DB backup generated successfully!');
      fetchBackups();
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRestoreBackup(id: string) {
    if (!confirm('🚨 CRITICAL WARNING: Restoring will overwrite all current system data with the backup file. Proceed with extreme caution!')) return;
    setLoading(true);
    try {
      await apiRequest('/api/admin/backup/restore', 'POST', { id });
      setSuccessMsg('System database successfully restored! Please refresh the page.');
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  }

  // 10. Email Connection Handshake Diagnostics & Custom SMTP Save
  async function handleTestSMTPConnection() {
    setTestingEmail(true);
    setEmailTestLogs([`[${new Date().toISOString()}] 🔍 Diagnostic starting...`]);
    try {
      const data = await apiRequest('/api/admin/email/test', 'POST', {
        smtpHost: companyProfile.smtpHost || '',
        smtpPort: Number(companyProfile.smtpPort) || 587,
        smtpUser: companyProfile.smtpUser || '',
        smtpPassword: companyProfile.smtpPassword || '',
        smtpSecure: Boolean(companyProfile.smtpSecure),
        smtpSender: companyProfile.smtpSender || ''
      });
      if (data.logs) {
        setEmailTestLogs(data.logs);
      }
      setSuccessMsg('SMTP connectivity handshake diagnostic succeeded!');
    } catch (err: any) {
      setErrorMsg(`SMTP test failed: ${err.message}`);
      setEmailTestLogs(prev => [
        ...prev,
        `[${new Date().toISOString()}] ❌ Handshake failed: ${err.message}`,
        `[${new Date().toISOString()}] 🛑 Diagnostic terminated with errors.`
      ]);
    } finally {
      setTestingEmail(false);
    }
  }

  async function handleSaveSMTPSettings(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest('/api/admin/company/profile', 'PATCH', {
        smtpHost: companyProfile.smtpHost,
        smtpPort: Number(companyProfile.smtpPort),
        smtpUser: companyProfile.smtpUser,
        smtpPassword: companyProfile.smtpPassword,
        smtpSecure: Boolean(companyProfile.smtpSecure),
        smtpSender: companyProfile.smtpSender
      });
      setSuccessMsg('SMTP email configuration saved successfully!');
      fetchCompanyProfile();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  // 11. Department and Employee org hierarchy CRUD
  async function fetchDepartments() {
    try {
      const data = await apiRequest('/api/admin/departments');
      setDepartments(data.departments || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchEmployees() {
    try {
      const data = await apiRequest('/api/mdm/employee');
      setEmployees(data.records || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDeptSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        departmentCode: deptForm.departmentCode,
        departmentName: deptForm.departmentName,
        managerId: deptForm.managerId || null,
        parentDepartmentId: deptForm.parentDepartmentId || null
      };

      if (editingDept) {
        await apiRequest(`/api/admin/departments/${editingDept.id}`, 'PATCH', payload);
        setSuccessMsg('Department details updated successfully!');
      } else {
        await apiRequest('/api/admin/departments', 'POST', payload);
        setSuccessMsg('New department created successfully!');
      }
      setShowDeptModal(false);
      setEditingDept(null);
      setDeptForm({ departmentCode: '', departmentName: '', managerId: '', parentDepartmentId: '' });
      fetchDepartments();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteDept(id: string) {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      await apiRequest(`/api/admin/departments/${id}`, 'DELETE');
      setSuccessMsg('Department deleted successfully!');
      fetchDepartments();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  // 9. Feature Toggles APIs
  async function fetchCompanyFeatures() {
    try {
      const data = await apiRequest('/api/admin/features');
      setAllFeatures(data.features || []);
      onUpdateFeatures(data.features || []); // Dynamic sidebar state update!
    } catch (e) {
      console.error(e);
    }
  }

  async function handleToggleFeature(featureKey: string, enable: boolean) {
    setLoading(true);
    try {
      await apiRequest('/api/super/feature/toggle', 'POST', {
        companyId: companyProfile.id || user.id, // Fallback if no profile ID yet
        featureKey,
        enable
      });
      setSuccessMsg(`Feature '${featureKey}' has been ${enable ? 'ENABLED' : 'DISABLED'}`);
      fetchCompanyFeatures();
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto select-none animate-fade-in text-left">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[var(--border-color)] pb-4 mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2 font-display">
            <Building className="w-6 h-6 text-indigo-500" />
            General & Administration Core Hub
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Control company profiles, workflow approvals, tax slabs, secure documents, backups, and feature configurations.</p>
        </div>
        <div className="flex items-center gap-2 mt-3 md:mt-0">
          <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 px-2.5 py-1 rounded-full uppercase">
            Tenant: {user.companyCode}
          </span>
          <span className="text-[10px] bg-slate-500/10 text-slate-400 font-bold border border-slate-500/20 px-2.5 py-1 rounded-full uppercase">
            Role: {user.role || 'Admin'}
          </span>
        </div>
      </div>

      {/* Action Messages */}
      {successMsg && (
        <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs py-3 px-4 rounded-xl flex items-center gap-2.5 animate-fade-in shadow-lg">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs py-3 px-4 rounded-xl flex items-center gap-2.5 animate-fade-in shadow-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}


      {/* Main Tab Panel Rendering */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 rounded-2xl shadow-xl min-h-[400px]">

        {/* 1. COMPANY PROFILE TAB */}
        {activeTab === 'profile' && (
          <div>
            {/* Onboarding wizard tracker header */}
            <div className="mb-8 border-b border-[var(--border-color)]/60 pb-6">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-1.5 uppercase tracking-wider font-display">
                <Sparkles className="w-4 h-4 text-amber-500" /> Onboarding Setup Wizard
              </h3>
              <div className="flex items-center justify-between max-w-lg mx-auto">
                {[1, 2, 3, 4].map(step => (
                  <button
                    key={step}
                    onClick={() => setWizardStep(step)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      wizardStep === step
                        ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/30'
                        : wizardStep > step
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[var(--bg-primary)] text-[var(--text-muted)] border border-[var(--border-color)]'
                    }`}>
                      {step}
                    </div>
                    {step < 4 && <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" />}
                  </button>
                ))}
              </div>
              <div className="text-center mt-3">
                <span className="text-[11px] font-extrabold text-[var(--text-secondary)] uppercase tracking-widest block">
                  {wizardStep === 1 && 'Step 1: General Business Information'}
                  {wizardStep === 2 && 'Step 2: Corporate Tax & Identifiers'}
                  {wizardStep === 3 && 'Step 3: Business Address & Presence'}
                  {wizardStep === 4 && 'Step 4: Custom Branding & Style Palette'}
                </span>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="flex flex-col gap-6">
              {/* Wizard Step 1: Info */}
              {wizardStep === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in text-left">
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Company Display Name</label>
                    <input
                      type="text"
                      required
                      value={companyProfile.name}
                      onChange={e => setCompanyProfile({ ...companyProfile, name: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Legal Company Name</label>
                    <input
                      type="text"
                      value={companyProfile.legalCompanyName}
                      onChange={e => setCompanyProfile({ ...companyProfile, legalCompanyName: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Company Primary Email</label>
                    <input
                      type="email"
                      value={companyProfile.companyEmail}
                      onChange={e => setCompanyProfile({ ...companyProfile, companyEmail: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Primary Phone</label>
                    <input
                      type="text"
                      value={companyProfile.companyPhone}
                      onChange={e => setCompanyProfile({ ...companyProfile, companyPhone: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Alternate Phone</label>
                    <input
                      type="text"
                      value={companyProfile.alternatePhone}
                      onChange={e => setCompanyProfile({ ...companyProfile, alternatePhone: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Website URL</label>
                    <input
                      type="text"
                      value={companyProfile.website}
                      onChange={e => setCompanyProfile({ ...companyProfile, website: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none"
                      placeholder="https://example.com"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Industry Sector</label>
                    <input
                      type="text"
                      value={companyProfile.industryType}
                      onChange={e => setCompanyProfile({ ...companyProfile, industryType: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none"
                      placeholder="e.g. IT, Manufacturing, CRM"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Business Incorporation Type</label>
                    <input
                      type="text"
                      value={companyProfile.businessType}
                      onChange={e => setCompanyProfile({ ...companyProfile, businessType: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none"
                      placeholder="e.g. LLC, Pvt Ltd, Sole Proprietorship"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Business Narrative Description</label>
                    <textarea
                      value={companyProfile.companyDescription}
                      onChange={e => setCompanyProfile({ ...companyProfile, companyDescription: e.target.value })}
                      rows={3}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Wizard Step 2: Tax Info */}
              {wizardStep === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in text-left">
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">GSTIN (GST Identification Number)</label>
                    <input
                      type="text"
                      value={companyProfile.gstin}
                      onChange={e => setCompanyProfile({ ...companyProfile, gstin: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">PAN Number</label>
                    <input
                      type="text"
                      value={companyProfile.pan}
                      onChange={e => setCompanyProfile({ ...companyProfile, pan: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">TAN Number</label>
                    <input
                      type="text"
                      value={companyProfile.tan}
                      onChange={e => setCompanyProfile({ ...companyProfile, tan: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">VAT registration Number</label>
                    <input
                      type="text"
                      value={companyProfile.vatNumber}
                      onChange={e => setCompanyProfile({ ...companyProfile, vatNumber: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Corporate CIN (Company Identification Number)</label>
                    <input
                      type="text"
                      value={companyProfile.cinNumber}
                      onChange={e => setCompanyProfile({ ...companyProfile, cinNumber: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">MSME Certificate Number</label>
                    <input
                      type="text"
                      value={companyProfile.msmeNumber}
                      onChange={e => setCompanyProfile({ ...companyProfile, msmeNumber: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Wizard Step 3: Address */}
              {wizardStep === 3 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in text-left">
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Address Line 1</label>
                    <input
                      type="text"
                      value={companyProfile.addressLine1}
                      onChange={e => setCompanyProfile({ ...companyProfile, addressLine1: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Address Line 2</label>
                    <input
                      type="text"
                      value={companyProfile.addressLine2}
                      onChange={e => setCompanyProfile({ ...companyProfile, addressLine2: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Landmark</label>
                    <input
                      type="text"
                      value={companyProfile.landmark}
                      onChange={e => setCompanyProfile({ ...companyProfile, landmark: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">City</label>
                    <input
                      type="text"
                      value={companyProfile.city}
                      onChange={e => setCompanyProfile({ ...companyProfile, city: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">State / Province</label>
                    <input
                      type="text"
                      value={companyProfile.state}
                      onChange={e => setCompanyProfile({ ...companyProfile, state: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Zip / Pincode</label>
                    <input
                      type="text"
                      value={companyProfile.pincode}
                      onChange={e => setCompanyProfile({ ...companyProfile, pincode: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Country</label>
                    <input
                      type="text"
                      value={companyProfile.country}
                      onChange={e => setCompanyProfile({ ...companyProfile, country: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Wizard Step 4: Branding */}
              {wizardStep === 4 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in text-left">
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Primary Color (Hex)</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={companyProfile.primaryColor}
                        onChange={e => setCompanyProfile({ ...companyProfile, primaryColor: e.target.value })}
                        className="bg-transparent border border-none rounded cursor-pointer w-8 h-8"
                      />
                      <input
                        type="text"
                        value={companyProfile.primaryColor}
                        onChange={e => setCompanyProfile({ ...companyProfile, primaryColor: e.target.value })}
                        className="bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 rounded-xl text-xs text-[var(--text-primary)] w-full focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Secondary Color (Hex)</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={companyProfile.secondaryColor}
                        onChange={e => setCompanyProfile({ ...companyProfile, secondaryColor: e.target.value })}
                        className="bg-transparent border border-none rounded cursor-pointer w-8 h-8"
                      />
                      <input
                        type="text"
                        value={companyProfile.secondaryColor}
                        onChange={e => setCompanyProfile({ ...companyProfile, secondaryColor: e.target.value })}
                        className="bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 rounded-xl text-xs text-[var(--text-primary)] w-full focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Company Logo (.png, .jpg)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleFileChange(e, 'companyLogo', setCompanyProfile)}
                      className="text-xs text-[var(--text-muted)] cursor-pointer"
                    />
                    {companyProfile.companyLogo && (
                      <img src={companyProfile.companyLogo.startsWith('data:') ? companyProfile.companyLogo : `${backendUrl}${companyProfile.companyLogo}`} alt="logo" className="w-16 h-16 mt-2 rounded border border-[var(--border-color)] object-contain bg-white" />
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Favicon (.ico, .png)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleFileChange(e, 'favicon', setCompanyProfile)}
                      className="text-xs text-[var(--text-muted)] cursor-pointer"
                    />
                    {companyProfile.favicon && (
                      <img src={companyProfile.favicon.startsWith('data:') ? companyProfile.favicon : `${backendUrl}${companyProfile.favicon}`} alt="favicon" className="w-8 h-8 mt-2 rounded border border-[var(--border-color)] object-contain bg-white" />
                    )}
                  </div>
                </div>
              )}

              {/* Wizard navigation triggers */}
              <div className="flex justify-between items-center border-t border-[var(--border-color)] pt-5 mt-4">
                <button
                  type="button"
                  disabled={wizardStep === 1}
                  onClick={() => setWizardStep(prev => Math.max(1, prev - 1))}
                  className="px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] disabled:opacity-40 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous Step
                </button>

                {wizardStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(prev => Math.min(4, prev + 1))}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    Next Step <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-colors shadow-lg"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Save Company Profile Settings
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* 2. TAX SETTINGS TAB */}
        {activeTab === 'tax' && (
          <div className="flex flex-col gap-6 animate-fade-in text-left">
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)] font-display flex items-center gap-1.5 uppercase tracking-wide">
                <DollarSign className="w-4 h-4 text-emerald-400" /> GST / Taxation Settings slabs
              </h3>
              <button
                onClick={() => setShowTaxModal(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-md"
              >
                <Plus className="w-3.5 h-3.5" /> Add Tax slab
              </button>
            </div>

            {/* List Tax Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              {taxSettings.length === 0 ? (
                <div className="col-span-full bg-[var(--bg-primary)] p-8 text-center rounded-xl border border-[var(--border-color)]">
                  <AlertCircle className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                  <p className="text-xs text-[var(--text-secondary)]">No taxation slabs configured. Click "Add Tax slab" to initialize.</p>
                </div>
              ) : (
                taxSettings.map((tax: any) => (
                  <div key={tax.id} className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-4.5 relative shadow flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-bold border border-indigo-500/20 px-2 py-0.5 rounded uppercase font-mono">
                          {tax.taxCode}
                        </span>
                        <button
                          onClick={() => handleDeleteTax(tax.id)}
                          className="text-rose-400 hover:text-rose-300 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <h4 className="font-bold text-sm text-[var(--text-primary)] mt-3 font-display">{tax.taxName}</h4>
                      <p className="text-2xl font-extrabold text-indigo-400 font-mono mt-1.5">{tax.taxPercentage}%</p>
                      <div className="mt-3.5 flex flex-col gap-1 text-[11px] text-[var(--text-secondary)]">
                        <span>Type: <span className="font-bold text-[var(--text-primary)]">{tax.taxType}</span></span>
                        <span>HSN/SAC: <span className="font-mono text-[var(--text-primary)]">{tax.hsnSacCode || 'N/A'}</span></span>
                        <span>Reverse Charge: <span className="font-bold text-[var(--text-primary)]">{tax.isReverseCharge ? 'Yes' : 'No'}</span></span>
                        <span>Effective: <span className="font-mono text-[var(--text-primary)]">{new Date(tax.effectiveDate).toLocaleDateString()}</span></span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Reusable Tax Engine Calculator Widget */}
            <div className="mt-6 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-5 shadow">
              <h4 className="font-bold text-xs text-[var(--text-primary)] uppercase tracking-wider mb-4 flex items-center gap-1.5 font-display">
                <Sparkles className="w-4 h-4 text-emerald-400" /> Reusable Taxation Calculation Engine Widget
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Net Invoice Amount ($)</label>
                  <input
                    type="number"
                    value={calcAmount}
                    onChange={e => setCalcAmount(e.target.value)}
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Select Tax Slab Code</label>
                  <select
                    value={calcTaxCode}
                    onChange={e => setCalcTaxCode(e.target.value)}
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Choose Tax Code --</option>
                    {taxSettings.map((tax: any) => (
                      <option key={tax.id} value={tax.taxCode}>{tax.taxCode} ({tax.taxPercentage}%)</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleCalculateTax}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-4 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-md h-[38px] flex items-center justify-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" /> Calculate Invoice Split
                </button>
              </div>

              {calcResult && (
                <div className="mt-5 border-t border-[var(--border-color)] pt-4 grid grid-cols-2 md:grid-cols-4 gap-4 animate-scale-up text-left">
                  <div className="bg-[var(--bg-secondary)] p-3 rounded-xl border border-[var(--border-color)]">
                    <span className="text-[9px] text-[var(--text-secondary)] uppercase block">Net Amount</span>
                    <span className="text-sm font-bold font-mono text-[var(--text-primary)]">${calcResult.netAmount.toFixed(2)}</span>
                  </div>
                  <div className="bg-[var(--bg-secondary)] p-3 rounded-xl border border-[var(--border-color)]">
                    <span className="text-[9px] text-[var(--text-secondary)] uppercase block">Total Tax ({calcResult.taxPercentage}%)</span>
                    <span className="text-sm font-bold font-mono text-indigo-400">${calcResult.totalTax.toFixed(2)}</span>
                  </div>
                  <div className="bg-[var(--bg-secondary)] p-3 rounded-xl border border-[var(--border-color)]">
                    <span className="text-[9px] text-[var(--text-secondary)] uppercase block">Tax Splits (CGST / SGST / IGST)</span>
                    <span className="text-[11px] font-mono text-[var(--text-primary)] block mt-0.5">CGST: ${calcResult.breakdown.cgst.toFixed(2)}</span>
                    <span className="text-[11px] font-mono text-[var(--text-primary)] block">SGST: ${calcResult.breakdown.sgst.toFixed(2)}</span>
                    {calcResult.breakdown.igst > 0 && <span className="text-[11px] font-mono text-[var(--text-primary)] block">IGST: ${calcResult.breakdown.igst.toFixed(2)}</span>}
                  </div>
                  <div className="bg-[var(--bg-secondary)] p-3 rounded-xl border border-[var(--border-color)]">
                    <span className="text-[9px] text-[var(--text-secondary)] uppercase block">Gross Amount</span>
                    <span className="text-sm font-bold font-mono text-emerald-400">${calcResult.grossAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Tax Add Modal */}
            {showTaxModal && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
                <form onSubmit={handleTaxSubmit} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg p-6 relative shadow-2xl animate-scale-up text-left">
                  <button
                    type="button"
                    onClick={() => setShowTaxModal(false)}
                    className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <h3 className="font-display font-extrabold text-sm text-[var(--text-primary)] border-b border-[var(--border-color)] pb-3 mb-4 uppercase tracking-wider">
                    Register New Taxation Slab
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Tax Display Name</label>
                      <input
                        type="text"
                        required
                        value={taxForm.taxName}
                        onChange={e => setTaxForm({ ...taxForm, taxName: e.target.value })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-1.5 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Tax Slab Code</label>
                      <input
                        type="text"
                        required
                        value={taxForm.taxCode}
                        onChange={e => setTaxForm({ ...taxForm, taxCode: e.target.value.toUpperCase() })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-1.5 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Tax Percentage (%)</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        value={taxForm.taxPercentage}
                        onChange={e => setTaxForm({ ...taxForm, taxPercentage: Number(e.target.value) })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-1.5 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Tax Type Category</label>
                      <select
                        value={taxForm.taxType}
                        onChange={e => setTaxForm({ ...taxForm, taxType: e.target.value as any })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-1.5 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                      >
                        <option value="GST">GST Split</option>
                        <option value="CGST">CGST Central</option>
                        <option value="SGST">SGST State</option>
                        <option value="IGST">IGST Integrated</option>
                        <option value="VAT">VAT Value Added</option>
                        <option value="TDS">TDS Deductibles</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">HSN/SAC Code</label>
                      <input
                        type="text"
                        value={taxForm.hsnSacCode}
                        onChange={e => setTaxForm({ ...taxForm, hsnSacCode: e.target.value })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-1.5 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Effective Date</label>
                      <input
                        type="date"
                        required
                        value={taxForm.effectiveDate}
                        onChange={e => setTaxForm({ ...taxForm, effectiveDate: e.target.value })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-1.5 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                      />
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={taxForm.isReverseCharge}
                        onChange={e => setTaxForm({ ...taxForm, isReverseCharge: e.target.checked })}
                        className="cursor-pointer"
                      />
                      <label className="text-[11px] font-bold text-[var(--text-secondary)] select-none">Reverse Charge mechanism support</label>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer flex items-center justify-center gap-1"
                  >
                    {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />} Register Slab
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* 3. MULTI-CURRENCY TAB */}
        {activeTab === 'currency' && (
          <div className="flex flex-col gap-6 animate-fade-in text-left">
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)] font-display flex items-center gap-1.5 uppercase tracking-wide">
                <Sliders className="w-4 h-4 text-amber-500" /> Multi-Currency Rates & conversion
              </h3>
              <button
                onClick={() => setShowCurrencyModal(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-md"
              >
                <Plus className="w-3.5 h-3.5" /> Add Currency
              </button>
            </div>

            {/* List Currencies */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              {currencies.length === 0 ? (
                <div className="col-span-full bg-[var(--bg-primary)] p-8 text-center rounded-xl border border-[var(--border-color)]">
                  <AlertCircle className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                  <p className="text-xs text-[var(--text-secondary)]">No currencies configured. Click "Add Currency" to configure exchange rates.</p>
                </div>
              ) : (
                currencies.map((curr: any) => (
                  <div key={curr.id} className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-4.5 relative shadow flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded border font-mono uppercase ${
                          curr.isBase
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25'
                        }`}>
                          {curr.currencyCode} {curr.isBase && '(Base)'}
                        </span>
                        {!curr.isBase && (
                          <button
                            onClick={() => handleDeleteCurrency(curr.id)}
                            className="text-rose-400 hover:text-rose-300 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-[var(--text-primary)] mt-3 font-display">{curr.currencyName} ({curr.symbol})</h4>
                      <p className="text-xl font-extrabold text-indigo-400 font-mono mt-1.5">Rate: {curr.exchangeRate} <span className="text-[10px] text-[var(--text-muted)]">relative to Base</span></p>
                      <div className="mt-2 text-[10px] text-[var(--text-muted)]">
                        Decimal positions: <span className="font-bold">{curr.decimalPlaces}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Currency conversion widget */}
            <div className="mt-6 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-5 shadow">
              <h4 className="font-bold text-xs text-[var(--text-primary)] uppercase tracking-wider mb-4 flex items-center gap-1.5 font-display">
                <Sparkles className="w-4 h-4 text-amber-500" /> Interactive Exchange Conversion Terminal
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Convert Amount</label>
                  <input
                    type="number"
                    value={convAmount}
                    onChange={e => setConvAmount(e.target.value)}
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">From Currency</label>
                  <select
                    value={convFromCode}
                    onChange={e => setConvFromCode(e.target.value)}
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                  >
                    {currencies.map((curr: any) => (
                      <option key={curr.id} value={curr.currencyCode}>{curr.currencyCode} - {curr.currencyName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">To Currency</label>
                  <select
                    value={convToCode}
                    onChange={e => setConvToCode(e.target.value)}
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                  >
                    {currencies.map((curr: any) => (
                      <option key={curr.id} value={curr.currencyCode}>{curr.currencyCode} - {curr.currencyName}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleConvertCurrency}
                  className="bg-amber-600 hover:bg-amber-500 text-white py-2 px-4 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-md h-[38px] flex items-center justify-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" /> Convert Amount
                </button>
              </div>

              {convResult !== null && (
                <div className="mt-5 border-t border-[var(--border-color)] pt-4 animate-scale-up text-left">
                  <div className="bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--border-color)] w-fit">
                    <span className="text-[9px] text-[var(--text-secondary)] uppercase tracking-widest block font-bold">Conversion Output Summary</span>
                    <span className="text-xl font-mono font-extrabold text-emerald-400 mt-1 block">
                      {currencies.find(c => c.currencyCode === convFromCode)?.symbol}{convAmount} = {currencies.find(c => c.currencyCode === convToCode)?.symbol}{convResult}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Currency Add Modal */}
            {showCurrencyModal && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
                <form onSubmit={handleCurrencySubmit} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl animate-scale-up text-left">
                  <button
                    type="button"
                    onClick={() => setShowCurrencyModal(false)}
                    className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <h3 className="font-display font-extrabold text-sm text-[var(--text-primary)] border-b border-[var(--border-color)] pb-3 mb-4 uppercase tracking-wider">
                    Register New Currency Slab
                  </h3>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Currency Code (e.g. USD, EUR)</label>
                      <input
                        type="text"
                        required
                        maxLength={5}
                        value={currencyForm.currencyCode}
                        onChange={e => setCurrencyForm({ ...currencyForm, currencyCode: e.target.value.toUpperCase() })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-1.5 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Currency Name (e.g. US Dollar)</label>
                      <input
                        type="text"
                        required
                        value={currencyForm.currencyName}
                        onChange={e => setCurrencyForm({ ...currencyForm, currencyName: e.target.value })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-1.5 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Currency Symbol (e.g. $, €)</label>
                      <input
                        type="text"
                        required
                        maxLength={5}
                        value={currencyForm.symbol}
                        onChange={e => setCurrencyForm({ ...currencyForm, symbol: e.target.value })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-1.5 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Exchange rate (Rel. to base)</label>
                      <input
                        type="number"
                        required
                        step="0.00001"
                        value={currencyForm.exchangeRate}
                        onChange={e => setCurrencyForm({ ...currencyForm, exchangeRate: Number(e.target.value) })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-1.5 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        checked={currencyForm.isBase}
                        onChange={e => setCurrencyForm({ ...currencyForm, isBase: e.target.checked })}
                        className="cursor-pointer"
                      />
                      <label className="text-[11px] font-bold text-[var(--text-secondary)] select-none">Set as Company Primary Base Currency</label>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer flex items-center justify-center gap-1"
                  >
                    {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />} Configure Currency
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* 4. WORKFLOW APPROVALS TAB */}
        {activeTab === 'workflow' && (
          <div className="flex flex-col gap-6 animate-fade-in text-left">
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveApprovalTab('queue')}
                  className={`text-sm font-extrabold flex items-center gap-1.5 uppercase tracking-wide cursor-pointer transition-colors ${activeApprovalTab === 'queue' ? 'text-indigo-400 border-b-2 border-indigo-500 pb-1' : 'text-[var(--text-secondary)]'}`}
                >
                  <Workflow className="w-4 h-4" /> Approvals Queue ({approvalRequests.filter(r => r.isMyTurn).length})
                </button>
                <button
                  onClick={() => setActiveApprovalTab('history')}
                  className={`text-sm font-extrabold flex items-center gap-1.5 uppercase tracking-wide cursor-pointer transition-colors ${activeApprovalTab === 'history' ? 'text-indigo-400 border-b-2 border-indigo-500 pb-1' : 'text-[var(--text-secondary)]'}`}
                >
                  <Sliders className="w-4 h-4" /> Corporate Workflows ({workflows.length})
                </button>
              </div>
              {activeApprovalTab === 'history' && (
                <button
                  onClick={() => setShowWorkflowModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" /> Configure Policy
                </button>
              )}
            </div>

            {/* Approval Requests Queue */}
            {activeApprovalTab === 'queue' && (
              <div className="flex flex-col gap-4 mt-2">
                {approvalRequests.length === 0 ? (
                  <div className="bg-[var(--bg-primary)] p-12 text-center rounded-2xl border border-[var(--border-color)]">
                    <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                    <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Resolution Queue Empty</h4>
                    <p className="text-[var(--text-secondary)] text-xs mt-1">No transaction approval requests require your review at present.</p>
                  </div>
                ) : (
                  approvalRequests.map((reqItem: any) => (
                    <div key={reqItem.id} className={`border rounded-xl p-5 shadow flex flex-col justify-between gap-4 ${reqItem.isMyTurn ? 'bg-indigo-500/5 border-indigo-500/30' : 'bg-[var(--bg-primary)] border-[var(--border-color)]'}`}>
                      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-extrabold border border-indigo-500/25 px-2 py-0.5 rounded uppercase font-mono">
                              {reqItem.module.toUpperCase()}
                            </span>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase font-mono ${
                              reqItem.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                              reqItem.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                              reqItem.status === 'ESCALATED' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse' :
                              'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                            }`}>
                              {reqItem.status}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-[var(--text-primary)] mt-3 font-display">Request ID: #{reqItem.id.substring(0, 8)}</h4>
                          <p className="text-xs text-[var(--text-secondary)] mt-1">Raised by <span className="font-bold text-[var(--text-primary)]">{reqItem.requesterName}</span> on {new Date(reqItem.createdAt).toLocaleString()}</p>
                          {reqItem.amount !== null && <p className="text-lg font-extrabold text-indigo-400 font-mono mt-1.5">Amount: ${reqItem.amount.toFixed(2)}</p>}
                        </div>

                        {reqItem.isMyTurn && (
                          <div className="w-full md:max-w-xs flex flex-col gap-2 shrink-0 text-left">
                            <label className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">Add Comment/Explanation</label>
                            <input
                              type="text"
                              value={approvalComment}
                              onChange={e => setApprovalComment(e.target.value)}
                              placeholder="Required for rejections..."
                              className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] px-2.5 py-1.5 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApprovalAction(reqItem.id, 'APPROVE')}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 rounded-lg text-[10px] uppercase cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleApprovalAction(reqItem.id, 'REJECT')}
                                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-1.5 rounded-lg text-[10px] uppercase cursor-pointer"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleApprovalAction(reqItem.id, 'ESCALATE')}
                                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 rounded-lg text-[10px] uppercase cursor-pointer"
                              >
                                Escalate
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Timeline comments display */}
                      {reqItem.comments?.length > 0 && (
                        <div className="border-t border-[var(--border-color)]/60 pt-3 text-left">
                          <span className="text-[9px] font-extrabold text-[var(--text-secondary)] tracking-wider uppercase block mb-2">Resolution timeline</span>
                          <div className="flex flex-col gap-2 pl-3 border-l border-[var(--border-color)]">
                            {reqItem.comments.map((c: any) => (
                              <div key={c.id} className="text-[11px]">
                                <span className="font-bold text-[var(--text-primary)]">{c.username}</span>
                                <span className={`ml-2 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase font-mono ${
                                  c.action === 'APPROVE' ? 'bg-emerald-500/10 text-emerald-500' :
                                  c.action === 'REJECT' ? 'bg-rose-500/10 text-rose-500' : 'bg-indigo-500/10 text-indigo-400'
                                }`}>
                                  {c.action}
                                </span>
                                <p className="text-[var(--text-secondary)] mt-0.5 font-sans italic">"{c.comment}"</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Corporate Workflows configurations list */}
            {activeApprovalTab === 'history' && (
              <div className="flex flex-col gap-4 mt-2">
                {workflows.length === 0 ? (
                  <div className="bg-[var(--bg-primary)] p-8 text-center rounded-xl border border-[var(--border-color)]">
                    <AlertCircle className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                    <p className="text-xs text-[var(--text-secondary)]">No approval workflow policies active. Click "Configure Policy" to create one.</p>
                  </div>
                ) : (
                  workflows.map((wf: any) => (
                    <div key={wf.id} className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-5 shadow flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-extrabold border border-indigo-500/25 px-2.5 py-0.5 rounded uppercase font-mono">
                            Module: {wf.module}
                          </span>
                          <h4 className="font-bold text-sm text-[var(--text-primary)] mt-3 font-display">{wf.workflowName}</h4>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${wf.isActive ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                          {wf.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-col gap-1 text-[11px] text-[var(--text-secondary)] text-left">
                        {wf.minAmount !== null && <span>Min Amount bound: <span className="font-mono text-[var(--text-primary)]">${wf.minAmount}</span></span>}
                        {wf.maxAmount !== null && <span>Max Amount limit: <span className="font-mono text-[var(--text-primary)]">${wf.maxAmount}</span></span>}
                        <span>Auto-Approve policy: <span className="font-bold text-[var(--text-primary)]">{wf.autoApprove ? 'Yes' : 'No'}</span></span>
                        {wf.escalationTime && <span>Escalation timeline: <span className="font-mono text-[var(--text-primary)]">{wf.escalationTime} hours</span></span>}
                      </div>

                      {/* Render workflow ordered levels */}
                      <div className="mt-4 border-t border-[var(--border-color)] pt-3 text-left">
                        <span className="text-[9px] font-extrabold text-[var(--text-muted)] tracking-wider uppercase block mb-2">Hierarchical Approval Sequence</span>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          {wf.steps.map((step: any, idx: number) => (
                            <React.Fragment key={step.id}>
                              <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 py-1 rounded-lg text-[10px] font-mono text-[var(--text-primary)] font-bold">
                                L{step.stepOrder}: {step.approverRole || 'System Role'}
                              </div>
                              {idx < wf.steps.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Configure Workflow Modal */}
            {showWorkflowModal && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
                <form onSubmit={handleWorkflowSubmit} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg p-6 relative shadow-2xl animate-scale-up text-left">
                  <button
                    type="button"
                    onClick={() => setShowWorkflowModal(false)}
                    className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <h3 className="font-display font-extrabold text-sm text-[var(--text-primary)] border-b border-[var(--border-color)] pb-3 mb-4 uppercase tracking-wider">
                    Configure Approval Workflow Policy
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Workflow Policy Name</label>
                      <input
                        type="text"
                        required
                        value={workflowForm.workflowName}
                        onChange={e => setWorkflowForm({ ...workflowForm, workflowName: e.target.value })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-1.5 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Target Module System</label>
                      <select
                        value={workflowForm.module}
                        onChange={e => setWorkflowForm({ ...workflowForm, module: e.target.value as any })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-1.5 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                      >
                        <option value="expenses">Expenses & Ledger</option>
                        <option value="purchase">Purchase Orders</option>
                        <option value="sales">Sales Contracts</option>
                        <option value="HR">Human Resources</option>
                        <option value="finance">Finance General</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Minimum Amount Bound ($)</label>
                      <input
                        type="number"
                        value={workflowForm.minAmount}
                        onChange={e => setWorkflowForm({ ...workflowForm, minAmount: Number(e.target.value) })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-1.5 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Escalation Timer (Hours)</label>
                      <input
                        type="number"
                        value={workflowForm.escalationTime}
                        onChange={e => setWorkflowForm({ ...workflowForm, escalationTime: Number(e.target.value) })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-1.5 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-5">
                      <input
                        type="checkbox"
                        checked={workflowForm.autoApprove}
                        onChange={e => setWorkflowForm({ ...workflowForm, autoApprove: e.target.checked })}
                        className="cursor-pointer"
                      />
                      <label className="text-[11px] font-bold text-[var(--text-secondary)] select-none">Bypass & Auto Approve</label>
                    </div>

                    {/* Step builder configuration */}
                    <div className="col-span-2 border-t border-[var(--border-color)]/60 pt-4 mt-2">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-widest block">Ordered Approval Sequence Level</span>
                        <button
                          type="button"
                          onClick={() => setWorkflowForm({
                            ...workflowForm,
                            steps: [...workflowForm.steps, { approverRole: 'Admin', approverRoleId: '', approverUserId: '', stepOrder: workflowForm.steps.length + 1 }]
                          })}
                          className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 py-1 px-2 rounded-lg text-[9px] font-bold cursor-pointer"
                        >
                          + Add Sequence Level
                        </button>
                      </div>
                      <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-1">
                        {workflowForm.steps.map((st, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <span className="text-xs text-[var(--text-muted)] font-mono font-bold w-6">L{st.stepOrder}</span>
                            <select
                              value={st.approverRole || ''}
                              onChange={e => {
                                const copy = [...workflowForm.steps];
                                copy[i].approverRole = e.target.value;
                                setWorkflowForm({ ...workflowForm, steps: copy });
                              }}
                              className="bg-[var(--bg-primary)] border border-[var(--border-color)] px-2 py-1 rounded-lg text-xs text-[var(--text-primary)] flex-1 focus:outline-none cursor-pointer"
                            >
                              <option value="Admin">Admin role</option>
                              <option value="Manager">Manager role</option>
                              <option value="Director">Director role</option>
                            </select>
                            {i > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const copy = workflowForm.steps.filter((_, idx) => idx !== i).map((item, idx) => ({ ...item, stepOrder: idx + 1 }));
                                  setWorkflowForm({ ...workflowForm, steps: copy });
                                }}
                                className="text-rose-400 hover:text-rose-300 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer flex items-center justify-center gap-1"
                  >
                    {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />} Save Policy
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* 5. NOTIFICATION CENTER TAB */}
        {activeTab === 'notifications' && (
          <div className="flex flex-col gap-6 animate-fade-in text-left">
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)] font-display flex items-center gap-1.5 uppercase tracking-wide">
                <Bell className="w-4 h-4 text-indigo-400" /> Notifications Feed Logs
              </h3>
              <div className="flex gap-2">
                {['ALL', 'UNREAD', 'ARCHIVED'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setNotificationFilter(tab as any)}
                    className={`py-1 px-3 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                      notificationFilter === tab
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* List Notifications with Priorities */}
            <div className="flex flex-col gap-3 mt-2 max-h-[450px] overflow-y-auto pr-2">
              {allNotifications.filter(n => {
                if (notificationFilter === 'UNREAD') return !n.isRead && !n.isArchived;
                if (notificationFilter === 'ARCHIVED') return n.isArchived;
                return !n.isArchived; // standard all
              }).length === 0 ? (
                <div className="bg-[var(--bg-primary)] p-12 text-center rounded-2xl border border-[var(--border-color)]">
                  <Bell className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
                  <p className="text-xs text-[var(--text-secondary)]">No notifications match the selected category.</p>
                </div>
              ) : (
                allNotifications.filter(n => {
                  if (notificationFilter === 'UNREAD') return !n.isRead && !n.isArchived;
                  if (notificationFilter === 'ARCHIVED') return n.isArchived;
                  return !n.isArchived;
                }).map((notif: any) => (
                  <div key={notif.id} className={`bg-[var(--bg-primary)] border rounded-xl p-4 flex items-start justify-between gap-4 transition-all hover:bg-[var(--bg-secondary)] ${notif.isRead ? 'border-[var(--border-color)]' : 'border-indigo-500/40 ring-1 ring-indigo-500/10'}`}>
                    <div className="flex gap-3 text-left">
                      <div className="mt-1">
                        <span className={`w-2.5 h-2.5 rounded-full block ${
                          notif.priority === 'HIGH' ? 'bg-rose-500 animate-pulse' :
                          notif.priority === 'MEDIUM' ? 'bg-amber-500' : 'bg-slate-500'
                        }`} title={`Priority: ${notif.priority}`} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">{notif.title}</h4>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">{notif.message}</p>
                        <span className="text-[9px] text-[var(--text-muted)] mt-2 block font-mono">{new Date(notif.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {!notif.isRead && (
                        <button
                          onClick={() => handleMarkRead(notif.id)}
                          className="text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 py-1 px-2.5 rounded-lg hover:bg-indigo-500/20 transition-colors cursor-pointer"
                        >
                          Mark Read
                        </button>
                      )}
                      {!notif.isArchived && (
                        <button
                          onClick={() => handleArchiveNotification(notif.id)}
                          className="text-[9px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20 p-1 rounded-lg hover:bg-slate-500/20 transition-colors cursor-pointer"
                          title="Archive"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 6. DMS DRIVE TAB */}
        {activeTab === 'dms' && (
          <div className="flex flex-col gap-6 animate-fade-in text-left">
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)] font-display flex items-center gap-1.5 uppercase tracking-wide">
                <FileText className="w-4 h-4 text-indigo-400" /> DMS Central Documents Drive
              </h3>
              <button
                onClick={() => setShowDocModal(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-md"
              >
                <Plus className="w-3.5 h-3.5" /> Upload File
              </button>
            </div>

            {/* List Documents */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {documents.length === 0 ? (
                <div className="col-span-full bg-[var(--bg-primary)] p-12 text-center rounded-2xl border border-[var(--border-color)]">
                  <FileText className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
                  <p className="text-xs text-[var(--text-secondary)]">No documents currently uploaded to the company drive. Click "Upload File" to start.</p>
                </div>
              ) : (
                documents.map((doc: any) => (
                  <div key={doc.id} className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-4.5 shadow flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-extrabold border border-indigo-500/25 px-2 py-0.5 rounded uppercase font-mono">
                          {doc.fileType}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedDocForVersion(doc)}
                            className="text-indigo-400 hover:text-indigo-300 text-[9px] font-bold bg-indigo-500/5 px-2 py-1 border border-indigo-500/15 rounded"
                          >
                            + Update Version
                          </button>
                          <a
                            href={`${backendUrl}${doc.filePath}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] bg-slate-500/10 text-slate-400 hover:bg-indigo-500/15 hover:text-indigo-400 border border-slate-500/15 px-2 py-1 rounded flex items-center gap-1 font-semibold"
                          >
                            <Download className="w-3 h-3" /> Get
                          </a>
                        </div>
                      </div>
                      <h4 className="font-bold text-sm text-[var(--text-primary)] mt-3 font-display truncate" title={doc.documentName}>{doc.documentName}</h4>
                      <div className="mt-4 flex flex-col gap-1 text-[11px] text-[var(--text-secondary)]">
                        <span>Size: <span className="font-mono text-[var(--text-primary)]">{(doc.fileSize / 1024).toFixed(1)} KB</span></span>
                        <span>Module Scope: <span className="font-bold text-[var(--text-primary)]">{doc.module}</span></span>
                        <span>Uploaded by: <span className="font-bold text-[var(--text-primary)]">{doc.uploadedByName}</span></span>
                        <span>Created: <span className="font-mono text-[var(--text-primary)]">{new Date(doc.createdAt).toLocaleString()}</span></span>
                      </div>
                    </div>

                    {/* Versions audit log */}
                    {doc.versions?.length > 1 && (
                      <div className="mt-4 border-t border-[var(--border-color)]/60 pt-3 text-left">
                        <span className="text-[9px] font-extrabold text-[var(--text-secondary)] tracking-wider uppercase block mb-1.5">Revision History</span>
                        <div className="flex flex-col gap-1 pr-1 max-h-[80px] overflow-y-auto">
                          {doc.versions.map((ver: any) => (
                            <div key={ver.id} className="flex justify-between items-center text-[10px] text-[var(--text-muted)] py-0.5">
                              <span>v{ver.version} - {ver.description || 'Update'}</span>
                              <a href={`${backendUrl}${ver.filePath}`} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300">Download</a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* DMS Upload Modal */}
            {showDocModal && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
                <form onSubmit={handleDocSubmit} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl animate-scale-up text-left">
                  <button
                    type="button"
                    onClick={() => setShowDocModal(false)}
                    className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <h3 className="font-display font-extrabold text-sm text-[var(--text-primary)] border-b border-[var(--border-color)] pb-3 mb-4 uppercase tracking-wider">
                    Upload Document to DMS Drive
                  </h3>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Document Title</label>
                      <input
                        type="text"
                        required
                        value={docForm.documentName}
                        onChange={e => setDocForm({ ...docForm, documentName: e.target.value })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-1.5 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Document Format category</label>
                      <select
                        value={docForm.fileType}
                        onChange={e => setDocForm({ ...docForm, fileType: e.target.value as any })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-1.5 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                      >
                        <option value="PDF">PDF Portable Document</option>
                        <option value="EXCEL">Excel Spreadsheet</option>
                        <option value="IMAGE">Image File</option>
                        <option value="WORD">Word Document</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Related Module</label>
                      <input
                        type="text"
                        value={docForm.module}
                        onChange={e => setDocForm({ ...docForm, module: e.target.value })}
                        placeholder="e.g. expenses, purchase, general"
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-1.5 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Select File</label>
                      <input
                        type="file"
                        required
                        onChange={e => handleFileChange(e, 'base64Content', setDocForm)}
                        className="text-xs text-[var(--text-muted)] cursor-pointer"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer flex items-center justify-center gap-1"
                  >
                    {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />} Upload File
                  </button>
                </form>
              </div>
            )}

            {/* Document Update Version Modal */}
            {selectedDocForVersion && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
                <form onSubmit={handleNewVersionSubmit} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl animate-scale-up text-left">
                  <button
                    type="button"
                    onClick={() => setSelectedDocForVersion(null)}
                    className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <h3 className="font-display font-extrabold text-sm text-[var(--text-primary)] border-b border-[var(--border-color)] pb-3 mb-4 uppercase tracking-wider">
                    Add New Version to: {selectedDocForVersion.documentName}
                  </h3>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Version Description</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Added signatures, updated margins"
                        value={newVersionForm.description}
                        onChange={e => setNewVersionForm({ ...newVersionForm, description: e.target.value })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-1.5 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Select File</label>
                      <input
                        type="file"
                        required
                        onChange={e => handleFileChange(e, 'base64Content', setNewVersionForm)}
                        className="text-xs text-[var(--text-muted)] cursor-pointer"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer flex items-center justify-center gap-1"
                  >
                    {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />} Commit New Version
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* 7. AUDIT TRAIL TAB */}
        {activeTab === 'audit' && (
          <div className="flex flex-col gap-6 animate-fade-in text-left">
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)] font-display flex items-center gap-1.5 uppercase tracking-wide">
                <Shield className="w-4 h-4 text-emerald-400" /> Immutable Corporate Audit Trail Log
              </h3>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border-color)]">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest block mb-1">Module Name</label>
                <select
                  value={auditFilters.moduleName}
                  onChange={e => setAuditFilters({ ...auditFilters, moduleName: e.target.value })}
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] px-2.5 py-1.5 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                >
                  <option value="">-- All Modules --</option>
                  <option value="auth">Core Auth</option>
                  <option value="company">Company Settings</option>
                  <option value="tax">Tax Engine</option>
                  <option value="currency">Currencies</option>
                  <option value="approvals">Approvals Engine</option>
                  <option value="documents">DMS Files</option>
                  <option value="backup">SQLite Backup</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest block mb-1">Action Type</label>
                <select
                  value={auditFilters.actionType}
                  onChange={e => setAuditFilters({ ...auditFilters, actionType: e.target.value })}
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] px-2.5 py-1.5 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                >
                  <option value="">-- All Actions --</option>
                  <option value="CREATE">CREATE (New)</option>
                  <option value="READ">READ (Search)</option>
                  <option value="UPDATE">UPDATE (Edit)</option>
                  <option value="DELETE">DELETE (Remove)</option>
                  <option value="LOGIN">LOGIN</option>
                  <option value="FAILED_LOGIN">FAILED LOGIN</option>
                  <option value="APPROVAL">APPROVAL Resolv.</option>
                  <option value="PERMISSION_CHANGE">PERM CHANGE</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest block mb-1">Text Search (Actor/Data)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search by actor username, logs content..."
                    value={auditFilters.search}
                    onChange={e => setAuditFilters({ ...auditFilters, search: e.target.value })}
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 py-1.5 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                  />
                  <button
                    onClick={fetchAuditLogs}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* List Logs Table */}
            <div className="overflow-x-auto border border-[var(--border-color)] rounded-xl mt-2 select-none">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-muted)] font-bold">
                    <th className="py-2.5 px-3.5">Log Timestamp</th>
                    <th className="py-2.5 px-3">System Actor</th>
                    <th className="py-2.5 px-3">Module</th>
                    <th className="py-2.5 px-3">Action Type</th>
                    <th className="py-2.5 px-3">Action context values</th>
                    <th className="py-2.5 px-3">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[var(--text-muted)]">No immutable logs retrieved matching queries.</td>
                    </tr>
                  ) : (
                    auditLogs.map((log: any) => (
                      <tr key={log.id} className="border-b border-[var(--border-color)]/60 hover:bg-[var(--bg-primary)] transition-colors">
                        <td className="py-3 px-3.5 font-mono text-[var(--text-secondary)]">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="py-3 px-3 font-bold text-indigo-400 font-display">{log.username || 'System Daemon'}</td>
                        <td className="py-3 px-3 uppercase font-mono text-[10px] text-[var(--text-primary)] font-semibold">{log.moduleName}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-extrabold uppercase ${
                            log.actionType === 'CREATE' ? 'bg-emerald-500/10 text-emerald-500' :
                            log.actionType === 'UPDATE' ? 'bg-indigo-500/10 text-indigo-400' :
                            log.actionType === 'DELETE' ? 'bg-rose-500/10 text-rose-500' :
                            log.actionType === 'FAILED_LOGIN' ? 'bg-red-600/20 text-red-500 animate-pulse font-extrabold' :
                            'bg-slate-500/10 text-slate-400'
                          }`}>
                            {log.actionType}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[11px] max-w-xs truncate text-[var(--text-secondary)]" title={`New: ${log.newValue}\nOld: ${log.oldValue}`}>
                          {log.newValue ? `Mod: ${log.newValue}` : log.oldValue ? `Old: ${log.oldValue}` : 'No serialized data'}
                        </td>
                        <td className="py-3 px-3 font-mono text-[10px] text-[var(--text-muted)]">{log.ipAddress || 'localhost'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 8. SQLITE DATABASE BACKUP TAB */}
        {activeTab === 'backup' && (
          <div className="flex flex-col gap-6 animate-fade-in text-left">
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)] font-display flex items-center gap-1.5 uppercase tracking-wide">
                <Database className="w-4 h-4 text-indigo-400" /> Database Backup & Restore Logs
              </h3>
              <button
                onClick={handleTriggerBackup}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white py-1.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-md"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                Trigger Manual Backup
              </button>
            </div>

            {/* Backups Logs List */}
            <div className="overflow-x-auto border border-[var(--border-color)] rounded-xl mt-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-muted)] font-bold">
                    <th className="py-2.5 px-3.5">Backup Timestamp</th>
                    <th className="py-2.5 px-3">Archive File Name</th>
                    <th className="py-2.5 px-3">File Size</th>
                    <th className="py-2.5 px-3">Triggered by</th>
                    <th className="py-2.5 px-3 text-center">Security Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[var(--text-muted)]">No backup logs registered. Click "Trigger Manual Backup" to generate copy.</td>
                    </tr>
                  ) : (
                    backups.map((log: any) => (
                      <tr key={log.id} className="border-b border-[var(--border-color)]/60 hover:bg-[var(--bg-primary)] transition-colors">
                        <td className="py-3 px-3.5 font-mono text-[var(--text-secondary)]">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="py-3 px-3 font-bold text-indigo-400 font-display">{log.backupName}</td>
                        <td className="py-3 px-3 font-mono">{(log.fileSize / (1024 * 1024)).toFixed(2)} MB</td>
                        <td className="py-3 px-3 text-[var(--text-primary)] font-semibold">{log.createdByName}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-extrabold uppercase ${
                            log.restoreStatus === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse'
                          }`}>
                            {log.restoreStatus === 'SUCCESS' ? 'SECURE' : log.restoreStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right flex justify-end gap-2">
                          <a
                            href={`${backendUrl}${log.filePath}`}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 py-1 px-2.5 rounded-lg text-[10px] font-bold cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" /> Download
                          </a>
                          <button
                            onClick={() => handleRestoreBackup(log.id)}
                            disabled={loading}
                            className="bg-rose-600/10 text-rose-500 border border-rose-500/20 hover:bg-rose-600/20 py-1 px-2.5 rounded-lg text-[10px] font-bold cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Restore Target
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 9. FEATURE TOGGLES SYSTEM TAB */}
        {activeTab === 'features' && (
          <div className="flex flex-col gap-6 animate-fade-in text-left">
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)] font-display flex items-center gap-1.5 uppercase tracking-wide">
                <Sliders className="w-4 h-4 text-indigo-400" /> SuperAdmin Subscription License & Features Toggles
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {featuresList.map((f: any) => {
                const isEnabled = allFeatures.includes(f.key);
                return (
                  <div key={f.key} className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-4.5 shadow flex justify-between items-center">
                    <div className="text-left pr-4">
                      <h4 className="font-bold text-sm text-[var(--text-primary)] font-display flex items-center gap-2">
                        {f.name}
                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded ${isEnabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/10 text-rose-500'}`}>
                          {isEnabled ? 'LICENSED' : 'INACTIVE'}
                        </span>
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-normal">{f.description}</p>
                    </div>
                    <button
                      onClick={() => handleToggleFeature(f.key, !isEnabled)}
                      className={`py-1.5 px-4.5 rounded-xl text-[10px] font-extrabold uppercase transition-all duration-300 transform active:scale-95 border cursor-pointer shrink-0 ${
                        isEnabled
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/25 hover:bg-rose-500/20'
                          : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-500'
                      }`}
                    >
                      {isEnabled ? 'Revoke License' : 'Grant License'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 10. EMAIL INTEGRATION TAB */}
        {activeTab === 'email' && (
          <div className="flex flex-col gap-6 animate-fade-in text-left">
            <div className="border-b border-[var(--border-color)] pb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)] font-display flex items-center gap-1.5 uppercase tracking-wide">
                <Mail className="w-4 h-4 text-indigo-400" /> SMTP Configuration & Diagnostics
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Configure central SMTP details to trigger real-time corporate notifications, email alerts, and workflow update dispatches.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Form card */}
              <form onSubmit={handleSaveSMTPSettings} className="bg-[var(--bg-primary)] border border-[var(--border-color)] p-5 rounded-2xl shadow flex flex-col gap-4">
                <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-2 font-display">
                  Mail Server Details
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">SMTP Server Host</label>
                    <input
                      type="text"
                      placeholder="e.g. smtp.gmail.com or mail.corporate.com"
                      required
                      value={companyProfile.smtpHost || ''}
                      onChange={e => setCompanyProfile({ ...companyProfile, smtpHost: e.target.value })}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">SMTP Server Port</label>
                    <input
                      type="number"
                      placeholder="e.g. 587 or 465"
                      required
                      value={companyProfile.smtpPort || ''}
                      onChange={e => setCompanyProfile({ ...companyProfile, smtpPort: parseInt(e.target.value) || 0 })}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Sender Email Envelope</label>
                    <input
                      type="email"
                      placeholder="e.g. erp-alerts@company.com"
                      required
                      value={companyProfile.smtpSender || ''}
                      onChange={e => setCompanyProfile({ ...companyProfile, smtpSender: e.target.value })}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">SMTP Username / Login</label>
                    <input
                      type="text"
                      placeholder="e.g. mailer@company.com"
                      value={companyProfile.smtpUser || ''}
                      onChange={e => setCompanyProfile({ ...companyProfile, smtpUser: e.target.value })}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">SMTP Password</label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={companyProfile.smtpPassword || ''}
                      onChange={e => setCompanyProfile({ ...companyProfile, smtpPassword: e.target.value })}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 py-2 rounded-xl text-xs text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      id="smtpSecure"
                      checked={Boolean(companyProfile.smtpSecure)}
                      onChange={e => setCompanyProfile({ ...companyProfile, smtpSecure: e.target.checked })}
                      className="cursor-pointer rounded border-[var(--border-color)] text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="smtpSecure" className="text-[11px] font-bold text-[var(--text-secondary)] select-none cursor-pointer">
                      Use Secure SSL/TLS Encrypted Connection (Port 465 recommendation)
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 border-t border-[var(--border-color)] pt-4 mt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-extrabold py-2 rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-colors shadow-md"
                  >
                    {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    Save SMTP settings
                  </button>
                  <button
                    type="button"
                    onClick={handleTestSMTPConnection}
                    disabled={testingEmail || !companyProfile.smtpHost}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-extrabold py-2 rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-colors shadow-md"
                  >
                    {testingEmail && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    Test SMTP Connection
                  </button>
                </div>
              </form>

              {/* Terminal Logs Panel */}
              <div className="bg-slate-950/80 border border-emerald-500/20 p-5 rounded-2xl shadow-xl min-h-[350px] flex flex-col font-mono text-left">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-slate-500 font-bold ml-1">SMTP_DIAGNOSTICS_DAEMON.sh</span>
                  </div>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 px-2 py-0.5 rounded font-mono uppercase">
                    {testingEmail ? 'RUNNING' : emailTestLogs.length > 0 ? 'COMPLETED' : 'STANDBY'}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[300px] text-[11px] text-emerald-400/90 leading-relaxed font-mono pr-2">
                  {emailTestLogs.length === 0 ? (
                    <div className="text-slate-500 py-12 text-center h-full flex flex-col items-center justify-center">
                      <Mail className="w-8 h-8 opacity-20 mb-2 animate-bounce-slow" />
                      <span>SMTP Diagnostics terminal is ready.</span>
                      <span className="text-[9px] opacity-60 mt-1">Configure Host/Port and click "Test Connection" to check handshakes.</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {emailTestLogs.map((logStr, i) => {
                        let colorClass = "text-emerald-400/90";
                        if (logStr.includes("❌") || logStr.includes("🛑") || logStr.includes("Terminated")) {
                          colorClass = "text-rose-400 font-bold";
                        } else if (logStr.includes("🔍") || logStr.includes("ℹ️")) {
                          colorClass = "text-amber-400";
                        } else if (logStr.includes("🟢") || logStr.includes("SUCCESS")) {
                          colorClass = "text-emerald-300 font-bold";
                        }
                        return (
                          <div key={i} className={`${colorClass} whitespace-pre-wrap font-mono`}>
                            {logStr}
                          </div>
                        );
                      })}
                      {testingEmail && (
                        <div className="text-indigo-400 font-bold font-mono animate-pulse mt-1 flex items-center gap-1.5">
                          <RefreshCw className="w-3 h-3 animate-spin" /> Performing remote socket probe handshake...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 11. ORG & HIERARCHY MANAGEMENT TAB */}
        {activeTab === 'org' && (
          <div className="flex flex-col gap-5 animate-fade-in text-left">
            <div className="border-b border-[var(--border-color)] pb-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] font-display flex items-center gap-1.5 uppercase tracking-wide">
                  <GitMerge className="w-4 h-4 text-indigo-400" /> Organizational Hierarchy & Departments
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Manage hierarchical departments (CRUD) and visualize employee manager-subordinate reporting hierarchies.</p>
              </div>

              {/* Sub-tab picker */}
              <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] p-1 rounded-xl flex gap-1 text-[11px] font-bold">
                <button
                  onClick={() => setOrgSubTab('dept_crud')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                    orgSubTab === 'dept_crud'
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Departments CRUD
                </button>
                <button
                  onClick={() => setOrgSubTab('org_chart')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                    orgSubTab === 'org_chart'
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Interactive Org Chart
                </button>
              </div>
            </div>

            {/* A. DEPARTMENT MANAGEMENT VIEW */}
            {orgSubTab === 'dept_crud' && (
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-display">
                    Active Tenant Departments List
                  </h4>
                  <button
                    onClick={() => {
                      setEditingDept(null);
                      setDeptForm({ departmentCode: '', departmentName: '', managerId: '', parentDepartmentId: '' });
                      setShowDeptModal(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-md"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Create Department
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* Left: Department List Table */}
                  <div className="lg:col-span-2 overflow-x-auto border border-[var(--border-color)] rounded-xl bg-[var(--bg-primary)]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-muted)] font-bold">
                          <th className="py-2.5 px-3">Code</th>
                          <th className="py-2.5 px-3">Department Name</th>
                          <th className="py-2.5 px-3">Reporting Manager</th>
                          <th className="py-2.5 px-3">Parent Dept</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {departments.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-[var(--text-muted)]">No departments configured yet. Click "Create Department" to add one.</td>
                          </tr>
                        ) : (
                          departments.map((dept: any) => {
                            const parentDept = departments.find(d => d.id === dept.parentDepartmentId);
                            const managerEmp = employees.find(e => e.id === dept.managerId);
                            return (
                              <tr key={dept.id} className="border-b border-[var(--border-color)]/60 hover:bg-[var(--bg-secondary)] transition-colors">
                                <td className="py-2.5 px-3 font-mono font-bold text-indigo-400">{dept.departmentCode}</td>
                                <td className="py-2.5 px-3 text-[var(--text-primary)] font-semibold font-display">{dept.departmentName}</td>
                                <td className="py-2.5 px-3 text-[var(--text-secondary)] font-medium">
                                  {managerEmp ? managerEmp.employeeName : <span className="text-[var(--text-muted)] text-[10px]">Unassigned</span>}
                                </td>
                                <td className="py-2.5 px-3">
                                  {parentDept ? (
                                    <span className="bg-slate-500/10 text-slate-400 font-mono text-[9px] border border-slate-500/20 px-1.5 py-0.5 rounded">
                                      {parentDept.departmentCode}
                                    </span>
                                  ) : (
                                    <span className="text-[var(--text-muted)] text-[10px] italic">Root</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right flex justify-end gap-1.5">
                                  <button
                                    onClick={() => {
                                      setEditingDept(dept);
                                      setDeptForm({
                                        departmentCode: dept.departmentCode,
                                        departmentName: dept.departmentName,
                                        managerId: dept.managerId || '',
                                        parentDepartmentId: dept.parentDepartmentId || ''
                                      });
                                      setShowDeptModal(true);
                                    }}
                                    className="p-1 hover:bg-indigo-500/15 rounded text-indigo-400 hover:text-indigo-300 cursor-pointer"
                                    title="Edit department details"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDept(dept.id)}
                                    className="p-1 hover:bg-rose-500/15 rounded text-rose-400 hover:text-rose-300 cursor-pointer"
                                    title="Delete department"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Right: Nested Hierarchy Tree Preview */}
                  <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] p-5 rounded-xl shadow-sm">
                    <h5 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4 border-b border-[var(--border-color)]/60 pb-2">
                      Hierarchical Tree Structure
                    </h5>

                    <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
                      {departments.length === 0 ? (
                        <div className="text-center py-8 text-[var(--text-muted)] text-[11px] italic">
                          No branches to display.
                        </div>
                      ) : (
                        (() => {
                          // Recursive render helper
                          const renderNestedBranch = (parentId: string | null, depth = 0) => {
                            const children = departments.filter(d => d.parentDepartmentId === parentId);
                            if (children.length === 0) return null;
                            return (
                              <div className="flex flex-col gap-2">
                                {children.map((d: any) => (
                                  <div key={d.id} className="flex flex-col">
                                    <div
                                      style={{ marginLeft: `${depth * 14}px` }}
                                      className="flex items-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs hover:border-indigo-500/40 transition-colors shadow-sm select-none"
                                    >
                                      <ChevronRight className="w-3 h-3 text-indigo-400 shrink-0" />
                                      <span className="font-mono text-[9px] bg-indigo-500/10 text-indigo-400 px-1 py-0.5 rounded font-bold shrink-0">{d.departmentCode}</span>
                                      <span className="font-bold truncate text-[var(--text-primary)] font-display">{d.departmentName}</span>
                                    </div>
                                    <div className="relative mt-1">
                                      {/* Vertical connection line */}
                                      {depth > 0 && (
                                        <div
                                          style={{ left: `${(depth * 14) + 6}px` }}
                                          className="absolute top-0 bottom-0 w-0.5 bg-indigo-500/10"
                                        />
                                      )}
                                      {renderNestedBranch(d.id, depth + 1)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          };

                          // Render roots: parent is either null or not existing in departments list
                          const rootDepts = departments.filter(d => !d.parentDepartmentId || !departments.some(p => p.id === d.parentDepartmentId));
                          return (
                            <div className="flex flex-col gap-2">
                              {rootDepts.map((d: any) => (
                                <div key={d.id} className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2 bg-indigo-950/20 border border-indigo-500/25 py-2 px-3 rounded-lg text-xs shadow select-none">
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                    <span className="font-mono text-[9px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded font-bold shrink-0">{d.departmentCode}</span>
                                    <span className="font-extrabold text-[var(--text-primary)] font-display">{d.departmentName}</span>
                                  </div>
                                  {renderNestedBranch(d.id, 1)}
                                </div>
                              ))}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  </div>
                </div>

                {/* Create/Edit Department Modal */}
                {showDeptModal && (
                  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
                    <form onSubmit={handleDeptSubmit} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl animate-scale-up text-left">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeptModal(false);
                          setEditingDept(null);
                        }}
                        className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      <h3 className="font-display font-extrabold text-sm text-[var(--text-primary)] border-b border-[var(--border-color)] pb-3 mb-4 uppercase tracking-wider">
                        {editingDept ? 'Modify Department Details' : 'Establish New Department'}
                      </h3>
                      <div className="flex flex-col gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Department Identifier Code</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. DEPT-TECH"
                            value={deptForm.departmentCode}
                            onChange={e => setDeptForm({ ...deptForm, departmentCode: e.target.value.toUpperCase() })}
                            className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-2 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Department Display Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Engineering & Infrastructure"
                            value={deptForm.departmentName}
                            onChange={e => setDeptForm({ ...deptForm, departmentName: e.target.value })}
                            className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-2 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-display font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Reporting Department Manager</label>
                          <select
                            value={deptForm.managerId}
                            onChange={e => setDeptForm({ ...deptForm, managerId: e.target.value })}
                            className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-2 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                          >
                            <option value="">-- No Active Manager assigned --</option>
                            {employees.map((emp: any) => (
                              <option key={emp.id} value={emp.id}>{emp.employeeName} ({emp.designation || 'Staff'})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Parent Hierarchy Department</label>
                          <select
                            value={deptForm.parentDepartmentId}
                            onChange={e => setDeptForm({ ...deptForm, parentDepartmentId: e.target.value })}
                            className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-2 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                          >
                            <option value="">-- None (Primary root level) --</option>
                            {departments.filter(d => !editingDept || d.id !== editingDept.id).map((d: any) => (
                              <option key={d.id} value={d.id}>{d.departmentName} ({d.departmentCode})</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-colors shadow-md"
                      >
                        {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        {editingDept ? 'Update Details' : 'Create Department'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* B. VISUAL EMPLOYEE ORG CHART VIEW */}
            {orgSubTab === 'org_chart' && (
              <div className="flex flex-col gap-5 select-none text-center">
                <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3 text-left">
                  <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-display">
                    Interactive Employee Org Chart
                  </h4>
                  {employees.length === 0 && (
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20 px-2.5 py-1 rounded-full uppercase font-mono">
                      ✨ Rendering Demo Workspace Seeds
                    </span>
                  )}
                </div>

                <div className="p-6 overflow-x-auto min-w-[700px] bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl flex flex-col items-center gap-8 shadow-inner select-none relative scrollbar-thin">
                  {(() => {
                    // Populate active employee set: DB data or Gorgeous Fallback Demo data!
                    const listToRender = employees.length > 0 ? employees : [
                      {
                        id: "demo-ceo",
                        employeeCode: "EMP-001",
                        employeeName: "Eleanor Vance",
                        designation: "Chief Executive Officer (CEO)",
                        email: "e.vance@company.com",
                        phone: "+1 555-0199",
                        managerId: null,
                        department: "Executive Office",
                        avatar: "💼"
                      },
                      {
                        id: "demo-dir-tech",
                        employeeCode: "EMP-002",
                        employeeName: "Marcus Sterling",
                        designation: "Technology Director (CTO)",
                        email: "m.sterling@company.com",
                        phone: "+1 555-0182",
                        managerId: "demo-ceo",
                        department: "Engineering",
                        avatar: "💻"
                      },
                      {
                        id: "demo-dir-ops",
                        employeeCode: "EMP-003",
                        employeeName: "Sophia Thorne",
                        designation: "Operations Director (COO)",
                        email: "s.thorne@company.com",
                        phone: "+1 555-0153",
                        managerId: "demo-ceo",
                        department: "Operations",
                        avatar: "⚙️"
                      },
                      {
                        id: "demo-mgr-eng",
                        employeeCode: "EMP-004",
                        employeeName: "David Chen",
                        designation: "Engineering Lead",
                        email: "d.chen@company.com",
                        phone: "+1 555-0144",
                        managerId: "demo-dir-tech",
                        department: "Engineering",
                        avatar: "🚀"
                      },
                      {
                        id: "demo-mgr-sales",
                        employeeCode: "EMP-005",
                        employeeName: "Amanda Ross",
                        designation: "Sales Lead",
                        email: "a.ross@company.com",
                        phone: "+1 555-0121",
                        managerId: "demo-dir-ops",
                        department: "Sales & Marketing",
                        avatar: "📈"
                      },
                      {
                        id: "demo-staff-1",
                        employeeCode: "EMP-006",
                        employeeName: "Liam O'Connor",
                        designation: "Fullstack Engineer",
                        email: "l.oconnor@company.com",
                        phone: "+1 555-0110",
                        managerId: "demo-mgr-eng",
                        department: "Engineering",
                        avatar: "🖥️"
                      },
                      {
                        id: "demo-staff-2",
                        employeeCode: "EMP-007",
                        employeeName: "Clara Patel",
                        designation: "UX Designer",
                        email: "c.patel@company.com",
                        phone: "+1 555-0105",
                        managerId: "demo-mgr-eng",
                        department: "Engineering",
                        avatar: "🎨"
                      },
                      {
                        id: "demo-staff-3",
                        employeeCode: "EMP-008",
                        employeeName: "Ethan Hunt",
                        designation: "Security Specialist",
                        email: "e.hunt@company.com",
                        phone: "+1 555-0101",
                        managerId: "demo-mgr-eng",
                        department: "Engineering",
                        avatar: "🛡️"
                      }
                    ];

                    // Classify layers: Roots, Tier 2, Tier 3, Tier 4
                    const level0 = listToRender.filter(e => !e.managerId || !listToRender.some(p => p.id === e.managerId));
                    const getSubs = (parentIds: string[]) => listToRender.filter(e => e.managerId && parentIds.includes(e.managerId));

                    const level1 = getSubs(level0.map(e => e.id));
                    const level2 = getSubs(level1.map(e => e.id));
                    const level3 = getSubs(level2.map(e => e.id));

                    const renderCard = (e: any, borderColor = "border-indigo-500/40", glowColor = "shadow-indigo-500/10") => (
                      <div
                        key={e.id}
                        className={`bg-[var(--bg-secondary)] border ${borderColor} rounded-2xl p-4.5 w-60 shadow-lg ${glowColor} hover:scale-105 active:scale-95 transition-all select-none hover:shadow-xl text-left relative group cursor-pointer`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-900/60 border border-[var(--border-color)] flex items-center justify-center text-lg shadow-inner group-hover:rotate-12 transition-transform">
                            {e.avatar || '👤'}
                          </div>
                          <div className="truncate flex-1">
                            <h5 className="font-extrabold text-[var(--text-primary)] text-xs font-display truncate">{e.employeeName}</h5>
                            <span className="text-[10px] text-indigo-400 font-bold block mt-0.5 leading-none uppercase truncate tracking-wider">{e.designation}</span>
                          </div>
                        </div>

                        <div className="mt-3 border-t border-[var(--border-color)]/60 pt-2 flex flex-col gap-0.5 text-[9px] text-[var(--text-secondary)] font-medium">
                          <span className="truncate">Dept: <span className="font-bold text-[var(--text-primary)]">{e.department || 'N/A'}</span></span>
                          <span className="font-mono truncate">Code: {e.employeeCode}</span>
                          <span className="font-mono truncate">{e.email}</span>
                          <span className="font-mono truncate">{e.phone || 'No phone'}</span>
                        </div>
                      </div>
                    );

                    return (
                      <div className="flex flex-col items-center gap-8 w-full">
                        {/* Tier 1: CEO (Roots) */}
                        <div className="flex gap-6 justify-center">
                          {level0.map(e => renderCard(e, "border-amber-500/40", "shadow-amber-500/10"))}
                        </div>

                        {level1.length > 0 && (
                          <>
                            {/* Connector line */}
                            <div className="w-0.5 h-6 bg-slate-700/45 -my-4" />
                            {/* Tier 2: Directors */}
                            <div className="flex gap-6 justify-center">
                              {level1.map(e => renderCard(e, "border-purple-500/40", "shadow-purple-500/10"))}
                            </div>
                          </>
                        )}

                        {level2.length > 0 && (
                          <>
                            {/* Connector line */}
                            <div className="w-0.5 h-6 bg-slate-700/45 -my-4" />
                            {/* Tier 3: Lead Managers */}
                            <div className="flex gap-6 justify-center">
                              {level2.map(e => renderCard(e, "border-sky-500/40", "shadow-sky-500/10"))}
                            </div>
                          </>
                        )}

                        {level3.length > 0 && (
                          <>
                            {/* Connector line */}
                            <div className="w-0.5 h-6 bg-slate-700/45 -my-4" />
                            {/* Tier 4: Staff/Engineers */}
                            <div className="flex gap-6 justify-center flex-wrap max-w-4xl">
                              {level3.map(e => renderCard(e, "border-slate-500/30", "shadow-slate-500/5"))}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
