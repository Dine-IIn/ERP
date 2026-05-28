import React from 'react';
import { Package, Download, AlertTriangle, Layers, Info } from 'lucide-react';

interface ProductItem {
  name: string;
  stock: number;
  uom: string;
  pricing: number;
  assetValue: number;
  isLowStock: string;
}

interface InventoryReportData {
  products: ProductItem[];
  totalAssetValuation: number;
  lowStockCount: number;
  totalProductsCount: number;
}

interface InventoryReportsProps {
  inventoryData: InventoryReportData;
  token: string;
}

export default function InventoryReports({
  inventoryData,
  token
}: InventoryReportsProps) {
  const handleExportCsv = () => {
    fetch('/api/reports/inventory?format=csv', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory_report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    })
    .catch(err => alert("Failed to download CSV: " + err.message));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-400" />
            Inventory & Warehouse Valuations
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Review stock levels, total physical assets valuation (pricing * stock), and download spreadsheets.
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-650 active:scale-95 transition-all text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 text-xs"
        >
          <Download className="w-4 h-4" />
          Export Stock CSV
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Total Warehouse asset value</span>
            <h3 className="text-2xl font-black text-white font-mono">${inventoryData.totalAssetValuation?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          </div>
          <Layers className="w-6 h-6 text-indigo-400 bg-indigo-500/10 p-1 rounded-lg border border-indigo-500/10" />
        </div>

        <div className="p-5 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Unique Catalog Items</span>
            <h3 className="text-2xl font-black text-white font-mono">{inventoryData.totalProductsCount}</h3>
          </div>
          <Info className="w-6 h-6 text-indigo-400 bg-indigo-500/10 p-1 rounded-lg border border-indigo-500/10" />
        </div>

        <div className={`p-5 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl flex items-center justify-between transition-colors ${inventoryData.lowStockCount > 0 ? 'bg-amber-500/5 border-amber-500/20 text-amber-400' : ''}`}>
          <div className="space-y-1">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Low Stock Warnings</span>
            <h3 className={`text-2xl font-black font-mono ${inventoryData.lowStockCount > 0 ? 'text-amber-450' : 'text-slate-300'}`}>{inventoryData.lowStockCount}</h3>
          </div>
          <AlertTriangle className={`w-6 h-6 p-1 rounded-lg border ${inventoryData.lowStockCount > 0 ? 'text-amber-400 bg-amber-500/10 border-amber-500/15' : 'text-slate-600 border-slate-800'}`} />
        </div>
      </div>

      {/* Detail Listing Grid */}
      <div className="bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800/60 bg-slate-950/20">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            Physical stock valuation registers
          </h3>
        </div>

        <div className="overflow-x-auto max-h-96">
          {inventoryData.products?.length === 0 ? (
            <div className="p-12 text-center text-slate-550 flex flex-col items-center justify-center">
              <Package className="w-12 h-12 text-slate-750 mb-3" />
              <p className="font-semibold text-sm">No items in inventory registry</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-450 font-semibold uppercase bg-slate-950/40 text-[10px]">
                  <th className="py-3 px-5">Item name</th>
                  <th className="py-3 px-5">UOM</th>
                  <th className="py-3 px-5">Stock level</th>
                  <th className="py-3 px-5">Standard pricing</th>
                  <th className="py-3 px-5">Asset value</th>
                  <th className="py-3 px-5 text-right">Low stock flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {inventoryData.products?.map((prod, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/10 transition-colors">
                    <td className="py-3 px-5 font-bold text-slate-200">{prod.name}</td>
                    <td className="py-3 px-5 text-slate-450 font-bold uppercase">{prod.uom}</td>
                    <td className="py-3 px-5 font-mono text-slate-300">{prod.stock}</td>
                    <td className="py-3 px-5 font-mono text-slate-350">${prod.pricing?.toFixed(2)}</td>
                    <td className="py-3 px-5 font-mono text-white font-black text-sm">${prod.assetValue?.toFixed(2)}</td>
                    <td className="py-3 px-5 text-right">
                      {prod.isLowStock === "YES" ? (
                        <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/15 text-amber-400 font-bold rounded-full text-[9px]">
                          LOW
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs italic">Normal</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
