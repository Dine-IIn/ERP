import React, { useState } from 'react';
import { DollarSign, Calendar, Search, Plus, Edit, Trash2, X, AlertCircle, CheckCircle2, TrendingUp, Layers, LayoutGrid, List } from 'lucide-react';

interface Opportunity {
  id: string;
  leadId: string;
  lead: { id: string; name: string; companyName?: string };
  title: string;
  value: number;
  stage: string;
  probability: number;
  closeDate?: string;
  createdAt: string;
}

interface OpportunitiesProps {
  opportunities: Opportunity[];
  leads: any[];
  onCreateOpportunity: (opp: any) => Promise<void>;
  onUpdateOpportunity: (id: string, opp: any) => Promise<void>;
  onDeleteOpportunity: (id: string) => Promise<void>;
  currencySymbol?: string;
}

const STAGES = [
  { key: 'PROSPECTING', name: 'Prospecting', color: 'text-blue-450 border-blue-500/20 bg-blue-500/5' },
  { key: 'PROPOSAL', name: 'Proposal Sent', color: 'text-indigo-400 border-indigo-500/20 bg-indigo-500/5' },
  { key: 'NEGOTIATION', name: 'In Negotiation', color: 'text-amber-400 border-amber-500/20 bg-amber-500/5' },
  { key: 'WON', name: 'Deal Won', color: 'text-emerald-450 border-emerald-500/20 bg-emerald-500/5' },
  { key: 'LOST', name: 'Deal Lost', color: 'text-red-400 border-red-500/20 bg-red-500/5' }
];

export default function Opportunities({
  opportunities,
  leads,
  onCreateOpportunity,
  onUpdateOpportunity,
  onDeleteOpportunity,
  currencySymbol = '$'
}: OpportunitiesProps) {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [leadId, setLeadId] = useState('');
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [stage, setStage] = useState('PROSPECTING');
  const [probability, setProbability] = useState('20');
  const [closeDate, setCloseDate] = useState('');

  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const openAddModal = () => {
    setLeadId(leads[0]?.id || '');
    setTitle('');
    setValue('');
    setStage('PROSPECTING');
    setProbability('20');
    setCloseDate('');
    setIsEditing(false);
    setEditingId(null);
    setLocalErr(null);
    setLocalSuccess(null);
    setShowModal(true);
  };

  const openEditModal = (opp: Opportunity) => {
    setLeadId(opp.leadId);
    setTitle(opp.title);
    setValue(String(opp.value));
    setStage(opp.stage);
    setProbability(String(opp.probability));
    setCloseDate(opp.closeDate ? opp.closeDate.substring(0, 10) : '');
    setIsEditing(true);
    setEditingId(opp.id);
    setLocalErr(null);
    setLocalSuccess(null);
    setShowModal(true);
  };

  const handleStageChange = (selectedStage: string) => {
    setStage(selectedStage);
    // Auto-fill typical win probabilities by stage
    switch (selectedStage) {
      case 'PROSPECTING': setProbability('20'); break;
      case 'PROPOSAL': setProbability('50'); break;
      case 'NEGOTIATION': setProbability('75'); break;
      case 'WON': setProbability('100'); break;
      case 'LOST': setProbability('0'); break;
      default: break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId || !title.trim() || !value.trim() || !stage) {
      setLocalErr("Associated lead, opportunity title, valuation, and sales stage are required.");
      return;
    }

    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    const payload = {
      leadId,
      title: title.trim(),
      value: parseFloat(value) || 0.0,
      stage,
      probability: parseFloat(probability) || 0.0,
      closeDate: closeDate || null
    };

    try {
      if (isEditing && editingId) {
        await onUpdateOpportunity(editingId, payload);
        setLocalSuccess("Sales opportunity successfully updated!");
      } else {
        await onCreateOpportunity(payload);
        setLocalSuccess("New sales opportunity registered successfully!");
      }
      setTimeout(() => {
        setShowModal(false);
      }, 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to process opportunity.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently discard the opportunity '${name}'?`)) {
      try {
        await onDeleteOpportunity(id);
      } catch (err: any) {
        alert(err.message || "Failed to discard opportunity.");
      }
    }
  };

  const filteredOpps = opportunities.filter(opp =>
    opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opp.lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (opp.lead.companyName && opp.lead.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStageValuationSum = (stageKey: string) => {
    return filteredOpps
      .filter(o => o.stage === stageKey)
      .reduce((sum, o) => sum + o.value, 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            CRM Opportunities Pipeline
          </h1>
          <p className="text-slate-400 text-sm mt-1">Track high-value corporate deals, pipeline progression, win probabilities, and value forecasting.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Toggles */}
          <div className="flex items-center bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-indigo-500/20 text-indigo-400 font-semibold' : 'text-slate-500 hover:text-slate-350'}`}
              title="Pipeline board view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-indigo-500/20 text-indigo-400 font-semibold' : 'text-slate-500 hover:text-slate-350'}`}
              title="Data Grid ledger view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-5 h-5" />
            Create Deal / Opportunity
          </button>
        </div>
      </div>

      {/* Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-900/20 border border-slate-800/40 rounded-2xl backdrop-blur-xl">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search deals, company, or prospects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950/40 border border-slate-850/60 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-white text-sm outline-none transition-all"
          />
        </div>
        <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-950/40 border border-slate-800 px-4 py-2 rounded-xl">
          Total Pipeline Value: <span className="text-emerald-400 text-sm font-mono ml-1 font-bold">{currencySymbol}{filteredOpps.reduce((sum, o) => sum + o.value, 0).toLocaleString()}</span>
        </div>
      </div>

      {/* Kanban Pipeline Board View */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start select-none">
          {STAGES.map((st) => {
            const laneOpps = filteredOpps.filter(o => o.stage === st.key);
            const laneVal = getStageValuationSum(st.key);
            return (
              <div key={st.key} className="bg-slate-900/40 border border-slate-800/60 p-4 rounded-2xl flex flex-col min-h-[480px] backdrop-blur-md">
                {/* Lane Header */}
                <div className="pb-3 border-b border-slate-800/80 mb-4 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm tracking-wide">{st.name}</span>
                    <span className="px-2 py-0.5 text-xs bg-slate-850 text-slate-400 rounded-full font-mono font-bold">
                      {laneOpps.length}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-emerald-450 font-semibold">{currencySymbol}{laneVal.toLocaleString()}</div>
                </div>

                {/* Cards Container */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] scrollbar-thin">
                  {laneOpps.length === 0 ? (
                    <div className="py-12 text-center text-slate-650 text-xs border border-dashed border-slate-800/40 rounded-xl bg-slate-950/5">
                      No deals here
                    </div>
                  ) : (
                    laneOpps.map((opp) => (
                      <div
                        key={opp.id}
                        className="bg-slate-950/40 hover:bg-slate-950/70 border border-slate-850/60 p-4.5 rounded-xl transition-all hover:shadow-lg hover:border-slate-800 group relative cursor-pointer"
                        onClick={() => openEditModal(opp)}
                      >
                        <h4 className="font-bold text-slate-200 text-sm group-hover:text-emerald-400 transition-colors line-clamp-2 leading-tight">
                          {opp.title}
                        </h4>
                        
                        <div className="text-xs text-indigo-400 font-semibold mt-2 line-clamp-1">
                          {opp.lead.companyName || opp.lead.name}
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-855/40 text-xs">
                          <span className="font-mono text-emerald-450 font-bold">
                            {currencySymbol}{opp.value.toLocaleString()}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-900 text-slate-400 rounded-lg text-[10px] font-bold">
                            {opp.probability}% win
                          </span>
                        </div>

                        {opp.closeDate && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-2 font-mono">
                            <Calendar className="w-3 h-3 text-slate-600" />
                            <span>{new Date(opp.closeDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Standard Data Grid Table View */
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl backdrop-blur-xl overflow-hidden">
          <div className="overflow-x-auto">
            {filteredOpps.length === 0 ? (
              <div className="p-12 text-center">
                <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">No sales opportunities found</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-medium uppercase tracking-wider text-xs bg-slate-950/40">
                    <th className="py-4 px-6">Opportunity Title</th>
                    <th className="py-4 px-6">Lead Account</th>
                    <th className="py-4 px-6">Estimated Value</th>
                    <th className="py-4 px-6">Win Probability</th>
                    <th className="py-4 px-6">Forecast Close Date</th>
                    <th className="py-4 px-6">Pipeline stage</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredOpps.map((opp) => (
                    <tr key={opp.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-4 px-6 font-semibold text-white">{opp.title}</td>
                      <td className="py-4 px-6">
                        <div className="text-white">{opp.lead.name}</div>
                        {opp.lead.companyName && <div className="text-xs text-indigo-400 mt-0.5">{opp.lead.companyName}</div>}
                      </td>
                      <td className="py-4 px-6 font-mono text-emerald-400 text-base font-semibold">
                        {currencySymbol}{opp.value.toLocaleString()}
                      </td>
                      <td className="py-4 px-6">
                        <div className="w-full bg-slate-850 rounded-full h-1.5 max-w-[80px] mb-1 border border-slate-800">
                          <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${opp.probability}%` }}></div>
                        </div>
                        <span className="font-mono text-xs text-slate-400">{opp.probability}% probability</span>
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-350">
                        {opp.closeDate ? new Date(opp.closeDate).toLocaleDateString() : 'TBD'}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 text-xs rounded-full font-bold border ${STAGES.find(s => s.key === opp.stage)?.color || 'bg-slate-850 border-slate-800 text-slate-400'}`}>
                          {STAGES.find(s => s.key === opp.stage)?.name || opp.stage}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(opp)}
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors rounded-lg"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(opp.id, opp.title)}
                          className="p-1.5 hover:bg-slate-850 text-slate-550 hover:text-red-400 transition-colors rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Slide-over or Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transform transition-all">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-lg font-bold text-white">
                {isEditing ? 'Modify Deal Parameters' : 'Initiate Sales Deal / Opportunity'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {localErr && (
                <div className="flex items-center gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{localErr}</span>
                </div>
              )}

              {localSuccess && (
                <div className="flex items-center gap-2.5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <span>{localSuccess}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Associate Lead Prospect</label>
                <select
                  value={leadId}
                  onChange={(e) => setLeadId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 transition-all text-sm"
                  required
                >
                  <option value="" disabled>Choose active lead record</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.name} {l.companyName ? `(${l.companyName})` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Opportunity Title / Summary</label>
                <input
                  type="text"
                  placeholder="e.g. 500 Tons Metal Tubes Purchase"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 transition-all text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Forecasting Valuation ({currencySymbol})</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 transition-all text-sm font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Forecast Close Date</label>
                  <input
                    type="date"
                    value={closeDate}
                    onChange={(e) => setCloseDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 transition-all text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Pipeline Sales Stage</label>
                  <select
                    value={stage}
                    onChange={(e) => handleStageChange(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 transition-all text-sm"
                  >
                    {STAGES.map(s => (
                      <option key={s.key} value={s.key}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Win Probability (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={probability}
                    onChange={(e) => setProbability(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 transition-all text-sm font-mono"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-950/20 -mx-6 -mb-6 p-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4.5 py-2 text-slate-400 hover:text-white transition-all text-sm font-semibold hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white transition-all text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/20"
                >
                  {loading ? 'Processing...' : isEditing ? 'Save Changes' : 'Confirm Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
