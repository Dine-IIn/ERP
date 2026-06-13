import React, { useState } from 'react';
import { Download, Plus, Search, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Receipt {
  id: string;
  amount: number;
  payerName: string;
  category: string;
  date: string;
  paymentMethod: string;
  referenceNo?: string;
  notes?: string;
  createdAt: string;
}

interface ReceiptsProps {
  receipts: Receipt[];
  onAddReceipt: (data: any) => Promise<void>;
  currencySymbol?: string;
}

export default function Receipts({
  receipts,
  onAddReceipt,
  currencySymbol = '$'
}: ReceiptsProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [payerName, setPayerName] = useState('');
  const [category, setCategory] = useState('SALES_REVENUE');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');

  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !payerName.trim() || !category || !paymentMethod) {
      setLocalErr("Amount, payer name, category, and payment method are required.");
      return;
    }

    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    try {
      await onAddReceipt({
        amount: parseFloat(amount),
        payerName: payerName.trim(),
        category,
        paymentMethod,
        referenceNo: referenceNo.trim() || null,
        notes: notes.trim() || null
      });
      setLocalSuccess("Receipt recorded successfully!");
      setTimeout(() => {
        setShowAddModal(false);
        setPayerName('');
        setAmount('');
        setReferenceNo('');
        setNotes('');
      }, 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to log receipt.");
    } finally {
      setLoading(false);
    }
  };

  const filteredReceipts = (receipts || []).filter(r => {
    const payerName = r?.payerName || '';
    const category = r?.category || '';
    const referenceNo = r?.referenceNo || '';
    const term = (searchTerm || '').toLowerCase();
    return payerName.toLowerCase().includes(term) ||
      category.toLowerCase().includes(term) ||
      referenceNo.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Download className="w-6 h-6 text-indigo-400" />
            Revenue Inflow Receipts
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Log collections, customer revenue receipts, asset liquidation collections, and miscellaneous inwards.
          </p>
        </div>
        <button
          onClick={() => {
            setLocalErr(null);
            setLocalSuccess(null);
            setShowAddModal(true);
          }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 active:scale-95 transition-all text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-5 h-5" />
          Log Receipt Voucher
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-slate-800/60 bg-slate-950/20">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by payer, category, or reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950/40 border border-slate-850 rounded-xl text-white text-xs outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Table list */}
        <div className="overflow-x-auto">
          {filteredReceipts.length === 0 ? (
            <div className="p-12 text-center text-slate-550 flex flex-col items-center justify-center">
              <Download className="w-12 h-12 text-slate-750 mb-3" />
              <p className="font-semibold text-sm">No receipt logs registered</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-450 font-semibold uppercase bg-slate-950/40 text-[10px]">
                  <th className="py-3.5 px-5">Payer name</th>
                  <th className="py-3.5 px-5">Category Scope</th>
                  <th className="py-3.5 px-5">Inflow Date</th>
                  <th className="py-3.5 px-5">Method</th>
                  <th className="py-3.5 px-5">Reference No</th>
                  <th className="py-3.5 px-5 text-right">Inflow Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredReceipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/10 transition-colors">
                    <td className="py-3.5 px-5 text-slate-200 font-bold text-sm">{r.payerName}</td>
                    <td className="py-3.5 px-5">
                      <span className="px-2.5 py-0.5 rounded-full border text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                        {r.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-400 font-medium">{new Date(r.date).toISOString().slice(0, 10)}</td>
                    <td className="py-3.5 px-5 font-bold text-indigo-400">{r.paymentMethod}</td>
                    <td className="py-3.5 px-5 font-mono text-slate-350 font-semibold">{r.referenceNo || '-'}</td>
                    <td className="py-3.5 px-5 font-mono text-emerald-400 text-right font-black text-sm">
                      +{currencySymbol}{r.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Receipt Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-md font-bold text-white">Log Receipt Voucher</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="p-6 space-y-4">
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Payer Name / Customer</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe Corporation"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Inflow Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm outline-none font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Receipt Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm outline-none"
                  >
                    <option value="SALES_REVENUE">Sales revenues</option>
                    <option value="ASSET_SALE">Fixed asset liquidation</option>
                    <option value="INTEREST_INCOME">Bank interest received</option>
                    <option value="OTHER_INCOME">Other miscellaneous inwards</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Receipt Mode</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm outline-none"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CASH">Cash collection</option>
                    <option value="UPI">UPI scan codes</option>
                    <option value="CREDIT_CARD">Credit card</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Reference Transaction No</label>
                <input
                  type="text"
                  placeholder="e.g. TXN-190321 (Optional)"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Remarks / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Notes detailing non-sales collection inputs..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-xs outline-none resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-950/20 -mx-6 -mb-6 p-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4.5 py-2 text-slate-400 hover:text-white transition-all text-sm font-semibold hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white transition-all text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20"
                >
                  {loading ? 'Logging...' : 'Confirm inflow'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
