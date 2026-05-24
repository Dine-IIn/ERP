import React, { useState, useEffect } from 'react';
import { 
  Users, Activity, PhoneCall, Calendar, Target, 
  BarChart3, Plus, Search, Filter, Download, MoreHorizontal, 
  MessageSquare, Mail, Phone, ArrowUpRight, ArrowDownRight, Briefcase,
  CheckCircle2, AlertCircle, FileText, Settings, Sliders
} from 'lucide-react';

interface Props {
  activeTab?: string;
  user: any;
  token?: string;
  backendUrl?: string;
}

// Simple Clock icon component
const Clock = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CrmModule: React.FC<Props> = ({ user: _user, activeTab, token, backendUrl }) => {
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
  const [searchQuery, setSearchQuery] = useState('');

  // Interactive UI Modal States
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showOpportunityModal, setShowOpportunityModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);

  // Forms States
  const [newLead, setNewLead] = useState({ name: '', contact: '', email: '', source: 'Website', status: 'New', value: 10000 });
  const [newCustomer, setNewCustomer] = useState({ company: '', contact: '', phone: '', ltv: 5000, status: 'Active' });
  const [newFollowup, setNewFollowup] = useState({ task: '', relatedTo: '', type: 'Call', dueDate: 'Today', priority: 'High' });
  const [newOpportunity, setNewOpportunity] = useState({ name: '', company: '', value: 25000, probability: 50, expectedClose: '', nextStep: '' });
  const [newNote, setNewNote] = useState({ from: 'Me', to: '', subject: '', type: 'Email' });
  const [newStage, setNewStage] = useState({ name: '', color: 'bg-indigo-500' });

  // Toast notifications trigger
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);
  const showToast = (message: string, type: 'success' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- DUMMY DATABASES ---
  const [dashboardStats, setDashboardStats] = useState([
    { title: 'Total Active Leads', value: '1,248 leads', change: '+12% vs last month', isPositive: true, icon: Target, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { title: 'Active CRM Customers', value: '432 clients', change: '+5% this month', isPositive: true, icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Deals Win Rate', value: '64.5%', change: '-2.1% variance', isPositive: false, icon: Activity, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { title: 'Total Pipeline Value', value: '$516.5k', change: '+18% deal value', isPositive: true, icon: Briefcase, color: 'text-amber-500', bg: 'bg-amber-500/10' }
  ]);

  const [leads, setLeads] = useState([
    { id: 'L-1001', name: 'TechVision Inc', contact: 'Sarah Miller', email: 'sarah@techvision.com', source: 'Website', status: 'New', value: 12000 },
    { id: 'L-1002', name: 'Alpha Retail', contact: 'John Doe', email: 'john.doe@alpharetail.co', source: 'Referral', status: 'Contacted', value: 8500 },
    { id: 'L-1003', name: 'Global Logistics', contact: 'Mark Smith', email: 'msmith@global-logistics.net', source: 'Trade Show', status: 'Qualified', value: 45000 },
    { id: 'L-1004', name: 'Beta Software', contact: 'Anna Lee', email: 'anna.l@beta-soft.io', source: 'Cold Call', status: 'Proposal', value: 22000 },
    { id: 'L-1005', name: 'Omega Manufacturing', contact: 'Robert Chen', email: 'rchen@omega.com', source: 'Website', status: 'Lost', value: 120000 }
  ]);

  const [customers, setCustomers] = useState([
    { id: 'C-501', company: 'Epsilon Energy', contact: 'James Taylor', phone: '+1 555-0198', ltv: 210000, lastActive: '2 days ago', status: 'Active' },
    { id: 'C-502', company: 'Delta Dynamics', contact: 'Emma Davis', phone: '+1 555-0245', ltv: 65000, lastActive: '1 week ago', status: 'Active' },
    { id: 'C-503', company: 'Sigma Corp', contact: 'Tom Wilson', phone: '+1 555-0312', ltv: 34000, lastActive: '3 months ago', status: 'At Risk' },
    { id: 'C-504', company: 'Zeta Technologies', contact: 'Lisa Wong', phone: '+1 555-0477', ltv: 95000, lastActive: '1 year ago', status: 'Churned' }
  ]);

  const [followups, setFollowups] = useState([
    { id: 'F-101', task: 'Follow up on proposal details', relatedTo: 'Beta Software', type: 'Call', dueDate: 'Today, 2:00 PM', priority: 'High' },
    { id: 'F-102', task: 'Send pricing sheets and SLAs', relatedTo: 'TechVision Inc', type: 'Email', dueDate: 'Tomorrow, 10:00 AM', priority: 'Medium' },
    { id: 'F-103', task: 'Quarterly review meeting', relatedTo: 'Epsilon Energy', type: 'Meeting', dueDate: 'Oct 25, 2026', priority: 'Medium' },
    { id: 'F-104', task: 'Check contract status details', relatedTo: 'Global Logistics', type: 'Call', dueDate: 'Oct 28, 2026', priority: 'Low' }
  ]);

  const [opportunities, setOpportunities] = useState([
    { id: 'OPP-301', name: 'Cloud Migration Infrastructure', company: 'Global Logistics', value: 45000, probability: 70, expectedClose: 'Jun 15, 2026', nextStep: 'Negotiate final SLAs' },
    { id: 'OPP-302', name: 'Software Licenses Supply', company: 'Beta Software', value: 22000, probability: 50, expectedClose: 'Jun 22, 2026', nextStep: 'Send proposal v2' },
    { id: 'OPP-303', name: 'Factory Automation System', company: 'Omega Manufacturing', value: 120000, probability: 10, expectedClose: 'Jul 30, 2026', nextStep: 'Address lost lead feedback' }
  ]);

  const [communications, setCommunications] = useState([
    { id: 'MSG-01', from: 'Me', to: 'Sarah Miller (TechVision)', subject: 'Following up on our conversation', type: 'Email', date: '2 hours ago' },
    { id: 'MSG-02', from: 'John Doe (Alpha Retail)', to: 'Me', subject: 'Re: Product Demo request', type: 'Email', date: 'Yesterday' },
    { id: 'MSG-03', from: 'Me', to: 'James Taylor (Epsilon)', subject: 'Outbound Call (Duration: 5m 23s)', type: 'Call', date: 'May 18, 2026' }
  ]);

  const [pipelineStages, setPipelineStages] = useState([
    { id: 'new', name: 'New Leads', color: 'bg-blue-500', items: [ { id: 'L-1001', name: 'TechVision Inc', contact: 'Sarah Miller', value: 12000, date: '2 days ago' }, { id: 'L-1002', name: 'Alpha Retail', contact: 'John Doe', value: 8500, date: '3 days ago' } ] },
    { id: 'contacted', name: 'Contacted', color: 'bg-indigo-500', items: [ { id: 'L-1003', name: 'Global Logistics', contact: 'Mark Smith', value: 45000, date: '1 week ago' }, { id: 'L-1004', name: 'Beta Software', contact: 'Anna Lee', value: 22000, date: '4 days ago' } ] },
    { id: 'qualified', name: 'Qualified', color: 'bg-amber-500', items: [] },
    { id: 'proposal', name: 'Proposal Sent', color: 'bg-purple-500', items: [] },
    { id: 'won', name: 'Closed Won', color: 'bg-emerald-500', items: [] }
  ]);

  // --- DATABASE SYNC & BACKEND CONNECTIVITY ---
  const [isLoaded, setIsLoaded] = useState(false);

  const apiRequest = async (endpoint: string, method = 'GET', body: any = null) => {
    if (!token || !backendUrl) return null;
    try {
      const headers: any = { 'Authorization': `Bearer ${token}` };
      if (body) headers['Content-Type'] = 'application/json';
      const res = await fetch(`${backendUrl}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Request failed');
      }
      return await res.json();
    } catch (err) {
      console.error(`[CRM API Error] ${endpoint}:`, err);
      return null;
    }
  };

  useEffect(() => {
    if (!token || !backendUrl) return;

    const loadData = async () => {
      try {
        // 1. Leads
        const dbLeads = await apiRequest('/api/store/crm_leads');
        if (dbLeads && dbLeads.length > 0) {
          setLeads(dbLeads);
        } else {
          await apiRequest('/api/store/crm_leads/bulk', 'POST', leads);
        }

        // 2. Customers
        const dbCustomers = await apiRequest('/api/store/crm_customers');
        if (dbCustomers && dbCustomers.length > 0) {
          setCustomers(dbCustomers);
        } else {
          await apiRequest('/api/store/crm_customers/bulk', 'POST', customers);
        }

        // 3. Followups
        const dbFollowups = await apiRequest('/api/store/crm_followups');
        if (dbFollowups && dbFollowups.length > 0) {
          setFollowups(dbFollowups);
        } else {
          await apiRequest('/api/store/crm_followups/bulk', 'POST', followups);
        }

        // 4. Opportunities
        const dbOpportunities = await apiRequest('/api/store/crm_opportunities');
        if (dbOpportunities && dbOpportunities.length > 0) {
          setOpportunities(dbOpportunities);
        } else {
          await apiRequest('/api/store/crm_opportunities/bulk', 'POST', opportunities);
        }

        // 5. Communications
        const dbComms = await apiRequest('/api/store/crm_communications');
        if (dbComms && dbComms.length > 0) {
          setCommunications(dbComms);
        } else {
          await apiRequest('/api/store/crm_communications/bulk', 'POST', communications);
        }

        // 6. Pipeline stages
        const dbPipeline = await apiRequest('/api/store/crm_pipeline');
        if (dbPipeline && dbPipeline.length > 0) {
          setPipelineStages(dbPipeline);
        } else {
          await apiRequest('/api/store/crm_pipeline/bulk', 'POST', pipelineStages);
        }

        setIsLoaded(true);
      } catch (err) {
        console.error('Error loading CRM data from backend:', err);
        setIsLoaded(true);
      }
    };

    loadData();
  }, [token, backendUrl]);

  // Synchronizers to write state changes to the SQLite database
  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/crm_leads/bulk', 'POST', leads);
  }, [leads, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/crm_customers/bulk', 'POST', customers);
  }, [customers, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/crm_followups/bulk', 'POST', followups);
  }, [followups, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/crm_opportunities/bulk', 'POST', opportunities);
  }, [opportunities, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/crm_communications/bulk', 'POST', communications);
  }, [communications, isLoaded, token, backendUrl]);

  useEffect(() => {
    if (!isLoaded || !token || !backendUrl) return;
    apiRequest('/api/store/crm_pipeline/bulk', 'POST', pipelineStages);
  }, [pipelineStages, isLoaded, token, backendUrl]);

  // --- ACTIONS HANDLERS ---
  const handleSaveLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.name || !newLead.contact) {
      showToast('Please fill out lead and contact names', 'warning');
      return;
    }
    const nextId = `L-${1000 + leads.length + 1}`;
    const valVal = Number(newLead.value);
    const newLeadObj = {
      id: nextId,
      name: newLead.name,
      contact: newLead.contact,
      email: newLead.email || `${newLead.contact.toLowerCase().replace(' ', '.')}@company.com`,
      source: newLead.source,
      status: newLead.status,
      value: valVal
    };
    setLeads([newLeadObj, ...leads]);

    // Append to pipeline boards in state!
    setPipelineStages(prev => prev.map(s => {
      if (s.id === 'new') {
        const nextItems = [...s.items, { id: nextId, name: newLead.name, contact: newLead.contact, value: valVal, date: 'Just now' }];
        return { ...s, items: nextItems };
      }
      return s;
    }));

    // Update Dashboard Value
    setDashboardStats(prev => {
      const copy = [...prev];
      const curLds = parseInt(copy[0].value.split(' ')[0].replace(/,/g, ''));
      const currPipelineVal = parseFloat(copy[3].value.replace('$', '').replace('k', '')) * 1000;
      
      copy[0] = { ...copy[0], value: `${(curLds + 1).toLocaleString()} leads` };
      copy[3] = { ...copy[3], value: `$${((currPipelineVal + valVal) / 1000).toFixed(1)}k` };
      return copy;
    });

    showToast(`Lead ${nextId} created and added to pipeline!`, 'success');
    setShowLeadModal(false);
    setNewLead({ name: '', contact: '', email: '', source: 'Website', status: 'New', value: 10000 });
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.company || !newCustomer.contact) {
      showToast('Please specify customer company name and contact person', 'warning');
      return;
    }
    const nextId = `C-${500 + customers.length + 1}`;
    const newCustObj = {
      id: nextId,
      company: newCustomer.company,
      contact: newCustomer.contact,
      phone: newCustomer.phone || '+1 555-9000',
      ltv: Number(newCustomer.ltv),
      lastActive: 'Just now',
      status: newCustomer.status
    };
    setCustomers([newCustObj, ...customers]);

    // Update Client Dashboard KPI
    setDashboardStats(prev => {
      const copy = [...prev];
      const currCli = parseInt(copy[1].value.split(' ')[0]);
      copy[1] = { ...copy[1], value: `${currCli + 1} clients` };
      return copy;
    });

    showToast(`Active Customer portfolio ${nextId} added successfully!`, 'success');
    setShowCustomerModal(false);
    setNewCustomer({ company: '', contact: '', phone: '', ltv: 5000, status: 'Active' });
  };

  const handleSaveFollowup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFollowup.task || !newFollowup.relatedTo) {
      showToast('Please specify follow-up task and target client', 'warning');
      return;
    }
    const nextId = `F-${100 + followups.length + 1}`;
    const newFlwObj = {
      id: nextId,
      task: newFollowup.task,
      relatedTo: newFollowup.relatedTo,
      type: newFollowup.type,
      dueDate: newFollowup.dueDate,
      priority: newFollowup.priority
    };
    setFollowups([newFlwObj, ...followups]);
    showToast(`Follow-up scheduler ${nextId} queued!`, 'success');
    setShowFollowUpModal(false);
    setNewFollowup({ task: '', relatedTo: '', type: 'Call', dueDate: 'Today', priority: 'High' });
  };

  const handleSaveOpportunity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpportunity.name || !newOpportunity.company) {
      showToast('Please specify opportunity title and prospect company', 'warning');
      return;
    }
    const nextId = `OPP-${300 + opportunities.length + 1}`;
    const valVal = Number(newOpportunity.value);
    const newOppObj = {
      id: nextId,
      name: newOpportunity.name,
      company: newOpportunity.company,
      value: valVal,
      probability: Number(newOpportunity.probability),
      expectedClose: newOpportunity.expectedClose || 'Jun 30, 2026',
      nextStep: newOpportunity.nextStep || 'Present proposal'
    };
    setOpportunities([newOppObj, ...opportunities]);

    // Update KPI deal size
    setDashboardStats(prev => {
      const copy = [...prev];
      const currPipelineVal = parseFloat(copy[3].value.replace('$', '').replace('k', '')) * 1000;
      copy[3] = { ...copy[3], value: `$${((currPipelineVal + valVal) / 1000).toFixed(1)}k` };
      return copy;
    });

    showToast(`Logged Sales Opportunity ${nextId} in deal pipeline`, 'success');
    setShowOpportunityModal(false);
    setNewOpportunity({ name: '', company: '', value: 25000, probability: 50, expectedClose: '', nextStep: '' });
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.to || !newNote.subject) {
      showToast('Please specify recipient and summary subject notes', 'warning');
      return;
    }
    const nextId = `MSG-${10 + communications.length + 1}`;
    const newNoteObj = {
      id: nextId,
      from: 'Me',
      to: newNote.to,
      subject: newNote.subject,
      type: newNote.type,
      date: 'Just now'
    };
    setCommunications([newNoteObj, ...communications]);
    showToast(`Interaction details ${nextId} compiled!`, 'success');
    setShowNoteModal(false);
    setNewNote({ from: 'Me', to: '', subject: '', type: 'Email' });
  };

  const handleSaveStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStage.name) {
      showToast('Please specify stage name', 'warning');
      return;
    }
    const nextId = newStage.name.toLowerCase().replace(' ', '_');
    const newStageObj = {
      id: nextId,
      name: newStage.name,
      color: newStage.color,
      items: []
    };
    setPipelineStages([...pipelineStages, newStageObj]);
    showToast(`Pipeline Kanban Stage "${newStage.name}" added successfully!`, 'success');
    setShowStageModal(false);
    setNewStage({ name: '', color: 'bg-indigo-500' });
  };

  const handleQualifyLead = (leadId: string) => {
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        showToast(`Lead ${leadId} qualified! deal sizing escalated!`, 'success');
        
        // Spawn opportunity in state
        const nextOppId = `OPP-${300 + opportunities.length + 1}`;
        const autoOpp = {
          id: nextOppId,
          name: `${l.name} ERP Integration`,
          company: l.name,
          value: l.value * 1.5,
          probability: 20,
          expectedClose: 'Jul 15, 2026',
          nextStep: 'Present initial architecture proposal'
        };
        setOpportunities(prevOpp => [autoOpp, ...prevOpp]);

        // Move stage to "Qualified" in Kanban state
        setPipelineStages(prevStages => prevStages.map(s => {
          if (s.id === 'contacted' || s.id === 'new') {
            s.items = s.items.filter(i => i.id !== leadId);
          }
          if (s.id === 'qualified') {
            s.items = [...s.items, { id: leadId, name: l.name, contact: l.contact, value: l.value * 1.5, date: 'Just now' }];
          }
          return s;
        }));

        return { ...l, status: 'Qualified' };
      }
      return l;
    }));
  };

  const handleWinDeal = (oppId: string) => {
    setOpportunities(prev => prev.map(o => {
      if (o.id === oppId) {
        showToast(`Closed Won! Deal ${oppId} is finalized. Customer portfolio spawned!`, 'success');
        
        // Spawn active customer portfolio
        const nextCustId = `C-${500 + customers.length + 1}`;
        const autoCust = {
          id: nextCustId,
          company: o.company,
          contact: 'Primary Lead',
          phone: '+1 555-9988',
          ltv: o.value,
          lastActive: 'Just now',
          status: 'Active'
        };
        setCustomers(prevCust => [autoCust, ...prevCust]);

        // Move to Closed Won in Kanban pipeline
        setPipelineStages(prevStages => prevStages.map(s => {
          if (s.id === 'qualified' || s.id === 'proposal' || s.id === 'contacted') {
            s.items = s.items.filter(i => i.id !== o.id);
          }
          if (s.id === 'won') {
            s.items = [...s.items, { id: o.id, name: o.company, contact: o.name, value: o.value, date: 'Closed Won' }];
          }
          return s;
        }));

        // Increment Win Rate and client metrics
        setDashboardStats(prevStats => {
          const copy = [...prevStats];
          const currWin = parseFloat(copy[2].value.replace('%', ''));
          const currCli = parseInt(copy[1].value.split(' ')[0]);

          copy[1] = { ...copy[1], value: `${currCli + 1} clients` };
          copy[2] = { ...copy[2], value: `${(currWin + 3.2).toFixed(1)}%` };
          return copy;
        });

        return { ...o, probability: 100, nextStep: 'Contract Finalized' };
      }
      return o;
    }));
  };

  // --- RENDER TABLES SEARCH ENGINE FILTER ---
  const renderTable = (headers: string[], data: any[], renderRow: (item: any, i: number) => React.ReactNode) => {
    const filteredData = data.filter(item => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return Object.values(item).some(val => 
        val && String(val).toLowerCase().includes(query)
      );
    });

    return (
      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] overflow-hidden flex flex-col h-full animate-fade-in m-2 text-xs">
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
            <button className="p-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">
              <Filter className="w-4 h-4" />
            </button>
            <button className="p-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">
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
              {filteredData.map((item, i) => renderRow(item, i))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto select-none animate-fade-in flex flex-col h-[calc(100vh-80px)] p-4 text-left relative text-xs">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border flex items-center gap-2 shadow-2xl backdrop-blur-md animate-scale-up ${
          toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
          'bg-amber-500/10 border-amber-500/30 text-amber-400'
        }`}>
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4 mb-4 shrink-0">
        <div>
          <h3 className="font-bold text-xl text-[var(--text-primary)] flex items-center gap-2 font-display">
            <Users className="w-6 h-6 text-indigo-500" />
            Customer Relationship Management Hub
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1 font-sans">Audit leads, qualify prospects, track deal pipelines value, schedule follow-ups, opportunities and communications history</p>
        </div>
        <div className="flex gap-2">
          {currentTab === 'leads' && (
            <button 
              onClick={() => setShowLeadModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up"
            >
              <Plus className="w-4 h-4" /> Create Lead
            </button>
          )}
          {currentTab === 'customers' && (
            <button 
              onClick={() => setShowCustomerModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up"
            >
              <Plus className="w-4 h-4" /> Add Customer Portfolio
            </button>
          )}
          {currentTab === 'followups' && (
            <button 
              onClick={() => setShowFollowUpModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up"
            >
              <Plus className="w-4 h-4" /> Schedule Follow-up
            </button>
          )}
          {currentTab === 'opportunities' && (
            <button 
              onClick={() => setShowOpportunityModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up"
            >
              <Plus className="w-4 h-4" /> Log Opportunity
            </button>
          )}
          {currentTab === 'notes' && (
            <button 
              onClick={() => setShowNoteModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up"
            >
              <Plus className="w-4 h-4" /> Log Interaction Note
            </button>
          )}
          {currentTab === 'stages' && (
            <button 
              onClick={() => setShowStageModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer animate-scale-up"
            >
              <Plus className="w-4 h-4" /> Add Kanban Stage
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {currentTab === 'dashboard' && renderDashboard()}

        {/* VIEW 1: LEAD MANAGEMENT */}
        {currentTab === 'leads' && renderTable(
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
        )}

        {/* VIEW 2: CUSTOMERS PORTFOLIO */}
        {currentTab === 'customers' && renderTable(
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
        )}

        {/* VIEW 3: SALES PIPELINE KANBAN BOARD */}
        {currentTab === 'pipeline' && (
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
        )}

        {/* VIEW 4: FOLLOW-UP REMINDERS */}
        {currentTab === 'followups' && renderTable(
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
                  f.priority === 'Medium' ? 'bg-amber-500/10 border-amber-500/20 text-amber-505 animate-pulse' :
                  'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}>{f.priority}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-[var(--text-muted)] hover:text-indigo-400 p-1 cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
              </td>
            </tr>
          )
        )}

        {/* VIEW 5: OPPORTUNITY TRACKING */}
        {currentTab === 'opportunities' && renderTable(
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
        )}

        {/* VIEW 6: KANBAN LEAD STAGES CONFIG */}
        {currentTab === 'stages' && renderTable(
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
        )}

        {/* VIEW 7: COMMUNICATION INTERACTION HISTORY */}
        {currentTab === 'notes' && renderTable(
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
        )}

      </div>

      {/* ==========================================
          MODALS CORE DRAWERS
          ========================================== */}

      {/* Create Lead Modal */}
      {showLeadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveLead} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowLeadModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <Target className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Create Deal Prospect Lead</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Prospect Lead Company Name</label>
                <input type="text" placeholder="e.g. Wayne Enterprises" value={newLead.name} onChange={(e) => setNewLead({ ...newLead, name: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Primary Contact Person</label>
                  <input type="text" placeholder="Sarah Miller" value={newLead.contact} onChange={(e) => setNewLead({ ...newLead, contact: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Source channel</label>
                  <select value={newLead.source} onChange={(e) => setNewLead({ ...newLead, source: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                    <option value="Website">Corporate Website</option>
                    <option value="Referral">Direct Referral</option>
                    <option value="Trade Show">Trade Show / Exhibition</option>
                    <option value="Cold Call">Cold Outreach</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Estimated Deal Size ($)</label>
                  <input type="number" placeholder="25000" value={newLead.value} onChange={(e) => setNewLead({ ...newLead, value: Number(e.target.value) })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-mono" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Client Email Address</label>
                  <input type="email" placeholder="sarah@wayne.com" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-sans" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowLeadModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Save Lead</button>
            </div>
          </form>
        </div>
      )}

      {/* Add Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveCustomer} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowCustomerModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <Users className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Add Customer Portfolio</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Company Account Name</label>
                <input type="text" placeholder="e.g. Wayne Enterprises" value={newCustomer.company} onChange={(e) => setNewCustomer({ ...newCustomer, company: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Primary Account Representative</label>
                  <input type="text" placeholder="Lisa Wong" value={newCustomer.contact} onChange={(e) => setNewCustomer({ ...newCustomer, contact: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Primary Contact Phone</label>
                  <input type="text" placeholder="+1 555-0477" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Lifetime Value (LTV) ($)</label>
                  <input type="number" placeholder="50000" value={newCustomer.ltv} onChange={(e) => setNewCustomer({ ...newCustomer, ltv: Number(e.target.value) })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-mono" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Account Health Status</label>
                  <select value={newCustomer.status} onChange={(e) => setNewCustomer({ ...newCustomer, status: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                    <option value="Active">Operational (Active)</option>
                    <option value="At Risk">At Risk (Inactivity warning)</option>
                    <option value="Churned">Churned (Inactive)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowCustomerModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Log Customer</button>
            </div>
          </form>
        </div>
      )}

      {/* Schedule Follow-up Modal */}
      {showFollowUpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveFollowup} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowFollowUpModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <Calendar className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Schedule Follow-up reminder</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Follow-up Task Description</label>
                <input type="text" placeholder="e.g. Follow up on proposal details, send pricing sheets" value={newFollowup.task} onChange={(e) => setNewFollowup({ ...newFollowup, task: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Related Prospect / Client</label>
                  <input type="text" placeholder="e.g. Beta Software" value={newFollowup.relatedTo} onChange={(e) => setNewFollowup({ ...newFollowup, relatedTo: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Interaction Type</label>
                  <select value={newFollowup.type} onChange={(e) => setNewFollowup({ ...newFollowup, type: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                    <option value="Call">Phone Call</option>
                    <option value="Email">Outbound Email</option>
                    <option value="Meeting">Floor / Zoom Meeting</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Due Deadline (e.g. Tomorrow, 10:00 AM)</label>
                  <input type="text" placeholder="Today, 3:00 PM" value={newFollowup.dueDate} onChange={(e) => setNewFollowup({ ...newFollowup, dueDate: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Priority Grade</label>
                  <select value={newFollowup.priority} onChange={(e) => setNewFollowup({ ...newFollowup, priority: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                    <option value="High">High priority alert</option>
                    <option value="Medium">Medium standard limits</option>
                    <option value="Low">Low servicing only</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowFollowUpModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Schedule Reminder</button>
            </div>
          </form>
        </div>
      )}

      {/* Log Opportunity Modal */}
      {showOpportunityModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveOpportunity} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowOpportunityModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <Briefcase className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Log Sales Opportunity Deal</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Deal Opportunity Name</label>
                <input type="text" placeholder="e.g. Cloud Migration Infrastructure" value={newOpportunity.name} onChange={(e) => setNewOpportunity({ ...newOpportunity, name: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">prospect Account Company</label>
                  <input type="text" placeholder="e.g. Global Logistics" value={newOpportunity.company} onChange={(e) => setNewOpportunity({ ...newOpportunity, company: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Expected Deal Value ($)</label>
                  <input type="number" placeholder="50000" value={newOpportunity.value} onChange={(e) => setNewOpportunity({ ...newOpportunity, value: Number(e.target.value) })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Win Probability Matrix (%): {newOpportunity.probability}%</label>
                  <input type="range" min="10" max="100" value={newOpportunity.probability} onChange={(e) => setNewOpportunity({ ...newOpportunity, probability: Number(e.target.value) })} className="w-full accent-indigo-600 h-1.5 bg-[var(--bg-primary)] rounded-lg appearance-none cursor-pointer" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Target Close Date</label>
                  <input type="date" value={newOpportunity.expectedClose} onChange={(e) => setNewOpportunity({ ...newOpportunity, expectedClose: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Next Actionable step</label>
                <input type="text" placeholder="e.g. Present SLA architecture draft" value={newOpportunity.nextStep} onChange={(e) => setNewOpportunity({ ...newOpportunity, nextStep: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-sans" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowOpportunityModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Log Opportunity</button>
            </div>
          </form>
        </div>
      )}

      {/* Log Interaction Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveNote} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowNoteModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Log Customer Interaction Note</h4>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Customer Recipient (To)</label>
                  <input type="text" placeholder="Sarah Miller (TechVision)" value={newNote.to} onChange={(e) => setNewNote({ ...newNote, to: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-sans" required />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Interaction Method Type</label>
                  <select value={newNote.type} onChange={(e) => setNewNote({ ...newNote, type: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none">
                    <option value="Email">Outbound Email</option>
                    <option value="Call">Phone Call</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Interaction Summary Subject</label>
                <textarea placeholder="e.g. Discussed SLA proposal, product demo duration call logs notes" value={newNote.subject} onChange={(e) => setNewNote({ ...newNote, subject: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none h-20 resize-none font-sans" required />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowNoteModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Compile Note</button>
            </div>
          </form>
        </div>
      )}

      {/* Add Kanban Stage Modal */}
      {showStageModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in text-xs">
          <form onSubmit={handleSaveStage} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-sm p-6 relative shadow-2xl text-left select-none text-xs">
            <button type="button" onClick={() => setShowStageModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">✕</button>
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)] mb-4">
              <Sliders className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-sm text-[var(--text-primary)] font-display">Add Pipeline Kanban Stage</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Kanban Stage Title Name</label>
                <input type="text" placeholder="e.g. Negotiation" value={newStage.name} onChange={(e) => setNewStage({ ...newStage, name: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none" required />
              </div>
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] block mb-1">Vibrant Color Tag Class</label>
                <select value={newStage.color} onChange={(e) => setNewStage({ ...newStage, color: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-primary)] focus:outline-none font-mono">
                  <option value="bg-indigo-500">bg-indigo-500 (Purple)</option>
                  <option value="bg-blue-500">bg-blue-500 (Blue)</option>
                  <option value="bg-emerald-500">bg-emerald-500 (Green)</option>
                  <option value="bg-amber-500">bg-amber-500 (Yellow)</option>
                  <option value="bg-rose-500">bg-rose-500 (Red)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-4">
              <button type="button" onClick={() => setShowStageModal(false)} className="py-1.5 px-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
              <button type="submit" className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer">Register Stage</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default CrmModule;
