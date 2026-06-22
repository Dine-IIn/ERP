import React, { useState } from 'react';
import { CustomerSchema } from '../../utils/schemas';
import { UserCheck, Search, Plus, Edit, Trash2, X, AlertCircle, MapPin, DollarSign, Clock } from 'lucide-react';

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

interface CustomerMasterProps {
  customers: any[];
  onCreateCustomer: (customer: any) => Promise<void>;
  onUpdateCustomer: (id: string, customer: any) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
  currencySymbol?: string;
}

export default function CustomerMaster({
  customers,
  onCreateCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  currencySymbol = '$',
}: CustomerMasterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [customerGroupFilter, setCustomerGroupFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  React.useEffect(() => {
    const handleClose = (e: Event) => {
      if (showModal) {
        e.preventDefault();
        setShowModal(false);
      }
    };
    window.addEventListener('close-active-modal', handleClose);
    return () => window.removeEventListener('close-active-modal', handleClose);
  }, [showModal]);
  
  const [form, setForm] = useState({
    name: '',
    customerType: 'INDIVIDUAL',
    customerGroup: '',
    contactPerson: '',
    contactNo: '',
    email: '',
    billingAddress: '',
    shippingAddress: '',
    creditLimit: '0',
    creditTime: '0',
    clientClassification: 'NATIONAL',
    state: 'Gujarat',
    country: 'India',
    currencySymbol: '$',
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    gstNumber: '',
    panNumber: ''
  });
  
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const openAddModal = () => {
    setForm({
      name: '',
      customerType: 'INDIVIDUAL',
      customerGroup: '',
      contactPerson: '',
      contactNo: '',
      email: '',
      billingAddress: '',
      shippingAddress: '',
      creditLimit: '0',
      creditTime: '0',
      clientClassification: 'NATIONAL',
      state: 'Gujarat',
      country: 'India',
      currencySymbol: '$',
      bankName: '',
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      gstNumber: '',
      panNumber: ''
    });
    setIsEditing(false);
    setEditingId(null);
    setLocalErr(null);
    setLocalSuccess(null);
    setShowModal(true);
  };

  const openEditModal = (cust: any) => {
    setForm({
      name: cust.name,
      customerType: cust.customerType || 'INDIVIDUAL',
      customerGroup: cust.customerGroup || '',
      contactPerson: cust.contactPerson || '',
      contactNo: cust.contactNo,
      email: cust.email || '',
      billingAddress: cust.billingAddress || '',
      shippingAddress: cust.shippingAddress || '',
      creditLimit: String(cust.creditLimit || 0),
      creditTime: String(cust.creditTime || 0),
      clientClassification: cust.clientClassification || 'NATIONAL',
      state: cust.state || 'Gujarat',
      country: cust.country || 'India',
      currencySymbol: cust.currencySymbol || '$',
      bankName: cust.bankName || '',
      accountHolderName: cust.accountHolderName || '',
      accountNumber: cust.accountNumber || '',
      ifscCode: cust.ifscCode || '',
      gstNumber: cust.gstNumber || '',
      panNumber: cust.panNumber || ''
    });
    setIsEditing(true);
    setEditingId(cust.id);
    setLocalErr(null);
    setLocalSuccess(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.contactNo) {
      setLocalErr("Customer Name and Contact Number are required fields.");
      return;
    }

    setLocalErr(null);
      setLocalSuccess(null);
      setLoading(true);

      const parsed = CustomerSchema.safeParse(form);
      if (!parsed.success) {
        setLocalErr(parsed.error.issues[0].message);
        setLoading(false);
        return;
      }

      try {
      if (isEditing && editingId) {
        await onUpdateCustomer(editingId, form);
        setLocalSuccess("Customer details updated successfully!");
      } else {
        await onCreateCustomer(form);
        setLocalSuccess("Customer onboarding completed successfully!");
      }
      setTimeout(() => {
        setShowModal(false);
      }, 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to process customer master entry.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete customer '${name}'?`)) {
      try {
        await onDeleteCustomer(id);
      } catch (err: any) {
        alert(err.message || "Failed to delete customer");
      }
    }
  };

  // Extract unique customer groups
  const customerGroups = Array.from(
    new Set(customers.map(c => c.customerGroup).filter(Boolean))
  ) as string[];

  const filtered = (customers || []).filter(c => {
    const name = c?.name || '';
    const contactNo = c?.contactNo || '';
    const email = c?.email || '';
    const contactPerson = c?.contactPerson || '';
    const term = (searchTerm || '').toLowerCase();
    
    const matchesSearch = name.toLowerCase().includes(term) ||
      contactNo.includes(term) ||
      email.toLowerCase().includes(term) ||
      contactPerson.toLowerCase().includes(term);
    
    const matchesGroup = customerGroupFilter === 'ALL' || c?.customerGroup === customerGroupFilter;
    return matchesSearch && matchesGroup;
  });

  return (
    <div className="animate-fade-in flex flex-col gap-4 text-left select-none">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--border-color)] pb-3">
        <div>
          <h3 className="font-bold text-sm text-[var(--text-primary)] font-display flex items-center gap-1.5 uppercase tracking-wide">
            <UserCheck className="w-4 h-4 text-indigo-400" /> Customer Master Hub
          </h3>
          <p className="text-[var(--text-secondary)] text-[10px] mt-0.5">Administer accounts details, billing destinations, and credit ratings for sales clients</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
          <div className="relative flex-1 md:w-64 w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search customers by name, phone, email, contact..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
            />
          </div>

          <select
            value={customerGroupFilter}
            onChange={e => setCustomerGroupFilter(e.target.value)}
            className="bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500/50 cursor-pointer w-full sm:w-auto"
          >
            <option value="ALL">All Groups</option>
            {customerGroups.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          
          <button
            type="button"
            onClick={openAddModal}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1.5 border-0 bg-transparent transition-all shadow-md active:scale-95 shrink-0 w-full sm:w-auto justify-center"
          >
            <Plus className="w-3.5 h-3.5" /> Onboard Customer
          </button>
        </div>
      </div>

      {/* Customer log list grid */}
      <div className="overflow-x-auto border border-[var(--border-color)] rounded-xl mt-2">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] text-[var(--text-secondary)] font-bold">
              <th className="p-3 text-[10px] uppercase tracking-wider">Customer Name</th>
              <th className="p-3 text-[10px] uppercase tracking-wider">Type / Group</th>
              <th className="p-3 text-[10px] uppercase tracking-wider">Contact Info</th>
              <th className="p-3 text-[10px] uppercase tracking-wider">Credit Limit / Days</th>
              <th className="p-3 text-[10px] uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(cust => (
              <tr key={cust.id} className="border-b border-[var(--border-color)]/40 hover:bg-[var(--bg-tertiary)]/20 transition-colors last:border-b-0 text-left">
                <td className="p-3 shrink-0">
                  <span className="font-bold text-[var(--text-primary)] block">{cust.name} <span className="text-[10px] font-normal text-indigo-400">({cust.clientClassification === 'INTERNATIONAL' ? `${cust.country || ''}, ${cust.state || ''}` : cust.state || 'Gujarat'})</span></span>
                  <span className="text-[10px] text-[var(--text-muted)] mt-0.5">{cust.contactPerson ? `Contact Person: ${cust.contactPerson}` : 'No contact person'}</span>
                  {(cust.gstNumber || cust.panNumber) && (
                    <span className="text-[9px] text-emerald-400 block mt-0.5">
                      {cust.gstNumber ? `GSTIN: ${cust.gstNumber}` : ''}
                      {cust.gstNumber && cust.panNumber ? ' | ' : ''}
                      {cust.panNumber ? `PAN: ${cust.panNumber}` : ''}
                    </span>
                  )}
                  {cust.bankName && (
                    <span className="text-[9px] text-indigo-300 block mt-0.5">
                      Bank: {cust.bankName} (A/C: {cust.accountNumber || 'N/A'})
                    </span>
                  )}
                </td>
                <td className="p-3 shrink-0">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold tracking-wider inline-block uppercase ${
                    cust.customerType === 'COMPANY' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {cust.customerType}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold tracking-wider inline-block uppercase ml-1.5 ${
                    cust.clientClassification === 'INTERNATIONAL' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                  }`}>
                    {cust.clientClassification || 'NATIONAL'}
                  </span>
                  {cust.customerGroup && (
                    <span className="text-[10px] text-[var(--text-secondary)] block mt-1 font-mono uppercase">
                      Group: {cust.customerGroup}
                    </span>
                  )}
                </td>
                <td className="p-3 shrink-0 font-mono">
                  <span className="text-[var(--text-primary)] block">{cust.contactNo}</span>
                  <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">{cust.email || 'No email id'}</span>
                </td>
                <td className="p-3 shrink-0">
                  <span className="text-[var(--text-primary)] font-bold flex items-center gap-0.5 font-mono">
                    <span className="text-indigo-400 font-bold mr-0.5">{cust.currencySymbol || currencySymbol}</span> {cust.creditLimit ? cust.creditLimit.toLocaleString() : '0.00'}
                  </span>
                  <span className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1 mt-0.5 font-mono">
                    <Clock className="w-3 h-3 text-emerald-400" /> Credit Cycle: {cust.creditTime || 0} Days
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(cust)}
                      className="px-2 py-1 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded transition-all cursor-pointer border-0 bg-transparent flex items-center gap-1 text-[9px] uppercase font-bold"
                      title="Edit Master Settings"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cust.id, cust.name)}
                      className="px-2 py-1 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded transition-all cursor-pointer border-0 bg-transparent flex items-center gap-1 text-[9px] uppercase font-bold"
                      title="Delete Customer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-[var(--text-muted)] italic">No customer accounts onboarded yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ==========================================
          MODAL: CREATOR & MODIFIER FORM
          ========================================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg p-6 relative shadow-2xl text-left select-none animate-scale-up max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer bg-transparent border-0"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color)]">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)] font-display">
                  {isEditing ? 'Modify Customer Profile' : 'Onboard Sales Customer'}
                </h3>
                <p className="text-[var(--text-secondary)] text-[10px]">Setup billing routes, accounts groups, and allowed credit margins</p>
              </div>
            </div>

            {localErr && (
              <div className="p-3 mt-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{localErr}</span>
              </div>
            )}

            {localSuccess && (
              <div className="p-3 mt-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{localSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Customer Name */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Customer / Company Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                  placeholder="e.g. Acme Corp"
                />
              </div>

              {/* Currency Symbol Selection */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Billing Currency Symbol</label>
                <select
                  value={form.currencySymbol}
                  onChange={e => setForm({ ...form, currencySymbol: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                >
                  <option value="$">$ (USD)</option>
                  <option value="₹">₹ (INR)</option>
                  <option value="€">€ (EUR)</option>
                  <option value="£">£ (GBP)</option>
                  <option value="¥">¥ (JPY)</option>
                  <option value="AED">AED</option>
                  <option value="SR">SR (SAR)</option>
                </select>
              </div>

              {/* Client Classification Selection */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Billing Client Classification</label>
                <select
                  value={form.clientClassification}
                  onChange={e => setForm({ ...form, clientClassification: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                >
                  <option value="NATIONAL">NATIONAL (Domestic Billing)</option>
                  <option value="INTERNATIONAL">INTERNATIONAL (Cross-Border Billing)</option>
                </select>
              </div>

              {/* Country & State */}
              {form.clientClassification === 'INTERNATIONAL' ? (
                <>
                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Country (Required)</label>
                    <input
                      type="text"
                      value={form.country}
                      onChange={e => setForm({ ...form, country: e.target.value })}
                      placeholder="e.g. United States, Germany"
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] p-2 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">State / Province</label>
                    <input
                      type="text"
                      value={form.state}
                      onChange={e => setForm({ ...form, state: e.target.value })}
                      placeholder="e.g. California, Bavaria"
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] p-2 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* State dropdown for National */}
                  <div>
                    <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Billing / Shipping State</label>
                    <select
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] p-2 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                      value={form.state}
                      onChange={e => setForm({ ...form, state: e.target.value })}
                      required
                    >
                      {INDIAN_STATES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Contact Person */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Contact Person (Optional)</label>
                <input
                  type="text"
                  value={form.contactPerson}
                  onChange={e => setForm({ ...form, contactPerson: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                  placeholder="e.g. John Doe"
                />
              </div>

              {/* Contact Number */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Contact Phone Number</label>
                <input
                  type="text"
                  required
                  value={form.contactNo}
                  onChange={e => setForm({ ...form, contactNo: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                  placeholder="e.g. +91XXXXXXXXXX"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Company Email Address (Optional)</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                  placeholder="e.g. billing@client.com"
                />
              </div>

              {/* Customer Group */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Customer Group (Optional)</label>
                <input
                  type="text"
                  value={form.customerGroup}
                  onChange={e => setForm({ ...form, customerGroup: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                  placeholder="e.g. Wholesale, Retail, Tier 1"
                />
              </div>

              {/* Credit Limit & Days */}
              <div className="md:col-span-2 border-t border-[var(--border-color)] pt-3 mt-1">
                <span className="text-[9px] font-bold text-indigo-400 tracking-wider uppercase block mb-2">Credit Margin Settings</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[8px] font-bold text-[var(--text-secondary)] block mb-1">Credit Limit Amount ({currencySymbol})</label>
                    <input
                      type="number"
                      min="0"
                      value={form.creditLimit}
                      onChange={e => setForm({ ...form, creditLimit: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-[var(--text-secondary)] block mb-1">Max Credit Days (Credit Time)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.creditTime}
                      onChange={e => setForm({ ...form, creditTime: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Bank Details section */}
              <div className="md:col-span-2 border-t border-[var(--border-color)] pt-3 flex flex-col gap-3">
                <span className="text-[9px] font-bold text-indigo-400 tracking-wider uppercase block mb-0.5 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Customer Bank Details (Optional)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[8px] font-bold text-[var(--text-secondary)] block mb-1 uppercase">Bank Name</label>
                    <input
                      type="text"
                      value={form.bankName}
                      onChange={e => setForm({ ...form, bankName: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                      placeholder="e.g. ICICI Bank"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-[var(--text-secondary)] block mb-1 uppercase">Account Holder Name</label>
                    <input
                      type="text"
                      value={form.accountHolderName}
                      onChange={e => setForm({ ...form, accountHolderName: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                      placeholder="e.g. Customer Name"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-[var(--text-secondary)] block mb-1 uppercase">Account Number</label>
                    <input
                      type="text"
                      value={form.accountNumber}
                      onChange={e => setForm({ ...form, accountNumber: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                      placeholder="e.g. 1234567890"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-[var(--text-secondary)] block mb-1 uppercase">IFSC Code</label>
                    <input
                      type="text"
                      value={form.ifscCode}
                      onChange={e => setForm({ ...form, ifscCode: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono uppercase"
                      placeholder="e.g. ICIC0001234"
                    />
                  </div>
                </div>
              </div>

              {/* Tax Details section */}
              <div className="md:col-span-2 border-t border-[var(--border-color)] pt-3 flex flex-col gap-3">
                <span className="text-[9px] font-bold text-indigo-400 tracking-wider uppercase block mb-0.5 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Customer Tax Details (Optional)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[8px] font-bold text-[var(--text-secondary)] block mb-1 uppercase">GSTIN / Tax Number</label>
                    <input
                      type="text"
                      value={form.gstNumber}
                      onChange={e => setForm({ ...form, gstNumber: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono uppercase"
                      placeholder="e.g. 24AAAAA1111A1Z1"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-[var(--text-secondary)] block mb-1 uppercase">PAN Number</label>
                    <input
                      type="text"
                      value={form.panNumber}
                      onChange={e => setForm({ ...form, panNumber: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono uppercase"
                      placeholder="e.g. ABCDE1234F"
                    />
                  </div>
                </div>
              </div>

              {/* Address Section */}
              <div className="md:col-span-2 border-t border-[var(--border-color)] pt-3">
                <span className="text-[9px] font-bold text-indigo-400 tracking-wider uppercase block mb-2 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Addresses
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[8px] font-bold text-[var(--text-secondary)] block mb-1">Billing Address</label>
                    <textarea
                      rows={2}
                      value={form.billingAddress}
                      onChange={e => setForm({ ...form, billingAddress: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                      placeholder="Billing street address, country, pincode"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-[var(--text-secondary)] block mb-1">Shipping Address (Same as billing if blank)</label>
                    <textarea
                      rows={2}
                      value={form.shippingAddress}
                      onChange={e => setForm({ ...form, shippingAddress: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                      placeholder="Leave blank to sync shipping address with billing address"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 flex gap-3 mt-3 border-t border-[var(--border-color)] pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:text-[var(--text-primary)] font-bold py-2 rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs cursor-pointer transition-colors"
                >
                  {loading ? 'Processing...' : isEditing ? 'Apply Master Changes' : 'Complete Onboarding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
