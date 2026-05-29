import React, { useState, useEffect } from 'react';
import { BarChart4, Download, Layers, ShieldCheck, AlertTriangle, PlayCircle, TrendingUp, CheckCircle } from 'lucide-react';

interface ManufacturingReportsProps {
  token?: string;
}

export default function ManufacturingReports({ token }: ManufacturingReportsProps) {
  const [monthlyYields, setMonthlyYields] = useState<any[]>([]);
  const [totals, setTotals] = useState({ planned: 0, completed: 0, scrap: 0 });

  useEffect(() => {
    const logs = localStorage.getItem('erp_logs');
    if (logs) {
      const parsedLogs = JSON.parse(logs);
      
      // Group by month
      const grouped: Record<string, { month: string; planned: number; completed: number; scrap: number }> = {};
      
      parsedLogs.forEach((log: any) => {
        const date = new Date(log.dateLog || Date.now());
        const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        
        if (!grouped[monthKey]) {
          grouped[monthKey] = {
            month: monthKey,
            planned: 0,
            completed: 0,
            scrap: 0
          };
        }
        
        grouped[monthKey].planned += log.qtyTarget || 0;
        grouped[monthKey].completed += log.qtyCompleted || 0;
        grouped[monthKey].scrap += log.qtyScrapped || 0;
      });

      const list = Object.values(grouped);
      setMonthlyYields(list);

      const sums = list.reduce(
        (acc, cur) => ({
          planned: acc.planned + cur.planned,
          completed: acc.completed + cur.completed,
          scrap: acc.scrap + cur.scrap
        }),
        { planned: 0, completed: 0, scrap: 0 }
      );
      setTotals(sums);
    }
  }, []);

  const handleCSVExport = () => {
    if (monthlyYields.length === 0) {
      alert("No production logs available to export!");
      return;
    }
    let csv = "Month,Planned Target,Completed Yield,Scrap Quantity\n";
    monthlyYields.forEach(row => {
      csv += `${row.month},${row.planned},${row.completed},${row.scrap}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'BOM_Production_Yield_Reports.csv');
    a.click();
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl animate-fade-in">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart4 className="w-5.5 h-5.5 text-indigo-400" />
            Manufacturing & Production Reports
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Analyze monthly factory runs schedules, target completion progress curves, and defects logs.
          </p>
        </div>
        <button
          onClick={handleCSVExport}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer border-0"
        >
          <Download className="w-4 h-4" /> Export CSV Spreadsheet
        </button>
      </div>

      {monthlyYields.length === 0 ? (
        <div className="p-20 text-center text-slate-500 border border-dashed border-slate-800 rounded-3xl bg-slate-900/10 flex flex-col items-center justify-center">
          <BarChart4 className="w-16 h-16 text-slate-700 mb-3" />
          <p className="font-extrabold text-sm text-slate-400">No Production Yield reports available</p>
          <p className="text-slate-600 text-xs mt-1">Audit reports will compile dynamically once outputs yields are logged on shop floors.</p>
        </div>
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-slate-900/35 border border-slate-850 p-5 rounded-2xl backdrop-blur-md flex items-center gap-4 text-left">
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/15">
                <PlayCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Planned Target Runs</span>
                <span className="text-xl font-black text-white mt-1 block">{totals.planned} units</span>
              </div>
            </div>

            <div className="bg-slate-900/35 border border-slate-850 p-5 rounded-2xl backdrop-blur-md flex items-center gap-4 text-left">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/15">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Completed Output Yield</span>
                <span className="text-xl font-black text-white mt-1 block">
                  {totals.completed} units{' '}
                  <span className="text-[10px] text-emerald-400 font-bold">
                    ({totals.planned > 0 ? ((totals.completed / totals.planned) * 100).toFixed(1) : 0}%)
                  </span>
                </span>
              </div>
            </div>

            <div className="bg-slate-900/35 border border-slate-850 p-5 rounded-2xl backdrop-blur-md flex items-center gap-4 text-left">
              <div className="p-3 bg-rose-500/10 text-rose-455 rounded-xl border border-rose-500/15">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Scrapped Defects Lot</span>
                <span className="text-xl font-black text-white mt-1 block">
                  {totals.scrap} units{' '}
                  <span className="text-[10px] text-rose-500">
                    ({totals.completed > 0 ? ((totals.scrap / totals.completed) * 100).toFixed(1) : 0}% scrap)
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Main Analytics Table */}
          <div className="bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-6">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wider mb-4">
              <Layers className="w-4.5 h-4.5 text-indigo-400" />
              Monthly Shop Floor Output & Defect Ratios Summary
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                    <th className="py-2.5 px-3 text-left">Month</th>
                    <th className="py-2.5 px-3 text-center">Planned Target</th>
                    <th className="py-2.5 px-3 text-center">Completed Output</th>
                    <th className="py-2.5 px-3 text-center">Yield Success %</th>
                    <th className="py-2.5 px-3 text-right">Scrap Rate %</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyYields.map((row, idx) => {
                    const yieldPercent = row.planned > 0 ? (row.completed / row.planned) * 100 : 0;
                    const scrapPercent = row.completed > 0 ? (row.scrap / row.completed) * 100 : 0;

                    return (
                      <tr key={idx} className="border-b border-slate-900/50 hover:bg-slate-950/20 transition-colors">
                        <td className="py-3.5 px-3 font-semibold text-slate-200">{row.month}</td>
                        <td className="py-3.5 px-3 text-center font-mono text-slate-400">{row.planned} units</td>
                        <td className="py-3.5 px-3 text-center font-mono text-slate-200">{row.completed} units</td>
                        <td className="py-3.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-mono font-bold text-emerald-400">{yieldPercent.toFixed(1)}%</span>
                            <div className="w-16 bg-slate-900 rounded-full h-1 overflow-hidden">
                              <div className="bg-emerald-500 h-full" style={{ width: `${yieldPercent}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-rose-500">{scrapPercent.toFixed(2)}%</td>
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
