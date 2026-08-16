import React, { useState, useEffect } from 'react';
import { Cpu, Calendar, ShoppingCart, RefreshCw, AlertCircle, CheckCircle2, DollarSign, Package } from 'lucide-react';
import { apiClient } from '../../utils/apiService';

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
      setJitReqs(res.jitRequirements || []);
      setBulkRecs(res.bulkReorderRecommendations || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load MRP recommendations');
    } finally {
      setLoading(false);
    }
  };

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
            Automated Just-In-Time (JIT) schedule for costly components and MOQ bulk reorder optimization for cheap components.
          </p>
        </div>
        <button
          onClick={fetchMrpData}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all border-0 cursor-pointer shadow-md shadow-indigo-600/10 active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Recalculate MRP
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Section 1: JIT Phased Schedule for Costly Components */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 uppercase tracking-wide font-display">
              <Calendar className="w-4 h-4 text-emerald-400" />
              1. Time-Phased JIT Schedule (Costly Components)
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

      {/* Section 2: Bulk MOQ Replenishment Board */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 uppercase tracking-wide font-display">
              <ShoppingCart className="w-4 h-4 text-indigo-400" />
              2. Bulk Reorder Recommendations (MOQ Optimization)
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
