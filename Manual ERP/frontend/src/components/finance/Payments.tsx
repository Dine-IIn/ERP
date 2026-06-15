import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../utils/apiService';
import { PaymentSchema } from '../../utils/schemas';
import { Send, Plus, Search, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Payment {
  id: string;
  paymentNo: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  referenceNo?: string;
  bankDetails?: string;
  notes?: string;
  vendor: { name: string };
}

export default function Payments() {
  const queryClient = useQueryClient();

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const res = await apiClient.get<{payments: any[]}>('/api/finance/payments');
      return res.payments || [];
    }
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const res = await apiClient.get<{vendors: any[]}>('/api/inventory/vendors');
      return res.vendors || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/finance/payments', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments'] })
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [vendorId, setVendorId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [referenceNo, setReferenceNo] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [notes, setNotes] = useState('');

  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId || !amount || !paymentMethod) {
      setLocalErr("Vendor, amount, and payment method are required.");
      return;
    }

    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    try {
      const parsed = PaymentSchema.safeParse({
        vendorId,
        amount: parseFloat(amount),
        paymentMethod,
        referenceNo: referenceNo.trim() || null,
        bankDetails: bankDetails.trim() || null,
        notes: notes.trim() || null
      });
      if (!parsed.success) throw new Error(parsed.error.errors[0].message);
      await createMutation.mutateAsync(parsed.data);
      setLocalSuccess("Payment recorded successfully!");
      setTimeout(() => {
        setShowAddModal(false);
        setVendorId('');
        setAmount('');
        setReferenceNo('');
        setBankDetails('');
        setNotes('');
      }, 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to finalize payment.");
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = (payments || []).filter(p => {
    const paymentNo = p?.paymentNo || '';
    const vendorName = p?.vendor?.name || '';
    const referenceNo = p?.referenceNo || '';
    const term = (searchTerm || '').toLowerCase();
    return paymentNo.toLowerCase().includes(term) ||
      vendorName.toLowerCase().includes(term) ||
      referenceNo.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Send className="w-6 h-6 text-indigo-400" />
            Vendor Payments ledger
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Track and dispatch cash / bank transfer payouts to vendors and suppliers.
          </p>
        </div>
        <button
          onClick={() => {
            setLocalErr(null);
            setLocalSuccess(null);
            setShowAddModal(true);
          }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-650 active:scale-95 transition-all text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-5 h-5" />
          Onboard Payment
        </button>
      </div>

      {/* Main Grid */}
      <div className="bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-slate-800/60 bg-slate-950/20">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by Payment No, Vendor, or Reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950/40 border border-slate-850 rounded-xl text-white text-xs outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Payments List */}
        <div className="overflow-x-auto">
          {filteredPayments.length === 0 ? (
            <div className="p-12 text-center text-slate-550 flex flex-col items-center justify-center">
              <Send className="w-12 h-12 text-slate-750 mb-3" />
              <p className="font-semibold text-sm">No payment records logged</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-450 font-semibold uppercase bg-slate-950/40 text-[10px]">
                  <th className="py-3.5 px-5">Payment No</th>
                  <th className="py-3.5 px-5">Vendor Name</th>
                  <th className="py-3.5 px-5">Payment Date</th>
                  <th className="py-3.5 px-5">Method</th>
                  <th className="py-3.5 px-5">Reference No</th>
                  <th className="py-3.5 px-5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/10 transition-colors">
                    <td className="py-3.5 px-5 font-mono font-bold text-white">{p.paymentNo}</td>
                    <td className="py-3.5 px-5 text-slate-200 font-semibold">{p.vendor.name}</td>
                    <td className="py-3.5 px-5 text-slate-400 font-medium">{new Date(p.paymentDate).toISOString().slice(0, 10)}</td>
                    <td className="py-3.5 px-5 font-bold text-indigo-400">{p.paymentMethod}</td>
                    <td className="py-3.5 px-5 font-mono text-slate-350">{p.referenceNo || '-'}</td>
                    <td className="py-3.5 px-5 font-mono text-white text-right font-black text-sm">
                      ${p.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-md font-bold text-white">Log Vendor Payment</h3>
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
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Vendor Partner</label>
                  <select
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm outline-none"
                    required
                  >
                    <option value="">Select Vendor...</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Payout Amount</label>
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
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm outline-none"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CASH">Cash payment</option>
                    <option value="UPI">UPI QR Codes</option>
                    <option value="CHEQUE">Cheque orders</option>
                    <option value="CREDIT_CARD">Credit card</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Transaction Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-99420 (Optional)"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Bank Details Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Paid from HDFC central savings account..."
                  value={bankDetails}
                  onChange={(e) => setBankDetails(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Internal Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Notes detailing outstanding dues reductions..."
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
                  {loading ? 'Finalizing...' : 'Finalize payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
