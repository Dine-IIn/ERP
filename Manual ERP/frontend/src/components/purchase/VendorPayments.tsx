import React, { useState } from 'react';
import { DollarSign, Search, Plus, Trash2, X, AlertCircle, CheckCircle2, CreditCard, Banknote } from 'lucide-react';

interface VendorPayment {
  id: string;
  paymentNo: string;
  vendorId: string;
  vendor: { id: string; name: string };
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  referenceNo?: string;
  bankDetails?: string;
  status: string;
  notes?: string;
}

interface VendorPaymentsProps {
  payments: VendorPayment[];
  vendors: any[];
  onCreatePayment: (payload: any) => Promise<void>;
  onDeletePayment: (id: string) => Promise<void>;
  currencySymbol?: string;
}

export default function VendorPayments({
  payments,
  vendors,
  onCreatePayment,
  onDeletePayment,
  currencySymbol = '$'
}: VendorPaymentsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [vendorId, setVendorId] = useState('');
  const [paymentNo, setPaymentNo] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [referenceNo, setReferenceNo] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [status, setStatus] = useState('COMPLETED');
  const [notes, setNotes] = useState('');

  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const openAddModal = () => {
    setVendorId(vendors[0]?.id || '');
    setPaymentNo(`PAY-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`);
    setPaymentDate(new Date().toISOString().substring(0, 10));
    setAmount('');
    setPaymentMethod('BANK_TRANSFER');
    setReferenceNo('');
    setBankDetails('');
    setStatus('COMPLETED');
    setNotes('');
    setLocalErr(null);
    setLocalSuccess(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId || !paymentNo.trim() || !amount.trim() || !paymentMethod) {
      setLocalErr("Vendor reference, payment number, payout amount, and payment method are required.");
      return;
    }

    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    const payload = {
      vendorId,
      paymentNo: paymentNo.trim(),
      paymentDate: paymentDate || null,
      amount: parseFloat(amount) || 0.0,
      paymentMethod,
      referenceNo: referenceNo.trim() || null,
      bankDetails: bankDetails.trim() || null,
      status,
      notes: notes.trim() || null
    };

    try {
      await onCreatePayment(payload);
      setLocalSuccess("Vendor payout voucher registered successfully!");
      setTimeout(() => {
        setShowModal(false);
      }, 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to log payment voucher.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, payNo: string) => {
    if (window.confirm(`Are you sure you want to permanently cancel and delete payout voucher '${payNo}'?`)) {
      try {
        await onDeletePayment(id);
      } catch (err: any) {
        alert(err.message || "Failed to delete payment.");
      }
    }
  };

  const filteredPayments = (payments || []).filter(p => {
    const paymentNo = p?.paymentNo || '';
    const vendorName = p?.vendor?.name || '';
    const term = (searchTerm || '').toLowerCase();
    return paymentNo.toLowerCase().includes(term) ||
      vendorName.toLowerCase().includes(term);
  });

  const getMethodStyle = (m: string) => {
    switch (m) {
      case 'BANK_TRANSFER': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'UPI': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'CREDIT_CARD': return 'bg-indigo-500/10 text-indigo-455 border-indigo-500/20';
      case 'CASH': return 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20';
      default: return 'bg-slate-800 border-slate-700 text-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Banknote className="w-6 h-6 text-emerald-450" />
            Vendor Payment Vouchers
          </h1>
          <p className="text-slate-400 text-sm mt-1">Record supplier bank wire transfers, UPI codes, and cash payouts to keep corporate payables balanced.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-5 h-5" />
          Log Payment Voucher
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
              placeholder="Search payments by no or vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/40 border border-slate-850/60 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-white text-sm outline-none transition-all"
            />
          </div>
        </div>

        {/* Table/List */}
        <div className="overflow-x-auto">
          {filteredPayments.length === 0 ? (
            <div className="p-12 text-center">
              <Banknote className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No vendor payments recorded</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium uppercase tracking-wider text-xs bg-slate-950/40">
                  <th className="py-4 px-6">Payment Voucher No</th>
                  <th className="py-4 px-6">Vendor Supplier</th>
                  <th className="py-4 px-6">Payment Date</th>
                  <th className="py-4 px-6">Payout Amount</th>
                  <th className="py-4 px-6">Transfer Mode</th>
                  <th className="py-4 px-6">Bank References</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 px-6 font-bold text-white font-mono">{p.paymentNo}</td>
                    <td className="py-4 px-6 font-semibold text-slate-200">{p.vendor.name}</td>
                    <td className="py-4 px-6 font-mono text-slate-350">{new Date(p.paymentDate).toLocaleDateString()}</td>
                    <td className="py-4 px-6 font-mono text-emerald-400 text-base font-bold">
                      {currencySymbol}{p.amount.toLocaleString()}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getMethodStyle(p.paymentMethod)}`}>
                        {p.paymentMethod.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-slate-400 space-y-0.5">
                      {p.referenceNo && <div>Ref: {p.referenceNo}</div>}
                      {p.bankDetails && <div className="text-slate-550 line-clamp-1">{p.bankDetails}</div>}
                      {!p.referenceNo && !p.bankDetails && <span className="text-slate-650 italic">None</span>}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleDelete(p.id, p.paymentNo)}
                        className="p-1.5 hover:bg-slate-850 text-slate-550 hover:text-red-400 transition-colors rounded-lg"
                        title="Void payment voucher"
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
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transform transition-all max-h-[90vh] flex flex-col animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-455" />
                Record Vendor Payout Voucher
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
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
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Vendor Recipient</label>
                <select
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500 transition-all text-sm"
                  required
                >
                  <option value="" disabled>Select sourcing vendor</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Payment Voucher No</label>
                  <input
                    type="text"
                    value={paymentNo}
                    onChange={(e) => setPaymentNo(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500 transition-all text-sm font-mono font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Payment Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500 transition-all text-sm font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Paid Amount ({currencySymbol})</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500 transition-all text-sm font-mono font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500 transition-all text-sm font-semibold"
                  >
                    <option value="BANK_TRANSFER">BANK WIRE TRANSFER</option>
                    <option value="UPI">UPI CODE</option>
                    <option value="CREDIT_CARD">CREDIT CARD</option>
                    <option value="CHEQUE">CHEQUE VOUCHER</option>
                    <option value="CASH">PETTY CASH</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Bank Transaction Reference No</label>
                <input
                  type="text"
                  placeholder="e.g. UTR / IMPS Code"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500 transition-all text-sm font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Source Bank / Account Details</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Current A/c - 501..."
                  value={bankDetails}
                  onChange={(e) => setBankDetails(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500 transition-all text-sm font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Internal Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Additional notes for bookkeeping..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500 transition-all text-sm resize-none"
                />
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
                  {loading ? 'Processing...' : 'Confirm Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
