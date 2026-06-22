import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../utils/apiService';
import { BankAccountSchema } from '../../utils/schemas';
import { Landmark, Plus, Search, X, AlertCircle, CheckCircle2, DollarSign } from 'lucide-react';

interface BankAccount {
  id: string;
  bankName: string;
  accountNo: string;
  branchName?: string;
  ifscCode: string;
  accountType: string;
  balance: number;
  createdAt: string;
}

export default function BankAccounts() {
  const queryClient = useQueryClient();

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bankAccounts'],
    queryFn: async () => {
      const res = await apiClient.get<{bankAccounts: any[]}>('/api/finance/bank-accounts');
      return res.bankAccounts || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/finance/bank-accounts', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bankAccounts'] })
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountNo, setAccountNo] = useState('');

  React.useEffect(() => {
    const handleClose = (e: Event) => {
      if (showAddModal) {
        e.preventDefault();
        setShowAddModal(false);
      }
    };
    window.addEventListener('close-active-modal', handleClose);
    return () => window.removeEventListener('close-active-modal', handleClose);
  }, [showAddModal]);

  const [branchName, setBranchName] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountType, setAccountType] = useState('CURRENT');
  const [balance, setBalance] = useState('');

  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim() || !accountNo.trim() || !ifscCode.trim() || !accountType) {
      setLocalErr("Bank name, Account Number, IFSC, and Account Type are required.");
      return;
    }

    setLocalErr(null);
    setLocalSuccess(null);
    setLoading(true);

    try {
      const parsed = BankAccountSchema.safeParse({
        bankName: bankName.trim(),
        accountNo: accountNo.trim(),
        branchName: branchName.trim() || null,
        ifscCode: ifscCode.trim(),
        accountType,
        balance: balance ? parseFloat(balance) : 0
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      await createMutation.mutateAsync(parsed.data);
      setLocalSuccess("Bank account registered successfully!");
      setTimeout(() => {
        setShowAddModal(false);
        setBankName('');
        setAccountNo('');
        setBranchName('');
        setIfscCode('');
        setBalance('');
      }, 1000);
    } catch (err: any) {
      setLocalErr(err.message || "Failed to register bank account.");
    } finally {
      setLoading(false);
    }
  };

  const filteredAccounts = (bankAccounts || []).filter(acc => {
    const bankName = acc?.bankName || '';
    const accountNo = acc?.accountNo || '';
    const ifscCode = acc?.ifscCode || '';
    const term = (searchTerm || '').toLowerCase();
    return bankName.toLowerCase().includes(term) ||
      accountNo.toLowerCase().includes(term) ||
      ifscCode.toLowerCase().includes(term);
  });

  const totalBankAssets = filteredAccounts.reduce((sum, acc) => sum + acc.balance, 0.0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Landmark className="w-6 h-6 text-indigo-400" />
            Company Bank Accounts
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Track and configure corporate savings, current, or overdraft bank accounts, balances, and branches.
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
          Onboard Bank Account
        </button>
      </div>

      {/* Assets summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="p-5 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl flex items-center justify-between col-span-2">
          <div className="space-y-1">
            <span className="text-slate-550 text-[10px] uppercase font-bold tracking-wider">Total Combined Bank Assets</span>
            <h3 className="text-2xl font-black text-white font-mono">${totalBankAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          </div>
          <DollarSign className="w-6 h-6 text-indigo-400 bg-indigo-500/10 p-1 border border-indigo-500/10 rounded-lg" />
        </div>

        {/* Search */}
        <div className="col-span-2 p-5 bg-slate-900/35 border border-slate-800/80 backdrop-blur-xl rounded-2xl flex items-center justify-end">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-550" />
            <input
              type="text"
              placeholder="Search by Bank name, IFSC, or account number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-xs outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Directory Grid List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAccounts.length === 0 ? (
          <div className="p-12 text-center text-slate-550 col-span-full border border-slate-800/80 rounded-2xl bg-slate-900/35 flex flex-col items-center justify-center">
            <Landmark className="w-12 h-12 text-slate-750 mb-3" />
            <p className="font-semibold text-sm">No company bank accounts registered</p>
            <p className="text-slate-650 text-xs mt-1">Onboard a corporate account to track balance reconciliations.</p>
          </div>
        ) : (
          filteredAccounts.map(acc => (
            <div key={acc.id} className="p-5 bg-slate-900/35 border border-slate-850 hover:border-indigo-550/20 rounded-2xl flex flex-col justify-between h-48 hover:-translate-y-0.5 transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white">{acc.bankName}</span>
                  <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 rounded-full text-[9px] font-bold">
                    {acc.accountType}
                  </span>
                </div>
                <div className="space-y-1 font-mono text-[11px] text-slate-400">
                  <div>A/C No: <span className="text-white font-semibold">{acc.accountNo}</span></div>
                  <div>IFSC: <span className="text-slate-300 font-semibold">{acc.ifscCode}</span></div>
                  {acc.branchName && <div>Branch: <span className="text-slate-500 font-medium">{acc.branchName}</span></div>}
                </div>
              </div>
              <div className="border-t border-slate-900 pt-3 flex justify-between items-end">
                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Active Balance</span>
                <span className="text-lg font-black font-mono text-emerald-400">${acc.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Onboard Bank Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/20">
              <h3 className="text-md font-bold text-white flex items-center gap-1.5">Register corporate bank account</h3>
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
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Account Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 5010043229"
                    value={accountNo}
                    onChange={(e) => setAccountNo(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm outline-none font-mono focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">IFSC Code</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC0000104"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm outline-none font-mono focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Account Category</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="CURRENT">Current account</option>
                    <option value="SAVINGS">Savings account</option>
                    <option value="OVERDRAFT">Overdraft account</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Branch Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai West"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Opening Balance</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm outline-none font-mono focus:border-indigo-500"
                  />
                </div>
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
                  {loading ? 'Registering...' : 'Register Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
