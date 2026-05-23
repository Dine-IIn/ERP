import os

file_path = "d:\\ERP\\Manual ERP\\frontend\\src\\components\\InventoryWarehouse.tsx"

content = """import React, { useState } from 'react';
import { 
  Box, MapPin, ArrowRightLeft, SlidersHorizontal, FileText, 
  Truck, BarChart3, Plus, Search, Filter, Download, ArrowUpRight, 
  Package, AlertTriangle, Layers, QrCode, ShieldCheck
} from 'lucide-react';

interface Props {
  user: any;
}

const InventoryWarehouse: React.FC<Props> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('ledger');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    { id: 'ledger', label: 'Stock Ledger', icon: Box },
    { id: 'locations', label: 'Locations & Bins', icon: MapPin },
    { id: 'transfers', label: 'Stock Transfers', icon: ArrowRightLeft },
    { id: 'adjustments', label: 'Adjustments', icon: SlidersHorizontal },
    { id: 'grn', label: 'Goods Receipt (GRN)', icon: FileText },
    { id: 'dispatch', label: 'Dispatch', icon: Truck },
    { id: 'reports', label: 'Reports & Alerts', icon: BarChart3 }
  ];

  // Dummy data
  const stockItems = [
    { id: 'STK-001', name: 'Premium Office Chair', sku: 'POC-992', warehouse: 'Main Hub', qty: 245, minStock: 50, status: 'Healthy', val: '$24,500' },
    { id: 'STK-002', name: 'Ergonomic Desk', sku: 'ED-104', warehouse: 'Main Hub', qty: 12, minStock: 20, status: 'Low Stock', val: '$3,600' },
    { id: 'STK-003', name: 'Wireless Mouse', sku: 'WM-009', warehouse: 'East Wing', qty: 890, minStock: 100, status: 'Healthy', val: '$13,350' },
    { id: 'STK-004', name: 'Mechanical Keyboard', sku: 'MK-111', warehouse: 'West Wing', qty: 0, minStock: 30, status: 'Out of Stock', val: '$0' }
  ];

  return (
    <div className="max-w-6xl mx-auto select-none animate-fade-in flex flex-col h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4 mb-4">
        <div>
          <h3 className="font-bold text-xl text-[var(--text-primary)] flex items-center gap-2 font-display">
            <Box className="w-6 h-6 text-indigo-500" />
            Inventory & Warehouse
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Manage stock tracking, locations, and movements</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Entry
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar border-b border-[var(--border-color)] mb-6">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-semibold text-sm transition-colors whitespace-nowrap ${
                isActive 
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' 
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {activeTab === 'ledger' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { title: 'Total Items in Stock', val: '14,234', icon: Package, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                { title: 'Inventory Valuation', val: '$1.42M', icon: BarChart3, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                { title: 'Low Stock Alerts', val: '24', icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                { title: 'Pending Transfers', val: '8', icon: ArrowRightLeft, color: 'text-blue-500', bg: 'bg-blue-500/10' }
              ].map((kpi, i) => (
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

            {/* Main Table */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl flex flex-col overflow-hidden">
              <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-tertiary)]/50">
                <div className="relative w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input 
                    type="text" 
                    placeholder="Search SKU or Item..." 
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg pl-9 pr-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <button className="p-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                  <Filter className="w-4 h-4" />
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]/50">
                      <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Item Details</th>
                      <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Location</th>
                      <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Quantity</th>
                      <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                      <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Valuation</th>
                      <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockItems.map((item, i) => (
                      <tr key={i} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center">
                              <Box className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[var(--text-primary)]">{item.name}</p>
                              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{item.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-[var(--text-secondary)] font-medium">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {item.warehouse}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-black text-[var(--text-primary)] font-display">{item.qty}</span>
                          <span className="text-xs text-[var(--text-muted)] ml-1">/ {item.minStock} min</span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                            item.status === 'Healthy' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                            item.status === 'Low Stock' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                            'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-4 text-right text-sm font-bold text-[var(--text-primary)]">
                          {item.val}
                        </td>
                        <td className="p-4 text-center">
                          <button className="p-2 text-[var(--text-secondary)] hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors">
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Other tabs placeholder */}
        {activeTab !== 'ledger' && (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl animate-fade-in">
            <div className="w-20 h-20 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center mb-6">
              {React.createElement(tabs.find(t => t.id === activeTab)?.icon || Box, { className: "w-10 h-10 text-[var(--text-muted)]" })}
            </div>
            <h4 className="text-xl font-bold text-[var(--text-primary)] mb-2 font-display">
              {tabs.find(t => t.id === activeTab)?.label}
            </h4>
            <p className="text-[var(--text-secondary)] max-w-md">
              This module section is currently under construction. Data tables, forms, and workflows for {tabs.find(t => t.id === activeTab)?.label.toLowerCase()} will be rendered here.
            </p>
            <button className="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20">
              Configure Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryWarehouse;
"""

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("InventoryWarehouse created.")
