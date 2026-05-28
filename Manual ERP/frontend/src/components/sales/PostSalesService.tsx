import React, { useState } from 'react';
import { Wrench, Search, Plus, Edit, Trash2, X, AlertCircle, CheckCircle2, Calendar, User, Hammer, Sparkles, UserCheck } from 'lucide-react';

interface ServiceTicket {
  id: string;
  ticketNo: string;
  customerId: string;
  customer: { id: string; name: string };
  productId: string;
  product: { id: string; name: string };
  serialNumber?: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  scheduledDate?: string;
  resolutionNotes?: string;
  createdAt: string;
}

interface PostSalesServiceProps {
  tickets: ServiceTicket[];
  customers: any[];
  products: any[];
  onCreateTicket: (ticket: any) => Promise<void>;
  onUpdateTicket: (id: string, ticket: any) => Promise<void>;
  onDeleteTicket: (id: string) => Promise<void>;
}

export default function PostSalesService({
  tickets,
  customers,
  products,
  onCreateTicket,
  onUpdateTicket,
  onDeleteTicket
}: PostSalesServiceProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState('');
  const [productId, setProductId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('MAINTENANCE');
  const [priority, setPriority] = useState('MEDIUM');
  const [status, setStatus] = useState('OPEN');
  const [scheduledDate, setScheduledDate] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const openAddModal = () => {
    setCustomerId(customers[0]?.id || '');
    setProductId(products[0]?.id || '');
    setSerialNumber('');
    setTitle('');
    setType('MAINTENANCE');
    setPriority('MEDIUM');
    setStatus('OPEN');
    setScheduledDate('');
    setResolutionNotes('');
    setIsEditing(false);
    setEditingId(null);
    setLocalErr(null);
    setLocalSuccess(null);
    setShowModal(true);
  };

  const openEditModal = (t: ServiceTicket) => {
    setCustomerId(t.customerId);
    setProductId(t.productId);
    setSerialNumber(t.serialNumber || '');
    setTitle(t.title);
    setType(t.type);
    setPriority(t.priority);
    setStatus(t.status);
    setScheduledDate(t.scheduledDate ? t.scheduledDate.substring(0, 16) : '');
    setResolutionNotes(t.resolutionNotes || '');
    setIsEditing(true);
    setEditingId(t.id);
    setLocalErr(null);
    setLocalSuccess(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !productId || !title.trim() || !type || !priority || !status) {
      setLocalErr("Customer, product, ticket title, type, priority, and status are required fields.");
      return;
    }

    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    const payload = {
      customerId,
      productId,
      serialNumber: serialNumber.trim() || null,
      title: title.trim(),
      type,
      priority,
      status,
      scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : null,
      resolutionNotes: resolutionNotes.trim() || null
    };

    try {
      if (isEditing && editingId) {
        await onUpdateTicket(editingId, payload);
        setLocalSuccess("Service ticket details successfully updated!");
      } else {
        await onCreateTicket(payload);
        setLocalSuccess("New service support ticket logged successfully!");
      }
      setTimeout(() => {
        setShowModal(false);
      }, 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to process service ticket.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, ticketNo: string) => {
    if (window.confirm(`Are you sure you want to permanently delete Support Ticket '${ticketNo}'?`)) {
      try {
        await onDeleteTicket(id);
      } catch (err: any) {
        alert(err.message || "Failed to discard ticket.");
      }
    }
  };

  const filteredTickets = tickets.filter(t =>
    t.ticketNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPriorityStyle = (p: string) => {
    switch (p) {
      case 'LOW': return 'bg-slate-800 text-slate-400 border-slate-700';
      case 'MEDIUM': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'HIGH': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'CRITICAL': return 'bg-red-500/10 text-red-400 border-red-500/20 font-bold';
      default: return 'bg-slate-850 text-slate-300';
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'OPEN': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'IN_PROGRESS': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'RESOLVED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'CLOSED': return 'bg-slate-800 text-slate-500 border-slate-700/60';
      default: return 'bg-slate-800 text-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Wrench className="w-6 h-6 text-sky-400" />
            Post-Sales Support & Service
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage corporate product maintenance warranties, customer claims, service schedules, and repair sheets.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 active:scale-95 transition-all text-white font-semibold rounded-xl shadow-lg shadow-sky-500/20"
        >
          <Plus className="w-5 h-5" />
          Log Service Ticket
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
              placeholder="Search support tickets by no, title, customer or item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/40 border border-slate-850/60 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-white text-sm outline-none transition-all"
            />
          </div>
        </div>

        {/* Table/List */}
        <div className="overflow-x-auto">
          {filteredTickets.length === 0 ? (
            <div className="p-12 text-center">
              <Wrench className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No service tickets recorded</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium uppercase tracking-wider text-xs bg-slate-950/40">
                  <th className="py-4 px-6">Ticket No / Title</th>
                  <th className="py-4 px-6">Customer Account</th>
                  <th className="py-4 px-6">Product Details</th>
                  <th className="py-4 px-6">Scheduled Date</th>
                  <th className="py-4 px-6">Priority scale</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-white font-mono text-xs">{t.ticketNo}</div>
                      <div className="font-semibold text-slate-200 text-sm mt-0.5 max-w-xs truncate" title={t.title}>{t.title}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{t.type}</div>
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-200">{t.customer.name}</td>
                    <td className="py-4 px-6">
                      <div className="text-white">{t.product.name}</div>
                      {t.serialNumber && (
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">S/N: {t.serialNumber}</div>
                      )}
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-350">
                      {t.scheduledDate ? new Date(t.scheduledDate).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getPriorityStyle(t.priority)}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getStatusColor(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(t)}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-sky-400 transition-colors rounded-lg"
                        title="Update support status"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id, t.ticketNo)}
                        className="p-1.5 hover:bg-slate-850 text-slate-550 hover:text-red-400 transition-colors rounded-lg"
                        title="Permanently remove ticket"
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transform transition-all max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-lg font-bold text-white">
                {isEditing ? 'Modify Service Ticket Details' : 'Log Customer Service Request'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
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
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Customer Client</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-sky-500 transition-all text-sm"
                  required
                >
                  <option value="" disabled>Select target customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Product Item</label>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-sky-500 transition-all text-sm"
                    required
                  >
                    <option value="" disabled>Select products master</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Hardware Serial No (S/N)</label>
                  <input
                    type="text"
                    placeholder="e.g. SN-8921-A (Optional)"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-sky-500 transition-all text-sm font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Service Title / Problem summary</label>
                <input
                  type="text"
                  placeholder="e.g. Periodic filter replacement"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-sky-500 transition-all text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Ticket Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-sky-500 transition-all text-sm font-semibold"
                  >
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="REPAIR">REPAIR WORK</option>
                    <option value="INSTALLATION">INSTALLATION</option>
                    <option value="WARRANTY_CLAIM">WARRANTY CLAIM</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Priority Scale</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-sky-500 transition-all text-sm font-semibold"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Status Stage</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-sky-500 transition-all text-sm font-semibold"
                  >
                    <option value="OPEN">OPEN / UNRESOLVED</option>
                    <option value="IN_PROGRESS">IN REPAIR</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Scheduled Service Date</label>
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-sky-500 transition-all text-sm font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Resolution Notes / Action Taken</label>
                <textarea
                  rows={3}
                  placeholder="Record summary of repair logs, parts replaced, or warranty closure notes..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-sky-500 transition-all text-sm resize-none"
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
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white transition-all text-sm font-bold rounded-xl shadow-lg shadow-sky-500/20"
                >
                  {loading ? 'Processing...' : isEditing ? 'Save Changes' : 'Record Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
