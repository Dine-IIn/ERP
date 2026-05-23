import { useState, useEffect } from 'react';
import {
  Receipt,
  BookOpen,
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

export default function FinanceMastersUI({ token, backendUrl }: Props) {
  const [activeMaster, setActiveMaster] = useState<'tax' | 'account'>('tax');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

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
      const data = await apiRequest(`/api/mdm/${activeMaster}?${params.toString()}`);
      setRecords(data.records || []);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    setSearchQuery('');
  }, [activeMaster]);

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
      status: 'ACTIVE',
      ...(activeMaster === 'tax' ? { taxType: 'GST' } : { accountType: 'ASSET' })
    });
    setEditRecord(null);
    setShowForm(true);
  };

  const openEdit = (record: any) => {
    const editData = { ...record };
    if (activeMaster === 'tax') {
      if (editData.effectiveFrom) editData.effectiveFrom = editData.effectiveFrom.split('T')[0];
      if (editData.effectiveTo) editData.effectiveTo = editData.effectiveTo.split('T')[0];
    }
    setFormData(editData);
    setEditRecord(record);
    setShowForm(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData };
      if (activeMaster === 'tax') {
        if (payload.taxRate) payload.taxRate = parseFloat(payload.taxRate);
        if (payload.effectiveFrom) payload.effectiveFrom = new Date(payload.effectiveFrom).toISOString();
        if (payload.effectiveTo) payload.effectiveTo = new Date(payload.effectiveTo).toISOString();
      } else {
        if (payload.balance) payload.balance = parseFloat(payload.balance);
      }

      if (editRecord) {
        await apiRequest(`/api/mdm/${activeMaster}/${editRecord.id}`, 'PATCH', payload);
        setSuccessMsg(`${activeMaster.toUpperCase()} updated successfully.`);
      } else {
        await apiRequest(`/api/mdm/${activeMaster}`, 'POST', payload);
        setSuccessMsg(`${activeMaster.toUpperCase()} created successfully.`);
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
      await apiRequest(`/api/mdm/${activeMaster}/${id}`, 'DELETE');
      setSuccessMsg('Record soft-deleted successfully.');
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
      {/* Master Switcher */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setActiveMaster('tax')}
          className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all ${activeMaster === 'tax' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
        >
          <Receipt className="w-4 h-4" /> Tax Master
        </button>
        <button
          onClick={() => setActiveMaster('account')}
          className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all ${activeMaster === 'account' ? 'bg-slate-500/10 text-slate-400 border border-slate-500/30' : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
        >
          <BookOpen className="w-4 h-4" /> Chart of Accounts
        </button>
      </div>

      <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--border-color)]">
        <div>
          <h2 className="text-base font-extrabold text-[var(--text-primary)] font-display">{activeMaster === 'tax' ? 'Tax Master' : 'Chart of Accounts'}</h2>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{activeMaster === 'tax' ? 'Manage tax slabs and rates.' : 'Manage financial ledgers.'}</p>
        </div>
        <button onClick={openCreate} className={`py-1.5 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 text-white transition-all shadow-lg ${activeMaster === 'tax' ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20' : 'bg-slate-600 hover:bg-slate-500 shadow-slate-500/20'}`}>
          <Plus className="w-3.5 h-3.5" /> Add {activeMaster === 'tax' ? 'Tax' : 'Account'}
        </button>
      </div>

      {successMsg && <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs py-3 px-4 rounded-xl flex items-center gap-2"><CheckCircle className="w-4 h-4 shrink-0" /><span>{successMsg}</span></div>}
      {errorMsg && <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs py-3 px-4 rounded-xl flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><span>{errorMsg}</span></div>}

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input type="text" placeholder="Search by code or name…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchRecords()} className={`w-full pl-9 pr-4 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl outline-none text-[var(--text-primary)] ${activeMaster === 'tax' ? 'focus:border-rose-500/40' : 'focus:border-slate-500/40'}`} />
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
              <th className="text-left py-3 px-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Name</th>
              <th className="text-left py-3 px-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">{activeMaster === 'tax' ? 'Rate / Type' : 'Account Type'}</th>
              <th className="text-left py-3 px-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Status</th>
              <th className="text-right py-3 px-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((rec) => (
              <tr key={rec.id} className="border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-tertiary)] transition-colors group">
                <td className="py-3 px-4 text-xs font-bold text-[var(--text-primary)]">{activeMaster === 'tax' ? rec.taxCode : rec.accountCode}</td>
                <td className="py-3 px-4 text-xs text-[var(--text-primary)]">{activeMaster === 'tax' ? rec.taxName : rec.accountName}</td>
                <td className="py-3 px-4 text-[10px] text-[var(--text-secondary)]">
                  {activeMaster === 'tax' ? (
                    <><span className="text-rose-400 font-bold">{rec.taxRate}%</span> · {rec.taxType}</>
                  ) : (
                    <span className="text-slate-400">{rec.accountType}</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${rec.status === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>{rec.status}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(rec)} className={`p-1.5 rounded-lg ${activeMaster === 'tax' ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'bg-slate-500/10 text-slate-400 hover:bg-slate-500/20'}`}><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setShowDeleteConfirm(rec.id)} className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {records.length === 0 && !loading && (
              <tr><td colSpan={5} className="text-center py-10 text-[var(--text-muted)] text-xs">No records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className={`bg-[var(--bg-card)] border ${activeMaster === 'tax' ? 'border-rose-500/20' : 'border-slate-500/20'} rounded-2xl w-full max-w-lg flex flex-col shadow-2xl`}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${activeMaster === 'tax' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-500/10 text-slate-400'}`}>
                  {activeMaster === 'tax' ? <Receipt className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[var(--text-primary)] font-display">{editRecord ? 'Edit' : 'Create'} {activeMaster === 'tax' ? 'Tax' : 'Account'}</h3>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition-all"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5">
              <div className="grid grid-cols-2 gap-4">
                {activeMaster === 'tax' ? (
                  <>
                    <div>
                      <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Tax Code <span className="text-rose-400">*</span></label>
                      <input required type="text" value={formData.taxCode || ''} onChange={e => setFormData({ ...formData, taxCode: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-rose-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Tax Name <span className="text-rose-400">*</span></label>
                      <input required type="text" value={formData.taxName || ''} onChange={e => setFormData({ ...formData, taxName: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-rose-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Tax Rate (%) <span className="text-rose-400">*</span></label>
                      <input required type="number" step="any" value={formData.taxRate || ''} onChange={e => setFormData({ ...formData, taxRate: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-rose-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Tax Type</label>
                      <select value={formData.taxType || 'GST'} onChange={e => setFormData({ ...formData, taxType: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-rose-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none">
                        <option value="GST">GST</option>
                        <option value="CGST">CGST</option>
                        <option value="SGST">SGST</option>
                        <option value="IGST">IGST</option>
                        <option value="VAT">VAT</option>
                        <option value="TDS">TDS</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Effective From</label>
                      <input type="date" value={formData.effectiveFrom || ''} onChange={e => setFormData({ ...formData, effectiveFrom: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-rose-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Effective To</label>
                      <input type="date" value={formData.effectiveTo || ''} onChange={e => setFormData({ ...formData, effectiveTo: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-rose-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Account Code <span className="text-rose-400">*</span></label>
                      <input required type="text" value={formData.accountCode || ''} onChange={e => setFormData({ ...formData, accountCode: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-slate-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Account Name <span className="text-rose-400">*</span></label>
                      <input required type="text" value={formData.accountName || ''} onChange={e => setFormData({ ...formData, accountName: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-slate-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Account Type</label>
                      <select value={formData.accountType || 'ASSET'} onChange={e => setFormData({ ...formData, accountType: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-slate-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none">
                        <option value="ASSET">ASSET</option>
                        <option value="LIABILITY">LIABILITY</option>
                        <option value="EQUITY">EQUITY</option>
                        <option value="REVENUE">REVENUE</option>
                        <option value="EXPENSE">EXPENSE</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Parent Account ID</label>
                      <input type="text" value={formData.parentAccountId || ''} onChange={e => setFormData({ ...formData, parentAccountId: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-slate-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Cost Center ID</label>
                      <input type="text" value={formData.costCenterId || ''} onChange={e => setFormData({ ...formData, costCenterId: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-slate-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Opening Balance (₹)</label>
                      <input type="number" step="any" value={formData.balance || ''} onChange={e => setFormData({ ...formData, balance: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-slate-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                    </div>
                  </>
                )}
                
                <div className="col-span-2">
                  <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Status</label>
                  <select value={formData.status || 'ACTIVE'} onChange={e => setFormData({ ...formData, status: e.target.value })} className={`w-full bg-[var(--bg-primary)] border border-[var(--border-color)] py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none ${activeMaster === 'tax' ? 'focus:border-rose-500/50' : 'focus:border-slate-500/50'}`}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t border-[var(--border-color)]">
                <button type="button" onClick={() => setShowForm(false)} className="py-2 px-5 rounded-xl text-xs font-bold border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-all">Cancel</button>
                <button type="submit" disabled={loading} className={`py-2 px-6 rounded-xl text-xs font-bold text-white transition-all shadow-lg disabled:opacity-60 ${activeMaster === 'tax' ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20' : 'bg-slate-600 hover:bg-slate-500 shadow-slate-500/20'}`}>
                  {loading ? 'Saving…' : 'Save Record'}
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
