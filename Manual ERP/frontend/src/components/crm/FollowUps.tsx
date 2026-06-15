import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../utils/apiService';
import { FollowUpSchema } from '../../utils/schemas';
import { CalendarClock, Search, Plus, Edit, Trash2, X, AlertCircle, CheckCircle2, Phone, Mail, Users, MonitorPlay, MessageSquare } from 'lucide-react';

interface FollowUp {
  id: string;
  leadId: string;
  lead: { id: string; name: string; companyName?: string };
  scheduledDate: string;
  type: string;
  status: string;
  notes?: string;
  outcome?: string;
  createdAt: string;
}

interface FollowUpsProps {
  followups: FollowUp[];
  leads: any[];
  onCreateFollowUp: (fup: any) => Promise<void>;
  onUpdateFollowUp: (id: string, fup: any) => Promise<void>;
  onDeleteFollowUp: (id: string) => Promise<void>;
}

export default function FollowUps({
  followups,
  leads,
  onCreateFollowUp,
  onUpdateFollowUp,
  onDeleteFollowUp
}: FollowUpsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [leadId, setLeadId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [type, setType] = useState('CALL');
  const [status, setStatus] = useState('PENDING');
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState('');

  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const openAddModal = () => {
    setLeadId(leads[0]?.id || '');
    setScheduledDate('');
    setType('CALL');
    setStatus('PENDING');
    setNotes('');
    setOutcome('');
    setIsEditing(false);
    setEditingId(null);
    setLocalErr(null);
    setLocalSuccess(null);
    setShowModal(true);
  };

  const openEditModal = (fup: FollowUp) => {
    setLeadId(fup.leadId);
    setScheduledDate(fup.scheduledDate ? fup.scheduledDate.substring(0, 16) : '');
    setType(fup.type);
    setStatus(fup.status);
    setNotes(fup.notes || '');
    setOutcome(fup.outcome || '');
    setIsEditing(true);
    setEditingId(fup.id);
    setLocalErr(null);
    setLocalSuccess(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      leadId: leadId,
      scheduledDate: scheduledDate,
      type,
      status,
      notes: notes.trim() || null,
      outcome: outcome.trim() || null
    };

    const parsed = FollowUpSchema.safeParse(payload);
    if (!parsed.success) {
      setLocalErr(parsed.error.errors[0].message);
      return;
    }

    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    try {
      if (isEditing && editingId) {
        await onUpdateFollowUp(editingId, parsed.data);
        setLocalSuccess("Schedule updated successfully!");
      } else {
        await onCreateFollowUp(parsed.data);
        setLocalSuccess("Task scheduled successfully!");
      }
      setTimeout(() => setShowModal(false), 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to save schedule.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, clientName: string) => {
    if (window.confirm(`Are you sure you want to cancel scheduled interaction for '${clientName}'?`)) {
      try {
        await onDeleteFollowUp(id);
      } catch (err: any) {
        alert(err.message || "Failed to cancel follow-up.");
      }
    }
  };

  const filteredFollowups = (followups || []).filter(f => {
    const leadName = f?.lead?.name || '';
    const companyName = f?.lead?.companyName || '';
    const fupType = f?.type || '';
    const term = (searchTerm || '').toLowerCase();
    return leadName.toLowerCase().includes(term) ||
      companyName.toLowerCase().includes(term) ||
      fupType.toLowerCase().includes(term);
  });

  const getInteractionIcon = (t: string) => {
    switch (t) {
      case 'CALL':
        return <Phone className="w-4 h-4 text-sky-400" />;
      case 'EMAIL':
        return <Mail className="w-4 h-4 text-violet-400" />;
      case 'MEETING':
        return <Users className="w-4 h-4 text-emerald-400" />;
      case 'DEMO':
        return <MonitorPlay className="w-4 h-4 text-amber-400" />;
      default:
        return <MessageSquare className="w-4 h-4 text-slate-450" />;
    }
  };

  const getStatusStyle = (s: string) => {
    switch (s) {
      case 'PENDING':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'COMPLETED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'CANCELLED':
        return 'bg-slate-800 text-slate-500 border-slate-700/60';
      default:
        return 'bg-slate-800 text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-sky-400" />
            CRM Follow-ups Scheduler
          </h1>
          <p className="text-slate-400 text-sm mt-1">Schedule outbound phone calls, business demos, follow-up emails, and client onboarding sessions.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 active:scale-95 transition-all text-white font-semibold rounded-xl shadow-lg shadow-sky-500/20"
        >
          <Plus className="w-5 h-5" />
          Schedule Follow-up
        </button>
      </div>

      {/* Main Grid */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl backdrop-blur-xl overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-slate-800/60 bg-slate-950/20">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search scheduled activities or client names..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/40 border border-slate-850/60 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-white text-sm outline-none transition-all"
            />
          </div>
        </div>

        {/* Table/List */}
        <div className="overflow-x-auto">
          {filteredFollowups.length === 0 ? (
            <div className="p-12 text-center">
              <CalendarClock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No scheduled follow-up tasks</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium uppercase tracking-wider text-xs bg-slate-950/40">
                  <th className="py-4 px-6">Prospect / Organization</th>
                  <th className="py-4 px-6">Activity Type</th>
                  <th className="py-4 px-6">Scheduled Date & Time</th>
                  <th className="py-4 px-6">Agenda Notes</th>
                  <th className="py-4 px-6">Status & Outcomes</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredFollowups.map((fup) => (
                  <tr key={fup.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 px-6 font-semibold text-white">
                      <div>{fup.lead.name}</div>
                      {fup.lead.companyName && (
                        <div className="text-xs text-indigo-400 mt-0.5">{fup.lead.companyName}</div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-white font-medium">
                        {getInteractionIcon(fup.type)}
                        <span>{fup.type}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-300">
                      {new Date(fup.scheduledDate).toLocaleString()}
                    </td>
                    <td className="py-4 px-6 max-w-xs truncate text-slate-400" title={fup.notes}>
                      {fup.notes || <span className="text-slate-650 italic">No notes</span>}
                    </td>
                    <td className="py-4 px-6 space-y-1">
                      <div>
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border ${getStatusStyle(fup.status)}`}>
                          {fup.status}
                        </span>
                      </div>
                      {fup.outcome && (
                        <div className="text-xs text-slate-400 line-clamp-1 italic" title={fup.outcome}>
                          Outcome: {fup.outcome}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(fup)}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-sky-400 transition-colors rounded-lg"
                        title="Update schedule or log outcome"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(fup.id, fup.lead.name)}
                        className="p-1.5 hover:bg-slate-850 text-slate-550 hover:text-red-400 transition-colors rounded-lg"
                        title="Delete schedule"
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

      {/* Slide-over or Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transform transition-all">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-lg font-bold text-white">
                {isEditing ? 'Log Outcome / Update Activity' : 'Schedule Outbound Follow-up'}
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
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-sky-500 transition-all text-sm"
                  required
                >
                  <option value="" disabled>Choose prospect client</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.name} {l.companyName ? `(${l.companyName})` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Interaction Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-sky-500 transition-all text-sm"
                  >
                    <option value="CALL">Outbound Call</option>
                    <option value="EMAIL">Follow-up Email</option>
                    <option value="MEETING">In-person Meeting</option>
                    <option value="DEMO">Product Walkthrough Demo</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-sky-500 transition-all text-sm"
                  >
                    <option value="PENDING">Pending Reminder</option>
                    <option value="COMPLETED">Successfully Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Scheduled Date & Time</label>
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-sky-500 transition-all text-sm font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Agenda / Planned Notes</label>
                <textarea
                  rows={2}
                  placeholder="What is the key goal of this follow-up call/meeting?..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-sky-500 transition-all text-sm resize-none"
                />
              </div>

              {status === 'COMPLETED' && (
                <div className="space-y-1 transition-all animate-fadeIn">
                  <label className="text-emerald-450 text-xs font-semibold uppercase tracking-wider">Actual Outcome / Summary</label>
                  <textarea
                    rows={2}
                    placeholder="Provide details on what was discussed, next steps, or deal closure details..."
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-emerald-950 focus:border-emerald-500 rounded-xl text-white outline-none transition-all text-sm resize-none"
                    required
                  />
                </div>
              )}

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
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white transition-all text-sm font-bold rounded-xl shadow-lg shadow-sky-500/20"
                >
                  {loading ? 'Processing...' : isEditing ? 'Save Outcome' : 'Schedule Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
