import os

purchase_content = """import React, { useState } from 'react';
import { 
  ShoppingCart, Users, FileText, FileSpreadsheet, 
  CreditCard, BarChart3, Plus, Search, Filter, Download, ArrowUpRight, 
  Building2, Receipt, Clock, CheckCircle2, MoreHorizontal, ArrowDownRight, Briefcase
} from 'lucide-react';

interface Props {
  activeTab?: string;
  user: any;
}

const PurchaseProcurement: React.FC<Props> = ({ user, activeTab }) => {
  const mapping: Record<string, string> = {
    'PURCHASE_VENDOR_MGT': 'vendors',
    'PURCHASE_REQUISITIONS': 'requisitions',
    'PURCHASE_ORDERS': 'orders',
    'PURCHASE_QUOTATIONS': 'quotations',
    'PURCHASE_COMPARISON': 'comparison',
    'PURCHASE_PAYMENTS': 'payments',
    'PURCHASE_APPROVALS': 'approvals',
    'PURCHASE_REPORTS': 'reports'
  };
  // Note: App.tsx maps 'PURCHASE_ORDERS' to 'orders', but local state originally had 'pos' for Purchase Orders.
  // I will map currentTab exactly. App.tsx passes 'orders'. 
  // Let's standardise the tabs.
  const currentTab = (activeTab && mapping[activeTab]) ? mapping[activeTab] : 'dashboard';
  const [searchQuery, setSearchQuery] = useState('');

  // --- DUMMY DATA ---
  const dashboardStats = [
    { title: 'Total POs this Month', val: '142', change: '+12% vs last month', isPositive: true, icon: Receipt, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { title: 'Pending Approvals', val: '12', change: '-3 since yesterday', isPositive: true, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { title: 'Active Vendors', val: '45', change: '+2 new vendors', isPositive: true, icon: Building2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Completed POs', val: '98', change: '69% fulfillment rate', isPositive: false, icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-500/10' }
  ];

  const vendorsData = [
    { id: 'VND-001', name: 'Techtronics Inc.', category: 'Hardware', contact: 'John Smith', email: 'john@techtronics.com', status: 'Active', rating: '4.8/5' },
    { id: 'VND-002', name: 'Global Supply Co.', category: 'Office Supplies', contact: 'Sarah Connor', email: 'sarah@global.com', status: 'Active', rating: '4.5/5' },
    { id: 'VND-003', name: 'OfficeMax Logistics', category: 'Logistics', contact: 'Mike Tyson', email: 'mike@officemax.com', status: 'Under Review', rating: '3.2/5' },
    { id: 'VND-004', name: 'Hardware Solutions', category: 'Hardware', contact: 'Emma Watson', email: 'emma@hwsol.com', status: 'Inactive', rating: '4.0/5' },
  ];

  const requisitionsData = [
    { id: 'REQ-5021', date: 'Today', department: 'Engineering', item: 'MacBook Pro M3', qty: 5, estValue: '$12,500', status: 'Pending' },
    { id: 'REQ-5022', date: 'Yesterday', department: 'Marketing', item: 'Adobe CC Licenses', qty: 10, estValue: '$800', status: 'Approved' },
    { id: 'REQ-5023', date: 'Oct 20, 2026', department: 'Operations', item: 'Office Chairs', qty: 20, estValue: '$4,000', status: 'Rejected' },
  ];

  const purchaseOrders = [
    { id: 'PO-2026-001', vendor: 'Techtronics Inc.', date: 'May 20, 2026', amount: '$45,200', status: 'Approved', expected: 'May 25, 2026' },
    { id: 'PO-2026-002', vendor: 'Global Supply Co.', date: 'May 21, 2026', amount: '$12,450', status: 'Pending Approval', expected: 'Jun 01, 2026' },
    { id: 'PO-2026-003', vendor: 'OfficeMax Logistics', date: 'May 22, 2026', amount: '$3,200', status: 'Draft', expected: 'TBD' },
    { id: 'PO-2026-004', vendor: 'Hardware Solutions', date: 'May 18, 2026', amount: '$89,000', status: 'Fulfilled', expected: 'Delivered' }
  ];

  const quotationsData = [
    { id: 'QT-991', rfqRef: 'RFQ-102', vendor: 'Techtronics Inc.', date: 'Today', amount: '$42,000', validity: '30 Days', status: 'Received' },
    { id: 'QT-992', rfqRef: 'RFQ-102', vendor: 'Hardware Solutions', date: 'Yesterday', amount: '$44,500', validity: '15 Days', status: 'Shortlisted' },
  ];

  const paymentsData = [
    { id: 'PAY-8812', poRef: 'PO-2026-004', vendor: 'Hardware Solutions', dueDate: 'Jun 15, 2026', amount: '$89,000', method: 'Bank Transfer', status: 'Scheduled' },
    { id: 'PAY-8811', poRef: 'PO-2026-001', vendor: 'Techtronics Inc.', dueDate: 'May 22, 2026', amount: '$45,200', method: 'Credit Card', status: 'Paid' },
  ];

  // --- RENDER HELPERS ---
  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in p-2">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardStats.map((stat, idx) => (
          <div key={idx} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[var(--text-secondary)] text-sm font-semibold">{stat.title}</p>
              <h3 className="text-2xl font-bold text-[var(--text-primary)] mt-1">{stat.val}</h3>
              <div className={`flex items-center text-xs mt-2 font-bold ${stat.isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                {stat.isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                {stat.change}
              </div>
            </div>
            <div className={`w-12 h-12 rounded-full ${stat.bg} flex items-center justify-center`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5">
          <h4 className="font-bold text-[var(--text-primary)] mb-4">Recent Purchase Orders</h4>
          <div className="space-y-3">
            {purchaseOrders.slice(0,4).map(po => (
              <div key={po.id} className="flex justify-between items-center p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                <div>
                  <p className="font-bold text-sm text-[var(--text-primary)]">{po.id}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{po.vendor}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-[var(--text-primary)]">{po.amount}</p>
                  <span className={`text-[10px] font-bold uppercase ${po.status === 'Approved' ? 'text-emerald-500' : po.status === 'Draft' ? 'text-slate-400' : 'text-amber-500'}`}>{po.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5">
          <h4 className="font-bold text-[var(--text-primary)] mb-4">Pending Requisitions</h4>
          <div className="space-y-3">
            {requisitionsData.filter(r => r.status === 'Pending').map(req => (
              <div key={req.id} className="flex justify-between items-center p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                    <FileText className="w-4 h-4"/>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[var(--text-primary)]">{req.item}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{req.department} • Qty: {req.qty}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-[var(--text-primary)]">{req.estValue}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTable = (headers: string[], data: any[], renderRow: (item: any) => React.ReactNode) => (
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
          <button className="p-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <Filter className="w-4 h-4" />
          </button>
          <button className="p-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
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
            {data.map((item, i) => renderRow(item))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto select-none animate-fade-in flex flex-col h-[calc(100vh-80px)] p-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4 mb-4 shrink-0">
        <div>
          <h3 className="font-bold text-xl text-[var(--text-primary)] flex items-center gap-2 font-display">
            <ShoppingCart className="w-6 h-6 text-indigo-500" />
            Purchase & Procurement
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Manage suppliers, POs, and procurement workflows</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Entry
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {currentTab === 'dashboard' && renderDashboard()}
        
        {currentTab === 'vendors' && renderTable(
          ['Vendor ID', 'Vendor Name', 'Category', 'Contact Person', 'Email', 'Rating', 'Status'],
          vendorsData,
          (vnd) => (
            <tr key={vnd.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors group">
              <td className="px-6 py-4 font-mono text-xs">{vnd.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{vnd.name}</td>
              <td className="px-6 py-4">{vnd.category}</td>
              <td className="px-6 py-4">{vnd.contact}</td>
              <td className="px-6 py-4">{vnd.email}</td>
              <td className="px-6 py-4 font-bold text-amber-500">{vnd.rating}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${vnd.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : vnd.status === 'Under Review' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {vnd.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {currentTab === 'requisitions' && renderTable(
          ['Req ID', 'Date', 'Department', 'Item Requested', 'Qty', 'Est. Value', 'Status'],
          requisitionsData,
          (req) => (
            <tr key={req.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs">{req.id}</td>
              <td className="px-6 py-4">{req.date}</td>
              <td className="px-6 py-4">{req.department}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{req.item}</td>
              <td className="px-6 py-4">{req.qty}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{req.estValue}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${req.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' : req.status === 'Pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {req.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {currentTab === 'orders' && renderTable(
          ['PO Number', 'Vendor', 'Issue Date', 'Expected By', 'Amount', 'Status'],
          purchaseOrders,
          (po) => (
            <tr key={po.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs font-bold text-indigo-400">{po.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{po.vendor}</td>
              <td className="px-6 py-4">{po.date}</td>
              <td className="px-6 py-4">{po.expected}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{po.amount}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${po.status === 'Approved' || po.status === 'Fulfilled' ? 'bg-emerald-500/10 text-emerald-500' : po.status === 'Pending Approval' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-400'}`}>
                  {po.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {currentTab === 'quotations' && renderTable(
          ['Quote ID', 'RFQ Ref', 'Vendor', 'Date', 'Amount', 'Validity', 'Status'],
          quotationsData,
          (qt) => (
            <tr key={qt.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs font-bold">{qt.id}</td>
              <td className="px-6 py-4 font-mono text-xs text-[var(--text-muted)]">{qt.rfqRef}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{qt.vendor}</td>
              <td className="px-6 py-4">{qt.date}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{qt.amount}</td>
              <td className="px-6 py-4">{qt.validity}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${qt.status === 'Shortlisted' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                  {qt.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {currentTab === 'payments' && renderTable(
          ['Payment ID', 'PO Ref', 'Vendor', 'Due Date', 'Amount', 'Method', 'Status'],
          paymentsData,
          (pay) => (
            <tr key={pay.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs font-bold">{pay.id}</td>
              <td className="px-6 py-4 font-mono text-xs text-[var(--text-muted)]">{pay.poRef}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{pay.vendor}</td>
              <td className="px-6 py-4">{pay.dueDate}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{pay.amount}</td>
              <td className="px-6 py-4">{pay.method}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${pay.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  {pay.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {(!['dashboard', 'vendors', 'requisitions', 'orders', 'quotations', 'payments'].includes(currentTab)) && (
           <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl animate-fade-in m-2">
            <div className="w-20 h-20 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center mb-6">
              <FileSpreadsheet className="w-10 h-10 text-[var(--text-muted)]" />
            </div>
            <h4 className="text-xl font-bold text-[var(--text-primary)] mb-2 font-display">
              Under Construction
            </h4>
            <p className="text-[var(--text-secondary)] max-w-md">
              Data tables for {currentTab} will be rendered here.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default PurchaseProcurement;
"""

with open(r"d:\ERP\Manual ERP\frontend\src\components\PurchaseProcurement.tsx", "w", encoding="utf-8") as f:
    f.write(purchase_content)
print("Purchase Module Updated.")
