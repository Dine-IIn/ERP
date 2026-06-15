import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../utils/apiService';
import { LeadSchema } from '../../utils/schemas';
import { UserCheck, Search, Plus, Edit, Trash2, X, AlertCircle, CheckCircle2, Phone, Mail, FileText, User } from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  companyName?: string;
  email?: string;
  phone: string;
  source: string;
  status: string;
  assignedToId?: string;
  assignedTo?: { id: string; username: string };
  notes?: string;
  createdAt: string;
}

export default React.memo(function Leads() {
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const res = await apiClient.get<{leads: Lead[]}>('/api/crm/leads');
      return res.leads || [];
    }
  });

  const { data: companyUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await apiClient.get<{users: any[]}>('/api/admin/users');
      return res.users || [];
    }
  });

  const createLead = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/crm/leads', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    }
  });

  const updateLead = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => apiClient.patch(`/api/crm/leads/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    }
  });

  const deleteLead = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/crm/leads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    }
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('WEBSITE');
  const [status, setStatus] = useState('NEW');
  const [assignedToId, setAssignedToId] = useState('');
  const [notes, setNotes] = useState('');

  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const openAddModal = () => {
    setName('');
    setCompanyName('');
    setEmail('');
    setPhone('');
    setSource('WEBSITE');
    setStatus('NEW');
    setAssignedToId('');
    setNotes('');
    setIsEditing(false);
    setEditingId(null);
    setLocalErr(null);
    setLocalSuccess(null);
    setShowModal(true);
  };

  const openEditModal = (lead: Lead) => {
    setName(lead.name);
    setCompanyName(lead.companyName || '');
    setEmail(lead.email || '');
    setPhone(lead.phone);
    setSource(lead.source);
    setStatus(lead.status);
    setAssignedToId(lead.assignedToId || '');
    setNotes(lead.notes || '');
    setIsEditing(true);
    setEditingId(lead.id);
    setLocalErr(null);
    setLocalSuccess(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: name.trim(),
      companyName: companyName.trim() || null,
      email: email.trim() || null,
      phone: phone.trim(),
      source,
      status,
      assignedToId: assignedToId || null,
      notes: notes.trim() || null
    };

    const parsed = LeadSchema.safeParse(payload);
    if (!parsed.success) {
      setLocalErr(parsed.error.errors[0].message);
      return;
    }

    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    try {
      if (isEditing && editingId) {
        await updateLead.mutateAsync({ id: editingId, data: parsed.data });
        setLocalSuccess("Lead dossier modified successfully!");
      } else {
        await createLead.mutateAsync(parsed.data);
        setLocalSuccess("New sales lead logged successfully!");
      }
      setTimeout(() => {
        setShowModal(false);
      }, 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to process sales lead.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently discard sales lead for '${name}'?`)) {
      try {
        await deleteLead.mutateAsync(id);
      } catch (err: any) {
        alert(err.message || "Failed to discard lead.");
      }
    }
  };

  const filteredLeads = (leads || []).filter(l => {
    const name = l?.name || '';
    const company = l?.companyName || '';
    const phone = l?.phone || '';
    const email = l?.email || '';
    const term = (searchTerm || '').toLowerCase();
    return name.toLowerCase().includes(term) ||
      company.toLowerCase().includes(term) ||
      String(phone).toLowerCase().includes(term) ||
      email.toLowerCase().includes(term);
  });

  const getStatusStyle = (s: string) => {
    switch (s) {
      case 'NEW':
        return 'bg-blue-500/10 text-blue-450 border-blue-500/20';
      case 'CONTACTED':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'QUALIFIED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'LOST':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-indigo-400" />
            CRM Leads Hub
          </h1>
          <p className="text-slate-400 text-sm mt-1">Capture corporate leads, track interactions, notes, and delegate assignments to executives.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 active:scale-95 transition-all text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-5 h-5" />
          Onboard New Lead
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
              placeholder="Search by contact, firm, email or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/40 border border-slate-850/60 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white text-sm outline-none transition-all"
            />
          </div>
        </div>

        {/* Table/List */}
        <div className="overflow-x-auto">
          {filteredLeads.length === 0 ? (
            <div className="p-12 text-center">
              <UserCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No sales leads found</p>
              <p className="text-slate-600 text-xs mt-1">Create or sync a lead record to begin tracking.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium uppercase tracking-wider text-xs bg-slate-950/40">
                  <th className="py-4 px-6">Prospect / Organization</th>
                  <th className="py-4 px-6">Contact Channels</th>
                  <th className="py-4 px-6">Lead Origin</th>
                  <th className="py-4 px-6">Assigned Executive</th>
                  <th className="py-4 px-6">Pipeline Stage</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-white">{lead.name}</div>
                      {lead.companyName && (
                        <div className="text-xs text-indigo-400 mt-0.5">{lead.companyName}</div>
                      )}
                    </td>
                    <td className="py-4 px-6 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>{lead.phone}</span>
                      </div>
                      {lead.email && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Mail className="w-3.5 h-3.5 text-slate-550" />
                          <span>{lead.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-350">{lead.source}</td>
                    <td className="py-4 px-6 text-slate-350">
                      {lead.assignedTo ? (
                        <span className="inline-flex items-center gap-1 text-slate-300">
                          <User className="w-3.5 h-3.5 text-indigo-450" />
                          {lead.assignedTo.username}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getStatusStyle(lead.status)}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(lead)}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors rounded-lg"
                        title="Edit lead card"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(lead.id, lead.name)}
                        className="p-1.5 hover:bg-slate-850 text-slate-550 hover:text-red-400 transition-colors rounded-lg"
                        title="Delete lead card"
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
                {isEditing ? 'Modify Lead Dossier' : 'Log New Sales Prospect'}
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Prospect Name</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 transition-all text-sm"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Corporate Organization</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corp (Optional)"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 transition-all text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 transition-all text-sm font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    placeholder="name@firm.com (Optional)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 transition-all text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Lead Origin Source</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 transition-all text-sm"
                  >
                    <option value="WEBSITE">Website Portal</option>
                    <option value="REFERRAL">Referral Network</option>
                    <option value="COLD_CALL">Cold Outbound</option>
                    <option value="EXHIBITION">Industrial Expo</option>
                    <option value="OTHER">Other Channels</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Pipeline Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 transition-all text-sm"
                  >
                    <option value="NEW">New Discovery</option>
                    <option value="CONTACTED">Initiated Talk</option>
                    <option value="QUALIFIED">Qualified lead</option>
                    <option value="LOST">Nurturing Lost</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Assign Sales Executive</label>
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 transition-all text-sm"
                >
                  <option value="">Unassigned / Pool Ledger</option>
                  {companyUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.username} ({u.role?.name || 'Staff'})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Internal Notes & History</label>
                <textarea
                  rows={3}
                  placeholder="Record summary of initial requirements or talks..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 transition-all text-sm resize-none"
                />
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
                  className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white transition-all text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20"
                >
                  {loading ? 'Processing...' : isEditing ? 'Save Changes' : 'Confirm & Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
})
