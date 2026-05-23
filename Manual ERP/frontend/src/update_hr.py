import os

hr_content = """import React, { useState } from 'react';
import { 
  Users, Calendar, Clock, DollarSign, 
  UserPlus, BarChart3, Plus, Search, Filter, Download, 
  MoreHorizontal, CheckCircle, FileText, Briefcase, ChevronRight, GraduationCap
} from 'lucide-react';

interface Props {
  activeTab?: string;
  user: any;
}

const HumanResources: React.FC<Props> = ({ user, activeTab }) => {
  const mapping: Record<string, string> = {
    'HR_DASHBOARD': 'dashboard',
    'HR_DIRECTORY': 'directory',
    'HR_ATTENDANCE': 'attendance',
    'HR_LEAVES': 'leaves',
    'HR_PAYROLL': 'payroll',
    'HR_RECRUITMENT': 'recruitment',
    'HR_PERFORMANCE': 'performance'
  };
  const currentTab = (activeTab && mapping[activeTab]) ? mapping[activeTab] : 'dashboard';

  // --- DUMMY DATA ---
  const dashboardStats = [
    { title: 'Total Employees', value: '142', change: '+3 this month', isPositive: true, icon: Users },
    { title: 'On Leave Today', value: '5', change: '2% of workforce', isPositive: true, icon: Calendar },
    { title: 'Open Positions', value: '12', change: '4 new requisitions', isPositive: true, icon: Briefcase },
    { title: 'Avg Performance', value: '4.2/5', change: '+0.1 since Q1', isPositive: true, icon: BarChart3 },
  ];

  const directoryData = [
    { id: 'EMP-001', name: 'John Doe', role: 'Software Engineer', dept: 'Engineering', email: 'john@acme.com', status: 'Active', joinDate: '2023-01-15' },
    { id: 'EMP-002', name: 'Jane Smith', role: 'HR Manager', dept: 'Human Resources', email: 'jane@acme.com', status: 'Active', joinDate: '2021-08-01' },
    { id: 'EMP-003', name: 'Robert Chen', role: 'Sales Exec', dept: 'Sales', email: 'robert@acme.com', status: 'On Leave', joinDate: '2024-03-10' },
    { id: 'EMP-004', name: 'Lisa Wong', role: 'Product Manager', dept: 'Product', email: 'lisa@acme.com', status: 'Active', joinDate: '2022-11-20' },
    { id: 'EMP-005', name: 'Tom Wilson', role: 'QA Tester', dept: 'Engineering', email: 'tom@acme.com', status: 'Terminated', joinDate: '2023-05-05' },
  ];

  const attendanceData = [
    { id: 'ATT-101', name: 'John Doe', date: 'Today', checkIn: '08:55 AM', checkOut: '--', status: 'Present', hours: '4h 30m' },
    { id: 'ATT-102', name: 'Jane Smith', date: 'Today', checkIn: '09:10 AM', checkOut: '--', status: 'Late', hours: '4h 15m' },
    { id: 'ATT-103', name: 'Robert Chen', date: 'Today', checkIn: '--', checkOut: '--', status: 'Absent', hours: '0h 0m' },
    { id: 'ATT-104', name: 'Lisa Wong', date: 'Yesterday', checkIn: '08:50 AM', checkOut: '05:30 PM', status: 'Present', hours: '8h 40m' },
  ];

  const leaveData = [
    { id: 'LV-501', name: 'Robert Chen', type: 'Sick Leave', startDate: 'Oct 20, 2026', endDate: 'Oct 22, 2026', duration: '3 Days', status: 'Approved' },
    { id: 'LV-502', name: 'John Doe', type: 'Annual Leave', startDate: 'Nov 01, 2026', endDate: 'Nov 10, 2026', duration: '8 Days', status: 'Pending' },
    { id: 'LV-503', name: 'Jane Smith', type: 'Maternity', startDate: 'Dec 01, 2026', endDate: 'Mar 01, 2027', duration: '90 Days', status: 'Pending' },
  ];

  const payrollData = [
    { id: 'PR-2610', name: 'John Doe', role: 'Software Engineer', base: '$8,500', bonuses: '$500', deductions: '$1,200', net: '$7,800', status: 'Paid' },
    { id: 'PR-2611', name: 'Jane Smith', role: 'HR Manager', base: '$7,200', bonuses: '$0', deductions: '$950', net: '$6,250', status: 'Paid' },
    { id: 'PR-2612', name: 'Robert Chen', role: 'Sales Exec', base: '$5,000', bonuses: '$3,200', deductions: '$800', net: '$7,400', status: 'Processing' },
    { id: 'PR-2613', name: 'Lisa Wong', role: 'Product Manager', base: '$9,000', bonuses: '$1,000', deductions: '$1,400', net: '$8,600', status: 'Processing' },
  ];

  const recruitmentData = [
    { id: 'REQ-01', title: 'Senior Frontend Dev', dept: 'Engineering', location: 'Remote', applicants: 45, stage: 'Interviewing', status: 'Open' },
    { id: 'REQ-02', title: 'Marketing Lead', dept: 'Marketing', location: 'New York', applicants: 12, stage: 'Screening', status: 'Open' },
    { id: 'REQ-03', title: 'Customer Support', dept: 'Support', location: 'London', applicants: 89, stage: 'Offer', status: 'Closing' },
  ];

  const performanceData = [
    { id: 'PERF-Q3', name: 'John Doe', reviewer: 'Lisa Wong', period: 'Q3 2026', score: '4.5/5', status: 'Completed' },
    { id: 'PERF-Q3', name: 'Jane Smith', reviewer: 'CEO', period: 'Q3 2026', score: '4.8/5', status: 'Completed' },
    { id: 'PERF-Q3', name: 'Robert Chen', reviewer: 'Jane Smith', period: 'Q3 2026', score: '--', status: 'Pending Review' },
  ];

  const [searchQuery, setSearchQuery] = useState('');

  // --- RENDER HELPERS ---
  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in p-2">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardStats.map((stat, idx) => (
          <div key={idx} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[var(--text-secondary)] text-sm font-semibold">{stat.title}</p>
              <h3 className="text-2xl font-bold text-[var(--text-primary)] mt-1">{stat.value}</h3>
              <div className="text-xs mt-2 text-[var(--text-muted)] font-medium">
                {stat.change}
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
              <stat.icon className="w-6 h-6 text-cyan-500" />
            </div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5">
          <h4 className="font-bold text-[var(--text-primary)] mb-4">Pending Leave Requests</h4>
          <div className="space-y-3">
            {leaveData.filter(l => l.status === 'Pending').map(leave => (
              <div key={leave.id} className="flex justify-between items-center p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                <div>
                  <p className="font-bold text-sm text-[var(--text-primary)]">{leave.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{leave.type} • {leave.duration}</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-xs font-bold rounded-md hover:bg-emerald-500/20">Approve</button>
                  <button className="px-3 py-1 bg-rose-500/10 text-rose-500 text-xs font-bold rounded-md hover:bg-rose-500/20">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5">
          <h4 className="font-bold text-[var(--text-primary)] mb-4">Active Recruitments</h4>
          <div className="space-y-3">
            {recruitmentData.map(req => (
              <div key={req.id} className="flex justify-between items-center p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500">
                    <Briefcase className="w-4 h-4"/>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[var(--text-primary)]">{req.title}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{req.dept} • {req.applicants} applicants</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-[var(--bg-tertiary)] rounded-md text-[var(--text-primary)]">{req.stage}</span>
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
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg pl-9 pr-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-cyan-500 transition-colors"
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
            <Users className="w-6 h-6 text-cyan-500" />
            Human Resources Management (HRMS)
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Manage employees, attendance, payroll, and recruitment</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Entry
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {currentTab === 'dashboard' && renderDashboard()}
        
        {currentTab === 'directory' && renderTable(
          ['ID', 'Name', 'Role', 'Department', 'Email', 'Status', 'Join Date'],
          directoryData,
          (emp) => (
            <tr key={emp.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors group">
              <td className="px-6 py-4 font-mono text-xs">{emp.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)] flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-500 flex items-center justify-center text-xs">{emp.name.charAt(0)}</div>
                {emp.name}
              </td>
              <td className="px-6 py-4 font-semibold">{emp.role}</td>
              <td className="px-6 py-4">{emp.dept}</td>
              <td className="px-6 py-4">{emp.email}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${emp.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : emp.status === 'On Leave' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {emp.status}
                </span>
              </td>
              <td className="px-6 py-4">{emp.joinDate}</td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-cyan-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}
        
        {currentTab === 'attendance' && renderTable(
          ['ID', 'Employee Name', 'Date', 'Check In', 'Check Out', 'Hours', 'Status'],
          attendanceData,
          (att) => (
            <tr key={att.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs">{att.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{att.name}</td>
              <td className="px-6 py-4">{att.date}</td>
              <td className="px-6 py-4 font-mono">{att.checkIn}</td>
              <td className="px-6 py-4 font-mono">{att.checkOut}</td>
              <td className="px-6 py-4 font-semibold">{att.hours}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${att.status === 'Present' ? 'bg-emerald-500/10 text-emerald-500' : att.status === 'Late' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {att.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-cyan-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {currentTab === 'leaves' && renderTable(
          ['Request ID', 'Employee Name', 'Leave Type', 'Start Date', 'End Date', 'Duration', 'Status'],
          leaveData,
          (lv) => (
            <tr key={lv.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs">{lv.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{lv.name}</td>
              <td className="px-6 py-4 font-semibold">{lv.type}</td>
              <td className="px-6 py-4">{lv.startDate}</td>
              <td className="px-6 py-4">{lv.endDate}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{lv.duration}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${lv.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' : lv.status === 'Pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {lv.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-cyan-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}
        
        {currentTab === 'payroll' && renderTable(
          ['Payroll ID', 'Employee Name', 'Base Salary', 'Bonuses', 'Deductions', 'Net Pay', 'Status'],
          payrollData,
          (pr) => (
            <tr key={pr.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs">{pr.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{pr.name}</td>
              <td className="px-6 py-4">{pr.base}</td>
              <td className="px-6 py-4 text-emerald-400">{pr.bonuses}</td>
              <td className="px-6 py-4 text-rose-400">{pr.deductions}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{pr.net}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${pr.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  {pr.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-cyan-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {currentTab === 'recruitment' && renderTable(
          ['Requisition ID', 'Job Title', 'Department', 'Location', 'Applicants', 'Stage', 'Status'],
          recruitmentData,
          (req) => (
            <tr key={req.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs">{req.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{req.title}</td>
              <td className="px-6 py-4">{req.dept}</td>
              <td className="px-6 py-4">{req.location}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{req.applicants}</td>
              <td className="px-6 py-4">
                <span className="px-2 py-1 rounded-md text-xs font-bold bg-[var(--bg-tertiary)] text-[var(--text-primary)]">
                  {req.stage}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${req.status === 'Open' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {req.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-cyan-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {currentTab === 'performance' && renderTable(
          ['Review ID', 'Employee', 'Reviewer', 'Period', 'Score', 'Status'],
          performanceData,
          (perf) => (
            <tr key={perf.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs">{perf.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{perf.name}</td>
              <td className="px-6 py-4">{perf.reviewer}</td>
              <td className="px-6 py-4">{perf.period}</td>
              <td className="px-6 py-4 font-bold text-emerald-400">{perf.score}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${perf.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  {perf.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-cyan-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}
      </div>
    </div>
  );
};

export default HumanResources;
"""

with open(r"d:\ERP\Manual ERP\frontend\src\components\HumanResources.tsx", "w", encoding="utf-8") as f:
    f.write(hr_content)
print("HR Module Updated.")
