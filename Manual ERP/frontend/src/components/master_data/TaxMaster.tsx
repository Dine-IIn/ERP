import React, { useState } from 'react';
import { Percent, Search, Plus, Edit, Trash2, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Tax {
  id: string;
  name: string;
  rate: number;
  type: string;
  isDefault: boolean;
}

interface TaxMasterProps {
  taxes: Tax[];
  onCreateTax: (tax: any) => Promise<void>;
  onUpdateTax: (id: string, tax: any) => Promise<void>;
  onDeleteTax: (id: string) => Promise<void>;
}

export default function TaxMaster({
  taxes,
  onCreateTax,
  onUpdateTax,
  onDeleteTax
}: TaxMasterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [rate, setRate] = useState('0.00');
  const [type, setType] = useState('GST');
  const [isDefault, setIsDefault] = useState(false);

  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const openAddModal = () => {
    setName('');
    setRate('0.00');
    setType('GST');
    setIsDefault(false);
    setIsEditing(false);
    setEditingId(null);
    setLocalErr(null);
    setLocalSuccess(null);
    setShowModal(true);
  };

  const openEditModal = (tax: Tax) => {
    setName(tax.name);
    setRate(String(tax.rate));
    setType(tax.type);
    setIsDefault(tax.isDefault);
    setIsEditing(true);
    setEditingId(tax.id);
    setLocalErr(null);
    setLocalSuccess(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !type) {
      setLocalErr("Tax Scheme name and type are required.");
      return;
    }

    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    const payload = {
      name: name.trim(),
      rate: parseFloat(rate) || 0.0,
      type,
      isDefault
    };

    try {
      if (isEditing && editingId) {
        await onUpdateTax(editingId, payload);
        setLocalSuccess("Tax configuration successfully updated!");
      } else {
        await onCreateTax(payload);
        setLocalSuccess("Tax scheme created and registered successfully!");
      }
      setTimeout(() => {
        setShowModal(false);
      }, 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to process tax master configuration.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete Tax Scheme '${name}'?`)) {
      try {
        await onDeleteTax(id);
      } catch (err: any) {
        alert(err.message || "Failed to delete tax configuration.");
      }
    }
  };

  const filteredTaxes = taxes.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Percent className="w-6 h-6 text-emerald-400" />
            Tax Master Data
          </h1>
          <p className="text-slate-400 text-sm mt-1">Configure corporate tax brackets, GST, VAT, and default transaction tax rates.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-5 h-5" />
          Add Tax Configuration
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
              placeholder="Search tax rules or types..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/40 border border-slate-850/60 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-white text-sm outline-none transition-all"
            />
          </div>
        </div>

        {/* Table/List */}
        <div className="overflow-x-auto">
          {filteredTaxes.length === 0 ? (
            <div className="p-12 text-center">
              <Percent className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No tax brackets found</p>
              <p className="text-slate-600 text-xs mt-1">Add a tax setting to assign to products and invoices.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium uppercase tracking-wider text-xs bg-slate-950/40">
                  <th className="py-4 px-6">Tax Code / Name</th>
                  <th className="py-4 px-6">Tax Type</th>
                  <th className="py-4 px-6">Tax Rate (%)</th>
                  <th className="py-4 px-6">Status / Default</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTaxes.map((tax) => (
                  <tr key={tax.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 px-6 font-semibold text-white">{tax.name}</td>
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 text-xs rounded-full bg-slate-850 text-slate-300 font-medium border border-slate-800">
                        {tax.type}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono text-emerald-400 text-base">{tax.rate}%</td>
                    <td className="py-4 px-6">
                      {tax.isDefault ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Active Default
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-850 text-slate-500 border border-slate-800">
                          Standard
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(tax)}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors rounded-lg"
                        title="Edit tax profile"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(tax.id, tax.name)}
                        className="p-1.5 hover:bg-slate-850 text-slate-550 hover:text-red-400 transition-colors rounded-lg"
                        title="Delete tax profile"
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
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transform transition-all">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-lg font-bold text-white">
                {isEditing ? 'Modify Tax Bracket' : 'Register New Tax Bracket'}
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

              <div className="space-y-1">
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Tax Code / Name</label>
                <input
                  type="text"
                  placeholder="e.g. GST 18%, VAT 5%"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500 transition-all text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Tax Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500 transition-all text-sm"
                  >
                    <option value="GST">GST</option>
                    <option value="VAT">VAT</option>
                    <option value="SALES_TAX">Sales Tax</option>
                    <option value="SERVICE_TAX">Service Tax</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500 transition-all text-sm font-mono"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4.5 h-4.5 accent-emerald-500 rounded border-slate-800 focus:ring-0 focus:ring-offset-0 bg-slate-950"
                />
                <label htmlFor="isDefault" className="text-slate-300 text-sm font-medium cursor-pointer selection:bg-transparent">
                  Set as Default corporate tax bracket
                </label>
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
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white transition-all text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/20"
                >
                  {loading ? 'Processing...' : isEditing ? 'Save Changes' : 'Confirm & Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
