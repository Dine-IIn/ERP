import os

email_content = """import React, { useState } from 'react';
import { 
  Mail, Settings, LayoutTemplate, Send, 
  Inbox, BarChart3, Plus, Search, Filter, Download, 
  RefreshCw, CheckCircle2, AlertCircle, FileText, ArrowUpRight, ArrowDownRight, MoreHorizontal
} from 'lucide-react';

interface Props {
  activeTab?: string;
  user: any;
}

const GlobalEmailSystem: React.FC<Props> = ({ user, activeTab }) => {
  const mapping: Record<string, string> = {
    'EMAIL_SMTP': 'smtp',
    'EMAIL_TEMPLATES': 'templates',
    'EMAIL_QUEUE': 'queue',
    'EMAIL_LOGS': 'logs'
  };
  const currentTab = (activeTab && mapping[activeTab]) ? mapping[activeTab] : 'dashboard';
  const [searchQuery, setSearchQuery] = useState('');

  // --- DUMMY DATA ---
  const dashboardStats = [
    { title: 'Emails Sent (MTD)', val: '4,521', change: '+12.5% vs last month', isPositive: true, icon: Send, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { title: 'Delivery Rate', val: '99.8%', change: '+0.1% uptime', isPositive: true, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Failed Deliveries', val: '9', change: '-2 since yesterday', isPositive: true, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
    { title: 'Active Templates', val: '32', change: '+4 new templates', isPositive: true, icon: LayoutTemplate, color: 'text-amber-500', bg: 'bg-amber-500/10' }
  ];

  const templatesData = [
    { id: 'TPL-001', name: 'Invoice Generated', type: 'Sales', status: 'Active', lastUpdated: 'May 10, 2026' },
    { id: 'TPL-002', name: 'Purchase Order Approval', type: 'Purchase', status: 'Active', lastUpdated: 'Apr 25, 2026' },
    { id: 'TPL-003', name: 'Password Reset OTP', type: 'Security', status: 'Active', lastUpdated: 'Jan 15, 2026' },
    { id: 'TPL-004', name: 'Monthly Payroll Slip', type: 'HR', status: 'Draft', lastUpdated: 'May 20, 2026' }
  ];

  const logsData = [
    { id: 'LOG-991', recipient: 'john.smith@techtronics.com', subject: 'Invoice INV-2026-101', template: 'Invoice Generated', date: 'Today, 10:45 AM', status: 'Delivered' },
    { id: 'LOG-992', recipient: 'alice.wong@global.com', subject: 'Your OTP is 491024', template: 'Password Reset OTP', date: 'Today, 09:12 AM', status: 'Delivered' },
    { id: 'LOG-993', recipient: 'mike.jones@officemax.com', subject: 'PO-2026-004 Approval Required', template: 'Purchase Order Approval', date: 'Yesterday, 14:30 PM', status: 'Bounced' },
    { id: 'LOG-994', recipient: 'sarah.miller@hwsol.com', subject: 'Invoice INV-2026-099', template: 'Invoice Generated', date: 'Yesterday, 11:20 AM', status: 'Delivered' },
  ];

  const queueData = [
    { id: 'Q-502', recipient: 'billing@megacorp.com', subject: 'Monthly Statement - May', priority: 'Normal', addedAt: '10 mins ago', status: 'Pending' },
    { id: 'Q-503', recipient: 'ceo@techtronics.com', subject: 'Urgent: Approval Required', priority: 'High', addedAt: '2 mins ago', status: 'Processing' },
    { id: 'Q-504', recipient: 'all-staff@company.com', subject: 'Weekly Newsletter', priority: 'Low', addedAt: '1 hour ago', status: 'Pending' },
  ];

  const smtpData = [
    { id: 'SMTP-1', provider: 'SendGrid API', host: 'smtp.sendgrid.net', port: '587', isPrimary: true, status: 'Connected' },
    { id: 'SMTP-2', provider: 'AWS SES', host: 'email-smtp.us-east-1.amazonaws.com', port: '465', isPrimary: false, status: 'Connected' },
    { id: 'SMTP-3', provider: 'Mailgun', host: 'smtp.mailgun.org', port: '587', isPrimary: false, status: 'Failed' },
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
          <h4 className="font-bold text-[var(--text-primary)] mb-4">Recent Outbound Activity</h4>
          <div className="space-y-3">
            {logsData.slice(0,4).map(log => (
              <div key={log.id} className="flex justify-between items-center p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                <div>
                  <p className="font-bold text-sm text-[var(--text-primary)] truncate max-w-[200px]">{log.subject}</p>
                  <p className="text-xs text-[var(--text-secondary)] truncate max-w-[200px]">{log.recipient}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[var(--text-secondary)] mb-1">{log.date}</p>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                    log.status === 'Delivered' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {log.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5">
          <h4 className="font-bold text-[var(--text-primary)] mb-4">Current Queue Status</h4>
          <div className="space-y-3">
            {queueData.map(q => (
              <div key={q.id} className="flex justify-between items-center p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${q.priority === 'High' ? 'bg-rose-500/10 text-rose-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                    <Send className="w-4 h-4"/>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[var(--text-primary)] truncate max-w-[150px]">{q.subject}</p>
                    <p className="text-xs text-[var(--text-secondary)]">Priority: {q.priority}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-[var(--text-primary)]">{q.status}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{q.addedAt}</p>
                </div>
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
            <Mail className="w-6 h-6 text-indigo-500" />
            Global Email System
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Manage SMTP, templates, and email delivery queues</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Sync
          </button>
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {currentTab === 'dashboard' && renderDashboard()}
        
        {currentTab === 'templates' && renderTable(
          ['Template ID', 'Name', 'Type', 'Last Updated', 'Status'],
          templatesData,
          (tpl) => (
            <tr key={tpl.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors group">
              <td className="px-6 py-4 font-mono text-xs font-bold text-indigo-400">{tpl.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{tpl.name}</td>
              <td className="px-6 py-4">{tpl.type}</td>
              <td className="px-6 py-4">{tpl.lastUpdated}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${tpl.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  {tpl.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {currentTab === 'logs' && renderTable(
          ['Log ID', 'Recipient', 'Subject', 'Template Used', 'Date', 'Status'],
          logsData,
          (log) => (
            <tr key={log.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs font-bold">{log.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{log.recipient}</td>
              <td className="px-6 py-4 text-sm truncate max-w-[200px]">{log.subject}</td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[var(--text-secondary)]">
                  <LayoutTemplate className="w-3.5 h-3.5" />
                  {log.template}
                </div>
              </td>
              <td className="px-6 py-4 text-xs">{log.date}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${log.status === 'Delivered' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {log.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {currentTab === 'queue' && renderTable(
          ['Queue ID', 'Recipient', 'Subject', 'Priority', 'Added', 'Status'],
          queueData,
          (q) => (
            <tr key={q.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs font-bold text-amber-500">{q.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{q.recipient}</td>
              <td className="px-6 py-4 text-sm truncate max-w-[200px]">{q.subject}</td>
              <td className="px-6 py-4">
                <span className={`text-xs font-bold ${q.priority === 'High' ? 'text-rose-500' : 'text-[var(--text-secondary)]'}`}>
                  {q.priority}
                </span>
              </td>
              <td className="px-6 py-4 text-xs">{q.addedAt}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${q.status === 'Processing' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  {q.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {currentTab === 'smtp' && renderTable(
          ['Config ID', 'Provider', 'Host', 'Port', 'Primary', 'Status'],
          smtpData,
          (smtp) => (
            <tr key={smtp.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs font-bold">{smtp.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{smtp.provider}</td>
              <td className="px-6 py-4 font-mono text-xs">{smtp.host}</td>
              <td className="px-6 py-4">{smtp.port}</td>
              <td className="px-6 py-4">
                {smtp.isPrimary ? <span className="px-2 py-1 bg-indigo-500/10 text-indigo-500 rounded-md text-xs font-bold">Yes</span> : <span className="text-xs text-[var(--text-secondary)]">No</span>}
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${smtp.status === 'Connected' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {smtp.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {(!['dashboard', 'templates', 'logs', 'queue', 'smtp'].includes(currentTab)) && (
           <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl animate-fade-in m-2">
            <div className="w-20 h-20 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center mb-6">
              <Settings className="w-10 h-10 text-[var(--text-muted)]" />
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

export default GlobalEmailSystem;
"""

with open(r"d:\ERP\Manual ERP\frontend\src\components\GlobalEmailSystem.tsx", "w", encoding="utf-8") as f:
    f.write(email_content)
print("Email System Updated.")
