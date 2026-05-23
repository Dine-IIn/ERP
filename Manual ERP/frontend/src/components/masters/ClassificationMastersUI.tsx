import { useState, useEffect } from 'react';
import {
  Tag,
  Bookmark,
  Scale,
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

export default function ClassificationMastersUI({ token, backendUrl }: Props) {
  const [activeMaster, setActiveMaster] = useState<'category' | 'brand' | 'unit'>('category');
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
      ...(activeMaster === 'unit' ? { isSalesUnit: true, isPurchaseUnit: true, conversionRatio: 1 } : {})
    });
    setEditRecord(null);
    setShowForm(true);
  };

  const openEdit = (record: any) => {
    setFormData({ ...record });
    setEditRecord(record);
    setShowForm(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData };
      if (activeMaster === 'unit' && payload.conversionRatio) {
        payload.conversionRatio = parseFloat(payload.conversionRatio);
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

  const getMasterConfig = () => {
    switch (activeMaster) {
      case 'category': return { icon: <Tag className="w-5 h-5" />, colorClass: 'bg-orange-500/10 text-orange-400', btnClass: 'bg-orange-600 hover:bg-orange-500 shadow-orange-500/20', focusClass: 'focus:border-orange-500/40', borderFocus: 'focus:border-orange-500/50', title: 'Categories', desc: 'Product hierarchies' };
      case 'brand': return { icon: <Bookmark className="w-5 h-5" />, colorClass: 'bg-amber-500/10 text-amber-500', btnClass: 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20', focusClass: 'focus:border-amber-500/40', borderFocus: 'focus:border-amber-500/50', title: 'Brands', desc: 'Manufacturer brands' };
      case 'unit': return { icon: <Scale className="w-5 h-5" />, colorClass: 'bg-teal-500/10 text-teal-400', btnClass: 'bg-teal-600 hover:bg-teal-500 shadow-teal-500/20', focusClass: 'focus:border-teal-500/40', borderFocus: 'focus:border-teal-500/50', title: 'Units', desc: 'UOM & conversions' };
    }
  };
  const config = getMasterConfig();

  return (
    <div className="flex h-full flex-col animate-fade-in select-none">
      {/* Master Switcher */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => setActiveMaster('category')} className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all ${activeMaster === 'category' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30' : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
          <Tag className="w-4 h-4" /> Category Master
        </button>
        <button onClick={() => setActiveMaster('brand')} className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all ${activeMaster === 'brand' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30' : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
          <Bookmark className="w-4 h-4" /> Brand Master
        </button>
        <button onClick={() => setActiveMaster('unit')} className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all ${activeMaster === 'unit' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30' : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
          <Scale className="w-4 h-4" /> Unit Master
        </button>
      </div>

      <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${config.colorClass}`}>
            {config.icon}
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[var(--text-primary)] font-display">{config.title} Master</h2>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Manage {config.desc.toLowerCase()}.</p>
          </div>
        </div>
        <button onClick={openCreate} className={`py-1.5 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 text-white transition-all shadow-lg ${config.btnClass}`}>
          <Plus className="w-3.5 h-3.5" /> Add {config.title.slice(0, -1)}
        </button>
      </div>

      {successMsg && <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs py-3 px-4 rounded-xl flex items-center gap-2"><CheckCircle className="w-4 h-4 shrink-0" /><span>{successMsg}</span></div>}
      {errorMsg && <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs py-3 px-4 rounded-xl flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><span>{errorMsg}</span></div>}

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input type="text" placeholder="Search by code or name…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchRecords()} className={`w-full pl-9 pr-4 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl outline-none text-[var(--text-primary)] ${config.focusClass}`} />
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
              <th className="text-left py-3 px-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Details</th>
              <th className="text-left py-3 px-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Status</th>
              <th className="text-right py-3 px-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((rec) => (
              <tr key={rec.id} className="border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-tertiary)] transition-colors group">
                <td className="py-3 px-4 text-xs font-bold text-[var(--text-primary)]">{rec[`${activeMaster}Code`]}</td>
                <td className="py-3 px-4 text-xs text-[var(--text-primary)]">{rec[`${activeMaster}Name`]}</td>
                <td className="py-3 px-4 text-[10px] text-[var(--text-secondary)]">
                  {activeMaster === 'unit' && `Conversion: ${rec.conversionRatio || 1}`}
                  {activeMaster === 'category' && (rec.parentCategoryId ? `Parent ID: ${rec.parentCategoryId}` : 'Root')}
                  {activeMaster === 'brand' && (rec.logoUrl ? 'Has Logo' : 'No Logo')}
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${rec.status === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>{rec.status}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(rec)} className={`p-1.5 rounded-lg ${config.colorClass.replace('text', 'hover:bg').replace('/10', '/20')} hover:opacity-80`}><Pencil className="w-3.5 h-3.5" /></button>
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
          <div className={`bg-[var(--bg-card)] border border-${config.color}-500/20 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl`}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-${config.color}-500/10 text-${config.color}-400`}>
                  {config.icon}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[var(--text-primary)] font-display">{editRecord ? 'Edit' : 'Create'} {config.title.slice(0, -1)}</h3>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition-all"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">{config.title.slice(0, -1)} Code <span className="text-rose-400">*</span></label>
                  <input required type="text" value={formData[`${activeMaster}Code`] || ''} onChange={e => setFormData({ ...formData, [`${activeMaster}Code`]: e.target.value })} className={`w-full bg-[var(--bg-primary)] border border-[var(--border-color)] py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none ${config.borderFocus}`} />
                </div>
                <div>
                  <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">{config.title.slice(0, -1)} Name <span className="text-rose-400">*</span></label>
                  <input required type="text" value={formData[`${activeMaster}Name`] || ''} onChange={e => setFormData({ ...formData, [`${activeMaster}Name`]: e.target.value })} className={`w-full bg-[var(--bg-primary)] border border-[var(--border-color)] py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none ${config.borderFocus}`} />
                </div>
                
                {activeMaster === 'category' && (
                  <div className="col-span-2">
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Parent Category ID</label>
                    <input type="text" value={formData.parentCategoryId || ''} onChange={e => setFormData({ ...formData, parentCategoryId: e.target.value })} className={`w-full bg-[var(--bg-primary)] border border-[var(--border-color)] py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none ${config.borderFocus}`} />
                  </div>
                )}
                {activeMaster === 'brand' && (
                  <div className="col-span-2">
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Logo URL</label>
                    <input type="url" value={formData.logoUrl || ''} onChange={e => setFormData({ ...formData, logoUrl: e.target.value })} className={`w-full bg-[var(--bg-primary)] border border-[var(--border-color)] py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none ${config.borderFocus}`} />
                  </div>
                )}
                {activeMaster === 'unit' && (
                  <>
                    <div>
                      <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Base Unit ID</label>
                      <input type="text" value={formData.baseUnitId || ''} onChange={e => setFormData({ ...formData, baseUnitId: e.target.value })} className={`w-full bg-[var(--bg-primary)] border border-[var(--border-color)] py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none ${config.borderFocus}`} />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Conversion Ratio</label>
                      <input type="number" step="any" value={formData.conversionRatio || ''} onChange={e => setFormData({ ...formData, conversionRatio: e.target.value })} className={`w-full bg-[var(--bg-primary)] border border-[var(--border-color)] py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none ${config.borderFocus}`} />
                    </div>
                    <div className="col-span-2 flex items-center gap-4">
                      <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <input type="checkbox" checked={formData.isSalesUnit || false} onChange={e => setFormData({ ...formData, isSalesUnit: e.target.checked })} /> Is Sales Unit
                      </label>
                      <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <input type="checkbox" checked={formData.isPurchaseUnit || false} onChange={e => setFormData({ ...formData, isPurchaseUnit: e.target.checked })} /> Is Purchase Unit
                      </label>
                    </div>
                  </>
                )}
                
                <div className="col-span-2">
                  <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Status</label>
                  <select value={formData.status || 'ACTIVE'} onChange={e => setFormData({ ...formData, status: e.target.value })} className={`w-full bg-[var(--bg-primary)] border border-[var(--border-color)] py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none ${config.borderFocus}`}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t border-[var(--border-color)]">
                <button type="button" onClick={() => setShowForm(false)} className="py-2 px-5 rounded-xl text-xs font-bold border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-all">Cancel</button>
                <button type="submit" disabled={loading} className={`py-2 px-6 rounded-xl text-xs font-bold text-white transition-all shadow-lg disabled:opacity-60 ${config.btnClass}`}>
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
