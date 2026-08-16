import React from 'react';
import { ShoppingBag, FileSpreadsheet, TrendingUp, HelpCircle, CheckCircle, Clock } from 'lucide-react';
import { openLocalSheet } from '../../utils/localSheetsService';

interface PurchaseReportData {
  monthlyPurchases: { month: string; value: number }[];
  totalPurchasesValuation: number;
  pendingCount: number;
  completedCount: number;
  purchaseCount: number;
}

interface PurchaseReportsProps {
  purchaseData: PurchaseReportData;
  token: string;
  currencySymbol?: string;
}

export default function PurchaseReports({
  purchaseData,
  token,
  currencySymbol = '$',
}: PurchaseReportsProps) {
  const handleOpenSheet = () => {
    const dataRows = purchaseData.monthlyPurchases.map(item => ({
      Month: item.month,
      'Purchases Value': item.value,
      'Total Purchases Valuation': purchaseData.totalPurchasesValuation,
      'Purchase Order Count': purchaseData.purchaseCount,
      'Completed Orders': purchaseData.completedCount,
      'Pending Orders': purchaseData.pendingCount
    }));

    openLocalSheet('purchase_report.csv', dataRows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-indigo-400" />
            Purchases & Procurement Analytics
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Review company PO commitments, outstanding balances, and synchronize local sheets.
          </p>
        </div>
        <button
          onClick={handleOpenSheet}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 active:scale-95 transition-all text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 text-xs"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Open Purchases Sheet
        </button>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl space-y-1">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Total Purchase commitments</span>
          <h3 className="text-2xl font-black text-white font-mono">{currencySymbol}{purchaseData.totalPurchasesValuation?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
        </div>

        <div className="p-5 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl space-y-1 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Total POs Dispatched</span>
            <h3 className="text-2xl font-black text-white font-mono">{purchaseData.purchaseCount}</h3>
          </div>
          <HelpCircle className="w-6 h-6 text-indigo-400 bg-indigo-500/10 p-1 rounded-lg border border-indigo-500/10" />
        </div>

        <div className="p-5 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl space-y-1 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Approved POs</span>
            <h3 className="text-2xl font-black text-emerald-450 font-mono">{purchaseData.completedCount}</h3>
          </div>
          <CheckCircle className="w-6 h-6 text-emerald-450 bg-emerald-500/10 p-1 rounded-lg border border-emerald-500/10" />
        </div>

        <div className="p-5 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl space-y-1 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Draft / Pending POs</span>
            <h3 className="text-2xl font-black text-rose-405 font-mono">{purchaseData.pendingCount}</h3>
          </div>
          <Clock className="w-6 h-6 text-rose-405 bg-rose-500/10 p-1 rounded-lg border border-rose-500/10" />
        </div>
      </div>

      {/* Curves and charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly bar graph */}
        <div className="lg:col-span-2 p-6 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-indigo-450" />
            Monthly Procurement spending Curve
          </h3>

          {purchaseData.monthlyPurchases && purchaseData.monthlyPurchases.length > 0 ? (
            <div className="space-y-4 pt-2">
              {purchaseData.monthlyPurchases.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-300 font-bold">{item.month}</span>
                    <span className="text-white font-mono">{currencySymbol}{item.value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                    <div
                      style={{ width: `${Math.min(100, (item.value / Math.max(...purchaseData.monthlyPurchases.map(m => m.value || 1))) * 100)}%` }}
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-550 flex flex-col items-center justify-center">
              <TrendingUp className="w-8 h-8 text-slate-700 mb-2" />
              <p className="font-semibold text-xs">No monthly purchase data logged</p>
            </div>
          )}
        </div>

        {/* Analytics details */}
        <div className="p-6 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white">Sourcing approvals ratio</h3>
          <p className="text-slate-500 text-xs leading-relaxed">
            Corporate overview calculating PO authorization settlement rates.
          </p>

          <div className="p-5 bg-slate-950/40 border border-slate-850 rounded-xl flex items-center justify-center flex-col text-center space-y-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Approved Ratio</span>
            <h4 className="text-3xl font-black text-indigo-455 font-mono">
              {purchaseData.purchaseCount > 0 ? Math.round((purchaseData.completedCount / purchaseData.purchaseCount) * 100) : 0}%
            </h4>
            <span className="text-[10px] text-slate-400 font-medium">Purchase orders active approved</span>
          </div>
        </div>
      </div>
    </div>
  );
}
