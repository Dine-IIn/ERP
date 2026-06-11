import React, { useState } from 'react';
import { AlertCircle, ArrowUpRight, ShieldAlert, ShoppingCart, Sliders, Warehouse, Search } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  uom: string;
  stock: number;
  reorderLevel: number;
  warehouseLoc?: string;
}

interface LowStockAlertsProps {
  products: Product[];
  onTriggerReorderRedirect: () => void; // Redirects/switches tab to PO Creation!
  onTriggerAuditRedirect: () => void; // Redirects/switches tab to Stock Audit!
}

export default function LowStockAlerts({
  products,
  onTriggerReorderRedirect,
  onTriggerAuditRedirect
}: LowStockAlertsProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter products below minimum safety threshold and match search term
  const alertProducts = (products || [])
    .filter(p => p.stock <= p.reorderLevel)
    .filter(p => {
      const name = p?.name || '';
      const sku = p?.sku || '';
      const rack = p?.warehouseLoc || '';
      const term = (searchTerm || '').toLowerCase();
      return name.toLowerCase().includes(term) ||
        sku.toLowerCase().includes(term) ||
        rack.toLowerCase().includes(term);
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-red-500/10 p-6 rounded-2xl border border-red-500/20 backdrop-blur-xl animate-pulse">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-8 h-8 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Safety Reorder Stock Alerts
            </h1>
            <p className="text-slate-300 text-sm mt-1">Configure minimum safety limits to auto-flag inventory running dry, prompting procurement PO replenishment.</p>
          </div>
        </div>
        <div className="text-center font-mono bg-red-950/60 border border-red-500/30 px-5 py-2.5 rounded-xl self-start sm:self-auto">
          <div className="text-2xl font-black text-red-400">{alertProducts.length}</div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Critical Items</div>
        </div>
      </div>

      {/* Search bar */}
      <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl backdrop-blur-xl flex items-center justify-between gap-3">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by SKU, name, or rack location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950/40 border border-slate-850/60 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl text-white text-xs outline-none transition-all"
          />
        </div>
      </div>

      {/* Main Alert List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alertProducts.length === 0 ? (
          <div className="col-span-2 bg-slate-900/40 border border-slate-800 p-12 text-center rounded-2xl backdrop-blur-xl">
            <ShieldAlert className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="font-bold text-white text-base">Perfect Inventory Status</h3>
            <p className="text-slate-400 text-sm mt-1">All physical products levels are safely above reorder safety limits.</p>
          </div>
        ) : (
          alertProducts.map((p) => {
            const percentage = p.reorderLevel > 0 ? (p.stock / p.reorderLevel) * 100 : 0;
            return (
              <div key={p.id} className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-xl flex flex-col justify-between hover:border-red-500/30 transition-all">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-white text-base leading-tight">{p.name}</h4>
                      <p className="font-mono text-xs text-slate-500 mt-1">SKU: {p.sku}</p>
                    </div>
                    {p.warehouseLoc && (
                      <span className="px-2 py-0.5 bg-slate-850 text-indigo-300 border border-slate-800 rounded-lg text-[10px] font-bold font-mono">
                        Rack: {p.warehouseLoc}
                      </span>
                    )}
                  </div>

                  {/* Visual progress bar */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-400">Inventory Status:</span>
                      <span className="text-red-400 font-mono font-bold">
                        {p.stock} / {p.reorderLevel} {p.uom} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 border border-slate-850 h-2.5 rounded-full overflow-hidden p-0.5">
                      <div
                        className="bg-red-500 h-full rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-850/60">
                  <button
                    onClick={onTriggerReorderRedirect}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 font-bold rounded-xl text-xs transition-all active:scale-95"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Issue Replenish PO
                  </button>
                  <button
                    onClick={onTriggerAuditRedirect}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/60 text-slate-300 font-bold rounded-xl text-xs transition-all active:scale-95"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    Perform Audit
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
