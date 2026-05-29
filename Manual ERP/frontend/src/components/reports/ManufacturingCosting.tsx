import React, { useState, useEffect } from 'react';
import { TrendingUp, Download, DollarSign, Calculator, Layers, Sliders, ArrowUpRight } from 'lucide-react';

interface ManufacturingCostingProps {
  token?: string;
}

export default function ManufacturingCosting({ token }: ManufacturingCostingProps) {
  const [costBreakdown, setCostBreakdown] = useState<any[]>([]);
  const [totalSummary, setTotalSummary] = useState({ materials: 0, labor: 0, overhead: 0 });
  const [absoluteTotal, setAbsoluteTotal] = useState(0);

  useEffect(() => {
    const logs = localStorage.getItem('erp_logs');
    const boms = localStorage.getItem('erp_boms');
    
    if (logs && boms) {
      const parsedLogs = JSON.parse(logs);
      const parsedBoms = JSON.parse(boms);

      // Group costs by month
      const grouped: Record<string, { month: string; materials: number; labor: number; overhead: number }> = {};

      parsedLogs.forEach((log: any) => {
        const date = new Date(log.dateLog || Date.now());
        const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        
        // Find matching BOM to get costing rates
        const matchedBOM = parsedBoms.find((bom: any) => bom.finishedProductName === log.finishedProductName);
        
        const qty = log.qtyCompleted || 0;
        
        // Materials cost
        let matCost = 0;
        if (matchedBOM) {
          matCost = matchedBOM.components.reduce((sum: number, c: any) => {
            const grossQty = c.qtyRequired * (1 + c.wasteMargin / 100);
            return sum + (grossQty * c.costPerUnit);
          }, 0) * qty;
        } else {
          matCost = qty * 150; // Fallback
        }

        // Labor cost
        const laborCost = matchedBOM ? (matchedBOM.laborHours * matchedBOM.laborRate * qty) : (qty * 40);
        // Overhead allocation
        const overheadCost = matchedBOM ? (matchedBOM.overheadAllocation * qty) : (qty * 30);

        if (!grouped[monthKey]) {
          grouped[monthKey] = {
            month: monthKey,
            materials: 0,
            labor: 0,
            overhead: 0
          };
        }

        grouped[monthKey].materials += matCost;
        grouped[monthKey].labor += laborCost;
        grouped[monthKey].overhead += overheadCost;
      });

      const list = Object.values(grouped);
      setCostBreakdown(list);

      const sums = list.reduce(
        (acc, cur) => ({
          materials: acc.materials + cur.materials,
          labor: acc.labor + cur.labor,
          overhead: acc.overhead + cur.overhead
        }),
        { materials: 0, labor: 0, overhead: 0 }
      );
      setTotalSummary(sums);
      setAbsoluteTotal(sums.materials + sums.labor + sums.overhead);
    }
  }, []);

  const handleCSVExport = () => {
    if (costBreakdown.length === 0) {
      alert("No costing summaries available to export!");
      return;
    }
    let csv = "Month,Materials Cost,Labor Cost,Overhead Allocation,Total Production Cost\n";
    costBreakdown.forEach(row => {
      const sum = row.materials + row.labor + row.overhead;
      csv += `${row.month},${row.materials},${row.labor},${row.overhead},${sum}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'Production_Cost_Variance_Analysis.csv');
    a.click();
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl animate-fade-in">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5.5 h-5.5 text-indigo-400" />
            Manufacturing Cost & Variance Analysis
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Track industrial production costs variance splits, labor absorption curves, and factory overhead allocations.
          </p>
        </div>
        <button
          onClick={handleCSVExport}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer border-0"
        >
          <Download className="w-4 h-4" /> Export CSV Spreadsheet
        </button>
      </div>

      {costBreakdown.length === 0 ? (
        <div className="p-20 text-center text-slate-500 border border-dashed border-slate-800 rounded-3xl bg-slate-900/10 flex flex-col items-center justify-center">
          <TrendingUp className="w-16 h-16 text-slate-700 mb-3" />
          <p className="font-extrabold text-sm text-slate-400">No Costing Analysis reports available</p>
          <p className="text-slate-650 text-xs mt-1">Cost curves and overhead absorptions will formulate dynamically when production yields are registered against published BOMs.</p>
        </div>
      ) : (
        <>
          {/* Summary KPI grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="bg-slate-900/35 border border-slate-850 p-5 rounded-2xl backdrop-blur-md flex items-center gap-4 text-left">
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/15">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Total Production Cost</span>
                <span className="text-lg font-black text-white mt-1 block">₹{absoluteTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-slate-900/35 border border-slate-850 p-5 rounded-2xl backdrop-blur-md flex items-center gap-4 text-left">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/15">
                <Calculator className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Materials Absorption</span>
                <span className="text-lg font-black text-white mt-1 block">
                  ₹{totalSummary.materials.toLocaleString()}{' '}
                  <span className="text-[10px] text-emerald-400 font-bold">
                    ({absoluteTotal > 0 ? ((totalSummary.materials / absoluteTotal) * 100).toFixed(1) : 0}%)
                  </span>
                </span>
              </div>
            </div>

            <div className="bg-slate-900/35 border border-slate-850 p-5 rounded-2xl backdrop-blur-md flex items-center gap-4 text-left">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/15">
                <Sliders className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Labor Capital Spent</span>
                <span className="text-lg font-black text-white mt-1 block">
                  ₹{totalSummary.labor.toLocaleString()}{' '}
                  <span className="text-[10px] text-amber-400 font-bold">
                    ({absoluteTotal > 0 ? ((totalSummary.labor / absoluteTotal) * 100).toFixed(1) : 0}%)
                  </span>
                </span>
              </div>
            </div>

            <div className="bg-slate-900/35 border border-slate-850 p-5 rounded-2xl backdrop-blur-md flex items-center gap-4 text-left">
              <div className="p-3 bg-rose-500/10 text-rose-455 rounded-xl border border-rose-500/15">
                <ArrowUpRight className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Overheads Overhead</span>
                <span className="text-lg font-black text-white mt-1 block">
                  ₹{totalSummary.overhead.toLocaleString()}{' '}
                  <span className="text-[10px] text-rose-500">
                    ({absoluteTotal > 0 ? ((totalSummary.overhead / absoluteTotal) * 100).toFixed(1) : 0}%)
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Variance table */}
          <div className="bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-6">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wider mb-4">
              <Layers className="w-4.5 h-4.5 text-indigo-400" />
              Production Costs Distribution & Absorption Curve Logs
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                    <th className="py-2.5 px-3 text-left">Month</th>
                    <th className="py-2.5 px-3 text-center">Materials Cost</th>
                    <th className="py-2.5 px-3 text-center">Labor Cost</th>
                    <th className="py-2.5 px-3 text-center">Overhead Allocated</th>
                    <th className="py-2.5 px-3 text-right">Aggregate Costs</th>
                  </tr>
                </thead>
                <tbody>
                  {costBreakdown.map((row, idx) => {
                    const total = row.materials + row.labor + row.overhead;

                    return (
                      <tr key={idx} className="border-b border-slate-900/50 hover:bg-slate-950/20 transition-colors">
                        <td className="py-3.5 px-3 font-semibold text-slate-200">{row.month}</td>
                        <td className="py-3.5 px-3 text-center font-mono text-slate-400">₹{row.materials.toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-center font-mono text-slate-400">₹{row.labor.toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-center font-mono text-slate-400">₹{row.overhead.toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-white">₹{total.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
