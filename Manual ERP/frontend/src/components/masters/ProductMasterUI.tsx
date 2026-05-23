import { useState, useEffect, useRef } from 'react';
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Search,
  Download,
  Upload,
  RefreshCw,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface Props {
  token: string;
  backendUrl: string;
}

export default function ProductMasterUI({ token, backendUrl }: Props) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'inventory'>('basic');

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
      const data = await apiRequest(`/api/mdm/product?${params.toString()}`);
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
      status: 'ACTIVE',
      productType: 'FINISHED_GOODS',
      trackInventory: true,
      conversionRatio: 1
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
      ['costPrice', 'sellingPrice', 'mrp', 'dealerPrice', 'distributorPrice', 'reorderLevel', 'minStock', 'maxStock', 'safetyStock', 'conversionRatio'].forEach(key => {
        if (payload[key] !== undefined && payload[key] !== '') payload[key] = parseFloat(payload[key]) || 0;
      });

      if (editRecord) {
        await apiRequest(`/api/mdm/product/${editRecord.id}`, 'PATCH', payload);
        setSuccessMsg('Product updated successfully.');
      } else {
        await apiRequest(`/api/mdm/product`, 'POST', payload);
        setSuccessMsg('Product created successfully.');
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
      await apiRequest(`/api/mdm/product/${id}`, 'DELETE');
      setSuccessMsg('Product soft-deleted successfully.');
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
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[var(--text-primary)] font-display">Product Master</h2>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Manage items, raw materials, and services.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openCreate}
            className="py-1.5 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-3.5 h-3.5" /> Add Product
          </button>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs py-3 px-4 rounded-xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" /><span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs py-3 px-4 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /><span>{errorMsg}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by code or name…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchRecords()}
            className="w-full pl-9 pr-4 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl focus:border-indigo-500/40 outline-none text-[var(--text-primary)]"
          />
        </div>
        <button
          onClick={fetchRecords}
          className="py-2 px-3 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] flex items-center justify-center transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-color)]">
              <th className="text-left py-3 px-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Code</th>
              <th className="text-left py-3 px-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Name</th>
              <th className="text-left py-3 px-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Type</th>
              <th className="text-left py-3 px-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Price</th>
              <th className="text-left py-3 px-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Status</th>
              <th className="text-right py-3 px-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((rec) => (
              <tr key={rec.id} className="border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-tertiary)] transition-colors group">
                <td className="py-3 px-4 text-xs font-bold text-[var(--text-primary)]">{rec.productCode}</td>
                <td className="py-3 px-4 text-xs text-[var(--text-primary)]">{rec.productName}</td>
                <td className="py-3 px-4 text-xs text-[var(--text-secondary)]">{rec.productType}</td>
                <td className="py-3 px-4 text-xs font-mono text-[var(--text-primary)]">₹{rec.sellingPrice || 0}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${rec.status === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                    {rec.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(rec)} className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setShowDeleteConfirm(rec.id)} className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {records.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-[var(--text-muted)] text-xs">No products found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Form Header */}
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[var(--text-primary)] font-display">{editRecord ? 'Edit Product' : 'Create Product'}</h3>
                  <p className="text-[10px] text-[var(--text-muted)]">Fill in product details</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Navigation */}
            <div className="px-5 pt-3 border-b border-[var(--border-color)] flex gap-4">
              <button onClick={() => setActiveTab('basic')} className={`pb-2 text-xs font-bold border-b-2 transition-colors ${activeTab === 'basic' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>Basic Details</button>
              <button onClick={() => setActiveTab('pricing')} className={`pb-2 text-xs font-bold border-b-2 transition-colors ${activeTab === 'pricing' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>Pricing & Tax</button>
              <button onClick={() => setActiveTab('inventory')} className={`pb-2 text-xs font-bold border-b-2 transition-colors ${activeTab === 'inventory' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>Inventory & Tracking</button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-auto p-5">
              
              {/* BASIC DETAILS */}
              <div className={activeTab === 'basic' ? 'block' : 'hidden'}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Product Code <span className="text-rose-400">*</span></label>
                    <input required type="text" value={formData.productCode || ''} onChange={e => setFormData({ ...formData, productCode: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Product Name <span className="text-rose-400">*</span></label>
                    <input required type="text" value={formData.productName || ''} onChange={e => setFormData({ ...formData, productName: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Product Type</label>
                    <select value={formData.productType || 'FINISHED_GOODS'} onChange={e => setFormData({ ...formData, productType: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none">
                      <option value="RAW_MATERIAL">Raw Material</option>
                      <option value="FINISHED_GOODS">Finished Goods</option>
                      <option value="SEMI_FINISHED">Semi-Finished</option>
                      <option value="SERVICE">Service</option>
                      <option value="CONSUMABLES">Consumables</option>
                      <option value="SPARE_PARTS">Spare Parts</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Status</label>
                    <select value={formData.status || 'ACTIVE'} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none">
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                      <option value="DRAFT">DRAFT</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Short Description</label>
                    <textarea rows={2} value={formData.shortDescription || ''} onChange={e => setFormData({ ...formData, shortDescription: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none resize-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">SKU</label>
                    <input type="text" value={formData.sku || ''} onChange={e => setFormData({ ...formData, sku: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Barcode / QR</label>
                    <input type="text" value={formData.barcode || ''} onChange={e => setFormData({ ...formData, barcode: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                </div>
              </div>

              {/* PRICING & TAX */}
              <div className={activeTab === 'pricing' ? 'block' : 'hidden'}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Cost Price (₹)</label>
                    <input type="number" step="any" value={formData.costPrice || ''} onChange={e => setFormData({ ...formData, costPrice: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Selling Price (₹)</label>
                    <input type="number" step="any" value={formData.sellingPrice || ''} onChange={e => setFormData({ ...formData, sellingPrice: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">MRP (₹)</label>
                    <input type="number" step="any" value={formData.mrp || ''} onChange={e => setFormData({ ...formData, mrp: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Dealer Price (₹)</label>
                    <input type="number" step="any" value={formData.dealerPrice || ''} onChange={e => setFormData({ ...formData, dealerPrice: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                  <hr className="col-span-2 border-[var(--border-color)] my-2" />
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">HSN / SAC Code</label>
                    <input type="text" value={formData.hsnSacCode || ''} onChange={e => setFormData({ ...formData, hsnSacCode: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                  <div className="flex items-center gap-4 pt-5">
                    <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <input type="checkbox" checked={formData.exportEligible || false} onChange={e => setFormData({ ...formData, exportEligible: e.target.checked })} /> Export Eligible
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <input type="checkbox" checked={formData.reverseCharge || false} onChange={e => setFormData({ ...formData, reverseCharge: e.target.checked })} /> Reverse Charge
                    </label>
                  </div>
                </div>
              </div>

              {/* INVENTORY */}
              <div className={activeTab === 'inventory' ? 'block' : 'hidden'}>
                <div className="mb-4">
                  <label className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                    <input type="checkbox" checked={formData.trackInventory || false} onChange={e => setFormData({ ...formData, trackInventory: e.target.checked })} /> Track Inventory for this Product
                  </label>
                </div>
                {formData.trackInventory && (
                  <div className="grid grid-cols-2 gap-4 p-4 border border-[var(--border-color)] rounded-xl bg-[var(--bg-primary)]">
                    <div>
                      <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Reorder Level</label>
                      <input type="number" step="any" value={formData.reorderLevel || ''} onChange={e => setFormData({ ...formData, reorderLevel: e.target.value })} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Safety Stock</label>
                      <input type="number" step="any" value={formData.safetyStock || ''} onChange={e => setFormData({ ...formData, safetyStock: e.target.value })} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Min Stock</label>
                      <input type="number" step="any" value={formData.minStock || ''} onChange={e => setFormData({ ...formData, minStock: e.target.value })} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Max Stock</label>
                      <input type="number" step="any" value={formData.maxStock || ''} onChange={e => setFormData({ ...formData, maxStock: e.target.value })} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                    </div>
                    <hr className="col-span-2 border-[var(--border-color)] my-2" />
                    <div className="col-span-2 flex items-center gap-6">
                      <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <input type="checkbox" checked={formData.serialTracking || false} onChange={e => setFormData({ ...formData, serialTracking: e.target.checked })} /> Serial Tracking
                      </label>
                      <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <input type="checkbox" checked={formData.batchTracking || false} onChange={e => setFormData({ ...formData, batchTracking: e.target.checked })} /> Batch Tracking
                      </label>
                      <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <input type="checkbox" checked={formData.expiryTracking || false} onChange={e => setFormData({ ...formData, expiryTracking: e.target.checked })} /> Expiry Tracking
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Footer */}
              <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t border-[var(--border-color)]">
                <button type="button" onClick={() => setShowForm(false)} className="py-2 px-5 rounded-xl text-xs font-bold border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-all">Cancel</button>
                <button type="submit" disabled={loading} className="py-2 px-6 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-60">
                  {loading ? 'Saving…' : editRecord ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
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
