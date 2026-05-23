import React, { useState } from 'react';
import { 
  Factory, Settings, Layers, Box, 
  Wrench, Activity, BarChart3, Plus, Search, Filter, Download, 
  ArrowUpRight, Clock, ShieldCheck, CheckCircle2
} from 'lucide-react';

interface Props {
  activeTab?: string;
  user: any;
}

const ManufacturingProduction: React.FC<Props> = ({ user, activeTab }) => {
    const mapping: any = {'MFG_BOM': 'bom', 'MFG_PRODUCTION_ORDERS': 'orders', 'MFG_WORK_ORDERS': 'workorders', 'MFG_MATERIAL_CONSUMPTION': 'consumption', 'MFG_COSTING': 'costing', 'MFG_REPORTS': 'reports'};
  const currentTab = (activeTab && mapping[activeTab]) ? mapping[activeTab] : 'bom';
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    { id: 'dashboard', label: 'Production Dashboard', icon: BarChart3 },
    { id: 'bom', label: 'Bill of Materials (BOM)', icon: Layers },
    { id: 'orders', label: 'Production Orders', icon: Factory },
    { id: 'work_orders', label: 'Work Orders', icon: Wrench },
    { id: 'machines', label: 'Machine Allocation', icon: Settings },
    { id: 'tracking', label: 'Floor Tracking', icon: Activity },
    { id: 'quality', label: 'Quality Check', icon: ShieldCheck }
  ];

  // Dummy production data
  const productionOrders = [
    { id: 'PROD-1024', item: 'Electric Motor V2', bom: 'BOM-EM2-01', qty: 500, status: 'In Progress', progress: 65, date: 'May 20, 2026' },
    { id: 'PROD-1025', item: 'Lithium Battery Pack', bom: 'BOM-BAT-05', qty: 2000, status: 'Planned', progress: 0, date: 'May 24, 2026' },
    { id: 'PROD-1026', item: 'Copper Wire Spool', bom: 'BOM-CW-99', qty: 150, status: 'Completed', progress: 100, date: 'May 18, 2026' },
    { id: 'PROD-1027', item: 'Steel Casing A1', bom: 'BOM-SC-01', qty: 1000, status: 'On Hold', progress: 25, date: 'May 21, 2026' }
  ];

  return (
    <div className="max-w-6xl mx-auto select-none animate-fade-in flex flex-col h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4 mb-4">
        <div>
          <h3 className="font-bold text-xl text-[var(--text-primary)] flex items-center gap-2 font-display">
            <Factory className="w-6 h-6 text-indigo-500" />
            Manufacturing & Production
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Manage BOMs, production runs, and shop floor tracking</p>
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
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {currentTab === 'orders' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { title: 'Active Runs', val: '12', icon: Activity, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                { title: 'Units Produced', val: '14,500', icon: Box, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                { title: 'Machine Uptime', val: '98.2%', icon: Settings, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { title: 'Delayed Orders', val: '2', icon: Clock, color: 'text-red-500', bg: 'bg-red-500/10' }
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
                    placeholder="Search production orders..." 
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
                      <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Order ID</th>
                      <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Item / BOM</th>
                      <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Target Qty</th>
                      <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider w-48">Progress</th>
                      <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                      <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productionOrders.map((order, i) => (
                      <tr key={i} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]/30 transition-colors">
                        <td className="p-4">
                          <span className="text-sm font-bold text-indigo-400 font-display">{order.id}</span>
                        </td>
                        <td className="p-4">
                          <p className="text-sm font-bold text-[var(--text-primary)]">{order.item}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[var(--text-secondary)]">
                            <Layers className="w-3.5 h-3.5" />
                            {order.bom}
                          </div>
                        </td>
                        <td className="p-4 text-sm font-bold text-[var(--text-primary)]">
                          {order.qty}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1.5 w-full max-w-[150px]">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-[var(--text-secondary)]">{order.progress}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  order.progress === 100 ? 'bg-emerald-500' :
                                  order.progress > 0 ? 'bg-indigo-500' :
                                  'bg-slate-500'
                                }`}
                                style={{ width: `${order.progress}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                            order.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                            order.status === 'In Progress' ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' :
                            order.status === 'On Hold' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                            'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          }`}>
                            {order.status}
                          </span>
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
        {activeTab !== 'orders' && (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl animate-fade-in">
            <div className="w-20 h-20 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center mb-6">
              {React.createElement(tabs.find(t => t.id === activeTab)?.icon || Factory, { className: "w-10 h-10 text-[var(--text-muted)]" })}
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

export default ManufacturingProduction;
