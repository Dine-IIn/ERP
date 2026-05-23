import os

quality_content = """import React, { useState } from 'react';
import { 
  ShieldCheck, Wrench, AlertOctagon, FileText, 
  Settings, BarChart3, Plus, Search, Filter, Download, 
  ArrowUpRight, Clock, Box, ShieldAlert, ArrowDownRight, MoreHorizontal
} from 'lucide-react';

interface Props {
  activeTab?: string;
  user: any;
}

const QualityMaintenance: React.FC<Props> = ({ user, activeTab }) => {
  const mapping: Record<string, string> = {
    'QA_INSPECTIONS': 'inspections',
    'QA_DEFECTS': 'defects',
    'QA_PREVENTIVE': 'preventive',
    'QA_SCHEDULES': 'schedules',
    'QA_REPORTS': 'reports'
  };
  const currentTab = (activeTab && mapping[activeTab]) ? mapping[activeTab] : 'dashboard';
  const [searchQuery, setSearchQuery] = useState('');

  // --- DUMMY DATA ---
  const dashboardStats = [
    { title: 'Pass Rate (MTD)', val: '94.5%', change: '+1.2% from last month', isPositive: true, icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Pending Inspections', val: '18', change: '-5 since yesterday', isPositive: true, icon: Clock, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { title: 'Open Defects', val: '7', change: '+2 critical', isPositive: false, icon: ShieldAlert, color: 'text-red-500', bg: 'bg-red-500/10' },
    { title: 'Machines Down', val: '1', change: 'Milling Station A', isPositive: false, icon: Wrench, color: 'text-amber-500', bg: 'bg-amber-500/10' }
  ];

  const inspections = [
    { id: 'INSP-4022', item: 'Electric Motor V2', batch: 'B-0012', inspector: 'John Smith', status: 'Passed', date: 'May 20, 2026' },
    { id: 'INSP-4023', item: 'Lithium Battery Pack', batch: 'B-0015', inspector: 'Alice Wong', status: 'Failed', date: 'May 21, 2026' },
    { id: 'INSP-4024', item: 'Steel Casing A1', batch: 'B-0018', inspector: 'Mike Jones', status: 'Pending', date: 'May 22, 2026' },
    { id: 'INSP-4025', item: 'Copper Wire Spool', batch: 'B-0005', inspector: 'Sarah Miller', status: 'Passed', date: 'May 19, 2026' }
  ];

  const defectsData = [
    { id: 'DEF-901', refId: 'INSP-4023', item: 'Lithium Battery Pack', issue: 'Voltage irregularity', severity: 'High', status: 'Open' },
    { id: 'DEF-902', refId: 'INSP-3998', item: 'Electric Motor V1', issue: 'Casing scratch', severity: 'Low', status: 'Resolved' },
    { id: 'DEF-903', refId: 'PROD-1024', item: 'Electric Motor V2', issue: 'Missing bearing', severity: 'Critical', status: 'Under Review' },
  ];

  const preventiveData = [
    { id: 'PM-202', machine: 'CNC Milling A', type: 'Calibration', assignedTo: 'Tech Team Alpha', nextDue: 'May 28, 2026', status: 'Scheduled' },
    { id: 'PM-203', machine: 'Assembly Line 1', type: 'Lubrication', assignedTo: 'Maintenance', nextDue: 'May 15, 2026', status: 'Overdue' },
    { id: 'PM-204', machine: 'Testing Station', type: 'Sensor Check', assignedTo: 'Tech Team Beta', nextDue: 'Jun 10, 2026', status: 'Planned' },
  ];

  const schedulesData = [
    { id: 'SCH-88', shift: 'Morning', team: 'Maintenance A', task: 'Routine checks', date: 'Today', status: 'In Progress' },
    { id: 'SCH-89', shift: 'Evening', team: 'Maintenance B', task: 'Line cleanup', date: 'Tomorrow', status: 'Scheduled' },
  ];

  // --- RENDER HELPERS ---
  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in p-2">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardStats.map((stat, idx) => (
          <div key={idx} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[var(--text-secondary)] text-sm font-semibold">{stat.title}</p>
              <h3 className="text-2xl font-bold text-[var(--text-primary)] mt-1">{stat.val}</h3>
              <div className={`flex items-center text-xs mt-2 font-bold ${stat.isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                {stat.isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                {stat.change}
              </div>
            </div>
            <div className={`w-12 h-12 rounded-full ${stat.bg} flex items-center justify-center`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5">
          <h4 className="font-bold text-[var(--text-primary)] mb-4">Recent Inspections</h4>
          <div className="space-y-3">
            {inspections.slice(0,4).map(insp => (
              <div key={insp.id} className="flex justify-between items-center p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                <div>
                  <p className="font-bold text-sm text-[var(--text-primary)]">{insp.item}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{insp.id} • {insp.date}</p>
                </div>
                <div>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                    insp.status === 'Passed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                    insp.status === 'Failed' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                    'bg-amber-500/10 text-amber-500 border-amber-500/20'
                  }`}>
                    {insp.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5">
          <h4 className="font-bold text-[var(--text-primary)] mb-4">Critical Defects</h4>
          <div className="space-y-3">
            {defectsData.filter(d => d.severity === 'Critical' || d.severity === 'High').map(def => (
              <div key={def.id} className="flex justify-between items-center p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                    <AlertOctagon className="w-4 h-4"/>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[var(--text-primary)]">{def.issue}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{def.item} ({def.refId})</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase text-red-500">{def.severity}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTable = (headers: string[], data: any[], renderRow: (item: any) => React.ReactNode) => (
    <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] overflow-hidden flex flex-col h-full animate-fade-in m-2">
      <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-tertiary)]/30">
        <div className="relative w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input 
            type="text" 
            placeholder="Search records..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg pl-9 pr-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <button className="p-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <Filter className="w-4 h-4" />
          </button>
          <button className="p-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto flex-1 custom-scrollbar">
        <table className="w-full text-left text-sm text-[var(--text-secondary)] min-w-[800px]">
          <thead className="text-xs uppercase bg-[var(--bg-tertiary)]/50 text-[var(--text-muted)] sticky top-0 z-10 shadow-sm">
            <tr>
              {headers.map((h, i) => <th key={i} className="px-6 py-3 font-semibold">{h}</th>)}
              <th className="px-6 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {data.map((item, i) => renderRow(item))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto select-none animate-fade-in flex flex-col h-[calc(100vh-80px)] p-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4 mb-4 shrink-0">
        <div>
          <h3 className="font-bold text-xl text-[var(--text-primary)] flex items-center gap-2 font-display">
            <ShieldCheck className="w-6 h-6 text-indigo-500" />
            Quality Management & Maintenance
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Manage QC inspections, defects, and machine maintenance</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Entry
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {currentTab === 'dashboard' && renderDashboard()}
        
        {currentTab === 'inspections' && renderTable(
          ['Insp ID', 'Item / Batch', 'Inspector', 'Date', 'Status'],
          inspections,
          (insp) => (
            <tr key={insp.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors group">
              <td className="px-6 py-4 font-mono text-xs font-bold text-indigo-400">{insp.id}</td>
              <td className="px-6 py-4">
                <p className="font-bold text-[var(--text-primary)]">{insp.item}</p>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[var(--text-secondary)]">
                  <Box className="w-3.5 h-3.5" />
                  {insp.batch}
                </div>
              </td>
              <td className="px-6 py-4">{insp.inspector}</td>
              <td className="px-6 py-4">{insp.date}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${insp.status === 'Passed' ? 'bg-emerald-500/10 text-emerald-500' : insp.status === 'Failed' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  {insp.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {currentTab === 'defects' && renderTable(
          ['Defect ID', 'Reference', 'Item', 'Issue', 'Severity', 'Status'],
          defectsData,
          (def) => (
            <tr key={def.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs font-bold text-rose-500">{def.id}</td>
              <td className="px-6 py-4 font-mono text-xs">{def.refId}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{def.item}</td>
              <td className="px-6 py-4">{def.issue}</td>
              <td className="px-6 py-4">
                <span className={`text-xs font-bold ${def.severity === 'Critical' ? 'text-rose-500' : def.severity === 'High' ? 'text-orange-500' : 'text-emerald-500'}`}>
                  {def.severity}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${def.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  {def.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {currentTab === 'preventive' && renderTable(
          ['PM ID', 'Machine', 'Type', 'Assigned To', 'Next Due', 'Status'],
          preventiveData,
          (pm) => (
            <tr key={pm.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs font-bold">{pm.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{pm.machine}</td>
              <td className="px-6 py-4">{pm.type}</td>
              <td className="px-6 py-4">{pm.assignedTo}</td>
              <td className="px-6 py-4 font-semibold">{pm.nextDue}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${pm.status === 'Scheduled' || pm.status === 'Planned' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {pm.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {currentTab === 'schedules' && renderTable(
          ['Schedule ID', 'Date', 'Shift', 'Team', 'Task', 'Status'],
          schedulesData,
          (sch) => (
            <tr key={sch.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs font-bold">{sch.id}</td>
              <td className="px-6 py-4">{sch.date}</td>
              <td className="px-6 py-4">{sch.shift}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{sch.team}</td>
              <td className="px-6 py-4">{sch.task}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${sch.status === 'In Progress' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                  {sch.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {(!['dashboard', 'inspections', 'defects', 'preventive', 'schedules'].includes(currentTab)) && (
           <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl animate-fade-in m-2">
            <div className="w-20 h-20 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center mb-6">
              <BarChart3 className="w-10 h-10 text-[var(--text-muted)]" />
            </div>
            <h4 className="text-xl font-bold text-[var(--text-primary)] mb-2 font-display">
              Under Construction
            </h4>
            <p className="text-[var(--text-secondary)] max-w-md">
              Data tables for {currentTab} will be rendered here.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default QualityMaintenance;
"""

with open(r"d:\ERP\Manual ERP\frontend\src\components\QualityMaintenance.tsx", "w", encoding="utf-8") as f:
    f.write(quality_content)
print("Quality Module Updated.")
