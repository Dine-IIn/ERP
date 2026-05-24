import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Users, FileText, FileSpreadsheet, 
  CreditCard, BarChart3, Plus, Search, Filter, Download, ArrowUpRight, 
  Building2, Receipt, Clock, CheckCircle2, MoreHorizontal, ArrowDownRight, Briefcase,
  AlertTriangle, Mail, RefreshCw, Star, Trash2, CheckCircle, HelpCircle, ShieldAlert
} from 'lucide-react';

interface Props {
  activeTab?: string;
  user: any;
  token?: string;
  backendUrl?: string;
}

const PurchaseProcurement: React.FC<Props> = ({ user: _user, activeTab, token, backendUrl }) => {
  const mapping: Record<string, string> = {
    'PURCHASE_VENDOR_MGT': 'vendors',
    'PURCHASE_REQUISITIONS': 'requisitions',
    'PURCHASE_ORDERS': 'orders',
    'PURCHASE_QUOTATIONS': 'quotations',
    'PURCHASE_COMPARISON': 'comparison',
    'PURCHASE_PAYMENTS': 'payments',
    'PURCHASE_APPROVALS': 'approvals',
    'PURCHASE_REORDER': 'reorder',
    'PURCHASE_GRN': 'grn',
    'PURCHASE_DASHBOARD': 'dashboard',
    'PURCHASE_PO_PDF': 'po_pdf',
    'PURCHASE_EMAIL_PO': 'email_po'
  };

  const currentTab = (activeTab && mapping[activeTab]) ? mapping[activeTab] : 'dashboard';
  const [searchQuery, setSearchQuery] = useState('');

  // Interactive UI modals/controls states
  const [showRequisitionModal, setShowRequisitionModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  
  // Custom forms states
  const [newRequisition, setNewRequisition] = useState({ item: '', dept: 'Engineering', qty: '', est: '' });
  const [newPO, setNewPO] = useState({ vendor: '', date: '', amount: '', expected: '' });
  const [newQuote, setNewQuote] = useState({ rfq: 'RFQ-103', vendor: '', amount: '', validity: '30 Days' });
  const [selectedPOForPdf, setSelectedPOForPdf] = useState<string>('PO-2026-001');
  const [emailPOConfig, setEmailPOConfig] = useState({ recipient: 'sales@techtronics.com', subject: 'Purchase Order PO-2026-001 Attached', template: 'PO_DEFAULT' });

  // Reorder thresholds configurations
  const [reorderRules, setReorderRules] = useState<Record<string, { minStock: number; status: string }>>({
    'POC-992': { minStock: 50, status: 'Active' },
    'ED-104': { minStock: 20, status: 'Active' },
    'WM-009': { minStock: 100, status: 'Active' }
  });

  // Toast notifications trigger
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);
  const showToast = (message: string, type: 'success' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- DUMMY DATABASES ---
  const dashboardStats = [
    { title: 'Total POs this Month', val: '142 POs', change: '+12% vs last month', isPositive: true, icon: Receipt, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { title: 'Pending Approvals', val: '12 logs', change: '-3 since yesterday', isPositive: true, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { title: 'Active Vendors', val: '45 entries', change: '+2 new vendors', isPositive: true, icon: Building2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Completed POs', val: '98 items', change: '69% fulfillment rate', isPositive: false, icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-500/10' }
  ];

  const [vendorsData, setVendorsData] = useState([
    { id: 'VND-001', name: 'Techtronics Inc.', category: 'Hardware', contact: 'John Smith', email: 'sales@techtronics.com', status: 'Active', rating: '4.8' },
    { id: 'VND-002', name: 'Global Supply Co.', category: 'Office Supplies', contact: 'Sarah Connor', email: 'info@global.com', status: 'Active', rating: '4.5' },
    { id: 'VND-003', name: 'OfficeMax Logistics', category: 'Logistics', contact: 'Mike Tyson', email: 'support@officemax.com', status: 'Under Review', rating: '3.2' },
    { id: 'VND-004', name: 'Hardware Solutions', category: 'Hardware', contact: 'Emma Watson', email: 'emma@hwsol.com', status: 'Inactive', rating: '4.0' },
  ]);

  const [requisitionsData, setRequisitionsData] = useState([
    { id: 'REQ-5021', date: 'Today', department: 'Engineering', item: 'MacBook Pro M3', qty: 5, estValue: '$12,500', status: 'Pending' },
    { id: 'REQ-5022', date: 'Yesterday', department: 'Marketing', item: 'Adobe CC Licenses', qty: 10, estValue: '$800', status: 'Approved' },
    { id: 'REQ-5023', date: 'Oct 20, 2026', department: 'Operations', item: 'Office Chairs', qty: 20, estValue: '$4,000', status: 'Rejected' },
  ]);

  const [purchaseOrders, setPurchaseOrders] = useState([
    { id: 'PO-2026-001', vendor: 'Techtronics Inc.', date: 'May 20, 2026', amount: '$45,200', status: 'Approved', expected: 'May 25, 2026' },
    { id: 'PO-2026-002', vendor: 'Global Supply Co.', date: 'May 21, 2026', amount: '$12,450', status: 'Pending Approval', expected: 'Jun 01, 2026' },
    { id: 'PO-2026-003', vendor: 'OfficeMax Logistics', date: 'May 22, 2026', amount: '$3,200', status: 'Draft', expected: 'TBD' },
    { id: 'PO-2026-004', vendor: 'Hardware Solutions', date: 'May 18, 2026', amount: '$89,000', status: 'Fulfilled', expected: 'Delivered' }
  ]);

  const [quotationsData, setQuotationsData] = useState([
    { id: 'QT-991', rfqRef: 'RFQ-102', vendor: 'Techtronics Inc.', date: 'Today', amount: '$42,000', validity: '30 Days', status: 'Received' },
    { id: 'QT-992', rfqRef: 'RFQ-102', vendor: 'Hardware Solutions', date: 'Yesterday', amount: '$44,500', validity: '15 Days', status: 'Shortlisted' },
  ]);

  const [paymentsData, setPaymentsData] = useState([
    { id: 'PAY-8812', poRef: 'PO-2026-004', vendor: 'Hardware Solutions', dueDate: 'Jun 15, 2026', amount: '$89,000', method: 'Bank Transfer', status: 'Scheduled' },
    { id: 'PAY-8811', poRef: 'PO-2026-001', vendor: 'Techtronics Inc.', dueDate: 'May 22, 2026', amount: '$45,200', method: 'Credit Card', status: 'Paid' },
  ]);

  const [grnMatchingData, setGrnMatchingData] = useState([
    { poId: 'PO-2026-004', grnId: 'GRN-5041', product: 'Premium Office Chair', poQty: 100, receivedQty: 100, acceptedQty: 100, status: 'Perfect Match' },
    { poId: 'PO-2026-001', grnId: 'GRN-5042', product: 'Wireless Mouse', poQty: 500, receivedQty: 500, acceptedQty: 480, status: 'Shortage Discrepancy' }
  ]);

  const [emailHistoryData, setEmailHistoryData] = useState([
    { id: 'EML-091', date: 'Today, 2:10 PM', recipient: 'sales@techtronics.com', subject: 'Purchase Order PO-2026-001 dispatch', status: 'Delivered' },
    { id: 'EML-090', date: 'Yesterday', recipient: 'info@global.com', subject: 'Request for Quote RFQ-102 specs', status: 'Sent' }
  ]);

  // --- DATABASE SYNC & BACKEND CONNECTIVITY ---
  const [isLoaded, setIsLoaded] = useState(false);

  const apiRequest = async (endpoint: string, method = 'GET', body: any = null) => {
    if (!token || !backendUrl) return null;
    try {
      const headers: any = { 'Authorization': `Bearer ${token}` };
      if (body) headers['Content-Type'] = 'application/json';
      const res = await fetch(`${backendUrl}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Request failed');
      }
      return await res.json();
    } catch (err) {
      console.error(`[Purchase API Error] ${endpoint}:`, err);
      return null;
    }
  };

  useEffect(() => {
    if (!token || !backendUrl) return;

    const loadData = async () => {
      try {
        const dbVendors = await apiRequest('/api/store/pur_vendors');
        if (dbVendors && dbVendors.length > 0) setVendorsData(dbVendors);
        else await apiRequest('/api/store/pur_vendors/bulk', 'POST', vendorsData);

        const dbReqs = await apiRequest('/api/store/pur_requisitions');
        if (dbReqs && dbReqs.length > 0) setRequisitionsData(dbReqs);
        else await apiRequest('/api/store/pur_requisitions/bulk', 'POST', requisitionsData);

        const dbOrders = await apiRequest('/api/store/pur_orders');
        if (dbOrders && dbOrders.length > 0) setPurchaseOrders(dbOrders);
        else await apiRequest('/api/store/pur_orders/bulk', 'POST', purchaseOrders);

        const dbQuotes = await apiRequest('/api/store/pur_quotes');
        if (dbQuotes && dbQuotes.length > 0) setQuotationsData(dbQuotes);
        else await apiRequest('/api/store/pur_quotes/bulk', 'POST', quotationsData);

        const dbPayments = await apiRequest('/api/store/pur_payments');
        if (dbPayments && dbPayments.length > 0) setPaymentsData(dbPayments);
        else await apiRequest('/api/store/pur_payments/bulk', 'POST', paymentsData);

        const dbGrn = await apiRequest('/api/store/pur_grn');
        if (dbGrn && dbGrn.length > 0) setGrnMatchingData(dbGrn);
        else await apiRequest('/api/store/pur_grn/bulk', 'POST', grnMatchingData);

        const dbEmails = await apiRequest('/api/store/pur_emails');
        if (dbEmails && dbEmails.length > 0) setEmailHistoryData(dbEmails);
        else await apiRequest('/api/store/pur_emails/bulk', 'POST', emailHistoryData);

        setIsLoaded(true);
      } catch (err) {
        console.error('Error loading Purchase data from backend:', err);
        setIsLoaded(true);
      }
    };

    loadData();
  }, [token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/pur_vendors/bulk', 'POST', vendorsData);
  }, [vendorsData, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/pur_requisitions/bulk', 'POST', requisitionsData);
  }, [requisitionsData, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/pur_orders/bulk', 'POST', purchaseOrders);
  }, [purchaseOrders, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/pur_quotes/bulk', 'POST', quotationsData);
  }, [quotationsData, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/pur_payments/bulk', 'POST', paymentsData);
  }, [paymentsData, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/pur_grn/bulk', 'POST', grnMatchingData);
  }, [grnMatchingData, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/pur_emails/bulk', 'POST', emailHistoryData);
  }, [emailHistoryData, isLoaded, token, backendUrl]);

  // --- ACTIONS HANDLERS ---
  const handleSaveRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequisition.item || !newRequisition.qty || !newRequisition.est) {
      showToast('Please fill all required requisition details', 'warning');
      return;
    }
    const nextId = `REQ-50${20 + requisitionsData.length + 1}`;
    const newReq = {
      id: nextId,
      date: 'Today',
      department: newRequisition.dept,
      item: newRequisition.item,
      qty: Number(newRequisition.qty),
      estValue: `$${Number(newRequisition.est).toLocaleString()}`,
      status: 'Pending'
    };
    setRequisitionsData([newReq, ...requisitionsData]);
    showToast(`Purchase Requisition ${nextId} for ${newRequisition.item} logged successfully`, 'success');
    setShowRequisitionModal(false);
    setNewRequisition({ item: '', dept: 'Engineering', qty: '', est: '' });
  };

  const handleSavePO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPO.vendor || !newPO.date || !newPO.amount) {
      showToast('Please fill all required PO details', 'warning');
      return;
    }
    const nextId = `PO-2026-0${purchaseOrders.length + 1}`;
    const nPo = {
      id: nextId,
      vendor: newPO.vendor,
      date: newPO.date,
      amount: `$${Number(newPO.amount).toLocaleString()}`,
      status: 'Pending Approval',
      expected: newPO.expected || 'TBD'
    };
    setPurchaseOrders([nPo, ...purchaseOrders]);
    showToast(`Draft Purchase Order ${nextId} generated successfully`, 'success');
    setShowPOModal(false);
    setNewPO({ vendor: '', date: '', amount: '', expected: '' });
  };

  const handleSaveQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuote.vendor || !newQuote.amount) {
      showToast('Please fill all required quote details', 'warning');
      return;
    }
    const nextId = `QT-99${quotationsData.length + 1}`;
    const nQt = {
      id: nextId,
      rfqRef: newQuote.rfq,
      vendor: newQuote.vendor,
      date: 'Today',
      amount: `$${Number(newQuote.amount).toLocaleString()}`,
      validity: newQuote.validity,
      status: 'Received'
    };
    setQuotationsData([nQt, ...quotationsData]);
    showToast(`Vendor Quotation ${nextId} for ${newQuote.rfq} recorded successfully`, 'success');
    setShowQuoteModal(false);
    setNewQuote({ rfq: 'RFQ-103', vendor: '', amount: '', validity: '30 Days' });
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const nextId = `EML-09${emailHistoryData.length + 1}`;
    const nEml = {
      id: nextId,
      date: 'Today, 2:10 PM',
      recipient: emailPOConfig.recipient,
      subject: emailPOConfig.subject,
      status: 'Delivered'
    };
    setEmailHistoryData([nEml, ...emailHistoryData]);
    showToast(`PO Document successfully dispatched to ${emailPOConfig.recipient}`, 'success');
    setShowEmailModal(false);
  };

  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in p-2 text-left">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        {dashboardStats.map((stat, idx) => (
          <div key={idx} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 rounded-xl flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{stat.title}</p>
              <h3 className="text-base font-black text-[var(--text-primary)] font-display mt-0.5">{stat.val}</h3>
              <div className={`flex items-center text-[10px] mt-2 font-bold ${stat.isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                {stat.isPositive ? <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-1" />}
                {stat.change}
              </div>
            </div>
            <div className={`w-11 h-11 rounded-xl ${stat.bg} flex items-center justify-center border border-indigo-500/10`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5">
          <h4 className="font-bold text-xs text-[var(--text-primary)] mb-4 font-display">Recent Purchase Orders Ledger</h4>
          <div className="space-y-3">
            {purchaseOrders.slice(0,4).map(po => (
              <div key={po.id} className="flex justify-between items-center p-3 bg-[var(--bg-primary)]/40 rounded-xl border border-[var(--border-color)] text-xs">
                <div>
                  <p className="font-bold text-indigo-400 font-mono">{po.id}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{po.vendor}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[var(--text-primary)]">{po.amount}</p>
                  <span className={`text-[9px] font-bold uppercase border px-1.5 py-0.5 rounded mt-1 inline-block ${
                    po.status === 'Approved' || po.status === 'Fulfilled' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 
                    po.status === 'Draft' ? 'bg-slate-500/10 border-slate-500/25 text-slate-400' : 
                    'bg-amber-500/10 border-amber-500/25 text-amber-500'
                  }`}>{po.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5">
          <h4 className="font-bold text-xs text-[var(--text-primary)] mb-4 font-display">Pending Requisitions Authorization</h4>
          <div className="space-y-3">
            {requisitionsData.filter(r => r.status === 'Pending').map(req => (
              <div key={req.id} className="flex justify-between items-center p-3 bg-[var(--bg-primary)]/40 rounded-xl border border-[var(--border-color)] text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                    <FileText className="w-4 h-4"/>
                  </div>
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">{req.item}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{req.department} • Qty: {req.qty}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-[var(--text-primary)]">{req.estValue}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTable = (headers: string[], data: any[], renderRow: (item: any, i: number) => React.ReactNode) => (
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
            {data.map((item, i) => renderRow(item, i))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto select-none animate-fade-in flex flex-col h-[calc(100vh-80px)] p-4 text-left relative">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border flex items-center gap-2 shadow-2xl backdrop-blur-md animate-scale-up ${
          toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
          'bg-amber-500/10 border-amber-500/30 text-amber-400'
        }`}>
          <CheckCircle className="w-4 h-4" />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4 mb-4 shrink-0">
        <div>
          <h3 className="font-bold text-xl text-[var(--text-primary)] flex items-center gap-2 font-display">
            <ShoppingCart className="w-6 h-6 text-indigo-500" />
            Purchase & Procurement Hub
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Manage supplier relationships, RFQs, safety reorder limits, and automated purchasing dispatches</p>
        </div>
        <div className="flex gap-2">
          {currentTab === 'requisitions' && (
            <button 
              onClick={() => setShowRequisitionModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Requisition
            </button>
          )}
          {currentTab === 'orders' && (
            <button 
              onClick={() => setShowPOModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Draft Purchase Order
            </button>
          )}
          {currentTab === 'quotations' && (
            <button 
              onClick={() => setShowQuoteModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Log Quote RFQ
            </button>
          )}
          {currentTab === 'email_po' && (
            <button 
              onClick={() => setShowEmailModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Mail className="w-4 h-4" /> Compose PO Dispatch
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {currentTab === 'dashboard' && renderDashboard()}
        
        {/* VIEW 1: VENDOR MANAGEMENT */}
        {currentTab === 'vendors' && renderTable(
          ['Vendor ID', 'Vendor Name', 'Category', 'Contact Person', 'Email', 'Rating', 'Status'],
          vendorsData,
          (vnd) => (
            <tr key={vnd.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors group text-xs">
              <td className="px-6 py-4 font-mono text-xs">{vnd.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{vnd.name}</td>
              <td className="px-6 py-4">{vnd.category}</td>
              <td className="px-6 py-4">{vnd.contact}</td>
              <td className="px-6 py-4 font-mono">{vnd.email}</td>
              <td className="px-6 py-4 font-bold">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-amber-500" />
                  <span>{vnd.rating}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${vnd.status === 'Active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : vnd.status === 'Under Review' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                  {vnd.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 2: PURCHASE REQUISITIONS */}
        {currentTab === 'requisitions' && renderTable(
          ['Req ID', 'Date', 'Department', 'Item Requested', 'Qty', 'Est. Value', 'Status'],
          requisitionsData,
          (req) => (
            <tr key={req.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono text-xs">{req.id}</td>
              <td className="px-6 py-4">{req.date}</td>
              <td className="px-6 py-4 font-semibold">{req.department}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{req.item}</td>
              <td className="px-6 py-4 font-mono">{req.qty}</td>
              <td className="px-6 py-4 font-mono font-bold text-[var(--text-primary)]">{req.estValue}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${req.status === 'Approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : req.status === 'Pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                  {req.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 3: PURCHASE ORDERS */}
        {currentTab === 'orders' && renderTable(
          ['PO Number', 'Vendor', 'Issue Date', 'Expected By', 'Amount', 'Status'],
          purchaseOrders,
          (po) => (
            <tr key={po.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{po.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{po.vendor}</td>
              <td className="px-6 py-4">{po.date}</td>
              <td className="px-6 py-4">{po.expected}</td>
              <td className="px-6 py-4 font-mono font-bold text-[var(--text-primary)]">{po.amount}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${po.status === 'Approved' || po.status === 'Fulfilled' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : po.status === 'Pending Approval' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-slate-500/10 border-slate-500/20 text-slate-400'}`}>
                  {po.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 4: VENDOR QUOTATIONS */}
        {currentTab === 'quotations' && renderTable(
          ['Quote ID', 'RFQ Ref', 'Vendor', 'Date', 'Amount', 'Validity', 'Status'],
          quotationsData,
          (qt) => (
            <tr key={qt.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold">{qt.id}</td>
              <td className="px-6 py-4 font-mono text-xs text-[var(--text-muted)]">{qt.rfqRef}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{qt.vendor}</td>
              <td className="px-6 py-4">{qt.date}</td>
              <td className="px-6 py-4 font-mono font-bold text-[var(--text-primary)]">{qt.amount}</td>
              <td className="px-6 py-4">{qt.validity}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${qt.status === 'Shortlisted' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-500'}`}>
                  {qt.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 5: VENDOR COMPARISON */}
        {currentTab === 'comparison' && (
          <div className="space-y-6 animate-fade-in text-left p-2 h-full overflow-y-auto">
            <div>
              <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block mb-3">RFQ-102 Vendor Quotations Side-by-Side comparison</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { name: 'Techtronics Inc.', price: '$42,000.00', leadTime: '5 Days', moq: '10 units', rating: '4.8/5.0', recommended: true },
                { name: 'Hardware Solutions', price: '$44,500.00', leadTime: '3 Days', moq: '1 unit', rating: '4.0/5.0', recommended: false },
                { name: 'Global Supply Co.', price: '$46,100.00', leadTime: '7 Days', moq: '50 units', rating: '4.5/5.0', recommended: false }
              ].map((vend, idx) => (
                <div key={idx} className={`border rounded-2xl p-5 space-y-4 relative flex flex-col justify-between ${
                  vend.recommended ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-[var(--bg-secondary)] border-[var(--border-color)]'
                }`}>
                  {vend.recommended && (
                    <span className="absolute top-4 right-4 bg-indigo-600 text-white font-bold text-[8px] px-2 py-0.5 rounded-full flex items-center gap-1 uppercase">
                      <CheckCircle className="w-3 h-3" /> Recommended
                    </span>
                  )}
                  
                  <div className="space-y-1">
                    <span className="font-bold text-sm text-[var(--text-primary)] block mt-2">{vend.name}</span>
                    <span className="text-xl font-black text-indigo-400 font-mono block mt-1">{vend.price}</span>
                  </div>

                  <div className="border-t border-[var(--border-color)] pt-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Lead Delivery Time</span>
                      <span className="font-bold text-[var(--text-primary)]">{vend.leadTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Minimum Order (MOQ)</span>
                      <span className="font-bold text-[var(--text-primary)]">{vend.moq}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Supplier Rating</span>
                      <span className="font-bold text-amber-500">{vend.rating}</span>
                    </div>
                  </div>

                  <button className={`w-full py-1.5 font-bold rounded-lg text-xs transition-colors cursor-pointer mt-4 ${
                    vend.recommended ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow' : 'border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                  }`}>
                    Approve Supplier Bid
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 6: SUPPLIER PAYMENTS */}
        {currentTab === 'payments' && renderTable(
          ['Payment ID', 'PO Ref', 'Vendor', 'Due Date', 'Amount', 'Method', 'Status'],
          paymentsData,
          (pay) => (
            <tr key={pay.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{pay.id}</td>
              <td className="px-6 py-4 font-mono text-xs text-[var(--text-muted)]">{pay.poRef}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{pay.vendor}</td>
              <td className="px-6 py-4">{pay.dueDate}</td>
              <td className="px-6 py-4 font-mono font-bold text-[var(--text-primary)]">{pay.amount}</td>
              <td className="px-6 py-4">{pay.method}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${pay.status === 'Paid' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}`}>
                  {pay.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 7: APPROVAL WORKFLOWS */}
        {currentTab === 'approvals' && (
          <div className="space-y-6 animate-fade-in text-left p-2 h-full overflow-y-auto text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Approval thresholds settings */}
              <div className="border border-[var(--border-color)] bg-[var(--bg-tertiary)]/10 rounded-2xl p-5 space-y-4">
                <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block border-b border-[var(--border-color)] pb-2">Procurement Approval Policy Rules</span>
                
                <div className="space-y-3">
                  {[
                    { tier: 'Tier 1 Approval (Departmental)', rule: 'Required for POs < $2,000', role: 'Department HOD' },
                    { tier: 'Tier 2 Approval (Executive)', rule: 'Required for POs between $2,000 - $10,000', role: 'Procurement Manager' },
                    { tier: 'Tier 3 Approval (Corporate)', rule: 'Required for POs > $10,000', role: 'Executive CFO' }
                  ].map((tier, idx) => (
                    <div key={idx} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-3 rounded-xl flex justify-between items-center">
                      <div>
                        <span className="font-bold text-[var(--text-primary)] block">{tier.tier}</span>
                        <span className="text-[9px] text-[var(--text-secondary)] block mt-0.5">{tier.rule}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-bold rounded">{tier.role}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending authorization workflow lists */}
              <div className="border border-[var(--border-color)] bg-[var(--bg-tertiary)]/20 rounded-2xl p-4 flex flex-col h-full space-y-3">
                <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block border-b border-[var(--border-color)] pb-2">POs Pending Corporate Approval Sign-off</span>
                
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[250px] custom-scrollbar">
                  {purchaseOrders.filter(po => po.status === 'Pending Approval').map(po => (
                    <div key={po.id} className="flex justify-between items-center p-3 border border-amber-500/25 bg-amber-500/5 rounded-xl">
                      <div>
                        <span className="font-mono font-bold text-amber-500">{po.id}</span>
                        <span className="text-[9px] text-[var(--text-secondary)] block mt-0.5">Supplier: {po.vendor}</span>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <span className="font-mono font-bold text-[var(--text-primary)] mr-2">{po.amount}</span>
                        <button 
                          onClick={() => showToast(`Purchase Order ${po.id} approved successfully`, 'success')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[9px] cursor-pointer shadow transition-colors"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 8: REORDER AUTOMATION */}
        {currentTab === 'reorder' && (
          <div className="space-y-6 animate-fade-in text-left p-2 h-full overflow-y-auto text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-[var(--border-color)] bg-[var(--bg-tertiary)]/10 rounded-2xl p-5 space-y-4">
                <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Safety stock limit triggers</span>
                
                <div className="space-y-3">
                  {Object.entries(reorderRules).map(([sku, rule]) => (
                    <div key={sku} className="flex justify-between items-center bg-[var(--bg-secondary)] border border-[var(--border-color)] p-3 rounded-xl">
                      <div>
                        <span className="font-bold text-[var(--text-primary)]">Product SKU: {sku}</span>
                        <span className="text-[9px] text-[var(--text-secondary)] block mt-0.5">Reorder Limit: {rule.minStock} units</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-bold rounded uppercase">
                          {rule.status}
                        </span>
                        <button 
                          onClick={() => {
                            const val = prompt(`Change reorder point for ${sku}:`, rule.minStock.toString());
                            if (val && parseInt(val) > 0) {
                              setReorderRules(prev => ({ ...prev, [sku]: { ...prev[sku], minStock: parseInt(val) } }));
                              showToast(`Reorder threshold for ${sku} updated`, 'success');
                            }
                          }}
                          className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 font-bold rounded cursor-pointer"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Automatic order drafts */}
              <div className="border border-[var(--border-color)] bg-[var(--bg-tertiary)]/20 rounded-2xl p-4 space-y-3 flex flex-col h-full">
                <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block border-b border-[var(--border-color)] pb-2">Automated PO Draft Actions</span>
                
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[var(--text-secondary)]">
                  <ShieldAlert className="w-8 h-8 text-emerald-500/80 mb-2 animate-pulse" />
                  <p className="font-bold">Automated Reorder Pipeline Stable</p>
                  <p className="text-[10px] text-[var(--text-muted)] max-w-xs mt-1">
                    No active products are currently below reorder thresholds. POs will be drafted automatically upon safety trigger.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 9: GRN INTEGRATION */}
        {currentTab === 'grn' && renderTable(
          ['PO Link ID', 'GRN Number', 'Product Item', 'Ordered PO Qty', 'Received GRN Qty', 'Inspected Gate Accepted', 'Quality Matching Status'],
          grnMatchingData,
          (row, i) => (
            <tr key={i} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{row.poId}</td>
              <td className="px-6 py-4 font-mono font-semibold">{row.grnId}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{row.product}</td>
              <td className="px-6 py-4 font-mono">{row.poQty}</td>
              <td className="px-6 py-4 font-mono">{row.receivedQty}</td>
              <td className="px-6 py-4 font-mono text-emerald-400 font-bold">{row.acceptedQty} units</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                  row.status === 'Perfect Match' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                  {row.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 10: PO PDF GENERATION */}
        {currentTab === 'po_pdf' && (
          <div className="space-y-6 animate-fade-in text-left p-2 h-full overflow-y-auto text-xs">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              
              {/* Document selector panel */}
              <div className="lg:col-span-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)]/10 rounded-2xl p-4 space-y-4">
                <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Select Purchase Order Document</span>
                
                <div className="space-y-2">
                  {purchaseOrders.map((po) => (
                    <button
                      key={po.id}
                      onClick={() => setSelectedPOForPdf(po.id)}
                      className={`w-full p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        selectedPOForPdf === po.id ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 font-semibold shadow' : 'border-[var(--border-color)] bg-[var(--bg-primary)]/20 hover:bg-[var(--bg-tertiary)]/50 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span className="font-mono text-[9px] font-bold text-[var(--text-muted)] block">{po.id}</span>
                      <span className="text-xs block mt-0.5">{po.vendor}</span>
                      <div className="flex justify-between mt-2 text-[10px]">
                        <span>Issued: {po.date}</span>
                        <span className="font-bold text-[var(--text-primary)]">{po.amount}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* PO Sheet Preview */}
              <div className="lg:col-span-3 border border-[var(--border-color)] bg-[var(--bg-tertiary)]/20 p-6 rounded-2xl">
                <div className="border border-gray-300 bg-white text-black p-6 rounded-xl space-y-4 font-mono select-none shadow">
                  <div className="border-b border-gray-300 pb-3 text-center space-y-1">
                    <span className="text-xs font-bold font-sans block uppercase tracking-wide">MANUAL ENTERPRISE ERP</span>
                    <span className="text-[8px] text-gray-500 block">OFFICIAL PURCHASE ORDER DOCUMENT</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[9px] text-gray-600">
                    <div>
                      <span className="block font-bold">SUPPLIER INVOICE TO:</span>
                      <p className="mt-0.5">{purchaseOrders.find(p => p.id === selectedPOForPdf)?.vendor || 'Techtronics Inc.'}</p>
                      <p>Silicon Valley Industrial Zone</p>
                    </div>
                    <div className="text-right">
                      <span className="block font-bold">PO REF: {selectedPOForPdf}</span>
                      <p className="mt-0.5">Date: {purchaseOrders.find(p => p.id === selectedPOForPdf)?.date}</p>
                      <p>Expected: {purchaseOrders.find(p => p.id === selectedPOForPdf)?.expected}</p>
                    </div>
                  </div>

                  <div className="border-t border-b border-gray-300 py-2 text-[9px] space-y-2">
                    <div className="flex justify-between font-bold border-b border-gray-300 pb-1">
                      <span>Product Description Item</span>
                      <span>Total Value</span>
                    </div>
                    <div className="flex justify-between">
                      <span>[POC-992] Premium Office Chairs (Lot of 100)</span>
                      <span className="font-bold">{purchaseOrders.find(p => p.id === selectedPOForPdf)?.amount}</span>
                    </div>
                  </div>

                  <div className="flex justify-between text-[10px] font-bold font-sans">
                    <span>GRAND TOTAL PROCUREMENT</span>
                    <span>{purchaseOrders.find(p => p.id === selectedPOForPdf)?.amount}</span>
                  </div>

                  <div className="pt-4 flex justify-between text-[8px] border-t border-gray-300 text-gray-500 font-sans font-bold">
                    <span>ISSUED BY: PROC. DEP</span>
                    <span>STAMP & SIGNATURE</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 11: EMAIL PO SENDING */}
        {currentTab === 'email_po' && (
          <div className="space-y-6 animate-fade-in text-left p-2 h-full overflow-y-auto text-xs">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              
              {/* Mail Dispatch Editor */}
              <div className="lg:col-span-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)]/10 rounded-2xl p-5 space-y-4">
                <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">PO Mail Dispatch Composer</span>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Select Supplier Email</label>
                    <select
                      value={emailPOConfig.recipient}
                      onChange={(e) => setEmailPOConfig({ ...emailPOConfig, recipient: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none"
                    >
                      {vendorsData.map(v => <option key={v.id} value={v.email}>{v.name} ({v.email})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Subject</label>
                    <input
                      type="text"
                      value={emailPOConfig.subject}
                      onChange={(e) => setEmailPOConfig({ ...emailPOConfig, subject: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-sans"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSendEmail}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Mail className="w-4 h-4" /> Dispatch PO via Integrated Mail
                </button>
              </div>

              {/* Email Queue History logs */}
              <div className="lg:col-span-3 border border-[var(--border-color)] bg-[var(--bg-tertiary)]/20 rounded-2xl overflow-hidden flex flex-col">
                <div className="px-4 py-3 bg-[var(--bg-tertiary)]/60 border-b border-[var(--border-color)]">
                  <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Supplier PO Dispatch Emails Ledger</span>
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-bold bg-[var(--bg-tertiary)]/10">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Recipient</th>
                        <th className="py-2.5 px-3">Subject / Document</th>
                        <th className="py-2.5 px-3 text-center">Filing Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emailHistoryData.map((row, i) => (
                        <tr key={i} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-primary)]/50 transition-colors">
                          <td className="py-3 px-3 font-mono">{row.date}</td>
                          <td className="py-3 px-3 font-bold text-[var(--text-primary)]">{row.recipient}</td>
                          <td className="py-3 px-3 font-medium text-[var(--text-secondary)]">{row.subject}</td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold rounded uppercase">
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ==========================================
          MODALS CORE DRAWERS
          ========================================== */}

      {/* Requisition modal */}
      {showRequisitionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveRequisition} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowRequisitionModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <FileText className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Create Purchase Requisition</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Item Requested / Description</label>
                <input type="text" placeholder="e.g. MacBook Pro M3" value={newRequisition.item} onChange={(e) => setNewRequisition({ ...newRequisition, item: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Department</label>
                  <select value={newRequisition.dept} onChange={(e) => setNewRequisition({ ...newRequisition, dept: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-2 text-[11px] text-[var(--text-primary)] focus:outline-none">
                    <option value="Engineering">Engineering</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Quantity</label>
                  <input type="number" placeholder="5" value={newRequisition.qty} onChange={(e) => setNewRequisition({ ...newRequisition, qty: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Est. Value ($)</label>
                  <input type="text" placeholder="12500" value={newRequisition.est} onChange={(e) => setNewRequisition({ ...newRequisition, est: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowRequisitionModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Log Requisition</button>
            </div>
          </form>
        </div>
      )}

      {/* PO modal */}
      {showPOModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSavePO} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowPOModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <Receipt className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Draft Purchase Order</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Select Supplier Vendor</label>
                <select value={newPO.vendor} onChange={(e) => setNewPO({ ...newPO, vendor: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                  <option value="">-- Choose Vendor --</option>
                  {vendorsData.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">PO Date</label>
                  <input type="date" defaultValue={new Date().toISOString().split('T')[0]} value={newPO.date} onChange={(e) => setNewPO({ ...newPO, date: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Total Amount ($)</label>
                  <input type="text" placeholder="e.g. 45200" value={newPO.amount} onChange={(e) => setNewPO({ ...newPO, amount: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowPOModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Draft PO</button>
            </div>
          </form>
        </div>
      )}

      {/* Quote modal */}
      {showQuoteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveQuote} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowQuoteModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Record Supplier RFQ Quotation</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Select Supplier Vendor</label>
                <select value={newQuote.vendor} onChange={(e) => setNewQuote({ ...newQuote, vendor: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                  <option value="">-- Choose Vendor --</option>
                  {vendorsData.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Quote Total Amount ($)</label>
                  <input type="text" placeholder="e.g. 42000" value={newQuote.amount} onChange={(e) => setNewQuote({ ...newQuote, amount: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Quote Validity Term</label>
                  <select value={newQuote.validity} onChange={(e) => setNewQuote({ ...newQuote, validity: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                    <option value="15 Days">15 Days</option>
                    <option value="30 Days">30 Days</option>
                    <option value="60 Days">60 Days</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowQuoteModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Save Bid Quote</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default PurchaseProcurement;
