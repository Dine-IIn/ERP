import os

mfg_content = """import React, { useState } from 'react';
import { 
  Factory, Settings, Layers, Box, 
  Wrench, Activity, BarChart3, Plus, Search, Filter, Download, 
  ArrowUpRight, Clock, ShieldCheck, CheckCircle2, MoreHorizontal, AlertTriangle
} from 'lucide-react';

interface Props {
  activeTab?: string;
  user: any;
}

const ManufacturingProduction: React.FC<Props> = ({ user, activeTab }) => {
  const mapping: Record<string, string> = {
    'MFG_BOM': 'bom',
    'MFG_PRODUCTION_ORDERS': 'orders',
    'MFG_WORK_ORDERS': 'workorders',
    'MFG_MATERIAL_CONSUMPTION': 'consumption',
    'MFG_COSTING': 'costing',
    'MFG_REPORTS': 'reports'
  };
  // Default to dashboard instead of bom to make it look nicer initially
  const currentTab = (activeTab && mapping[activeTab]) ? mapping[activeTab] : 'dashboard';
  const [searchQuery, setSearchQuery] = useState('');

  // --- DUMMY DATA ---
  const dashboardStats = [
    { title: 'Active Runs', val: '12', icon: Activity, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { title: 'Units Produced', val: '14,500', icon: Box, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Machine Uptime', val: '98.2%', icon: Settings, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Delayed Orders', val: '2', icon: Clock, color: 'text-red-500', bg: 'bg-red-500/10' }
  ];

  const bomData = [
    { id: 'BOM-EM2-01', item: 'Electric Motor V2', components: 14, operations: 5, status: 'Active', version: 'v2.1' },
    { id: 'BOM-BAT-05', item: 'Lithium Battery Pack', components: 42, operations: 8, status: 'Active', version: 'v5.0' },
    { id: 'BOM-CW-99', item: 'Copper Wire Spool', components: 2, operations: 1, status: 'Active', version: 'v1.0' },
    { id: 'BOM-SC-01', item: 'Steel Casing A1', components: 5, operations: 3, status: 'Draft', version: 'v0.9' }
  ];

  const productionOrders = [
    { id: 'PROD-1024', item: 'Electric Motor V2', bom: 'BOM-EM2-01', qty: 500, status: 'In Progress', progress: 65, date: 'May 20, 2026' },
    { id: 'PROD-1025', item: 'Lithium Battery Pack', bom: 'BOM-BAT-05', qty: 2000, status: 'Planned', progress: 0, date: 'May 24, 2026' },
    { id: 'PROD-1026', item: 'Copper Wire Spool', bom: 'BOM-CW-99', qty: 150, status: 'Completed', progress: 100, date: 'May 18, 2026' },
    { id: 'PROD-1027', item: 'Steel Casing A1', bom: 'BOM-SC-01', qty: 1000, status: 'On Hold', progress: 25, date: 'May 21, 2026' }
  ];

  const workOrdersData = [
    { id: 'WO-5051', prodOrder: 'PROD-1024', operation: 'Assembly line 1', machine: 'ASM-01', assignedTo: 'John Doe', status: 'In Progress' },
    { id: 'WO-5052', prodOrder: 'PROD-1024', operation: 'Testing & QA', machine: 'TEST-05', assignedTo: 'Jane Smith', status: 'Pending' },
    { id: 'WO-5053', prodOrder: 'PROD-1027', operation: 'Casing Molding', machine: 'MLD-02', assignedTo: 'Bob Wilson', status: 'Paused' },
  ];

  const consumptionData = [
    { id: 'MAT-881', order: 'PROD-1024', component: 'Copper Wire', required: '500 kg', consumed: '320 kg', status: 'On Track' },
    { id: 'MAT-882', order: 'PROD-1024', component: 'Magnets', required: '1000 units', consumed: '650 units', status: 'On Track' },
    { id: 'MAT-883', order: 'PROD-1027', component: 'Steel Sheets', required: '2000 kg', consumed: '500 kg', status: 'Shortage' },
  ];

  const costingData = [
    { id: 'CST-1024', order: 'PROD-1024', item: 'Electric Motor V2', materialCost: '$12,500', laborCost: '$4,200', overhead: '$1,800', total: '$18,500' },
    { id: 'CST-1026', order: 'PROD-1026', item: 'Copper Wire Spool', materialCost: '$3,100', laborCost: '$500', overhead: '$200', total: '$3,800' },
  ];

  // --- RENDER HELPERS ---
  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in p-2">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardStats.map((kpi, idx) => (
          <div key={idx} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-5 rounded-2xl flex items-center gap-4 hover:border-indigo-500/30 transition-all">
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
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5">
          <h4 className="font-bold text-[var(--text-primary)] mb-4">Active Production Orders</h4>
          <div className="space-y-3">
            {productionOrders.filter(o => o.status === 'In Progress').map(order => (
              <div key={order.id} className="p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                <div className="flex justify-between items-center mb-2">
                  <p className="font-bold text-sm text-[var(--text-primary)]">{order.item}</p>
                  <span className="text-xs font-bold text-indigo-500">{order.progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${order.progress}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5">
          <h4 className="font-bold text-[var(--text-primary)] mb-4">Material Shortages</h4>
          <div className="space-y-3">
            {consumptionData.filter(c => c.status === 'Shortage').map(c => (
              <div key={c.id} className="flex justify-between items-center p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
                    <AlertTriangle className="w-4 h-4"/>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[var(--text-primary)]">{c.component}</p>
                    <p className="text-xs text-[var(--text-secondary)]">Order: {c.order}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-rose-500">Req: {c.required}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Have: {c.consumed}</p>
                </div>
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
      <div className="flex-1 overflow-hidden">
        {currentTab === 'dashboard' && renderDashboard()}
        
        {currentTab === 'bom' && renderTable(
          ['BOM ID', 'Product / Item', 'Components', 'Operations', 'Version', 'Status'],
          bomData,
          (b) => (
            <tr key={b.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors group">
              <td className="px-6 py-4 font-mono text-xs font-bold text-indigo-400">{b.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{b.item}</td>
              <td className="px-6 py-4">{b.components} parts</td>
              <td className="px-6 py-4">{b.operations} steps</td>
              <td className="px-6 py-4">{b.version}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${b.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  {b.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {currentTab === 'orders' && renderTable(
          ['Order ID', 'Item / BOM', 'Target Qty', 'Progress', 'Status'],
          productionOrders,
          (order) => (
            <tr key={order.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs font-bold text-indigo-400">{order.id}</td>
              <td className="px-6 py-4">
                <p className="font-bold text-[var(--text-primary)]">{order.item}</p>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[var(--text-secondary)]">
                  <Layers className="w-3.5 h-3.5" />
                  {order.bom}
                </div>
              </td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{order.qty}</td>
              <td className="px-6 py-4 w-48">
                <div className="flex flex-col gap-1.5 w-full">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-[var(--text-secondary)]">{order.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${order.progress === 100 ? 'bg-emerald-500' : order.progress > 0 ? 'bg-indigo-500' : 'bg-slate-500'}`} style={{ width: `${order.progress}%` }}></div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                  order.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                  order.status === 'In Progress' ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' :
                  order.status === 'On Hold' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                  'bg-slate-500/10 text-slate-400 border-slate-500/20'
                }`}>
                  {order.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {currentTab === 'workorders' && renderTable(
          ['WO ID', 'Prod Order', 'Operation', 'Machine', 'Assigned To', 'Status'],
          workOrdersData,
          (wo) => (
            <tr key={wo.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs font-bold">{wo.id}</td>
              <td className="px-6 py-4 font-mono text-xs text-[var(--text-muted)]">{wo.prodOrder}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{wo.operation}</td>
              <td className="px-6 py-4">{wo.machine}</td>
              <td className="px-6 py-4">{wo.assignedTo}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${wo.status === 'In Progress' ? 'bg-indigo-500/10 text-indigo-500' : wo.status === 'Pending' ? 'bg-slate-500/10 text-slate-400' : 'bg-amber-500/10 text-amber-500'}`}>
                  {wo.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {currentTab === 'consumption' && renderTable(
          ['ID', 'Prod Order', 'Component', 'Required', 'Consumed', 'Status'],
          consumptionData,
          (c) => (
            <tr key={c.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs font-bold">{c.id}</td>
              <td className="px-6 py-4 font-mono text-xs text-[var(--text-muted)]">{c.order}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{c.component}</td>
              <td className="px-6 py-4">{c.required}</td>
              <td className="px-6 py-4 font-semibold text-emerald-400">{c.consumed}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${c.status === 'On Track' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {c.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {currentTab === 'costing' && renderTable(
          ['ID', 'Prod Order', 'Item', 'Material Cost', 'Labor Cost', 'Overhead', 'Total Cost'],
          costingData,
          (cst) => (
            <tr key={cst.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs font-bold">{cst.id}</td>
              <td className="px-6 py-4 font-mono text-xs text-[var(--text-muted)]">{cst.order}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{cst.item}</td>
              <td className="px-6 py-4">{cst.materialCost}</td>
              <td className="px-6 py-4">{cst.laborCost}</td>
              <td className="px-6 py-4">{cst.overhead}</td>
              <td className="px-6 py-4 font-bold text-emerald-400">{cst.total}</td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {currentTab === 'reports' && (
           <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl animate-fade-in m-2">
            <div className="w-20 h-20 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center mb-6">
              <BarChart3 className="w-10 h-10 text-[var(--text-muted)]" />
            </div>
            <h4 className="text-xl font-bold text-[var(--text-primary)] mb-2 font-display">
              Production Reports
            </h4>
            <p className="text-[var(--text-secondary)] max-w-md">
              Generate detailed reports for production output, costing variance, and material consumption.
            </p>
            <button className="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20">
              Generate Report
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default ManufacturingProduction;
"""

with open(r"d:\ERP\Manual ERP\frontend\src\components\ManufacturingProduction.tsx", "w", encoding="utf-8") as f:
    f.write(mfg_content)
print("Manufacturing Module Updated.")
