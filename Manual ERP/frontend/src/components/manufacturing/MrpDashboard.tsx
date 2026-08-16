import React, { useState, useEffect } from 'react';
import { Cpu, Calendar, ShoppingCart, RefreshCw, AlertCircle, Printer, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../../utils/apiService';
import { openLocalSheet, syncLocalSheet } from '../../utils/localSheetsService';

interface MaterialDeficit {
  productId: string;
  productName: string;
  uom: string;
  currentStock: number;
  totalPlannedDemand: number;
  netDeficit: number;
  unitPrice: number;
  estimatedDeficitCost: number;
  status: 'DEFICIT' | 'SUFFICIENT';
}

interface JitRequirement {
  planId: string;
  finishedProduct: string;
  componentId: string;
  componentName: string;
  requiredMonth: string;
  monthlyQuantity: number;
  unitPrice: number;
  totalCost: number;
}

interface BulkReorderRecommendation {
  productId: string;
  productName: string;
  currentStock: number;
  reorderLevel: number;
  plannedDemand: number;
  moq: number;
  recommendedOrderQty: number;
  unitPrice: number;
  estimatedTotalCost: number;
}

export default function MrpDashboard({ currencySymbol = '$' }: { currencySymbol?: string }) {
  const [deficits, setDeficits] = useState<MaterialDeficit[]>([]);
  const [jitReqs, setJitReqs] = useState<JitRequirement[]>([]);
  const [bulkRecs, setBulkRecs] = useState<BulkReorderRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMrpData();
  }, []);

  const fetchMrpData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<any>('/api/manufacturing/mrp');
      const defs: MaterialDeficit[] = res.materialDeficits || [];
      setDeficits(defs);
      setJitReqs(res.jitRequirements || []);
      setBulkRecs(res.bulkReorderRecommendations || []);

      // Auto-sync deficits sheet to local folder
      const deficitRows = defs.map(d => ({
        'Component Name': d.productName,
        'UOM': d.uom,
        'Current Stock': d.currentStock,
        'Total Planned Demand': d.totalPlannedDemand,
        'Net Deficit Qty': d.netDeficit,
        'Unit Price': d.unitPrice,
        'Est Deficit Cost': d.estimatedDeficitCost,
        'Status': d.status
      }));
      syncLocalSheet('mrp_deficits.csv', deficitRows);
    } catch (err: any) {
      setError(err.message || 'Failed to load MRP recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintDeficitReport = () => {
    const deficitOnly = deficits.filter(d => d.netDeficit > 0);
    const rowsHtml = (deficitOnly.length > 0 ? deficitOnly : deficits)
      .map(
        d => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px; text-align: left; font-weight: bold;">${d.productName}</td>
          <td style="padding: 8px; text-align: center;">${d.uom}</td>
          <td style="padding: 8px; text-align: right; color: #475569;">${d.currentStock}</td>
          <td style="padding: 8px; text-align: right; color: #1e293b; font-weight: bold;">${d.totalPlannedDemand}</td>
          <td style="padding: 8px; text-align: right; color: ${d.netDeficit > 0 ? '#dc2626' : '#16a34a'}; font-weight: bold;">${d.netDeficit}</td>
          <td style="padding: 8px; text-align: right; font-weight: bold;">${currencySymbol}${d.estimatedDeficitCost.toFixed(2)}</td>
        </tr>
      `
      )
      .join('');

    const printWin = window.open('', '_blank');
    if (!printWin) return alert('Please allow popups to print the Deficit Materials report.');

    printWin.document.write(`
      <html>
        <head>
          <title>MRP Material Deficit Report — Production Planning</title>
          <style>
            body { font-family: sans-serif; padding: 24px; color: #0f172a; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            p { font-size: 12px; color: #64748b; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #f8fafc; border-bottom: 2px solid #cbd5e1; padding: 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
            .header-bar { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
          </style>
        </head>
        <body>
          <div class="header-bar">
            <div>
              <h1>MRP Deficit Materials Report</h1>
              <p>Cumulative raw material requirements across ALL active production plans vs warehouse stock</p>
            </div>
            <div style="text-align: right; font-size: 11px;">
              <div>Date Generated: ${new Date().toLocaleDateString()}</div>
              <div>Deficit Items: ${deficitOnly.length}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Component Item</th>
                <th style="text-align: center;">UOM</th>
                <th style="text-align: right;">Current Stock</th>
                <th style="text-align: right;">Total Planned Demand</th>
                <th style="text-align: right;">Net Deficit Qty</th>
                <th style="text-align: right;">Est. Deficit Cost</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const handleOpenDeficitSheet = () => {
    const deficitRows = deficits.map(d => ({
      'Component Name': d.productName,
      'UOM': d.uom,
      'Current Stock': d.currentStock,
      'Total Planned Demand': d.totalPlannedDemand,
      'Net Deficit Qty': d.netDeficit,
      'Unit Price': d.unitPrice,
      'Est Deficit Cost': d.estimatedDeficitCost,
      'Status': d.status
    }));
    openLocalSheet('mrp_deficits.csv', deficitRows);
  };

  const netDeficitCount = deficits.filter(d => d.netDeficit > 0).length;

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-color)]">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] font-display flex items-center gap-2">
            <Cpu className="w-6 h-6 text-indigo-400" />
            Smart Material Requirements Planning (MRP)
          </h2>
          <p className="text-[var(--text-secondary)] text-xs mt-1">
            Global cross-order cumulative deficit aggregation, JIT schedule for costly components, and MOQ bulk reorder optimization.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrintDeficitReport}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all border-0 cursor-pointer shadow-md active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Deficit Sheet
          </button>

          <button
            onClick={handleOpenDeficitSheet}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all border-0 cursor-pointer shadow-md active:scale-95"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Open Deficit Sheet
          </button>

          <button
            onClick={fetchMrpData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-bold rounded-xl text-xs transition-all border border-[var(--border-color)] cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Recalculate
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Section 1: Global Cumulative Material Deficits across ALL Production Plans */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 uppercase tracking-wide font-display">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              1. Global Material Deficit Aggregation (Cumulative Across ALL Orders)
            </h3>
            <p className="text-[var(--text-secondary)] text-[11px] mt-0.5">
              Aggregates raw material demand across all active planned orders to detect true warehouse shortages.
            </p>
          </div>
          {netDeficitCount > 0 ? (
            <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {netDeficitCount} Material Deficits Flagged
            </span>
          ) : (
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> All Planned Materials Sufficient
            </span>
          )}
        </div>

        {deficits.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[var(--border-color)] rounded-xl text-[var(--text-muted)] text-xs">
            No active production plans in system to analyze raw material deficits.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[9px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                  <th className="py-2.5 px-3">Component Raw Material</th>
                  <th className="py-2.5 px-3 text-center">UOM</th>
                  <th className="py-2.5 px-3 text-right">Current Stock</th>
                  <th className="py-2.5 px-3 text-right text-indigo-300">Total Planned Demand (All Orders)</th>
                  <th className="py-2.5 px-3 text-right text-rose-400">Net Deficit Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Est. Deficit Cost</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/50">
                {deficits.map((item, idx) => (
                  <tr key={idx} className={`hover:bg-[var(--bg-primary)]/50 transition-colors ${item.netDeficit > 0 ? 'bg-rose-500/5' : ''}`}>
                    <td className="py-2.5 px-3 font-bold text-[var(--text-primary)]">{item.productName}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-[var(--text-muted)]">{item.uom}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-[var(--text-secondary)]">{item.currentStock}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-300">{item.totalPlannedDemand}</td>
                    <td className={`py-2.5 px-3 text-right font-mono font-black ${item.netDeficit > 0 ? 'text-rose-400 text-sm' : 'text-emerald-400'}`}>
                      {item.netDeficit > 0 ? `-${item.netDeficit}` : '0'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[var(--text-secondary)]">{currencySymbol}{item.unitPrice.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">{currencySymbol}{item.estimatedDeficitCost.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        item.netDeficit > 0 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {item.netDeficit > 0 ? 'DEFICIT' : 'SUFFICIENT'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: JIT Phased Schedule for Costly Components */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 uppercase tracking-wide font-display">
              <Calendar className="w-4 h-4 text-emerald-400" />
              2. Time-Phased JIT Schedule (Costly Components)
            </h3>
            <p className="text-[var(--text-secondary)] text-[11px] mt-0.5">
              Auto-calculated monthly delivery requirements based on active production plan duration to prevent capital lockup.
            </p>
          </div>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            JIT Phasing Active
          </span>
        </div>

        {jitReqs.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[var(--border-color)] rounded-xl text-[var(--text-muted)] text-xs">
            No active long-term production plans requiring JIT time-phased purchasing at this moment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[9px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                  <th className="py-2.5 px-3">Required Month</th>
                  <th className="py-2.5 px-3">Parent Finished Product</th>
                  <th className="py-2.5 px-3">Costly Component</th>
                  <th className="py-2.5 px-3 text-right">Monthly Quantity</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Est. Monthly Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/50">
                {jitReqs.map((req, idx) => (
                  <tr key={idx} className="hover:bg-[var(--bg-primary)]/50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-emerald-400 font-mono">{req.requiredMonth}</td>
                    <td className="py-2.5 px-3 text-[var(--text-primary)]">{req.finishedProduct}</td>
                    <td className="py-2.5 px-3 font-bold text-indigo-300">{req.componentName}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-[var(--text-primary)]">{req.monthlyQuantity}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-[var(--text-secondary)]">{currencySymbol}{req.unitPrice.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">{currencySymbol}{req.totalCost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 3: Bulk MOQ Replenishment Board */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 uppercase tracking-wide font-display">
              <ShoppingCart className="w-4 h-4 text-indigo-400" />
              3. Bulk Reorder Recommendations (MOQ Optimization)
            </h3>
            <p className="text-[var(--text-secondary)] text-[11px] mt-0.5">
              Auto-calculates shortages against minimum stock levels and rounds up to Minimum Order Quantity (MOQ) for bulk discount optimization.
            </p>
          </div>
          <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
            MOQ Rounding Active
          </span>
        </div>

        {bulkRecs.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[var(--border-color)] rounded-xl text-[var(--text-muted)] text-xs">
            All component stock levels are healthy. No bulk reordering required right now.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[9px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                  <th className="py-2.5 px-3">Component Item</th>
                  <th className="py-2.5 px-3 text-right">Current Stock</th>
                  <th className="py-2.5 px-3 text-right">Reorder Level</th>
                  <th className="py-2.5 px-3 text-right">Planned Demand</th>
                  <th className="py-2.5 px-3 text-right">MOQ Batch</th>
                  <th className="py-2.5 px-3 text-right text-indigo-400">Rec. Order Qty</th>
                  <th className="py-2.5 px-3 text-right">Est. Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/50">
                {bulkRecs.map((rec, idx) => (
                  <tr key={idx} className="hover:bg-[var(--bg-primary)]/50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-[var(--text-primary)]">{rec.productName}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-[var(--text-secondary)]">{rec.currentStock}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-400">{rec.reorderLevel}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-[var(--text-secondary)]">{rec.plannedDemand}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-[var(--text-muted)]">{rec.moq}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-indigo-400">{rec.recommendedOrderQty}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">{currencySymbol}{rec.estimatedTotalCost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
