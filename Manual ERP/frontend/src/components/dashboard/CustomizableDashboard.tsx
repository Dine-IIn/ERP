import React, { useState, useEffect } from 'react';
import { LayoutGrid, Settings, DollarSign, Users, Briefcase, Activity, CalendarCheck, Bell, Check, X, ShieldAlert, Award, FileSpreadsheet } from 'lucide-react';

interface CustomizableDashboardProps {
  companyProfile: any;
  companyUsers: any[];
  auditLogs: any[];
  notifications: any[];
  leaveRequests: any[];
  stats: {
    monthlySales: any[];
    totalSalesRevenue: number;
    headcount: number;
    presentCount: number;
    totalSalaryDisbursed: number;
    netSavings: number;
  };
  onApproveLeave: (id: string, notes: string) => Promise<void>;
  onRejectLeave: (id: string, notes: string) => Promise<void>;
  currencySymbol?: string;
}

export default function CustomizableDashboard({
  companyProfile,
  companyUsers,
  auditLogs,
  notifications,
  leaveRequests,
  stats,
  onApproveLeave,
  onRejectLeave,
  currencySymbol = '$'
}: CustomizableDashboardProps) {
  // Customizable Widgets States with localStorage persistence
  const [widgets, setWidgets] = useState({
    kpiCards: true,
    salesPerformance: true,
    recentActivities: true,
    pendingApprovals: true,
    recentNotifications: true
  });

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [activeTheme, setActiveTheme] = useState('glass-indigo');

  useEffect(() => {
    const savedWidgets = localStorage.getItem('dashboard_widgets');
    if (savedWidgets) {
      try {
        setWidgets(JSON.parse(savedWidgets));
      } catch (e) {
        console.error(e);
      }
    }
    const savedTheme = localStorage.getItem('dashboard_theme');
    if (savedTheme) {
      setActiveTheme(savedTheme);
    }
  }, []);

  const toggleWidget = (key: keyof typeof widgets) => {
    const updated = { ...widgets, [key]: !widgets[key] };
    setWidgets(updated);
    localStorage.setItem('dashboard_widgets', JSON.stringify(updated));
  };

  const selectTheme = (themeName: string) => {
    setActiveTheme(themeName);
    localStorage.setItem('dashboard_theme', themeName);
  };

  // Get active leaves pending approvals
  const pendingLeaves = leaveRequests.filter(l => l.status === "PENDING").slice(0, 5);

  const getThemeClass = () => {
    switch (activeTheme) {
      case 'glass-emerald':
        return 'from-emerald-500/20 via-slate-950 to-slate-950 border-emerald-500/20';
      case 'glass-rose':
        return 'from-rose-500/20 via-slate-950 to-slate-950 border-rose-500/20';
      case 'glass-amber':
        return 'from-amber-500/20 via-slate-950 to-slate-950 border-amber-500/20';
      default:
        return 'from-indigo-500/20 via-slate-950 to-slate-950 border-indigo-500/20';
    }
  };

  const getThemeText = () => {
    switch (activeTheme) {
      case 'glass-emerald': return 'text-emerald-400';
      case 'glass-rose': return 'text-rose-400';
      case 'glass-amber': return 'text-amber-400';
      default: return 'text-indigo-400';
    }
  };

  const getThemeButton = () => {
    switch (activeTheme) {
      case 'glass-emerald': return 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20';
      case 'glass-rose': return 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20';
      case 'glass-amber': return 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20';
      default: return 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Premium Welcome Banner */}
      <div className={`relative flex flex-col md:flex-row md:items-center md:justify-between p-5 md:p-8 rounded-3xl border bg-gradient-to-r ${getThemeClass()} backdrop-blur-2xl transition-all duration-500 overflow-hidden`}>
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="z-10 space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wider bg-slate-900/60 rounded-full text-indigo-400 border border-slate-800">
              Enterprise Dashboard
            </span>
          </div>
          <h1 className="text-xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Welcome Back, {companyProfile?.name || 'ERP Tenant'} Console
          </h1>
          <p className="text-slate-400 text-sm max-w-xl">
            Realtime operations monitoring, employee status Punch metrics, cashbook vouchers records, and direct tax worksheets.
          </p>
        </div>
        <div className="z-10 mt-6 md:mt-0 flex gap-3">
          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl active:scale-95 transition-all text-white font-bold text-sm shadow-md"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            Customize Layout
          </button>
        </div>
      </div>

      {/* 1. Customizable KPI Cards */}
      {widgets.kpiCards && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* KPI 1 */}
          <div className="p-6 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl flex items-center justify-between hover:-translate-y-0.5 transition-all">
            <div className="space-y-2">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Corporate Sales Revenue</span>
              <h3 className="text-2xl font-black text-white font-mono">
                {currencySymbol}{stats.totalSalesRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <div className="text-xs text-emerald-400 font-medium">Invoiced & Unpaid combined</div>
            </div>
            <div className="p-4 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/10">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          {/* KPI 2 */}
          <div className="p-6 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl flex items-center justify-between hover:-translate-y-0.5 transition-all">
            <div className="space-y-2">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Disbursed Salaries</span>
              <h3 className="text-2xl font-black text-white font-mono">
                {currencySymbol}{stats.totalSalaryDisbursed?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <div className="text-xs text-rose-400 font-medium">Outflow this calendar month</div>
            </div>
            <div className="p-4 bg-rose-500/10 rounded-xl text-rose-400 border border-rose-500/10">
              <Briefcase className="w-6 h-6" />
            </div>
          </div>

          {/* KPI 3 */}
          <div className="p-6 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl flex items-center justify-between hover:-translate-y-0.5 transition-all">
            <div className="space-y-2">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Cash Surplus (Net)</span>
              <h3 className="text-2xl font-black text-white font-mono">
                {currencySymbol}{stats.netSavings?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <div className="text-xs text-emerald-400 font-medium">Revenues minus expenses</div>
            </div>
            <div className="p-4 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/10">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
          </div>

          {/* KPI 4 */}
          <div className="p-6 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl flex items-center justify-between hover:-translate-y-0.5 transition-all">
            <div className="space-y-2">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Employee Attendance</span>
              <h3 className="text-2xl font-black text-white font-mono">
                {stats.presentCount} <span className="text-sm font-normal text-slate-450">/ {stats.headcount}</span>
              </h3>
              <div className="text-xs text-indigo-400 font-medium">Staff active presenting today</div>
            </div>
            <div className="p-4 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/10">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Main Grid Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Performance Chart Breakdown (CSS-based visual graph) */}
        {widgets.salesPerformance && (
          <div className="lg:col-span-2 p-6 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-md font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-450" />
                Sales Performance Curve (Monthly totals)
              </h3>
              <span className="text-xs text-slate-400 font-medium">Recent 6 Months</span>
            </div>

            {stats.monthlySales && stats.monthlySales.length > 0 ? (
              <div className="space-y-4 pt-2">
                {stats.monthlySales.map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-300">{item.month}</span>
                      <span className="text-white">{currencySymbol}{item.value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    {/* Visual Bar */}
                    <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                      <div
                        style={{ width: `${Math.min(100, (item.value / Math.max(...stats.monthlySales.map(m => m.value || 1))) * 100)}%` }}
                        className={`h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-center">
                <Activity className="w-8 h-8 text-slate-650 mb-2" />
                <p className="text-slate-500 text-sm font-medium">No sales performance curve logged yet</p>
                <p className="text-slate-700 text-xs mt-1">Invoice data from the sales department creates monthly summaries.</p>
              </div>
            )}
          </div>
        )}

        {/* Notifications and Alerts Side Widget */}
        {widgets.recentNotifications && (
          <div className="p-6 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl space-y-4">
            <h3 className="text-md font-bold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-450" />
              Latest System Notifications
            </h3>

            {notifications && notifications.length > 0 ? (
              <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
                {notifications.slice(0, 5).map((noti) => (
                  <div key={noti.id} className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/50 flex gap-2">
                    <span className="p-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 rounded-lg h-fit">
                      <Bell className="w-3.5 h-3.5" />
                    </span>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-slate-200">{noti.title}</h4>
                      <p className="text-[11px] text-slate-450">{noti.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                <Bell className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-sm font-medium">No recent alerts found</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customizable Pending Approvals List */}
        {widgets.pendingApprovals && (
          <div className="lg:col-span-2 p-6 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl space-y-4">
            <h3 className="text-md font-bold text-white flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-indigo-450" />
              HR Department: Pending Leaves approvals
            </h3>

            {pendingLeaves.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px] bg-slate-950/20">
                      <th className="py-2.5 px-4">Employee</th>
                      <th className="py-2.5 px-4">Leave Type</th>
                      <th className="py-2.5 px-4">Dates Duration</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {pendingLeaves.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-800/10 transition-colors">
                        <td className="py-3 px-4 text-slate-250 font-semibold">{l.user?.username || 'Staff'}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 bg-indigo-500/15 border border-indigo-500/20 text-indigo-450 rounded-full font-bold text-[10px]">
                            {l.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-medium">
                          {new Date(l.startDate).toISOString().slice(0,10)} to {new Date(l.endDate).toISOString().slice(0,10)}
                        </td>
                        <td className="py-3 px-4 text-right flex justify-end gap-1.5">
                          <button
                            onClick={() => onApproveLeave(l.id, "Approved from central dashboard widget.")}
                            className="p-1 bg-emerald-500/15 hover:bg-emerald-500 border border-emerald-500/20 text-emerald-400 hover:text-white rounded-lg transition-colors"
                            title="Approve leave"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onRejectLeave(l.id, "Rejected from central dashboard widget.")}
                            className="p-1 bg-red-500/15 hover:bg-red-500 border border-red-500/20 text-red-405 hover:text-white rounded-lg transition-colors"
                            title="Reject leave"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-550 flex flex-col items-center justify-center">
                <Check className="w-8 h-8 text-emerald-450 mb-2" />
                <p className="font-semibold text-sm text-slate-400">All leave requests processed!</p>
                <p className="text-slate-600 text-xs mt-0.5">Pending requests in the HRMS Leave section appear here automatically.</p>
              </div>
            )}
          </div>
        )}

        {/* Recent Audit Activities (Audit Trails log) */}
        {widgets.recentActivities && (
          <div className="p-6 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl space-y-4">
            <h3 className="text-md font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-450" />
              Recent Actions Audit Logs
            </h3>

            {auditLogs && auditLogs.length > 0 ? (
              <div className="space-y-3.5 max-h-60 overflow-y-auto pr-1">
                {auditLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="text-xs border-l-2 border-indigo-500 pl-3 py-0.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{log.username || 'System'}</span>
                      <span className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-450 text-[11px] leading-normal">
                      <span className="px-1 py-0.2 bg-slate-800 text-indigo-400 font-semibold rounded text-[10px] mr-1">
                        {log.actionType}
                      </span>
                      modifying '{log.moduleName}'
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-550">
                <Activity className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-sm font-semibold">No recent audits compiled</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Widget Layout Configurations Modal Overlay */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-indigo-400" />
                Customize Dashboard Layout
              </h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Config Content */}
            <div className="p-6 space-y-6">
              {/* Active Theme Selector */}
              <div className="space-y-2.5">
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Select Dashboard Accent Color</label>
                <div className="grid grid-cols-4 gap-2.5">
                  <button
                    onClick={() => selectTheme('glass-indigo')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${activeTheme === 'glass-indigo' ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'}`}
                  >
                    <span className="w-4 h-4 bg-indigo-500 rounded-full" />
                    <span className="text-[10px] font-bold">Indigo</span>
                  </button>
                  <button
                    onClick={() => selectTheme('glass-emerald')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${activeTheme === 'glass-emerald' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'}`}
                  >
                    <span className="w-4 h-4 bg-emerald-500 rounded-full" />
                    <span className="text-[10px] font-bold">Emerald</span>
                  </button>
                  <button
                    onClick={() => selectTheme('glass-rose')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${activeTheme === 'glass-rose' ? 'bg-rose-500/10 border-rose-500 text-rose-450' : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'}`}
                  >
                    <span className="w-4 h-4 bg-rose-500 rounded-full" />
                    <span className="text-[10px] font-bold">Rose</span>
                  </button>
                  <button
                    onClick={() => selectTheme('glass-amber')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${activeTheme === 'glass-amber' ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'}`}
                  >
                    <span className="w-4 h-4 bg-amber-500 rounded-full" />
                    <span className="text-[10px] font-bold">Amber</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Active Screen Widgets</label>
                <div className="space-y-2.5">
                  <div
                    onClick={() => toggleWidget('kpiCards')}
                    className="p-3.5 bg-slate-950/60 hover:bg-slate-950/90 border border-slate-850 hover:border-slate-800 rounded-xl flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">Summary KPI Cards</span>
                      <span className="text-[10px] text-slate-450 mt-0.5">Sales total, Payroll outflows, and present headcounts</span>
                    </div>
                    <span className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${widgets.kpiCards ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-800 text-transparent'}`}>
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  <div
                    onClick={() => toggleWidget('salesPerformance')}
                    className="p-3.5 bg-slate-950/60 hover:bg-slate-950/90 border border-slate-850 hover:border-slate-800 rounded-xl flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">Sales Performance graph</span>
                      <span className="text-[10px] text-slate-450 mt-0.5">CSS layout monthly visual sales bar indicators</span>
                    </div>
                    <span className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${widgets.salesPerformance ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-800 text-transparent'}`}>
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  <div
                    onClick={() => toggleWidget('recentNotifications')}
                    className="p-3.5 bg-slate-950/60 hover:bg-slate-950/90 border border-slate-850 hover:border-slate-800 rounded-xl flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">System Notifications Alerts</span>
                      <span className="text-[10px] text-slate-450 mt-0.5">Realtime in-app warnings, approvals, and signals</span>
                    </div>
                    <span className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${widgets.recentNotifications ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-800 text-transparent'}`}>
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  <div
                    onClick={() => toggleWidget('pendingApprovals')}
                    className="p-3.5 bg-slate-950/60 hover:bg-slate-950/90 border border-slate-850 hover:border-slate-800 rounded-xl flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">HR Approvals Queues</span>
                      <span className="text-[10px] text-slate-450 mt-0.5">Approve/Reject pending employee leave applications</span>
                    </div>
                    <span className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${widgets.pendingApprovals ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-800 text-transparent'}`}>
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  <div
                    onClick={() => toggleWidget('recentActivities')}
                    className="p-3.5 bg-slate-950/60 hover:bg-slate-950/90 border border-slate-850 hover:border-slate-800 rounded-xl flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">Recent Auditing log list</span>
                      <span className="text-[10px] text-slate-450 mt-0.5">Live action logs showing administrative transactions</span>
                    </div>
                    <span className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${widgets.recentActivities ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-800 text-transparent'}`}>
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-800 flex justify-end bg-slate-950/20">
              <button
                onClick={() => setShowConfigModal(false)}
                className={`px-6 py-2.5 ${getThemeButton()} text-white transition-all text-sm font-bold rounded-xl shadow-lg`}
              >
                Close & Save settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
