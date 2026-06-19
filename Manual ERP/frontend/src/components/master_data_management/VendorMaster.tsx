import React, { useState } from 'react';
import { VendorSchema } from '../../utils/schemas';
import { Truck, Search, Plus, Edit, Trash2, X, AlertCircle, Briefcase, CreditCard, ShieldAlert } from 'lucide-react';

interface VendorMasterProps {
  vendors: any[];
  onCreateVendor: (vendor: any) => Promise<void>;
  onUpdateVendor: (id: string, vendor: any) => Promise<void>;
  onDeleteVendor: (id: string) => Promise<void>;
}

export default function VendorMaster({
  vendors,
  onCreateVendor,
  onUpdateVendor,
  onDeleteVendor,
}: VendorMasterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [vendorTypeFilter, setVendorTypeFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    isVendor: true, // true = Vendor, false = Supplier
    contactNo: '',
    email: '',
    paymentTerms: 'IMMEDIATE',
    gstDetails: '',
    gstNumber: '',
    panNumber: '',
    currencySymbol: '$',
    currencyId: 'USD'
  });

  const [bankDetailsForm, setBankDetailsForm] = useState({
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    ifscCode: ''
  });

  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const openAddModal = () => {
    setForm({
      name: '',
      isVendor: true,
      contactNo: '',
      email: '',
      paymentTerms: 'IMMEDIATE',
      gstDetails: '',
      gstNumber: '',
      panNumber: '',
      currencySymbol: '$',
      currencyId: 'USD'
    });
    setBankDetailsForm({
      bankName: '',
      accountHolder: '',
      accountNumber: '',
      ifscCode: ''
    });
    setIsEditing(false);
    setEditingId(null);
    setLocalErr(null);
    setLocalSuccess(null);
    setShowModal(true);
  };

  const openEditModal = (vend: any) => {
    setForm({
      name: vend.name,
      isVendor: vend.isVendor !== undefined ? vend.isVendor : true,
      contactNo: vend.contactNo,
      email: vend.email || '',
      paymentTerms: vend.paymentTerms || 'IMMEDIATE',
      gstDetails: vend.gstDetails || '',
      gstNumber: vend.gstNumber || vend.gstDetails || '',
      panNumber: vend.panNumber || '',
      currencySymbol: vend.currencySymbol || '$',
      currencyId: vend.currencyId || 'USD'
    });

    let parsedBank = { bankName: '', accountHolder: '', accountNumber: '', ifscCode: '' };
    if (vend.bankDetails) {
      try {
        const parsed = JSON.parse(vend.bankDetails);
        parsedBank = {
          bankName: vend.bankName || parsed.bankName || '',
          accountHolder: vend.accountHolderName || parsed.accountHolder || '',
          accountNumber: vend.accountNumber || parsed.accountNumber || '',
          ifscCode: vend.ifscCode || parsed.ifscCode || ''
        };
      } catch {
        parsedBank.bankName = vend.bankName || vend.bankDetails || '';
        parsedBank.accountHolder = vend.accountHolderName || '';
        parsedBank.accountNumber = vend.accountNumber || '';
        parsedBank.ifscCode = vend.ifscCode || '';
      }
    } else {
      parsedBank = {
        bankName: vend.bankName || '',
        accountHolder: vend.accountHolderName || '',
        accountNumber: vend.accountNumber || '',
        ifscCode: vend.ifscCode || ''
      };
    }
    setBankDetailsForm(parsedBank);

    setIsEditing(true);
    setEditingId(vend.id);
    setLocalErr(null);
    setLocalSuccess(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.contactNo) {
      setLocalErr("Vendor Name and Contact Number are required fields.");
      return;
    }

    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    const payload = {
      ...form,
      bankDetails: JSON.stringify({
        bankName: bankDetailsForm.bankName,
        accountHolder: bankDetailsForm.accountHolder,
        accountNumber: bankDetailsForm.accountNumber,
        ifscCode: bankDetailsForm.ifscCode
      }),
      creditTime: 0,
      bankName: bankDetailsForm.bankName,
      accountHolderName: bankDetailsForm.accountHolder,
      accountNumber: bankDetailsForm.accountNumber,
      ifscCode: bankDetailsForm.ifscCode,
      gstDetails: form.gstNumber,
      gstNumber: form.gstNumber,
      panNumber: form.panNumber
    };

      const parsed = VendorSchema.safeParse(payload);
      if (!parsed.success) {
        setLocalErr(parsed.error.issues[0].message);
        setLoading(false);
        return;
      }

      try {
      if (isEditing && editingId) {
        await onUpdateVendor(editingId, payload);
        setLocalSuccess("Vendor/Supplier details updated successfully!");
      } else {
        await onCreateVendor(payload);
        setLocalSuccess("Vendor/Supplier onboarding completed successfully!");
      }
      setTimeout(() => {
        setShowModal(false);
      }, 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to process vendor master entry.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete vendor/supplier record '${name}'?`)) {
      try {
        await onDeleteVendor(id);
      } catch (err: any) {
        alert(err.message || "Failed to delete vendor/supplier");
      }
    }
  };

  const filtered = (vendors || []).filter(v => {
    const name = v?.name || '';
    const contactNo = v?.contactNo || '';
    const email = v?.email || '';
    const gstDetails = v?.gstDetails || '';
    const term = (searchTerm || '').toLowerCase();

    const matchesSearch = name.toLowerCase().includes(term) ||
      contactNo.includes(term) ||
      email.toLowerCase().includes(term) ||
      gstDetails.toLowerCase().includes(term);
    
    const matchesType = vendorTypeFilter === 'ALL' ||
      (vendorTypeFilter === 'VENDOR' && v?.isVendor) ||
      (vendorTypeFilter === 'SUPPLIER' && !v?.isVendor);
      
    return matchesSearch && matchesType;
  });

  return (
    <div className="animate-fade-in flex flex-col gap-4 text-left select-none">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--border-color)] pb-3">
        <div>
          <h3 className="font-bold text-sm text-[var(--text-primary)] font-display flex items-center gap-1.5 uppercase tracking-wide">
            <Truck className="w-4 h-4 text-indigo-400" /> Vendor & Supplier Master
          </h3>
          <p className="text-[var(--text-secondary)] text-[10px] mt-0.5">Administer supply directories, GST registration numbers, structured bank details, and billing policies</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0 font-sans">
          <div className="relative flex-1 md:w-64 w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search by name, phone, email, GSTIN..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
            />
          </div>

          <select
            value={vendorTypeFilter}
            onChange={e => setVendorTypeFilter(e.target.value)}
            className="bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500/50 cursor-pointer w-full sm:w-auto"
          >
            <option value="ALL">All Types</option>
            <option value="VENDOR">Vendors Only</option>
            <option value="SUPPLIER">Suppliers Only</option>
          </select>
          
          <button
            type="button"
            onClick={openAddModal}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1.5 border-0 bg-transparent transition-all shadow-md active:scale-95 shrink-0 w-full sm:w-auto justify-center"
          >
            <Plus className="w-3.5 h-3.5" /> Onboard Supplier
          </button>
        </div>
      </div>

      {/* Vendors list grid */}
      <div className="overflow-x-auto border border-[var(--border-color)] rounded-xl mt-2">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] text-[var(--text-secondary)] font-bold">
              <th className="p-3 text-[10px] uppercase tracking-wider">Vendor/Supplier Name</th>
              <th className="p-3 text-[10px] uppercase tracking-wider">Classification type</th>
              <th className="p-3 text-[10px] uppercase tracking-wider">Contact Info</th>
              <th className="p-3 text-[10px] uppercase tracking-wider">GSTIN / Payment terms</th>
              <th className="p-3 text-[10px] uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(v => (
              <tr key={v.id} className="border-b border-[var(--border-color)]/40 hover:bg-[var(--bg-tertiary)]/20 transition-colors last:border-b-0 text-left">
                <td className="p-3 shrink-0">
                  <span className="font-bold text-[var(--text-primary)] block">{v.name}</span>
                  <span className="text-[10px] text-[var(--text-muted)] block mt-0.5 truncate max-w-xs">
                    {v.bankName ? `Bank: ${v.bankName}, A/C: ${v.accountNumber || 'N/A'}` : v.bankDetails ? (() => {
                      try {
                        const b = JSON.parse(v.bankDetails);
                        if (!b.bankName && !b.accountNumber) return 'No bank details registered';
                        return `Bank: ${b.bankName || 'N/A'}, A/C: ${b.accountNumber || 'N/A'}, IFSC: ${b.ifscCode || 'N/A'}`;
                      } catch {
                        return `Bank: ${v.bankDetails}`;
                      }
                    })() : 'No bank details registered'}
                  </span>
                </td>
                <td className="p-3 shrink-0">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold tracking-wider inline-block uppercase ${
                    v.isVendor ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {v.isVendor ? 'VENDOR' : 'SUPPLIER'}
                  </span>
                </td>
                <td className="p-3 shrink-0 font-mono">
                  <span className="text-[var(--text-primary)] block">{v.contactNo}</span>
                  <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">{v.email || 'No email id'}</span>
                </td>
                <td className="p-3 shrink-0">
                  <span className="text-[var(--text-primary)] font-bold font-mono block">
                    GSTIN: {v.gstNumber || v.gstDetails || 'UNREGISTERED'}
                  </span>
                  {v.panNumber && (
                    <span className="text-[10px] text-indigo-400 font-mono block mt-0.5">
                      PAN: {v.panNumber}
                    </span>
                  )}
                  <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5 font-mono uppercase">
                    Terms: {v.paymentTerms ? v.paymentTerms.replace('_', ' ') : 'IMMEDIATE'} | Currency: {v.currencyId || 'USD'} ({v.currencySymbol || '$'})
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(v)}
                      className="px-2 py-1 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded transition-all cursor-pointer border-0 bg-transparent flex items-center gap-1 text-[9px] uppercase font-bold"
                      title="Edit Master Settings"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(v.id, v.name)}
                      className="px-2 py-1 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded transition-all cursor-pointer border-0 bg-transparent flex items-center gap-1 text-[9px] uppercase font-bold"
                      title="Delete Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-[var(--text-muted)] italic">No vendor or supplier accounts onboarded yet</td>
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
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)] font-display">
                  {isEditing ? 'Modify Supplier Record' : 'Onboard Supplier / Vendor'}
                </h3>
                <p className="text-[var(--text-secondary)] text-[10px]">Setup detailed banking credentials, GST registration, and payment terms</p>
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

              {/* Vendor Name */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Company / Supplier Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                  placeholder="e.g. Sterling Industries"
                />
              </div>

              {/* isVendor Category Selection */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Master Classification type</label>
                <select
                  value={form.isVendor ? 'true' : 'false'}
                  onChange={e => setForm({ ...form, isVendor: e.target.value === 'true' })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                >
                  <option value="true">VENDOR (Procures/Processes Services)</option>
                  <option value="false">SUPPLIER (Supplies Raw Goods/Stocks)</option>
                </select>
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
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Mail ID (Optional)</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                  placeholder="e.g. sales@sterling.com"
                />
              </div>

              {/* GSTIN Details */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">GSTIN Number (GST Details)</label>
                <input
                  type="text"
                  value={form.gstNumber}
                  onChange={e => setForm({ ...form, gstNumber: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono uppercase"
                  placeholder="e.g. 24AAAAA1111A1Z1"
                />
              </div>

              {/* PAN Number */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">PAN Number (Optional)</label>
                <input
                  type="text"
                  value={form.panNumber}
                  onChange={e => setForm({ ...form, panNumber: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono uppercase"
                  placeholder="e.g. ABCDE1234F"
                />
              </div>

              {/* Payment Terms Select */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Agreed Payment Terms</label>
                <select
                  value={form.paymentTerms}
                  onChange={e => setForm({ ...form, paymentTerms: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                >
                  <option value="IMMEDIATE">IMMEDIATE (Due on Receipt)</option>
                  <option value="NET_15">NET 15 (Due within 15 days)</option>
                  <option value="NET_30">NET 30 (Due within 30 days)</option>
                  <option value="NET_60">NET 60 (Due within 60 days)</option>
                </select>
              </div>

              {/* Preferred Currency Select */}
              <div>
                <label className="text-[9px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block mb-1">Preferred Currency</label>
                <select
                  value={`${form.currencyId}:${form.currencySymbol}`}
                  onChange={e => {
                    const [id, symbol] = e.target.value.split(':');
                    setForm({ ...form, currencyId: id, currencySymbol: symbol });
                  }}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-indigo-500/50 py-2 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                >
                  <option value="USD:$">USD ($)</option>
                  <option value="INR:₹">INR (₹)</option>
                  <option value="EUR:€">EUR (€)</option>
                  <option value="GBP:£">GBP (£)</option>
                </select>
              </div>

              {/* Bank Details Structured Form */}
              <div className="md:col-span-2 border-t border-[var(--border-color)] pt-3 flex flex-col gap-3">
                <label className="text-[9px] font-bold text-indigo-400 tracking-wider uppercase block mb-0.5 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5" /> Corporate Bank Particulars
                </label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[8px] font-bold text-[var(--text-secondary)] block mb-1 uppercase">Bank Name</label>
                    <input
                      type="text"
                      value={bankDetailsForm.bankName}
                      onChange={e => setBankDetailsForm({ ...bankDetailsForm, bankName: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                      placeholder="e.g. HDFC Bank"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-[var(--text-secondary)] block mb-1 uppercase">Account Holder Name</label>
                    <input
                      type="text"
                      value={bankDetailsForm.accountHolder}
                      onChange={e => setBankDetailsForm({ ...bankDetailsForm, accountHolder: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
                      placeholder="e.g. Sterling Acc"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-[var(--text-secondary)] block mb-1 uppercase">Account Number</label>
                    <input
                      type="text"
                      value={bankDetailsForm.accountNumber}
                      onChange={e => setBankDetailsForm({ ...bankDetailsForm, accountNumber: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono"
                      placeholder="e.g. 50100XXXXXXXXX"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-[var(--text-secondary)] block mb-1 uppercase">IFSC Code / Branch Routing</label>
                    <input
                      type="text"
                      value={bankDetailsForm.ifscCode}
                      onChange={e => setBankDetailsForm({ ...bankDetailsForm, ifscCode: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] py-1.5 px-3 rounded-lg text-xs text-[var(--text-primary)] focus:outline-none font-mono uppercase"
                      placeholder="e.g. HDFC000XXXX"
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
