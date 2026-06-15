import React, { useState } from 'react';
import { Search, Plus, Trash2, X, AlertCircle, FileText, CheckCircle2, Download, RefreshCw } from 'lucide-react';
import { CreateVendorQuotationBodySchema } from '../../utils/schemas';

interface VendorQuotationItem {
  id?: string;
  productId: string;
  quantity: number;
  price: number;
  product?: { name: string; uom: string };
}

interface VendorQuotation {
  id: string;
  quoteNo: string;
  vendorId: string;
  vendor: { id: string; name: string };
  date: string;
  validUntil?: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  items: VendorQuotationItem[];
}

interface VendorQuotationsProps {
  quotations: VendorQuotation[];
  vendors: any[];
  products: any[];
  onCreateQuotation: (payload: any) => Promise<void>;
  onUpdateQuotationStatus: (id: string, payload: { status: string }) => Promise<void>;
  onDeleteQuotation: (id: string) => Promise<void>;
  currencySymbol?: string;
}

interface ItemInput {
  productId: string;
  quantity: string;
  price: string;
}

export default function VendorQuotations({
  quotations,
  vendors,
  products,
  onCreateQuotation,
  onUpdateQuotationStatus,
  onDeleteQuotation,
  currencySymbol = '$'
}: VendorQuotationsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [vendorId, setVendorId] = useState('');
  const [quoteNo, setQuoteNo] = useState('');
  const [date, setDate] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [taxPercent, setTaxPercent] = useState('18.00'); // GST rate
  const [status, setStatus] = useState('PENDING');

  const [items, setItems] = useState<ItemInput[]>([]);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const openAddModal = () => {
    setVendorId(vendors[0]?.id || '');
    setQuoteNo('');
    setDate(new Date().toISOString().substring(0, 10));
    setValidUntil('');
    setTaxPercent('18.00');
    setStatus('PENDING');
    setItems([{ productId: products[0]?.id || '', quantity: '1', price: String(products[0]?.pricing || 0) }]);
    setLocalErr(null);
    setLocalSuccess(null);
    setShowModal(true);
  };

  const addItemRow = () => {
    setItems([...items, { productId: products[0]?.id || '', quantity: '1', price: String(products[0]?.pricing || 0) }]);
  };

  const removeItemRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof ItemInput, value: string) => {
    const updated = [...items];
    updated[index][field] = value;

    if (field === 'productId') {
      const prod = products.find(p => p.id === value);
      if (prod) {
        updated[index].price = String(prod.pricing || 0);
      }
    }
    setItems(updated);
  };

  const subtotalVal = items.reduce((sum, item) => {
    const q = parseFloat(item.quantity) || 0;
    const p = parseFloat(item.price) || 0;
    return sum + (q * p);
  }, 0);

  const taxVal = subtotalVal * ((parseFloat(taxPercent) || 0) / 100);
  const totalVal = subtotalVal + taxVal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId || !quoteNo.trim() || items.length === 0) {
      setLocalErr("Vendor partner, quotation number, and at least one item are required.");
      return;
    }

    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    const payload = {
      vendorId,
      quoteNo: quoteNo.trim(),
      date: date || null,
      validUntil: validUntil || null,
      subtotal: subtotalVal,
      tax: taxVal,
      total: totalVal,
      status,
      items: items.map(it => ({
        productId: it.productId,
        quantity: parseFloat(it.quantity) || 1.0,
        price: parseFloat(it.price) || 0.0
      }))
    };

    const parsed = CreateVendorQuotationBodySchema.safeParse(payload);
    if (!parsed.success) {
      setLocalErr("Validation error: " + parsed.error.errors[0].message);
      setLoading(false);
      return;
    }

    try {
      await onCreateQuotation(payload);
      setLocalSuccess("Supplier price bid registered successfully!");
      setTimeout(() => {
        setShowModal(false);
      }, 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to log supplier quotation sheet.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, s: string) => {
    try {
      await onUpdateQuotationStatus(id, { status: s });
    } catch (err: any) {
      alert(err.message || "Failed to update status.");
    }
  };

  const handleDelete = async (id: string, quoteNo: string) => {
    if (window.confirm(`Are you sure you want to permanently discard Supplier Quotation '${quoteNo}'?`)) {
      try {
        await onDeleteQuotation(id);
      } catch (err: any) {
        alert(err.message || "Failed to delete quote.");
      }
    }
  };

  const filteredQuotes = (quotations || []).filter(q => {
    const quoteNo = q?.quoteNo || '';
    const vendorName = q?.vendor?.name || '';
    const term = (searchTerm || '').toLowerCase();
    return quoteNo.toLowerCase().includes(term) ||
      vendorName.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-400" />
            Vendor Price Quotations
          </h1>
          <p className="text-slate-400 text-sm mt-1">Record and review competitive pricing bids submitted by raw suppliers to select optimal purchase lines.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-550 hover:bg-amber-600 active:scale-95 transition-all text-white font-semibold rounded-xl shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-5 h-5" />
          Log Supplier Quote
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
              placeholder="Search quotes by number or supplier name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/40 border border-slate-850/60 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-white text-sm outline-none transition-all"
            />
          </div>
        </div>

        {/* Table/List */}
        <div className="overflow-x-auto">
          {filteredQuotes.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No vendor quotations recorded</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium uppercase tracking-wider text-xs bg-slate-950/40">
                  <th className="py-4 px-6">Supplier Quote No</th>
                  <th className="py-4 px-6">Vendor Sourcing Partner</th>
                  <th className="py-4 px-6">Quote Date</th>
                  <th className="py-4 px-6">Valid Till</th>
                  <th className="py-4 px-6">Total Value</th>
                  <th className="py-4 px-6">Bid Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredQuotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 px-6 font-bold text-white font-mono">{q.quoteNo}</td>
                    <td className="py-4 px-6 font-semibold text-slate-200">{q.vendor.name}</td>
                    <td className="py-4 px-6 font-mono text-slate-350">{new Date(q.date).toLocaleDateString()}</td>
                    <td className="py-4 px-6 font-mono text-slate-400">
                      {q.validUntil ? new Date(q.validUntil).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-4 px-6 font-mono text-emerald-400 text-base font-bold">
                      {currencySymbol}{q.total.toLocaleString()}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                        q.status === 'ACCEPTED' ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' :
                        q.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-slate-800 border-slate-700 text-slate-400'
                      }`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      {q.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleToggleStatus(q.id, 'ACCEPTED')}
                            className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg transition-all"
                          >
                            Accept Bid
                          </button>
                          <button
                            onClick={() => handleToggleStatus(q.id, 'REJECTED')}
                            className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-450 text-xs font-bold rounded-lg transition-all"
                          >
                            Decline
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(q.id, q.quoteNo)}
                        className="p-1.5 hover:bg-slate-850 text-slate-550 hover:text-red-400 transition-colors rounded-lg"
                        title="Delete price bid sheet"
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

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transform transition-all max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-lg font-bold text-white">Log Supplier Competitive Price Quote</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
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

              {/* Master Selections */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Vendor Partner</label>
                  <select
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-amber-500 transition-all text-sm"
                    required
                  >
                    <option value="" disabled>Select supplier vendor</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Quote Document No</label>
                  <input
                    type="text"
                    placeholder="e.g. VEN-QT-82"
                    value={quoteNo}
                    onChange={(e) => setQuoteNo(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-amber-500 transition-all text-sm font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Quote Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-amber-500 transition-all text-sm font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Validity Expiry Date</label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-amber-500 transition-all text-sm font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Bid Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-amber-500 transition-all text-sm"
                  >
                    <option value="PENDING">PENDING REVIEW</option>
                    <option value="ACCEPTED">ACCEPTED BID</option>
                    <option value="REJECTED">DECLINED</option>
                  </select>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-sm font-bold text-slate-200">Quote Line Items Checklist</h4>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-xs text-amber-400 font-semibold rounded-lg border border-slate-700 transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Insert Quote Line
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-center bg-slate-950/20 p-3 rounded-xl border border-slate-800/40 animate-fadeIn">
                      <div className="col-span-5 space-y-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Product Catalog</label>
                        <select
                          value={item.productId}
                          onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs outline-none focus:border-amber-500"
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-3 space-y-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Supplier price cost ({currencySymbol})</label>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs font-mono outline-none focus:border-amber-500"
                          required
                        />
                      </div>

                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Supply volume</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs font-mono outline-none focus:border-amber-500"
                          required
                        />
                      </div>

                      <div className="col-span-2 flex items-center justify-between pt-4">
                        <span className="font-mono text-xs font-bold text-slate-400">
                          {currencySymbol}
                          {((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            className="p-1 hover:bg-slate-800 text-red-500/80 hover:text-red-400 rounded transition-all ml-2"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end pt-4 border-t border-slate-800">
                <div className="w-64 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Gross subtotal:</span>
                    <span>{currencySymbol}{subtotalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 items-center gap-2">
                    <span>Sourcing tax rate (%):</span>
                    <input
                      type="number"
                      value={taxPercent}
                      onChange={(e) => setTaxPercent(e.target.value)}
                      className="w-16 bg-slate-950 border border-slate-850 px-1.5 py-0.5 rounded text-right text-slate-350"
                    />
                  </div>
                  <div className="flex justify-between text-slate-400 border-b border-slate-850 pb-2">
                    <span>Tax Bracket amount:</span>
                    <span>{currencySymbol}{taxVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-white text-sm font-bold pt-1.5">
                    <span>Total Bid value:</span>
                    <span className="text-amber-400">{currencySymbol}{totalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
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
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white transition-all text-sm font-bold rounded-xl shadow-lg shadow-amber-500/20"
                >
                  {loading ? 'Processing...' : 'Register price bid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
