import { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertCircle,
  Settings,
  CheckCircle,
  Bell,
  ChevronUp,
  ChevronDown,
  Pin,
  Eye,
  EyeOff,
  UserCheck,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface CustomDashboardProps {
  user: {
    id?: string;
    username: string;
    companyCode: string;
    role: string | null;
    isSuperAdmin: boolean;
  };
  token: string;
  backendUrl: string;
  socket: any;
  workspaceStats: {
    totalCompanyExpense: number;
    individualNetSum: number;
    individualTotalExpense: number;
  };
  onNavigate: (module: string) => void;
}

interface WidgetLayout {
  id: string;
  x: number; // Row index/order
  w: number; // Width: 12 (full), 6 (half), 4 (third), 8 (two-thirds)
  visible: boolean;
  title: string;
  category: string;
}

export default function CustomDashboard({
  user: _user,
  token,
  backendUrl,
  socket,
  workspaceStats,
  onNavigate
}: CustomDashboardProps) {
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isCustomizing, setIsCustomizing] = useState(false);
  
  // Dashboard widgets layout state
  const [layouts, setLayouts] = useState<WidgetLayout[]>([]);
  
  // Dynamic business data states
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [lowStockItems] = useState<any[]>([
    { id: '1', itemCode: 'RAW-STEEL-01', name: 'Hot Rolled Steel Sheets', stock: 12, minStock: 50, unit: 'Tons' },
    { id: '2', itemCode: 'PKG-BOX-M', name: 'Medium Corrugated Boxes', stock: 230, minStock: 1000, unit: 'Units' },
    { id: '3', itemCode: 'CHEM-GLUE-50', name: 'Industrial Polyurethane Glue', stock: 5, minStock: 20, unit: 'Barrels' }
  ]);
  const [attendanceToday] = useState<any[]>([
    { name: 'Sarah Connor', role: 'Finance Analyst', punchIn: '08:52 AM', status: 'ON_TIME' },
    { name: 'John Doe', role: 'Sales Lead', punchIn: '09:15 AM', status: 'LATE' },
    { name: 'Miles Dyson', role: 'R&D Director', punchIn: '08:45 AM', status: 'ON_TIME' },
    { name: 'Marcus Wright', role: 'Inventory Executive', punchIn: '09:02 AM', status: 'ON_TIME' }
  ]);
  const [salesSummary] = useState<any>({
    monthlySales: 154200,
    salesGrowth: 12.4,
    pendingInvoices: 8
  });

  const defaultLayouts: WidgetLayout[] = [
    { id: 'kpi_cards', x: 0, w: 12, visible: true, title: 'Corporate KPI Core Indicators', category: 'finance' },
    { id: 'sales_summary', x: 1, w: 6, visible: true, title: 'Sales Performance & Pipeline Analytics', category: 'crm' },
    { id: 'pending_approvals', x: 2, w: 6, visible: true, title: 'My Workflows Approvals queue', category: 'admin' },
    { id: 'revenue_graph', x: 3, w: 8, visible: true, title: 'Company Financial Revenue Trajectory', category: 'finance' },
    { id: 'stock_alerts', x: 4, w: 4, visible: true, title: 'Inventory critical stock Alerts', category: 'inventory' },
    { id: 'attendance', x: 5, w: 6, visible: true, title: 'Staff Attendance & Roster punch logs', category: 'hr' },
    { id: 'expense_graph', x: 6, w: 6, visible: true, title: 'Small Expenses & Group Transfers breakdown', category: 'finance' },
    { id: 'notifications', x: 7, w: 12, visible: true, title: 'Live System Alerts & Notifications Feed', category: 'notifications' }
  ];

  // Pinned shortcuts state
  const [pinnedShortcuts, setPinnedShortcuts] = useState<string[]>(['crm', 'hr', 'finance', 'general_admin']);

  // Fetch dashboard settings & layouts from database
  useEffect(() => {
    fetchDashboardLayout();
    fetchPendingApprovals();
    fetchNotificationsFeed();
  }, []);

  // Set up socket updates
  useEffect(() => {
    if (socket) {
      const handleUpdate = () => {
        fetchPendingApprovals();
        fetchNotificationsFeed();
      };
      socket.on('notification', handleUpdate);
      return () => {
        socket.off('notification', handleUpdate);
      };
    }
  }, [socket]);

  // Alert message dismiss
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(''), 4500);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(''), 4500);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  async function apiRequest(endpoint: string, method = 'GET', body: any = null) {
    const headers: any = {
      'Authorization': `Bearer ${token}`
    };
    if (body) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(`${backendUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  }

  async function fetchDashboardLayout() {
    try {
      const data = await apiRequest('/api/admin/dashboard/layout');
      if (data.layoutSettings) {
        const parsed = JSON.parse(data.layoutSettings);
        // Sync structures
        const synced = defaultLayouts.map(def => {
          const userConf = parsed.find((p: any) => p.id === def.id);
          if (userConf) {
            return {
              ...def,
              x: userConf.x !== undefined ? userConf.x : def.x,
              w: userConf.w !== undefined ? userConf.w : def.w,
              visible: userConf.visible !== undefined ? userConf.visible : def.visible
            };
          }
          return def;
        });
        
        // Sort by row index
        synced.sort((a, b) => a.x - b.x);
        setLayouts(synced);
      } else {
        setLayouts(defaultLayouts);
      }
    } catch (e) {
      setLayouts(defaultLayouts);
    }
  }

  async function saveDashboardLayout(customLayoutsList = layouts) {
    setLoading(true);
    try {
      const slimSettings = customLayoutsList.map(l => ({
        id: l.id,
        x: l.x,
        w: l.w,
        visible: l.visible
      }));
      await apiRequest('/api/admin/dashboard/layout', 'POST', {
        layoutSettings: JSON.stringify(slimSettings)
      });
      setSuccessMsg('Corporate dashboard layout settings saved successfully!');
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function restoreDefaultLayout() {
    if (!confirm('Are you sure you want to reset your home workspace layout?')) return;
    setLayouts(defaultLayouts);
    await saveDashboardLayout(defaultLayouts);
  }

  async function fetchPendingApprovals() {
    try {
      const data = await apiRequest('/api/admin/approvals');
      // filter my turn
      const pending = (data.approvalRequests || []).filter((r: any) => r.isMyTurn && r.status === 'PENDING');
      setPendingApprovals(pending);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchNotificationsFeed() {
    try {
      const data = await apiRequest('/api/notifications');
      setNotifications((data.notifications || []).slice(0, 8)); // Grab last 8
    } catch (e) {
      console.error(e);
    }
  }

  // Layout customizing helpers
  const handleMoveWidget = (index: number, direction: 'UP' | 'DOWN') => {
    const updated = [...layouts];
    if (direction === 'UP' && index > 0) {
      // Swap coordinates
      const tempX = updated[index].x;
      updated[index].x = updated[index - 1].x;
      updated[index - 1].x = tempX;
      
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
    } else if (direction === 'DOWN' && index < updated.length - 1) {
      // Swap coordinates
      const tempX = updated[index].x;
      updated[index].x = updated[index + 1].x;
      updated[index + 1].x = tempX;

      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
    }
    setLayouts(updated);
  };

  const handleResizeWidget = (index: number, action: 'EXPAND' | 'SHRINK') => {
    const updated = [...layouts];
    const item = updated[index];
    if (action === 'EXPAND') {
      if (item.w === 4) item.w = 6;
      else if (item.w === 6) item.w = 8;
      else if (item.w === 8) item.w = 12;
    } else {
      if (item.w === 12) item.w = 8;
      else if (item.w === 8) item.w = 6;
      else if (item.w === 6) item.w = 4;
    }
    setLayouts(updated);
  };

  const handleToggleVisibility = (index: number) => {
    const updated = [...layouts];
    updated[index].visible = !updated[index].visible;
    setLayouts(updated);
  };

  const toggleShortcut = (shortcut: string) => {
    if (pinnedShortcuts.includes(shortcut)) {
      setPinnedShortcuts(prev => prev.filter(s => s !== shortcut));
    } else {
      setPinnedShortcuts(prev => [...prev, shortcut]);
    }
  };

  return (
    <div className="max-w-6xl mx-auto text-left select-none animate-fade-in">
      
      {/* Dashboard controls - minimal strip, no header text */}
      <div className="flex justify-end items-center gap-2.5 mb-6">
          <button
            onClick={() => setIsCustomizing(!isCustomizing)}
            className={`py-1.5 px-3.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-all border ${
              isCustomizing
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Settings className={`w-3.5 h-3.5 ${isCustomizing ? 'animate-spin' : ''}`} />
            {isCustomizing ? 'Exit Customization' : 'Configure Dashboard'}
          </button>
          
          {isCustomizing && (
            <>
              <button
                onClick={() => saveDashboardLayout()}
                disabled={loading}
                className="py-1.5 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                Save Layout
              </button>
              <button
                onClick={restoreDefaultLayout}
                className="py-1.5 px-3 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Reset Default
              </button>
            </>
          )}
        </div>

      {/* Global alert notifications */}
      {successMsg && (
        <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs py-3 px-4 rounded-xl flex items-center gap-2 animate-fade-in shadow-lg">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs py-3 px-4 rounded-xl flex items-center gap-2 animate-fade-in shadow-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Pin Shortcuts Toolbar */}
      <div className="mb-6 p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
            <Pin className="w-3.5 h-3.5 text-indigo-400 rotate-45" /> Pinned Quick Shortcuts
          </span>
          {isCustomizing && (
            <span className="text-[9px] text-amber-500 font-bold">Toggle buttons to pin/unpin shortcuts</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2.5">
          {[
            { id: 'crm', label: 'Sales CRM pipeline', color: 'indigo' },
            { id: 'hr', label: 'HR Directory & roster', color: 'emerald' },
            { id: 'finance', label: 'Financial accounting', color: 'amber' },
            { id: 'general_admin', label: 'Administration Console', color: 'slate' }
          ].map(shortcut => {
            const isPinned = pinnedShortcuts.includes(shortcut.id);
            if (!isPinned && !isCustomizing) return null;
            
            return (
              <button
                key={shortcut.id}
                onClick={() => {
                  if (isCustomizing) {
                    toggleShortcut(shortcut.id);
                  } else {
                    onNavigate(shortcut.id);
                  }
                }}
                className={`py-1.5 px-3.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                  isPinned 
                    ? 'bg-indigo-500/5 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/10'
                    : 'bg-transparent text-[var(--text-muted)] border-[var(--border-color)] hover:border-[var(--text-secondary)] opacity-50'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${
                  shortcut.color === 'indigo' ? 'bg-indigo-500' :
                  shortcut.color === 'emerald' ? 'bg-emerald-500' :
                  shortcut.color === 'amber' ? 'bg-amber-500' : 'bg-slate-400'
                }`} />
                {shortcut.label}
                {isCustomizing && (
                  <span className="text-[9px] opacity-70 ml-1">{isPinned ? '📌' : '➕'}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid Widgets Container */}
      <div className="grid grid-cols-12 gap-6 select-none">
        {layouts
          .filter(widget => widget.visible || isCustomizing)
          .map((widget, index) => {
            const isHidden = !widget.visible;
            
            // Map Tailwind width classes
            let widthClass = 'col-span-12';
            if (widget.w === 4) widthClass = 'col-span-12 md:col-span-4';
            else if (widget.w === 6) widthClass = 'col-span-12 md:col-span-6';
            else if (widget.w === 8) widthClass = 'col-span-12 md:col-span-8';
            
            return (
              <div
                key={widget.id}
                className={`${widthClass} bg-[var(--bg-card)] border ${
                  isHidden 
                    ? 'border-dashed border-slate-700 opacity-40 bg-slate-900/10' 
                    : 'border-[var(--border-color)] hover:border-indigo-500/30'
                } rounded-2xl shadow-xl overflow-hidden flex flex-col transition-all duration-300 relative`}
              >
                {/* Widget Header bar */}
                <div className="px-5 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-3 rounded-full ${
                      widget.category === 'finance' ? 'bg-amber-500' :
                      widget.category === 'crm' ? 'bg-indigo-500' :
                      widget.category === 'hr' ? 'bg-emerald-500' : 'bg-purple-500'
                    }`} />
                    <h3 className="font-bold text-xs text-[var(--text-primary)] font-display tracking-tight">
                      {widget.title}
                    </h3>
                  </div>

                  {/* Widget layout controls */}
                  <div className="flex items-center gap-1">
                    {isCustomizing ? (
                      <>
                        <button
                          onClick={() => handleMoveWidget(index, 'UP')}
                          disabled={index === 0}
                          title="Move up"
                          className="p-1 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveWidget(index, 'DOWN')}
                          disabled={index === layouts.length - 1}
                          title="Move down"
                          className="p-1 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleResizeWidget(index, 'SHRINK')}
                          disabled={widget.w <= 4}
                          title="Shrink width"
                          className="p-1 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] disabled:opacity-30 cursor-pointer"
                        >
                          <Minimize2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleResizeWidget(index, 'EXPAND')}
                          disabled={widget.w >= 12}
                          title="Expand width"
                          className="p-1 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] disabled:opacity-30 cursor-pointer"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleVisibility(index)}
                          title={widget.visible ? 'Hide widget' : 'Show widget'}
                          className="p-1 hover:bg-[var(--bg-tertiary)] rounded text-amber-400 cursor-pointer"
                        >
                          {widget.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                      </>
                    ) : (
                      <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-wider uppercase bg-[var(--bg-primary)] border border-[var(--border-color)] px-2 py-0.5 rounded-full">
                        {widget.category}
                      </span>
                    )}
                  </div>
                </div>

                {/* Widget inner viewport */}
                <div className="p-5 flex-1 select-none">
                  {widget.id === 'kpi_cards' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 rounded-xl">
                        <span className="text-[9px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Company Total Expenses</span>
                        <span className="text-xl font-bold text-emerald-400 font-mono">${workspaceStats.totalCompanyExpense.toFixed(2)}</span>
                      </div>
                      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 rounded-xl">
                        <span className="text-[9px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">My Net Debt / Credit</span>
                        <span className={`text-xl font-bold font-mono ${workspaceStats.individualNetSum >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {workspaceStats.individualNetSum >= 0 ? `+$${workspaceStats.individualNetSum.toFixed(2)}` : `-$${Math.abs(workspaceStats.individualNetSum).toFixed(2)}`}
                        </span>
                      </div>
                      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 rounded-xl">
                        <span className="text-[9px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Personal Paid Expenses</span>
                        <span className="text-xl font-bold text-purple-400 font-mono">${workspaceStats.individualTotalExpense.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {widget.id === 'sales_summary' && (
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-center bg-[var(--bg-secondary)] p-3.5 border border-[var(--border-color)] rounded-xl">
                        <div>
                          <span className="text-[9px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">Active Corporate Revenue</span>
                          <h4 className="text-xl font-bold text-indigo-400 font-mono mt-0.5">${salesSummary.monthlySales.toLocaleString()}</h4>
                        </div>
                        <div className="px-2 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold rounded-lg flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" /> +{salesSummary.salesGrowth}%
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-[var(--bg-secondary)]/50 border border-[var(--border-color)] rounded-xl">
                          <span className="text-[9px] font-bold text-[var(--text-secondary)] uppercase">Invoicing Queue</span>
                          <p className="text-sm font-bold text-[var(--text-primary)] mt-1">{salesSummary.pendingInvoices} Pending</p>
                        </div>
                        <div className="p-3 bg-[var(--bg-secondary)]/50 border border-[var(--border-color)] rounded-xl">
                          <span className="text-[9px] font-bold text-[var(--text-secondary)] uppercase">Leads conversion</span>
                          <p className="text-sm font-bold text-emerald-400 mt-1">42% Success</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {widget.id === 'pending_approvals' && (
                    <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
                      {pendingApprovals.length === 0 ? (
                        <div className="p-6 text-center bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl">
                          <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-1.5 opacity-60" />
                          <p className="text-[10px] text-[var(--text-secondary)] font-semibold">Your workflow approval queue is completely clear!</p>
                        </div>
                      ) : (
                        pendingApprovals.map((reqItem: any) => (
                          <div 
                            key={reqItem.id} 
                            onClick={() => onNavigate('general_admin')}
                            className="p-3 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-between transition-colors cursor-pointer text-xs"
                          >
                            <div>
                              <p className="font-bold text-[var(--text-primary)] uppercase tracking-wide">
                                {reqItem.workflow.workflowName}
                              </p>
                              <span className="text-[9px] text-[var(--text-secondary)] block mt-0.5">
                                Requested by: <span className="text-indigo-400 font-semibold">{reqItem.requesterName}</span>
                              </span>
                            </div>
                            <div className="text-right">
                              {reqItem.amount !== null && (
                                <span className="font-bold text-indigo-400 font-mono text-sm block">
                                  ${reqItem.amount.toFixed(2)}
                                </span>
                              )}
                              <span className="text-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-bold uppercase mt-0.5 inline-block">
                                Action Required
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {widget.id === 'revenue_graph' && (
                    <div className="flex flex-col gap-3">
                      {/* Breathtaking SVG Custom Area Chart with pure Tailwind controls */}
                      <div className="h-44 w-full flex items-end justify-between px-2 pt-4 relative">
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                          <div className="border-b border-[var(--text-primary)] w-full"></div>
                          <div className="border-b border-[var(--text-primary)] w-full"></div>
                          <div className="border-b border-[var(--text-primary)] w-full"></div>
                          <div className="border-b border-[var(--text-primary)] w-full"></div>
                        </div>

                        {/* Bar charts or custom SVGs */}
                        {[
                          { month: 'Jan', val: 42, rev: '$42k' },
                          { month: 'Feb', val: 56, rev: '$56k' },
                          { month: 'Mar', val: 78, rev: '$78k' },
                          { month: 'Apr', val: 90, rev: '$90k' },
                          { month: 'May', val: 124, rev: '$124k' },
                          { month: 'Jun', val: 110, rev: '$110k' },
                          { month: 'Jul', val: 145, rev: '$145k' },
                          { month: 'Aug', val: 154, rev: '$154k' }
                        ].map((bar, idx) => (
                          <div key={idx} className="flex flex-col items-center flex-1 group">
                            <div className="text-[9px] font-bold text-indigo-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity mb-1 bg-[var(--bg-secondary)] px-1 rounded border border-[var(--border-color)]">
                              {bar.rev}
                            </div>
                            <div 
                              className="w-8 bg-gradient-to-t from-indigo-600 to-indigo-400 hover:to-indigo-300 rounded-t-lg transition-all duration-500 shadow-md group-hover:scale-y-105 origin-bottom"
                              style={{ height: `${(bar.val / 160) * 100}px` }}
                            />
                            <span className="text-[9px] font-bold text-[var(--text-secondary)] mt-2">{bar.month}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {widget.id === 'stock_alerts' && (
                    <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
                      {lowStockItems.map(item => (
                        <div key={item.id} className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex flex-col gap-1 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-amber-500 font-mono">{item.itemCode}</span>
                            <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 text-[8px] font-extrabold rounded-full">CRITICAL</span>
                          </div>
                          <span className="text-[10px] text-[var(--text-secondary)] font-medium mt-0.5">{item.name}</span>
                          <div className="flex justify-between items-center mt-1 border-t border-[var(--border-color)]/30 pt-1 text-[9px] text-[var(--text-muted)]">
                            <span>Current Stock: <span className="font-bold text-rose-400 font-mono">{item.stock} {item.unit}</span></span>
                            <span>Min Requirement: <span className="font-bold text-[var(--text-secondary)] font-mono">{item.minStock} {item.unit}</span></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {widget.id === 'attendance' && (
                    <div className="flex flex-col gap-2.5 max-h-56 overflow-y-auto">
                      {attendanceToday.map((att, idx) => (
                        <div key={idx} className="p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                              <UserCheck className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <span className="font-bold text-[var(--text-primary)] block leading-none">{att.name}</span>
                              <span className="text-[9px] text-[var(--text-muted)] mt-1 block">{att.role}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-emerald-400 font-bold block">{att.punchIn}</span>
                            <span className={`text-[8px] font-bold uppercase mt-0.5 inline-block ${att.status === 'ON_TIME' ? 'text-emerald-400' : 'text-amber-500 animate-pulse'}`}>
                              {att.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {widget.id === 'expense_graph' && (
                    <div className="flex flex-col gap-3">
                      <span className="text-[9px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider block">Expense breakdown by category</span>
                      
                      {/* HTML/CSS elegant stacked percentage bars */}
                      <div className="flex flex-col gap-3.5 mt-2">
                        {[
                          { category: 'Logistics / Transport', amt: 480, pct: 40, color: 'bg-indigo-500' },
                          { category: 'Meals & Fooding', amt: 360, pct: 30, color: 'bg-emerald-500' },
                          { category: 'Office Stationary', amt: 240, pct: 20, color: 'bg-amber-500' },
                          { category: 'Hardware Spares', amt: 120, pct: 10, color: 'bg-purple-500' }
                        ].map((exp, idx) => (
                          <div key={idx} className="flex flex-col gap-1 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-medium text-[var(--text-secondary)]">{exp.category}</span>
                              <span className="font-mono font-bold text-[var(--text-primary)]">${exp.amt} ({exp.pct}%)</span>
                            </div>
                            <div className="w-full h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                              <div 
                                className={`${exp.color} h-full rounded-full transition-all duration-700`}
                                style={{ width: `${exp.pct}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {widget.id === 'notifications' && (
                    <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl">
                          <Bell className="w-6 h-6 text-purple-400 mx-auto mb-1.5 opacity-60" />
                          <p className="text-[10px] text-[var(--text-secondary)]">Your notifications mailbox is clear.</p>
                        </div>
                      ) : (
                        notifications.map(notif => (
                          <div
                            key={notif.id}
                            className={`p-2.5 border rounded-xl flex items-start gap-2.5 transition-colors text-xs text-left ${
                              notif.readStatus === 'READ' 
                                ? 'bg-[var(--bg-secondary)]/30 border-[var(--border-color)]/50 opacity-60' 
                                : 'bg-indigo-500/5 border-indigo-500/20'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg shrink-0 ${notif.readStatus === 'READ' ? 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]' : 'bg-indigo-500/10 text-indigo-400'}`}>
                              <Bell className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center text-[9px] text-[var(--text-muted)]">
                                <span className="font-extrabold uppercase text-indigo-400">{notif.module}</span>
                                <span>{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <h4 className="font-bold text-[var(--text-primary)] mt-0.5">{notif.title}</h4>
                              <p className="text-[var(--text-secondary)] text-[10px] mt-0.5 leading-normal">{notif.description}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>
      
    </div>
  );
}
