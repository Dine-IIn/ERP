import { useState, useEffect, useRef } from 'react';
import {
  Package,
  Users,
  Truck,
  UserCircle,
  Warehouse,
  Receipt,
  Scale,
  Tag,
  BookOpen,
  Bookmark,
  Plus,
  Pencil,
  Trash2,
  Search,
  Download,
  Upload,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  AlertCircle,
  Filter,
  ChevronDown
} from 'lucide-react';

interface MDMProps {
  user: {
    id?: string;
    username: string;
    companyCode: string;
    role: string | null;
    isSuperAdmin: boolean;
  };
  token: string;
  backendUrl: string;
  initialMaster?: MasterType;
}

type MasterType = 'product' | 'customer' | 'vendor' | 'employee' | 'warehouse' | 'tax' | 'unit' | 'category' | 'brand' | 'account';

interface MasterConfig {
  key: MasterType;
  label: string;
  icon: React.ReactNode;
  color: string;
  fields: FieldDef[];
  codeField: string;
  nameField: string;
}

interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'date' | 'textarea';
  options?: string[];
  required?: boolean;
  span?: number; // grid colspan (out of 2)
}

const MASTER_CONFIGS: MasterConfig[] = [
  {
    key: 'product',
    label: 'Product Master',
    icon: <Package className="w-4 h-4" />,
    color: 'indigo',
    codeField: 'productCode',
    nameField: 'productName',
    fields: [
      { key: 'productCode', label: 'Product Code', type: 'text', required: true },
      { key: 'productName', label: 'Product Name', type: 'text', required: true },
      { key: 'sku', label: 'SKU', type: 'text' },
      { key: 'barcode', label: 'Barcode', type: 'text' },
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'subcategory', label: 'Subcategory', type: 'text' },
      { key: 'unit', label: 'Unit of Measure', type: 'text' },
      { key: 'hsnCode', label: 'HSN/SAC Code', type: 'text' },
      { key: 'taxCategory', label: 'Tax Category', type: 'text' },
      { key: 'costPrice', label: 'Cost Price (₹)', type: 'number' },
      { key: 'sellingPrice', label: 'Selling Price (₹)', type: 'number' },
      { key: 'reorderLevel', label: 'Reorder Level', type: 'number' },
      { key: 'minStock', label: 'Min Stock', type: 'number' },
      { key: 'maxStock', label: 'Max Stock', type: 'number' },
      { key: 'weight', label: 'Weight (kg)', type: 'number' },
      { key: 'dimensions', label: 'Dimensions (L×W×H)', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE', 'DRAFT'] },
      { key: 'serialTracking', label: 'Serial Number Tracking', type: 'boolean' },
      { key: 'batchTracking', label: 'Batch/Lot Tracking', type: 'boolean' },
      { key: 'expiryTracking', label: 'Expiry Date Tracking', type: 'boolean' },
    ]
  },
  {
    key: 'customer',
    label: 'Customer Master',
    icon: <Users className="w-4 h-4" />,
    color: 'emerald',
    codeField: 'customerCode',
    nameField: 'customerName',
    fields: [
      { key: 'customerCode', label: 'Customer Code', type: 'text', required: true },
      { key: 'customerName', label: 'Customer Name', type: 'text', required: true },
      { key: 'companyName', label: 'Company Name', type: 'text' },
      { key: 'customerType', label: 'Customer Type', type: 'select', options: ['INDIVIDUAL', 'COMMERCIAL'] },
      { key: 'gstin', label: 'GSTIN', type: 'text' },
      { key: 'pan', label: 'PAN', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'paymentTerms', label: 'Payment Terms', type: 'text' },
      { key: 'creditLimit', label: 'Credit Limit (₹)', type: 'number' },
      { key: 'outstandingAmount', label: 'Outstanding Amount (₹)', type: 'number' },
      { key: 'billingAddress', label: 'Billing Address', type: 'textarea', span: 2 },
      { key: 'shippingAddress', label: 'Shipping Address', type: 'textarea', span: 2 },
      { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] },
    ]
  },
  {
    key: 'vendor',
    label: 'Vendor Master',
    icon: <Truck className="w-4 h-4" />,
    color: 'amber',
    codeField: 'vendorCode',
    nameField: 'vendorName',
    fields: [
      { key: 'vendorCode', label: 'Vendor Code', type: 'text', required: true },
      { key: 'vendorName', label: 'Vendor Name', type: 'text', required: true },
      { key: 'gstin', label: 'GSTIN', type: 'text' },
      { key: 'contactPerson', label: 'Contact Person', type: 'text' },
      { key: 'paymentTerms', label: 'Payment Terms', type: 'text' },
      { key: 'vendorCategory', label: 'Vendor Category', type: 'text' },
      { key: 'rating', label: 'Rating (1–5)', type: 'number' },
      { key: 'bankDetails', label: 'Bank Details', type: 'textarea', span: 2 },
      { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] },
    ]
  },
  {
    key: 'employee',
    label: 'Employee Master',
    icon: <UserCircle className="w-4 h-4" />,
    color: 'purple',
    codeField: 'employeeCode',
    nameField: 'employeeName',
    fields: [
      { key: 'employeeCode', label: 'Employee Code', type: 'text', required: true },
      { key: 'employeeName', label: 'Employee Name', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'department', label: 'Department', type: 'text' },
      { key: 'designation', label: 'Designation', type: 'text' },
      { key: 'dateOfJoining', label: 'Date of Joining', type: 'date' },
      { key: 'salary', label: 'Salary (₹/month)', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] },
    ]
  },
  {
    key: 'warehouse',
    label: 'Warehouse Master',
    icon: <Warehouse className="w-4 h-4" />,
    color: 'cyan',
    codeField: 'warehouseCode',
    nameField: 'warehouseName',
    fields: [
      { key: 'warehouseCode', label: 'Warehouse Code', type: 'text', required: true },
      { key: 'warehouseName', label: 'Warehouse Name', type: 'text', required: true },
      { key: 'location', label: 'Location / Address', type: 'textarea', span: 2 },
      { key: 'capacity', label: 'Capacity (sq.ft)', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] },
    ]
  },
  {
    key: 'tax',
    label: 'Tax Master',
    icon: <Receipt className="w-4 h-4" />,
    color: 'rose',
    codeField: 'taxCode',
    nameField: 'taxName',
    fields: [
      { key: 'taxCode', label: 'Tax Code', type: 'text', required: true },
      { key: 'taxName', label: 'Tax Name', type: 'text', required: true },
      { key: 'taxRate', label: 'Tax Rate (%)', type: 'number', required: true },
      { key: 'taxType', label: 'Tax Type', type: 'select', options: ['GST', 'VAT', 'TDS'], required: true },
      { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] },
    ]
  },
  {
    key: 'unit',
    label: 'Unit Master',
    icon: <Scale className="w-4 h-4" />,
    color: 'teal',
    codeField: 'unitCode',
    nameField: 'unitName',
    fields: [
      { key: 'unitCode', label: 'Unit Code', type: 'text', required: true },
      { key: 'unitName', label: 'Unit Name', type: 'text', required: true },
      { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] },
    ]
  },
  {
    key: 'category',
    label: 'Category Master',
    icon: <Tag className="w-4 h-4" />,
    color: 'orange',
    codeField: 'categoryCode',
    nameField: 'categoryName',
    fields: [
      { key: 'categoryCode', label: 'Category Code', type: 'text', required: true },
      { key: 'categoryName', label: 'Category Name', type: 'text', required: true },
      { key: 'parentCategoryId', label: 'Parent Category ID (optional)', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] },
    ]
  },
  {
    key: 'brand',
    label: 'Brand Master',
    icon: <Bookmark className="w-4 h-4" />,
    color: 'amber',
    codeField: 'brandCode',
    nameField: 'brandName',
    fields: [
      { key: 'brandCode', label: 'Brand Code', type: 'text', required: true },
      { key: 'brandName', label: 'Brand Name', type: 'text', required: true },
      { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] }
    ]
  },
  {
    key: 'account',
    label: 'Chart of Accounts',
    icon: <BookOpen className="w-4 h-4" />,
    color: 'slate',
    codeField: 'accountCode',
    nameField: 'accountName',
    fields: [
      { key: 'accountCode', label: 'Account Code', type: 'text', required: true },
      { key: 'accountName', label: 'Account Name', type: 'text', required: true },
      { key: 'accountType', label: 'Account Type', type: 'select', options: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'], required: true },
      { key: 'parentAccountId', label: 'Parent Account ID (optional)', type: 'text' },
      { key: 'balance', label: 'Opening Balance (₹)', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] },
    ]
  }
];

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30', badge: 'bg-indigo-500/20 text-indigo-300' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', badge: 'bg-emerald-500/20 text-emerald-300' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', badge: 'bg-amber-500/20 text-amber-300' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', badge: 'bg-purple-500/20 text-purple-300' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', badge: 'bg-cyan-500/20 text-cyan-300' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30', badge: 'bg-rose-500/20 text-rose-300' },
  teal: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/30', badge: 'bg-teal-500/20 text-teal-300' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', badge: 'bg-orange-500/20 text-orange-300' },
  slate: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30', badge: 'bg-slate-500/20 text-slate-300' },
};

export default function MasterDataManagement({ user: _user, token, backendUrl, initialMaster }: MDMProps) {
  const [activeMaster, setActiveMaster] = useState<MasterType>('product');

  useEffect(() => {
    if (initialMaster) {
      setActiveMaster(initialMaster);
    }
  }, [initialMaster]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = MASTER_CONFIGS.find(c => c.key === activeMaster)!;
  const colors = COLOR_MAP[config.color];

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
    if (method !== 'GET' && res.headers.get('content-type')?.includes('text/csv')) {
      return res;
    }
    return res.json();
  };

  // Fetch records
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (filterStatus) params.set('status', filterStatus);
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
    setFilterStatus('');
    setShowFilter(false);
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
    // Build empty form with defaults
    const empty: any = {};
    config.fields.forEach(f => {
      if (f.type === 'boolean') empty[f.key] = false;
      else if (f.type === 'number') empty[f.key] = '';
      else if (f.type === 'select') empty[f.key] = f.options?.[0] || '';
      else empty[f.key] = '';
    });
    setFormData(empty);
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
      const payload: any = { ...formData };
      // Coerce number fields
      config.fields.forEach(f => {
        if (f.type === 'number' && payload[f.key] !== '') {
          payload[f.key] = parseFloat(payload[f.key]) || 0;
        }
        if (f.type === 'boolean') {
          payload[f.key] = payload[f.key] === true || payload[f.key] === 'true';
        }
      });

      if (editRecord) {
        await apiRequest(`/api/mdm/${activeMaster}/${editRecord.id}`, 'PATCH', payload);
        setSuccessMsg('Record updated successfully.');
      } else {
        await apiRequest(`/api/mdm/${activeMaster}`, 'POST', payload);
        setSuccessMsg('Record created successfully.');
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

  const handleExport = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/mdm/${activeMaster}/export`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeMaster}_export.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccessMsg('Export downloaded.');
    } catch (e: any) {
      setErrorMsg('Export failed: ' + e.message);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImportText(ev.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    if (!importText.trim()) return;
    setLoading(true);
    try {
      const lines = importText.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
      const parsed = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
        const obj: any = {};
        headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
        return obj;
      });
      const data = await apiRequest(`/api/mdm/${activeMaster}/import`, 'POST', { records: parsed });
      setSuccessMsg(`Imported ${data.message}. ${data.duplicatesSkipped?.length ? `Skipped duplicates: ${data.duplicatesSkipped.join(', ')}` : ''}`);
      setShowImportModal(false);
      setImportText('');
      fetchRecords();
    } catch (e: any) {
      setErrorMsg('Import failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Table columns: show first 4-5 fields based on config
  const tableFields = config.fields.slice(0, 5).filter(f => f.type !== 'textarea' && f.type !== 'boolean');

  const renderFieldValue = (record: any, field: FieldDef) => {
    const val = record[field.key];
    if (val === null || val === undefined || val === '') return <span className="text-[var(--text-muted)] italic text-[10px]">—</span>;
    if (field.type === 'boolean') return val ? '✓' : '✗';
    if (field.type === 'number') return <span className="font-mono">{typeof val === 'number' ? val.toLocaleString() : val}</span>;
    if (field.key === 'status') {
      const isActive = val === 'ACTIVE';
      return (
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
          {val}
        </span>
      );
    }
    return String(val).length > 30 ? String(val).slice(0, 28) + '…' : String(val);
  };

  return (
    <div className="flex h-full gap-0 animate-fade-in select-none">
      {/* ===================== SIDE NAV ===================== */}
      <aside className="w-52 shrink-0 border-r border-[var(--border-color)] pr-3 mr-4">
        <div className="mb-4">
          <h3 className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Master Records</h3>
        </div>
        <nav className="flex flex-col gap-1">
          {MASTER_CONFIGS.map(m => {
            const c = COLOR_MAP[m.color];
            const isActive = activeMaster === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setActiveMaster(m.key)}
                className={`w-full text-left py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer border ${
                  isActive
                    ? `${c.bg} ${c.text} ${c.border}`
                    : 'text-[var(--text-secondary)] border-transparent hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className={isActive ? c.text : 'text-[var(--text-muted)]'}>{m.icon}</span>
                {m.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ===================== MAIN CONTENT ===================== */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* ---- Header ---- */}
        <div className={`flex items-center justify-between mb-4 pb-4 border-b border-[var(--border-color)]`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${colors.bg} ${colors.text}`}>
              {config.icon}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[var(--text-primary)] font-display">{config.label}</h2>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                {records.length} records · CRUD · Soft Delete · CSV Import/Export · Audit Logs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="py-1.5 px-3 rounded-xl text-xs font-bold border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Upload className="w-3.5 h-3.5" /> Import CSV
            </button>
            <button
              onClick={handleExport}
              className="py-1.5 px-3 rounded-xl text-xs font-bold border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              onClick={openCreate}
              className={`py-1.5 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20`}
            >
              <Plus className="w-3.5 h-3.5" /> Add Record
            </button>
          </div>
        </div>

        {/* ---- Global Alerts ---- */}
        {successMsg && (
          <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs py-3 px-4 rounded-xl flex items-center gap-2 animate-fade-in">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs py-3 px-4 rounded-xl flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ---- Search & Filter Bar ---- */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder={`Search by code or name…`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchRecords()}
              className="w-full pl-9 pr-4 py-2 text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl focus:border-indigo-500/40 outline-none text-[var(--text-primary)]"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition-all ${showFilter ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
            >
              <Filter className="w-3.5 h-3.5" /> Filter
              <ChevronDown className={`w-3 h-3 transition-transform ${showFilter ? 'rotate-180' : ''}`} />
            </button>
            {showFilter && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 shadow-xl min-w-44">
                <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase mb-2">Filter by Status</p>
                {['', 'ACTIVE', 'INACTIVE', 'DRAFT'].map(s => (
                  <button
                    key={s}
                    onClick={() => { setFilterStatus(s); setShowFilter(false); setTimeout(fetchRecords, 50); }}
                    className={`w-full text-left py-1.5 px-2 rounded-lg text-xs transition-all cursor-pointer ${filterStatus === s ? 'text-indigo-400 font-bold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                  >
                    {s === '' ? 'All Statuses' : s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={fetchRecords}
            className="py-2 px-3 rounded-xl text-xs font-bold border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* ---- Data Table ---- */}
        <div className="flex-1 overflow-auto rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]">
          {loading && records.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-[var(--text-muted)] text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading records…
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className={`p-4 rounded-2xl ${colors.bg} ${colors.text} mb-4`}>
                {config.icon}
              </div>
              <p className="text-sm font-bold text-[var(--text-secondary)]">No records found</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Create your first {config.label} record</p>
              <button
                onClick={openCreate}
                className="mt-4 py-2 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                + Add Record
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-color)]">
                  <th className="text-left py-3 px-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">#</th>
                  {tableFields.map(f => (
                    <th key={f.key} className="text-left py-3 px-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                      {f.label}
                    </th>
                  ))}
                  <th className="text-left py-3 px-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Status</th>
                  <th className="text-right py-3 px-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec, idx) => (
                  <tr
                    key={rec.id}
                    className="border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-tertiary)] transition-colors group"
                  >
                    <td className="py-3 px-4 text-[10px] text-[var(--text-muted)] font-mono">{idx + 1}</td>
                    {tableFields.map(f => (
                      <td key={f.key} className="py-3 px-4 text-xs text-[var(--text-primary)]">
                        {renderFieldValue(rec, f)}
                      </td>
                    ))}
                    <td className="py-3 px-4">
                      {renderFieldValue(rec, { key: 'status', label: 'Status', type: 'select' })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(rec)}
                          className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 cursor-pointer transition-all"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(rec.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 cursor-pointer transition-all"
                          title="Soft Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ---- Pagination Summary ---- */}
        {records.length > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[10px] text-[var(--text-muted)]">
              Showing <span className="font-bold text-[var(--text-secondary)]">{records.length}</span> records
              {filterStatus && <> · Filtered by <span className="text-indigo-400 font-bold">{filterStatus}</span></>}
            </p>
            <div className="flex items-center gap-1">
              <button className="p-1 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-[var(--text-secondary)] px-2">Page 1</span>
              <button className="p-1 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===================== FORM MODAL ===================== */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className={`flex items-center justify-between p-5 border-b border-[var(--border-color)] sticky top-0 bg-[var(--bg-card)] z-10`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${colors.bg} ${colors.text}`}>
                  {config.icon}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[var(--text-primary)] font-display">
                    {editRecord ? 'Edit' : 'Create'} {config.label}
                  </h3>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {editRecord ? `Editing: ${editRecord[config.codeField]}` : 'Fill in the fields below'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 rounded-xl hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleFormSubmit} className="p-5">
              <div className="grid grid-cols-2 gap-4">
                {config.fields.map(field => (
                  <div key={field.key} className={field.span === 2 ? 'col-span-2' : ''}>
                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1.5">
                      {field.label}
                      {field.required && <span className="text-rose-400 ml-1">*</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={formData[field.key] ?? field.options?.[0] ?? ''}
                        onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                        required={field.required}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none"
                      >
                        {field.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === 'boolean' ? (
                      <div className="flex items-center gap-3 mt-1">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, [field.key]: !formData[field.key] })}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${formData[field.key] ? 'bg-indigo-500' : 'bg-[var(--bg-tertiary)]'}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${formData[field.key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                        <span className="text-xs text-[var(--text-secondary)]">{formData[field.key] ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        value={formData[field.key] ?? ''}
                        onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                        rows={3}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none resize-none"
                        placeholder={`Enter ${field.label.toLowerCase()}…`}
                      />
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                        value={formData[field.key] ?? ''}
                        onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                        required={field.required}
                        step={field.type === 'number' ? 'any' : undefined}
                        placeholder={`Enter ${field.label.toLowerCase()}…`}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-xl text-xs text-[var(--text-primary)] outline-none"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="py-2 px-5 rounded-xl text-xs font-bold border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="py-2 px-6 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-60"
                >
                  {loading ? 'Saving…' : editRecord ? 'Save Changes' : 'Create Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== DELETE CONFIRM MODAL ===================== */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-rose-500/30 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[var(--text-primary)]">Confirm Soft Delete</h3>
                <p className="text-[10px] text-[var(--text-muted)]">Record will be marked deleted but kept in audit trail.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="py-2 px-4 rounded-xl text-xs font-bold border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm!)}
                className="py-2 px-5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-lg"
              >
                Soft Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== IMPORT MODAL ===================== */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[var(--text-primary)]">Import CSV — {config.label}</h3>
                  <p className="text-[10px] text-[var(--text-muted)]">Upload or paste CSV data with matching column headers</p>
                </div>
              </div>
              <button onClick={() => { setShowImportModal(false); setImportText(''); }} className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg cursor-pointer">
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>

            {/* CSV Template Download */}
            <div className="mb-4 p-3 bg-indigo-500/5 border border-indigo-500/15 rounded-xl">
              <p className="text-[10px] text-[var(--text-secondary)] font-bold mb-1">Expected columns:</p>
              <p className="text-[10px] text-indigo-400 font-mono break-all">
                {config.fields.map(f => f.key).join(', ')}
              </p>
            </div>

            <input
              type="file"
              accept=".csv,.txt"
              ref={fileInputRef}
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 rounded-xl border-2 border-dashed border-[var(--border-color)] text-xs text-[var(--text-secondary)] hover:border-indigo-500/40 hover:text-indigo-400 flex items-center justify-center gap-2 cursor-pointer transition-all mb-3"
            >
              <Upload className="w-4 h-4" /> Click to upload CSV file
            </button>
            <p className="text-center text-[10px] text-[var(--text-muted)] my-2">— or paste CSV below —</p>
            <textarea
              value={importText}
              onChange={e => setImportText(e.target.value)}
              rows={6}
              placeholder={"productCode,productName,sku,...\nPRD-001,Steel Plate,..."}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[10px] font-mono text-[var(--text-primary)] py-2 px-3 rounded-xl resize-none outline-none focus:border-indigo-500/40"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setShowImportModal(false); setImportText(''); }}
                className="py-2 px-4 rounded-xl text-xs font-bold border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleImportSubmit}
                disabled={!importText.trim() || loading}
                className="py-2 px-5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer disabled:opacity-60 transition-all"
              >
                {loading ? 'Importing…' : 'Import Records'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
