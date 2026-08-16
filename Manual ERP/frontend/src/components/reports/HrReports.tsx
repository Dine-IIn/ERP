import React from 'react';
import { Users, FileSpreadsheet, ShieldCheck, Clock, Award, DollarSign } from 'lucide-react';
import { openLocalSheet } from '../../utils/localSheetsService';

interface HrReportData {
  headcount: number;
  presentCount: number;
  lateCount: number;
  totalWorkedHours: number;
  totalSalaryDisbursed: number;
}

interface HrReportsProps {
  hrData: HrReportData;
  token: string;
  currencySymbol?: string;
}

export default function HrReports({
  hrData,
  token,
  currencySymbol = '$',
}: HrReportsProps) {
  const handleOpenSheet = () => {
    const dataRows = [{
      Headcount: hrData.headcount,
      'Present Count': hrData.presentCount,
      'Late Count': hrData.lateCount,
      'Total Worked Hours': hrData.totalWorkedHours,
      'Total Salary Disbursed': hrData.totalSalaryDisbursed
    }];

    openLocalSheet('hr_report.csv', dataRows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            Human Resources (HR) Analytics
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Review corporate headcount stats, presents vs lates punch ratios, salaries registers, and synchronize local sheets.
          </p>
        </div>
        <button
          onClick={handleOpenSheet}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 active:scale-95 transition-all text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 text-xs"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Open HR Sheet
        </button>
      </div>

      {/* Summary Matrix Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl flex justify-between items-center">
          <div className="space-y-1">
            <span className="text-slate-550 text-[10px] uppercase font-bold tracking-wider">Active headcount</span>
            <h3 className="text-2xl font-black text-white font-mono">{hrData.headcount} <span className="text-xs text-slate-500 font-semibold font-sans">employees</span></h3>
          </div>
          <Users className="w-6 h-6 text-indigo-400 bg-indigo-500/10 p-1 rounded-lg border border-indigo-500/10" />
        </div>

        <div className="p-5 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl flex justify-between items-center">
          <div className="space-y-1">
            <span className="text-slate-550 text-[10px] uppercase font-bold tracking-wider">Worked Hours Logged</span>
            <h3 className="text-2xl font-black text-indigo-400 font-mono">{hrData.totalWorkedHours} <span className="text-xs text-slate-500 font-semibold font-sans">hrs</span></h3>
          </div>
          <Clock className="w-6 h-6 text-indigo-400 bg-indigo-500/10 p-1 rounded-lg border border-indigo-500/10" />
        </div>

        <div className="p-5 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl flex justify-between items-center">
          <div className="space-y-1">
            <span className="text-slate-555 text-[10px] uppercase font-bold tracking-wider">Disbursed Wages (Sum)</span>
            <h3 className="text-2xl font-black text-white font-mono">{currencySymbol}{hrData.totalSalaryDisbursed?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          </div>
          <DollarSign className="w-6 h-6 text-emerald-450 bg-emerald-500/10 p-1 rounded-lg border border-emerald-500/10" />
        </div>

        <div className="p-5 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl flex justify-between items-center">
          <div className="space-y-1">
            <span className="text-slate-550 text-[10px] uppercase font-bold tracking-wider">Tardiness: Lates today</span>
            <h3 className="text-2xl font-black text-rose-450 font-mono">{hrData.lateCount} <span className="text-xs text-slate-500 font-semibold font-sans">logs</span></h3>
          </div>
          <ShieldCheck className="w-6 h-6 text-rose-450 bg-rose-500/10 p-1 rounded-lg border border-rose-500/10" />
        </div>
      </div>

      {/* Presents ratio dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            Attendance presenters ratio today
          </h3>
          <p className="text-slate-500 text-xs leading-relaxed">
            Active corporate ratio tracking checks-in against total company headcount registers.
          </p>

          <div className="p-5 bg-slate-950/40 border border-slate-850 rounded-xl flex items-center justify-center flex-col text-center space-y-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Present Ratio</span>
            <h4 className="text-3xl font-black text-indigo-455 font-mono">
              {hrData.headcount > 0 ? Math.round((hrData.presentCount / hrData.headcount) * 100) : 0}%
            </h4>
            <span className="text-[10px] text-slate-400 font-medium">Of employees punched check-in</span>
          </div>
        </div>

        <div className="p-6 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            Wages commitment averages
          </h3>
          <p className="text-slate-500 text-xs leading-relaxed">
            Corporate overview calculating wage outflows and averages.
          </p>

          <div className="p-5 bg-slate-950/40 border border-slate-850 rounded-xl flex items-center justify-center flex-col text-center space-y-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Average wage payout</span>
            <h4 className="text-3xl font-black text-emerald-450 font-mono">
              {currencySymbol}{hrData.headcount > 0 ? Math.round((hrData.totalSalaryDisbursed / hrData.headcount) * 100) / 100 : 0}
            </h4>
            <span className="text-[10px] text-slate-400 font-medium">Disbursed salary per capita</span>
          </div>
        </div>
      </div>
    </div>
  );
}
