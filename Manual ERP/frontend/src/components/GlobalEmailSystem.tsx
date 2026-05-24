import { apiClient } from '../utils/apiService';
import React, { useState, useEffect } from 'react';
import { 
  Mail, Settings, LayoutTemplate, Send, Inbox, 
  Plus, Search, Filter, Download, RefreshCw, CheckCircle2, 
  AlertCircle, FileText, ArrowUpRight, ArrowDownRight, MoreHorizontal,
  FileArchive, ShieldAlert, Cpu, ToggleLeft, ToggleRight, Scale, Sliders, AlertTriangle
} from 'lucide-react';

interface Props {
  activeTab?: string;
  user: any;
  token?: string;
  backendUrl?: string;
}

const GlobalEmailSystem: React.FC<Props> = ({ user: _user, activeTab, token, backendUrl }) => {
  const mapping: Record<string, string> = {
    'EMAIL_SMTP': 'smtp',
    'EMAIL_TEMPLATES': 'templates',
    'EMAIL_INVOICE': 'invoice',
    'EMAIL_PO': 'po',
    'EMAIL_APPROVAL': 'approval',
    'EMAIL_OTP': 'otp',
    'EMAIL_PAYROLL': 'payroll',
    'EMAIL_REPORT': 'report',
    'EMAIL_QUEUE': 'queue',
    'EMAIL_RETRY': 'retry',
    'EMAIL_ATTACHMENT': 'attachment',
    'EMAIL_LOGS': 'logs',
    'EMAIL_EDITOR': 'editor',
    'EMAIL_TOGGLE': 'toggle',
    'EMAIL_ENABLE': 'enable',
    'EMAIL_QUOTA': 'quota'
  };

  const currentTab = (activeTab && mapping[activeTab]) ? mapping[activeTab] : 'dashboard';
  const [searchQuery, setSearchQuery] = useState('');

  // Interactive UI Modal States
  const [showSmtpModal, setShowSmtpModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);

  // Forms States
  const [newSmtp, setNewSmtp] = useState({ provider: '', host: '', port: '587', isPrimary: false, status: 'Connected' });
  const [newTemplate, setNewTemplate] = useState({ name: '', type: 'Sales', subject: '', body: '' });
  const [newOutbound, setNewOutbound] = useState({ recipient: '', subject: '', templateId: '', priority: 'Normal' });
  const [selectedQuotaIndex, setSelectedQuotaIndex] = useState<number>(0);
  const [quotaEditLimit, setQuotaEditLimit] = useState<number>(10000);

  // Live variable template compiler preview state
  const [selectedEditorTemplate, setSelectedEditorTemplate] = useState<string>('TPL-001');
  const [previewCustomerName, setPreviewCustomerName] = useState('Acme Corp');
  const [previewInvoiceNo, setPreviewInvoiceNo] = useState('INV-2026-402');
  const [previewAmount, setPreviewAmount] = useState('$12,500.00');

  // Toast notifications trigger
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);
  const showToast = (message: string, type: 'success' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- DUMMY DATABASES ---
  const [dashboardStats, setDashboardStats] = useState([
    { title: 'Emails Sent (MTD)', val: '4,521 sent', desc: '+12.5% vs last month', icon: Send, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { title: 'Avg Delivery Rate', val: '99.8%', desc: 'SMTP channels optimized', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Bounced Outbox Log', val: '9 bounces', desc: 'Require queue retries', icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { title: 'Active Templates', val: '32 templates', desc: 'Across HR/Sales/Security', icon: LayoutTemplate, color: 'text-amber-500', bg: 'bg-amber-500/10' }
  ]);

  const [smtpConfigs, setSmtpConfigs] = useState([
    { id: 'SMTP-1', provider: 'SendGrid API', host: 'smtp.sendgrid.net', port: '587', isPrimary: true, status: 'Connected' },
    { id: 'SMTP-2', provider: 'AWS SES US-East', host: 'email-smtp.us-east-1.amazonaws.com', port: '465', isPrimary: false, status: 'Connected' },
    { id: 'SMTP-3', provider: 'Mailgun Transactional', host: 'smtp.mailgun.org', port: '587', isPrimary: false, status: 'Failed' }
  ]);

  const [emailTemplates, setEmailTemplates] = useState([
    { id: 'TPL-001', name: 'Invoice Generated Dispatch', type: 'Sales', subject: 'Tax Invoice {{Invoice_Number}} Attached', lastUpdated: 'May 10, 2026', status: 'Active', body: 'Hello {{Customer_Name}},\n\nPlease find attached tax invoice {{Invoice_Number}} for {{Amount}} due on Jun 22, 2026.\n\nRegards,\nBilling Dept.' },
    { id: 'TPL-002', name: 'Purchase Order Approval Request', type: 'Purchase', subject: 'PO-{{PO_Number}} Approval Required', lastUpdated: 'Apr 25, 2026', status: 'Active', body: 'Hello {{Manager_Name}},\n\nPurchase order PO-{{PO_Number}} for {{Amount}} is pending your approval.\n\nClick link to authorize.' },
    { id: 'TPL-003', name: 'Security OTP verification', type: 'Security', subject: 'Your OTP code is {{OTP}}', lastUpdated: 'Jan 15, 2026', status: 'Active', body: 'Hello {{User}},\n\nYour security verification OTP code is: {{OTP}}.\n\nDo not share this with anyone.' },
    { id: 'TPL-004', name: 'Monthly Employee Payslip', type: 'HR', subject: 'Payslip for {{Month}} {{Year}}', lastUpdated: 'May 20, 2026', status: 'Draft', body: 'Hello {{Employee}},\n\nYour monthly payroll payslip is attached.\n\nNet Pay: {{Net_Pay}}.' }
  ]);

  const [outboxLogs, setOutboxLogs] = useState([
    { id: 'LOG-991', recipient: 'john.smith@techtronics.com', subject: 'Invoice INV-2026-101', template: 'Invoice Generated', date: 'Today, 10:45 AM', status: 'Delivered', category: 'Invoice' },
    { id: 'LOG-992', recipient: 'alice.wong@global.com', subject: 'Your OTP is 491024', template: 'Security OTP', date: 'Today, 09:12 AM', status: 'Delivered', category: 'OTP' },
    { id: 'LOG-993', recipient: 'mike.jones@officemax.com', subject: 'PO-2026-004 Approval Required', template: 'Purchase Order Approval', date: 'Yesterday, 14:30 PM', status: 'Bounced', category: 'PO' },
    { id: 'LOG-994', recipient: 'sarah.miller@hwsol.com', subject: 'Invoice INV-2026-099', template: 'Invoice Generated', date: 'Yesterday, 11:20 AM', status: 'Delivered', category: 'Invoice' }
  ]);

  const [emailQueue, setEmailQueue] = useState([
    { id: 'Q-502', recipient: 'billing@megacorp.com', subject: 'Monthly Statement - May 2026', priority: 'Normal', addedAt: '10 mins ago', status: 'Pending', category: 'Report' },
    { id: 'Q-503', recipient: 'ceo@techtronics.com', subject: 'Urgent: Approval Required for PO-2026-192', priority: 'High', addedAt: '2 mins ago', status: 'Processing', category: 'Approval' },
    { id: 'Q-504', recipient: 'all-staff@company.com', subject: 'Weekly Safety & Operations Newsletter', priority: 'Low', addedAt: '1 hour ago', status: 'Pending', category: 'Report' }
  ]);

  const [attachmentsData, setAttachmentsData] = useState([
    { id: 'ATT-201', fileName: 'Tax_Invoice_INV-101.pdf', size: '1.2 MB', type: 'PDF Document', status: 'Passed', link: 'LOG-991' },
    { id: 'ATT-202', fileName: 'Monthly_Payslip_Sarah.pdf', size: '890 KB', type: 'PDF Document', status: 'Passed', link: 'LOG-994' },
    { id: 'ATT-203', fileName: 'Annual_QMS_Audit_Reports_Big.zip', size: '28.4 MB', type: 'ZIP Archive', status: 'Size Warning', link: 'LOG-993' }
  ]);

  const [companyToggles, setCompanyToggles] = useState([
    { company: 'Dine-In Restaurant', emailService: true, logsQuota: '50,000/mo', activeSMTP: 'SendGrid API' },
    { company: 'General ERP Division', emailService: true, logsQuota: '250,000/mo', activeSMTP: 'AWS SES US-East' },
    { company: 'Retail Outlets Zone', emailService: false, logsQuota: '10,000/mo', activeSMTP: 'Mailgun Transactional' }
  ]);

  const [usageQuotas, setUsageQuotas] = useState([
    { provider: 'SendGrid API', sent: 120, maxLimit: 100000, color: 'bg-indigo-600', resetDate: 'Jun 01, 2026' },
    { provider: 'AWS SES US-East', sent: 4850, maxLimit: 10000, color: 'bg-emerald-600', resetDate: 'Today, 12:00 AM' },
    { provider: 'Mailgun', sent: 8200, maxLimit: 10000, color: 'bg-amber-600', resetDate: 'Jun 15, 2026' }
  ]);

  const [systemSwitches, setSystemSwitches] = useState({
    globalEmailEnable: true,
    invoiceAutoSend: true,
    payrollAutoSend: false,
    otpBypass: false,
    retryFailedQueue: true
  });

  // --- DATABASE SYNC & BACKEND CONNECTIVITY ---
  const [isLoaded, setIsLoaded] = useState(false);

    const apiRequest = async (endpoint: string, method = 'GET', body: any = null): Promise<any> => {
    try {
      if (method === 'GET') {
        return await apiClient.get<any>(endpoint);
      } else if (method === 'POST') {
        return await apiClient.post<any>(endpoint, body);
      } else if (method === 'PUT') {
        return await apiClient.put<any>(endpoint, body);
      } else if (method === 'PATCH') {
        return await apiClient.patch<any>(endpoint, body);
      } else if (method === 'DELETE') {
        return await apiClient.delete<any>(endpoint);
      }
    } catch (err) {
      console.error(`[API Error] ${endpoint}:`, err);
      return null;
    }
  };

  useEffect(() => {
    if (!token || !backendUrl) return;

    const loadData = async () => {
      try {
        const dbSmtp = await apiRequest('/api/store/eml_smtp');
        if (dbSmtp && dbSmtp.length > 0) setSmtpConfigs(dbSmtp);
        else await apiRequest('/api/store/eml_smtp/bulk', 'POST', smtpConfigs);

        const dbTpls = await apiRequest('/api/store/eml_templates');
        if (dbTpls && dbTpls.length > 0) setEmailTemplates(dbTpls);
        else await apiRequest('/api/store/eml_templates/bulk', 'POST', emailTemplates);

        const dbLogs = await apiRequest('/api/store/eml_logs');
        if (dbLogs && dbLogs.length > 0) setOutboxLogs(dbLogs);
        else await apiRequest('/api/store/eml_logs/bulk', 'POST', outboxLogs);

        const dbQueue = await apiRequest('/api/store/eml_queue');
        if (dbQueue && dbQueue.length > 0) setEmailQueue(dbQueue);
        else await apiRequest('/api/store/eml_queue/bulk', 'POST', emailQueue);

        const dbAtts = await apiRequest('/api/store/eml_attachments');
        if (dbAtts && dbAtts.length > 0) setAttachmentsData(dbAtts);
        else await apiRequest('/api/store/eml_attachments/bulk', 'POST', attachmentsData);

        const dbToggles = await apiRequest('/api/store/eml_toggles');
        if (dbToggles && dbToggles.length > 0) setCompanyToggles(dbToggles);
        else await apiRequest('/api/store/eml_toggles/bulk', 'POST', companyToggles);

        const dbQuotas = await apiRequest('/api/store/eml_quotas');
        if (dbQuotas && dbQuotas.length > 0) setUsageQuotas(dbQuotas);
        else await apiRequest('/api/store/eml_quotas/bulk', 'POST', usageQuotas);

        const dbSwitches = await apiRequest('/api/store/eml_switches');
        if (dbSwitches) setSystemSwitches(dbSwitches);
        else await apiRequest('/api/store/eml_switches', 'POST', systemSwitches);

        setIsLoaded(true);
      } catch (err) {
        console.error('Error loading Email data from backend:', err);
        setIsLoaded(true);
      }
    };

    loadData();
  }, [token, backendUrl]);

  // Synchronizers to write state changes to the SQLite database
  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/eml_smtp/bulk', 'POST', smtpConfigs);
  }, [smtpConfigs, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/eml_templates/bulk', 'POST', emailTemplates);
  }, [emailTemplates, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/eml_logs/bulk', 'POST', outboxLogs);
  }, [outboxLogs, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/eml_queue/bulk', 'POST', emailQueue);
  }, [emailQueue, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/eml_attachments/bulk', 'POST', attachmentsData);
  }, [attachmentsData, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/eml_toggles/bulk', 'POST', companyToggles);
  }, [companyToggles, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/eml_quotas/bulk', 'POST', usageQuotas);
  }, [usageQuotas, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/eml_switches', 'POST', systemSwitches);
  }, [systemSwitches, isLoaded, token, backendUrl]);

  // --- ACTIONS HANDLERS ---
  const handleSaveSmtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSmtp.provider || !newSmtp.host) {
      showToast('Please fill out Provider and Server Host name', 'warning');
      return;
    }
    const nextId = `SMTP-${smtpConfigs.length + 1}`;
    const newSmtpObj = {
      id: nextId,
      provider: newSmtp.provider,
      host: newSmtp.host,
      port: newSmtp.port,
      isPrimary: newSmtp.isPrimary,
      status: newSmtp.status
    };
    
    // If setting as primary, demote others
    if (newSmtp.isPrimary) {
      setSmtpConfigs(prev => prev.map(s => ({ ...s, isPrimary: false })).concat(newSmtpObj));
    } else {
      setSmtpConfigs([...smtpConfigs, newSmtpObj]);
    }

    showToast(`SMTP Server Config ${nextId} created and tested successfully!`, 'success');
    setShowSmtpModal(false);
    setNewSmtp({ provider: '', host: '', port: '587', isPrimary: false, status: 'Connected' });
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplate.name || !newTemplate.subject) {
      showToast('Please specify a template title name and subject header', 'warning');
      return;
    }
    const nextId = `TPL-00${emailTemplates.length + 1}`;
    const newTplObj = {
      id: nextId,
      name: newTemplate.name,
      type: newTemplate.type,
      subject: newTemplate.subject,
      lastUpdated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'Active',
      body: newTemplate.body || 'Hello,\n\nStandard ERP notification system message body.'
    };
    setEmailTemplates([newTplObj, ...emailTemplates]);

    // Update KPI Templates Count
    setDashboardStats(prev => {
      const copy = [...prev];
      copy[3] = { ...copy[3], val: `${parseInt(copy[3].val) + 1} templates` };
      return copy;
    });

    showToast(`Email Template ${nextId} saved into library`, 'success');
    setShowTemplateModal(false);
    setNewTemplate({ name: '', type: 'Sales', subject: '', body: '' });
  };

  const handleSaveSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOutbound.recipient || !newOutbound.subject) {
      showToast('Please specify recipient and subject lines', 'warning');
      return;
    }
    const nextId = `Q-${500 + emailQueue.length + 1}`;
    const tplObj = emailTemplates.find(t => t.id === newOutbound.templateId);

    const newQueObj = {
      id: nextId,
      recipient: newOutbound.recipient,
      subject: newOutbound.subject,
      priority: newOutbound.priority,
      addedAt: 'Just now',
      status: 'Pending',
      category: tplObj ? tplObj.type : 'Other'
    };
    setEmailQueue([newQueObj, ...emailQueue]);
    showToast(`Email queued ${nextId} for dispatch queue`, 'success');
    setShowSendModal(false);
    setNewOutbound({ recipient: '', subject: '', templateId: '', priority: 'Normal' });
  };

  const handleForceSendQueue = (queueId: string) => {
    setEmailQueue(prev => prev.filter(q => {
      if (q.id === queueId) {
        showToast(`Dispatched email ${queueId} immediately. Transferred to Logs!`, 'success');
        
        // Log into Outbox history!
        const nextLogId = `LOG-${990 + outboxLogs.length + 1}`;
        const autoLogObj = {
          id: nextLogId,
          recipient: q.recipient,
          subject: q.subject,
          template: q.category + ' Generated',
          date: 'Today, Just now',
          status: 'Delivered',
          category: q.category
        };
        setOutboxLogs(prevLogs => [autoLogObj, ...prevLogs]);

        // Add to MTD counter
        setDashboardStats(prevStats => {
          const copy = [...prevStats];
          const currSent = parseInt(copy[0].val.replace(/,/g, ''));
          copy[0] = { ...copy[0], val: `${(currSent + 1).toLocaleString()} sent` };
          return copy;
        });

        // Add to SMTP usage counter
        setUsageQuotas(prevQuota => prevQuota.map((u, i) => i === 0 ? { ...u, sent: u.sent + 1 } : u));

        return false; // remove from queue
      }
      return true;
    }));
  };

  const handleRunRetry = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate retrying bounces logs
    setOutboxLogs(prev => prev.map(l => {
      if (l.status === 'Bounced') {
        showToast(`Retrying ${l.id}... Success!`, 'success');
        
        // Decrease Bounce KPI
        setDashboardStats(prevStats => {
          const copy = [...prevStats];
          const currBounces = parseInt(copy[2].val.split(' ')[0]);
          copy[2] = { ...copy[2], val: `${Math.max(currBounces - 1, 0)} bounces` };
          return copy;
        });

        return { ...l, status: 'Delivered' };
      }
      return l;
    }));
    setShowRetryModal(false);
  };

  const handleSaveQuotaLimit = (e: React.FormEvent) => {
    e.preventDefault();
    setUsageQuotas(prev => prev.map((q, idx) => {
      if (idx === selectedQuotaIndex) {
        showToast(`Updated quota cap for ${q.provider} to ${quotaEditLimit.toLocaleString()}`, 'success');
        return { ...q, maxLimit: quotaEditLimit };
      }
      return q;
    }));
    setShowQuotaModal(false);
  };

  const handleTestSmtpConnection = (smtpId: string) => {
    setSmtpConfigs(prev => prev.map(s => {
      if (s.id === smtpId) {
        showToast(`Ping tested ${s.provider}: Connected! Latency: 24ms`, 'success');
        return { ...s, status: 'Connected' };
      }
      return s;
    }));
  };

  const handleToggleSystemSwitch = (key: keyof typeof systemSwitches) => {
    setSystemSwitches(prev => {
      const copy = { ...prev };
      copy[key] = !copy[key];
      showToast(`${key.replace(/([A-Z])/g, ' $1')} toggled!`, 'success');
      return copy;
    });
  };

  const handleToggleCompanyEmail = (idx: number) => {
    setCompanyToggles(prev => prev.map((c, i) => {
      if (i === idx) {
        const nextVal = !c.emailService;
        showToast(`Service for ${c.company} is now ${nextVal ? 'Enabled' : 'Disabled'}`, 'success');
        return { ...c, emailService: nextVal };
      }
      return c;
    }));
  };

  // --- RENDER HELPERS ---
  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in p-2 text-left">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        {dashboardStats.map((stat, idx) => (
          <div key={idx} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 rounded-xl flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{stat.title}</p>
              <h3 className="text-base font-black text-[var(--text-primary)] font-display mt-0.5">{stat.val}</h3>
              <div className="text-[10px] mt-2 font-semibold text-[var(--text-muted)]">
                {stat.desc}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/10">
              <stat.icon className="w-5 h-5 text-indigo-500" />
            </div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5">
          <h4 className="font-bold text-xs text-[var(--text-primary)] mb-4 font-display">Recent Outbox Logs</h4>
          <div className="space-y-3">
            {outboxLogs.slice(0, 4).map(log => (
              <div key={log.id} className="flex justify-between items-center p-3 bg-[var(--bg-primary)]/40 rounded-xl border border-[var(--border-color)] text-xs">
                <div>
                  <p className="font-bold text-[var(--text-primary)] truncate max-w-[200px]">{log.subject}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{log.recipient} • {log.date}</p>
                </div>
                <div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                    log.status === 'Delivered' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                    'bg-rose-500/10 border-rose-500/20 text-rose-400 animate-pulse'
                  }`}>{log.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5">
          <h4 className="font-bold text-xs text-[var(--text-primary)] mb-4 font-display">Active Dispatch Queue</h4>
          <div className="space-y-3">
            {emailQueue.map(q => (
              <div key={q.id} className="flex justify-between items-center p-3 bg-[var(--bg-primary)]/40 rounded-xl border border-[var(--border-color)] text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                    <Send className="w-4 h-4"/>
                  </div>
                  <div>
                    <p className="font-bold text-[var(--text-primary)] truncate max-w-[150px]">{q.subject}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Rec: {q.recipient}</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-bold rounded uppercase">{q.priority}</span>
                  <button 
                    onClick={() => handleForceSendQueue(q.id)}
                    className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded font-bold cursor-pointer text-[9px]"
                  >
                    Force Send
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTable = (headers: string[], data: any[], renderRow: (item: any, i: number) => React.ReactNode) => {
    const filteredData = data.filter(item => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return Object.values(item).some(val => 
        val && String(val).toLowerCase().includes(query)
      );
    });

    return (
      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] overflow-hidden flex flex-col h-full animate-fade-in m-2">
        <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-tertiary)]/30">
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input 
              type="text" 
              placeholder="Search records..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg pl-9 pr-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <button className="p-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">
              <Filter className="w-4 h-4" />
            </button>
            <button className="p-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left text-sm text-[var(--text-secondary)] min-w-[800px]">
            <thead className="text-xs uppercase bg-[var(--bg-tertiary)]/50 text-[var(--text-muted)] sticky top-0 z-10 shadow-sm">
              <tr>
                {headers.map((h, i) => <th key={i} className="px-6 py-3 font-semibold">{h}</th>)}
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {filteredData.map((item, i) => renderRow(item, i))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto select-none animate-fade-in flex flex-col h-[calc(100vh-80px)] p-4 text-left relative">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border flex items-center gap-2 shadow-2xl backdrop-blur-md animate-scale-up ${
          toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
          'bg-amber-500/10 border-amber-500/30 text-amber-400'
        }`}>
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4 mb-4 shrink-0">
        <div>
          <h3 className="font-bold text-xl text-[var(--text-primary)] flex items-center gap-2 font-display">
            <Mail className="w-6 h-6 text-indigo-500" />
            Global transactional Email System
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Configure secure SMTP providers, design HTML transactional templates, monitor attachment weights limits, audit logs and quota restrictions</p>
        </div>
        <div className="flex gap-2">
          {currentTab === 'smtp' && (
            <button 
              onClick={() => setShowSmtpModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up"
            >
              <Plus className="w-4 h-4" /> Add SMTP Server
            </button>
          )}
          {currentTab === 'templates' && (
            <button 
              onClick={() => setShowTemplateModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up"
            >
              <Plus className="w-4 h-4" /> Create Email Template
            </button>
          )}
          {['invoice', 'po', 'approval', 'otp', 'payroll', 'report', 'logs'].includes(currentTab) && (
            <button 
              onClick={() => setShowSendModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up"
            >
              <Send className="w-4 h-4" /> Send Transactional Email
            </button>
          )}
          {currentTab === 'retry' && (
            <button 
              onClick={() => setShowRetryModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up"
            >
              <RefreshCw className="w-4 h-4" /> Run Bulk Retry
            </button>
          )}
          {currentTab === 'quota' && (
            <button 
              onClick={() => setShowQuotaModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up"
            >
              <Settings className="w-4 h-4" /> Modify Quotas limits
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {currentTab === 'dashboard' && renderDashboard()}

        {/* VIEW 1: SMTP SETTINGS */}
        {currentTab === 'smtp' && renderTable(
          ['Config ID', 'SMTP Provider Service', 'Server Host Particulars', 'Port', 'Primary Gateway', 'Active Status'],
          smtpConfigs,
          (row) => (
            <tr key={row.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{row.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{row.provider}</td>
              <td className="px-6 py-4 font-mono text-[var(--text-secondary)]">{row.host}</td>
              <td className="px-6 py-4 font-mono">{row.port}</td>
              <td className="px-6 py-4 font-bold">
                {row.isPrimary ? <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded font-mono text-[9px]">PRIMARY</span> : <span className="text-slate-500">-</span>}
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                  row.status === 'Connected' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-red-400'
                }`}>{row.status}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button 
                    onClick={() => handleTestSmtpConnection(row.id)}
                    className="px-2 py-0.5 text-indigo-400 hover:text-indigo-300 font-bold border border-indigo-500/25 bg-indigo-500/5 rounded text-[9px] cursor-pointer"
                  >
                    Test connection
                  </button>
                  <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          )
        )}

        {/* VIEW 2: EMAIL TEMPLATES */}
        {currentTab === 'templates' && renderTable(
          ['Template ID', 'Template Title Name', 'Department Category', 'Subject Line Layout', 'Last Updated', 'Status'],
          emailTemplates,
          (tpl) => (
            <tr key={tpl.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{tpl.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">
                <div className="flex items-center gap-2">
                  <LayoutTemplate className="w-3.5 h-3.5 text-slate-400" />
                  {tpl.name}
                </div>
              </td>
              <td className="px-6 py-4 font-semibold text-[var(--text-secondary)]">{tpl.type}</td>
              <td className="px-6 py-4 font-mono text-[var(--text-secondary)] truncate max-w-[200px]">{tpl.subject}</td>
              <td className="px-6 py-4 font-mono">{tpl.lastUpdated}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                  tpl.status === 'Active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                }`}>{tpl.status}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 3: INVOICE OUTBOX */}
        {currentTab === 'invoice' && renderTable(
          ['Log ID', 'Client Recipient Email', 'Tax Invoice Subject Header', 'Template Used', 'Filing Date', 'Filing Status'],
          outboxLogs.filter(l => l.category === 'Invoice'),
          (row) => (
            <tr key={row.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{row.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{row.recipient}</td>
              <td className="px-6 py-4 max-w-[200px] truncate">{row.subject}</td>
              <td className="px-6 py-4 font-semibold text-[var(--text-secondary)]">{row.template}</td>
              <td className="px-6 py-4 font-mono">{row.date}</td>
              <td className="px-6 py-4">
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold rounded uppercase">
                  {row.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 4: PURCHASE ORDER OUTBOX */}
        {currentTab === 'po' && renderTable(
          ['Log ID', 'Supplier Recipient Email', 'Purchase Order Subject', 'Template Used', 'Filing Date', 'Filing Status'],
          outboxLogs.filter(l => l.category === 'PO'),
          (row) => (
            <tr key={row.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-red-400">{row.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{row.recipient}</td>
              <td className="px-6 py-4 max-w-[200px] truncate">{row.subject}</td>
              <td className="px-6 py-4 font-semibold text-[var(--text-secondary)]">{row.template}</td>
              <td className="px-6 py-4 font-mono">{row.date}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                  row.status === 'Bounced' ? 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}>{row.status}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 5: APPROVAL EMAILS */}
        {currentTab === 'approval' && (
          <div className="space-y-6 animate-fade-in text-left p-2 h-full overflow-y-auto text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {emailQueue.filter(q => q.category === 'Approval').map((item) => (
                <div key={item.id} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 flex flex-col justify-between hover:border-indigo-500/30 transition-all shadow-sm">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="font-mono text-[9px] font-bold text-indigo-400 block">{item.id}</span>
                        <h4 className="font-bold text-xs text-[var(--text-primary)] font-display mt-0.5">{item.subject}</h4>
                      </div>
                      <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-red-500/20 text-[9px] font-bold rounded uppercase animate-pulse">{item.priority}</span>
                    </div>
                    
                    <div className="p-3 bg-[var(--bg-primary)]/40 rounded-lg border border-[var(--border-color)] text-[10px] text-[var(--text-secondary)] font-mono space-y-2 mt-4">
                      <div>To: {item.recipient}</div>
                      <div>Workflow action link: pending response from manager.</div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button 
                      onClick={() => {
                        showToast(`Workflow authorized in email queue`, 'success');
                        handleForceSendQueue(item.id);
                      }}
                      className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded transition-colors cursor-pointer text-center"
                    >
                      Authorize PO
                    </button>
                    <button 
                      onClick={() => {
                        showToast(`Workflow rejected and returned`, 'warning');
                        setEmailQueue(prev => prev.filter(q => q.id !== item.id));
                      }}
                      className="flex-1 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-red-500/25 text-xs font-bold rounded transition-colors cursor-pointer text-center"
                    >
                      Reject PO
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 6: SECURITY OTP LOGS */}
        {currentTab === 'otp' && renderTable(
          ['Log ID', 'User Recipient Particulars', 'OTP Subject Particulars', 'Template', 'Date / Time Verified', 'Status'],
          outboxLogs.filter(l => l.category === 'OTP'),
          (row) => (
            <tr key={row.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{row.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{row.recipient}</td>
              <td className="px-6 py-4 font-mono">{row.subject}</td>
              <td className="px-6 py-4 font-semibold text-[var(--text-secondary)]">{row.template}</td>
              <td className="px-6 py-4 font-mono">{row.date}</td>
              <td className="px-6 py-4">
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold rounded uppercase">
                  {row.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 7: PAYROLL SLIP DISPATCHES */}
        {currentTab === 'payroll' && renderTable(
          ['Log ID', 'Employee Recipient Email', 'Payroll Subject Particulars', 'Template', 'Filing Date', 'Status'],
          outboxLogs.filter(l => l.category === 'Payroll'),
          (row) => (
            <tr key={row.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{row.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{row.recipient}</td>
              <td className="px-6 py-4">{row.subject}</td>
              <td className="px-6 py-4 font-semibold text-[var(--text-secondary)]">{row.template}</td>
              <td className="px-6 py-4 font-mono">{row.date}</td>
              <td className="px-6 py-4">
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold rounded uppercase">
                  {row.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 8: PDF STAKEHOLDER REPORTS SCHEDULER */}
        {currentTab === 'report' && renderTable(
          ['Queue ID', 'Stakeholder Recipient', 'Annual / Monthly Report Subject', 'Priority level', 'Added Time', 'Queue status'],
          emailQueue.filter(q => q.category === 'Report'),
          (row) => (
            <tr key={row.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{row.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{row.recipient}</td>
              <td className="px-6 py-4 font-medium text-[var(--text-secondary)]">{row.subject}</td>
              <td className="px-6 py-4">
                <span className="px-2 py-0.5 bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[9px] font-bold rounded uppercase">{row.priority}</span>
              </td>
              <td className="px-6 py-4 font-mono">{row.addedAt}</td>
              <td className="px-6 py-4">
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-bold rounded uppercase animate-pulse">
                  {row.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button 
                    onClick={() => handleForceSendQueue(row.id)}
                    className="px-2 py-0.5 text-emerald-400 hover:text-emerald-300 font-bold border border-emerald-500/25 bg-emerald-500/5 rounded text-[9px] cursor-pointer"
                  >
                    Force Send
                  </button>
                  <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          )
        )}

        {/* VIEW 9: EMAIL QUEUE SYSTEM */}
        {currentTab === 'queue' && renderTable(
          ['Queue ID', 'Recipient Target', 'Outbox Subject Particulars', 'Priority Grade', 'Queue Age', 'Delivery Status'],
          emailQueue,
          (q) => (
            <tr key={q.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-amber-500">{q.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{q.recipient}</td>
              <td className="px-6 py-4 text-sm truncate max-w-[200px]">{q.subject}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                  q.priority === 'High' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 animate-pulse' :
                  q.priority === 'Normal' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                  'bg-slate-500/10 border-slate-500/20 text-slate-400'
                }`}>{q.priority}</span>
              </td>
              <td className="px-6 py-4 text-xs font-mono">{q.addedAt}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                  q.status === 'Processing' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 animate-pulse' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                }`}>{q.status}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button 
                    onClick={() => handleForceSendQueue(q.id)}
                    className="px-2 py-0.5 text-emerald-400 hover:text-emerald-300 font-bold border border-emerald-500/25 bg-emerald-500/5 rounded text-[9px] cursor-pointer"
                  >
                    Force Send
                  </button>
                  <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          )
        )}

        {/* VIEW 10: FAILED DELIVERY RETRY MECHANISM */}
        {currentTab === 'retry' && renderTable(
          ['Failed ID', 'Recipient', 'Bounced Subject Particulars', 'Bounced Template Used', 'Date Bounced', 'Bounce status'],
          outboxLogs.filter(l => l.status === 'Bounced'),
          (row) => (
            <tr key={row.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-red-500">{row.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{row.recipient}</td>
              <td className="px-6 py-4 max-w-[200px] truncate text-red-400">{row.subject}</td>
              <td className="px-6 py-4 font-semibold text-[var(--text-secondary)]">{row.template}</td>
              <td className="px-6 py-4 font-mono">{row.date}</td>
              <td className="px-6 py-4">
                <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-bold rounded uppercase animate-pulse">
                  SMTP 550 BOUNCE
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button 
                  onClick={() => {
                    showToast(`Single retry triggered for ${row.id}... Success!`, 'success');
                    setOutboxLogs(prev => prev.map(l => l.id === row.id ? { ...l, status: 'Delivered' } : l));
                    setDashboardStats(prevStats => {
                      const copy = [...prevStats];
                      const currBounces = parseInt(copy[2].val.split(' ')[0]);
                      copy[2] = { ...copy[2], val: `${Math.max(currBounces - 1, 0)} bounces` };
                      return copy;
                    });
                  }}
                  className="px-2 py-0.5 text-indigo-400 hover:text-indigo-300 font-bold border border-indigo-500/25 bg-indigo-500/5 rounded text-[9px] cursor-pointer"
                >
                  Quick Retry
                </button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 11: ATTACHMENT SAFETY SUPPORT */}
        {currentTab === 'attachment' && renderTable(
          ['Attachment ID', 'Filing File Name', 'Attached Document Type', 'Linked Outbox log', 'Attachment File Size', 'quota status'],
          attachmentsData,
          (row) => (
            <tr key={row.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{row.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">
                <div className="flex items-center gap-2">
                  <FileArchive className="w-3.5 h-3.5 text-slate-400" />
                  {row.fileName}
                </div>
              </td>
              <td className="px-6 py-4 font-semibold text-[var(--text-secondary)]">{row.type}</td>
              <td className="px-6 py-4 font-mono font-semibold text-indigo-400">{row.link}</td>
              <td className="px-6 py-4 font-mono font-bold">{row.size}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                  row.status === 'Passed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse'
                }`}>{row.status}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 12: OUTBOX HISTORICAL LOGS */}
        {currentTab === 'logs' && renderTable(
          ['Log ID', 'Recipient', 'outbox Subject Particulars', 'Template Used', 'Filing Date', 'Filing status'],
          outboxLogs,
          (row) => (
            <tr key={row.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{row.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{row.recipient}</td>
              <td className="px-6 py-4 max-w-[200px] truncate">{row.subject}</td>
              <td className="px-6 py-4 font-semibold text-[var(--text-secondary)]">{row.template}</td>
              <td className="px-6 py-4 font-mono text-xs">{row.date}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                  row.status === 'Delivered' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400 animate-pulse'
                }`}>{row.status}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 13: WYSIWYG TEMPLATE EDITOR COMPILER */}
        {currentTab === 'editor' && (
          <div className="space-y-6 animate-fade-in text-left p-2 h-full overflow-y-auto text-xs">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              
              {/* Template Editor form */}
              <div className="lg:col-span-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)]/10 rounded-2xl p-5 space-y-4">
                <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block border-b border-[var(--border-color)]/30 pb-1">WYSIWYG Compiler Editor</span>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Choose template</label>
                    <select
                      value={selectedEditorTemplate}
                      onChange={(e) => setSelectedEditorTemplate(e.target.value)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none"
                    >
                      {emailTemplates.map(t => <option key={t.id} value={t.id}>[{t.id}] {t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Live Variable: Customer Name</label>
                    <input type="text" value={previewCustomerName} onChange={(e) => setPreviewCustomerName(e.target.value)} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Live Variable: Invoice No</label>
                    <input type="text" value={previewInvoiceNo} onChange={(e) => setPreviewInvoiceNo(e.target.value)} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-mono" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Live Variable: Amount Value</label>
                    <input type="text" value={previewAmount} onChange={(e) => setPreviewAmount(e.target.value)} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-mono" />
                  </div>
                </div>

                <button 
                  onClick={() => showToast(`Template modifications compiled perfectly!`, 'success')}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <LayoutTemplate className="w-4 h-4" /> Save HTML variables
                </button>
              </div>

              {/* Template Editor Preview Sheet */}
              <div className="lg:col-span-3 border border-[var(--border-color)] bg-[var(--bg-tertiary)]/20 p-5 rounded-2xl flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block border-b border-[var(--border-color)]/30 pb-2 mb-4 w-full">Outbound email html layout preview</span>
                  <div className="border border-gray-300 bg-white text-black p-5 rounded-xl space-y-4 font-sans select-none shadow text-[11px] leading-relaxed">
                    <div className="border-b border-gray-200 pb-3 flex justify-between items-center text-[10px] text-gray-500">
                      <div>
                        <span className="font-bold">Subject:</span> {emailTemplates.find(t => t.id === selectedEditorTemplate)?.subject
                          .replace('{{Invoice_Number}}', previewInvoiceNo)
                          .replace('{{PO_Number}}', 'PO-2026-901')
                          .replace('{{OTP}}', '491024')
                          .replace('{{Month}}', 'May')
                          .replace('{{Year}}', '2026') || 'ERP Notification'}
                      </div>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[8px] font-bold">PREVIEW</span>
                    </div>

                    <div className="py-2 text-gray-800 font-sans whitespace-pre-line">
                      {emailTemplates.find(t => t.id === selectedEditorTemplate)?.body
                        .replace('{{Customer_Name}}', previewCustomerName)
                        .replace('{{Invoice_Number}}', previewInvoiceNo)
                        .replace('{{Amount}}', previewAmount)
                        .replace('{{PO_Number}}', 'PO-2026-901')
                        .replace('{{Manager_Name}}', 'Tony Stark')
                        .replace('{{OTP}}', '491024')
                        .replace('{{User}}', 'Admin User')
                        .replace('{{Employee}}', 'Alice Wong')
                        .replace('{{Net_Pay}}', '$8,500.00') || 'Standard system template content.'}
                    </div>

                    <div className="pt-3 border-t border-gray-100 text-[8px] text-gray-400 font-mono">
                      This is an automated ERP notification. Do not reply.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 14: SUPER ADMIN EMAIL SYSTEM TOGGLE */}
        {currentTab === 'toggle' && (
          <div className="space-y-6 animate-fade-in text-left p-2 h-full overflow-y-auto text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Switches Panel */}
              <div className="border border-[var(--border-color)] bg-[var(--bg-tertiary)]/10 rounded-2xl p-5 space-y-4">
                <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">System Delivery switches</span>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-[var(--bg-primary)]/40 p-3 rounded-xl border border-[var(--border-color)]">
                    <div>
                      <span className="font-bold text-[var(--text-primary)] block">Global Delivery Dispatch Service</span>
                      <span className="text-[10px] text-[var(--text-muted)]">Halt or enable all transactional outbound channels</span>
                    </div>
                    <button onClick={() => handleToggleSystemSwitch('globalEmailEnable')} className="cursor-pointer">
                      {systemSwitches.globalEmailEnable ? <ToggleRight className="w-9 h-9 text-indigo-500" /> : <ToggleLeft className="w-9 h-9 text-slate-500" />}
                    </button>
                  </div>
                  <div className="flex justify-between items-center bg-[var(--bg-primary)]/40 p-3 rounded-xl border border-[var(--border-color)]">
                    <div>
                      <span className="font-bold text-[var(--text-primary)] block">Auto Invoice emails Dispatch</span>
                      <span className="text-[10px] text-[var(--text-muted)]">Dispatch invoices on sales finalizing</span>
                    </div>
                    <button onClick={() => handleToggleSystemSwitch('invoiceAutoSend')} className="cursor-pointer">
                      {systemSwitches.invoiceAutoSend ? <ToggleRight className="w-9 h-9 text-indigo-500" /> : <ToggleLeft className="w-9 h-9 text-slate-500" />}
                    </button>
                  </div>
                  <div className="flex justify-between items-center bg-[var(--bg-primary)]/40 p-3 rounded-xl border border-[var(--border-color)]">
                    <div>
                      <span className="font-bold text-[var(--text-primary)] block">Auto HR Payroll payslips Dispatch</span>
                      <span className="text-[10px] text-[var(--text-muted)]">Dispatch payroll sheets automatically monthly</span>
                    </div>
                    <button onClick={() => handleToggleSystemSwitch('payrollAutoSend')} className="cursor-pointer">
                      {systemSwitches.payrollAutoSend ? <ToggleRight className="w-9 h-9 text-indigo-500" /> : <ToggleLeft className="w-9 h-9 text-slate-500" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Switches descriptions alerts */}
              <div className="border border-[var(--border-color)] bg-[var(--bg-tertiary)]/20 p-5 rounded-2xl flex flex-col justify-center">
                <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block mb-3 text-center">Super admin authority warnings</span>
                <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-[10px] text-[var(--text-secondary)] leading-relaxed">
                  <p className="font-bold text-rose-400 flex items-center gap-1.5 mb-2"><ShieldAlert className="w-4 h-4 animate-pulse" /> Critical operations check</p>
                  Halting **Global Delivery Dispatch Service** will completely stop OTP deliveries, billing reports, invoices, and purchase approvals dispatches. Multi-tenant instances will be isolated instantly.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 15: COMPANY-WISE EMAIL ENABLE/DISABLE */}
        {currentTab === 'enable' && renderTable(
          ['Multi-tenant company division Particulars', 'Service status check', 'Allocated Monthly Delivery limits', 'Selected Active SMTP Channel Gateway'],
          companyToggles,
          (row, i) => (
            <tr key={i} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-slate-400" />
                  {row.company}
                </div>
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                  row.emailService ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>{row.emailService ? 'ENABLED' : 'DISABLED'}</span>
              </td>
              <td className="px-6 py-4 font-mono font-semibold">{row.logsQuota}</td>
              <td className="px-6 py-4 font-semibold text-indigo-400">{row.activeSMTP}</td>
              <td className="px-6 py-4 text-right">
                <button 
                  onClick={() => handleToggleCompanyEmail(i)}
                  className="px-2 py-0.5 text-indigo-400 hover:text-indigo-300 font-bold border border-indigo-500/25 bg-indigo-500/5 rounded text-[9px] cursor-pointer"
                >
                  Toggle Service
                </button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 16: SMTP QUOTAS LIMITS */}
        {currentTab === 'quota' && (
          <div className="space-y-6 animate-fade-in text-left p-2 h-full overflow-y-auto text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {usageQuotas.map((row, i) => (
                <div key={i} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 flex flex-col justify-between hover:border-indigo-500/30 transition-all shadow-sm">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-bold text-xs text-[var(--text-primary)] font-display">{row.provider}</span>
                      <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-bold rounded">ACTIVE</span>
                    </div>

                    <div className="space-y-2 mt-4">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span>Used Delivery Quota:</span>
                        <span>{row.sent.toLocaleString()} / {row.maxLimit.toLocaleString()} sent</span>
                      </div>
                      <div className="h-2 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${row.color}`} style={{ width: `${(row.sent / row.maxLimit) * 100}%` }}></div>
                      </div>
                      <p className="text-[9px] text-[var(--text-muted)] italic font-mono pt-1">Reset date: {row.resetDate}</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setSelectedQuotaIndex(i);
                      setQuotaEditLimit(row.maxLimit);
                      setShowQuotaModal(true);
                    }}
                    className="w-full py-1.5 mt-6 bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Adjust limits
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ==========================================
          MODALS CORE DRAWERS
          ========================================== */}

      {/* Add SMTP Server Modal */}
      {showSmtpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveSmtp} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowSmtpModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <Settings className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Register SMTP Server Config</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">SMTP Provider Service</label>
                <input type="text" placeholder="e.g. SendGrid API, AWS SES US-West" value={newSmtp.provider} onChange={(e) => setNewSmtp({ ...newSmtp, provider: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Server Host Particulars</label>
                <input type="text" placeholder="e.g. smtp.sendgrid.net" value={newSmtp.host} onChange={(e) => setNewSmtp({ ...newSmtp, host: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-mono" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">SMTP Port</label>
                  <select value={newSmtp.port} onChange={(e) => setNewSmtp({ ...newSmtp, port: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                    <option value="587">587 (TLS Standard)</option>
                    <option value="465">465 (SSL High-Security)</option>
                    <option value="25">25 (Unsecure)</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input type="checkbox" id="smtpPrimaryCheck" checked={newSmtp.isPrimary} onChange={(e) => setNewSmtp({ ...newSmtp, isPrimary: e.target.checked })} className="w-3.5 h-3.5 bg-gray-900 border-gray-800 rounded" />
                  <label htmlFor="smtpPrimaryCheck" className="text-[10px] font-bold text-[var(--text-secondary)]">Set as Primary Gateway</label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowSmtpModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Save & Test Server</button>
            </div>
          </form>
        </div>
      )}

      {/* Add Email Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveTemplate} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowTemplateModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <LayoutTemplate className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Create Email Template</h4>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Template Title Name</label>
                  <input type="text" placeholder="e.g. Invoice Generated" value={newTemplate.name} onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Department Category</label>
                  <select value={newTemplate.type} onChange={(e) => setNewTemplate({ ...newTemplate, type: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                    <option value="Sales">Sales department</option>
                    <option value="Purchase">Purchase department</option>
                    <option value="Security">Security division</option>
                    <option value="HR">HR department</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Subject Line Layout</label>
                <input type="text" placeholder="e.g. Tax Invoice {{Invoice_Number}} Attached" value={newTemplate.subject} onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-sans" required />
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Body Text Content (supports Variables)</label>
                <textarea placeholder="e.g. Hello {{Customer_Name}},\n\nPlease find attached tax invoice {{Invoice_Number}} for {{Amount}}." value={newTemplate.body} onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none h-20 font-sans resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowTemplateModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Save Template</button>
            </div>
          </form>
        </div>
      )}

      {/* Send Transactional Email Modal */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveSend} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowSendModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <Send className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Send Transactional Email Dispatch</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Select Email Template</label>
                <select 
                  value={newOutbound.templateId} 
                  onChange={(e) => {
                    const selTpl = emailTemplates.find(t => t.id === e.target.value);
                    setNewOutbound({ ...newOutbound, templateId: e.target.value, subject: selTpl ? selTpl.subject : '' });
                  }} 
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none"
                  required
                >
                  <option value="">-- Choose Template --</option>
                  {emailTemplates.map(t => <option key={t.id} value={t.id}>[{t.id}] {t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Recipient Target Email</label>
                <input type="email" placeholder="client@domain.com" value={newOutbound.recipient} onChange={(e) => setNewOutbound({ ...newOutbound, recipient: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-sans" required />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Subject Header Particulars</label>
                  <input type="text" placeholder="Subject" value={newOutbound.subject} onChange={(e) => setNewOutbound({ ...newOutbound, subject: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-sans" required />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Priority Grade</label>
                  <select value={newOutbound.priority} onChange={(e) => setNewOutbound({ ...newOutbound, priority: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowSendModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Queue Dispatch</button>
            </div>
          </form>
        </div>
      )}

      {/* Adjust Quotas limit Modal */}
      {showQuotaModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveQuotaLimit} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowQuotaModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <Scale className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Modify Quota threshold limits</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">SMTP Provider Service selected</label>
                <input type="text" value={usageQuotas[selectedQuotaIndex]?.provider || 'AWS SES'} readOnly className="w-full bg-[var(--bg-primary)]/50 border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none cursor-not-allowed font-semibold" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Active Outbound quota cap limit (sent/mo)</label>
                <input type="number" value={quotaEditLimit} onChange={(e) => setQuotaEditLimit(Number(e.target.value))} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-mono" required />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowQuotaModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Apply Quota cap</button>
            </div>
          </form>
        </div>
      )}

      {/* Bulk Retry Modal */}
      {showRetryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleRunRetry} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-sm p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowRetryModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <RefreshCw className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Run Bulk Outbox Retry Engine</h4>
            </div>
            <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed mb-4">
              This will parse all **bounced outbox logs** with status **Bounced (550 SMTP)** and rerun delivery checks through primary active SMTP configurations in the state.
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
              <button type="button" onClick={() => setShowRetryModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Launch Bulk Run</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default GlobalEmailSystem;
