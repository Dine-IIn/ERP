import React, { useState } from 'react';
import { CreditCard, Plus, Search, Filter, X, AlertCircle, CheckCircle2, DollarSign, RefreshCw } from 'lucide-react';

interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  paidBy?: { username: string };
  referenceNo?: string;
  createdAt: string;
}

interface ExpensesProps {
  expenses: Expense[];
  onAddExpense: (data: any) => Promise<void>;
  currencySymbol?: string;
}

export default function Expenses({
  expenses,
  onAddExpense,
  currencySymbol = '$'
}: ExpensesProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('OFFICE');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [syncToCashbook, setSyncToCashbook] = useState(true);
  const [referenceNo, setReferenceNo] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [loading, setLoading] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description.trim() || !category) {
      setLocalErr("Amount, description, and category are required.");
      return;
    }

    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    try {
      await onAddExpense({
        amount: parseFloat(amount),
        description: description.trim(),
        category,
        date: date || new Date().toISOString(),
        syncToCashbook,
        referenceNo: referenceNo.trim() || null
      });
      setLocalSuccess("Expense successfully recorded!");
      setTimeout(() => {
        setShowAddModal(false);
        setAmount('');
        setDescription('');
        setCategory('OFFICE');
        setReferenceNo('');
        setSyncToCashbook(true);
      }, 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to record expense.");
    } finally {
      setLoading(false);
    }
  };

  const filteredExpenses = (expenses || []).filter(exp => {
    const description = exp?.description || '';
    const category = exp?.category || '';
    const referenceNo = exp?.referenceNo || '';
    const term = (searchTerm || '').toLowerCase();
    const matchesSearch = description.toLowerCase().includes(term) ||
      category.toLowerCase().includes(term) ||
      referenceNo.toLowerCase().includes(term);
    
    const matchesCategory = categoryFilter === '' || exp.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Calculate stats
  const totalExpenseSum = filteredExpenses.reduce((sum, e) => sum + e.amount, 0.0);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'TRAVEL': return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
      case 'MARKETING': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'LOGISTICS': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'SALARY': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'OFFICE': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-indigo-400" />
            Central Expenses Book
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Log and categorize corporate office expenses, payments, and synchronize entries to cashbook journals.
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
          Onboard Expense
        </button>
      </div>

      {/* Stats and filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="p-5 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Total Expenses Sum</span>
            <h3 className="text-2xl font-black text-white font-mono">{currencySymbol}{totalExpenseSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/15">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Search */}
        <div className="md:col-span-2 p-5 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search description, reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950/40 border border-slate-850 rounded-xl text-white text-xs outline-none focus:border-indigo-500"
            />
          </div>

          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950/40 border border-slate-850 rounded-xl text-white text-xs outline-none focus:border-indigo-500"
            >
              <option value="">All categories</option>
              <option value="OFFICE">Office supplies</option>
              <option value="TRAVEL">Corporate Travel</option>
              <option value="MARKETING">Marketing & ADS</option>
              <option value="LOGISTICS">Logistics supply</option>
              <option value="SALARY">Salary wages</option>
              <option value="OTHER">Other scopes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expenses Ledger Table */}
      <div className="bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          {filteredExpenses.length === 0 ? (
            <div className="p-12 text-center text-slate-550 flex flex-col items-center justify-center">
              <CreditCard className="w-12 h-12 text-slate-750 mb-3" />
              <p className="font-semibold text-sm">No corporate expenses recorded</p>
              <p className="text-slate-650 text-xs mt-1">Press 'Onboard Expense' to log new vouchers.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-450 font-semibold uppercase bg-slate-950/40 text-[10px]">
                  <th className="py-3.5 px-5">Description</th>
                  <th className="py-3.5 px-5">Category</th>
                  <th className="py-3.5 px-5">Log Date</th>
                  <th className="py-3.5 px-5">Reference No</th>
                  <th className="py-3.5 px-5">Paid By</th>
                  <th className="py-3.5 px-5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-800/10 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-slate-200">{exp.description}</td>
                    <td className="py-3.5 px-5">
                      <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${getCategoryColor(exp.category)}`}>
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-medium text-slate-400">{new Date(exp.date).toISOString().slice(0, 10)}</td>
                    <td className="py-3.5 px-5 font-mono text-slate-350 font-semibold">
                      {exp.referenceNo || <span className="text-slate-650 italic text-[11px]">Direct Log</span>}
                    </td>
                    <td className="py-3.5 px-5 text-slate-300 font-medium">{exp.paidBy?.username || 'System'}</td>
                    <td className="py-3.5 px-5 font-mono text-white text-right font-black text-sm">
                      {currencySymbol}{exp.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-md font-bold text-white flex items-center gap-1.5">Log Expense Voucher</h3>
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
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Expense Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm outline-none font-mono focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Expense Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="OFFICE">Office supplies</option>
                    <option value="TRAVEL">Corporate Travel</option>
                    <option value="MARKETING">Marketing & ADS</option>
                    <option value="LOGISTICS">Logistics supply</option>
                    <option value="SALARY">Salary wages</option>
                    <option value="OTHER">Other scopes</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Log Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Reference No</label>
                  <input
                    type="text"
                    placeholder="e.g. BILL-99321 (Optional)"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Purchased new office desks"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* CASHBOOK SYNC TOGGLE */}
              <div
                onClick={() => setSyncToCashbook(!syncToCashbook)}
                className="p-3.5 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between cursor-pointer active:scale-99 transition-all hover:bg-slate-950/80"
              >
                <div className="flex flex-col space-y-0.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                    Sync to Central Cashbook Ledger
                  </span>
                  <span className="text-[10px] text-slate-500">Automatically creates OUTWARD_EXPENSE voucher in cashbook ledger balances</span>
                </div>
                <span className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${syncToCashbook ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-800 text-transparent'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
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
                  {loading ? 'Recording...' : 'Confirm & Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
