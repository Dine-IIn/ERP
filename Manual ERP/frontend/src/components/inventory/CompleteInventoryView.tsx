import React, { useState } from 'react';
import { Package, Search, Warehouse, ShieldAlert, CheckCircle, ShieldCheck, DollarSign, Sliders } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku?: string;
  uom: string;
  stock: number;
  reorderLevel: number;
  warehouseLoc?: string;
  pricing: number;
  category?: { name: string };
  brand?: { name: string };
}

interface CompleteInventoryViewProps {
  products: Product[];
}

export default function CompleteInventoryView({ products = [] }: CompleteInventoryViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, SAFE, LOW

  // Compute Categories list
  const categories = Array.from(
    new Set((products || []).map(p => p?.category?.name).filter(Boolean))
  ) as string[];

  // Filter products
  const filteredProducts = (products || []).filter(p => {
    if (!p) return false;
    const name = p.name || '';
    const sku = p.sku || '';
    const warehouseLoc = p.warehouseLoc || '';
    const term = (searchTerm || '').toLowerCase();

    const matchesSearch = name.toLowerCase().includes(term) ||
      sku.toLowerCase().includes(term) ||
      warehouseLoc.toLowerCase().includes(term);

    const matchesCategory = categoryFilter === 'ALL' || p.category?.name === categoryFilter;

    const stock = p.stock || 0;
    const reorderLevel = p.reorderLevel || 0;
    const isLow = stock <= reorderLevel;
    const matchesStatus = statusFilter === 'ALL' ||
      (statusFilter === 'LOW' && isLow) ||
      (statusFilter === 'SAFE' && !isLow);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate high-level summary cards stats
  const totalProducts = (products || []).length;
  const totalStockItems = (products || []).reduce((sum, p) => sum + Math.max(0, p?.stock || 0), 0);
  const totalValuation = (products || []).reduce((sum, p) => sum + (Math.max(0, p?.stock || 0) * (p?.pricing || 0)), 0);
  const criticalItemsCount = (products || []).filter(p => (p?.stock || 0) <= (p?.reorderLevel || 0)).length;

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl animate-fade-in">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Warehouse className="w-5.5 h-5.5 text-indigo-400" />
            Complete Consolidated Inventory View
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Real-time warehouse tracking of product stocks, current asset valuations, shelf designations, and safety margins.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total SKUs */}
        <div className="bg-slate-900/35 border border-slate-850 p-5 rounded-2xl flex items-center gap-4 backdrop-blur-md">
          <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400 shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{totalProducts}</div>
            <div className="text-[10px] text-slate-450 uppercase font-bold tracking-wider mt-0.5">Total Registered SKUs</div>
          </div>
        </div>

        {/* KPI 2: Total Items */}
        <div className="bg-slate-900/35 border border-slate-850 p-5 rounded-2xl flex items-center gap-4 backdrop-blur-md">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400 shrink-0">
            <Warehouse className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{totalStockItems.toLocaleString()}</div>
            <div className="text-[10px] text-slate-450 uppercase font-bold tracking-wider mt-0.5">Physical Stock Volumes</div>
          </div>
        </div>

        {/* KPI 3: Assets Valuation */}
        <div className="bg-slate-900/35 border border-slate-850 p-5 rounded-2xl flex items-center gap-4 backdrop-blur-md">
          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">₹{totalValuation.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <div className="text-[10px] text-slate-450 uppercase font-bold tracking-wider mt-0.5">Asset Inventory Valuation</div>
          </div>
        </div>

        {/* KPI 4: Safety Stock Alerts */}
        <div className={`bg-slate-900/35 border p-5 rounded-2xl flex items-center gap-4 backdrop-blur-md transition-all ${
          criticalItemsCount > 0 ? 'border-red-500/20 bg-red-500/5' : 'border-slate-850'
        }`}>
          <div className={`p-3 rounded-xl border shrink-0 ${
            criticalItemsCount > 0 
              ? 'bg-red-500/15 border-red-500/35 text-red-400' 
              : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
          }`}>
            {criticalItemsCount > 0 ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
          </div>
          <div>
            <div className={`text-2xl font-black ${criticalItemsCount > 0 ? 'text-red-400' : 'text-white'}`}>
              {criticalItemsCount}
            </div>
            <div className="text-[10px] text-slate-450 uppercase font-bold tracking-wider mt-0.5">Low Stock Replenishments</div>
          </div>
        </div>
      </div>

      {/* Filter and Table Card */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl backdrop-blur-xl overflow-hidden">
        {/* Filter Controls Bar */}
        <div className="p-4 border-b border-slate-800/60 bg-slate-950/20 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by product name, SKU, or rack location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/40 border border-slate-850/60 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white text-xs outline-none transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-2.5">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950/40 border border-slate-850/60 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950/40 border border-slate-850/60 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
            >
              <option value="ALL">All Stock Levels</option>
              <option value="SAFE">Safe / Sufficient Level</option>
              <option value="LOW">Low Stock / Below Limit</option>
            </select>
          </div>
        </div>

        {/* Inventory Data Table */}
        <div className="overflow-x-auto text-left">
          {filteredProducts.length === 0 ? (
            <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center">
              <Warehouse className="w-12 h-12 text-slate-750 mb-3" />
              <p className="font-semibold text-sm">No warehouse stocks match filters</p>
              <p className="text-slate-650 text-xs mt-1">Try relaxing search terms or selecting different categories.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-slate-950/40">
                  <th className="py-3.5 px-5">Product SKU / Code</th>
                  <th className="py-3.5 px-5">Category & Brand</th>
                  <th className="py-3.5 px-5">Rack Location</th>
                  <th className="py-3.5 px-5">Physical Stock Level</th>
                  <th className="py-3.5 px-5">Safety Margin Limit</th>
                  <th className="py-3.5 px-5">Base Value</th>
                  <th className="py-3.5 px-5">Total Valuation</th>
                  <th className="py-3.5 px-5">Status Alert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">                {filteredProducts.map((p) => {
                  const stock = p.stock || 0;
                  const reorderLevel = p.reorderLevel || 0;
                  const pricing = p.pricing || 0;
                  const isLow = stock <= reorderLevel;
                  const totalVal = Math.max(0, stock) * pricing;
                  const ratio = reorderLevel > 0 ? (stock / reorderLevel) * 100 : 100;
                  
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/15 transition-colors">
                       <td className="py-4 px-5">
                        <span className="font-bold text-white block truncate max-w-xs">{p.name || 'Unnamed Product'}</span>
                        <span className="text-[9px] font-mono text-slate-500 mt-0.5 block">{p.sku || p.id?.slice(0, 8).toUpperCase() || 'N/A'}</span>
                      </td>
                      <td className="py-4 px-5">
                        <span className="px-2 py-0.5 rounded text-[8px] font-bold tracking-wider inline-block bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
                          {p.category?.name || 'N/A'}
                        </span>
                        {p.brand && (
                          <span className="px-2 py-0.5 rounded text-[8px] font-bold tracking-wider inline-block bg-slate-800 text-slate-455 border border-slate-700 uppercase ml-1.5">
                            {p.brand?.name || 'N/A'}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <span className="font-mono font-semibold text-slate-350 bg-slate-850/60 border border-slate-800 px-2 py-0.5 rounded text-[10px]">
                          {p.warehouseLoc || 'Designation Pending'}
                        </span>
                      </td>
                      <td className="py-4 px-5 font-mono text-white text-sm font-extrabold">
                        {stock} <span className="text-[10px] text-slate-450 uppercase font-sans font-medium">{p.uom || 'PCS'}</span>
                      </td>
                      <td className="py-4 px-5 font-mono text-slate-400 text-xs">
                        {reorderLevel} <span className="text-[9px] text-slate-500 uppercase font-sans font-medium">{p.uom || 'PCS'}</span>
                      </td>
                      <td className="py-4 px-5 font-mono text-slate-300">
                        ₹{pricing.toFixed(2)}
                      </td>
                      <td className="py-4 px-5 font-mono text-emerald-400 font-bold text-sm">
                        ₹{totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td> </td>
                      <td className="py-4 px-5">
                        {isLow ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-bold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wide">
                              <ShieldAlert className="w-3 h-3 text-rose-400" />
                              Low Stock
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                            Sufficient
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
