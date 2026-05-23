import { useState, useEffect } from 'react';
import {
  UserCircle,
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

export default function EmployeeMasterUI({ token, backendUrl }: Props) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'basic' | 'hr'>('basic');

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
      const data = await apiRequest(`/api/mdm/employee?${params.toString()}`);
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
    setFormData({
      ...record,
      dateOfJoining: record.dateOfJoining ? record.dateOfJoining.split('T')[0] : ''
    });
    setEditRecord(record);
    setActiveTab('basic');
    setShowForm(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData };
      if (payload.salary) payload.salary = parseFloat(payload.salary);
      if (payload.dateOfJoining) payload.dateOfJoining = new Date(payload.dateOfJoining).toISOString();

      if (editRecord) {
        await apiRequest(`/api/mdm/employee/${editRecord.id}`, 'PATCH', payload);
        setSuccessMsg('Employee updated successfully.');
      } else {
        await apiRequest(`/api/mdm/employee`, 'POST', payload);
        setSuccessMsg('Employee created successfully.');
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
      await apiRequest(`/api/mdm/employee/${id}`, 'DELETE');
      setSuccessMsg('Employee soft-deleted successfully.');
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
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
            <UserCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[var(--text-primary)] font-display">Employee Master</h2>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Manage workforce, roles, and payroll information.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openCreate} className="py-1.5 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-lg shadow-purple-500/20">
            <Plus className="w-3.5 h-3.5" /> Add Employee
          </button>
        </div>
      </div>

      {successMsg && <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs py-3 px-4 rounded-xl flex items-center gap-2"><CheckCircle className="w-4 h-4 shrink-0" /><span>{successMsg}</span></div>}
      {errorMsg && <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs py-3 px-4 rounded-xl flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><span>{errorMsg}</span></div>}

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input type="text" placeholder="Search by name or code…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchRecords()} className="w-full pl-9 pr-4 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl focus:border-purple-500/40 outline-none text-[var(--text-primary)]" />
        </div>
        <button onClick={fetchRecords} className="py-2 px-3 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] flex items-center justify-center transition-all">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-color)]">
              <th className="text-left py-3 px-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Employee Code</th>
              <th className="text-left py-3 px-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Name</th>
              <th className="text-left py-3 px-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Role</th>
              <th className="text-left py-3 px-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Contact</th>
              <th className="text-left py-3 px-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Status</th>
              <th className="text-right py-3 px-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((rec) => (
              <tr key={rec.id} className="border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-tertiary)] transition-colors group">
                <td className="py-3 px-4 text-xs font-bold text-[var(--text-primary)]">{rec.employeeCode}</td>
                <td className="py-3 px-4 text-xs text-[var(--text-primary)]">{rec.employeeName}</td>
                <td className="py-3 px-4 text-xs text-[var(--text-secondary)]">{rec.designation || '—'}</td>
                <td className="py-3 px-4 text-[10px] text-[var(--text-secondary)]">
                  <div>{rec.phone || '—'}</div>
                  <div>{rec.email || '—'}</div>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${rec.status === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>{rec.status}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(rec)} className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setShowDeleteConfirm(rec.id)} className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {records.length === 0 && !loading && (
              <tr><td colSpan={6} className="text-center py-10 text-[var(--text-muted)] text-xs">No employees found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400"><UserCircle className="w-4 h-4" /></div>
                <div>
                  <h3 className="font-extrabold text-sm text-[var(--text-primary)] font-display">{editRecord ? 'Edit Employee' : 'Create Employee'}</h3>
                  <p className="text-[10px] text-[var(--text-muted)]">Configure workforce details.</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition-all"><X className="w-4 h-4" /></button>
            </div>

            <div className="px-5 pt-3 border-b border-[var(--border-color)] flex gap-4">
              <button onClick={() => setActiveTab('basic')} className={`pb-2 text-xs font-bold border-b-2 transition-colors ${activeTab === 'basic' ? 'border-purple-500 text-purple-400' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>Basic Details</button>
              <button onClick={() => setActiveTab('hr')} className={`pb-2 text-xs font-bold border-b-2 transition-colors ${activeTab === 'hr' ? 'border-purple-500 text-purple-400' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>HR & Payroll</button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-1 overflow-auto p-5">
              <div className={activeTab === 'basic' ? 'block' : 'hidden'}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Employee Code <span className="text-rose-400">*</span></label>
                    <input required type="text" value={formData.employeeCode || ''} onChange={e => setFormData({ ...formData, employeeCode: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-purple-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Employee Name <span className="text-rose-400">*</span></label>
                    <input required type="text" value={formData.employeeName || ''} onChange={e => setFormData({ ...formData, employeeName: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-purple-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Email</label>
                    <input type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-purple-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Phone Number</label>
                    <input type="tel" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-purple-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Status</label>
                    <select value={formData.status || 'ACTIVE'} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-purple-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none">
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className={activeTab === 'hr' ? 'block' : 'hidden'}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Department ID</label>
                    <input type="text" value={formData.departmentId || ''} onChange={e => setFormData({ ...formData, departmentId: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-purple-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Designation</label>
                    <input type="text" value={formData.designation || ''} onChange={e => setFormData({ ...formData, designation: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-purple-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Reporting Manager ID</label>
                    <input type="text" value={formData.managerId || ''} onChange={e => setFormData({ ...formData, managerId: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-purple-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Date of Joining</label>
                    <input type="date" value={formData.dateOfJoining || ''} onChange={e => setFormData({ ...formData, dateOfJoining: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-purple-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">Salary (₹/month)</label>
                    <input type="number" step="any" value={formData.salary || ''} onChange={e => setFormData({ ...formData, salary: e.target.value })} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-purple-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t border-[var(--border-color)]">
                <button type="button" onClick={() => setShowForm(false)} className="py-2 px-5 rounded-xl text-xs font-bold border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-all">Cancel</button>
                <button type="submit" disabled={loading} className="py-2 px-6 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-lg shadow-purple-500/20 disabled:opacity-60">
                  {loading ? 'Saving…' : editRecord ? 'Save Changes' : 'Create Employee'}
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
