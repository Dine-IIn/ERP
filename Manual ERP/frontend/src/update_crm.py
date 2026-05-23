import os

crm_content = """import React, { useState } from 'react';
import { 
  Users, Activity, PhoneCall, Calendar, 
  Target, BarChart3, Plus, Search, Filter, Download, 
  MoreHorizontal, MessageSquare, Mail, Phone, ArrowUpRight, ArrowDownRight, Briefcase
} from 'lucide-react';

interface Props {
  activeTab?: string;
  user: any;
}

// Simple Clock icon component
const Clock = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CrmModule: React.FC<Props> = ({ user, activeTab }) => {
  const mapping: Record<string, string> = {
    'CRM_DASHBOARD': 'dashboard', 
    'CRM_LEADS': 'leads', 
    'CRM_CUSTOMER': 'customers', 
    'CRM_PIPELINE': 'pipeline', 
    'CRM_FOLLOWUP': 'followups', 
    'CRM_OPPORTUNITY': 'opportunities', 
    'CRM_STAGES': 'stages', 
    'CRM_NOTES': 'notes'
  };
  const currentTab = (activeTab && mapping[activeTab]) ? mapping[activeTab] : 'dashboard';

  // --- DUMMY DATA ---
  const dashboardStats = [
    { title: 'Total Leads', value: '1,248', change: '+12%', isPositive: true, icon: Target },
    { title: 'Active Customers', value: '432', change: '+5%', isPositive: true, icon: Users },
    { title: 'Win Rate', value: '64.5%', change: '-2%', isPositive: false, icon: Activity },
    { title: 'Pipeline Value', value: '$516.5k', change: '+18%', isPositive: true, icon: Briefcase },
  ];

  const leadsData = [
    { id: 'L-1001', name: 'TechVision Inc', contact: 'Sarah Miller', email: 'sarah@techvision.com', source: 'Website', status: 'New', value: '$12,000' },
    { id: 'L-1002', name: 'Alpha Retail', contact: 'John Doe', email: 'john.doe@alpharetail.co', source: 'Referral', status: 'Contacted', value: '$8,500' },
    { id: 'L-1003', name: 'Global Logistics', contact: 'Mark Smith', email: 'msmith@global-logistics.net', source: 'Trade Show', status: 'Qualified', value: '$45,000' },
    { id: 'L-1004', name: 'Beta Software', contact: 'Anna Lee', email: 'anna.l@beta-soft.io', source: 'Cold Call', status: 'Proposal', value: '$22,000' },
    { id: 'L-1005', name: 'Omega Manufacturing', contact: 'Robert Chen', email: 'rchen@omega.com', source: 'Website', status: 'Lost', value: '$120,000' },
  ];

  const customerData = [
    { id: 'C-501', company: 'Epsilon Energy', contact: 'James Taylor', phone: '+1 555-0198', ltv: '$210,000', lastActive: '2 days ago', status: 'Active' },
    { id: 'C-502', company: 'Delta Dynamics', contact: 'Emma Davis', phone: '+1 555-0245', ltv: '$65,000', lastActive: '1 week ago', status: 'Active' },
    { id: 'C-503', company: 'Sigma Corp', contact: 'Tom Wilson', phone: '+1 555-0312', ltv: '$34,000', lastActive: '3 months ago', status: 'At Risk' },
    { id: 'C-504', company: 'Zeta Technologies', contact: 'Lisa Wong', phone: '+1 555-0477', ltv: '$95,000', lastActive: '1 year ago', status: 'Churned' },
  ];

  const followUpData = [
    { id: 'F-101', task: 'Follow up on proposal', relatedTo: 'Beta Software', type: 'Call', dueDate: 'Today, 2:00 PM', priority: 'High' },
    { id: 'F-102', task: 'Send pricing details', relatedTo: 'TechVision Inc', type: 'Email', dueDate: 'Tomorrow, 10:00 AM', priority: 'Medium' },
    { id: 'F-103', task: 'Quarterly review meeting', relatedTo: 'Epsilon Energy', type: 'Meeting', dueDate: 'Oct 25, 2026', priority: 'Medium' },
    { id: 'F-104', task: 'Check contract status', relatedTo: 'Global Logistics', type: 'Call', dueDate: 'Oct 28, 2026', priority: 'Low' },
  ];

  const communicationData = [
    { id: 'MSG-01', from: 'Me', to: 'Sarah Miller (TechVision)', subject: 'Following up on our conversation', type: 'Email', date: '2 hours ago' },
    { id: 'MSG-02', from: 'John Doe (Alpha Retail)', to: 'Me', subject: 'Re: Product Demo request', type: 'Email', date: 'Yesterday' },
    { id: 'MSG-03', from: 'Me', to: 'James Taylor (Epsilon)', subject: 'Outbound Call (Duration: 5m 23s)', type: 'Call', date: 'Oct 18, 2026' },
  ];

  const pipelineStages = [
    { id: 'new', name: 'New Leads', color: 'bg-blue-500', items: [ { id: 'L-102', name: 'TechVision Inc', contact: 'Sarah Miller', value: '$12k', date: '2 days ago' }, { id: 'L-105', name: 'Alpha Retail', contact: 'John Doe', value: '$8.5k', date: '3 days ago' } ] },
    { id: 'contacted', name: 'Contacted', color: 'bg-indigo-500', items: [ { id: 'L-098', name: 'Global Logistics', contact: 'Mark Smith', value: '$45k', date: '1 week ago' }, { id: 'L-101', name: 'Beta Software', contact: 'Anna Lee', value: '$22k', date: '4 days ago' } ] },
    { id: 'qualified', name: 'Qualified', color: 'bg-amber-500', items: [ { id: 'L-085', name: 'Omega Manufacturing', contact: 'Robert Chen', value: '$120k', date: '2 weeks ago' } ] },
    { id: 'proposal', name: 'Proposal Sent', color: 'bg-purple-500', items: [ { id: 'L-072', name: 'Delta Dynamics', contact: 'Emma Davis', value: '$65k', date: '1 month ago' }, { id: 'L-080', name: 'Sigma Corp', contact: 'Tom Wilson', value: '$34k', date: '3 weeks ago' } ] },
    { id: 'won', name: 'Closed Won', color: 'bg-emerald-500', items: [ { id: 'L-050', name: 'Epsilon Energy', contact: 'James Taylor', value: '$210k', date: '2 months ago' } ] }
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
              <div className={`flex items-center text-xs mt-2 font-bold ${stat.isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                {stat.isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                {stat.change} vs last month
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
              <stat.icon className="w-6 h-6 text-indigo-500" />
            </div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5">
          <h4 className="font-bold text-[var(--text-primary)] mb-4">Recent Leads</h4>
          <div className="space-y-3">
            {leadsData.slice(0,4).map(lead => (
              <div key={lead.id} className="flex justify-between items-center p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                <div>
                  <p className="font-bold text-sm text-[var(--text-primary)]">{lead.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{lead.contact}</p>
                </div>
                <span className="px-2 py-1 text-xs font-bold rounded-md bg-indigo-500/10 text-indigo-500">{lead.status}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5">
          <h4 className="font-bold text-[var(--text-primary)] mb-4">Upcoming Follow-ups</h4>
          <div className="space-y-3">
            {followUpData.slice(0,4).map(task => (
              <div key={task.id} className="flex justify-between items-center p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${task.type === 'Email' ? 'bg-amber-500/10 text-amber-500' : task.type === 'Call' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {task.type === 'Email' ? <Mail className="w-4 h-4"/> : task.type === 'Call' ? <Phone className="w-4 h-4"/> : <Users className="w-4 h-4"/>}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[var(--text-primary)]">{task.task}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{task.relatedTo}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-[var(--text-secondary)]">{task.dueDate}</span>
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
            <Users className="w-6 h-6 text-indigo-500" />
            Customer Relationship Management (CRM)
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Manage leads, track opportunities, and view your sales pipeline</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Record
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {currentTab === 'dashboard' && renderDashboard()}
        
        {currentTab === 'leads' && renderTable(
          ['ID', 'Lead Name', 'Contact', 'Email', 'Source', 'Status', 'Value'],
          leadsData,
          (lead) => (
            <tr key={lead.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors group">
              <td className="px-6 py-4 font-mono text-xs">{lead.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{lead.name}</td>
              <td className="px-6 py-4">{lead.contact}</td>
              <td className="px-6 py-4">{lead.email}</td>
              <td className="px-6 py-4">{lead.source}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${lead.status === 'New' ? 'bg-blue-500/10 text-blue-500' : lead.status === 'Contacted' ? 'bg-amber-500/10 text-amber-500' : lead.status === 'Qualified' ? 'bg-indigo-500/10 text-indigo-500' : lead.status === 'Lost' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  {lead.status}
                </span>
              </td>
              <td className="px-6 py-4 font-bold">{lead.value}</td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}
        
        {currentTab === 'customers' && renderTable(
          ['ID', 'Company Name', 'Primary Contact', 'Phone', 'Lifetime Value', 'Last Active', 'Status'],
          customerData,
          (c) => (
            <tr key={c.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs">{c.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{c.company}</td>
              <td className="px-6 py-4">{c.contact}</td>
              <td className="px-6 py-4">{c.phone}</td>
              <td className="px-6 py-4 text-emerald-400 font-bold">{c.ltv}</td>
              <td className="px-6 py-4">{c.lastActive}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${c.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : c.status === 'At Risk' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {c.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {currentTab === 'followups' && renderTable(
          ['Task ID', 'Task Description', 'Related To', 'Type', 'Due Date', 'Priority'],
          followUpData,
          (f) => (
            <tr key={f.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs">{f.id}</td>
              <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{f.task}</td>
              <td className="px-6 py-4">{f.relatedTo}</td>
              <td className="px-6 py-4 flex items-center gap-2">
                {f.type === 'Email' ? <Mail className="w-3.5 h-3.5 text-amber-500"/> : f.type === 'Call' ? <Phone className="w-3.5 h-3.5 text-blue-500"/> : <Users className="w-3.5 h-3.5 text-emerald-500"/>}
                {f.type}
              </td>
              <td className="px-6 py-4 text-amber-500 font-semibold">{f.dueDate}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${f.priority === 'High' ? 'bg-rose-500/10 text-rose-500' : f.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  {f.priority}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}
        
        {currentTab === 'communications' && renderTable(
          ['Msg ID', 'From', 'To', 'Subject / Details', 'Type', 'Date'],
          communicationData,
          (msg) => (
            <tr key={msg.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
              <td className="px-6 py-4 font-mono text-xs">{msg.id}</td>
              <td className="px-6 py-4 font-semibold">{msg.from}</td>
              <td className="px-6 py-4 font-semibold">{msg.to}</td>
              <td className="px-6 py-4 text-[var(--text-primary)] truncate max-w-[200px]">{msg.subject}</td>
              <td className="px-6 py-4 flex items-center gap-2">
                {msg.type === 'Email' ? <Mail className="w-3.5 h-3.5 text-amber-500"/> : <Phone className="w-3.5 h-3.5 text-blue-500"/>}
                {msg.type}
              </td>
              <td className="px-6 py-4">{msg.date}</td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {currentTab === 'pipeline' && (
          <div className="flex flex-col h-full animate-fade-in overflow-hidden p-2">
            <div className="flex justify-between items-center mb-6 bg-[var(--bg-secondary)] p-3 rounded-xl border border-[var(--border-color)] shrink-0">
              <div className="flex items-center gap-4">
                <div className="relative w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input type="text" placeholder="Search pipeline..." className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg pl-9 pr-4 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <div className="h-6 w-px bg-[var(--border-color)]"></div>
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="font-semibold text-[var(--text-primary)]">Total Pipeline Value:</span>
                  <span className="text-indigo-400 font-bold">$516,500</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 flex-1 custom-scrollbar">
              {pipelineStages.map((stage) => (
                <div key={stage.id} className="flex-shrink-0 w-72 flex flex-col bg-[var(--bg-secondary)]/50 rounded-2xl border border-[var(--border-color)] overflow-hidden h-full">
                  <div className="p-3 border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]/50 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${stage.color}`}></div>
                      <h4 className="font-bold text-[var(--text-primary)] text-sm">{stage.name}</h4>
                    </div>
                    <span className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs font-bold px-2 py-0.5 rounded-full border border-[var(--border-color)]">
                      {stage.items.length}
                    </span>
                  </div>
                  <div className="p-3 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                    {stage.items.map((item) => (
                      <div key={item.id} className="bg-[var(--bg-primary)] p-3 rounded-xl border border-[var(--border-color)] hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/5 cursor-pointer transition-all group shrink-0">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-bold text-sm text-[var(--text-primary)] group-hover:text-indigo-400 transition-colors">{item.name}</h5>
                          <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><MoreHorizontal className="w-4 h-4" /></button>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mb-3">{item.contact}</p>
                        <div className="flex justify-between items-center pt-3 border-t border-[var(--border-color)]/50">
                          <span className="text-sm font-black text-[var(--text-primary)] font-display">{item.value}</span>
                          <div className="flex gap-1.5">
                            <button className="p-1.5 rounded-md bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"><Mail className="w-3.5 h-3.5" /></button>
                            <button className="p-1.5 rounded-md bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"><Phone className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                        <div className="mt-3 text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last activity: {item.date}
                        </div>
                      </div>
                    ))}
                    <button className="w-full py-2.5 rounded-xl border border-dashed border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors flex items-center justify-center gap-2 text-xs font-semibold shrink-0">
                      <Plus className="w-3.5 h-3.5" />
                      Add Lead
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CrmModule;
"""

with open(r"d:\ERP\Manual ERP\frontend\src\components\CrmModule.tsx", "w", encoding="utf-8") as f:
    f.write(crm_content)
print("CRM Module Updated.")
