import os

crm_dir = r"d:\ERP\Manual ERP\frontend\src\components\crm"

# 1. Create CrmDashboard.tsx
crm_dashboard = """import React from 'react';
import { 
  Target, Users, Activity, Briefcase, ArrowUpRight, ArrowDownRight,
  Mail, Phone, Clock
} from 'lucide-react';

interface Props {
  dashboardStats: any[];
  leads: any[];
  followups: any[];
}

export const CrmDashboard: React.FC<Props> = ({ dashboardStats, leads, followups }) => {
  return (
    <div className="space-y-6 animate-fade-in p-2 text-xs">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[var(--text-secondary)] text-sm font-semibold">{stat.title}</p>
                <h3 className="text-2xl font-bold text-[var(--text-primary)] mt-1">{stat.value}</h3>
                <div className={`flex items-center text-[10px] mt-2 font-bold ${stat.isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {stat.isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                  {stat.change || 'Stable'}
                </div>
              </div>
              <div className={`w-12 h-12 rounded-full ${stat.bg || 'bg-indigo-500/10'} flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${stat.color || 'text-indigo-500'}`} />
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5">
          <h4 className="font-bold text-[var(--text-primary)] mb-4 text-sm">Recent Active Leads</h4>
          <div className="space-y-3">
            {leads.slice(0, 4).map(lead => (
              <div key={lead.id} className="flex justify-between items-center p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                <div>
                  <p className="font-bold text-sm text-[var(--text-primary)]">{lead.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{lead.contact}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                  lead.status === 'Qualified' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                  lead.status === 'New' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 animate-pulse' :
                  lead.status === 'Lost' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                  'bg-amber-500/10 border-amber-500/20 text-amber-500'
                }`}>{lead.status}</span>
              </div>
            ))}
            {leads.length === 0 && (
              <p className="text-center text-[var(--text-muted)] py-4">No active leads logged yet.</p>
            )}
          </div>
        </div>
        
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5">
          <h4 className="font-bold text-[var(--text-primary)] mb-4 text-sm">Upcoming Follow-ups</h4>
          <div className="space-y-3">
            {followups.slice(0, 4).map(task => (
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
            {followups.length === 0 && (
              <p className="text-center text-[var(--text-muted)] py-4">No follow-up tasks scheduled.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
"""

# 2. Create CrmLeads.tsx
crm_leads = """import React from 'react';
import { Target, MoreHorizontal } from 'lucide-react';

interface Props {
  leads: any[];
  handleQualifyLead: (id: string) => void;
  renderTable: (headers: string[], data: any[], renderRow: (item: any, i: number) => React.ReactNode) => React.ReactNode;
}

export const CrmLeads: React.FC<Props> = ({ leads, handleQualifyLead, renderTable }) => {
  return renderTable(
    ['Lead ID', 'Prospect Lead Name', 'Primary Contact Head', 'Client Email Address', 'Acquisition Source', 'Fulfillment Status', 'Estimated Deal Value'],
    leads,
    (lead) => (
      <tr key={lead.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
        <td className="px-6 py-4 font-mono font-bold text-indigo-400">{lead.id}</td>
        <td className="px-6 py-4 font-bold text-[var(--text-primary)]">
          <div className="flex items-center gap-2">
            <Target className="w-3.5 h-3.5 text-slate-400" />
            {lead.name}
          </div>
        </td>
        <td className="px-6 py-4">{lead.contact}</td>
        <td className="px-6 py-4 font-sans">{lead.email}</td>
        <td className="px-6 py-4">{lead.source}</td>
        <td className="px-6 py-4">
          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
            lead.status === 'Qualified' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
            lead.status === 'New' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 animate-pulse' :
            lead.status === 'Lost' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
            'bg-amber-500/10 border-amber-500/20 text-amber-500'
          }`}>{lead.status}</span>
        </td>
        <td className="px-6 py-4 font-mono font-bold text-[var(--text-primary)]">${lead.value.toLocaleString()}</td>
        <td className="px-6 py-4 text-right">
          <div className="flex items-center justify-end gap-2">
            {lead.status === 'New' || lead.status === 'Contacted' ? (
              <button 
                onClick={() => handleQualifyLead(lead.id)}
                className="px-2 py-0.5 text-emerald-400 hover:text-emerald-300 font-bold border border-emerald-500/25 bg-emerald-500/5 rounded text-[9px] cursor-pointer"
              >
                Qualify
              </button>
            ) : null}
            <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
          </div>
        </td>
      </tr>
    )
  );
};
"""

# 3. Create CrmCustomers.tsx
crm_customers = """import React from 'react';
import { MoreHorizontal } from 'lucide-react';

interface Props {
  customers: any[];
  renderTable: (headers: string[], data: any[], renderRow: (item: any, i: number) => React.ReactNode) => React.ReactNode;
}

export const CrmCustomers: React.FC<Props> = ({ customers, renderTable }) => {
  return renderTable(
    ['Client ID', 'Company Name Account', 'Account Representative', 'Office Phone Particulars', 'Lifetime Value (LTV)', 'Last Outbox Activity', 'Account Status'],
    customers,
    (c) => (
      <tr key={c.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
        <td className="px-6 py-4 font-mono font-bold text-indigo-400">{c.id}</td>
        <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{c.company}</td>
        <td className="px-6 py-4">{c.contact}</td>
        <td className="px-6 py-4 font-mono">{c.phone}</td>
        <td className="px-6 py-4 font-mono font-bold text-emerald-400">${c.ltv.toLocaleString()}</td>
        <td className="px-6 py-4 font-sans">{c.lastActive}</td>
        <td className="px-6 py-4">
          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
            c.status === 'Active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
            c.status === 'At Risk' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse' :
            'bg-rose-500/10 border-rose-500/20 text-red-400'
          }`}>{c.status}</span>
        </td>
        <td className="px-6 py-4 text-right">
          <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
        </td>
      </tr>
    )
  );
};
"""

# 4. Create CrmPipeline.tsx
crm_pipeline = """import React from 'react';
import { Search, MoreHorizontal, Mail, Phone, Plus } from 'lucide-react';

interface Props {
  pipelineStages: any[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setShowLeadModal: (show: boolean) => void;
  Clock: React.ComponentType<any>;
}

export const CrmPipeline: React.FC<Props> = ({ pipelineStages, searchQuery, setSearchQuery, setShowLeadModal, Clock }) => {
  return (
    <div className="flex flex-col h-full animate-fade-in overflow-hidden p-2 text-xs">
      <div className="flex justify-between items-center mb-4 bg-[var(--bg-secondary)] p-3 rounded-xl border border-[var(--border-color)] shrink-0">
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input 
              type="text" 
              placeholder="Search pipeline..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg pl-9 pr-4 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 transition-colors" 
            />
          </div>
          <div className="h-6 w-px bg-[var(--border-color)]"></div>
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">Total Pipeline deal Value:</span>
            <span className="text-indigo-400 font-bold">
              ${pipelineStages.reduce((total, stage) => total + stage.items.reduce((s: number, item: any) => s + (Number(item.value) || 0), 0), 0).toLocaleString()}
            </span>
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
              {stage.items.map((item: any) => (
                <div key={item.id} className="bg-[var(--bg-primary)] p-3 rounded-xl border border-[var(--border-color)] hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/5 cursor-pointer transition-all group shrink-0 text-left">
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-bold text-sm text-[var(--text-primary)] group-hover:text-indigo-400 transition-colors">{item.name}</h5>
                    <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><MoreHorizontal className="w-4 h-4" /></button>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">{item.contact}</p>
                  <div className="flex justify-between items-center pt-3 border-t border-[var(--border-color)]/50 font-mono">
                    <span className="text-sm font-black text-[var(--text-primary)] font-display">${item.value.toLocaleString()}</span>
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
              <button 
                onClick={() => setShowLeadModal(true)}
                className="w-full py-2.5 rounded-xl border border-dashed border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors flex items-center justify-center gap-2 text-xs font-semibold shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Lead
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
"""

# 5. Create CrmFollowups.tsx
crm_followups = """import React from 'react';
import { Mail, Phone, Users, MoreHorizontal } from 'lucide-react';

interface Props {
  followups: any[];
  renderTable: (headers: string[], data: any[], renderRow: (item: any, i: number) => React.ReactNode) => React.ReactNode;
}

export const CrmFollowups: React.FC<Props> = ({ followups, renderTable }) => {
  return renderTable(
    ['Task ID', 'Follow-up Task Description', 'Related Prospect / Client', 'Interaction Type', 'Due Date Deadline', 'Priority Level'],
    followups,
    (f) => (
      <tr key={f.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
        <td className="px-6 py-4 font-mono font-bold text-indigo-400">{f.id}</td>
        <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{f.task}</td>
        <td className="px-6 py-4">{f.relatedTo}</td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-2 font-semibold">
            {f.type === 'Email' ? <Mail className="w-3.5 h-3.5 text-amber-500"/> : f.type === 'Call' ? <Phone className="w-3.5 h-3.5 text-blue-500"/> : <Users className="w-3.5 h-3.5 text-emerald-500"/>}
            {f.type}
          </div>
        </td>
        <td className="px-6 py-4 text-amber-500 font-semibold font-sans">{f.dueDate}</td>
        <td className="px-6 py-4">
          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
            f.priority === 'High' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
            f.priority === 'Medium' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse' :
            'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}>{f.priority}</span>
        </td>
        <td className="px-6 py-4 text-right">
          <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
        </td>
      </tr>
    )
  );
};
"""

# 6. Create CrmOpportunities.tsx
crm_opportunities = """import React from 'react';
import { Briefcase, MoreHorizontal } from 'lucide-react';

interface Props {
  opportunities: any[];
  handleWinDeal: (id: string) => void;
  renderTable: (headers: string[], data: any[], renderRow: (item: any, i: number) => React.ReactNode) => React.ReactNode;
}

export const CrmOpportunities: React.FC<Props> = ({ opportunities, handleWinDeal, renderTable }) => {
  return renderTable(
    ['Opportunity ID', 'Deal Opportunity Name', 'prospect Account Company', 'Estimated Deal Value', 'Win Probability Matrix', 'Target Close Date', 'Next Actionable step'],
    opportunities,
    (row) => (
      <tr key={row.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs font-sans">
        <td className="px-6 py-4 font-mono font-bold text-indigo-400">{row.id}</td>
        <td className="px-6 py-4 font-bold text-[var(--text-primary)]">
          <div className="flex items-center gap-2">
            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
            {row.name}
          </div>
        </td>
        <td className="px-6 py-4 font-semibold text-[var(--text-secondary)]">{row.company}</td>
        <td className="px-6 py-4 font-mono font-bold text-emerald-400">${row.value.toLocaleString()}</td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-indigo-400">{row.probability}%</span>
            <div className="h-1.5 w-20 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${row.probability}%` }}></div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 font-mono">{row.expectedClose}</td>
        <td className="px-6 py-4 font-semibold text-[var(--text-secondary)]">{row.nextStep}</td>
        <td className="px-6 py-4 text-right">
          <div className="flex items-center justify-end gap-2">
            {row.probability < 100 ? (
              <button 
                onClick={() => handleWinDeal(row.id)}
                className="px-2 py-0.5 text-emerald-400 hover:text-emerald-300 font-bold border border-emerald-500/25 bg-emerald-500/5 rounded text-[9px] cursor-pointer"
              >
                Win Deal
              </button>
            ) : null}
            <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
          </div>
        </td>
      </tr>
    )
  );
};
"""

# 7. Create CrmStages.tsx
crm_stages = """import React from 'react';
import { MoreHorizontal } from 'lucide-react';

interface Props {
  pipelineStages: any[];
  renderTable: (headers: string[], data: any[], renderRow: (item: any, i: number) => React.ReactNode) => React.ReactNode;
}

export const CrmStages: React.FC<Props> = ({ pipelineStages, renderTable }) => {
  return renderTable(
    ['Stage Identifier', 'Kanban Stage Title Name', 'Vibrant Color tag', 'Active leads Count'],
    pipelineStages,
    (row) => (
      <tr key={row.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs font-sans">
        <td className="px-6 py-4 font-mono font-bold text-indigo-400">{row.id}</td>
        <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{row.name}</td>
        <td className="px-6 py-4 flex items-center gap-2">
          <div className={`w-3.5 h-3.5 rounded-full ${row.color}`}></div>
          <span className="font-mono text-[9px] uppercase">{row.color}</span>
        </td>
        <td className="px-6 py-4 font-mono font-bold">{row.items.length} records</td>
        <td className="px-6 py-4 text-right">
          <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
        </td>
      </tr>
    )
  );
};
"""

# 8. Create CrmNotes.tsx
crm_notes = """import React from 'react';
import { Mail, Phone, MoreHorizontal } from 'lucide-react';

interface Props {
  communications: any[];
  renderTable: (headers: string[], data: any[], renderRow: (item: any, i: number) => React.ReactNode) => React.ReactNode;
}

export const CrmNotes: React.FC<Props> = ({ communications, renderTable }) => {
  return renderTable(
    ['Interaction ID', 'Dispatcher (From)', 'Recipient Customer (To)', 'Interaction Summary Subject', 'Method Type', 'Activity date'],
    communications,
    (row) => (
      <tr key={row.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors text-xs">
        <td className="px-6 py-4 font-mono font-bold text-indigo-400">{row.id}</td>
        <td className="px-6 py-4 font-semibold text-[var(--text-primary)]">{row.from}</td>
        <td className="px-6 py-4 font-semibold text-[var(--text-secondary)]">{row.to}</td>
        <td className="px-6 py-4 font-medium text-[var(--text-secondary)]">{row.subject}</td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-1.5 font-semibold">
            {row.type === 'Email' ? <Mail className="w-3.5 h-3.5 text-amber-500"/> : <Phone className="w-3.5 h-3.5 text-blue-500"/>}
            {row.type}
          </div>
        </td>
        <td className="px-6 py-4 font-sans">{row.date}</td>
        <td className="px-6 py-4 text-right">
          <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
        </td>
      </tr>
    )
  );
};
"""

# Helper to write
def write_comp(name, code):
    path = os.path.join(crm_dir, name)
    with open(path, "w", encoding="utf-8") as f:
        f.write(code)
    print(f"Created subcomponent: {name}")

write_comp("CrmDashboard.tsx", crm_dashboard)
write_comp("CrmLeads.tsx", crm_leads)
write_comp("CrmCustomers.tsx", crm_customers)
write_comp("CrmPipeline.tsx", crm_pipeline)
write_comp("CrmFollowups.tsx", crm_followups)
write_comp("CrmOpportunities.tsx", crm_opportunities)
write_comp("CrmStages.tsx", crm_stages)
write_comp("CrmNotes.tsx", crm_notes)
