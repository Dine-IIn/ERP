import os

file_path = "d:\\ERP\\Manual ERP\\frontend\\src\\components\\HumanResources.tsx"

content = """import React, { useState } from 'react';
import { 
  Users, UserPlus, Clock, Calendar, 
  Briefcase, BarChart3, Plus, Search, Filter, Download, 
  MoreHorizontal, Banknote, ShieldCheck
} from 'lucide-react';

interface Props {
  user: any;
}

const HumanResources: React.FC<Props> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('directory');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    { id: 'dashboard', label: 'HR Dashboard', icon: BarChart3 },
    { id: 'directory', label: 'Employee Directory', icon: Users },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'leave', label: 'Leave Management', icon: Calendar },
    { id: 'payroll', label: 'Payroll & Salary', icon: Banknote },
    { id: 'recruitment', label: 'Recruitment', icon: UserPlus },
    { id: 'performance', label: 'Performance', icon: Briefcase }
  ];

  // Dummy employee data
  const employees = [
    { id: 'EMP-001', name: 'Sarah Miller', role: 'Head of Sales', dept: 'Sales', status: 'Active', joinDate: 'Jan 15, 2024' },
    { id: 'EMP-002', name: 'John Doe', role: 'Software Engineer', dept: 'Engineering', status: 'Active', joinDate: 'Mar 01, 2024' },
    { id: 'EMP-003', name: 'Anna Lee', role: 'HR Manager', dept: 'Human Resources', status: 'On Leave', joinDate: 'Feb 10, 2024' },
    { id: 'EMP-004', name: 'Mark Smith', role: 'Financial Analyst', dept: 'Finance', status: 'Active', joinDate: 'Apr 22, 2024' },
    { id: 'EMP-005', name: 'Emma Davis', role: 'Marketing Specialist', dept: 'Marketing', status: 'Active', joinDate: 'May 05, 2024' },
    { id: 'EMP-006', name: 'Robert Chen', role: 'Product Manager', dept: 'Product', status: 'Resigned', joinDate: 'Nov 12, 2023' }
  ];

  return (
    <div className="max-w-6xl mx-auto select-none animate-fade-in flex flex-col h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4 mb-4">
        <div>
          <h3 className="font-bold text-xl text-[var(--text-primary)] flex items-center gap-2 font-display">
            <Users className="w-6 h-6 text-indigo-500" />
            Human Resources (HRM)
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Manage employee profiles, attendance, and payroll</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Add Employee
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar border-b border-[var(--border-color)] mb-6">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-semibold text-sm transition-colors whitespace-nowrap ${
                isActive 
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' 
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {activeTab === 'directory' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { title: 'Total Employees', val: '142', icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                { title: 'Present Today', val: '135', icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                { title: 'On Leave', val: '7', icon: Calendar, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                { title: 'Open Positions', val: '4', icon: UserPlus, color: 'text-blue-500', bg: 'bg-blue-500/10' }
              ].map((kpi, i) => (
                <div key={i} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5 flex items-center gap-4 hover:border-indigo-500/30 transition-all">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${kpi.bg}`}>
                    <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{kpi.title}</p>
                    <h4 className="text-2xl font-black text-[var(--text-primary)] font-display mt-0.5">{kpi.val}</h4>
                  </div>
                </div>
              ))}
            </div>

            {/* Main Table */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl flex flex-col overflow-hidden">
              <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-tertiary)]/50">
                <div className="relative w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input 
                    type="text" 
                    placeholder="Search employees..." 
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg pl-9 pr-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <button className="p-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                  <Filter className="w-4 h-4" />
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]/50">
                      <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Employee</th>
                      <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Employee ID</th>
                      <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Department</th>
                      <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Join Date</th>
                      <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                      <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp, i) => (
                      <tr key={i} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                              {emp.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[var(--text-primary)]">{emp.name}</p>
                              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{emp.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm font-bold text-[var(--text-secondary)] font-display">
                          {emp.id}
                        </td>
                        <td className="p-4 text-sm text-[var(--text-secondary)] font-medium">
                          {emp.dept}
                        </td>
                        <td className="p-4 text-sm text-[var(--text-secondary)]">
                          {emp.joinDate}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                            emp.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                            emp.status === 'On Leave' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                            'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          }`}>
                            {emp.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button className="p-2 text-[var(--text-secondary)] hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Other tabs placeholder */}
        {activeTab !== 'directory' && (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl animate-fade-in">
            <div className="w-20 h-20 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center mb-6">
              {React.createElement(tabs.find(t => t.id === activeTab)?.icon || Users, { className: "w-10 h-10 text-[var(--text-muted)]" })}
            </div>
            <h4 className="text-xl font-bold text-[var(--text-primary)] mb-2 font-display">
              {tabs.find(t => t.id === activeTab)?.label}
            </h4>
            <p className="text-[var(--text-secondary)] max-w-md">
              This module section is currently under construction. Data tables, forms, and workflows for {tabs.find(t => t.id === activeTab)?.label.toLowerCase()} will be rendered here.
            </p>
            <button className="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20">
              Configure Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HumanResources;
"""

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("HumanResources created.")
