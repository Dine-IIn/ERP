import React, { useState } from 'react';
import { 
  Users, Activity, PhoneCall, Calendar, 
  Target, BarChart3, Plus, Search, Filter, Download, 
  MoreHorizontal, MessageSquare, Mail, Phone
} from 'lucide-react';

interface Props {
  activeTab?: string;
  user: any;
}

const CrmModule: React.FC<Props> = ({ user, activeTab }) => {
    const mapping: any = {'CRM_DASHBOARD': 'dashboard', 'CRM_LEADS': 'leads', 'CRM_CUSTOMER': 'customers', 'CRM_PIPELINE': 'pipeline', 'CRM_FOLLOWUP': 'followups', 'CRM_OPPORTUNITY': 'opportunities', 'CRM_STAGES': 'stages', 'CRM_NOTES': 'notes'};
  const currentTab = (activeTab && mapping[activeTab]) ? mapping[activeTab] : 'dashboard';

  const tabs = [
    { id: 'dashboard', label: 'CRM Dashboard', icon: BarChart3 },
    { id: 'leads', label: 'Lead Management', icon: Target },
    { id: 'pipeline', label: 'Sales Pipeline', icon: Activity },
    { id: 'customers', label: 'Customer Database', icon: Users },
    { id: 'followup', label: 'Follow-ups & Tasks', icon: Calendar },
    { id: 'communications', label: 'Communications', icon: PhoneCall }
  ];

  // Dummy pipeline data
  const pipelineStages = [
    { 
      id: 'new', name: 'New Leads', color: 'bg-blue-500', 
      items: [
        { id: 'L-102', name: 'TechVision Inc', contact: 'Sarah Miller', value: '$12k', date: '2 days ago' },
        { id: 'L-105', name: 'Alpha Retail', contact: 'John Doe', value: '$8.5k', date: '3 days ago' }
      ]
    },
    { 
      id: 'contacted', name: 'Contacted', color: 'bg-indigo-500', 
      items: [
        { id: 'L-098', name: 'Global Logistics', contact: 'Mark Smith', value: '$45k', date: '1 week ago' },
        { id: 'L-101', name: 'Beta Software', contact: 'Anna Lee', value: '$22k', date: '4 days ago' }
      ]
    },
    { 
      id: 'qualified', name: 'Qualified', color: 'bg-amber-500', 
      items: [
        { id: 'L-085', name: 'Omega Manufacturing', contact: 'Robert Chen', value: '$120k', date: '2 weeks ago' }
      ]
    },
    { 
      id: 'proposal', name: 'Proposal Sent', color: 'bg-purple-500', 
      items: [
        { id: 'L-072', name: 'Delta Dynamics', contact: 'Emma Davis', value: '$65k', date: '1 month ago' },
        { id: 'L-080', name: 'Sigma Corp', contact: 'Tom Wilson', value: '$34k', date: '3 weeks ago' }
      ]
    },
    { 
      id: 'won', name: 'Closed Won', color: 'bg-emerald-500', 
      items: [
        { id: 'L-050', name: 'Epsilon Energy', contact: 'James Taylor', value: '$210k', date: '2 months ago' }
      ]
    }
  ];

  return (
    <div className="max-w-7xl mx-auto select-none animate-fade-in flex flex-col h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4 mb-4">
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
            Add Lead
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {currentTab === 'pipeline' && (
          <div className="flex flex-col h-full animate-fade-in">
            {/* Filter Bar */}
            <div className="flex justify-between items-center mb-6 bg-[var(--bg-secondary)] p-3 rounded-xl border border-[var(--border-color)]">
              <div className="flex items-center gap-4">
                <div className="relative w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input 
                    type="text" 
                    placeholder="Search pipeline..." 
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg pl-9 pr-4 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div className="h-6 w-px bg-[var(--border-color)]"></div>
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="font-semibold text-[var(--text-primary)]">Total Pipeline Value:</span>
                  <span className="text-indigo-400 font-bold">$516,500</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                  <Filter className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Kanban Board */}
            <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
              {pipelineStages.map((stage) => (
                <div key={stage.id} className="flex-shrink-0 w-72 flex flex-col bg-[var(--bg-secondary)]/50 rounded-2xl border border-[var(--border-color)] overflow-hidden">
                  {/* Stage Header */}
                  <div className="p-3 border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]/50 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${stage.color}`}></div>
                      <h4 className="font-bold text-[var(--text-primary)] text-sm">{stage.name}</h4>
                    </div>
                    <span className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs font-bold px-2 py-0.5 rounded-full border border-[var(--border-color)]">
                      {stage.items.length}
                    </span>
                  </div>

                  {/* Stage Items */}
                  <div className="p-3 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                    {stage.items.map((item) => (
                      <div key={item.id} className="bg-[var(--bg-primary)] p-3 rounded-xl border border-[var(--border-color)] hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/5 cursor-pointer transition-all group">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-bold text-sm text-[var(--text-primary)] group-hover:text-indigo-400 transition-colors">{item.name}</h5>
                          <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mb-3">{item.contact}</p>
                        
                        <div className="flex justify-between items-center pt-3 border-t border-[var(--border-color)]/50">
                          <span className="text-sm font-black text-[var(--text-primary)] font-display">{item.value}</span>
                          <div className="flex gap-1.5">
                            <button className="p-1.5 rounded-md bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors" title="Email">
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                            <button className="p-1.5 rounded-md bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors" title="Call">
                              <Phone className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="mt-3 text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last activity: {item.date}
                        </div>
                      </div>
                    ))}
                    
                    {/* Add Card Button */}
                    <button className="w-full py-2.5 rounded-xl border border-dashed border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors flex items-center justify-center gap-2 text-xs font-semibold">
                      <Plus className="w-3.5 h-3.5" />
                      Add Lead
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other tabs placeholder */}
        {currentTab !== 'pipeline' && (
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

// Simple Clock icon component since it wasn't imported from lucide-react initially in the script
const Clock = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export default CrmModule;
