import { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface Props {
  token: string;
  backendUrl: string;
}

export default function VendorMasterUI({ token, backendUrl }: Props) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'basic' | 'procurement' | 'evaluation'>('basic');

  const apiRequest = async (url: string, method = 'GET', body?: any) => {
    const res = await fetch(`${backendUrl}${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || 'Request failed');
    }
    return res.json();
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      const data = await apiRequest(`/api/mdm/vendor?${params.toString()}`);
      setRecords(data.records || []);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(''), 4000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(''), 5000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  const openCreate = () => {
    setFormData({
      status: 'ACTIVE'
    });
    setEditRecord(null);
    setActiveTab('basic');
    setShowForm(true);
  };

  const openEdit = (record: any) => {
    setFormData({ ...record });
    setEditRecord(record);
    setActiveTab('basic');
    setShowForm(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData };
      ['leadTimeDays', 'minOrderQuantity', 'rating', 'deliveryPerformance', 'qualityPerformance'].forEach(key => {
        if (payload[key] !== undefined && payload[key] !== '') payload[key] = parseFloat(payload[key]) || 0;
      });

      if (editRecord) {
        await apiRequest(`/api/mdm/vendor/${editRecord.id}`, 'PATCH', payload);
        setSuccessMsg('Vendor updated successfully.');
      } else {
        await apiRequest(`/api/mdm/vendor`, 'POST', payload);
        setSuccessMsg('Vendor created successfully.');
      }
      setShowForm(false);
      fetchRecords();
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await apiRequest(`/api/mdm/vendor/${id}`, 'DELETE');
      setSuccessMsg('Vendor soft-deleted successfully.');
      setShowDeleteConfirm(null);
      fetchRecords();
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col animate-fade-in select-none">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[var(--text-primary)] font-display">Vendor Master</h2>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Manage suppliers, procurement terms, and vendor performance.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openCreate} className="py-1.5 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white transition-all shadow-lg shadow-amber-500/20">
            <Plus className="w-3.5 h-3.5" /> Add Vendor
          </button>
        </div>
      </div>

      {successMsg && <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs py-3 px-4 rounded-xl flex items-center gap-2"><CheckCircle className="w-4 h-4 shrink-0" /><span>{successMsg}</span></div>}
      {errorMsg && <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs py-3 px-4 rounded-xl flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><span>{errorMsg}</span></div>}

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input type="text" placeholder="Search by vendor code or name…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchRecords()} className="w-full pl-9 pr-4 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl focus:border-amber-500/40 outline-none text-[var(--text-primary)]" />
        </div>
        <button onClick={fetchRecords} className="py-2 px-3 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] flex items-center justify-center transition-all">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-color)]">
              <th className="text-left py-3 px-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Code</th>
              <th className="text-left py-3 px-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Vendor Name</th>
              <th className="text-left py-3 px-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Type</th>
              <th className="text-left py-3 px-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Rating</th>
              <th className="text-left py-3 px-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Status</th>
              <th className="text-right py-3 px-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((rec) => (
              <tr key={rec.id} className="border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-tertiary)] transition-colors group">
                <td className="py-3 px-4 text-xs font-bold text-[var(--text-primary)]">{rec.vendorCode}</td>
                <td className="py-3 px-4 text-xs text-[var(--text-primary)]">{rec.vendorName}</td>
                <td className="py-3 px-4 text-[10px] text-[var(--text-secondary)]">{rec.supplierType || '—'}</td>
                <td className="py-3 px-4 text-xs font-mono text-amber-500">{rec.rating ? '★'.repeat(rec.rating) + '☆'.repeat(5 - rec.rating) : '—'}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${rec.status === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>{rec.status}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(rec)} className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setShowDeleteConfirm(rec.id)} className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {records.length === 0 && !loading && (
              <tr><td colSpan={6} className="text-center py-10 text-[var(--text-muted)] text-xs">No vendors found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400"><Truck className="w-4 h-4" /></div>
                <div>
                  <h3 className="font-extrabold text-sm text-[var(--text-primary)] font-display">{editRecord ? 'Edit Vendor' : 'Create Vendor'}</h3>
                  <p className="text-[10px] text-[var(--text-muted)]">Configure supplier details and procurement rules.</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition-all"><X className="w-4 h-4" /></button>
            </div>

            <div className="px-5 pt-3 border-b border-[var(--border-color)] flex gap-4">
              <button onClick={() => setActiveTab('basic')} className={`pb-2 text-xs font-bold border-b-2 transition-colors ${activeTab === 'basic' ? 'border-amber-500 text-amber-400' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>Basic Details</button>
              <button onClick={() => setActiveTab('procurement')} className={`pb-2 text-xs font-bold border-b-2 transition-colors ${activeTab === 'procurement' ? 'border-amber-500 text-amber-400' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>Procurement & Terms</button>
              <button onClick={() => setActiveTab('evaluation')} className={`pb-2 text-xs font-bold border-b-2 transition-colors ${activeTab === 'evaluation' ? 'border-amber-500 text-amber-400' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>Performance Evaluation</button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-1 overflow-auto p-5">
              <div className={activeTab === 'basic' ? 'block' : 'hidden'}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Vendor Code <span className="text-rose-400">*</span></label>
                    <input required type="text" value={formData.vendorCode || ''} onChange={e => setFormData({ ...formData, vendorCode: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Vendor Name <span className="text-rose-400">*</span></label>
                    <input required type="text" value={formData.vendorName || ''} onChange={e => setFormData({ ...formData, vendorName: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Supplier Type</label>
                    <input type="text" value={formData.supplierType || ''} onChange={e => setFormData({ ...formData, supplierType: e.target.value })} placeholder="e.g. Manufacturer, Distributor" className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Vendor Category</label>
                    <input type="text" value={formData.vendorCategory || ''} onChange={e => setFormData({ ...formData, vendorCategory: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Contact Person</label>
                    <input type="text" value={formData.contactPerson || ''} onChange={e => setFormData({ ...formData, contactPerson: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Phone Number</label>
                    <input type="tel" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Email</label>
                    <input type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Status</label>
                    <select value={formData.status || 'ACTIVE'} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none">
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className={activeTab === 'procurement' ? 'block' : 'hidden'}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">GSTIN</label>
                    <input type="text" value={formData.gstin || ''} onChange={e => setFormData({ ...formData, gstin: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none uppercase" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">PAN</label>
                    <input type="text" value={formData.pan || ''} onChange={e => setFormData({ ...formData, pan: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none uppercase" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Payment Terms</label>
                    <input type="text" value={formData.paymentTerms || ''} onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })} placeholder="e.g. Net 30, Advance" className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Lead Time (Days)</label>
                    <input type="number" step="1" value={formData.leadTimeDays || ''} onChange={e => setFormData({ ...formData, leadTimeDays: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Min Order Quantity (MOQ)</label>
                    <input type="number" step="any" value={formData.minOrderQuantity || ''} onChange={e => setFormData({ ...formData, minOrderQuantity: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                </div>
              </div>

              <div className={activeTab === 'evaluation' ? 'block' : 'hidden'}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Vendor Rating (1–5)</label>
                    <input type="number" min="1" max="5" step="1" value={formData.rating || ''} onChange={e => setFormData({ ...formData, rating: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Delivery Performance (%)</label>
                    <input type="number" min="0" max="100" step="1" value={formData.deliveryPerformance || ''} onChange={e => setFormData({ ...formData, deliveryPerformance: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Quality Performance (%)</label>
                    <input type="number" min="0" max="100" step="1" value={formData.qualityPerformance || ''} onChange={e => setFormData({ ...formData, qualityPerformance: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t border-[var(--border-color)]">
                <button type="button" onClick={() => setShowForm(false)} className="py-2 px-5 rounded-xl text-xs font-bold border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-all">Cancel</button>
                <button type="submit" disabled={loading} className="py-2 px-6 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition-all shadow-lg shadow-amber-500/20 disabled:opacity-60">
                  {loading ? 'Saving…' : editRecord ? 'Save Changes' : 'Create Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-rose-500/30 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400"><Trash2 className="w-5 h-5" /></div>
              <div>
                <h3 className="font-extrabold text-sm text-[var(--text-primary)]">Confirm Delete</h3>
                <p className="text-[10px] text-[var(--text-muted)]">Record will be soft-deleted.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowDeleteConfirm(null)} className="py-2 px-4 rounded-xl text-xs font-bold border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">Cancel</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="py-2 px-5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
