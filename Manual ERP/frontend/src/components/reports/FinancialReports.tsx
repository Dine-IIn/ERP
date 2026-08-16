import React from 'react';
import { DollarSign, FileSpreadsheet, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import { openLocalSheet } from '../../utils/localSheetsService';

interface MonthlyCashflow {
  month: string;
  inward: number;
  outward: number;
  net: number;
}

interface FinancialReportData {
  monthlyCashflow: MonthlyCashflow[];
  totalInflow: number;
  totalOutflow: number;
  netSavings: number;
}

interface FinancialReportsProps {
  financialData: FinancialReportData;
  token: string;
  currencySymbol?: string;
}

export default function FinancialReports({
  financialData,
  token,
  currencySymbol = '$',
}: FinancialReportsProps) {
  const handleOpenSheet = () => {
    const dataRows = financialData.monthlyCashflow.map(item => ({
      Month: item.month,
      'Inward Collections': item.inward,
      'Outward Payments': item.outward,
      'Net Cashflow': item.net,
      'Total Inflow': financialData.totalInflow,
      'Total Outflow': financialData.totalOutflow,
      'Net Savings': financialData.netSavings
    }));

    openLocalSheet('financial_report.csv', dataRows);
  };

  const handleOpenCustomerBalancesSheet = () => {
    openLocalSheet('customer_balances.csv', []);
  };

  const handleOpenVendorBalancesSheet = () => {
    openLocalSheet('vendor_balances.csv', []);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-indigo-400" />
            Financial curves & cashflow summaries
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Review company cash inflow collections vs cash outward payments and synchronize local sheets.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleOpenCustomerBalancesSheet}
            className="flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all text-white font-semibold rounded-xl text-xs border-0 cursor-pointer shadow-md"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Customer Balances
          </button>

          <button
            onClick={handleOpenVendorBalancesSheet}
            className="flex items-center justify-center gap-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 active:scale-95 transition-all text-white font-semibold rounded-xl text-xs border-0 cursor-pointer shadow-md"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Vendor Balances
          </button>

          <button
            onClick={handleOpenSheet}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white font-semibold rounded-xl text-xs border-0 cursor-pointer shadow-md"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Cashflow Sheet
          </button>
        </div>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-550 text-[10px] uppercase font-bold tracking-wider">Total Cash Inflow (Receipts)</span>
            <h3 className="text-2xl font-black text-emerald-450 font-mono">+{currencySymbol}{financialData.totalInflow?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          </div>
          <ArrowUpRight className="w-6 h-6 text-emerald-455 bg-emerald-500/10 p-1 rounded-lg border border-emerald-500/10" />
        </div>

        <div className="p-5 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-550 text-[10px] uppercase font-bold tracking-wider">Total Cash Outflow (Expenses)</span>
            <h3 className="text-2xl font-black text-rose-405 font-mono">-{currencySymbol}{financialData.totalOutflow?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          </div>
          <ArrowDownRight className="w-6 h-6 text-rose-405 bg-rose-500/10 p-1 rounded-lg border border-rose-500/10" />
        </div>

        <div className="p-5 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl flex items-center justify-between border-indigo-500/20 bg-indigo-500/5">
          <div className="space-y-1">
            <span className="text-slate-550 text-[10px] uppercase font-bold tracking-wider">Corporate savings / surplus</span>
            <h3 className="text-2xl font-black text-white font-mono">{currencySymbol}{financialData.netSavings?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          </div>
          <TrendingUp className="w-6 h-6 text-indigo-400 bg-indigo-500/10 p-1 rounded-lg border border-indigo-500/10" />
        </div>
      </div>

      {/* Cashflow comparative graph */}
      <div className="p-6 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
          Comparative Cash Inflow vs Outflow bars
        </h3>

        {financialData.monthlyCashflow && financialData.monthlyCashflow.length > 0 ? (
          <div className="space-y-6 pt-2">
            {financialData.monthlyCashflow.map((item, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-300 font-bold">{item.month}</span>
                  <div className="space-x-4 flex font-mono text-[11px]">
                    <span className="text-emerald-450">Inward: +{currencySymbol}{item.inward}</span>
                    <span className="text-rose-450">Outward: -{currencySymbol}{item.outward}</span>
                  </div>
                </div>
                {/* Visual Bar Comparison */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900 flex justify-end">
                    <div
                      style={{ width: `${Math.min(100, (item.inward / Math.max(...financialData.monthlyCashflow.map(c => c.inward || 1))) * 100)}%` }}
                      className="h-full bg-emerald-500 rounded-full"
                    />
                  </div>
                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                    <div
                      style={{ width: `${Math.min(100, (item.outward / Math.max(...financialData.monthlyCashflow.map(c => c.outward || 1))) * 100)}%` }}
                      className="h-full bg-rose-500 rounded-full"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-550 flex flex-col items-center justify-center">
            <TrendingUp className="w-8 h-8 text-slate-700 mb-2" />
            <p className="font-semibold text-xs">No monthly cashflow data registered</p>
          </div>
        )}
      </div>
    </div>
  );
}
