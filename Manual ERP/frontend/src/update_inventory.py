import os

inv_content = """import React, { useState } from 'react';
import { 
  Box, MapPin, ArrowRightLeft, SlidersHorizontal, FileText, 
  Truck, BarChart3, Plus, Search, Filter, Download, ArrowUpRight, 
  Package, AlertTriangle, Layers, QrCode, ShieldCheck, MoreHorizontal, CheckCircle
} from 'lucide-react';

interface Props {
  activeTab?: string;
  user: any;
}

const InventoryWarehouse: React.FC<Props> = ({ user, activeTab }) => {
  const mapping: Record<string, string> = {
    'INVENTORY_TRACKING': 'ledger',
    'INVENTORY_MULTI_WH': 'locations',
    'INVENTORY_TRANSFERS': 'transfers',
    'INVENTORY_ADJUSTMENTS': 'adjustments',
    'INVENTORY_GRN': 'grn',
    'INVENTORY_DISPATCH': 'dispatch',
    'INVENTORY_REPORTS': 'reports',
    'INVENTORY_LEDGER': 'ledger'
  };
  const currentTab = (activeTab && mapping[activeTab]) ? mapping[activeTab] : 'ledger';
  const [searchQuery, setSearchQuery] = useState('');

  // --- DUMMY DATA ---
  const stockItems = [
  ];

  const locationsData = [
  ];

  const transfersData = [
  ];

  const adjustmentsData = [
  ];

  const grnData = [
  ];

  const dispatchData = [
  ];

  // --- RENDER HELPERS ---
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

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {currentTab === 'ledger' && (
          <div className="flex flex-col gap-6 animate-fade-in h-full overflow-hidden p-2">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
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
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl flex flex-col overflow-hidden flex-1">
              <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-tertiary)]/50">
                <div className="relative w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input type="text" placeholder="Search SKU or Item..." className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg pl-9 pr-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <button className="p-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                  <Filter className="w-4 h-4" />
                </button>
              </div>
              
              <div className="overflow-x-auto flex-1 custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[var(--bg-primary)]/90 backdrop-blur-sm shadow-sm z-10">
                    <tr className="border-b border-[var(--border-color)]">
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
                          <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" />{item.warehouse}</div>
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
                        <td className="p-4 text-right text-sm font-bold text-[var(--text-primary)]">{item.val}</td>
                        <td className="p-4 text-center">
                          <button className="p-2 text-[var(--text-secondary)] hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"><ArrowUpRight className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {currentTab === 'locations' && renderTable(
          ['ID', 'Warehouse Name', 'Type', 'Capacity', 'Zones', 'Manager', 'Status'],
          locationsData,
          (loc) => (
            <tr key={loc.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors group">
              <td className="px-6 py-4 font-mono text-xs">{loc.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{loc.name}</td>
              <td className="px-6 py-4">{loc.type}</td>
              <td className="px-6 py-4 font-bold">{loc.capacity}</td>
              <td className="px-6 py-4">{loc.zones}</td>
              <td className="px-6 py-4">{loc.manager}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${loc.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  {loc.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {currentTab === 'transfers' && renderTable(
          ['Transfer ID', 'Date', 'From', 'To', 'Items', 'Status', 'Reference'],
          transfersData,
          (trf) => (
            <tr key={trf.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs">{trf.id}</td>
              <td className="px-6 py-4">{trf.date}</td>
              <td className="px-6 py-4 font-semibold">{trf.from}</td>
              <td className="px-6 py-4 font-semibold">{trf.to}</td>
              <td className="px-6 py-4">{trf.items} qty</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${trf.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' : trf.status === 'In Transit' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  {trf.status}
                </span>
              </td>
              <td className="px-6 py-4 font-mono text-xs text-[var(--text-muted)]">{trf.ref}</td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {currentTab === 'adjustments' && renderTable(
          ['ID', 'Date', 'Type', 'Item', 'Qty Adj.', 'Value Adj.', 'Reason', 'Status'],
          adjustmentsData,
          (adj) => (
            <tr key={adj.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs">{adj.id}</td>
              <td className="px-6 py-4">{adj.date}</td>
              <td className="px-6 py-4">{adj.type}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{adj.item}</td>
              <td className={`px-6 py-4 font-bold ${adj.qty.startsWith('-') ? 'text-rose-400' : 'text-emerald-400'}`}>{adj.qty}</td>
              <td className={`px-6 py-4 font-bold ${adj.value.startsWith('-') ? 'text-rose-400' : 'text-emerald-400'}`}>{adj.value}</td>
              <td className="px-6 py-4">{adj.reason}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${adj.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  {adj.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {currentTab === 'grn' && renderTable(
          ['GRN Number', 'PO Ref', 'Supplier', 'Received Date', 'Total Items', 'Total Qty', 'Status'],
          grnData,
          (grn) => (
            <tr key={grn.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs font-bold">{grn.id}</td>
              <td className="px-6 py-4 font-mono text-xs text-[var(--text-muted)]">{grn.poRef}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{grn.supplier}</td>
              <td className="px-6 py-4">{grn.receivedDate}</td>
              <td className="px-6 py-4">{grn.items}</td>
              <td className="px-6 py-4">{grn.totalQty}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${grn.status === 'Inspected' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {grn.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {currentTab === 'dispatch' && renderTable(
          ['Dispatch ID', 'Order Ref', 'Customer', 'Shipping Method', 'Items', 'Status'],
          dispatchData,
          (dsp) => (
            <tr key={dsp.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs font-bold">{dsp.id}</td>
              <td className="px-6 py-4 font-mono text-xs text-[var(--text-muted)]">{dsp.orderRef}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{dsp.customer}</td>
              <td className="px-6 py-4">{dsp.method}</td>
              <td className="px-6 py-4">{dsp.items} qty</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${dsp.status === 'Shipped' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  {dsp.status}
                </span>
              </td>
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
              Inventory Reports & Analytics
            </h4>
            <p className="text-[var(--text-secondary)] max-w-md">
              Generate detailed inventory valuation, slow-moving items, and forecasting reports. Select specific filters to start.
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

export default InventoryWarehouse;
"""

with open(r"d:\ERP\Manual ERP\frontend\src\components\InventoryWarehouse.tsx", "w", encoding="utf-8") as f:
    f.write(inv_content)
print("Inventory Module Updated.")
