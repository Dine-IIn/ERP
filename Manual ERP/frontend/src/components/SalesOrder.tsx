import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Users, FileText, Receipt, 
  CreditCard, BarChart3, Plus, Search, Filter, Download, ArrowUpRight, 
  Package, Truck, ArrowLeftRight, CheckCircle2, CircleDollarSign, MoreHorizontal,
  Mail, Percent, Tag, ArrowDownRight, Printer, AlertTriangle, ShieldCheck
} from 'lucide-react';

interface Props {
  activeTab?: string;
  user: any;
  token?: string;
  backendUrl?: string;
}

const SalesOrder: React.FC<Props> = ({ user: _user, activeTab, token, backendUrl }) => {
  const mapping: Record<string, string> = {
    'SALES_QUOTATIONS': 'quotations',
    'SALES_ORDERS': 'orders',
    'SALES_INVOICING': 'invoices',
    'SALES_TAX_CALC': 'tax',
    'SALES_PRICING': 'pricing',
    'SALES_DISCOUNT': 'discount',
    'SALES_RETURNS': 'returns',
    'SALES_CREDIT_NOTES': 'credit',
    'SALES_DELIVERY': 'delivery',
    'SALES_PAYMENTS': 'payments',
    'SALES_INVOICE_PDF': 'invoice_pdf',
    'SALES_EMAIL_INVOICES': 'email_invoices',
    'SALES_STATEMENTS': 'statements',
    'SALES_ANALYTICS': 'dashboard'
  };

  const currentTab = (activeTab && mapping[activeTab]) ? mapping[activeTab] : 'dashboard';
  const [searchQuery, setSearchQuery] = useState('');

  // Interactive UI modals/controls states
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Forms states
  const [newQuote, setNewQuote] = useState({ customer: '', amount: '', validity: '30 Days' });
  const [newOrder, setNewOrder] = useState({ customer: '', amount: '', status: 'Processing' });
  const [newInvoice, setNewInvoice] = useState({ orderId: '', customer: '', amount: '', dueDate: '' });
  const [newDiscount, setNewDiscount] = useState({ code: '', rate: '', minVal: '' });
  const [emailConfig, setEmailConfig] = useState({ recipient: 'billing@acme.com', subject: 'Tax Invoice INV-2026-441 Attached', template: 'INV_DEFAULT' });
  const [selectedInvoiceForPdf, setSelectedInvoiceForPdf] = useState<string>('INV-2026-441');

  // Interactive Tax Calculator States
  const [taxCalcInput, setTaxCalcInput] = useState({ amount: '5000', gstSlab: '18', igst: false });
  const [taxCalcResult, setTaxCalcResult] = useState<any>(null);

  // Customer-wise pricing settings
  const [pricingTiers, setPricingTiers] = useState<Record<string, { vip: string; dist: string; retail: string }>>({
    'POC-992': { vip: '$90.00', dist: '$80.00', retail: '$100.00' },
    'ED-104': { vip: '$270.00', dist: '$250.00', retail: '$300.00' },
    'WM-009': { vip: '$12.50', dist: '$11.00', retail: '$15.00' }
  });

  // Toast notifications trigger
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);
  const showToast = (message: string, type: 'success' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- DUMMY DATABASES ---
  const dashboardStats = [
    { title: 'Total Sales (MTD)', val: '$425,820.00', change: '+15% vs last month', isPositive: true, icon: CircleDollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Open Orders', val: '34 orders', change: '-2 active', isPositive: false, icon: Package, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { title: 'Pending Dispatch', val: '12 items', change: '+3 ready', isPositive: true, icon: Truck, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { title: 'Completed Sales', val: '284 tickets', change: '+28 completed', isPositive: true, icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-500/10' }
  ];

  const [salesOrders, setSalesOrders] = useState([
    { id: 'SO-2026-892', customer: 'Acme Corp', date: 'May 22, 2026', amount: '$12,500', status: 'Processing', payment: 'Paid' },
    { id: 'SO-2026-893', customer: 'Stark Industries', date: 'May 23, 2026', amount: '$45,000', status: 'Shipped', payment: 'Pending' },
    { id: 'SO-2026-894', customer: 'Wayne Enterprises', date: 'May 21, 2026', amount: '$8,200', status: 'Delivered', payment: 'Paid' },
    { id: 'SO-2026-895', customer: 'Oscorp', date: 'May 19, 2026', amount: '$104,000', status: 'Draft', payment: 'Unpaid' }
  ]);

  const [quotations, setQuotations] = useState([
    { id: 'QT-2026-101', customer: 'LexCorp', date: 'May 20, 2026', amount: '$5,400', validity: '30 Days', status: 'Sent' },
    { id: 'QT-2026-102', customer: 'Queen Consolidated', date: 'May 21, 2026', amount: '$12,000', validity: '15 Days', status: 'Accepted' },
    { id: 'QT-2026-103', customer: 'Daily Planet', date: 'May 22, 2026', amount: '$1,200', validity: '30 Days', status: 'Rejected' },
  ]);

  const [invoices, setInvoices] = useState([
    { id: 'INV-2026-441', orderId: 'SO-2026-892', customer: 'Acme Corp', amount: '$12,500', dueDate: 'Jun 22, 2026', status: 'Paid' },
    { id: 'INV-2026-442', orderId: 'SO-2026-893', customer: 'Stark Industries', amount: '$45,000', dueDate: 'Jun 23, 2026', status: 'Unpaid' },
    { id: 'INV-2026-443', orderId: 'SO-2026-894', customer: 'Wayne Enterprises', amount: '$8,200', dueDate: 'Jun 21, 2026', status: 'Paid' },
  ]);

  const [returns, setReturns] = useState([
    { id: 'RET-2026-05', orderId: 'SO-2026-880', customer: 'Oscorp', reason: 'Defective item', amount: '$450', status: 'Processing' },
    { id: 'RET-2026-06', orderId: 'SO-2026-871', customer: 'Acme Corp', reason: 'Wrong item shipped', amount: '$1,200', status: 'Completed' },
  ]);

  const [creditNotesData, setCreditNotesData] = useState([
    { id: 'CRN-0992', invRef: 'INV-2026-402', customer: 'Oscorp', issueDate: 'Today', amount: '$450.00', status: 'Approved' },
    { id: 'CRN-0991', invRef: 'INV-2025-110', customer: 'LexCorp', issueDate: 'Yesterday', amount: '$1,200.00', status: 'Credited' }
  ]);

  const [deliverySchedules, setDeliverySchedules] = useState([
    { id: 'DLV-1021', date: 'Today, 2:30 PM', orderId: 'SO-2026-893', customer: 'Stark Industries', carrier: 'FedEx Expedited', status: 'Out for Delivery' },
    { id: 'DLV-1022', date: 'Tomorrow', orderId: 'SO-2026-892', customer: 'Acme Corp', carrier: 'UPS Ground', status: 'Scheduled' }
  ]);

  const [discountCoupons, setDiscountCoupons] = useState([
    { code: 'SUMMER20', rate: '20% Off', minVal: '$1,000', status: 'Active' },
    { code: 'VIPCORP', rate: '15% Off', minVal: '$5,000', status: 'Active' },
    { code: 'WELCOME10', rate: '10% Off', minVal: '$100', status: 'Expired' }
  ]);

  const [emailHistoryData, setEmailHistoryData] = useState([
    { id: 'EML-095', date: 'Today, 4:15 PM', recipient: 'billing@acme.com', subject: 'Tax Invoice INV-2026-441 attached', status: 'Delivered' },
    { id: 'EML-094', date: 'Yesterday', recipient: 'finance@stark.com', subject: 'Billing Statement May 2026', status: 'Sent' }
  ]);

  const [customerStatementsData, setCustomerStatementsData] = useState([
    { customer: 'Acme Corp', invoices: 12, paid: '$112,500.00', balance: '$0.00', status: 'Clear' },
    { customer: 'Stark Industries', invoices: 8, paid: '$450,000.00', balance: '$45,000.00', status: 'Receivables Due' },
    { customer: 'Wayne Enterprises', invoices: 5, paid: '$89,200.00', balance: '$0.00', status: 'Clear' }
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
      console.error(`[Sales API Error] ${endpoint}:`, err);
      return null;
    }
  };

  useEffect(() => {
    if (!token || !backendUrl) return;

    const loadData = async () => {
      try {
        const dbSalesOrders = await apiRequest('/api/store/sal_orders');
        if (dbSalesOrders && dbSalesOrders.length > 0) setSalesOrders(dbSalesOrders);
        else await apiRequest('/api/store/sal_orders/bulk', 'POST', salesOrders);

        const dbQuoting = await apiRequest('/api/store/sal_quotations');
        if (dbQuoting && dbQuoting.length > 0) setQuotations(dbQuoting);
        else await apiRequest('/api/store/sal_quotations/bulk', 'POST', quotations);

        const dbInvoices = await apiRequest('/api/store/sal_invoices');
        if (dbInvoices && dbInvoices.length > 0) setInvoices(dbInvoices);
        else await apiRequest('/api/store/sal_invoices/bulk', 'POST', invoices);

        const dbReturns = await apiRequest('/api/store/sal_returns');
        if (dbReturns && dbReturns.length > 0) setReturns(dbReturns);
        else await apiRequest('/api/store/sal_returns/bulk', 'POST', returns);

        const dbCredits = await apiRequest('/api/store/sal_credits');
        if (dbCredits && dbCredits.length > 0) setCreditNotesData(dbCredits);
        else await apiRequest('/api/store/sal_credits/bulk', 'POST', creditNotesData);

        const dbDlv = await apiRequest('/api/store/sal_delivery');
        if (dbDlv && dbDlv.length > 0) setDeliverySchedules(dbDlv);
        else await apiRequest('/api/store/sal_delivery/bulk', 'POST', deliverySchedules);

        const dbCoupons = await apiRequest('/api/store/sal_coupons');
        if (dbCoupons && dbCoupons.length > 0) setDiscountCoupons(dbCoupons);
        else await apiRequest('/api/store/sal_coupons/bulk', 'POST', discountCoupons);

        const dbEmails = await apiRequest('/api/store/sal_emails');
        if (dbEmails && dbEmails.length > 0) setEmailHistoryData(dbEmails);
        else await apiRequest('/api/store/sal_emails/bulk', 'POST', emailHistoryData);

        const dbStatements = await apiRequest('/api/store/sal_statements');
        if (dbStatements && dbStatements.length > 0) setCustomerStatementsData(dbStatements);
        else await apiRequest('/api/store/sal_statements/bulk', 'POST', customerStatementsData);

        setIsLoaded(true);
      } catch (err) {
        console.error('Error loading Sales data from backend:', err);
        setIsLoaded(true);
      }
    };

    loadData();
  }, [token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/sal_orders/bulk', 'POST', salesOrders);
  }, [salesOrders, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/sal_quotations/bulk', 'POST', quotations);
  }, [quotations, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/sal_invoices/bulk', 'POST', invoices);
  }, [invoices, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/sal_returns/bulk', 'POST', returns);
  }, [returns, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/sal_credits/bulk', 'POST', creditNotesData);
  }, [creditNotesData, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/sal_delivery/bulk', 'POST', deliverySchedules);
  }, [deliverySchedules, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/sal_coupons/bulk', 'POST', discountCoupons);
  }, [discountCoupons, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/sal_emails/bulk', 'POST', emailHistoryData);
  }, [emailHistoryData, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/sal_statements/bulk', 'POST', customerStatementsData);
  }, [customerStatementsData, isLoaded, token, backendUrl]);

  // --- ACTIONS HANDLERS ---
  const handleSaveQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuote.customer || !newQuote.amount) {
      showToast('Please fill all required quotation fields', 'warning');
      return;
    }
    const nextId = `QT-2026-10${quotations.length + 1}`;
    const nQt = {
      id: nextId,
      customer: newQuote.customer,
      date: 'Today',
      amount: `$${Number(newQuote.amount).toLocaleString()}`,
      validity: newQuote.validity,
      status: 'Sent'
    };
    setQuotations([nQt, ...quotations]);
    showToast(`Quotation ${nextId} for ${newQuote.customer} sent successfully`, 'success');
    setShowQuoteModal(false);
    setNewQuote({ customer: '', amount: '', validity: '30 Days' });
  };

  const handleSaveOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.customer || !newOrder.amount) {
      showToast('Please fill all required sales order fields', 'warning');
      return;
    }
    const nextId = `SO-2026-89${salesOrders.length + 1}`;
    const nSo = {
      id: nextId,
      customer: newOrder.customer,
      date: 'Today',
      amount: `$${Number(newOrder.amount).toLocaleString()}`,
      status: 'Processing',
      payment: 'Pending'
    };
    setSalesOrders([nSo, ...salesOrders]);
    showToast(`Sales Order ${nextId} generated successfully`, 'success');
    setShowOrderModal(false);
    setNewOrder({ customer: '', amount: '', status: 'Processing' });
  };

  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvoice.orderId || !newInvoice.customer || !newInvoice.amount) {
      showToast('Please fill all required invoice fields', 'warning');
      return;
    }
    const nextId = `INV-2026-44${invoices.length + 1}`;
    const nInv = {
      id: nextId,
      orderId: newInvoice.orderId,
      customer: newInvoice.customer,
      amount: `$${Number(newInvoice.amount).toLocaleString()}`,
      dueDate: newInvoice.dueDate || 'TBD',
      status: 'Unpaid'
    };
    setInvoices([nInv, ...invoices]);
    showToast(`Tax Invoice ${nextId} generated successfully`, 'success');
    setShowInvoiceModal(false);
    setNewInvoice({ orderId: '', customer: '', amount: '', dueDate: '' });
  };

  const handleSaveDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiscount.code || !newDiscount.rate) {
      showToast('Please fill all required promotion fields', 'warning');
      return;
    }
    const nCou = {
      code: newDiscount.code,
      rate: `${newDiscount.rate}% Off`,
      minVal: newDiscount.minVal ? `$${Number(newDiscount.minVal).toLocaleString()}` : '$100',
      status: 'Active'
    };
    setDiscountCoupons([nCou, ...discountCoupons]);
    showToast(`Discount promo code ${newDiscount.code} activated successfully`, 'success');
    setShowDiscountModal(false);
    setNewDiscount({ code: '', rate: '', minVal: '' });
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const nextId = `EML-09${emailHistoryData.length + 1}`;
    const nEml = {
      id: nextId,
      date: 'Today, 4:15 PM',
      recipient: emailConfig.recipient,
      subject: emailConfig.subject,
      status: 'Delivered'
    };
    setEmailHistoryData([nEml, ...emailHistoryData]);
    showToast(`Invoice PDF document successfully dispatched to ${emailConfig.recipient}`, 'success');
    setShowEmailModal(false);
  };

  const runTaxCalculation = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(taxCalcInput.amount);
    const slab = parseFloat(taxCalcInput.gstSlab);
    if (isNaN(amt) || isNaN(slab)) {
      showToast('Please enter valid numeric tax calculations inputs', 'warning');
      return;
    }
    const taxVal = amt * (slab / 100);
    const total = amt + taxVal;
    
    if (taxCalcInput.igst) {
      setTaxCalcResult({
        base: amt.toFixed(2),
        cgst: '0.00',
        sgst: '0.00',
        igst: taxVal.toFixed(2),
        total: total.toFixed(2)
      });
    } else {
      setTaxCalcResult({
        base: amt.toFixed(2),
        cgst: (taxVal / 2).toFixed(2),
        sgst: (taxVal / 2).toFixed(2),
        igst: '0.00',
        total: total.toFixed(2)
      });
    }
    showToast('Dynamic tax slabs calculated perfectly', 'success');
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
          <h4 className="font-bold text-xs text-[var(--text-primary)] mb-4 font-display">Recent Sales Orders</h4>
          <div className="space-y-3">
            {salesOrders.slice(0,3).map(order => (
              <div key={order.id} className="flex justify-between items-center p-3 bg-[var(--bg-primary)]/40 rounded-xl border border-[var(--border-color)] text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg"><ShoppingBag className="w-4 h-4"/></div>
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">{order.customer}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{order.id} • {order.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[var(--text-primary)]">{order.amount}</p>
                  <span className={`text-[9px] font-bold uppercase border px-1.5 py-0.5 rounded mt-1 inline-block ${
                    order.status === 'Delivered' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 
                    order.status === 'Processing' ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400' : 
                    'bg-slate-500/10 border-slate-500/25 text-slate-400'
                  }`}>{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5">
          <h4 className="font-bold text-xs text-[var(--text-primary)] mb-4 font-display">Recent Quotations RFQ</h4>
          <div className="space-y-3">
            {quotations.slice(0,3).map(qt => (
              <div key={qt.id} className="flex justify-between items-center p-3 bg-[var(--bg-primary)]/40 rounded-xl border border-[var(--border-color)] text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                    <FileText className="w-4 h-4"/>
                  </div>
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">{qt.customer}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{qt.id} • Valid: {qt.validity}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-[var(--text-primary)]">{qt.amount}</span>
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
            <ShoppingBag className="w-6 h-6 text-indigo-500" />
            Sales & Order Management Hub
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Manage customer quotations, sales orders invoicing, taxation slabs, and delivery schedules</p>
        </div>
        <div className="flex gap-2">
          {currentTab === 'quotations' && (
            <button 
              onClick={() => setShowQuoteModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Generate Quotation
            </button>
          )}
          {currentTab === 'orders' && (
            <button 
              onClick={() => setShowOrderModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Sales Order
            </button>
          )}
          {currentTab === 'invoices' && (
            <button 
              onClick={() => setShowInvoiceModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Issue Tax Invoice
            </button>
          )}
          {currentTab === 'discount' && (
            <button 
              onClick={() => setShowDiscountModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Coupon Policy
            </button>
          )}
          {currentTab === 'email_invoices' && (
            <button 
              onClick={() => setShowEmailModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Mail className="w-4 h-4" /> Compose Invoice Dispatch
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {currentTab === 'dashboard' && renderDashboard()}
        
        {/* VIEW 1: SALES ORDERS */}
        {currentTab === 'orders' && renderTable(
          ['Order ID', 'Customer', 'Date', 'Status', 'Payment', 'Amount'],
          salesOrders,
          (order) => (
            <tr key={order.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors group text-xs">
              <td className="px-6 py-4 font-mono text-xs font-bold text-indigo-400">{order.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  {order.customer}
                </div>
              </td>
              <td className="px-6 py-4 font-mono">{order.date}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${order.status === 'Delivered' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : order.status === 'Processing' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-slate-500/10 border-slate-500/20 text-slate-400'}`}>
                  {order.status}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${order.payment === 'Paid' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}`}>
                  {order.payment}
                </span>
              </td>
              <td className="px-6 py-4 text-right font-mono font-bold text-[var(--text-primary)]">{order.amount}</td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><ArrowUpRight className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 2: QUOTATIONS */}
        {currentTab === 'quotations' && renderTable(
          ['Quote ID', 'Customer', 'Date', 'Validity', 'Amount', 'Status'],
          quotations,
          (qt) => (
            <tr key={qt.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono text-xs font-bold">{qt.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{qt.customer}</td>
              <td className="px-6 py-4 font-mono">{qt.date}</td>
              <td className="px-6 py-4 font-mono">{qt.validity}</td>
              <td className="px-6 py-4 font-mono font-bold text-[var(--text-primary)]">{qt.amount}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${qt.status === 'Accepted' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-500'}`}>
                  {qt.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 3: INVOICES GENERATION */}
        {currentTab === 'invoices' && renderTable(
          ['Invoice ID', 'Order ID', 'Customer', 'Due Date', 'Amount', 'Status'],
          invoices,
          (inv) => (
            <tr key={inv.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono text-xs font-bold text-amber-500">{inv.id}</td>
              <td className="px-6 py-4 font-mono text-xs">{inv.orderId}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{inv.customer}</td>
              <td className="px-6 py-4 font-mono">{inv.dueDate}</td>
              <td className="px-6 py-4 font-mono font-bold text-[var(--text-primary)]">{inv.amount}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${inv.status === 'Paid' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                  {inv.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 4: RETURNS & REFUNDS */}
        {currentTab === 'returns' && renderTable(
          ['Return ID', 'Order ID', 'Customer', 'Reason', 'Amount', 'Status'],
          returns,
          (ret) => (
            <tr key={ret.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono text-xs font-bold text-red-500">{ret.id}</td>
              <td className="px-6 py-4 font-mono text-xs">{ret.orderId}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{ret.customer}</td>
              <td className="px-6 py-4 text-xs max-w-[200px] truncate">{ret.reason}</td>
              <td className="px-6 py-4 font-mono font-bold text-[var(--text-primary)]">{ret.amount}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${ret.status === 'Completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'}`}>
                  {ret.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 5: TAX CALCULATIONS */}
        {currentTab === 'tax' && (
          <div className="space-y-6 animate-fade-in text-left p-2 h-full overflow-y-auto text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Calculator Form */}
              <form onSubmit={runTaxCalculation} className="border border-[var(--border-color)] bg-[var(--bg-tertiary)]/10 rounded-2xl p-5 space-y-4">
                <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Order Taxation slabs calculator</span>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Base Order Value ($)</label>
                    <input 
                      type="number" 
                      value={taxCalcInput.amount}
                      onChange={(e) => setTaxCalcInput({ ...taxCalcInput, amount: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">GST Tax Slab Rate (%)</label>
                      <select 
                        value={taxCalcInput.gstSlab}
                        onChange={(e) => setTaxCalcInput({ ...taxCalcInput, gstSlab: e.target.value })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none"
                      >
                        <option value="5">5% GST Slab</option>
                        <option value="12">12% GST Slab</option>
                        <option value="18">18% GST Slab</option>
                        <option value="28">28% GST Slab</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center gap-2 pt-5">
                      <input 
                        type="checkbox" 
                        id="igstCheck"
                        checked={taxCalcInput.igst}
                        onChange={(e) => setTaxCalcInput({ ...taxCalcInput, igst: e.target.checked })}
                        className="w-3.5 h-3.5 bg-gray-900 border-gray-800 rounded"
                      />
                      <label htmlFor="igstCheck" className="text-[10px] font-bold text-[var(--text-secondary)]">Inter-state IGST billing</label>
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs shadow-md transition-colors cursor-pointer"
                >
                  Compute Taxes Allocation
                </button>
              </form>

              {/* Computations result board */}
              <div className="border border-[var(--border-color)] bg-[var(--bg-tertiary)]/20 rounded-2xl p-5 flex flex-col justify-center min-h-[220px]">
                <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block border-b border-[var(--border-color)] pb-2 mb-4 w-full text-center">Taxation breakdown results</span>
                
                {taxCalcResult ? (
                  <div className="space-y-3 font-mono text-[11px] text-[var(--text-secondary)]">
                    <div className="flex justify-between">
                      <span>Base order value:</span>
                      <span className="font-bold text-[var(--text-primary)]">${taxCalcResult.base}</span>
                    </div>
                    <div className="flex justify-between text-indigo-400">
                      <span>Central CGST allocation:</span>
                      <span className="font-bold">${taxCalcResult.cgst}</span>
                    </div>
                    <div className="flex justify-between text-indigo-400">
                      <span>State SGST allocation:</span>
                      <span className="font-bold">${taxCalcResult.sgst}</span>
                    </div>
                    <div className="flex justify-between text-amber-500">
                      <span>Inter-state IGST total:</span>
                      <span className="font-bold">${taxCalcResult.igst}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400 font-bold border-t border-[var(--border-color)] pt-2 text-xs">
                      <span>GRAND INVOICED TOTAL:</span>
                      <span>${taxCalcResult.total}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-xs text-[var(--text-muted)] font-sans">
                    Run a tax computation on the left form to analyze allocations.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 6: CUSTOMER-WISE PRICING TIERS */}
        {currentTab === 'pricing' && (
          <div className="space-y-6 animate-fade-in text-left p-2 h-full overflow-y-auto text-xs">
            <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="px-6 py-4 bg-[var(--bg-tertiary)]/40 border-b border-[var(--border-color)] flex justify-between items-center">
                <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Customer Group Pricing Tiers matrix</span>
                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-bold rounded">ACTIVE</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-bold">
                      <th className="py-2.5 px-6">SKU</th>
                      <th className="py-2.5 px-6">Item description</th>
                      <th className="py-2.5 px-6 text-indigo-400">VIP Corp Slab</th>
                      <th className="py-2.5 px-6 text-emerald-400">Distributor Slab</th>
                      <th className="py-2.5 px-6">Standard Retailer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(pricingTiers).map(([sku, tier], i) => (
                      <tr key={i} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-primary)]/50 transition-colors">
                        <td className="py-3 px-6 font-mono font-bold text-indigo-400">{sku}</td>
                        <td className="py-3 px-6 font-bold text-[var(--text-primary)]">
                          {sku === 'POC-992' ? 'Premium Office Chair' : sku === 'ED-104' ? 'Ergonomic Desk' : 'Wireless Mouse'}
                        </td>
                        <td className="py-3 px-6 font-mono font-semibold text-indigo-400">{tier.vip}</td>
                        <td className="py-3 px-6 font-mono font-semibold text-emerald-400">{tier.dist}</td>
                        <td className="py-3 px-6 font-mono font-semibold text-[var(--text-primary)]">{tier.retail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 7: DISCOUNT SYSTEM */}
        {currentTab === 'discount' && renderTable(
          ['Promo Code', 'Discount Slab', 'Min Order threshold', 'Status'],
          discountCoupons,
          (row, i) => (
            <tr key={i} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{row.code}</td>
              <td className="px-6 py-4 font-black text-emerald-400 font-display">{row.rate}</td>
              <td className="px-6 py-4 font-semibold">{row.minVal}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                  row.status === 'Active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
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

        {/* VIEW 8: CREDIT NOTES */}
        {currentTab === 'credit' && renderTable(
          ['Credit ID', 'Original Invoice Ref', 'Customer Name', 'Issue Date', 'Credit Amount', 'Status'],
          creditNotesData,
          (row, i) => (
            <tr key={i} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{row.id}</td>
              <td className="px-6 py-4 font-mono text-xs text-[var(--text-muted)]">{row.invRef}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{row.customer}</td>
              <td className="px-6 py-4">{row.issueDate}</td>
              <td className="px-6 py-4 font-mono font-bold text-emerald-400">{row.amount}</td>
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

        {/* VIEW 9: DELIVERY SCHEDULING */}
        {currentTab === 'delivery' && renderTable(
          ['Delivery ID', 'Dispatch date', 'Order Ref', 'Customer Name', 'Carrier Method', 'Shipping Status'],
          deliverySchedules,
          (row, i) => (
            <tr key={i} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{row.id}</td>
              <td className="px-6 py-4 font-mono">{row.date}</td>
              <td className="px-6 py-4 font-mono font-semibold">{row.orderId}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{row.customer}</td>
              <td className="px-6 py-4 font-medium text-[var(--text-secondary)]">{row.carrier}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                  row.status === 'Out for Delivery' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
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

        {/* VIEW 10: PAYMENT TRACKING */}
        {currentTab === 'payments' && renderTable(
          ['Invoice ID', 'Order ID', 'Customer', 'Due Date', 'Amount', 'Status'],
          invoices,
          (inv) => (
            <tr key={inv.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-mono text-xs font-bold text-amber-500">{inv.id}</td>
              <td className="px-6 py-4 font-mono text-xs">{inv.orderId}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{inv.customer}</td>
              <td className="px-6 py-4 font-mono">{inv.dueDate}</td>
              <td className="px-6 py-4 font-mono font-bold text-[var(--text-primary)]">{inv.amount}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${inv.status === 'Paid' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                  {inv.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 11: INVOICE PDF GENERATION */}
        {currentTab === 'invoice_pdf' && (
          <div className="space-y-6 animate-fade-in text-left p-2 h-full overflow-y-auto text-xs">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              
              {/* Document selector */}
              <div className="lg:col-span-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)]/10 rounded-2xl p-4 space-y-4">
                <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Select Tax Invoice Document</span>
                
                <div className="space-y-2">
                  {invoices.map((inv) => (
                    <button
                      key={inv.id}
                      onClick={() => setSelectedInvoiceForPdf(inv.id)}
                      className={`w-full p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        selectedInvoiceForPdf === inv.id ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 font-semibold shadow' : 'border-[var(--border-color)] bg-[var(--bg-primary)]/20 hover:bg-[var(--bg-tertiary)]/50 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span className="font-mono text-[9px] font-bold text-amber-500 block">{inv.id}</span>
                      <span className="text-xs block mt-0.5">{inv.customer}</span>
                      <div className="flex justify-between mt-2 text-[10px]">
                        <span>Due: {inv.dueDate}</span>
                        <span className="font-bold text-[var(--text-primary)]">{inv.amount}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Invoice Sheet Preview */}
              <div className="lg:col-span-3 border border-[var(--border-color)] bg-[var(--bg-tertiary)]/20 p-6 rounded-2xl">
                <div className="border border-gray-300 bg-white text-black p-6 rounded-xl space-y-4 font-mono select-none shadow">
                  <div className="border-b border-gray-300 pb-3 text-center space-y-1">
                    <span className="text-xs font-bold font-sans block uppercase tracking-wide">MANUAL ENTERPRISE ERP</span>
                    <span className="text-[8px] text-gray-500 block">OFFICIAL SALES TAX INVOICE DOCUMENT</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[9px] text-gray-600">
                    <div>
                      <span className="block font-bold">CUSTOMER BILLING TO:</span>
                      <p className="mt-0.5">{invoices.find(i => i.id === selectedInvoiceForPdf)?.customer || 'Acme Corp'}</p>
                      <p>Corporate Headquarters Zone</p>
                    </div>
                    <div className="text-right">
                      <span className="block font-bold font-sans text-amber-500">INVOICE REF: {selectedInvoiceForPdf}</span>
                      <p className="mt-0.5">Order Ref: {invoices.find(i => i.id === selectedInvoiceForPdf)?.orderId}</p>
                      <p>Due Date: {invoices.find(i => i.id === selectedInvoiceForPdf)?.dueDate}</p>
                    </div>
                  </div>

                  <div className="border-t border-b border-gray-300 py-2 text-[9px] space-y-2">
                    <div className="flex justify-between font-bold border-b border-gray-300 pb-1">
                      <span>Description particulars Item</span>
                      <span>Total Value</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sales order items package delivery</span>
                      <span className="font-bold">{invoices.find(i => i.id === selectedInvoiceForPdf)?.amount}</span>
                    </div>
                  </div>

                  <div className="flex justify-between text-xs font-bold font-sans">
                    <span>GRAND INVOICED TOTAL</span>
                    <span>{invoices.find(i => i.id === selectedInvoiceForPdf)?.amount}</span>
                  </div>

                  <div className="pt-4 flex justify-between text-[8px] border-t border-gray-300 text-gray-500 font-sans font-bold">
                    <span>PREPARED BY: SALES DEP</span>
                    <span>OFFICIAL STAMP SEAL</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 12: EMAIL INVOICING */}
        {currentTab === 'email_invoices' && (
          <div className="space-y-6 animate-fade-in text-left p-2 h-full overflow-y-auto text-xs">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              
              {/* Mail Composer Form */}
              <div className="lg:col-span-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)]/10 rounded-2xl p-5 space-y-4">
                <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Invoice Mail Dispatch Composer</span>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Select Customer Email</label>
                    <select
                      value={emailConfig.recipient}
                      onChange={(e) => setEmailConfig({ ...emailConfig, recipient: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none"
                    >
                      <option value="billing@acme.com">Acme Corp (billing@acme.com)</option>
                      <option value="finance@stark.com">Stark Industries (finance@stark.com)</option>
                      <option value="accounts@wayne.com">Wayne Enterprises (accounts@wayne.com)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Subject</label>
                    <input
                      type="text"
                      value={emailConfig.subject}
                      onChange={(e) => setEmailConfig({ ...emailConfig, subject: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-sans"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSendEmail}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Mail className="w-4 h-4" /> Dispatch Invoice via Mail
                </button>
              </div>

              {/* Email Queue history logs */}
              <div className="lg:col-span-3 border border-[var(--border-color)] bg-[var(--bg-tertiary)]/20 rounded-2xl overflow-hidden flex flex-col">
                <div className="px-4 py-3 bg-[var(--bg-tertiary)]/60 border-b border-[var(--border-color)]">
                  <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-widest uppercase block">Customer Invoicing Emails Ledger</span>
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

        {/* VIEW 12: CUSTOMER STATEMENTS */}
        {currentTab === 'statements' && renderTable(
          ['Customer Account Name', 'Total Issued Invoices', 'Accumulated Paid Received', 'Current Outstanding Receivables', 'Ledger Status Check'],
          customerStatementsData,
          (row, i) => (
            <tr key={i} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{row.customer}</td>
              <td className="px-6 py-4 font-mono font-semibold">{row.invoices} invoices</td>
              <td className="px-6 py-4 font-mono text-emerald-400 font-bold">{row.paid}</td>
              <td className="px-6 py-4 font-mono text-amber-500 font-bold">{row.balance}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                  row.status === 'Clear' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse'
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

      </div>

      {/* ==========================================
          MODALS CORE DRAWERS
          ========================================== */}

      {/* Quotation modal */}
      {showQuoteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveQuote} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowQuoteModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <FileText className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Generate Customer Quotation</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Customer Account</label>
                <select value={newQuote.customer} onChange={(e) => setNewQuote({ ...newQuote, customer: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                  <option value="">-- Select Customer --</option>
                  <option value="Acme Corp">Acme Corp</option>
                  <option value="Stark Industries">Stark Industries</option>
                  <option value="Wayne Enterprises">Wayne Enterprises</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Quote Total Amount ($)</label>
                  <input type="text" placeholder="e.g. 5400" value={newQuote.amount} onChange={(e) => setNewQuote({ ...newQuote, amount: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
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
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Save Quotation</button>
            </div>
          </form>
        </div>
      )}

      {/* Order modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveOrder} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowOrderModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <ShoppingBag className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Create Sales Order</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Customer Account</label>
                <select value={newOrder.customer} onChange={(e) => setNewOrder({ ...newOrder, customer: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                  <option value="">-- Select Customer --</option>
                  <option value="Acme Corp">Acme Corp</option>
                  <option value="Stark Industries">Stark Industries</option>
                  <option value="Wayne Enterprises">Wayne Enterprises</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Order Amount ($)</label>
                  <input type="text" placeholder="e.g. 12500" value={newOrder.amount} onChange={(e) => setNewOrder({ ...newOrder, amount: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Pipeline Status</label>
                  <select value={newOrder.status} onChange={(e) => setNewOrder({ ...newOrder, status: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                    <option value="Processing">Processing</option>
                    <option value="Draft">Draft Mode</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowOrderModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Log Sales Order</button>
            </div>
          </form>
        </div>
      )}

      {/* Invoice modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveInvoice} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowInvoiceModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <Receipt className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Issue Tax Invoice</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Select Source Sales Order</label>
                <select value={newInvoice.orderId} onChange={(e) => setNewInvoice({ ...newInvoice, orderId: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                  <option value="">-- Choose Order ID --</option>
                  {salesOrders.map(o => <option key={o.id} value={o.id}>[{o.id}] {o.customer}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Billing Customer</label>
                  <input type="text" placeholder="Customer Name" value={newInvoice.customer} onChange={(e) => setNewInvoice({ ...newInvoice, customer: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Due Date</label>
                  <input type="date" value={newInvoice.dueDate} onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Invoice Value Amount ($)</label>
                <input type="text" placeholder="e.g. 12500" value={newInvoice.amount} onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowInvoiceModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Issue Invoice</button>
            </div>
          </form>
        </div>
      )}

      {/* Discount modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveDiscount} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowDiscountModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <Percent className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Create Promotion Policy</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Coupon Code (Unique Key)</label>
                <input type="text" placeholder="e.g. WINTER50" value={newDiscount.code} onChange={(e) => setNewDiscount({ ...newDiscount, code: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Discount Rate (e.g. 15%)</label>
                  <input type="text" placeholder="e.g. 15% Off" value={newDiscount.rate} onChange={(e) => setNewDiscount({ ...newDiscount, rate: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Min Order Threshold ($)</label>
                  <input type="text" placeholder="e.g. 500" value={newDiscount.minVal} onChange={(e) => setNewDiscount({ ...newDiscount, minVal: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowDiscountModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Activate Policy</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default SalesOrder;
