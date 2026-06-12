import React, { useState, useEffect } from 'react';
import { LayoutGrid, Settings, DollarSign, Users, Briefcase, Activity, CalendarCheck, Bell, Check, X, ShieldAlert, Award, FileSpreadsheet, Plus, Trash2, Edit2 } from 'lucide-react';
import { apiClient } from '../../utils/apiService';

interface DashboardWidget {
  id: string;
  title: string;
  source: 'SALES_REV' | 'SALES_COUNT' | 'STOCK_ITEMS' | 'CRM_LEADS' | 'HRMS_USERS' | 'MFG_JOBS' | 'FINANCE_OUTFLOW';
  type: 'KPI' | 'LIST' | 'CHART';
  width: 1 | 2 | 3; // Grid columns
  height: 1 | 2; // Grid rows
  color: 'indigo' | 'emerald' | 'rose' | 'amber' | 'slate';
}

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

  // Real-time lists passed from App.tsx
  productsList?: any[];
  salesOrdersList?: any[];
  salesInvoicesList?: any[];
  leadsList?: any[];
}

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'w-1', title: 'Corporate Sales Revenue', source: 'SALES_REV', type: 'KPI', width: 1, height: 1, color: 'indigo' },
  { id: 'w-2', title: 'Disbursed Salaries', source: 'FINANCE_OUTFLOW', type: 'KPI', width: 1, height: 1, color: 'rose' },
  { id: 'w-3', title: 'Total Lead Count', source: 'CRM_LEADS', type: 'KPI', width: 1, height: 1, color: 'amber' },
  { id: 'w-4', title: 'Present Employees', source: 'HRMS_USERS', type: 'KPI', width: 1, height: 1, color: 'emerald' },
  { id: 'w-5', title: 'Sales Performance Curve', source: 'SALES_REV', type: 'CHART', width: 2, height: 1, color: 'indigo' },
  { id: 'w-6', title: 'Latest Lead Registrations', source: 'CRM_LEADS', type: 'LIST', width: 1, height: 1, color: 'amber' }
];

export default function CustomizableDashboard({
  companyProfile,
  companyUsers,
  auditLogs,
  notifications,
  leaveRequests,
  stats,
  onApproveLeave,
  onRejectLeave,
  currencySymbol = '$',
  productsList = [],
  salesOrdersList = [],
  salesInvoicesList = [],
  leadsList = []
}: CustomizableDashboardProps) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [activeTheme, setActiveTheme] = useState('glass-indigo');

  // Add Widget Form State
  const [newTitle, setNewTitle] = useState('');
  const [newSource, setNewSource] = useState<DashboardWidget['source']>('SALES_REV');
  const [newType, setNewType] = useState<DashboardWidget['type']>('KPI');
  const [newWidth, setNewWidth] = useState<1 | 2 | 3>(1);
  const [newHeight, setNewHeight] = useState<1 | 2>(1);
  const [newColor, setNewColor] = useState<DashboardWidget['color']>('indigo');

  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);

  const startEditWidget = (w: DashboardWidget) => {
    setEditingWidgetId(w.id);
    setNewTitle(w.title);
    setNewSource(w.source);
    setNewType(w.type);
    setNewWidth(w.width);
    setNewHeight(w.height);
    setNewColor(w.color);
    setShowConfigModal(true);
  };

  const cancelEditWidget = () => {
    setEditingWidgetId(null);
    setNewTitle('');
    setNewSource('SALES_REV');
    setNewType('KPI');
    setNewWidth(1);
    setNewHeight(1);
    setNewColor('indigo');
  };

  // Manufacturing job cards list loaded dynamically if needed
  const [mfgJobs, setMfgJobs] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('dashboard_custom_widgets');
    if (saved) {
      try {
        setWidgets(JSON.parse(saved));
      } catch (e) {
        setWidgets(DEFAULT_WIDGETS);
      }
    } else {
      setWidgets(DEFAULT_WIDGETS);
    }

    const savedTheme = localStorage.getItem('dashboard_theme');
    if (savedTheme) {
      setActiveTheme(savedTheme);
    }
  }, []);

  // Fetch job cards if MFG source is chosen
  useEffect(() => {
    const hasMfg = widgets.some(w => w.source === 'MFG_JOBS');
    if (hasMfg && mfgJobs.length === 0) {
      apiClient.get<{ jobCards: any[] }>('/api/manufacturing/job-cards')
        .then(res => setMfgJobs(res.jobCards || []))
        .catch(err => console.error("Failed to fetch jobs for dashboard:", err));
    }
  }, [widgets, mfgJobs.length]);

  const selectTheme = (themeName: string) => {
    setActiveTheme(themeName);
    localStorage.setItem('dashboard_theme', themeName);
  };

  const handleSaveWidget = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingWidgetId) {
      const updated = widgets.map(w => {
        if (w.id === editingWidgetId) {
          return {
            ...w,
            title: newTitle.trim() || 'Custom Metric Card',
            source: newSource,
            type: newType,
            width: newWidth,
            height: newHeight,
            color: newColor
          };
        }
        return w;
      });
      setWidgets(updated);
      localStorage.setItem('dashboard_custom_widgets', JSON.stringify(updated));
      setEditingWidgetId(null);
    } else {
      const newWidget: DashboardWidget = {
        id: `w-${Date.now()}`,
        title: newTitle.trim() || 'Custom Metric Card',
        source: newSource,
        type: newType,
        width: newWidth,
        height: newHeight,
        color: newColor
      };
      const updated = [...widgets, newWidget];
      setWidgets(updated);
      localStorage.setItem('dashboard_custom_widgets', JSON.stringify(updated));
    }

    // Reset Form
    setNewTitle('');
    setNewSource('SALES_REV');
    setNewType('KPI');
    setNewWidth(1);
    setNewHeight(1);
    setNewColor('indigo');
  };

  const handleDeleteWidget = (id: string) => {
    const updated = widgets.filter(w => w.id !== id);
    setWidgets(updated);
    localStorage.setItem('dashboard_custom_widgets', JSON.stringify(updated));
  };

  const handleMoveWidget = (index: number, direction: number) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= widgets.length) return;
    const updated = [...widgets];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setWidgets(updated);
    localStorage.setItem('dashboard_custom_widgets', JSON.stringify(updated));
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'emerald':
        return {
          bg: 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/50',
          text: 'text-emerald-400',
          border: 'border-emerald-500/20',
          badge: 'bg-emerald-500/10 text-emerald-450 border-emerald-500/15',
          btn: 'bg-emerald-600 hover:bg-emerald-500 text-white'
        };
      case 'rose':
        return {
          bg: 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/50',
          text: 'text-rose-455',
          border: 'border-rose-500/20',
          badge: 'bg-rose-500/10 text-rose-450 border-rose-500/15',
          btn: 'bg-rose-600 hover:bg-rose-500 text-white'
        };
      case 'amber':
        return {
          bg: 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/50',
          text: 'text-amber-400',
          border: 'border-amber-500/20',
          badge: 'bg-amber-500/10 text-amber-450 border-amber-500/15',
          btn: 'bg-amber-600 hover:bg-amber-500 text-white'
        };
      case 'slate':
        return {
          bg: 'bg-slate-500/5 border-slate-500/20 hover:border-slate-500/50',
          text: 'text-slate-400',
          border: 'border-slate-500/20',
          badge: 'bg-slate-500/10 text-slate-450 border-slate-500/15',
          btn: 'bg-slate-600 hover:bg-slate-500 text-white'
        };
      default: // indigo
        return {
          bg: 'bg-indigo-500/5 border-indigo-500/20 hover:border-indigo-500/50',
          text: 'text-indigo-400',
          border: 'border-indigo-500/20',
          badge: 'bg-indigo-500/10 text-indigo-450 border-indigo-500/15',
          btn: 'bg-indigo-600 hover:bg-indigo-500 text-white'
        };
    }
  };

  // Compute live card values
  const renderWidgetContent = (w: DashboardWidget) => {
    const colors = getColorClasses(w.color);
    
    // 1. KPI Visualizations
    if (w.type === 'KPI') {
      let valueDisplay = '';
      let subtitle = '';

      switch (w.source) {
        case 'SALES_REV':
          const revVal = salesInvoicesList.reduce((sum, i) => sum + (i.total || 0), 0) || stats.totalSalesRevenue || 0.00;
          valueDisplay = `${currencySymbol}${revVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
          subtitle = 'Dynamic sales invoice invoice value';
          break;
        case 'SALES_COUNT':
          valueDisplay = `${salesOrdersList.length} Orders`;
          subtitle = 'Total customer sales orders drafted';
          break;
        case 'STOCK_ITEMS':
          valueDisplay = `${productsList.length} Items`;
          subtitle = 'Unique catalog item configurations';
          break;
        case 'CRM_LEADS':
          valueDisplay = `${leadsList.length} Leads`;
          subtitle = 'Client conversions pipeline leads';
          break;
        case 'HRMS_USERS':
          valueDisplay = `${stats.presentCount} / ${stats.headcount}`;
          subtitle = 'Staff attendance checks present today';
          break;
        case 'MFG_JOBS':
          valueDisplay = `${mfgJobs.length} Jobs`;
          subtitle = 'Assembly operations currently dispatched';
          break;
        case 'FINANCE_OUTFLOW':
          const salaries = stats.totalSalaryDisbursed || 0;
          valueDisplay = `${currencySymbol}${salaries.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
          subtitle = 'Outflow this calendar month';
          break;
      }

      return (
        <div className="flex flex-col justify-between h-full text-left space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">{w.title}</span>
            <div className={`text-2xl font-black font-mono tracking-tight ${colors.text}`}>{valueDisplay}</div>
          </div>
          <div className="text-[9px] font-medium text-slate-500">{subtitle}</div>
        </div>
      );
    }

    // 2. Listing Tables
    if (w.type === 'LIST') {
      let rows: any[] = [];
      let headers: string[] = [];
      let renderRow: (item: any, idx: number) => React.ReactNode = () => null;
      const maxRows = w.height === 2 ? 8 : 4;

      switch (w.source) {
        case 'CRM_LEADS':
          rows = leadsList.slice(0, maxRows);
          headers = ['Lead Name', 'Company', 'Rating'];
          renderRow = (item, idx) => (
            <tr key={idx} className="border-b border-slate-900/40 last:border-0 hover:bg-slate-950/20 text-[10px]">
              <td className="py-2.5 font-bold text-slate-200">{item.leadName || 'Unnamed'}</td>
              <td className="py-2.5 text-slate-400">{item.company || 'N/A'}</td>
              <td className="py-2.5 text-right"><span className="px-1.5 py-0.5 bg-amber-550/10 text-amber-400 border border-amber-500/20 rounded font-bold">{item.leadRating || 'Cold'}</span></td>
            </tr>
          );
          break;
        case 'STOCK_ITEMS':
          rows = productsList.filter(p => (p.quantity || 0) <= (p.reorderLevel || 5.0)).slice(0, maxRows);
          headers = ['Product SKU', 'Reorder Level', 'Stock Qty'];
          renderRow = (item, idx) => (
            <tr key={idx} className="border-b border-slate-900/40 last:border-0 hover:bg-slate-950/20 text-[10px]">
              <td className="py-2.5 font-bold text-slate-200">{item.sku || 'N/A'}</td>
              <td className="py-2.5 text-slate-400">{item.reorderLevel ?? 5} {item.uom || 'PCS'}</td>
              <td className="py-2.5 text-right font-mono text-rose-400 font-bold">{item.quantity || 0}</td>
            </tr>
          );
          break;
        case 'MFG_JOBS':
          rows = mfgJobs.slice(0, maxRows);
          headers = ['Routing Process', 'Target Qty', 'Status'];
          renderRow = (item, idx) => (
            <tr key={idx} className="border-b border-slate-900/40 last:border-0 hover:bg-slate-950/20 text-[10px]">
              <td className="py-2.5 font-bold text-slate-200">{item.operationName || 'Operation'}</td>
              <td className="py-2.5 text-slate-400 font-mono">{item.qtyTarget} PCS</td>
              <td className="py-2.5 text-right"><span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-bold uppercase">{item.status}</span></td>
            </tr>
          );
          break;
        case 'SALES_COUNT':
          rows = salesOrdersList.slice(0, maxRows);
          headers = ['SO No', 'Client Account', 'Status'];
          renderRow = (item, idx) => (
            <tr key={idx} className="border-b border-slate-900/40 last:border-0 hover:bg-slate-950/20 text-[10px]">
              <td className="py-2.5 font-bold font-mono text-indigo-400">{item.orderNo}</td>
              <td className="py-2.5 text-slate-400 truncate max-w-[80px]">{item.customer?.name || 'Customer'}</td>
              <td className="py-2.5 text-right"><span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded font-bold text-[8px] uppercase">{item.status}</span></td>
            </tr>
          );
          break;
        default:
          // Default fall back to audit logs
          rows = auditLogs.slice(0, maxRows);
          headers = ['Username', 'Module', 'Action'];
          renderRow = (item, idx) => (
            <tr key={idx} className="border-b border-slate-900/40 last:border-0 hover:bg-slate-950/20 text-[10px]">
              <td className="py-2.5 font-bold text-slate-200">{item.username || 'System'}</td>
              <td className="py-2.5 text-slate-400 font-bold">{item.moduleName}</td>
              <td className="py-2.5 text-right text-indigo-400">{item.actionType}</td>
            </tr>
          );
          break;
      }

      return (
        <div className="flex flex-col justify-between h-full text-left space-y-3">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block border-b border-slate-800 pb-1">{w.title}</span>
          <div className="flex-1 overflow-x-auto min-h-0">
            {rows.length > 0 ? (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-500 font-extrabold uppercase text-[7.5px] border-b border-slate-900/60 pb-1">
                    {headers.map((h, i) => <th key={i} className={i === headers.length - 1 ? 'text-right py-1' : 'py-1'}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => renderRow(row, idx))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <ShieldAlert className="w-5 h-5 text-slate-700 mb-1" />
                <span className="text-[9px] text-slate-500 italic">No real-time records mapped</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    // 3. Performance Curves (Simple Charts)
    if (w.type === 'CHART') {
      const salesPoints = stats.monthlySales || [
        { month: 'Jan', value: 12000 },
        { month: 'Feb', value: 19000 },
        { month: 'Mar', value: 32000 },
        { month: 'Apr', value: 15000 },
        { month: 'May', value: 28000 },
        { month: 'Jun', value: 45000 }
      ];

      return (
        <div className="flex flex-col justify-between h-full text-left space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">{w.title}</span>
            <span className="text-[8px] text-slate-550">Dynamic performance totals</span>
          </div>

          <div className="flex-1 flex items-end justify-between gap-3 pt-4 min-h-0">
            {salesPoints.map((item, idx) => {
              const maxVal = Math.max(...salesPoints.map(m => m.value || 1));
              const percent = Math.min(100, Math.max(12, (item.value / maxVal) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div className="text-[8px] font-bold font-mono text-slate-450">${Math.round(item.value / 1000)}k</div>
                  <div className="w-full bg-slate-950 border border-slate-900 rounded-lg overflow-hidden flex-1 min-h-[48px] relative flex items-end">
                    <div
                      style={{ height: `${percent}%` }}
                      className={`w-full rounded-t-sm bg-gradient-to-t from-indigo-600 to-indigo-400`}
                    />
                  </div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase">{item.month}</div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6 select-none">
      {/* Grid Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ gridAutoRows: '200px' }}>
        {widgets.map((w, idx) => {
          const colors = getColorClasses(w.color);
          return (
            <div
              key={w.id}
              className={`p-6 border rounded-2xl flex flex-col justify-between hover:-translate-y-0.5 transition-all relative group h-full ${
                w.width === 3 ? 'md:col-span-3 col-span-1' : w.width === 2 ? 'md:col-span-2 col-span-1' : 'col-span-1'
              } ${
                w.height === 2 ? 'row-span-2' : 'row-span-1'
              } ${colors.bg}`}
            >
              {/* Card inline hover controls */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-lg p-1 z-10">
                <button
                  onClick={() => handleMoveWidget(idx, -1)}
                  disabled={idx === 0}
                  className="p-1 hover:bg-slate-850 text-slate-400 hover:text-indigo-400 rounded transition-all cursor-pointer border-0 bg-transparent disabled:opacity-30 disabled:pointer-events-none text-xs leading-none"
                  title="Move Up/Left"
                >
                  ▲
                </button>
                <button
                  onClick={() => handleMoveWidget(idx, 1)}
                  disabled={idx === widgets.length - 1}
                  className="p-1 hover:bg-slate-850 text-slate-400 hover:text-indigo-400 rounded transition-all cursor-pointer border-0 bg-transparent disabled:opacity-30 disabled:pointer-events-none text-xs leading-none"
                  title="Move Down/Right"
                >
                  ▼
                </button>
                <button
                  onClick={() => startEditWidget(w)}
                  className="p-1 hover:bg-slate-850 text-slate-400 hover:text-indigo-400 rounded transition-all cursor-pointer border-0 bg-transparent"
                  title="Edit Card Layout"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteWidget(w.id)}
                  className="p-1 hover:bg-slate-855 text-slate-400 hover:text-rose-455 rounded transition-all cursor-pointer border-0 bg-transparent"
                  title="Delete Card"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {renderWidgetContent(w)}
            </div>
          );
        })}
      </div>

      {/* Customize Button at the bottom */}
      <div className="flex justify-end pt-6">
        <button
          onClick={() => setShowConfigModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900/60 hover:bg-slate-850 border border-slate-800 hover:border-slate-700/80 backdrop-blur-xl active:scale-95 transition-all text-slate-300 hover:text-white font-semibold rounded-xl shadow-lg cursor-pointer"
        >
          <Settings className="w-4 h-4 text-indigo-400 animate-spin-slow" />
          Customize Layout Studio
        </button>
      </div>

      {/* Configuration Customizer Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md text-left text-white">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/20 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-indigo-400" />
                  Customizable Dashboard Layout Studio
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">Add custom widget cards, choose color schemes, sizes, and map dynamic target data streams.</p>
              </div>
              <button
                onClick={() => {
                  setShowConfigModal(false);
                  cancelEditWidget();
                }}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer bg-transparent border-0 font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content split container */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
              
              {/* Left Column: Custom Widget Form (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <span className="text-[9px] font-extrabold text-indigo-400 uppercase tracking-widest block border-b border-slate-800 pb-1.5">
                  {editingWidgetId ? 'Edit Custom Widget' : 'Add Custom Widget'}
                </span>
                
                <form onSubmit={handleSaveWidget} className="space-y-4">
                  {/* Card Title */}
                  <div className="space-y-1">
                    <label className="text-[8.5px] font-bold text-slate-400 uppercase">Card Title *</label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 py-2 px-3 rounded-xl text-xs text-white focus:outline-none"
                      placeholder="e.g. Active Dispatch Counts"
                    />
                  </div>

                  {/* Target Source */}
                  <div className="space-y-1">
                    <label className="text-[8.5px] font-bold text-slate-400 uppercase">Target Metric Source</label>
                    <select
                      value={newSource}
                      onChange={e => setNewSource(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 py-2 px-3 rounded-xl text-xs text-white focus:outline-none cursor-pointer"
                    >
                      <option value="SALES_REV">Sales Invoices Revenue ($ value)</option>
                      <option value="SALES_COUNT">Sales Orders Counts (No. orders)</option>
                      <option value="STOCK_ITEMS">Product Master Inventory catalog (Stock)</option>
                      <option value="CRM_LEADS">CRM Conversion Pipeline (Leads)</option>
                      <option value="HRMS_USERS">HRMS Present headcounts (Staff)</option>
                      <option value="MFG_JOBS">Manufacturing Job Cards status (Mfg)</option>
                      <option value="FINANCE_OUTFLOW">Financial Salary payouts (Finance)</option>
                    </select>
                  </div>

                  {/* Visual Type */}
                  <div className="space-y-1">
                    <label className="text-[8.5px] font-bold text-slate-400 uppercase">Visual Representation Type</label>
                    <select
                      value={newType}
                      onChange={e => setNewType(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 py-2 px-3 rounded-xl text-xs text-white focus:outline-none cursor-pointer"
                    >
                      <option value="KPI">Single Value KPI metrics card</option>
                      <option value="LIST">Top 5 Records Table list</option>
                      <option value="CHART">Monthly Performance bar graph</option>
                    </select>
                  </div>

                  {/* Width & Height cols */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[8.5px] font-bold text-slate-400 uppercase">Width columns</label>
                      <select
                        value={newWidth}
                        onChange={e => setNewWidth(parseInt(e.target.value) as any)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 py-2 px-3 rounded-xl text-xs text-white focus:outline-none cursor-pointer"
                      >
                        <option value={1}>1 column</option>
                        <option value={2}>2 columns</option>
                        <option value={3}>3 columns (Full width)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8.5px] font-bold text-slate-400 uppercase">Height rows</label>
                      <select
                        value={newHeight}
                        onChange={e => setNewHeight(parseInt(e.target.value) as any)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 py-2 px-3 rounded-xl text-xs text-white focus:outline-none cursor-pointer"
                      >
                        <option value={1}>1 row</option>
                        <option value={2}>2 rows (Double height)</option>
                      </select>
                    </div>
                  </div>

                  {/* Accent Color */}
                  <div className="space-y-1.5">
                    <label className="text-[8.5px] font-bold text-slate-400 uppercase block">Card Accent Color</label>
                    <div className="flex gap-2">
                      {(['indigo', 'emerald', 'rose', 'amber', 'slate'] as const).map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewColor(color)}
                          style={{
                            backgroundColor: color === 'emerald' ? '#10b981' : color === 'rose' ? '#f43f5e' : color === 'amber' ? '#f59e0b' : color === 'slate' ? '#64748b' : '#6366f1'
                          }}
                          className={`w-6 h-6 rounded-full border border-black cursor-pointer transition-all active:scale-90 ${
                            newColor === color ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900' : 'opacity-70 hover:opacity-100'
                          }`}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg border-0 cursor-pointer transition-colors"
                  >
                    {editingWidgetId ? 'Save Changes' : 'Add custom widget card'}
                  </button>
                  {editingWidgetId && (
                    <button
                      type="button"
                      onClick={cancelEditWidget}
                      className="w-full py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl shadow-lg border border-slate-800 cursor-pointer transition-colors"
                    >
                      Cancel Edit
                    </button>
                  )}
                </form>
              </div>

              {/* Right Column: Manage Current Widgets (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <span className="text-[9px] font-extrabold text-indigo-400 uppercase tracking-widest block border-b border-slate-800 pb-1.5">Manage Current Layout</span>
                
                {/* Active Theme Selector */}
                <div className="space-y-2 pb-3 border-b border-slate-800/40">
                  <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Dashboard theme preset</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['glass-indigo', 'glass-emerald', 'glass-rose', 'glass-amber'].map(theme => (
                      <button
                        key={theme}
                        type="button"
                        onClick={() => selectTheme(theme)}
                        className={`py-1.5 px-2.5 rounded-xl border text-[10px] font-bold capitalize transition-all cursor-pointer bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300 ${
                          activeTheme === theme
                            ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-400 font-black'
                            : 'bg-slate-950/40 border-slate-850/60 text-slate-500 hover:text-slate-350'
                        }`}
                      >
                        {theme.replace('glass-', '')} theme
                      </button>
                    ))}
                  </div>
                </div>

                {/* Widgets checklist list */}
                <div className="flex flex-col gap-2 max-h-[35vh] overflow-y-auto pr-1">
                  {widgets.map((w, idx) => (
                    <div
                      key={w.id}
                      className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl flex items-center justify-between"
                    >
                      <div className="text-left">
                        <span className="text-xs font-bold text-white block">{w.title}</span>
                        <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 mt-0.5 block">
                          Source: {w.source} • Size: {w.width}×{w.height} • Visual: {w.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleMoveWidget(idx, -1)}
                          disabled={idx === 0}
                          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 rounded transition-all cursor-pointer border-0 bg-transparent disabled:opacity-30 disabled:pointer-events-none text-xs"
                          title="Move Up"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveWidget(idx, 1)}
                          disabled={idx === widgets.length - 1}
                          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 rounded transition-all cursor-pointer border-0 bg-transparent disabled:opacity-30 disabled:pointer-events-none text-xs"
                          title="Move Down"
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditWidget(w)}
                          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 rounded transition-all cursor-pointer border-0 bg-transparent"
                          title="Edit Card Settings"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteWidget(w.id)}
                          className="p-1 text-slate-400 hover:text-rose-455 hover:bg-slate-900 rounded-lg cursor-pointer bg-transparent border-0"
                          title="Delete widget"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {widgets.length === 0 && (
                    <div className="text-center py-8 text-slate-500 italic text-xs">No active widgets. Use the left form to add your first metric card.</div>
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-800 bg-slate-950/20 shrink-0 flex justify-end">
              <button
                onClick={() => {
                  setShowConfigModal(false);
                  cancelEditWidget();
                }}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white transition-all text-xs font-bold rounded-xl shadow-lg border-0 cursor-pointer"
              >
                Close Customizable Layout Studio
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
