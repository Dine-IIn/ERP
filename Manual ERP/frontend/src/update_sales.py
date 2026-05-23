import os

sales_content = """import React, { useState } from 'react';
import { 
  ShoppingBag, Users, FileText, Receipt, 
  CreditCard, BarChart3, Plus, Search, Filter, Download, ArrowUpRight, 
  Package, Truck, ArrowLeftRight, CheckCircle2, CircleDollarSign, MoreHorizontal
} from 'lucide-react';

interface Props {
  activeTab?: string;
  user: any;
}

const SalesOrder: React.FC<Props> = ({ user, activeTab }) => {
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
    'SALES_STATEMENTS': 'statements',
    'SALES_ANALYTICS': 'dashboard'
  };
  const currentTab = (activeTab && mapping[activeTab]) ? mapping[activeTab] : 'dashboard';
  const [searchQuery, setSearchQuery] = useState('');

  // --- DUMMY DATA ---
  const dashboardStats = [
    { title: 'Total Sales (MTD)', val: '$425k', change: '+15%', isPositive: true, icon: CircleDollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Open Orders', val: '34', change: '-2', isPositive: false, icon: Package, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { title: 'Pending Dispatch', val: '12', change: '+3', isPositive: true, icon: Truck, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { title: 'Completed Sales', val: '284', change: '+28', isPositive: true, icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-500/10' }
  ];

  const salesOrders = [
    { id: 'SO-2026-892', customer: 'Acme Corp', date: 'May 22, 2026', amount: '$12,500', status: 'Processing', payment: 'Paid' },
    { id: 'SO-2026-893', customer: 'Stark Industries', date: 'May 23, 2026', amount: '$45,000', status: 'Shipped', payment: 'Pending' },
    { id: 'SO-2026-894', customer: 'Wayne Enterprises', date: 'May 21, 2026', amount: '$8,200', status: 'Delivered', payment: 'Paid' },
    { id: 'SO-2026-895', customer: 'Oscorp', date: 'May 19, 2026', amount: '$104,000', status: 'Draft', payment: 'Unpaid' }
  ];

  const quotations = [
    { id: 'QT-2026-101', customer: 'LexCorp', date: 'May 20, 2026', amount: '$5,400', validity: '30 Days', status: 'Sent' },
    { id: 'QT-2026-102', customer: 'Queen Consolidated', date: 'May 21, 2026', amount: '$12,000', validity: '15 Days', status: 'Accepted' },
    { id: 'QT-2026-103', customer: 'Daily Planet', date: 'May 22, 2026', amount: '$1,200', validity: '30 Days', status: 'Rejected' },
  ];

  const invoices = [
    { id: 'INV-2026-441', orderId: 'SO-2026-892', customer: 'Acme Corp', amount: '$12,500', dueDate: 'Jun 22, 2026', status: 'Paid' },
    { id: 'INV-2026-442', orderId: 'SO-2026-893', customer: 'Stark Industries', amount: '$45,000', dueDate: 'Jun 23, 2026', status: 'Unpaid' },
    { id: 'INV-2026-443', orderId: 'SO-2026-894', customer: 'Wayne Enterprises', amount: '$8,200', dueDate: 'Jun 21, 2026', status: 'Paid' },
  ];

  const returns = [
    { id: 'RET-2026-05', orderId: 'SO-2026-880', customer: 'Oscorp', reason: 'Defective item', amount: '$450', status: 'Processing' },
    { id: 'RET-2026-06', orderId: 'SO-2026-871', customer: 'Acme Corp', reason: 'Wrong item shipped', amount: '$1,200', status: 'Completed' },
  ];

  // --- RENDER HELPERS ---
  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in p-2">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {dashboardStats.map((kpi, i) => (
          <div key={i} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5 flex items-center gap-4 hover:border-indigo-500/30 transition-all">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${kpi.bg}`}>
              <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{kpi.title}</p>
              <h4 className="text-2xl font-black text-[var(--text-primary)] font-display mt-0.5">{kpi.val}</h4>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5">
        <h4 className="font-bold text-[var(--text-primary)] mb-4">Recent Sales Orders</h4>
        <div className="space-y-3">
          {salesOrders.slice(0,3).map(order => (
            <div key={order.id} className="flex justify-between items-center p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg"><ShoppingBag className="w-4 h-4"/></div>
                <div>
                  <p className="font-bold text-sm text-[var(--text-primary)]">{order.customer}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{order.id} • {order.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm text-[var(--text-primary)]">{order.amount}</p>
                <span className={`text-[10px] font-bold uppercase ${order.status === 'Delivered' ? 'text-emerald-500' : 'text-indigo-500'}`}>{order.status}</span>
              </div>
            </div>
          ))}
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
            <ShoppingBag className="w-6 h-6 text-indigo-500" />
            Sales & Order Management
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Manage sales orders, invoices, and dispatch</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Order
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {currentTab === 'dashboard' && renderDashboard()}
        
        {currentTab === 'orders' && renderTable(
          ['Order ID', 'Customer', 'Date', 'Status', 'Payment', 'Amount'],
          salesOrders,
          (order) => (
            <tr key={order.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors group">
              <td className="px-6 py-4 font-mono text-xs font-bold text-indigo-400">{order.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  {order.customer}
                </div>
              </td>
              <td className="px-6 py-4">{order.date}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${order.status === 'Delivered' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : order.status === 'Processing' ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' : order.status === 'Draft' ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                  {order.status}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${order.payment === 'Paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : order.payment === 'Pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                  {order.payment}
                </span>
              </td>
              <td className="px-6 py-4 text-right font-bold text-[var(--text-primary)]">{order.amount}</td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1"><ArrowUpRight className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {currentTab === 'quotations' && renderTable(
          ['Quote ID', 'Customer', 'Date', 'Validity', 'Amount', 'Status'],
          quotations,
          (qt) => (
            <tr key={qt.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs font-bold">{qt.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{qt.customer}</td>
              <td className="px-6 py-4 text-xs">{qt.date}</td>
              <td className="px-6 py-4 text-xs">{qt.validity}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{qt.amount}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${qt.status === 'Accepted' ? 'bg-emerald-500/10 text-emerald-500' : qt.status === 'Rejected' ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-500/10 text-blue-500'}`}>
                  {qt.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {currentTab === 'invoices' && renderTable(
          ['Invoice ID', 'Order ID', 'Customer', 'Due Date', 'Amount', 'Status'],
          invoices,
          (inv) => (
            <tr key={inv.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs font-bold text-amber-500">{inv.id}</td>
              <td className="px-6 py-4 font-mono text-xs">{inv.orderId}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{inv.customer}</td>
              <td className="px-6 py-4 text-xs">{inv.dueDate}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{inv.amount}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${inv.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {inv.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {currentTab === 'returns' && renderTable(
          ['Return ID', 'Order ID', 'Customer', 'Reason', 'Amount', 'Status'],
          returns,
          (ret) => (
            <tr key={ret.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs font-bold text-red-500">{ret.id}</td>
              <td className="px-6 py-4 font-mono text-xs">{ret.orderId}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{ret.customer}</td>
              <td className="px-6 py-4 text-sm max-w-[200px] truncate">{ret.reason}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{ret.amount}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${ret.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                  {ret.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {(!['dashboard', 'orders', 'quotations', 'invoices', 'returns'].includes(currentTab)) && (
           <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl animate-fade-in m-2">
            <div className="w-20 h-20 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center mb-6">
              <ShoppingBag className="w-10 h-10 text-[var(--text-muted)]" />
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

export default SalesOrder;
"""

with open(r"d:\ERP\Manual ERP\frontend\src\components\SalesOrder.tsx", "w", encoding="utf-8") as f:
    f.write(sales_content)
print("Sales Order Updated.")
